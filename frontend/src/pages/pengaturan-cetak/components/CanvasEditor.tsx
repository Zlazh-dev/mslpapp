import React, { useState, useEffect, useRef } from 'react';
import { CanvasElement } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { User, Undo, Redo } from 'lucide-react';
import { EditorHeader } from './HeaderBreadcrumb';
import { ToolsSidebar, LayerSidebar, PropertiesSidebar } from './EditorSidebars';
import api from '../../../lib/api';

const BACKEND = import.meta.env.VITE_API_URL || '';
const CANVAS_W = 794;
const CANVAS_H = 1123;

interface CanvasEditorProps {
    templateName: string;
    elements: CanvasElement[];
    setElements: (els: CanvasElement[] | ((prev: CanvasElement[]) => CanvasElement[])) => void;
    onBack: () => void;
    onSave: () => void;
    saving: boolean;
    onShowPreview: () => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export function CanvasEditor({
    templateName,
    elements,
    setElements,
    onBack,
    onSave,
    saving,
    onShowPreview,
    undo,
    redo,
    canUndo,
    canRedo
}: CanvasEditorProps) {
    const [scale, setScale] = useState(0.8);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [showGrid, setShowGrid] = useState(true);
    
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, elX: 0, elY: 0, elW: 0, elH: 0 });
    
    const [uploadingImage, setUploadingImage] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const clipboardRef = useRef<CanvasElement | null>(null);

    // Keyboard shortcuts (Copy/Paste/Delete)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                if (selectedId) {
                    const el = elements.find(x => x.id === selectedId);
                    if (el) clipboardRef.current = { ...el };
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
                if (clipboardRef.current) {
                    const newX = Math.min(clipboardRef.current.x + 20, CANVAS_W - clipboardRef.current.w);
                    const newY = Math.min(clipboardRef.current.y + 20, CANVAS_H - clipboardRef.current.h);
                    
                    const clonedEl = {
                        ...clipboardRef.current,
                        id: 'el_' + Date.now() + Math.random().toString(36).substr(2, 5),
                        x: newX,
                        y: newY
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
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                if (e.shiftKey) {
                    e.preventDefault();
                    if(canRedo) redo();
                } else {
                    e.preventDefault();
                    if(canUndo) undo();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                if(canRedo) redo();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                onSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, elements, canUndo, canRedo, undo, redo, onSave]);

    // Drag events
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
        if (!selectedId || (!isDragging && !isResizing)) return;
        const dx = (e.clientX - dragStart.x) / scale;
        const dy = (e.clientY - dragStart.y) / scale;

        if (isDragging) {
            let newX = dragStart.elX + dx;
            let newY = dragStart.elY + dy;
            if (snapToGrid) {
                newX = Math.round(newX / 10) * 10;
                newY = Math.round(newY / 10) * 10;
            }
            // Mencegah elemen keluar dari area kanvas
            newX = Math.max(0, Math.min(newX, CANVAS_W - dragStart.elW));
            newY = Math.max(0, Math.min(newY, CANVAS_H - dragStart.elH));

            updateSelected({ x: newX, y: newY });
        } else if (isResizing) {
            let newW = Math.max(10, dragStart.elW + dx);
            let newH = Math.max(10, dragStart.elH + dy);

            if (e.shiftKey) {
                const ratio = dragStart.elW / dragStart.elH;
                if (newW / newH > ratio) newW = newH * ratio;
                else newH = newW / ratio;
            }

            if (snapToGrid) {
                newW = Math.round(newW / 10) * 10;
                newH = Math.round(newH / 10) * 10;
            }
            // Batasi resize mentok di tepi kanvas
            newW = Math.min(newW, CANVAS_W - dragStart.elX);
            newH = Math.min(newH, CANVAS_H - dragStart.elY);

            updateSelected({ w: newW, h: newH });
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        setIsResizing(false);
        try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { }
    };

    // Updaters
    const updateSelected = (updates: Partial<CanvasElement>) => {
        if (!selectedId) return;
        setElements(els => els.map(e => e.id === selectedId ? { ...e, ...updates } : e));
    };
    const updateStyle = (updates: React.CSSProperties) => {
        if (!selectedId) return;
        setElements(els => els.map(e => e.id === selectedId ? { ...e, style: { ...e.style, ...updates } } : e));
    };

    // Adder Helpers
    const addElement = (type: CanvasElement['type'], presetField?: string) => {
        const baseStyle: React.CSSProperties = { position: 'absolute', fontFamily: 'Arial', fontSize: 14, fontWeight: 'normal', color: '#000000', textAlign: 'left' };
        let newEl: CanvasElement = { id: 'el_' + Date.now(), type, x: 50, y: 50, w: 200, h: 40, style: { ...baseStyle } };

        if (type === 'rect') { newEl.style.backgroundColor = '#e5e7eb'; newEl.style.border = '1px solid #9ca3af'; newEl.w = 300; newEl.h = 100; }
        else if (type === 'text') { newEl.value = 'Teks Baru'; }
        else if (type === 'field') { 
            newEl.field = presetField || 'namaLengkap'; 
            if (presetField === 'foto') {
                newEl.w = 90;
                newEl.h = 120;
            } else {
                newEl.style.fontWeight = 'bold'; 
                newEl.value = '[Data Santri]'; 
            }
        }

        setElements(prev => [...prev, newEl]);
        setSelectedId(newEl.id);
    };

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
                const maxW = 500; 
                if (w > maxW) { const ratio = maxW / w; w *= ratio; h *= ratio; }

                setElements(prev => [...prev, { id: 'img_' + Date.now(), type: 'image', x: 50, y: 50, w: Math.round(w), h: Math.round(h), value: res.data.url, style: { position: 'absolute' } }]);
            };
            img.src = URL.createObjectURL(file);
        } catch (err) { alert('Gagal upload gambar'); } 
        finally { setUploadingImage(false); if (e.target) e.target.value = ''; }
    };

    const selectedEl = elements.find(e => e.id === selectedId);

    return (
        <div className="flex flex-col h-screen bg-gray-100 overflow-hidden font-sans">
            <EditorHeader 
                templateName={templateName} onBack={onBack} onSave={onSave}
                snapToGrid={snapToGrid} setSnapToGrid={setSnapToGrid}
                showGrid={showGrid} setShowGrid={setShowGrid}
                scale={scale} setScale={setScale} saving={saving} onShowPreview={onShowPreview}
            />

            <div className="bg-white border-b border-gray-100 px-4 py-1.5 flex gap-2 items-center shrink-0 z-10 shadow-sm">
                <button onClick={undo} disabled={!canUndo} className="p-1 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent" title="Undo (Ctrl+Z)"><Undo size={16}/></button>
                <button onClick={redo} disabled={!canRedo} className="p-1 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent" title="Redo (Ctrl+Y)"><Redo size={16}/></button>
                <div className="w-px h-4 bg-gray-200 mx-2"/>
                <span className="text-xs text-gray-400">Tips: Gunakan Ctrl+C dan Ctrl+V untuk menyalin elemen. Posisi luar batas putih tidak akan tercetak.</span>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <ToolsSidebar 
                    onAddElement={addElement} 
                    onAddFoto={() => addElement('field', 'foto')}
                    onAddQr={() => addElement('qrcode')}
                    onImageUpload={handleImageUpload} 
                    uploadingImage={uploadingImage} 
                    imageInputRef={imageInputRef} 
                />
                
                <LayerSidebar elements={elements} selectedId={selectedId} onSelect={setSelectedId} />

                <div className="flex-1 overflow-auto bg-slate-200 flex items-start justify-center p-8 relative" onPointerDown={() => setSelectedId(null)}>
                    <div 
                        className="bg-white shadow-2xl relative border border-gray-200 print:shadow-none"
                        style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})`, transformOrigin: 'top center', overflow: 'hidden' }}
                    >
                        {showGrid && (
                            <svg className="absolute inset-0 pointer-events-none z-0" width={CANVAS_W} height={CANVAS_H} xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.4" /></pattern>
                                    <pattern id="largeGrid" width="50" height="50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="url(#smallGrid)" /><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#cbd5e1" strokeWidth="0.7" /></pattern>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#largeGrid)" />
                                <line x1={CANVAS_W / 2} y1="0" x2={CANVAS_W / 2} y2={CANVAS_H} stroke="#bfdbfe" strokeWidth="0.8" strokeDasharray="4 4" />
                                <line x1="0" y1={CANVAS_H / 2} x2={CANVAS_W} y2={CANVAS_H / 2} stroke="#bfdbfe" strokeWidth="0.8" strokeDasharray="4 4" />
                            </svg>
                        )}
                        <div className="absolute inset-8 border border-dashed border-gray-200 pointer-events-none z-0" />

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
                                    overflow: 'hidden',
                                    zIndex: 10
                                }}
                            >
                                {el.type === 'text' && (el.value || 'Teks')}
                                {el.type === 'field' && el.field !== 'foto' && `[ ${el.field} ]`}
                                {el.type === 'field' && el.field === 'foto' && (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#9ca3af', pointerEvents: 'none', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                        <User size={32} strokeWidth={1.5} />
                                        <span style={{ fontSize: 10, fontFamily: 'sans-serif' }}>Foto Santri</span>
                                    </div>
                                )}
                                {el.type === 'image' && el.value && (
                                    <img src={el.value.startsWith('http') ? el.value : BACKEND + el.value} alt="img" style={{ width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none' }} />
                                )}
                                {el.type === 'qrcode' && (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, pointerEvents: 'none' }}>
                                        <QRCodeSVG value="https://profil-publik-santri" size={Math.min(el.w, el.h) - 8} level="M" style={{ display: 'block' }} />
                                        <span style={{ fontSize: 8, fontFamily: 'sans-serif', color: '#6b7280' }}>Profil Publik</span>
                                    </div>
                                )}
                                {selectedId === el.id && (
                                    <div
                                        onPointerDown={(e) => handleResizeDown(e, el)}
                                        style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, backgroundColor: '#3b82f6', cursor: 'nwse-resize', zIndex: 50, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <PropertiesSidebar 
                    selectedEl={selectedEl} 
                    onUpdateSelected={updateSelected} 
                    onUpdateStyle={updateStyle} 
                    onDeleteElement={(id) => { setElements(els => els.filter(x => x.id !== id)); setSelectedId(null); }} 
                />
            </div>
        </div>
    );
}
