import React from 'react';
import { Type, Database, User, Square, Image as ImageIcon, QrCode, Layers, Trash2 } from 'lucide-react';
import { CanvasElement } from '../types';

interface ToolsSidebarProps {
    onAddElement: (type: CanvasElement['type']) => void;
    onAddFoto: () => void;
    onAddQr: () => void;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    uploadingImage: boolean;
    imageInputRef: React.RefObject<HTMLInputElement>;
}

export function ToolsSidebar({ onAddElement, onAddFoto, onAddQr, onImageUpload, uploadingImage, imageInputRef }: ToolsSidebarProps) {
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
            <button onClick={() => imageInputRef.current?.click()} title="Unggah Gambar Statis" className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-purple-500 hover:bg-purple-100 hover:text-purple-600 transition group border border-gray-100 relative">
                <ImageIcon size={18} />
                {uploadingImage && <span className="absolute -top-1 -right-1 w-3 h-3 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin bg-white" />}
                <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={onImageUpload} />
            </button>
            <button onClick={onAddQr} title="QR Code" className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-teal-500 hover:bg-teal-100 hover:text-teal-600 transition group border border-gray-100">
                <QrCode size={18} />
            </button>
        </div>
    );
}

interface LayerSidebarProps {
    elements: CanvasElement[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export function LayerSidebar({ elements, selectedId, onSelect }: LayerSidebarProps) {
    return (
        <div className="w-64 bg-gray-50/50 border-r flex flex-col z-10 shrink-0">
            <div className="p-4 border-b border-gray-100 bg-white shadow-sm relative z-10">
                <h2 className="text-xs font-bold text-gray-800 uppercase tracking-widest flex items-center gap-2"><Layers size={14} className="text-primary-500"/> Struktur Lapisan</h2>
                <p className="text-[10px] text-gray-500 mt-1">Daftar elemen pada kanvas</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {elements.length === 0 && (
                    <div className="text-center py-8 px-4 border-2 border-dashed border-gray-200 rounded-xl m-2">
                        <Layers size={24} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-[11px] text-gray-400">Kanvas kosong. Tambah alat di samping.</p>
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
                    } else if (el.type === 'qrcode') {
                        icon = <QrCode size={14} className="text-teal-500"/>;
                        title = 'QR Code Profil Publik';
                    }
                    
                    return (
                        <button 
                            key={el.id} 
                            onClick={() => onSelect(el.id)}
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
    );
}

interface PropertiesSidebarProps {
    selectedEl?: CanvasElement;
    onUpdateSelected: (updates: Partial<CanvasElement>) => void;
    onUpdateStyle: (updates: React.CSSProperties) => void;
    onDeleteElement: (id: string) => void;
}

export function PropertiesSidebar({ selectedEl, onUpdateSelected, onUpdateStyle, onDeleteElement }: PropertiesSidebarProps) {
    if (!selectedEl) {
        return (
            <div className="w-80 bg-white border-l flex flex-col items-center justify-center text-gray-400 p-8 text-center gap-3 shrink-0 z-10 overflow-y-auto">
                <Layers size={40} className="text-gray-200" />
                <p className="text-sm">Klik salah satu elemen di kanvas untuk memodifikasi properti.</p>
            </div>
        );
    }

    return (
        <div className="w-80 bg-white border-l flex flex-col z-10 overflow-y-auto shrink-0">
            <div className="p-4 space-y-5">
                <h2 className="text-sm font-bold text-gray-800 pb-2 border-b">Properti Elemen</h2>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">X (px)</label>
                        <input type="number" className="form-input shadow-none text-sm py-1.5" value={Math.round(selectedEl.x)} onChange={e => onUpdateSelected({ x: Math.max(0, Math.min(Number(e.target.value), 794 - selectedEl.w)) })} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Y (px)</label>
                        <input type="number" className="form-input shadow-none text-sm py-1.5" value={Math.round(selectedEl.y)} onChange={e => onUpdateSelected({ y: Math.max(0, Math.min(Number(e.target.value), 1123 - selectedEl.h)) })} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Lebar (px)</label>
                        <input type="number" className="form-input shadow-none text-sm py-1.5" value={Math.round(selectedEl.w)} onChange={e => onUpdateSelected({ w: Math.max(10, Math.min(Number(e.target.value), 794 - selectedEl.x)) })} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Tinggi (px)</label>
                        <input type="number" className="form-input shadow-none text-sm py-1.5" value={Math.round(selectedEl.h)} onChange={e => onUpdateSelected({ h: Math.max(10, Math.min(Number(e.target.value), 1123 - selectedEl.y)) })} />
                    </div>
                </div>

                {selectedEl.type === 'text' && (
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Isi Teks</label>
                        <textarea className="form-input text-sm shadow-none w-full" rows={2} value={selectedEl.value || ''} onChange={e => onUpdateSelected({ value: e.target.value })} />
                    </div>
                )}

                {selectedEl.type === 'field' && (
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Variabel Database</label>
                        <select className="form-input text-sm shadow-none border-gray-200 w-full" value={selectedEl.field || ''} onChange={e => onUpdateSelected({ field: e.target.value })}>
                            <option value="namaLengkap">Nama Lengkap</option>
                            <option value="nis">NIS Santri</option>
                            <option value="tanggalLahir">Tanggal Lahir</option>
                            <option value="tempatLahir">Tempat Lahir</option>
                            <option value="gender">Jenis Kelamin (L/P)</option>
                            <option value="kamar.nama">Kamar</option>
                            <option value="kelas.nama">Kelas</option>
                            <option value="alamatFull">Alamat Lengkap</option>
                            <option value="foto">Foto Profil (Bawaan)</option>
                        </select>
                    </div>
                )}

                {selectedEl.type === 'qrcode' && (
                    <div className="rounded-lg bg-teal-50 border border-teal-100 p-3 text-[11px] text-teal-700 leading-relaxed">
                        <QrCode size={12} className="inline mr-1 mb-0.5" />
                        QR Code mengarah ke profil santri saat dicetak.
                    </div>
                )}

                <div>
                    <label className="text-xs text-gray-500 block mb-1">Transparansi (Opacity)</label>
                    <input type="number" min="0" max="1" step="0.1" className="form-input shadow-none text-sm py-1.5 w-full" value={selectedEl.style.opacity ?? 1} onChange={e => onUpdateStyle({ opacity: Number(e.target.value) })} />
                </div>

                <div className="space-y-3 pt-3 border-t">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase">Tampilan & Gaya</h3>

                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Gaya Font</label>
                        <select className="form-input text-sm shadow-none py-1.5 border-gray-200 w-full" value={selectedEl.style.fontFamily || 'Arial'} onChange={e => onUpdateStyle({ fontFamily: e.target.value })}>
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
                        <input type="number" className="form-input text-sm py-1.5 shadow-none w-full" value={selectedEl.style.fontSize || 14} onChange={e => onUpdateStyle({ fontSize: Number(e.target.value) })} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Ketebalan</label>
                            <select className="form-input text-sm shadow-none py-1.5" value={selectedEl.style.fontWeight || 'normal'} onChange={e => onUpdateStyle({ fontWeight: e.target.value })}>
                                <option value="normal">Normal</option>
                                <option value="bold">Bold (Tebal)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Perataan</label>
                            <select className="form-input text-sm shadow-none py-1.5" value={selectedEl.style.textAlign || 'left'} onChange={e => onUpdateStyle({ textAlign: e.target.value as any })}>
                                <option value="left">Kiri</option>
                                <option value="center">Tengah</option>
                                <option value="right">Kanan</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Warna Teks</label>
                            <input type="color" className="w-full h-8 cursor-pointer rounded overflow-hidden" value={selectedEl.style.color || '#000000'} onChange={e => onUpdateStyle({ color: e.target.value })} />
                        </div>
                        <div className={selectedEl.type === 'rect' ? '' : 'opacity-40'}>
                            <label className="text-xs text-gray-500 block mb-1">Background</label>
                            <input type="color" className="w-full h-8 cursor-pointer rounded overflow-hidden" disabled={selectedEl.type !== 'rect'} value={selectedEl.style.backgroundColor || '#ffffff'} onChange={e => onUpdateStyle({ backgroundColor: e.target.value })} />
                        </div>
                    </div>
                </div>

                <div className="pt-6">
                    <button onClick={() => onDeleteElement(selectedEl.id)} className="w-full py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-100 transition shadow-sm border border-red-100">
                        <Trash2 size={16} /> Hapus Elemen Ini
                    </button>
                </div>
            </div>
        </div>
    );
}
