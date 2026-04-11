import {
    Injectable,
    OnModuleInit,
    OnModuleDestroy,
    Logger,
} from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PdfRenderOptions {
    /** Konva Stage JSON (string or object) */
    konvaJson: string | Record<string, any>;
    /** Flat key→value map for {{placeholder}} substitution */
    dataParams: Record<string, string>;
    /** Optional table rows to render below the Konva canvas */
    tableData?: {
        title: string;
        columns: { key: string; label: string; width?: string }[];
        rows: Array<Record<string, string>>;
    };
    /** Optional raw HTML to render below the canvas */
    rawHtml?: string;
    /** Fields whose value should be rendered as a QR code image */
    qrFields?: string[];
    /** Page dimensions — defaults to A4 portrait */
    pageWidth?: number;
    pageHeight?: number;
    /** List of santri data for custom table DB column filling */
    santriList?: Array<Record<string, string>>;
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * PdfService
 * ──────────
 * Singleton-browser Puppeteer service that:
 *  1. Reconstructs a Konva stage from JSON in a headless Chromium page.
 *  2. Substitutes {{placeholder}} text nodes with real data.
 *  3. Generates QR code data-URIs server-side and injects them into
 *     Konva Image nodes or standalone <img> elements.
 *  4. Optionally renders HTML tables below the canvas with proper
 *     page-break rules so rows are never cut mid-way.
 *  5. Exports the result as a PDF buffer.
 */
@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
    private browser: Browser | null = null;
    private readonly logger = new Logger(PdfService.name);

    // ── Lifecycle ────────────────────────────────────────────────────

    async onModuleInit() {
        this.logger.log('Launching Puppeteer singleton browser …');
        try {
            this.browser = await puppeteer.launch({
                headless: true,
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--font-render-hinting=none',
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
            this.logger.log('Puppeteer browser closed.');
        }
    }

    // ── QR Helper (runs in Node, NOT in the browser) ────────────────

    /**
     * Pre-generates QR code data-URIs for requested fields so the
     * headless page never needs network access for QR generation.
     */
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

    // ── Fetch URL as Data URI (Node built-in) ────────────────────────

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

    // ── Image URL → Data URI Resolver ────────────────────────────────

    /**
     * Pre-resolves image src attributes in Konva JSON to base64 data URIs.
     * This ensures Puppeteer inside Docker can render images without network access.
     */
    private async resolveImagesToDataUri(node: any): Promise<void> {
        if (!node) return;

        if (node.className === 'Image' && node.attrs?.src) {
            const src: string = node.attrs.src;

            // Skip data URIs and QR placeholders (already handled)
            if (src.startsWith('data:') || !src) {
                // already a data URI, nothing to do
            }
            // Local upload path — read from disk
            else if (src.includes('/uploads/')) {
                try {
                    // Extract the relative path after /uploads/
                    const uploadsIdx = src.indexOf('/uploads/');
                    const relativePath = src.substring(uploadsIdx);  // e.g. /uploads/images/logo.png
                    const diskPath = path.join(process.cwd(), relativePath);

                    if (fs.existsSync(diskPath)) {
                        const buf = fs.readFileSync(diskPath);
                        const ext = path.extname(diskPath).toLowerCase().replace('.', '');
                        const mime = ext === 'png' ? 'image/png'
                            : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                            : ext === 'gif' ? 'image/gif'
                            : ext === 'webp' ? 'image/webp'
                            : ext === 'svg' ? 'image/svg+xml'
                            : 'image/png';
                        node.attrs.src = `data:${mime};base64,${buf.toString('base64')}`;
                        this.logger.debug(`Resolved image to data URI: ${relativePath}`);
                    } else {
                        this.logger.warn(`Image file not found on disk: ${diskPath}`);
                    }
                } catch (err) {
                    this.logger.warn(`Failed to read image from disk: ${src}`, err);
                }
            }
            // External URL — fetch and convert
            else if (src.startsWith('http')) {
                try {
                    const dataUri = await this.fetchUrlAsDataUri(src);
                    if (dataUri) {
                        node.attrs.src = dataUri;
                        this.logger.debug(`Fetched external image: ${src.substring(0, 60)}`);
                    }
                } catch (err) {
                    this.logger.warn(`Failed to fetch external image: ${src.substring(0, 80)}`, err?.message);
                }
            }
        }

        // Recurse into children
        if (node.children) {
            for (const child of node.children) {
                await this.resolveImagesToDataUri(child);
            }
        }
    }

    // ── Main Render Method ───────────────────────────────────────────

    async generatePdf(opts: PdfRenderOptions): Promise<Buffer> {
        if (!this.browser) {
            throw new Error('Puppeteer browser is not initialised');
        }

        // Parse the Konva JSON so we can modify it
        const konvaJsonObj =
            typeof opts.konvaJson === 'string'
                ? JSON.parse(opts.konvaJson)
                : JSON.parse(JSON.stringify(opts.konvaJson)); // deep clone

        // Pre-resolve image URLs to base64 data URIs (runs in Node)
        await this.resolveImagesToDataUri(konvaJsonObj);

        const konvaJsonStr = JSON.stringify(konvaJsonObj);

        // Pre-render QR codes in Node.js
        const qrDataUris = opts.qrFields?.length
            ? await this.buildQrDataUris(opts.dataParams, opts.qrFields)
            : {};

        const page = await this.browser.newPage();

        page.on('console', msg => this.logger.debug(`[Headless] ${msg.type().toUpperCase()}: ${msg.text()}`));
        page.on('pageerror', err => this.logger.error(`[Headless] Uncaught exception: ${err.toString()}`));

        try {
            // Build the full HTML payload
            const html = this.buildHtml(opts);

            await page.setContent(html, { waitUntil: 'networkidle0' });

            // Run the render script inside the page context
            await page.evaluate(
                async (
                    jsonStr: string,
                    data: Record<string, string>,
                    qrUris: Record<string, string>,
                    santriList: Array<Record<string, string>>,
                ) => {
                    // Wait for all web-fonts to be fully available
                    await (document as any).fonts.ready;
                    // Delegate to the global render function injected in the HTML
                    await (window as any).renderKonva(jsonStr, data, qrUris, santriList);
                },
                konvaJsonStr,
                opts.dataParams,
                qrDataUris,
                opts.santriList || [],
            );

            const konvaStage = typeof opts.konvaJson === 'string' ? JSON.parse(opts.konvaJson) : opts.konvaJson;
            this.logger.debug(`Konva Stage JSON nodes count: ${konvaStage?.children?.[0]?.children?.length}`);
            
            const fallbackW = konvaStage?.attrs?.width || 794;
            const fallbackH = konvaStage?.attrs?.height || 1123;
            
            const stageW = opts.pageWidth ?? fallbackW;
            const stageH = opts.pageHeight ?? fallbackH;

            // If width is suspiciously small (like 215 for F4 width in mm), assume 'mm'. Otherwise 'px'.
            const wUnit = stageW < 500 ? 'mm' : 'px';
            const hUnit = stageH < 500 ? 'mm' : 'px';

            const pdfUint8 = await page.pdf({
                printBackground: true,
                width: `${stageW}${wUnit}`,
                height: `${stageH}${hUnit}`,
                margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
            });

            await page.close();
            return Buffer.from(pdfUint8);
        } catch (error) {
            this.logger.error('PDF generation failed', error);
            if (!page.isClosed()) await page.close();
            throw error;
        }
    }

    // ── HTML Template Builder ────────────────────────────────────────

    /**
     * Produces a self-contained HTML document that:
     *  • Loads Noto Sans + Noto Naskh Arabic via @import
     *  • Contains Konva.js
     *  • Embeds page-break-safe table CSS
     *  • Provides window.renderKonva() for browser-side execution
     */
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
/* ── Web Fonts ──────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,600;0,700;1,400&family=Noto+Naskh+Arabic:wght@400;700&display=swap');

/* ── Reset ──────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
    width: 100%;
    font-family: 'Noto Sans', 'Noto Naskh Arabic', sans-serif;
    font-size: 11px;
    color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}

/* Konva canvas wrapper */
#konva-container { position: relative; }

/* ── Table Styling with Page-Break Rules ────────────────────────── */
.data-table-wrapper {
    width: 100%;
    padding: 12px 20px;
}

.data-table-wrapper h3 {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 8px;
    font-family: 'Noto Sans', sans-serif;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
}

.data-table thead {
    background: #2d3748;
    color: #fff;
}

.data-table th,
.data-table td {
    border: 1px solid #cbd5e0;
    padding: 5px 8px;
    text-align: left;
    vertical-align: top;
}

.data-table th {
    font-weight: 700;
    white-space: nowrap;
}

/* ── Critical: Prevent rows from being split across pages ──────── */
.data-table tr {
    page-break-inside: avoid;
    break-inside: avoid;
}

.data-table tbody tr:nth-child(even) {
    background-color: #f7fafc;
}

/* ── RTL container for Arabic text blocks ──────────────────────── */
.rtl-block {
    direction: rtl;
    text-align: right;
    font-family: 'Noto Naskh Arabic', serif;
}

/* ── QR Code Standalone Image ──────────────────────────────────── */
.qr-standalone {
    display: inline-block;
    margin: 4px;
}
.qr-standalone img {
    width: 120px;
    height: 120px;
}
</style>

<!-- Konva.js (pinned version for reproducibility) -->
<script src="https://unpkg.com/konva@9.3.6/konva.min.js"></script>
</head>

<body>
<div id="konva-container"></div>

    <!-- Where table/extra content flows -->
    <div id="table-container">
        ${extraHtml}
    </div>

<script>
/**
 * window.renderKonva
 * ──────────────────
 * Called from page.evaluate().
 *
 * @param {string}                  jsonStr     Konva Stage JSON
 * @param {Record<string,string>}   data        Placeholder values
 * @param {Record<string,string>}   qrUris      field→dataURI map
 * @param {Array<Record<string,string>>} santriList list of santri data for custom tables
 */
window.renderKonva = async (jsonStr, data, qrUris, santriList) => {

    /* ── Helper: detect Arabic/RTL characters ─────────────────────── */
    const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const hasArabic = (text) => ARABIC_RE.test(text);

    /* ── 1. Parse & Traverse ─────────────────────────────────────── */
    const stageJson = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    const arabicTextNodes = []; // collect for HTML overlay rendering

    const processNode = (node) => {
        if (!node) return;

        /* ── Text placeholder substitution ── */
        if (node.className === 'Text' && node.attrs && node.attrs.text) {
            let txt = node.attrs.text;
            for (const [key, val] of Object.entries(data)) {
                txt = txt.replace(new RegExp('\\\\{\\\\{' + key + '\\\\}\\\\}', 'g'), val || '');
            }
            node.attrs.text = txt;

            // Ensure usable font stack
            if (!node.attrs.fontFamily || node.attrs.fontFamily === 'Arial') {
                node.attrs.fontFamily = "'Noto Sans', 'Noto Naskh Arabic', sans-serif";
            }

            // Mark Arabic text nodes for HTML overlay rendering
            if (hasArabic(txt)) {
                arabicTextNodes.push({ ...node.attrs, _originalText: txt });
                node.attrs._isArabicOverlay = true;
            }
        }

        /* ── Image & QR code injection ── */
        if (node.className === 'Image' && node.attrs && node.attrs.name) {
            const nameKey = node.attrs.name;
            
            if (nameKey === 'foto_santri') {
                const photoPath = data['foto_url'];
                if (photoPath) {
                    // Images are already resolved to data URIs server-side,
                    // but handle dynamic foto_santri separately
                    if (photoPath.startsWith('data:') || photoPath.startsWith('http')) {
                        node.attrs.src = photoPath;
                    } else {
                        const baseUrl = window.location.origin || 'http://localhost:3000';
                        node.attrs.src = baseUrl + photoPath;
                    }
                }
            } else if (qrUris[nameKey]) {
                node.attrs._qrDataUri = qrUris[nameKey];
            }
        }

        // Recurse into children (Layers, Groups)
        if (node.children) {
            node.children.forEach(processNode);
        }
    };

    processNode(stageJson);

    /* ── 2. Create Stage ─────────────────────────────────────────── */
    const stage = Konva.Node.create(stageJson, 'konva-container');

    /* ── 3. Post-create: load images into Image nodes ────────────── */
    const imageNodes = stage.find('Image');
    const imageLoadPromises = [];

    imageNodes.forEach((imgNode) => {
        const qrUri = imgNode.getAttr('_qrDataUri');
        const existingSrc = imgNode.getAttr('src') || imgNode.getAttr('imageSrc');

        const src = qrUri || existingSrc;
        if (!src) return;

        imageLoadPromises.push(
            new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    imgNode.image(img);
                    resolve();
                };
                img.onerror = () => {
                    console.warn('Image load failed:', src.substring(0, 80));
                    resolve(); // non-fatal
                };
                img.src = src;
            }),
        );
    });

    await Promise.all(imageLoadPromises);

    /* ── 4. Arabic text: hide Konva nodes, create HTML overlays ──── */
    const allTextNodes = stage.find('Text');
    const container = document.getElementById('konva-container');

    allTextNodes.forEach((textNode) => {
        if (!textNode.getAttr('_isArabicOverlay')) return;

        const absPos = textNode.getAbsolutePosition();
        const text = textNode.text();
        const fontSize = textNode.fontSize() || 14;
        const fontFamily = textNode.fontFamily() || "'Noto Naskh Arabic', serif";
        const fontStyle = textNode.fontStyle() || 'normal';
        const fill = textNode.fill() || '#000000';
        const align = textNode.align() || 'left';
        const w = textNode.width();
        const h = textNode.height();

        // Hide the canvas text node
        textNode.visible(false);

        // Create HTML overlay
        const div = document.createElement('div');
        div.setAttribute('dir', 'rtl');
        div.style.cssText = [
            'position:absolute',
            'left:' + absPos.x + 'px',
            'top:' + absPos.y + 'px',
            w ? 'width:' + w + 'px' : '',
            h ? 'min-height:' + h + 'px' : '',
            'font-size:' + fontSize + 'px',
            'font-family:' + fontFamily,
            'font-style:' + (fontStyle.includes('italic') ? 'italic' : 'normal'),
            'font-weight:' + (fontStyle.includes('bold') ? 'bold' : 'normal'),
            'color:' + fill,
            'text-align:' + align,
            'line-height:1.3',
            'z-index:5',
            'white-space:pre-wrap',
            'display:flex',
            'align-items:center',
        ].filter(Boolean).join(';');
        div.textContent = text;
        container.appendChild(div);
    });

    /* ── 5. Final draw ───────────────────────────────────────────── */
    stage.draw();

    /* ── 6. Custom tables: render HTML tables positioned over the canvas ── */
    const allNodes = stage.find('Rect');
    allNodes.forEach((rectNode) => {
        const tc = rectNode.getAttr('tableConfig');
        if (!tc || tc.dataType !== 'custom' || !tc.columns) return;

        const x = rectNode.x();
        const y = rectNode.y();
        const w = rectNode.width();
        const cols = tc.columns || [];
        const templateRows = tc.rows || [];
        const border = tc.borderStyle === 'none' ? 'none' : '1px solid #000';
        const pad = (tc.cellPadding || 6) + 'px';
        const fSize = (tc.tableFontSize || 11) + 'px';
        const hColor = tc.headerColor || '#cbd5e1';

        // Check if any column uses DB fields
        const hasDbCols = cols.some(c => c.type === 'db');

        // Determine actual rows
        let actualRows = templateRows;
        if (hasDbCols && santriList && santriList.length > 0) {
            actualRows = santriList.map((santri, idx) => {
                const tplRow = templateRows[idx] || {};
                return { ...tplRow, _santri: santri, _idx: idx };
            });
        }

        // Build header
        const thHtml = cols.map(c =>
            '<th style="width:' + c.width + '%;background:' + hColor + ';padding:' + pad + ';border:' + border + ';text-align:' + (c.align||'left') + ';font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + c.label + '</th>'
        ).join('');

        // Build data rows
        const trHtml = actualRows.map((row, rowIdx) => {
            const santriData = row._santri || {};
            const tds = cols.map(c => {
                let cellVal = '';
                if (c.type === 'db' && c.field) {
                    cellVal = santriData[c.field] || data[c.field] || '';
                } else {
                    const cells = row.cells || {};
                    cellVal = cells[c.id] || '';
                    if (!cellVal && c.label && c.label.toLowerCase().includes('no')) {
                        cellVal = String(rowIdx + 1);
                    }
                }
                const isAr = hasArabic(cellVal);
                const dirStyle = isAr ? 'font-family: \\\'Noto Naskh Arabic\\\', serif;' : '';
                const dirAttr = isAr ? ' dir=\\\"rtl\\\"' : '';
                return '<td' + dirAttr + ' style=\"padding:' + pad + '; border:' + border + '; text-align:' + (c.align||'left') + '; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; ' + dirStyle + '\">' + cellVal + '</td>';
            }).join('');
            return '<tr style="page-break-inside:avoid;break-inside:avoid;">' + tds + '</tr>';
        }).join('');

        const tableHtml = '<table style=\"width:' + w + 'px; border-collapse:collapse; font-size:' + fSize + '; font-family: \\\'Noto Sans\\\', \\\'Noto Naskh Arabic\\\', sans-serif; table-layout:fixed;\"><thead><tr>' + thHtml + '</tr></thead><tbody>' + trHtml + '</tbody></table>';

        const div = document.createElement('div');
        div.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;z-index:10;box-sizing:border-box;';
        div.innerHTML = tableHtml;
        container.appendChild(div);

        // Hide the Konva rect placeholder
        rectNode.visible(false);
        stage.draw();
    });
};
</script>
</body>
</html>`;
    }

    // ── Table HTML Builder ───────────────────────────────────────────

    private buildTableHtml(table: NonNullable<PdfRenderOptions['tableData']>): string {
        const thCells = table.columns
            .map((c) => `<th style="${c.width ? `width:${c.width}` : ''}">${c.label}</th>`)
            .join('');

        const bodyRows = table.rows
            .map((row) => {
                const tds = table.columns
                    .map((c) => `<td>${row[c.key] ?? '-'}</td>`)
                    .join('');
                return `<tr>${tds}</tr>`;
            })
            .join('\n');

        return /* html */ `
<div class="data-table-wrapper">
    <h3>${table.title}</h3>
    <table class="data-table">
        <thead><tr>${thCells}</tr></thead>
        <tbody>
            ${bodyRows}
        </tbody>
    </table>
</div>`;
    }
}
