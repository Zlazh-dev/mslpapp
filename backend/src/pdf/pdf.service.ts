import {
    Injectable,
    OnModuleInit,
    OnModuleDestroy,
    Logger,
} from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';
import * as QRCode from 'qrcode';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PdfRenderOptions {
    konvaJson: string | Record<string, any>;
    dataParams: Record<string, string>;
    tableData?: {
        title: string;
        columns: { key: string; label: string; width?: string }[];
        rows: Array<Record<string, string>>;
    };
    rawHtml?: string;
    qrFields?: string[];
    pageWidth?: number;
    pageHeight?: number;
    santriList?: Array<Record<string, string>>;
}

// ─── FileSystem LRU Cache ────────────────────────────────────────────────────

class FileSystemImageCache {
    private cache = new Map<string, { base64: string, expiry: number }>();
    private readonly maxSize = 50; 
    private readonly ttlMs = 1000 * 60 * 15; // 15 mins TTL

    public async get(diskPath: string): Promise<string | null> {
        const now = Date.now();
        const cached = this.cache.get(diskPath);
        
        if (cached) {
            if (now > cached.expiry) {
                this.cache.delete(diskPath); // Evict expired
            } else {
                // Refresh LRU
                this.cache.delete(diskPath);
                this.cache.set(diskPath, cached);
                return cached.base64;
            }
        }

        try {
            const exists = await fs.access(diskPath).then(() => true).catch(() => false);
            if (!exists) return null;

            const buf = await fs.readFile(diskPath);
            const ext = path.extname(diskPath).toLowerCase().replace('.', '');
            const mime = ext === 'png' ? 'image/png'
                : ['jpg', 'jpeg'].includes(ext) ? 'image/jpeg'
                : ext === 'webp' ? 'image/webp'
                : 'image/png';
                
            const base64Uri = `data:${mime};base64,${buf.toString('base64')}`;
            
            // Apply LRU
            if (this.cache.size >= this.maxSize) {
                const oldestKey = this.cache.keys().next().value;
                this.cache.delete(oldestKey);
            }
            
            this.cache.set(diskPath, { base64: base64Uri, expiry: now + this.ttlMs });
            return base64Uri;
        } catch (err) {
            return null;
        }
    }
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
    private browser: Browser | null = null;
    private readonly logger = new Logger(PdfService.name);
    private imageCache = new FileSystemImageCache();

    async onModuleInit() {
        this.logger.log('Launching Puppeteer singleton browser …');
        try {
            this.browser = await puppeteer.launch({
                headless: true, // Use standard true for v19+, new in v20+
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--font-render-hinting=none',
                    '--allow-file-access-from-files'
                ],
            });
            this.logger.log('Puppeteer browser ready.');
        } catch (err) {
            this.logger.error('Failed to launch Puppeteer', err);
        }
    }

    async onModuleDestroy() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    private async buildQrDataUris(
        dataParams: Record<string, string>,
        qrFields: string[],
    ): Promise<Record<string, string>> {
        const map: Record<string, string> = {};
        for (const field of qrFields) {
            const value = dataParams[field];
            if (!value) continue;
            try {
                map[field] = await QRCode.toDataURL(value, {
                    width: 256,
                    margin: 1,
                    errorCorrectionLevel: 'M',
                    color: { dark: '#000000', light: '#ffffff' },
                });
            } catch (err) {
                this.logger.warn(`QR generation failed for field "${field}"`, err);
            }
        }
        return map;
    }

    private fetchUrlAsDataUri(url: string): Promise<string | null> {
        return new Promise((resolve) => {
            const client = url.startsWith('https') ? https : http;
            const req = client.get(url, { timeout: 5000 }, (res) => {
                if (res.statusCode !== 200) {
                    resolve(null);
                    return;
                }
                const chunks: Buffer[] = [];
                res.on('data', (chunk: Buffer) => chunks.push(chunk));
                res.on('end', () => {
                    const buf = Buffer.concat(chunks);
                    const contentType = res.headers['content-type'] || 'image/png';
                    resolve(`data:${contentType};base64,${buf.toString('base64')}`);
                });
            });
            req.on('error', () => resolve(null));
            req.on('timeout', () => { req.destroy(); resolve(null); });
        });
    }

    private async resolveImagesToDataUri(node: any): Promise<void> {
        if (!node) return;

        if (node.className === 'Image' && node.attrs?.src) {
            const src: string = node.attrs.src;
            if (src.startsWith('data:') || !src) {
                // ignore
            } else if (src.includes('/uploads/')) {
                try {
                    const uploadsIdx = src.indexOf('/uploads/');
                    const relativePath = src.substring(uploadsIdx + 1);  
                    const diskPath = path.join(process.cwd(), relativePath);

                    const dataUri = await this.imageCache.get(diskPath);
                    if (dataUri) {
                        node.attrs.src = dataUri;
                    } else {
                        node.attrs.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; 
                    }
                } catch (err) {
                    this.logger.warn(`Failed to read image from disk: ${src}`, err);
                    node.attrs.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; 
                }
            } else if (src.startsWith('http')) {
                try {
                    const dataUri = await this.fetchUrlAsDataUri(src);
                    if (dataUri) node.attrs.src = dataUri;
                } catch (err) {
                    this.logger.warn(`Failed to fetch external image`, err?.message);
                }
            }
        }

        if (node.children) {
            await Promise.all(node.children.map(child => this.resolveImagesToDataUri(child)));
        }
    }

    async generatePdf(opts: PdfRenderOptions): Promise<Buffer> {
        if (!this.browser) throw new Error('Puppeteer browser is not initialised');

        const konvaJsonObj = typeof opts.konvaJson === 'string'
                ? JSON.parse(opts.konvaJson)
                : JSON.parse(JSON.stringify(opts.konvaJson)); 

        await this.resolveImagesToDataUri(konvaJsonObj);
        const konvaJsonStr = JSON.stringify(konvaJsonObj);

        // Also resolve any /uploads/ paths in dataParams (e.g. foto_url) to base64
        for (const [key, val] of Object.entries(opts.dataParams)) {
            if (val && typeof val === 'string' && val.includes('/uploads/')) {
                const uploadsIdx = val.indexOf('/uploads/');
                const relativePath = val.substring(uploadsIdx + 1);
                const diskPath = path.join(process.cwd(), relativePath);
                const dataUri = await this.imageCache.get(diskPath);
                if (dataUri) {
                    opts.dataParams[key] = dataUri;
                    this.logger.debug(`Resolved dataParam "${key}" to base64`);
                }
            }
        }

        const qrDataUris = opts.qrFields?.length
            ? await this.buildQrDataUris(opts.dataParams, opts.qrFields)
            : {};

        const page = await this.browser.newPage();
        page.on('console', msg => this.logger.debug(`[Headless] ${msg.type().toUpperCase()}: ${msg.text()}`));
        page.on('pageerror', err => this.logger.error(`[Headless] Uncaught exception: ${err.toString()}`));

        try {
            const html = this.buildHtml(opts);
            await page.setContent(html, { waitUntil: 'networkidle0' });

            await page.evaluate(
                async (
                    jsonStr: string,
                    data: Record<string, string>,
                    qrUris: Record<string, string>,
                    santriList: Array<Record<string, string>>,
                ) => {
                    return new Promise<void>((resolve) => {
                        (document as any).fonts.ready.then(async () => {
                            // Hybrid rendering
                            await (window as any).renderKonva(jsonStr, data, qrUris, santriList);
                            
                            // Arabic Reflow Hard-Flush Logic
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    const flush = document.body.offsetHeight;
                                    (window as any).PDF_READY = true;
                                    resolve();
                                });
                            });
                        });
                    });
                },
                konvaJsonStr,
                opts.dataParams,
                qrDataUris,
                opts.santriList || [],
            );

            const konvaStage = typeof opts.konvaJson === 'string' ? JSON.parse(opts.konvaJson) : opts.konvaJson;
            const stageW = opts.pageWidth ?? (konvaStage?.attrs?.width || 794);
            const stageH = opts.pageHeight ?? (konvaStage?.attrs?.height || 1123);

            const wUnit = stageW < 500 ? 'mm' : 'px';
            const hUnit = stageH < 500 ? 'mm' : 'px';

            let physicalWidth = `${stageW}${wUnit}`;
            let physicalHeight = `${stageH}${hUnit}`;
            
            if ((stageW >= 790 && stageW <= 800) || stageW === 210) {
                physicalWidth = '210mm';
                physicalHeight = '297mm';
            } else if ((stageW >= 810 && stageW <= 820) || stageW === 215) {
                physicalWidth = '215mm'; // Indonesian F4
                physicalHeight = '330mm';
            }

            const pdfUint8 = await page.pdf({
                printBackground: true,
                width: physicalWidth,
                height: physicalHeight,
                margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
                preferCSSPageSize: true
            });

            await page.close();
            return Buffer.from(pdfUint8);
        } catch (error) {
            this.logger.error('PDF generation failed', error);
            if (!page.isClosed()) await page.close();
            throw error;
        }
    }

    private buildTableHtml(tableData: any): string {
        if (!tableData) return '';
        
        let html = '<div class="data-table-wrapper">';
        if (tableData.title) {
            html += `<h3>${tableData.title}</h3>`;
        }
        
        html += '<table class="data-table">';
        
        if (tableData.columns && tableData.columns.length) {
            html += '<thead><tr>';
            tableData.columns.forEach((col: any) => {
                html += `<th style="width: ${col.width || 'auto'}">${col.label}</th>`;
            });
            html += '</tr></thead>';
        }
        
        if (tableData.rows && tableData.rows.length) {
            html += '<tbody>';
            tableData.rows.forEach((row: any) => {
                html += '<tr>';
                tableData.columns.forEach((col: any) => {
                    html += `<td>${row[col.key] || ''}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody>';
        }
        
        html += '</table></div>';
        return html;
    }

    private buildHtml(opts: PdfRenderOptions): string {
        let extraHtml = '';
        if (opts.rawHtml) {
            extraHtml = opts.rawHtml;
        } else if (opts.tableData) {
            extraHtml = this.buildTableHtml(opts.tableData);
        }

        return /* html */ `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,600;0,700;1,400&family=Noto+Naskh+Arabic:wght@400;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
    background: #ffffff !important;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    font-size: 11px;
    font-family: 'Noto Sans', 'Noto Naskh Arabic', sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    margin: 0; 
}

/* ── KUNCI: Hybrid Fix ── */
#konva-container {
    page-break-after: avoid; 
}

#table-container {
    position: static !important;
    display: block !important;
    transform: none !important;
    width: 100% !important;
    top: auto !important;
    left: auto !important;
    margin-top: 15px; 
}

.data-table-wrapper {
    position: static !important;
    page-break-inside: auto !important; 
    margin-bottom: 20px;
    width: 100%;
    padding: 12px 20px;
}
.data-table-wrapper h3 {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 8px;
}
.data-table {
    width: 100%;
    table-layout: auto; 
    border-collapse: collapse;
    font-size: 10px;
}
.data-table thead {
    display: table-header-group !important; 
    background-color: #2d3748;
    color: white;
}
.data-table th, .data-table td {
    overflow-wrap: break-word;
    word-wrap: break-word; /* Legacy fallback */
    white-space: pre-wrap; 
    padding: 6px 10px;
    border: 1px solid #cbd5e0;
    vertical-align: top;
    text-align: left;
}
.data-table th {
    font-weight: 700;
}
.data-table tr {
    break-inside: avoid !important; 
    page-break-inside: avoid !important;
    page-break-after: auto;
}
.data-table tbody tr:nth-child(even) {
    background-color: #f7fafc;
}

/* RTL */
.rtl-block {
    direction: rtl;
    text-align: right;
    font-family: 'Noto Naskh Arabic', serif;
}

.qr-standalone {
    display: inline-block;
    margin: 4px;
}
.qr-standalone img {
    width: 120px;
    height: 120px;
}
</style>
<!-- No Konva.js needed: we render as pure HTML divs, matching the editor exactly -->
</head>

<body>
<div id="canvas-container" style="position:relative;width:794px;height:1123px;"></div>
<div id="table-container">${extraHtml}</div>

<script>
/**
 * Pure HTML Rendering Engine
 * Renders Konva JSON nodes as HTML divs with absolute positioning.
 * This matches the editor's CSS-based rendering exactly,
 * eliminating the canvas vs HTML text mismatch.
 */
window.renderKonva = async (jsonStr, data, qrUris, santriList) => {
    const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const hasArabic = (t) => ARABIC_RE.test(t);

    const stageJson = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    const container = document.getElementById('canvas-container');
    const stageW = stageJson.attrs?.width || 794;
    const stageH = stageJson.attrs?.height || 1123;
    container.style.width = stageW + 'px';
    container.style.height = stageH + 'px';

    // Collect all leaf nodes from the Stage JSON tree
    const nodes = [];
    const collectNodes = (node) => {
        if (!node) return;
        if (node.className && node.className !== 'Stage' && node.className !== 'Layer') {
            nodes.push(node);
        }
        if (node.children) node.children.forEach(collectNodes);
    };
    collectNodes(stageJson);

    // Render each node as an HTML element
    for (const node of nodes) {
        const a = node.attrs || {};

        // ── Text Node ──
        if (node.className === 'Text') {
            let txt = a.text || '';
            // Substitute {{placeholder}} with data values
            for (const [key, val] of Object.entries(data)) {
                txt = txt.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'g'), val || '');
            }

            const fontSize = a.fontSize || 14;
            const fontFamily = a.fontFamily || "'Noto Sans', sans-serif";
            const fontStyle = a.fontStyle || 'normal';
            const fill = a.fill || '#000000';
            const align = a.align || 'left';
            const isArabic = hasArabic(txt);

            const div = document.createElement('div');
            if (isArabic) div.setAttribute('dir', 'rtl');
            div.style.cssText = [
                'position:absolute',
                'left:' + (a.x || 0) + 'px',
                'top:' + (a.y || 0) + 'px',
                a.width ? 'width:' + a.width + 'px' : '',
                a.height ? 'height:' + a.height + 'px' : '',
                'font-size:' + fontSize + 'px',
                'font-family:' + fontFamily,
                'font-style:' + (fontStyle.includes('italic') ? 'italic' : 'normal'),
                'font-weight:' + (fontStyle.includes('bold') ? 'bold' : 'normal'),
                'color:' + fill,
                'text-align:' + align,
                'display:flex',
                'align-items:' + (a.verticalAlign === 'bottom' ? 'flex-end' : (a.verticalAlign === 'middle' ? 'center' : 'flex-start')),
                'justify-content:' + (align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start')),
                'line-height:1.35',
                'white-space:pre-wrap',
                'overflow:hidden',
                'user-select:none',
            ].filter(Boolean).join(';');
            div.textContent = txt;
            container.appendChild(div);
        }

        // ── Image Node (photos, logos, QR codes) ──
        else if (node.className === 'Image') {
            const name = a.name || '';
            let src = a.src || '';

            // QR code injection
            if (name && qrUris[name]) {
                src = qrUris[name];
            }
            // foto_santri: use data's foto_url (already resolved to base64 by backend)
            if (name === 'foto_santri') {
                src = data['foto_url'] || '';
            }

            if (src) {
                const img = document.createElement('img');
                img.src = src;
                img.style.cssText = [
                    'position:absolute',
                    'left:' + (a.x || 0) + 'px',
                    'top:' + (a.y || 0) + 'px',
                    'width:' + (a.width || 100) + 'px',
                    'height:' + (a.height || 100) + 'px',
                    'object-fit:fill',
                ].join(';');
                container.appendChild(img);
            }
        }

        // ── Rect Node (shapes, or table placeholders) ──
        else if (node.className === 'Rect') {
            const tc = a.tableConfig;

            // Custom table placeholder → render as real HTML table
            if (tc && tc.dataType === 'custom' && tc.columns) {
                const cols = tc.columns || [];
                const templateRows = tc.rows || [];
                const border = tc.borderStyle === 'none' ? 'none' : '1px solid #000';
                const pad = (tc.cellPadding || 6) + 'px';
                const fSize = (tc.tableFontSize || 11) + 'px';
                const hColor = tc.headerColor || '#cbd5e1';
                const hasDbCols = cols.some(c => c.type === 'db');

                let actualRows = templateRows;
                if (hasDbCols && santriList && santriList.length > 0) {
                    actualRows = santriList.map((santri, idx) => {
                        const tplRow = templateRows[idx] || {};
                        return { ...tplRow, _santri: santri, _idx: idx };
                    });
                }

                let html = '<table style="width:100%;border-collapse:collapse;font-size:' + fSize + ';font-family:inherit;">';
                html += '<thead><tr>';
                cols.forEach(col => {
                    const cw = col.width ? 'width:' + col.width + '%;' : '';
                    html += '<th style="border:' + border + ';padding:' + pad + ';background:' + hColor + ';font-weight:bold;text-align:' + (col.align || 'left') + ';' + cw + '">' + (col.header || col.label || '') + '</th>';
                });
                html += '</tr></thead><tbody>';
                actualRows.forEach((row, rIdx) => {
                    html += '<tr>';
                    cols.forEach(col => {
                        let cellVal = '';
                        if (col.type === 'index') {
                            cellVal = String(rIdx + 1);
                        } else if (col.type === 'db' && row._santri) {
                            cellVal = row._santri[col.field] || '';
                        } else {
                            const rv = row.cells || row.values || row;
                            cellVal = rv[col.id] || rv[col.field] || '';
                        }
                        html += '<td style="border:' + border + ';padding:' + pad + ';text-align:' + (col.align || 'left') + ';">' + cellVal + '</td>';
                    });
                    html += '</tr>';
                });
                html += '</tbody></table>';

                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'position:absolute;left:' + (a.x||0) + 'px;top:' + (a.y||0) + 'px;width:' + (a.width||200) + 'px;overflow:visible;';
                wrapper.innerHTML = html;
                container.appendChild(wrapper);
            }
            // Preset table placeholder (presensi/jadwal) — skip visual, data comes from rawHtml
            else if (a.name === 'server_table_placeholder') {
                // Do nothing — server generates the table in #table-container
            }
            // Regular rectangle shape
            else {
                const div = document.createElement('div');
                div.style.cssText = [
                    'position:absolute',
                    'left:' + (a.x || 0) + 'px',
                    'top:' + (a.y || 0) + 'px',
                    'width:' + (a.width || 0) + 'px',
                    'height:' + (a.height || 0) + 'px',
                    'background:' + (a.fill || 'transparent'),
                    a.stroke ? 'border:' + (a.strokeWidth || 1) + 'px solid ' + a.stroke : '',
                    a.cornerRadius ? 'border-radius:' + a.cornerRadius + 'px' : '',
                ].filter(Boolean).join(';');
                container.appendChild(div);
            }
        }

        // ── Ellipse / Circle ──
        else if (node.className === 'Ellipse' || node.className === 'Circle') {
            const rx = a.radiusX || a.radius || 0;
            const ry = a.radiusY || a.radius || 0;
            const div = document.createElement('div');
            div.style.cssText = [
                'position:absolute',
                'left:' + ((a.x || 0) - rx) + 'px',
                'top:' + ((a.y || 0) - ry) + 'px',
                'width:' + (rx * 2) + 'px',
                'height:' + (ry * 2) + 'px',
                'border-radius:50%',
                'background:' + (a.fill || 'transparent'),
                a.stroke ? 'border:' + (a.strokeWidth || 1) + 'px solid ' + a.stroke : '',
            ].filter(Boolean).join(';');
            container.appendChild(div);
        }

        // ── Line ──
        else if (node.className === 'Line') {
            const pts = a.points || [];
            if (pts.length >= 4) {
                const x1 = pts[0], y1 = pts[1], x2 = pts[2], y2 = pts[3];
                const len = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
                const angle = Math.atan2(y2-y1, x2-x1) * 180 / Math.PI;
                const div = document.createElement('div');
                const dashStyle = a.dash ? (a.dash[0] > 3 ? 'dashed' : 'dotted') : 'solid';
                div.style.cssText = [
                    'position:absolute',
                    'left:' + x1 + 'px',
                    'top:' + y1 + 'px',
                    'width:' + len + 'px',
                    'height:0',
                    'border-top:' + (a.strokeWidth || 2) + 'px ' + dashStyle + ' ' + (a.stroke || '#000'),
                    'transform-origin:0 0',
                    'transform:rotate(' + angle + 'deg)',
                ].join(';');
                container.appendChild(div);
            }
        }
    }

    // Wait for all images to load
    const allImgs = container.querySelectorAll('img');
    await Promise.all(Array.from(allImgs).map(img =>
        img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })
    ));
};

</script>
</body>
</html>`;
    }
}
