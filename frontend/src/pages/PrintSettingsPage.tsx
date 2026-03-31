import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useTemplates } from './pengaturan-cetak/hooks/useTemplates';
import { useEditorHistory } from './pengaturan-cetak/hooks/useEditorHistory';
import { importTemplateFromJson } from './pengaturan-cetak/utils/templateExportImport';
import { HeaderBreadcrumb } from './pengaturan-cetak/components/HeaderBreadcrumb';
import { TemplateList } from './pengaturan-cetak/components/TemplateList';
import { CanvasEditor } from './pengaturan-cetak/components/CanvasEditor';
import { PrintPreviewModal } from './pengaturan-cetak/components/PrintPreviewModal';
import { AlertTriangle } from 'lucide-react';

// Include Print Styles
import './pengaturan-cetak/utils/printStyles.css';

export default function PrintSettingsPage() {
    const { user } = useAuthStore();
    const isAdmin = !!user?.roles?.includes('ADMIN');

    // Data Hooks
    const { templates, loading, saving, loadTemplates, saveTemplates, duplicateTemplate, deleteTemplate, setAsDefault } = useTemplates();
    const { elements, setElements, resetHistory, undo, redo, canUndo, canRedo } = useEditorHistory([]);

    // View States
    const [view, setView] = useState<'landing' | 'editor'>('landing');
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
    const [activeTemplateName, setActiveTemplateName] = useState<string>('Template Baru');
    
    // UI states
    const [showPreview, setShowPreview] = useState(false);
    const [modal, setModal] = useState<{
        isOpen: boolean; type: 'alert' | 'confirm' | 'prompt'; title: string; message: string;
        inputValue?: string; confirmText?: string; onConfirm?: (val?: string) => void;
    }>({ isOpen: false, type: 'alert', title: '', message: '' });

    const closeDialog = () => setModal(prev => ({ ...prev, isOpen: false }));

    // Load templates on mount
    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    // Save Action Triggered from Editor
    const onSaveAction = async () => {
        if (!activeTemplateId) {
            setModal({
                isOpen: true, type: 'prompt', title: 'Simpan Desain Baru',
                message: 'Silakan masukkan nama untuk rancangan desain baru ini:',
                inputValue: 'Template Baru', confirmText: 'Simpan',
                onConfirm: async (val) => {
                    const newName = val || 'Desain Kustom';
                    const newId = 'tpl_' + Date.now();
                    const newTemplate = { id: newId, name: newName, updatedAt: Date.now(), isDefault: templates.length === 0, elements };
                    const success = await saveTemplates([...templates, newTemplate]);
                    if(success) { setActiveTemplateId(newId); setActiveTemplateName(newName); closeDialog(); }
                }
            });
            return;
        }

        const existing = templates.find(t => t.id === activeTemplateId);
        const updatedTemplate = {
            id: activeTemplateId,
            name: existing ? existing.name : activeTemplateName,
            updatedAt: Date.now(),
            isDefault: existing ? existing.isDefault : false,
            elements: elements
        };

        const updatedTemplates = existing 
            ? templates.map(t => t.id === activeTemplateId ? updatedTemplate : t)
            : [...templates, updatedTemplate];

        await saveTemplates(updatedTemplates);
    };

    const confirmDelete = (id: string, name: string) => {
        setModal({
            isOpen: true, type: 'confirm', title: 'Hapus Template',
            message: `Apakah Anda yakin ingin menghapus desain "${name}" secara permanen?`,
            confirmText: 'Hapus Permanen',
            onConfirm: async () => {
                closeDialog();
                await deleteTemplate(id);
            }
        });
    };

    const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const parsed = await importTemplateFromJson(file);
            await saveTemplates([...templates, parsed]);
            setModal({ isOpen: true, type: 'alert', title: 'Berhasil', message: 'Template berhasil di-import.' });
        } catch(err: any) {
            setModal({ isOpen: true, type: 'alert', title: 'Gagal', message: err.message || 'File tidak valid.'});
        }
        e.target.value = '';
    };

    // Render global active dialog
    const renderModal = () => {
        if (!modal.isOpen) return null;
        return (
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-gray-100">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                            {modal.type === 'confirm' ? <AlertTriangle className="text-amber-500" size={24} /> : <AlertTriangle className="text-blue-500" size={24} />}
                            <h3 className="text-xl font-bold text-gray-900">{modal.title}</h3>
                        </div>
                        <p className="text-gray-600 text-sm mb-5 leading-relaxed">{modal.message}</p>
                        {modal.type === 'prompt' && (
                            <input type="text" className="form-input w-full text-base py-2.5 bg-gray-50 focus:bg-white" value={modal.inputValue} onChange={e => setModal(m => ({ ...m, inputValue: e.target.value }))} autoFocus />
                        )}
                    </div>
                    <div className="bg-gray-50/80 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
                        {modal.type !== 'alert' && <button onClick={closeDialog} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition">Batal</button>}
                        <button
                            onClick={() => { if (modal.onConfirm) modal.onConfirm(modal.inputValue); if (modal.type === 'alert') closeDialog(); }}
                            className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition shadow-sm ${modal.type === 'confirm' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {modal.confirmText || 'OK Mengerti'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 overflow-hidden print:bg-white">
            
            {view === 'landing' ? (
                <div className="flex flex-col items-center justify-start p-6 overflow-y-auto h-screen print:hidden">
                    <div className="max-w-5xl w-full py-8">
                        <HeaderBreadcrumb />
                        
                        <TemplateList 
                            templates={templates} 
                            loading={loading} 
                            isAdmin={isAdmin}
                            onCreateNew={() => {
                                setActiveTemplateId(null);
                                setActiveTemplateName('Template Baru');
                                resetHistory([]);
                                setView('editor');
                            }}
                            onEdit={(id, els) => {
                                const tpl = templates.find(t => t.id === id);
                                setActiveTemplateId(id);
                                setActiveTemplateName(tpl?.name || '');
                                resetHistory(els);
                                setView('editor');
                            }}
                            onSetDefault={setAsDefault}
                            onDelete={confirmDelete}
                            onDuplicate={duplicateTemplate}
                            onImport={handleImportJSON}
                        />
                    </div>
                </div>
            ) : (
                <div className="h-screen flex flex-col print:hidden">
                    <CanvasEditor 
                        templateName={activeTemplateName}
                        elements={elements}
                        setElements={setElements}
                        onBack={() => setView('landing')}
                        onSave={onSaveAction}
                        saving={saving}
                        onShowPreview={() => setShowPreview(true)}
                        undo={undo}
                        redo={redo}
                        canUndo={canUndo}
                        canRedo={canRedo}
                    />
                </div>
            )}

            <PrintPreviewModal 
                isOpen={showPreview} 
                onClose={() => setShowPreview(false)} 
                elements={elements} 
            />

            {renderModal()}
        </div>
    );
}
