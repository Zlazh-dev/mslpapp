import React, { useState } from 'react';
import { Type, Database, User, Square, Circle, Image as ImageIcon, QrCode, Layers, Trash2, GripVertical, MoveUp, MoveDown, Table2, ChevronRight, ChevronDown, Folder, Plus, Minus, X } from 'lucide-react';
import { CanvasElement, TableColumn, TableRow } from '../types';

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
    onSelect: (id: string, shiftKey?: boolean) => void;
    onHoverLayer: (id: string | null) => void;
    onDragEnd: (event: DragEndEvent) => void;
    onGroup: () => void;
    onUngroup: () => void;
    onDelete: () => void;
    onRenameGroup: (groupId: string, name: string) => void;
}

function getElementInfo(el: CanvasElement): { icon: React.ReactNode; title: string } {
    if (el.type === 'field' && el.field === 'foto') return { icon: <User size={11} className="text-rose-400" />, title: 'Foto Profil' };
    if (el.type === 'field') return { icon: <Database size={11} className="text-emerald-400" />, title: `${el.field}` };
    if (el.type === 'rect') return { icon: <Square size={11} className="text-amber-400" />, title: 'Rectangle' };
    if (el.type === 'circle') return { icon: <Circle size={11} className="text-orange-400" />, title: 'Ellipse' };
    if (el.type === 'image') return { icon: <ImageIcon size={11} className="text-purple-400" />, title: 'Image' };
    if (el.type === 'qrcode') return { icon: <QrCode size={11} className="text-teal-400" />, title: 'QR Code' };
    if (el.type === 'table') return { icon: <Table2 size={11} className="text-indigo-400" />, title: `Table (${el.tableConfig?.dataType || ''})` };
    return { icon: <Type size={11} className="text-blue-400" />, title: el.value || 'Text' };
}

function SortableLayerItem({ el, selectedIds, isGroupChild, onSelect, onHoverLayer, onContextMenu }: {
    el: CanvasElement; selectedIds: string[]; isGroupChild: boolean;
    onSelect: (id: string, shiftKey?: boolean) => void; onHoverLayer: (id: string | null) => void;
    onContextMenu: (e: React.MouseEvent, id: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: el.id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1 };
    const { icon, title } = getElementInfo(el);
    const isSelected = selectedIds.includes(el.id);

    return (
        <div
            ref={setNodeRef}
            style={style}
            onMouseEnter={() => onHoverLayer(el.id)}
            onMouseLeave={() => onHoverLayer(null)}
            onClick={(e) => { e.stopPropagation(); onSelect(el.id, e.shiftKey); }}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (!isSelected) onSelect(el.id); onContextMenu(e, el.id); }}
            className={`flex items-center h-7 cursor-pointer select-none transition-colors group ${isGroupChild ? 'pl-7' : 'pl-2'} ${isSelected ? 'bg-blue-600/20' : 'hover:bg-slate-700/60'} ${isDragging ? 'opacity-60' : ''}`}
        >
            <div {...attributes} {...listeners} className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing pr-1 text-slate-500 hover:text-slate-300 transition-opacity shrink-0">
                <GripVertical size={10} />
            </div>
            <span className="shrink-0 mr-1.5">{icon}</span>
            <span className={`text-[11px] truncate flex-1 ${isSelected ? 'text-white font-medium' : 'text-slate-400'}`} title={title}>
                {title}
            </span>
        </div>
    );
}

function GroupHeader({ groupId, groupName, isExpanded, onToggle, childCount, onRename }: {
    groupId: string; groupName: string; isExpanded: boolean; onToggle: () => void; childCount: number;
    onRename: (name: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(groupName);

    const commitRename = () => {
        const trimmed = name.trim() || 'Group';
        setName(trimmed);
        onRename(trimmed);
        setEditing(false);
    };

    // Sync if parent changes
    React.useEffect(() => { setName(groupName); }, [groupName]);

    return (
        <div
            onClick={(e) => { e.stopPropagation(); if (!editing) onToggle(); }}
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
            className="flex items-center h-7 cursor-pointer select-none transition-colors pl-1.5 hover:bg-slate-700/60 group"
        >
            <span className="shrink-0 text-slate-500 mr-0.5">
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
            <Folder size={11} className="text-slate-500 mr-1.5 shrink-0" />
            {editing ? (
                <input
                    autoFocus
                    className="flex-1 bg-slate-600 border border-blue-500 rounded px-1 py-0 text-[11px] text-white outline-none mr-1"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setName(groupName); setEditing(false); } }}
                    onClick={e => e.stopPropagation()}
                />
            ) : (
                <span className="text-[11px] text-slate-300 font-medium truncate flex-1" title="Double-click to rename">{groupName}</span>
            )}
            <span className="text-[9px] text-slate-500 pr-2 tabular-nums">{childCount}</span>
        </div>
    );
}

export function LayerSidebar({ elements, selectedIds, onSelect, onHoverLayer, onDragEnd, onGroup, onUngroup, onDelete, onRenameGroup }: LayerSidebarProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);

    const toggleGroup = (groupId: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    const handleContextMenu = (e: React.MouseEvent, id: string) => {
        const rect = (e.currentTarget as HTMLElement).closest('.layer-panel-root')?.getBoundingClientRect();
        setContextMenu({ x: e.clientX - (rect?.left || 0), y: e.clientY - (rect?.top || 0), id });
    };

    const closeContextMenu = () => setContextMenu(null);

    // Determine if all selected items are already grouped
    const allGrouped = selectedIds.length > 0 && selectedIds.every(id => {
        const el = elements.find(e => e.id === id);
        return el?.groupId;
    });

    const reversedElements = [...elements].reverse();
    const itemIds = reversedElements.map(e => e.id);

    // Build tree: group consecutive grouped items under a group header
    const seenGroups = new Set<string>();
    type TreeNode = { type: 'group'; groupId: string; children: CanvasElement[] } | { type: 'item'; el: CanvasElement };
    const tree: TreeNode[] = [];

    for (const el of reversedElements) {
        if (el.groupId) {
            if (!seenGroups.has(el.groupId)) {
                seenGroups.add(el.groupId);
                const children = reversedElements.filter(e => e.groupId === el.groupId);
                tree.push({ type: 'group', groupId: el.groupId, children });
            }
        } else {
            tree.push({ type: 'item', el });
        }
    }

    return (
        <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col z-20 shrink-0 layer-panel-root relative" onClick={closeContextMenu}>
            <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/90 relative z-10 flex items-center justify-between">
                <h2 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                    <Layers size={12} className="text-blue-400"/> Layers
                </h2>
                <span className="text-[9px] text-slate-500 tabular-nums">{elements.length}</span>
            </div>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
                modifiers={[restrictToVerticalAxis]}
            >
                <div className="flex-1 overflow-y-auto py-1">
                    {elements.length === 0 && (
                        <div className="text-center py-8 px-4">
                            <Layers size={20} className="text-slate-600 mx-auto mb-2" />
                            <p className="text-[10px] text-slate-500 leading-snug">Kanvas kosong.<br/>Tambah elemen dari toolbar.</p>
                        </div>
                    )}
                    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                        {tree.map((node) => {
                            if (node.type === 'group') {
                                const isExpanded = !collapsedGroups.has(node.groupId);
                                const gName = node.children[0]?.groupName || 'Group';
                                return (
                                    <div key={node.groupId}>
                                        <GroupHeader
                                            groupId={node.groupId}
                                            groupName={gName}
                                            isExpanded={isExpanded}
                                            onToggle={() => toggleGroup(node.groupId)}
                                            childCount={node.children.length}
                                            onRename={(name) => onRenameGroup(node.groupId, name)}
                                        />
                                        {isExpanded && node.children.map(child => (
                                            <SortableLayerItem
                                                key={child.id}
                                                el={child}
                                                selectedIds={selectedIds}
                                                isGroupChild={true}
                                                onSelect={onSelect}
                                                onHoverLayer={onHoverLayer}
                                                onContextMenu={handleContextMenu}
                                            />
                                        ))}
                                    </div>
                                );
                            }
                            return (
                                <SortableLayerItem
                                    key={node.el.id}
                                    el={node.el}
                                    selectedIds={selectedIds}
                                    isGroupChild={false}
                                    onSelect={onSelect}
                                    onHoverLayer={onHoverLayer}
                                    onContextMenu={handleContextMenu}
                                />
                            );
                        })}
                    </SortableContext>
                </div>
            </DndContext>

            {/* Right-click context menu */}
            {contextMenu && (
                <>
                    <div className="fixed inset-0 z-[100]" onClick={closeContextMenu} />
                    <div
                        className="absolute z-[101] bg-slate-700 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[140px] text-[11px] overflow-hidden"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        {selectedIds.length >= 2 && !allGrouped && (
                            <button
                                onClick={() => { onGroup(); closeContextMenu(); }}
                                className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
                            >
                                <Folder size={11} /> Group
                                <span className="ml-auto text-[9px] text-slate-500">Ctrl+G</span>
                            </button>
                        )}
                        {allGrouped && (
                            <button
                                onClick={() => { onUngroup(); closeContextMenu(); }}
                                className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
                            >
                                <Layers size={11} /> Ungroup
                                <span className="ml-auto text-[9px] text-slate-500">Ctrl+Shift+G</span>
                            </button>
                        )}
                        <button
                            onClick={() => { onDelete(); closeContextMenu(); }}
                            className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={11} /> Hapus
                            <span className="ml-auto text-[9px] text-slate-500">Del</span>
                        </button>
                    </div>
                </>
            )}
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
                        <div className="space-y-2">
                            {/* Mode selector */}
                            <select className={inputCls} value={selectedEl.tableConfig?.dataType || 'custom'} onChange={e => {
                                const dt = e.target.value as any;
                                if (dt === 'custom' && !selectedEl.tableConfig?.columns) {
                                    onUpdateSelected({ tableConfig: { ...selectedEl.tableConfig, dataType: dt, columns: [
                                        { id: 'col_' + Date.now(), label: 'No', type: 'static', width: 15, align: 'center' },
                                        { id: 'col_' + (Date.now()+1), label: 'Nama', type: 'db', field: 'namaLengkap', width: 55, align: 'left' },
                                        { id: 'col_' + (Date.now()+2), label: 'NIS', type: 'db', field: 'nis', width: 30, align: 'center' },
                                    ], rows: Array.from({ length: 5 }, (_, i) => ({ id: 'r_' + Date.now() + i, cells: {} })), borderStyle: 'solid', cellPadding: 6, tableFontSize: 11 } });
                                } else {
                                    onUpdateSelected({ tableConfig: { ...selectedEl.tableConfig, dataType: dt } });
                                }
                            }}>
                                <option value="custom">Custom Table</option>
                                <option value="presensi">Preset: Presensi</option>
                                <option value="jadwal">Preset: Jadwal</option>
                            </select>
                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] text-slate-400 shrink-0">Header</label>
                                <input type="color" className="w-6 h-5 cursor-pointer rounded border border-slate-200" value={selectedEl.tableConfig?.headerColor || '#cbd5e1'} onChange={e => onUpdateSelected({ tableConfig: { ...selectedEl.tableConfig, dataType: selectedEl.tableConfig?.dataType || 'custom', headerColor: e.target.value } })} />
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* Custom Table: Column Manager */}
            {selectedEl.type === 'table' && selectedEl.tableConfig?.dataType === 'custom' && (() => {
                const tc = selectedEl.tableConfig!;
                const cols = tc.columns || [];
                const rows = tc.rows || [];
                const DB_FIELDS = [
                    { value: 'namaLengkap', label: 'Nama Lengkap' },
                    { value: 'nis', label: 'NIS' },
                    { value: 'nik', label: 'NIK' },
                    { value: 'noKk', label: 'No KK' },
                    { value: 'tanggalLahir', label: 'Tgl Lahir' },
                    { value: 'tempatLahir', label: 'Tempat Lahir' },
                    { value: 'gender', label: 'Gender' },
                    { value: 'noHp', label: 'No HP' },
                    { value: 'kelas.nama', label: 'Kelas' },
                    { value: 'kamar.nama', label: 'Kamar' },
                    { value: 'jenjangPendidikan', label: 'Jenjang' },
                    { value: 'namaAyah', label: 'Nama Ayah' },
                    { value: 'namaIbu', label: 'Nama Ibu' },
                    { value: 'namaWali', label: 'Nama Wali' },
                    { value: 'status', label: 'Status' },
                ];

                const updateCols = (newCols: TableColumn[]) => {
                    onUpdateSelected({ tableConfig: { ...tc, columns: newCols } });
                };

                const updateCol = (colId: string, patch: Partial<TableColumn>) => {
                    updateCols(cols.map(c => c.id === colId ? { ...c, ...patch } : c));
                };

                const addCol = () => {
                    const newCol: TableColumn = { id: 'col_' + Date.now(), label: 'Kolom', type: 'static', width: 20, align: 'left' };
                    updateCols([...cols, newCol]);
                };

                const removeCol = (colId: string) => {
                    if (cols.length <= 1) return;
                    updateCols(cols.filter(c => c.id !== colId));
                };

                const setRowCount = (count: number) => {
                    const clamped = Math.max(1, Math.min(60, count));
                    const current = rows.length;
                    let newRows = [...rows];
                    if (clamped > current) {
                        for (let i = current; i < clamped; i++) {
                            newRows.push({ id: 'r_' + Date.now() + '_' + i, cells: {} });
                        }
                    } else {
                        newRows = newRows.slice(0, clamped);
                    }
                    onUpdateSelected({ tableConfig: { ...tc, rows: newRows } });
                };

                return (
                    <>
                        {/* Columns */}
                        <div className={sectionCls}>
                            <div className={sectionTitleCls}>
                                Kolom
                                <button onClick={addCol} className="p-0.5 hover:bg-blue-100 rounded text-blue-500 transition" title="Tambah kolom">
                                    <Plus size={12} />
                                </button>
                            </div>
                            <div className="space-y-1.5">
                                {cols.map((col, idx) => (
                                    <div key={col.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                                        {/* Column title bar */}
                                        <div className={`flex items-center gap-1.5 px-2 py-1 ${col.type === 'db' ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-slate-50 border-b border-slate-100'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${col.type === 'db' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            <span className="text-[10px] font-bold text-slate-700 flex-1 truncate">{col.label || 'Kolom'}</span>
                                            <span className="text-[8px] text-slate-400 uppercase">{col.type === 'db' ? 'DB' : 'Statis'}</span>
                                            <button onClick={() => removeCol(col.id)} className="p-0.5 text-slate-300 hover:text-red-500 transition" title="Hapus kolom">
                                                <X size={10} />
                                            </button>
                                        </div>
                                        {/* Column settings */}
                                        <div className="px-2 py-1.5 space-y-1">
                                            <div>
                                                <label className="text-[9px] text-slate-400 uppercase tracking-wide">Nama Header</label>
                                                <input className={inputCls} value={col.label} onChange={e => updateCol(col.id, { label: e.target.value })} placeholder="Nama kolom" />
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-slate-400 uppercase tracking-wide">Tipe Isi</label>
                                                <select className={inputCls} value={col.type} onChange={e => {
                                                    const newType = e.target.value as 'db' | 'static';
                                                    updateCol(col.id, { type: newType, field: newType === 'db' ? 'namaLengkap' : undefined });
                                                }}>
                                                    <option value="static">✏️ Statis (isi manual)</option>
                                                    <option value="db">🗄️ Data Santri (otomatis)</option>
                                                </select>
                                            </div>
                                            {col.type === 'db' && (
                                                <div>
                                                    <label className="text-[9px] text-slate-400 uppercase tracking-wide">Field Database</label>
                                                    <select className={inputCls} value={col.field || ''} onChange={e => updateCol(col.id, { field: e.target.value })}>
                                                        {DB_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            <div className="flex gap-1.5">
                                                <div className="flex-1">
                                                    <label className="text-[9px] text-slate-400 uppercase tracking-wide">Lebar %</label>
                                                    <input type="number" className={inputCls} value={col.width} min={5} max={90} onChange={e => updateCol(col.id, { width: Number(e.target.value) })} />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[9px] text-slate-400 uppercase tracking-wide">Rata</label>
                                                    <select className={inputCls} value={col.align || 'left'} onChange={e => updateCol(col.id, { align: e.target.value as any })}>
                                                        <option value="left">← Kiri</option>
                                                        <option value="center">↔ Tengah</option>
                                                        <option value="right">→ Kanan</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Rows */}
                        <div className={sectionCls}>
                            <div className={sectionTitleCls}>Baris</div>
                            <div className="flex items-center gap-1.5">
                                <button onClick={() => setRowCount(rows.length - 1)} className="p-1 bg-white border border-slate-200 rounded hover:bg-slate-100 transition text-slate-500" disabled={rows.length <= 1}>
                                    <Minus size={10} />
                                </button>
                                <input type="number" className={`${inputCls} w-12 text-center`} value={rows.length} min={1} max={60} onChange={e => setRowCount(Number(e.target.value))} />
                                <button onClick={() => setRowCount(rows.length + 1)} className="p-1 bg-white border border-slate-200 rounded hover:bg-slate-100 transition text-slate-500" disabled={rows.length >= 60}>
                                    <Plus size={10} />
                                </button>
                                <span className="text-[9px] text-slate-400 ml-1">max 60</span>
                            </div>
                        </div>

                        {/* Table Styling */}
                        <div className={sectionCls}>
                            <div className={sectionTitleCls}>Tabel Style</div>
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    <label className="text-[10px] text-slate-400 shrink-0">Border</label>
                                    <select className={inputCls} value={tc.borderStyle || 'solid'} onChange={e => onUpdateSelected({ tableConfig: { ...tc, borderStyle: e.target.value as any } })}>
                                        <option value="solid">Solid</option>
                                        <option value="none">None</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <div>
                                        <label className={labelCls}>Padding</label>
                                        <input type="number" className={inputCls} value={tc.cellPadding || 6} min={0} max={20} onChange={e => onUpdateSelected({ tableConfig: { ...tc, cellPadding: Number(e.target.value) } })} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Font</label>
                                        <input type="number" className={inputCls} value={tc.tableFontSize || 11} min={6} max={24} onChange={e => onUpdateSelected({ tableConfig: { ...tc, tableFontSize: Number(e.target.value) } })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                );
            })()}


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
