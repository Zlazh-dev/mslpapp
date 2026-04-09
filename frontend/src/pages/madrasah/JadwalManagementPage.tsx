import React, { useEffect, useState } from 'react';
import { User as UserIcon, Trash2, Loader2, Settings, X, GripVertical, Search, BookOpen, ClipboardList, RefreshCw, Plus } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragOverlay } from '@dnd-kit/core';

const HARI = [
    { id: 1, name: 'Senin' }, { id: 2, name: 'Selasa' }, { id: 3, name: 'Rabu' },
    { id: 4, name: 'Kamis' }, { id: 5, name: 'Jumat' }, { id: 6, name: 'Sabtu' }, { id: 7, name: 'Ahad' }
];

interface KhidmahModel { id: string; nama: string; _count?: { dataKhidmah: number }; }
interface KhidmahSantri { id: string; santri: { id: string; nis: string; namaLengkap: string }; keterangan: string | null; }
interface JadwalRow { id: string; hari: number; mataPelajaran: string; pengajarId: string | null; pengajar: { id: string; name: string } | null; kelas: { id: number; nama: string; tingkat: { nama: string; jenjang: { nama: string } } }; }

export default function JadwalManagementPage() {
    const { user } = useAuthStore();
    const canEdit = user?.roles?.some(r => r === 'ADMIN' || r === 'STAF_MADRASAH');

    const [masterMapels, setMasterMapels] = useState<any[]>([]);
    const [kelasList, setKelasList] = useState<any[]>([]);
    const [jadwalList, setJadwalList] = useState<JadwalRow[]>([]);
    const [loadingJadwal, setLoadingJadwal] = useState(false);

    const [khidmahModels, setKhidmahModels] = useState<KhidmahModel[]>([]);
    const [selectedKhidmahModel, setSelectedKhidmahModel] = useState('');
    const [khidmahSantriList, setKhidmahSantriList] = useState<KhidmahSantri[]>([]);
    const [loadingKhidmahSantri, setLoadingKhidmahSantri] = useState(false);

    const [selectedHari, setSelectedHari] = useState(1);
    const [searchGuru, setSearchGuru] = useState('');
    const [isSlidePanelOpen, setIsSlidePanelOpen] = useState(false);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    const [dropModal, setDropModal] = useState<{ santriId: string; santriName: string } | null>(null);
    const [dropKelasId, setDropKelasId] = useState('');
    const [dropMapelName, setDropMapelName] = useState('');
    const [dropping, setDropping] = useState(false);

    const [newMapelName, setNewMapelName] = useState('');
    const [addingMapel, setAddingMapel] = useState(false);

    // ─── FETCHERS ───────────────────────────────
    useEffect(() => {
        api.get('/kelas').then(r => setKelasList(r.data.data || []));
        api.get('/khidmah/model').then(r => setKhidmahModels(r.data || [])).catch(() => {});
        fetchMapel();
    }, []);
    useEffect(() => { fetchJadwal(selectedHari); }, [selectedHari]);
    useEffect(() => {
        if (!selectedKhidmahModel) { setKhidmahSantriList([]); return; }
        setLoadingKhidmahSantri(true);
        api.get('/khidmah/data', { params: { modelKhidmahId: selectedKhidmahModel } })
            .then(r => setKhidmahSantriList(r.data || []))
            .catch(() => setKhidmahSantriList([]))
            .finally(() => setLoadingKhidmahSantri(false));
    }, [selectedKhidmahModel]);

    const fetchMapel = () => api.get('/jadwal/mata-pelajaran').then(r => setMasterMapels(r.data.data)).catch(() => {});
    const fetchJadwal = (h: number) => {
        setLoadingJadwal(true);
        api.get(`/jadwal/hari/${h}`).then(r => setJadwalList(r.data.data || [])).catch(() => {}).finally(() => setLoadingJadwal(false));
    };

    // ─── HANDLERS ───────────────────────────────
    const handleCreateMapel = async (e: React.FormEvent) => {
        e.preventDefault(); if (!newMapelName) return;
        setAddingMapel(true);
        try { await api.post('/jadwal/mata-pelajaran', { nama: newMapelName }); setNewMapelName(''); fetchMapel(); }
        catch (err: any) { alert(err.response?.data?.message || 'Gagal'); }
        finally { setAddingMapel(false); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Hapus jadwal ini?')) return;
        try { await api.delete(`/jadwal/${id}`); setJadwalList(p => p.filter(j => j.id !== id)); } catch { alert('Gagal'); }
    };

    const handleDropSubmit = async () => {
        if (!dropModal || !dropKelasId || !dropMapelName) return;
        setDropping(true);
        try {
            const gm = await api.post('/jadwal/guru-mapel', { santriId: dropModal.santriId, mataPelajaran: dropMapelName });
            const uid = gm.data?.data?.userId;
            if (!uid) { alert('Gagal menentukan pengajar'); return; }
            await api.post('/jadwal', { kelasId: Number(dropKelasId), hari: selectedHari, mataPelajaran: dropMapelName, pengajarId: uid });
            setDropModal(null); setDropKelasId(''); setDropMapelName('');
            fetchJadwal(selectedHari);
        } catch (err: any) { alert(err.response?.data?.message || 'Gagal'); }
        finally { setDropping(false); }
    };

    const kelasLabel = (k: any) => `${k.tingkat?.jenjang?.nama || ''} ${k.tingkat?.nama || ''} ${k.nama}`.trim();

    const filteredSantri = khidmahSantriList.filter(ks =>
        ks.santri.namaLengkap.toLowerCase().includes(searchGuru.toLowerCase()) || ks.santri.nis.includes(searchGuru)
    );

    // ─── DND ────────────────────────────────────
    const onDragStart = (e: any) => setActiveDragId(e.active.id);
    const onDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        if (!canEdit) return;
        const { active, over } = event;
        if (!over || over.id !== 'drop-zone') return;
        const info = khidmahSantriList.find(ks => ks.santri.id === active.id);
        if (!info) return;
        if (!masterMapels.length) { alert('Buat mapel dulu.'); return; }
        if (!kelasList.length) { alert('Belum ada kelas.'); return; }
        setDropModal({ santriId: info.santri.id, santriName: info.santri.namaLengkap });
        setDropKelasId(kelasList[0]?.id?.toString() || '');
        setDropMapelName(masterMapels[0]?.nama || '');
    };

    // ─── SUB COMPONENTS ─────────────────────────
    const Draggable = ({ ks }: { ks: KhidmahSantri }) => {
        const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: ks.santri.id });
        return (
            <div ref={setNodeRef} {...listeners} {...attributes}
                className={`flex items-center gap-2 px-3 py-[7px] border-b border-slate-700/40 hover:bg-slate-700/50 cursor-grab active:cursor-grabbing transition ${isDragging ? 'opacity-20' : ''}`}>
                <GripVertical size={12} className="text-slate-500 shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-slate-200 truncate leading-tight">{ks.santri.namaLengkap}</div>
                    <div className="text-[10px] text-slate-500 font-mono leading-tight">{ks.santri.nis}</div>
                </div>
                {ks.keterangan && <div className="text-[9px] text-teal-400 font-medium bg-teal-900/40 px-1.5 py-0.5 rounded truncate max-w-[70px]" title={ks.keterangan}>{ks.keterangan}</div>}
            </div>
        );
    };

    const DropZone = ({ children }: { children: React.ReactNode }) => {
        const { setNodeRef, isOver } = useDroppable({ id: 'drop-zone' });
        return <div ref={setNodeRef} className={`flex-1 overflow-auto ${isOver ? 'ring-2 ring-inset ring-teal-500/50 bg-teal-950/10' : ''}`}>{children}</div>;
    };

    // ─── RENDER ─────────────────────────────────
    return (
        <div className="flex h-[calc(100vh-64px)] bg-[#1c1c1c] text-slate-200 overflow-hidden">
            <DndContext onDragEnd={onDragEnd} onDragStart={onDragStart}>

                {/* ═══ LEFT SIDEBAR ═══ */}
                <div className="w-[220px] shrink-0 border-r border-slate-700/60 bg-[#1a1a1a] flex flex-col hidden md:flex">
                    {/* Header */}
                    <div className="h-10 border-b border-slate-700/60 flex items-center justify-between px-3 shrink-0">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pengajar</span>
                        {canEdit && (
                            <button onClick={() => setIsSlidePanelOpen(true)} className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 transition" title="Kelola Mapel">
                                <Settings size={13} />
                            </button>
                        )}
                    </div>

                    {/* Model picker */}
                    <div className="px-3 py-2 border-b border-slate-700/60 space-y-1.5">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-teal-500 uppercase tracking-widest">
                            <ClipboardList size={10} /> Khidmah
                        </div>
                        <select value={selectedKhidmahModel} onChange={e => setSelectedKhidmahModel(e.target.value)}
                            className="w-full text-[11px] px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 focus:border-teal-600 outline-none">
                            <option value="">Pilih model...</option>
                            {khidmahModels.map(m => <option key={m.id} value={m.id}>{m.nama} ({m._count?.dataKhidmah ?? 0})</option>)}
                        </select>
                    </div>

                    {/* Search */}
                    {selectedKhidmahModel && khidmahSantriList.length > 0 && (
                        <div className="px-3 py-2 border-b border-slate-700/60">
                            <div className="relative">
                                <Search size={11} className="absolute left-2 top-[6px] text-slate-500" />
                                <input type="text" value={searchGuru} onChange={e => setSearchGuru(e.target.value)} placeholder="Cari..."
                                    className="w-full text-[11px] pl-6 pr-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 focus:border-teal-600 outline-none" />
                            </div>
                        </div>
                    )}

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {!selectedKhidmahModel ? (
                            <div className="text-center py-8 px-3"><p className="text-[11px] text-slate-600">Pilih model khidmah</p></div>
                        ) : loadingKhidmahSantri ? (
                            <div className="py-8 flex justify-center"><Loader2 size={14} className="animate-spin text-slate-600" /></div>
                        ) : filteredSantri.length === 0 ? (
                            <div className="text-center py-8 text-[11px] text-slate-600">{searchGuru ? 'Tidak ditemukan' : 'Kosong'}</div>
                        ) : filteredSantri.map(ks => <Draggable key={ks.santri.id} ks={ks} />)}
                    </div>
                </div>

                {/* ═══ MAIN AREA ═══ */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Toolbar */}
                    <div className="h-10 border-b border-slate-700/60 bg-[#1e1e1e] flex items-center px-3 gap-2 shrink-0 overflow-x-auto">
                        <button onClick={() => fetchJadwal(selectedHari)} className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 transition" title="Refresh">
                            <RefreshCw size={13} />
                        </button>
                        <div className="w-px h-5 bg-slate-700/60 mx-0.5" />

                        {/* Hari tabs */}
                        {HARI.map(h => (
                            <button key={h.id} onClick={() => setSelectedHari(h.id)}
                                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition whitespace-nowrap ${
                                    selectedHari === h.id
                                        ? 'bg-teal-600/90 text-white'
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                                }`}>
                                {h.name}
                            </button>
                        ))}

                        <div className="w-px h-5 bg-slate-700/60 mx-0.5" />
                        <span className="text-[10px] text-slate-600 ml-auto">{jadwalList.length} rows</span>

                        <div className="md:hidden ml-1">
                            {canEdit && <button onClick={() => setIsSlidePanelOpen(true)} className="p-1 bg-slate-700 text-slate-300 rounded"><Settings size={12}/></button>}
                        </div>
                    </div>

                    {/* Column header */}
                    <div className="bg-[#222] border-b border-slate-700/60 shrink-0">
                        <div className="grid grid-cols-[40px_1fr_1fr_1fr_48px] min-w-[600px]">
                            <div className="px-2 py-2 text-[10px] font-bold text-slate-500 border-r border-slate-700/40 text-center">#</div>
                            <div className="px-3 py-2 text-[10px] font-bold text-slate-500 border-r border-slate-700/40 uppercase tracking-wider">Pengajar</div>
                            <div className="px-3 py-2 text-[10px] font-bold text-slate-500 border-r border-slate-700/40 uppercase tracking-wider">Mata Pelajaran</div>
                            <div className="px-3 py-2 text-[10px] font-bold text-slate-500 border-r border-slate-700/40 uppercase tracking-wider">Kelas</div>
                            {canEdit && <div className="px-2 py-2 text-[10px] font-bold text-slate-500 text-center"></div>}
                        </div>
                    </div>

                    {/* Table body */}
                    <DropZone>
                        {loadingJadwal ? (
                            <div className="flex items-center justify-center h-full"><Loader2 size={20} className="animate-spin text-slate-600" /></div>
                        ) : jadwalList.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-slate-600">
                                <div className="text-center space-y-1">
                                    <p className="text-xs">Belum ada data untuk hari <strong className="text-slate-400">{HARI.find(h => h.id === selectedHari)?.name}</strong></p>
                                    <p className="text-[10px]">Seret pengajar dari sidebar ke area ini</p>
                                </div>
                            </div>
                        ) : (
                            <div className="min-w-[600px]">
                                {jadwalList.map((j, idx) => (
                                    <div key={j.id} className="grid grid-cols-[40px_1fr_1fr_1fr_48px] border-b border-slate-700/30 hover:bg-slate-800/50 transition group">
                                        <div className="px-2 py-2 text-[11px] text-slate-600 border-r border-slate-700/30 text-center tabular-nums">{idx + 1}</div>
                                        <div className="px-3 py-2 text-[12px] text-slate-300 border-r border-slate-700/30 truncate flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-teal-900/60 flex items-center justify-center shrink-0">
                                                <UserIcon size={10} className="text-teal-400" />
                                            </div>
                                            <span className="truncate font-medium">{j.pengajar?.name || '—'}</span>
                                        </div>
                                        <div className="px-3 py-2 text-[12px] border-r border-slate-700/30 truncate">
                                            <span className="text-orange-400 font-medium">{j.mataPelajaran}</span>
                                        </div>
                                        <div className="px-3 py-2 text-[12px] text-slate-400 border-r border-slate-700/30 truncate">
                                            {j.kelas ? kelasLabel(j.kelas) : '—'}
                                        </div>
                                        {canEdit && (
                                            <div className="px-2 py-2 flex items-center justify-center">
                                                <button onClick={() => handleDelete(j.id)}
                                                    className="p-1 text-slate-700 hover:text-red-400 rounded transition opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </DropZone>

                    {/* Status bar */}
                    <div className="h-7 border-t border-slate-700/60 bg-[#1a1a1a] flex items-center px-3 shrink-0">
                        <span className="text-[10px] text-slate-600">{jadwalList.length} entri · {HARI.find(h => h.id === selectedHari)?.name}</span>
                    </div>
                </div>

                <DragOverlay dropAnimation={null}>
                    {activeDragId ? (() => {
                        const ac = khidmahSantriList.find(ks => ks.santri.id === activeDragId);
                        if (!ac) return null;
                        return (
                            <div className="bg-teal-700 text-white rounded p-2 shadow-xl opacity-95 cursor-grabbing w-[200px] border border-teal-600 flex items-center gap-2">
                                <GripVertical size={12} className="text-teal-300" />
                                <div className="text-[11px] font-semibold truncate">{ac.santri.namaLengkap}</div>
                            </div>
                        );
                    })() : null}
                </DragOverlay>

            </DndContext>

            {/* ═══ SLIDE PANEL: Kelola Mapel ═══ */}
            {isSlidePanelOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsSlidePanelOpen(false)} />}
            <div className={`fixed top-0 right-0 h-full w-full sm:w-[340px] bg-[#1a1a1a] shadow-2xl z-50 transform transition-transform duration-300 border-l border-slate-700/60 flex flex-col ${isSlidePanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-12 px-4 border-b border-slate-700/60 flex items-center justify-between shrink-0">
                    <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2"><BookOpen size={14} className="text-orange-400" /> Mata Pelajaran</h2>
                    <button onClick={() => setIsSlidePanelOpen(false)} className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 transition"><X size={14} /></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 border-b border-slate-700/60">
                        <form onSubmit={handleCreateMapel} className="flex gap-2">
                            <input type="text" value={newMapelName} onChange={e => setNewMapelName(e.target.value)} placeholder="Nama mapel baru..." required
                                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:border-teal-600 outline-none" />
                            <button type="submit" disabled={addingMapel} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-3 py-1.5 rounded text-xs flex items-center gap-1">
                                {addingMapel ? <Loader2 size={12} className="animate-spin" /> : <><Plus size={12} /> Buat</>}
                            </button>
                        </form>
                    </div>
                    <div className="p-4 space-y-1">
                        {masterMapels.length === 0 ? (
                            <p className="text-xs text-slate-600 italic text-center py-4">Belum ada mapel</p>
                        ) : masterMapels.map(m => (
                            <div key={m.id} className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-slate-800 group transition">
                                <span className="text-xs font-medium text-slate-400">{m.nama}</span>
                                <button onClick={async () => {
                                    if (!window.confirm(`Hapus "${m.nama}"?`)) return;
                                    try { await api.delete(`/jadwal/mata-pelajaran/${m.id}`); fetchMapel(); } catch { alert('Gagal'); }
                                }} className="text-slate-700 hover:text-red-400 transition opacity-0 group-hover:opacity-100">
                                    <Trash2 size={11} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ DROP MODAL ═══ */}
            {dropModal && (
                <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDropModal(null)}>
                    <div className="bg-[#222] rounded-lg shadow-2xl w-full max-w-xs border border-slate-700" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-700/60">
                            <h3 className="font-bold text-sm text-slate-200">Tambah Jadwal</h3>
                            <p className="text-[11px] text-slate-500 mt-1"><strong className="text-slate-300">{dropModal.santriName}</strong> · {HARI.find(h => h.id === selectedHari)?.name}</p>
                        </div>
                        <div className="p-4 space-y-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Kelas</label>
                                <select value={dropKelasId} onChange={e => setDropKelasId(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:border-teal-600 outline-none">
                                    {kelasList.map(k => <option key={k.id} value={k.id}>{kelasLabel(k)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Mata Pelajaran</label>
                                <select value={dropMapelName} onChange={e => setDropMapelName(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:border-teal-600 outline-none">
                                    {masterMapels.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="p-3 border-t border-slate-700/60 flex gap-2">
                            <button onClick={() => setDropModal(null)} className="flex-1 py-1.5 rounded border border-slate-700 text-xs font-semibold text-slate-400 hover:bg-slate-800 transition">Batal</button>
                            <button onClick={handleDropSubmit} disabled={dropping || !dropKelasId || !dropMapelName}
                                className="flex-1 py-1.5 rounded bg-teal-600 text-xs font-semibold text-white hover:bg-teal-700 transition disabled:opacity-50">
                                {dropping ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
