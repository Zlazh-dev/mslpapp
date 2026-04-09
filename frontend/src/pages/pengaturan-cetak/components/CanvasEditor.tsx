import React, { useState, useEffect, useRef } from 'react';
import { CanvasElement } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { User, Undo, Redo } from 'lucide-react';
import { EditorHeader } from './HeaderBreadcrumb';
import { ToolsSidebar, LayerSidebar, PropertiesSidebar } from './EditorSidebars';
import api from '../../../lib/api';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { getBoundingBox, getFullySelectedGroupIds, groupElements, ungroupElements } from '../utils/GroupingLogic';
import { ShapeElement } from './ShapeElement';

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
    
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState<{
        x: number, y: number,
        elements: { id: string, x: number, y: number, w: number, h: number }[]
    }>({ x: 0, y: 0, elements: [] });
    
    const [uploadingImage, setUploadingImage] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const clipboardRef = useRef<CanvasElement[]>([]);

    // Keyboard shortcuts (Copy/Paste/Delete)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

            // Layer movement shortcuts
            if ((e.ctrlKey || e.metaKey) && e.key === '[') {
                e.preventDefault();
                if (selectedIds.length > 0) moveLayer(selectedIds[0], 'backward'); // simple logic for move layer
            } else if ((e.ctrlKey || e.metaKey) && e.key === ']') {
                e.preventDefault();
                if (selectedIds.length > 0) moveLayer(selectedIds[0], 'forward');
            } 

            // Grouping Shortcuts
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
                e.preventDefault();
                if (e.shiftKey) {
                    setElements(prev => ungroupElements(prev, selectedIds)); // Ungroup
                } else {
                    setElements(prev => groupElements(prev, selectedIds)); // Group
                }
            }
            
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                if (selectedIds.length > 0) {
                    const els = elements.filter(x => selectedIds.includes(x.id));
                    clipboardRef.current = els.map(el => ({ ...el })); // copy clones
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
                if (clipboardRef.current.length > 0) {
                    const newElements = clipboardRef.current.map(el => ({
                        ...el,
                        id: 'el_' + Date.now() + Math.random().toString(36).substr(2, 5),
                        x: Math.min(el.x + 20, CANVAS_W - el.w),
                        y: Math.min(el.y + 20, CANVAS_H - el.h),
                        groupId: undefined // break group id when pasting
                    }));
                    setElements(prev => [...prev, ...newElements]);
                    setSelectedIds(newElements.map(e => e.id));
                    clipboardRef.current = newElements.map(el => ({ ...el }));
                }
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedIds.length > 0) {
                    setElements(prev => prev.filter(x => !selectedIds.includes(x.id)));
                    setSelectedIds([]);
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
    }, [selectedIds, elements, canUndo, canRedo, undo, redo, onSave]);

    const moveLayer = (id: string, direction: 'forward' | 'backward') => {
        setElements(prev => {
            const arr = [...prev];
            const idx = arr.findIndex(x => x.id === id);
            if (idx === -1) return prev;
            if (direction === 'forward' && idx < arr.length - 1) {
                // Swap with next
                [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
            } else if (direction === 'backward' && idx > 0) {
                // Swap with prev
                [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
            }
            return arr;
        });
    };

    const handleLayerDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setElements((prev) => {
                const reversed = [...prev].reverse();
                const oldIndex = reversed.findIndex(e => e.id === active.id);
                const newIndex = reversed.findIndex(e => e.id === over.id);
                const newReversed = arrayMove(reversed, oldIndex, newIndex);
                return newReversed.reverse();
            });
        }
    };

    // Drag events
    const handlePointerDown = (e: React.PointerEvent, el: CanvasElement) => {
        e.stopPropagation();
        
        let newSelection = [...selectedIds];
        if (e.shiftKey) {
            if (newSelection.includes(el.id)) newSelection = newSelection.filter(id => id !== el.id);
            else newSelection.push(el.id);
        } else {
            if (!newSelection.includes(el.id)) newSelection = [el.id]; // allow dragging multiple if already selected
        }
        
        // Auto-select entire group
        newSelection = getFullySelectedGroupIds(elements, newSelection);
        setSelectedIds(newSelection);

        setIsDragging(true);
        setIsResizing(false);
        
        const selectionRecords = elements
            .filter(x => newSelection.includes(x.id))
            .map(x => ({ id: x.id, x: x.x, y: x.y, w: x.w, h: x.h }));
            
        setDragStart({ x: e.clientX, y: e.clientY, elements: selectionRecords });
        try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { }
    };

    const handleResizeDown = (e: React.PointerEvent, el: CanvasElement) => {
        e.stopPropagation();
        
        const newSelection = getFullySelectedGroupIds(elements, [el.id]);
        setSelectedIds(newSelection);
        
        setIsResizing(true);
        setIsDragging(false);
        
        const selectionRecords = elements
            .filter(x => newSelection.includes(x.id))
            .map(x => ({ id: x.id, x: x.x, y: x.y, w: x.w, h: x.h }));
            
        setDragStart({ x: e.clientX, y: e.clientY, elements: selectionRecords });
        try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (selectedIds.length === 0 || (!isDragging && !isResizing)) return;
        const dx = (e.clientX - dragStart.x) / scale;
        const dy = (e.clientY - dragStart.y) / scale;

        setElements(els => els.map(el => {
            const record = dragStart.elements.find(r => r.id === el.id);
            if (!record) return el;

            if (isDragging) {
                let newX = record.x + dx;
                let newY = record.y + dy;
                if (snapToGrid) {
                    newX = Math.round(newX / 10) * 10;
                    newY = Math.round(newY / 10) * 10;
                }
                newX = Math.max(0, Math.min(newX, CANVAS_W - record.w));
                newY = Math.max(0, Math.min(newY, CANVAS_H - record.h));
                return { ...el, x: newX, y: newY };
            } else if (isResizing) {
                // Resize applies symmetrically proportional mostly handled by direct properties, 
                // but currently we just resize the one clicked if multi-select resize is tricky.
                let newW = Math.max(10, record.w + dx);
                let newH = Math.max(10, record.h + dy);

                if (e.shiftKey) {
                    const ratio = record.w / record.h;
                    if (newW / newH > ratio) newW = newH * ratio;
                    else newH = newW / ratio;
                }

                if (snapToGrid) {
                    newW = Math.round(newW / 10) * 10;
                    newH = Math.round(newH / 10) * 10;
                }
                newW = Math.min(newW, CANVAS_W - record.x);
                newH = Math.min(newH, CANVAS_H - record.y);
                return { ...el, w: newW, h: newH };
            }
            return el;
        }));
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        setIsResizing(false);
        try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { }
    };

    // Updaters (applies to first selection for simple property edits usually)
    const updateSelected = (updates: Partial<CanvasElement>) => {
        if (selectedIds.length === 0) return;
        setElements(els => els.map(e => selectedIds.includes(e.id) ? { ...e, ...updates } : e));
    };
    const updateStyle = (updates: Partial<CanvasElement['style']>) => {
        if (selectedIds.length === 0) return;
        setElements(els => els.map(e => selectedIds.includes(e.id) ? { ...e, style: { ...e.style, ...updates } } : e));
    };

    // Adder Helpers
    const addElement = (type: CanvasElement['type'], presetField?: string) => {
        const baseStyle: React.CSSProperties = { position: 'absolute', fontFamily: 'Arial', fontSize: 14, fontWeight: 'normal', color: '#000000', textAlign: 'left' };
        let newEl: CanvasElement = { id: 'el_' + Date.now(), type, x: 50, y: 50, w: 200, h: 40, style: { ...baseStyle } };

        if (type === 'rect') { newEl.style.backgroundColor = '#e5e7eb'; newEl.style.borderWidth = 1; newEl.style.strokeColor = '#9ca3af'; newEl.w = 300; newEl.h = 100; }
        else if (type === 'circle') { newEl.style.backgroundColor = '#e5e7eb'; newEl.w = 100; newEl.h = 100; }
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
        } else if (type === 'table') {
            newEl.tableConfig = { dataType: 'presensi', headerColor: '#cbd5e1' };
            newEl.w = CANVAS_W - 100;
            newEl.h = 200;
            newEl.x = 50;
            newEl.y = CANVAS_H / 2;
        }

        setElements(prev => [...prev, newEl]);
        setSelectedIds([newEl.id]);
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

    const selectedEl = elements.find(e => e.id === selectedIds[0]); // For property sidebar (shows first element)
    const boundingBox = getBoundingBox(elements, selectedIds);

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
                <span className="text-xs text-gray-400">Tips: Gunakan <b className="text-gray-600">Shift + Click</b> untuk multi-select. Gunakan <b className="text-gray-600">Ctrl + G</b> untuk Group elemen.</span>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <ToolsSidebar 
                    onAddElement={addElement} 
                    onAddFoto={() => addElement('field', 'foto')}
                    onAddQr={() => addElement('qrcode')}
                    onAddTable={() => addElement('table')}
                    onImageUpload={handleImageUpload} 
                    uploadingImage={uploadingImage} 
                    imageInputRef={imageInputRef} 
                />
                
                <LayerSidebar elements={elements} selectedIds={selectedIds} onSelect={(id) => setSelectedIds([id])} onDragEnd={handleLayerDragEnd} onHoverLayer={setHoveredId} />

                <div className="flex-1 overflow-auto bg-slate-200 flex items-start justify-center p-8 relative" onPointerDown={() => setSelectedIds([])}>
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
                                    backgroundColor: (el.type === 'rect' || el.type === 'circle') ? 'transparent' : el.style.backgroundColor,
                                    border: (el.type === 'rect' || el.type === 'circle') ? 'none' : el.style.border,
                                    left: el.x,
                                    top: el.y,
                                    width: el.w,
                                    height: el.h,
                                    cursor: isDragging && selectedIds.includes(el.id) ? 'grabbing' : 'grab',
                                    outline: selectedIds.includes(el.id) && selectedIds.length === 1 ? '2px solid #3b82f6' : (hoveredId === el.id ? '2px dashed #93c5fd' : 'none'),
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
                                {el.type === 'table' && (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', pointerEvents: 'none' }}>
                                        <div style={{ padding: '8px', backgroundColor: el.tableConfig?.headerColor || '#cbd5e1', color: 'black', fontSize: '12px', fontWeight: 'bold', display: 'flex', justifyContent: 'center' }}>
                                            Tabel Dinamis ({el.tableConfig?.dataType === 'jadwal' ? 'Jadwal Pelajaran' : 'Presensi Santri'})
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '12px' }}>
                                            [ Data akan di-generate oleh server ]
                                        </div>
                                    </div>
                                )}
                                {(el.type === 'rect' || el.type === 'circle') && (
                                    <ShapeElement el={el} />
                                )}
                                {selectedIds.length === 1 && selectedIds[0] === el.id && (
                                    <div
                                        onPointerDown={(e) => handleResizeDown(e, el)}
                                        style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, backgroundColor: '#3b82f6', cursor: 'nwse-resize', zIndex: 50, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                                    />
                                )}
                            </div>
                        ))}

                        {/* Bounding Box multi-select terpadu */}
                        {selectedIds.length > 1 && boundingBox && (
                            <div 
                                style={{
                                    position: 'absolute',
                                    left: boundingBox.x,
                                    top: boundingBox.y,
                                    width: boundingBox.w,
                                    height: boundingBox.h,
                                    border: '2px dashed #3b82f6',
                                    pointerEvents: 'none',
                                    zIndex: 40
                                }}
                            />
                        )}
                    </div>
                </div>

                <PropertiesSidebar 
                    selectedEl={selectedEl} 
                    multipleSelected={selectedIds.length > 1}
                    onUpdateSelected={updateSelected} 
                    onUpdateStyle={updateStyle} 
                    onDeleteElement={(id) => { setElements(els => els.filter(x => x.id !== id)); setSelectedIds(selectedIds.filter(x => x !== id)); }} 
                    onMoveLayer={(direction) => { if (selectedEl) moveLayer(selectedEl.id, direction); }}
                    onGroup={() => setElements(prev => groupElements(prev, selectedIds))}
                    onUngroup={() => setElements(prev => ungroupElements(prev, selectedIds))}
                />
            </div>
        </div>
    );
}
