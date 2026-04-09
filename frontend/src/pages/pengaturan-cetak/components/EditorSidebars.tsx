import React from 'react';
import { Type, Database, User, Square, Circle, Image as ImageIcon, QrCode, Layers, Trash2, GripVertical, MoveUp, MoveDown, Table2 } from 'lucide-react';
import { CanvasElement } from '../types';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ToolsSidebarProps {
    onAddElement: (type: CanvasElement['type']) => void;
    onAddFoto: () => void;
    onAddQr: () => void;
    onAddTable: () => void;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    uploadingImage: boolean;
    imageInputRef: React.RefObject<HTMLInputElement>;
}

export function ToolsSidebar({ onAddElement, onAddFoto, onAddQr, onAddTable, onImageUpload, uploadingImage, imageInputRef }: ToolsSidebarProps) {
    return (
        <div className="w-16 bg-white border-r flex flex-col items-center py-4 space-y-4 z-20 shrink-0 shadow-[2px_0_10px_-5px_rgba(0,0,0,0.1)] relative">
            <button onClick={() => onAddElement('text')} title="Teks Statis" className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-blue-500 hover:bg-blue-100 hover:text-blue-600 transition group border border-gray-100">
                <Type size={18} />
            </button>
            <button onClick={() => onAddElement('field')} title="Variabel Database" className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-emerald-500 hover:bg-emerald-100 hover:text-emerald-600 transition group border border-gray-100">
                <Database size={18} />
            </button>
            <button onClick={onAddFoto} title="Foto Profil Santri" className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 transition group border border-gray-100">
                <User size={18} />
            </button>
            <button onClick={() => onAddElement('rect')} title="Bentuk Kotak" className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-amber-500 hover:bg-amber-100 hover:text-amber-600 transition group border border-gray-100">
                <Square size={18} />
            </button>
            <button onClick={() => onAddElement('circle')} title="Bentuk Lingkaran" className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-orange-500 hover:bg-orange-100 hover:text-orange-600 transition group border border-gray-100">
                <Circle size={18} />
            </button>
            <button onClick={() => imageInputRef.current?.click()} title="Unggah Gambar Statis" className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-purple-500 hover:bg-purple-100 hover:text-purple-600 transition group border border-gray-100 relative">
                <ImageIcon size={18} />
                {uploadingImage && <span className="absolute -top-1 -right-1 w-3 h-3 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin bg-white" />}
                <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={onImageUpload} />
            </button>
            <button onClick={onAddQr} title="QR Code" className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-teal-500 hover:bg-teal-100 hover:text-teal-600 transition group border border-gray-100">
                <QrCode size={18} />
            </button>
            <button onClick={onAddTable} title="Tabel Dinamis" className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-indigo-500 hover:bg-indigo-100 hover:text-indigo-600 transition group border border-gray-100">
                <Table2 size={18} />
            </button>
        </div>
    );
}

interface LayerSidebarProps {
    elements: CanvasElement[];
    selectedIds: string[];
    onSelect: (id: string) => void;
    onHoverLayer: (id: string | null) => void;
    onDragEnd: (event: DragEndEvent) => void;
}

function SortableLayerItem({ el, selectedIds, isFirstInGroup, isLastInGroup, onSelect, onHoverLayer }: { el: CanvasElement; selectedIds: string[]; isFirstInGroup?: boolean; isLastInGroup?: boolean; onSelect: (id: string) => void; onHoverLayer: (id: string | null) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: el.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
    };

    let icon = <Type size={12} className="text-blue-500"/>;
    let title = el.value || 'Teks';
    
    if (el.type === 'field' && el.field === 'foto') {
        icon = <User size={12} className="text-rose-500"/>;
        title = 'Foto Profil Santri';
    } else if (el.type === 'field') { 
        icon = <Database size={12} className="text-emerald-500"/>; 
        title = `[ ${el.field} ]`; 
    } else if (el.type === 'rect') { 
        icon = <Square size={12} className="text-amber-500"/>; 
        title = 'Kotak/Garis Pembatas'; 
    } else if (el.type === 'image') { 
        icon = <ImageIcon size={12} className="text-purple-500"/>; 
        title = 'Gambar / Logo'; 
    } else if (el.type === 'qrcode') {
        icon = <QrCode size={12} className="text-teal-500"/>;
        title = 'QR Code Profil Publik';
    } else if (el.type === 'table') {
        icon = <Table2 size={12} className="text-indigo-500"/>;
        title = `Tabel Dinamis (${el.tableConfig?.dataType || 'kosong'})`;
    }

    const isSelected = selectedIds.includes(el.id);
    const isGrouped = !!el.groupId;

    return (
        <div ref={setNodeRef} style={style} className={`flex flex-col relative ${isDragging ? 'z-50' : 'z-0'} ${isGrouped ? 'px-0.5' : ''}`}>
            {isFirstInGroup && (
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 bg-slate-700/60 border border-b-0 border-slate-600 rounded-t-md mb-0.5 mt-1">
                    <Layers size={10} className="text-slate-500" /> Group
                </div>
            )}
            <div 
                onMouseEnter={() => onHoverLayer(el.id)}
                onMouseLeave={() => onHoverLayer(null)}
                className={`w-full text-left px-1.5 py-1.5 flex items-center gap-1.5 text-[11px] transition border ${isSelected ? 'border-blue-500/40 bg-blue-900/30 font-semibold' : 'border-transparent hover:border-slate-600 hover:bg-slate-700/50'} ${isDragging ? 'shadow-md border-blue-500 opacity-90' : ''} ${isGrouped ? 'ml-3 border-l w-[calc(100%-0.75rem)] rounded-none' : 'rounded-md'} ${isFirstInGroup ? '!rounded-tr-md' : ''} ${isLastInGroup ? '!rounded-b-md' : ''}`}
            >
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-300 rounded bg-slate-700/30 hover:bg-slate-600 shrink-0 transition-colors">
                    <GripVertical size={12} className={isDragging ? "text-blue-400" : ""} />
                </div>
                <button onClick={() => onSelect(el.id)} className="flex-1 flex items-center gap-2 truncate text-left focus:outline-none overflow-hidden py-0.5">
                    <span className="shrink-0">{icon}</span>
                    <span className={`truncate flex-1 ${isSelected ? 'text-blue-300 font-medium' : 'text-slate-400'}`} title={title}>{title}</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mr-1" />}
                </button>
            </div>
            {isGrouped && !isLastInGroup && (
                <div className="absolute left-1 top-0 bottom-0 w-3 border-l border-slate-600 -z-10" />
            )}
            {isLastInGroup && (
                <div className="h-1.5 w-[calc(100%-0.75rem)] ml-3 bg-slate-700/30 border-x border-b border-slate-600 rounded-b-md mb-1" />
            )}
        </div>
    );
}

export function LayerSidebar({ elements, selectedIds, onSelect, onHoverLayer, onDragEnd }: LayerSidebarProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const reversedElements = [...elements].reverse();
    const itemIds = reversedElements.map(e => e.id);

    return (
        <div className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col z-20 shrink-0">
            <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/90 relative z-10">
                <h2 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5"><Layers size={12} className="text-blue-400"/> Layers</h2>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-snug flex items-center gap-1">Seret <GripVertical size={10} className="text-slate-500" /> untuk pindah Z-Index.</p>
            </div>
            <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragEnd={onDragEnd}
                modifiers={[restrictToVerticalAxis]}
            >
                <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                    {elements.length === 0 && (
                        <div className="text-center py-6 px-3 border border-dashed border-slate-600 rounded-lg m-2">
                            <Layers size={20} className="text-slate-600 mx-auto mb-1.5" />
                            <p className="text-[10px] text-slate-500 leading-snug">Kanvas kosong. Tambah alat di toolbar atas.</p>
                        </div>
                    )}
                    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                        {reversedElements.map((el, idx) => {
                            const isGrouped = !!el.groupId;
                            const prevGroup = idx > 0 ? reversedElements[idx - 1].groupId : null;
                            const nextGroup = idx < reversedElements.length - 1 ? reversedElements[idx + 1].groupId : null;
                            
                            const isFirstInGroup = isGrouped && el.groupId !== prevGroup;
                            const isLastInGroup = isGrouped && el.groupId !== nextGroup;

                            return (
                                <SortableLayerItem 
                                    key={el.id} 
                                    el={el} 
                                    selectedIds={selectedIds} 
                                    isFirstInGroup={isFirstInGroup}
                                    isLastInGroup={isLastInGroup}
                                    onSelect={onSelect} 
                                    onHoverLayer={onHoverLayer} 
                                />
                            );
                        })}
                    </SortableContext>
                </div>
            </DndContext>
        </div>
    );
}

interface PropertiesSidebarProps {
    selectedEl?: CanvasElement;
    multipleSelected: boolean;
    onUpdateSelected: (updates: Partial<CanvasElement>) => void;
    onUpdateStyle: (updates: Partial<CanvasElement['style']>) => void;
    onDeleteElement: (id: string) => void;
    onMoveLayer: (direction: 'forward' | 'backward') => void;
    onGroup: () => void;
    onUngroup: () => void;
}

export function PropertiesSidebar({ selectedEl, multipleSelected, onUpdateSelected, onUpdateStyle, onDeleteElement, onMoveLayer, onGroup, onUngroup }: PropertiesSidebarProps) {
    if (!selectedEl) {
        return (
            <div className="w-64 bg-slate-50 border-l border-slate-200 flex flex-col items-center justify-center text-slate-400 p-6 text-center gap-2 shrink-0 z-10">
                <Layers size={32} className="text-slate-200" />
                <p className="text-[11px]">Klik elemen di kanvas untuk memodifikasi properti.</p>
            </div>
        );
    }

    const inputCls = "w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-700 focus:border-blue-400 outline-none tabular-nums";
    const labelCls = "text-[10px] text-slate-400 block mb-0.5 uppercase tracking-wider font-medium";
    const sectionCls = "px-3 py-2.5 border-b border-slate-200";
    const sectionTitleCls = "text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between";

    return (
        <div className="w-64 bg-slate-50 border-l border-slate-200 flex flex-col z-10 shrink-0 overflow-y-auto">
            {/* Header */}
            <div className="px-3 py-2 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                <span className="text-[11px] font-bold text-slate-700">Properti</span>
                <div className="flex items-center gap-0.5">
                    <button onClick={() => onMoveLayer('forward')} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition" title="Bawa ke Depan">
                        <MoveUp size={12} />
                    </button>
                    <button onClick={() => onMoveLayer('backward')} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition" title="Kirim ke Belakang">
                        <MoveDown size={12} />
                    </button>
                </div>
            </div>

            {/* Multi-select actions */}
            {multipleSelected && (
                <div className={sectionCls}>
                    <p className="text-[10px] text-blue-600 font-medium text-center mb-1.5">Multiple Elemen</p>
                    <div className="flex gap-1.5">
                        <button onClick={onGroup} className="flex-1 py-1 bg-white border border-slate-200 text-blue-600 rounded text-[10px] font-medium hover:bg-blue-50 transition">Grup</button>
                        <button onClick={onUngroup} className="flex-1 py-1 bg-white border border-slate-200 text-blue-600 rounded text-[10px] font-medium hover:bg-blue-50 transition">Ungroup</button>
                    </div>
                </div>
            )}

            {/* Position & Size */}
            <div className={sectionCls}>
                <div className={sectionTitleCls}>Posisi & Ukuran</div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                    <div>
                        <label className={labelCls}>X</label>
                        <input type="number" className={inputCls} value={Math.round(selectedEl.x)} onChange={e => onUpdateSelected({ x: Math.max(0, Math.min(Number(e.target.value), 794 - selectedEl.w)) })} />
                    </div>
                    <div>
                        <label className={labelCls}>Y</label>
                        <input type="number" className={inputCls} value={Math.round(selectedEl.y)} onChange={e => onUpdateSelected({ y: Math.max(0, Math.min(Number(e.target.value), 1123 - selectedEl.h)) })} />
                    </div>
                    <div>
                        <label className={labelCls}>W</label>
                        <input type="number" className={inputCls} value={Math.round(selectedEl.w)} onChange={e => onUpdateSelected({ w: Math.max(10, Math.min(Number(e.target.value), 794 - selectedEl.x)) })} />
                    </div>
                    <div>
                        <label className={labelCls}>H</label>
                        <input type="number" className={inputCls} value={Math.round(selectedEl.h)} onChange={e => onUpdateSelected({ h: Math.max(10, Math.min(Number(e.target.value), 1123 - selectedEl.y)) })} />
                    </div>
                </div>
            </div>

            {/* Content – Text / Field / QR / Table */}
            {(selectedEl.type === 'text' || selectedEl.type === 'field' || selectedEl.type === 'qrcode' || selectedEl.type === 'table') && (
                <div className={sectionCls}>
                    <div className={sectionTitleCls}>Konten</div>
                    {selectedEl.type === 'text' && (
                        <textarea className={`${inputCls} resize-none`} rows={2} value={selectedEl.value || ''} onChange={e => onUpdateSelected({ value: e.target.value })} placeholder="Isi teks..." />
                    )}
                    {selectedEl.type === 'field' && (
                        <select className={inputCls} value={selectedEl.field || ''} onChange={e => onUpdateSelected({ field: e.target.value })}>
                            <optgroup label="Data Pribadi">
                                <option value="namaUser">Nama Pengguna</option>
                                <option value="namaLengkap">Nama Lengkap</option>
                                <option value="nis">NIS Santri</option>
                                <option value="nik">NIK</option>
                                <option value="noKk">No KK</option>
                                <option value="tanggalLahir">Tanggal Lahir</option>
                                <option value="tempatLahir">Tempat Lahir</option>
                                <option value="gender">Jenis Kelamin</option>
                                <option value="noHp">No HP</option>
                                <option value="foto">Foto Profil</option>
                            </optgroup>
                            <optgroup label="Penempatan">
                                <option value="jenjangPendidikan">Jenjang</option>
                                <option value="jalurPendidikan">Jalur</option>
                                <option value="kelas.nama">Kelas</option>
                                <option value="kamar.nama">Kamar</option>
                                <option value="tanggalMasuk">Tgl Masuk</option>
                                <option value="tanggalKeluar">Tgl Keluar</option>
                                <option value="status">Status</option>
                            </optgroup>
                            <optgroup label="Keluarga">
                                <option value="namaAyah">Nama Ayah</option>
                                <option value="noHpAyah">HP Ayah</option>
                                <option value="namaIbu">Nama Ibu</option>
                                <option value="noHpIbu">HP Ibu</option>
                                <option value="namaWali">Nama Wali</option>
                                <option value="noHpWali">HP Wali</option>
                                <option value="deskripsiWali">Ket. Wali</option>
                            </optgroup>
                            <optgroup label="Alamat">
                                <option value="alamatFull">Alamat Lengkap</option>
                                <option value="jalan">Jalan</option>
                                <option value="rtRw">RT/RW</option>
                                <option value="kelurahan">Kelurahan</option>
                                <option value="kecamatan">Kecamatan</option>
                                <option value="kotaKabupaten">Kota/Kab</option>
                                <option value="provinsi">Provinsi</option>
                            </optgroup>
                        </select>
                    )}
                    {selectedEl.type === 'qrcode' && (
                        <div className="text-[10px] text-teal-600 bg-teal-50 border border-teal-100 rounded p-2 flex items-center gap-1.5">
                            <QrCode size={10} /> QR → profil santri saat cetak
                        </div>
                    )}
                    {selectedEl.type === 'table' && (
                        <div className="space-y-1.5">
                            <select className={inputCls} value={selectedEl.tableConfig?.dataType || 'presensi'} onChange={e => onUpdateSelected({ tableConfig: { ...selectedEl.tableConfig, dataType: e.target.value as any } })}>
                                <option value="presensi">Presensi Santri</option>
                                <option value="jadwal">Jadwal Pelajaran</option>
                            </select>
                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] text-slate-400 shrink-0">Header</label>
                                <input type="color" className="w-6 h-5 cursor-pointer rounded border border-slate-200" value={selectedEl.tableConfig?.headerColor || '#e5e7eb'} onChange={e => onUpdateSelected({ tableConfig: { ...selectedEl.tableConfig, dataType: selectedEl.tableConfig?.dataType || 'presensi', headerColor: e.target.value } })} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Text styling */}
            <div className={sectionCls}>
                <div className={sectionTitleCls}>Teks</div>
                <div className="space-y-1.5">
                    <select className={inputCls} value={selectedEl.style.fontFamily || 'Arial'} onChange={e => onUpdateStyle({ fontFamily: e.target.value })}>
                        <option value="Arial">Arial</option>
                        <option value="'Times New Roman', Times, serif">Times New Roman</option>
                        <option value="'Courier New', Courier, monospace">Courier New</option>
                        <option value="Georgia, serif">Georgia</option>
                        <option value="Verdana, sans-serif">Verdana</option>
                        <option value="Tahoma, sans-serif">Tahoma</option>
                    </select>
                    <div className="grid grid-cols-2 gap-1.5">
                        <select className={inputCls} value={selectedEl.style.fontWeight || 'normal'} onChange={e => onUpdateStyle({ fontWeight: e.target.value })}>
                            <option value="normal">Regular</option>
                            <option value="bold">Bold</option>
                        </select>
                        <input type="number" className={inputCls} value={selectedEl.style.fontSize || 14} onChange={e => onUpdateStyle({ fontSize: Number(e.target.value) })} />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                        <div className="flex items-center gap-1">
                            <label className="text-[10px] text-slate-400 shrink-0">Align</label>
                            <select className={inputCls} value={selectedEl.style.textAlign || 'left'} onChange={e => onUpdateStyle({ textAlign: e.target.value as any })}>
                                <option value="left">Kiri</option>
                                <option value="center">Tengah</option>
                                <option value="right">Kanan</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-1">
                            <label className="text-[10px] text-slate-400 shrink-0">Opacity</label>
                            <input type="number" min="0" max="1" step="0.1" className={inputCls} value={selectedEl.style.opacity ?? 1} onChange={e => onUpdateStyle({ opacity: Number(e.target.value) })} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Fill */}
            <div className={sectionCls}>
                <div className={sectionTitleCls}>Fill</div>
                <div className="flex items-center gap-2">
                    <input type="color" className="w-7 h-7 cursor-pointer rounded border border-slate-200 shrink-0" value={selectedEl.style.color || '#000000'} onChange={e => onUpdateStyle({ color: e.target.value })} />
                    <div className="flex-1">
                        <p className="text-[10px] text-slate-500">Warna Teks</p>
                        <p className="text-[10px] text-slate-400 font-mono uppercase">{selectedEl.style.color || '#000000'}</p>
                    </div>
                </div>
                {(selectedEl.type === 'rect' || selectedEl.type === 'circle') && (
                    <div className="flex items-center gap-2 mt-1.5">
                        <input type="color" className="w-7 h-7 cursor-pointer rounded border border-slate-200 shrink-0" value={selectedEl.style.backgroundColor || '#ffffff'} onChange={e => onUpdateStyle({ backgroundColor: e.target.value })} />
                        <div className="flex-1">
                            <p className="text-[10px] text-slate-500">Background</p>
                            <p className="text-[10px] text-slate-400 font-mono uppercase">{selectedEl.style.backgroundColor || '#ffffff'}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Stroke (shapes only) */}
            {(selectedEl.type === 'rect' || selectedEl.type === 'circle') && (
                <div className={sectionCls}>
                    <div className={sectionTitleCls}>Stroke</div>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <input type="color" className="w-7 h-7 cursor-pointer rounded border border-slate-200 shrink-0" value={selectedEl.style.strokeColor || '#000000'} onChange={e => onUpdateStyle({ strokeColor: e.target.value })} />
                            <input type="number" min="0" className={`${inputCls} w-14`} value={selectedEl.style.strokeWidth || 0} onChange={e => onUpdateStyle({ strokeWidth: Number(e.target.value) })} />
                            <select className={`${inputCls} flex-1`} value={selectedEl.style.strokeStyle || 'solid'} onChange={e => onUpdateStyle({ strokeStyle: e.target.value as any })}>
                                <option value="solid">Solid</option>
                                <option value="dashed">Dashed</option>
                                <option value="dotted">Dotted</option>
                            </select>
                        </div>
                        {selectedEl.type === 'rect' && (
                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] text-slate-400 shrink-0">Radius</label>
                                <input type="number" min="0" className={inputCls} value={parseInt(selectedEl.style.borderRadius as string || '0')} onChange={e => onUpdateStyle({ borderRadius: `${Number(e.target.value)}px` })} />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Delete */}
            <div className="px-3 py-3 mt-auto">
                <button onClick={() => onDeleteElement(selectedEl.id)} className="w-full py-1.5 bg-red-50 text-red-500 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 hover:bg-red-100 transition border border-red-100">
                    <Trash2 size={12} /> Hapus Elemen
                </button>
            </div>
        </div>
    );
}
