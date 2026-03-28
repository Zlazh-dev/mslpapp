import { PrintTemplate } from '../types';

export function exportTemplateToJson(template: PrintTemplate) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${template.name.replace(/\s+/g, '_')}_template.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

export function importTemplateFromJson(file: File): Promise<PrintTemplate> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const jsonObj = JSON.parse(event.target?.result as string);
                
                // Basic validation
                if (!jsonObj.name || !Array.isArray(jsonObj.elements)) {
                    throw new Error("Format file JSON tidak valid untuk PrintTemplate");
                }
                
                // Remap IDs to ensure uniqueness when importing
                const importedTemplate: PrintTemplate = {
                    id: 'tpl_' + Date.now(),
                    name: jsonObj.name + ' (Import)',
                    updatedAt: Date.now(),
                    isDefault: false, // Don't auto-default imported templates
                    elements: jsonObj.elements.map((el: any) => ({
                        ...el,
                        id: 'el_' + Date.now() + Math.random().toString(36).substr(2, 5)
                    }))
                };
                
                resolve(importedTemplate);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error("Gagal membaca file"));
        reader.readAsText(file);
    });
}
