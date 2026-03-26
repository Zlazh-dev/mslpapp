import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Save, ArrowLeft, Type, Square, Database, Plus, Trash2, Image as ImageIcon, Layers, AlertTriangle, User } from 'lucide-react';

const BACKEND = import.meta.env.VITE_API_URL || '';

export type CanvasElement = {
    id: string;
    type: 'text' | 'field' | 'image' | 'rect';
    x: number;
    y: number;
    w: number;
    h: number;
    value?: string;
    field?: string;
    style: React.CSSProperties;
};

export type PrintTemplate = {
    id: string;
    name: string;
    updatedAt: number;
    isDefault: boolean;
    elements: CanvasElement[];
};

const CANVAS_W = 794;
const CANVAS_H = 1123;

export default function PrintSettingsPage() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<PrintTemplate[]>([]);
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
    const [elements, setElements] = useState<CanvasElement[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [scale, setScale] = useState(0.8);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [showGrid, setShowGrid] = useState(true);
    const [showLanding, setShowLanding] = useState(true);

    const [modal, setModal] = useState<{
        isOpen: boolean;
        type: 'alert' | 'confirm' | 'prompt';
        title: string;
        message: string;
        inputValue?: string;
        confirmText?: string;
        onConfirm?: (val?: string) => void;
    }>({ isOpen: false, type: 'alert', title: '', message: '' });

    const closeDialog = () => setModal(prev => ({ ...prev, isOpen: false }));

    const clipboardRef = useRef<CanvasElement | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (showLanding || modal.isOpen) return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                if (selectedId) {
                    setElements(prev => {
                        const el = prev.find(x => x.id === selectedId);
                        if (el) clipboardRef.current = { ...el };
                        return prev;
                    });
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
                if (clipboardRef.current) {
                    const clonedEl = {
                        ...clipboardRef.current,
                        id: 'el_' + Date.now() + Math.random().toString(36).substr(2, 5),
                        x: clipboardRef.current.x + 20,
                        y: clipboardRef.current.y + 20
                    };
                    setElements(prev => [...prev, clonedEl]);
                    setSelectedId(clonedEl.id);
                    clipboardRef.current = clonedEl;
                }
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedId) {
                    setElements(prev => prev.filter(x => x.id !== selectedId));
                    setSelectedId(null);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, showLanding, modal.isOpen]);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const res = await api.get('/settings/CETAK_TEMPLATES');
            if (res.data?.data && Array.isArray(res.data.data)) {
                setTemplates(res.data.data);
            } else {
                // Migration attempt from old layout mechanism
                const oldRes = await api.get('/settings/CETAK_BIODATA_LAYOUT');
                if (oldRes.data?.data && Array.isArray(oldRes.data.data)) {
                    setTemplates([{
                        id: 'tpl_migrated', name: 'Layout Lama', updatedAt: Date.now(), isDefault: true, elements: oldRes.data.data
                    }]);
                }
            }
        } catch (e) {
            console.error('No layout found or error', e);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        if (!activeTemplateId) return;
        const existing = templates.find(t => t.id === activeTemplateId);

        if (existing) {
            executeSave(existing.name);
        } else {
            setModal({
                isOpen: true,
                type: 'prompt',
                title: 'Simpan Desain Baru',
                message: 'Silakan masukkan nama untuk rancangan desain baru ini:',
                inputValue: 'Template Baru 1',
                confirmText: 'Simpan Desain',
                onConfirm: (val) => {
                    executeSave(val || 'Desain Kustom');
                    closeDialog();
                }
            });
        }
    };

    const executeSave = async (tplName: string) => {
        const existing = templates.find(t => t.id === activeTemplateId);
        const newTemplate: PrintTemplate = {
            id: activeTemplateId!,
            name: tplName,
            updatedAt: Date.now(),
            isDefault: templates.length === 0 || existing?.isDefault || false,
            elements: elements
        };

        const updatedTemplates = existing
            ? templates.map(t => t.id === activeTemplateId ? newTemplate : t)
            : [...templates, newTemplate];

        setSaving(true);
        try {
            await api.put('/settings/CETAK_TEMPLATES', { value: updatedTemplates });
            setTemplates(updatedTemplates);
            setModal({ isOpen: true, type: 'alert', title: 'Berhasil', message: 'Desain template berhasil disimpan dengan aman!' });
        } catch (e) {
            console.error(e);
            setModal({ isOpen: true, type: 'alert', title: 'Gagal Menyimpan', message: 'Terjadi kesalahan saat menyimpan pengaturan Anda.' });
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = (id: string, name: string) => {
        setModal({
            isOpen: true,
            type: 'confirm',
            title: 'Hapus Template',
            message: `Apakah Anda yakin ingin menghapus desain "${name}" secara permanen?`,
            confirmText: 'Hapus Permanen',
            onConfirm: async () => {
                closeDialog();
                const updated = templates.filter(t => t.id !== id);
                try {
                    await api.put('/settings/CETAK_TEMPLATES', { value: updated });
                    setTemplates(updated);
                } catch (e) {
                    setModal({ isOpen: true, type: 'alert', title: 'Gagal Menghapus', message: 'Tidak dapat menghapus template karena kesalahan internal.' });
                }
            }
        });
    };

    const setAsDefault = async (id: string) => {
        const updated = templates.map(t => ({ ...t, isDefault: t.id === id }));
        try {
            await api.put('/settings/CETAK_TEMPLATES', { value: updated });
            setTemplates(updated);
        } catch (e) {
            setModal({ isOpen: true, type: 'alert', title: 'Gagal Default', message: 'Hambatan jaringan saat menetapkan template default.' });
        }
    };

    const selectedEl = elements.find(e => e.id === selectedId);

    const updateSelected = (updates: Partial<CanvasElement>) => {
        if (!selectedId) return;
        setElements(els => els.map(e => e.id === selectedId ? { ...e, ...updates } : e));
    };
    const updateStyle = (updates: React.CSSProperties) => {
        if (!selectedId) return;
        setElements(els => els.map(e => e.id === selectedId ? { ...e, style: { ...e.style, ...updates } } : e));
    };

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, elX: 0, elY: 0, elW: 0, elH: 0 });

    const handlePointerDown = (e: React.PointerEvent, el: CanvasElement) => {
        e.stopPropagation();
        setSelectedId(el.id);
        setIsDragging(true);
        setIsResizing(false);
        setDragStart({ x: e.clientX, y: e.clientY, elX: el.x, elY: el.y, elW: el.w, elH: el.h });
        try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { }
    };

    const handleResizeDown = (e: React.PointerEvent, el: CanvasElement) => {
        e.stopPropagation();
        setSelectedId(el.id);
        setIsResizing(true);
        setIsDragging(false);
        setDragStart({ x: e.clientX, y: e.clientY, elX: el.x, elY: el.y, elW: el.w, elH: el.h });
        try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!selectedId) return;
        const dx = (e.clientX - dragStart.x) / scale;
        const dy = (e.clientY - dragStart.y) / scale;

        if (isDragging) {
            let newX = dragStart.elX + dx;
            let newY = dragStart.elY + dy;
            if (snapToGrid) {
                newX = Math.round(newX / 10) * 10;
                newY = Math.round(newY / 10) * 10;
            }
            updateSelected({ x: newX, y: newY });
        } else if (isResizing) {
            let newW = Math.max(10, dragStart.elW + dx);
            let newH = Math.max(10, dragStart.elH + dy);

            if (e.shiftKey) {
                const ratio = dragStart.elW / dragStart.elH;
                if (newW / newH > ratio) {
                    newW = newH * ratio;
                } else {
                    newH = newW / ratio;
                }
            }

            if (snapToGrid) {
                newW = Math.round(newW / 10) * 10;
                newH = Math.round(newH / 10) * 10;
            }
            updateSelected({ w: newW, h: newH });
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        setIsResizing(false);
        try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { }
    };

    const addElement = (type: CanvasElement['type']) => {
        const baseStyle: React.CSSProperties = {
            position: 'absolute',
            fontFamily: 'Arial',
            fontSize: 14,
            fontWeight: 'normal',
            color: '#000000',
            textAlign: 'left'
        };

        let newEl: CanvasElement = {
            id: 'el_' + Date.now() + Math.random().toString(36).substr(2, 5),
            type,
            x: 50, y: 50, w: 200, h: 40,
            style: { ...baseStyle }
        };

        if (type === 'rect') {
            newEl.style.backgroundColor = '#e5e7eb';
            newEl.style.border = '1px solid #9ca3af';
            newEl.w = 300; newEl.h = 100;
        } else if (type === 'text') {
            newEl.value = 'Teks Baru';
        } else if (type === 'field') {
            newEl.field = 'namaLengkap';
            newEl.style.fontWeight = 'bold';
            newEl.value = '[Data Santri]';
        }

        setElements(prev => [...prev, newEl]);
        setSelectedId(newEl.id);
    };

    const addFotoElement = () => {
        const newEl: CanvasElement = {
            id: 'foto_' + Date.now(),
            type: 'field',
            field: 'foto',
            x: 50, y: 50, w: 120, h: 150,
            value: '[Foto Santri]',
            style: {
                position: 'absolute',
                border: '1px solid #d1d5db',
                backgroundColor: '#f3f4f6',
            }
        };
        setElements(prev => [...prev, newEl]);
        setSelectedId(newEl.id);
    };

    const imageInputRef = useRef<HTMLInputElement>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/upload/foto', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

            const img = new Image();
            img.onload = () => {
                let w = img.naturalWidth || 200;
                let h = img.naturalHeight || 200;

                // Batasi maksimum lebar kanvas dikurangi margin agar tidak terlalu raksasa
                const maxW = 500; 
                if (w > maxW) {
                    const ratio = maxW / w;
                    w = w * ratio;
                    h = h * ratio;
                }

                const newEl: CanvasElement = {
                    id: 'img_' + Date.now(),
                    type: 'image',
                    x: 50, y: 50, 
                    w: Math.round(w), 
                    h: Math.round(h),
                    value: res.data.url,
                    style: { position: 'absolute' }
                };
                setElements(prev => [...prev, newEl]);
                setSelectedId(newEl.id);
            };
            img.src = URL.createObjectURL(file);
        } catch (err) {
            console.error(err);
            alert('Gagal upload gambar');
        } finally {
            setUploadingImage(false);
            if (e.target) e.target.value = '';
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Memuat Pengaturan...</div>;
    }

    const renderModal = () => {
        if (!modal.isOpen) return null;
        return (
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-gray-100">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                            {modal.type === 'confirm' ? <AlertTriangle className="text-amber-500" size={24} /> : <AlertTriangle className="text-blue-500" size={24} />}
                            <h3 className="text-xl font-bold text-gray-900">{modal.title}</h3>
                        </div>
                        <p className="text-gray-600 text-sm mb-5 leading-relaxed">{modal.message}</p>

                        {modal.type === 'prompt' && (
                            <input
                                type="text"
                                className="form-input w-full text-base py-2.5 bg-gray-50 focus:bg-white"
                                value={modal.inputValue}
                                onChange={e => setModal(m => ({ ...m, inputValue: e.target.value }))}
                                autoFocus
                            />
                        )}
                    </div>
                    <div className="bg-gray-50/80 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
                        {modal.type !== 'alert' && (
                            <button onClick={closeDialog} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition">
                                Batal
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (modal.onConfirm) modal.onConfirm(modal.inputValue);
                                if (modal.type === 'alert') closeDialog();
                            }}
                            className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition shadow-sm ${modal.type === 'confirm' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
                        >
                            {modal.confirmText || 'OK Mengerti'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (showLanding) {
        return (
            <div className="flex flex-col min-h-screen bg-gray-50 items-center justify-center font-sans p-6 overflow-y-auto">
                <div className="max-w-5xl w-full py-12">
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Square size={32} />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Desain Cetak Biodata</h1>
                        <p className="text-gray-500 text-sm">Kelola dan pilih template rancangan dokumen cetak untuk biodata Santri.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        <div
                            className="bg-white border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-gray-500 hover:text-blue-600 min-h-[220px]"
                            onClick={() => {
                                setActiveTemplateId('tpl_' + Date.now());
                                setElements([]);
                                setShowLanding(false);
                            }}
                        >
                            <Plus size={40} className="mb-3" />
                            <h3 className="font-semibold text-center">Buat Kanvas Baru</h3>
                            <p className="text-xs text-center mt-2 opacity-80">Mulai merancang dari kertas A4 kosong.</p>
                        </div>

                        {templates.map(tpl => (
                            <div key={tpl.id} className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 flex flex-col transition hover:shadow-md relative group min-h-[220px]">
                                {tpl.isDefault && (
                                    <span className="absolute -top-3 -right-3 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm z-10">
                                        DEFAULT AKTIF
                                    </span>
                                )}
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-800 text-lg mb-1 truncate" title={tpl.name}>{tpl.name}</h3>
                                    <p className="text-xs text-gray-500 mb-4">Diperbarui: {new Date(tpl.updatedAt).toLocaleDateString('id-ID')}</p>

                                    <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <p className="flex items-center gap-2"><Layers size={14} className="text-gray-400" /> {tpl.elements.length} Elemen terpasang</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => { setActiveTemplateId(tpl.id); setElements(tpl.elements); setShowLanding(false); }}
                                        className="col-span-2 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold rounded-lg transition"
                                    >
                                        Edit Desain Ini
                                    </button>
                                    {!tpl.isDefault ? (
                                        <>
                                            <button onClick={() => setAsDefault(tpl.id)} className="py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 text-xs font-semibold rounded-lg transition border border-transparent hover:border-blue-200">
                                                Jadikan Default
                                            </button>
                                            <button onClick={() => confirmDelete(tpl.id, tpl.name)} className="py-2 text-red-600 bg-red-50 hover:bg-red-100 text-xs font-semibold rounded-lg transition border border-transparent hover:border-red-200">
                                                Hapus
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={() => confirmDelete(tpl.id, tpl.name)} className="col-span-2 py-2 text-red-600 bg-red-50 hover:bg-red-100 text-xs font-semibold rounded-lg transition border border-transparent hover:border-red-200">
                                            Hapus Template Default
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 text-center">
                        <button onClick={() => navigate('/santri')} className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition">
                            <ArrowLeft size={18} /> Kembali ke Manajemen Santri
                        </button>
                    </div>
                </div>
                {renderModal()}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100 overflow-hidden font-sans">
            <div className="h-14 bg-white border-b shrink-0 flex items-center justify-between px-4 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowLanding(true)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="font-bold text-gray-800 text-sm">Cetak Layout Editor (A4)</h1>
                        <p className="text-xs text-gray-500">{templates.find(t => t.id === activeTemplateId)?.name || 'Template Baru'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer bg-gray-50 py-1.5 px-3 rounded border">
                        <input type="checkbox" checked={snapToGrid} onChange={e => setSnapToGrid(e.target.checked)} className="rounded text-primary-600 focus:ring-primary-500" />
                        Snap to Grid
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer bg-gray-50 py-1.5 px-3 rounded border">
                        <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} className="rounded text-primary-600 focus:ring-primary-500" />
                        Garis Bantu
                    </label>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">Zoom:</label>
                        <input type="range" min="0.3" max="1.5" step="0.1" value={scale} onChange={e => setScale(Number(e.target.value))} />
                    </div>
                    <button onClick={saveSettings} disabled={saving || loading} className="btn-primary flex items-center gap-2 py-1.5 px-3 text-sm rounded-lg">
                        <Save size={16} /> {saving ? 'S... ' : 'Simpan Layout'}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Panel Alat Mini */}
                <div className="w-16 bg-white border-r flex flex-col items-center py-4 space-y-4 z-20 shrink-0 shadow-[2px_0_10px_-5px_rgba(0,0,0,0.1)] relative">
                    <button onClick={() => addElement('text')} title="Teks Statis" className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-blue-500 hover:bg-blue-100 hover:text-blue-600 transition group border border-gray-100">
                        <Type size={18} />
                    </button>
                    <button onClick={() => addElement('field')} title="Variabel Database" className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-emerald-500 hover:bg-emerald-100 hover:text-emerald-600 transition group border border-gray-100">
                        <Database size={18} />
                    </button>
                    <button onClick={addFotoElement} title="Foto Profil Santri" className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 transition group border border-gray-100">
                        <User size={18} />
                    </button>
                    <button onClick={() => addElement('rect')} title="Bentuk Kotak" className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-amber-500 hover:bg-amber-100 hover:text-amber-600 transition group border border-gray-100">
                        <Square size={18} />
                    </button>
                    <button onClick={() => imageInputRef.current?.click()} title="Unggah Gambar Statis" className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-purple-500 hover:bg-purple-100 hover:text-purple-600 transition group border border-gray-100 relative">
                        <ImageIcon size={18} />
                        {uploadingImage && <span className="absolute -top-1 -right-1 w-3 h-3 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin bg-white" />}
                        <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleImageUpload} />
                    </button>
                </div>

                {/* Second Sidebar: Layer Panel (Daftar Elemen) */}
                <div className="w-64 bg-gray-50/50 border-r flex flex-col z-10 shrink-0">
                    <div className="p-4 border-b border-gray-100 bg-white shadow-sm relative z-10">
                        <h2 className="text-xs font-bold text-gray-800 uppercase tracking-widest flex items-center gap-2"><Layers size={14} className="text-primary-500"/> Struktur Lapisan</h2>
                        <p className="text-[10px] text-gray-500 mt-1">Daftar elemen pada kanvas</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                        {elements.length === 0 && (
                            <div className="text-center py-8 px-4 border-2 border-dashed border-gray-200 rounded-xl m-2">
                                <Layers size={24} className="text-gray-300 mx-auto mb-2" />
                                <p className="text-[11px] text-gray-400">Kanvas kosong. Pilih alat di samping untuk memulai.</p>
                            </div>
                        )}
                        {[...elements].reverse().map((el) => {
                            let icon = <Type size={14} className="text-blue-500"/>;
                            let title = el.value || 'Teks';
                            
                            if (el.type === 'field' && el.field === 'foto') {
                                icon = <User size={14} className="text-rose-500"/>;
                                title = 'Foto Profil Santri';
                            } else if (el.type === 'field') { 
                                icon = <Database size={14} className="text-emerald-500"/>; 
                                title = `[ ${el.field} ]`; 
                            } else if (el.type === 'rect') { 
                                icon = <Square size={14} className="text-amber-500"/>; 
                                title = 'Kotak/Garis Pembatas'; 
                            } else if (el.type === 'image') { 
                                icon = <ImageIcon size={14} className="text-purple-500"/>; 
                                title = 'Gambar / Logo'; 
                            }
                            
                            return (
                                <button 
                                    key={el.id} 
                                    onClick={() => setSelectedId(el.id)}
                                    className={`w-full text-left px-3 py-2 flex items-center gap-3 rounded-lg text-xs transition border ${selectedId === el.id ? 'bg-white border-blue-200 shadow-sm text-blue-700 font-semibold' : 'bg-transparent border-transparent hover:bg-gray-100 text-gray-600 hover:border-gray-200'}`}
                                >
                                    <span className="shrink-0">{icon}</span>
                                    <span className="truncate flex-1" title={title}>{title}</span>
                                    {selectedId === el.id && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div
                    className="flex-1 overflow-auto bg-slate-200 flex items-start justify-center p-8 relative"
                    onPointerDown={() => setSelectedId(null)}
                >
                    <div
                        className="bg-white shadow-2xl relative border border-gray-200"
                        style={{
                            width: CANVAS_W,
                            height: CANVAS_H,
                            transform: `scale(${scale})`,
                            transformOrigin: 'top center'
                        }}
                    >
                        {/* Grid Overlay */}
                        {showGrid && (
                            <svg
                                className="absolute inset-0 pointer-events-none"
                                width={CANVAS_W}
                                height={CANVAS_H}
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <defs>
                                    {/* Small 10px grid */}
                                    <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.4" />
                                    </pattern>
                                    {/* Large 50px grid */}
                                    <pattern id="largeGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                                        <rect width="50" height="50" fill="url(#smallGrid)" />
                                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#cbd5e1" strokeWidth="0.7" />
                                    </pattern>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#largeGrid)" />
                                {/* Center cross-hair ruler lines */}
                                <line x1={CANVAS_W / 2} y1="0" x2={CANVAS_W / 2} y2={CANVAS_H} stroke="#bfdbfe" strokeWidth="0.8" strokeDasharray="4 4" />
                                <line x1="0" y1={CANVAS_H / 2} x2={CANVAS_W} y2={CANVAS_H / 2} stroke="#bfdbfe" strokeWidth="0.8" strokeDasharray="4 4" />
                            </svg>
                        )}

                        {/* A4 Paper Margin Guides */}
                        <div className="absolute inset-8 border border-dashed border-gray-200 pointer-events-none" />

                        {elements.map(el => (
                            <div
                                key={el.id}
                                onPointerDown={(e) => handlePointerDown(e, el)}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                style={{
                                    ...el.style,
                                    left: el.x,
                                    top: el.y,
                                    width: el.w,
                                    height: el.h,
                                    cursor: isDragging && selectedId === el.id ? 'grabbing' : 'grab',
                                    outline: selectedId === el.id ? '2px solid #3b82f6' : 'none',
                                    outlineOffset: '2px',
                                    userSelect: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: el.style.textAlign === 'center' ? 'center' : (el.style.textAlign === 'right' ? 'flex-end' : 'flex-start'),
                                    overflow: 'hidden'
                                }}
                            >
                                {el.type === 'text' && (el.value || 'Teks')}
                                {el.type === 'field' && el.field !== 'foto' && `[ ${el.field} ]`}
                                {el.type === 'field' && el.field === 'foto' && (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#9ca3af', pointerEvents: 'none' }}>
                                        <User size={32} strokeWidth={1.5} />
                                        <span style={{ fontSize: 10, fontFamily: 'sans-serif' }}>Foto Santri</span>
                                    </div>
                                )}
                                {el.type === 'image' && el.value && (
                                    <img src={el.value.startsWith('http') ? el.value : BACKEND + el.value} alt="img" style={{ width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none' }} />
                                )}

                                {selectedId === el.id && (
                                    <div
                                        onPointerDown={(e) => handleResizeDown(e, el)}
                                        style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            right: 0,
                                            width: 14,
                                            height: 14,
                                            backgroundColor: '#3b82f6',
                                            cursor: 'nwse-resize',
                                            zIndex: 50,
                                            clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' // create a tiny corner triangle
                                        }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-80 bg-white border-l flex flex-col z-10 overflow-y-auto shrink-0">
                    {selectedEl ? (
                        <div className="p-4 space-y-5">
                            <h2 className="text-sm font-bold text-gray-800 pb-2 border-b">Properti Elemen</h2>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">X (px)</label>
                                    <input type="number" className="form-input shadow-none text-sm py-1.5" value={Math.round(selectedEl.x)} onChange={e => updateSelected({ x: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Y (px)</label>
                                    <input type="number" className="form-input shadow-none text-sm py-1.5" value={Math.round(selectedEl.y)} onChange={e => updateSelected({ y: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Lebar (px)</label>
                                    <input type="number" className="form-input shadow-none text-sm py-1.5" value={selectedEl.w} onChange={e => updateSelected({ w: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Tinggi (px)</label>
                                    <input type="number" className="form-input shadow-none text-sm py-1.5" value={selectedEl.h} onChange={e => updateSelected({ h: Number(e.target.value) })} />
                                </div>
                            </div>

                            {selectedEl.type === 'text' && (
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Isi Teks</label>
                                    <textarea className="form-input text-sm shadow-none" rows={2} value={selectedEl.value || ''} onChange={e => updateSelected({ value: e.target.value })} />
                                </div>
                            )}

                            {selectedEl.type === 'field' && (
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Variabel Database</label>
                                    <select className="form-input text-sm shadow-none border-gray-200" value={selectedEl.field || ''} onChange={e => updateSelected({ field: e.target.value })}>
                                        <option value="namaLengkap">Nama Lengkap</option>
                                        <option value="nis">NIS Santri</option>
                                        <option value="tanggalLahir">Tanggal Lahir</option>
                                        <option value="tempatLahir">Tempat Lahir</option>
                                        <option value="gender">Jenis Kelamin (L/P)</option>
                                        <option value="kamar.nama">Kamar</option>
                                        <option value="kelas.nama">Kelas</option>
                                        <option value="alamatFull">Alamat Lengkap</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Transparansi (Opacity)</label>
                                <input type="number" min="0" max="1" step="0.1" className="form-input shadow-none text-sm py-1.5" value={selectedEl.style.opacity ?? 1} onChange={e => updateStyle({ opacity: Number(e.target.value) })} />
                            </div>

                            <div className="space-y-3 pt-3 border-t">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase">Tampilan & Gaya</h3>

                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Gaya Font</label>
                                    <select className="form-input text-sm shadow-none py-1.5 border-gray-200" value={selectedEl.style.fontFamily || 'Arial'} onChange={e => updateStyle({ fontFamily: e.target.value })}>
                                        <option value="Arial">Arial</option>
                                        <option value="'Times New Roman', Times, serif">Times New Roman</option>
                                        <option value="'Courier New', Courier, monospace">Courier New</option>
                                        <option value="Georgia, serif">Georgia</option>
                                        <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                                        <option value="Verdana, sans-serif">Verdana</option>
                                        <option value="Impact, sans-serif">Impact</option>
                                        <option value="Tahoma, sans-serif">Tahoma</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Ukuran Font (px)</label>
                                    <input type="number" className="form-input text-sm py-1.5 shadow-none" value={selectedEl.style.fontSize || 14} onChange={e => updateStyle({ fontSize: Number(e.target.value) })} />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Ketebalan</label>
                                        <select className="form-input text-sm shadow-none py-1.5" value={selectedEl.style.fontWeight || 'normal'} onChange={e => updateStyle({ fontWeight: e.target.value })}>
                                            <option value="normal">Normal</option>
                                            <option value="bold">Bold (Tebal)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Perataan</label>
                                        <select className="form-input text-sm shadow-none py-1.5" value={selectedEl.style.textAlign || 'left'} onChange={e => updateStyle({ textAlign: e.target.value as any })}>
                                            <option value="left">Kiri</option>
                                            <option value="center">Tengah</option>
                                            <option value="right">Kanan</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Warna Teks</label>
                                        <input type="color" className="w-full h-8 cursor-pointer rounded overflow-hidden" value={selectedEl.style.color || '#000000'} onChange={e => updateStyle({ color: e.target.value })} />
                                    </div>
                                    <div className={selectedEl.type === 'rect' ? '' : 'opacity-40'}>
                                        <label className="text-xs text-gray-500 block mb-1">Background</label>
                                        <input type="color" className="w-full h-8 cursor-pointer rounded overflow-hidden" disabled={selectedEl.type !== 'rect'} value={selectedEl.style.backgroundColor || '#ffffff'} onChange={e => updateStyle({ backgroundColor: e.target.value })} />
                                    </div>
                                </div>

                            </div>

                            <div className="pt-6">
                                <button onClick={() => {
                                    setElements(els => els.filter(e => e.id !== selectedId));
                                    setSelectedId(null);
                                }} className="w-full py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-100 transition shadow-sm border border-red-100">
                                    <Trash2 size={16} /> Hapus Elemen Ini
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center gap-3">
                            <Plus size={40} className="text-gray-200" />
                            <p className="text-sm">Klik salah satu elemen di kanvas untuk memodifikasi.</p>
                        </div>
                    )}
                </div>
            </div>

            {renderModal()}
        </div>
    );
}
