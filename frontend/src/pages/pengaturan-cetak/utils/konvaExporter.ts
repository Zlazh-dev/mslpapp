import { CanvasElement } from '../types';

/**
 * konvaExporter
 * ─────────────
 * Converts the internal CanvasElement[] (used by the canvas editor)
 * into a Konva Stage JSON structure that the server-side PDF engine
 * expects.
 *
 * Mapping:
 *   text     → Konva.Text  (static text)
 *   field    → Konva.Text  (with {{field_name}} placeholder)
 *   image    → Konva.Image (with src attr)
 *   rect     → Konva.Rect
 *   circle   → Konva.Circle (mapped as Ellipse for Konva compat)
 *   qrcode   → Konva.Image (with name="qr_data" for server QR injection)
 *   group    → skipped (children are top-level in our flat array)
 */

const CANVAS_W = 794;
const CANVAS_H = 1123;
const BACKEND = import.meta.env.VITE_API_URL || '';

function elementToKonvaNode(el: CanvasElement): any {
    const base = {
        x: el.x,
        y: el.y,
        width: el.w,
        height: el.h,
    };

    switch (el.type) {
        case 'text':
            return {
                className: 'Text',
                attrs: {
                    ...base,
                    text: el.value || '',
                    fontSize: parseInt(String(el.style.fontSize || 14)),
                    fontFamily: (el.style.fontFamily as string) || "'Noto Sans', sans-serif",
                    fontStyle: [
                        el.style.fontWeight === 'bold' || el.style.fontWeight === 700 ? 'bold' : '',
                        el.style.fontStyle === 'italic' ? 'italic' : '',
                    ].filter(Boolean).join(' ') || 'normal',
                    fill: (el.style.color as string) || '#000000',
                    align: (el.style.textAlign as string) || 'left',
                    verticalAlign: 'middle',
                },
            };

        case 'field':
            // For 'foto' fields, render as an Image node with a placeholder src
            if (el.field === 'foto') {
                return {
                    className: 'Image',
                    attrs: {
                        ...base,
                        name: 'foto_santri',
                        src: '', // Will be replaced by data injection
                    },
                };
            }

            return {
                className: 'Text',
                attrs: {
                    ...base,
                    text: `{{${el.field || 'unnamed'}}}`,
                    fontSize: parseInt(String(el.style.fontSize || 14)),
                    fontFamily: (el.style.fontFamily as string) || "'Noto Sans', sans-serif",
                    fontStyle: [
                        el.style.fontWeight === 'bold' || el.style.fontWeight === 700 ? 'bold' : '',
                        el.style.fontStyle === 'italic' ? 'italic' : '',
                    ].filter(Boolean).join(' ') || 'normal',
                    fill: (el.style.color as string) || '#000000',
                    align: (el.style.textAlign as string) || 'left',
                    verticalAlign: 'middle',
                },
            };

        case 'image': {
            const src = el.value || '';
            const fullSrc = src.startsWith('http') ? src : (src ? BACKEND + src : '');
            return {
                className: 'Image',
                attrs: {
                    ...base,
                    src: fullSrc,
                },
            };
        }

        case 'rect':
            return {
                className: 'Rect',
                attrs: {
                    ...base,
                    fill: (el.style.backgroundColor as string) || 'transparent',
                    stroke: el.style.strokeColor || (el.style.borderColor as string) || '#000000',
                    strokeWidth: parseFloat(String(el.style.strokeWidth || el.style.borderWidth || 1)),
                    cornerRadius: parseFloat(String(el.style.borderRadius || 0)),
                },
            };

        case 'circle':
            return {
                className: 'Ellipse',
                attrs: {
                    x: el.x + el.w / 2,
                    y: el.y + el.h / 2,
                    radiusX: el.w / 2,
                    radiusY: el.h / 2,
                    fill: (el.style.backgroundColor as string) || 'transparent',
                    stroke: el.style.strokeColor || '#000000',
                    strokeWidth: parseFloat(String(el.style.strokeWidth || 1)),
                },
            };

        case 'qrcode':
            return {
                className: 'Image',
                attrs: {
                    ...base,
                    name: el.field ? `qr_${el.field}` : 'qr_data',
                },
            };

        case 'table':
            // We pass tableConfig as a meta attribute so the backend knows this represents a table
            return {
                className: 'Rect', // Konva just needs a valid node, we will strip it in backend anyway
                attrs: {
                    ...base,
                    name: 'server_table_placeholder',
                    tableConfig: el.tableConfig,
                    fill: 'transparent'
                }
            };
            
        case 'line':
            return {
                className: 'Line',
                attrs: {
                    points: [el.x, el.y + el.h / 2, el.x + el.w, el.y + el.h / 2],
                    stroke: el.style.strokeColor || (el.style.borderColor as string) || '#000000',
                    strokeWidth: parseFloat(String(el.style.strokeWidth || el.style.borderWidth || 1)) || 2,
                    dash: el.style.borderStyle === 'dashed' ? [5, 5] : el.style.borderStyle === 'dotted' ? [2, 2] : undefined,
                },
            };

        default:
            return null;
    }
}

/**
 * Converts the editor's flat CanvasElement[] into a full Konva Stage JSON.
 */
export function exportToKonvaJson(elements: CanvasElement[]): Record<string, any> {
    const nodes = elements
        .filter(el => el.type !== 'group') // Groups are just organizational
        .map(elementToKonvaNode)
        .filter(Boolean);

    return {
        attrs: {
            width: CANVAS_W,
            height: CANVAS_H,
        },
        className: 'Stage',
        children: [
            {
                attrs: {},
                className: 'Layer',
                children: nodes,
            },
        ],
    };
}
