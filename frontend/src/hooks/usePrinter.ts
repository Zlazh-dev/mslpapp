import { useCallback } from 'react';

export function usePrinter() {
    const print = useCallback(({ contentHtml, paperSize = 'A4', orientation = 'portrait', customStyles = '' }: { contentHtml: string, paperSize?: 'A4' | 'F4', orientation?: 'portrait' | 'landscape', customStyles?: string }) => {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.style.opacity = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        const w = paperSize === 'F4' ? '215mm' : '210mm';
        const h = paperSize === 'F4' ? '330mm' : '297mm';
        const [width, height] = orientation === 'landscape' ? [h, w] : [w, h];

        // Safe margin wrapper constraint handling user request 'Zero-Margin Logic' 
        const marginControl = `@page { size: ${width} ${height}; margin: 0 !important; }
            html, body { height: 100%; margin: 0; padding: 0; overflow: hidden; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
            .print-container { position: relative; width: ${width}; height: ${height}; box-sizing: border-box; padding: 0mm; max-height: 100%; overflow: hidden; break-after: page; page-break-after: always; }
            .print-inner-canvas { position: relative; width: 100%; height: 100%; }`;

        const html = `<!DOCTYPE html><html><head><style>${marginControl} ${customStyles}</style></head>
        <body><div class="print-container"><div class="print-inner-canvas">${contentHtml}</div></div></body></html>`;

        doc.open();
        doc.write(html);
        doc.close();

        iframe.onload = () => {
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 500);
            }, 500);
        };
    }, []);

    return { print };
}
