import React, { useEffect, useState, useCallback } from 'react';
import { User as UserIcon, Trash2, Loader2, Settings, X, GripVertical, Search, BookOpen, ClipboardList, RefreshCw, Plus, Printer } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { JadwalPrintPanel } from './components/JadwalPrintPanel';

const HARI = [
    { id: 1, name: 'Senin' }, { id: 2, name: 'Selasa' }, { id: 3, name: 'Rabu' },
    { id: 4, name: 'Kamis' }, { id: 5, name: 'Jumat' }, { id: 6, name: 'Sabtu' }, { id: 7, name: 'Ahad' }
];

interface KhidmahModel { id: string; nama: string; _count?: { dataKhidmah: number }; }
interface KhidmahSantri { id: string; santri: { id: string; nis: string; namaLengkap: string }; keterangan: string | null; }
interface JadwalRow { id: string; hari: number; mataPelajaran: string; pengajarId: string | null; pengajar: { id: string; name: string } | null; kelas: { id: number; nama: string; tingkat: { nama: string; jenjang: { nama: string } } }; }
interface KelasItem { id: number; nama: string; tingkat?: { nama: string; jenjang?: { nama: string } }; }

// ── Draft state: holds pending drops before both fields are filled ───
interface DraftEntry { pengajarId?: string; pengajarName?: string; mapelName?: string; }

export default function JadwalManagementPage() {
    const { user } = useAuthStore();
    const canEdit = user?.roles?.some(r => r === 'ADMIN' || r === 'STAF_MADRASAH');

    const [masterMapels, setMasterMapels] = useState<any[]>([]);
    const [kelasList, setKelasList] = useState<KelasItem[]>([]);
    const [jadwalList, setJadwalList] = useState<JadwalRow[]>([]);
    const [loadingJadwal, setLoadingJadwal] = useState(false);
    const [loadingKelas, setLoadingKelas] = useState(true);

    const [khidmahModels, setKhidmahModels] = useState<KhidmahModel[]>([]);
    const [selectedKhidmahModel, setSelectedKhidmahModel] = useState('');
    const [khidmahSantriList, setKhidmahSantriList] = useState<KhidmahSantri[]>([]);
    const [loadingKhidmahSantri, setLoadingKhidmahSantri] = useState(false);

    const [selectedHari, setSelectedHari] = useState(1);
    const [searchGuru, setSearchGuru] = useState('');
    const [searchMapel, setSearchMapel] = useState('');
    const [isSlidePanelOpen, setIsSlidePanelOpen] = useState(false);
    const [activeDrag, setActiveDrag] = useState<{ id: string; type: 'pengajar' | 'mapel'; label: string } | null>(null);

    const [newMapelName, setNewMapelName] = useState('');
    const [addingMapel, setAddingMapel] = useState(false);

    // Draft state: kelasId -> { pengajarId, pengajarName, mapelName }
    const [drafts, setDrafts] = useState<Map<number, DraftEntry>>(new Map());

    // Print state
    const [printOpen, setPrintOpen] = useState(false);

    // ─── FETCHERS ───────────────────────────────
    useEffect(() => {
        api.get('/kelas').then(r => { setKelasList(r.data.data || []); setLoadingKelas(false); }).catch(() => setLoadingKelas(false));
        api.get('/khidmah/model').then(r => setKhidmahModels(r.data || [])).catch(() => {});
        fetchMapel();
    }, []);
    useEffect(() => { fetchJadwal(selectedHari); setDrafts(new Map()); }, [selectedHari]);
    useEffect(() => {
        if (!selectedKhidmahModel) { setKhidmahSantriList([]); return; }
        setLoadingKhidmahSantri(true);
        api.get('/khidmah/data', { params: { modelKhidmahId: selectedKhidmahModel } })
            .then(r => setKhidmahSantriList(r.data || []))
            .catch(() => setKhidmahSantriList([]))
            .finally(() => setLoadingKhidmahSantri(false));
    }, [selectedKhidmahModel]);

    const fetchMapel = () => api.get('/jadwal/mata-pelajaran').then(r => setMasterMapels(r.data.data)).catch(() => {});
    const fetchJadwal = useCallback((h: number) => {
        setLoadingJadwal(true);
        api.get(`/jadwal/hari/${h}`).then(r => setJadwalList(r.data.data || [])).catch(() => {}).finally(() => setLoadingJadwal(false));
    }, []);

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

    const saveJadwal = async (kelasId: number, pengajarId: string, mapelName: string) => {
        try {
            // If there's an existing jadwal for this kelas+hari, delete it first
            const existing = jadwalList.find(j => j.kelas.id === kelasId);
            if (existing) {
                await api.delete(`/jadwal/${existing.id}`);
            }
            await api.post('/jadwal', { kelasId, hari: selectedHari, mataPelajaran: mapelName, pengajarId });
            // Clear draft
            setDrafts(prev => { const n = new Map(prev); n.delete(kelasId); return n; });
            fetchJadwal(selectedHari);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Gagal menyimpan jadwal');
        }
    };

    const handleDrop = async (kelasId: number, type: 'pengajar' | 'mapel', value: string, label: string) => {
        // Get existing jadwal for this kelas
        const existing = jadwalList.find(j => j.kelas.id === kelasId);
        const draft = drafts.get(kelasId) || {};

        if (type === 'pengajar') {
            // We need to resolve santriId -> userId first
            let userId: string;
            try {
                const res = await api.post('/jadwal/guru-mapel', { santriId: value, mataPelajaran: '_lookup' });
                userId = res.data?.data?.userId;
                if (!userId) { alert('Gagal menentukan user dari santri'); return; }
            } catch (err: any) {
                alert(err.response?.data?.message || 'Gagal'); return;
            }

            if (existing?.mataPelajaran || draft.mapelName) {
                // Both fields are now filled — save immediately
                const mapel = existing?.mataPelajaran || draft.mapelName!;
                await saveJadwal(kelasId, userId, mapel);
            } else {
                // Only pengajar set — save as draft, wait for mapel
                setDrafts(prev => new Map(prev).set(kelasId, { ...draft, pengajarId: userId, pengajarName: label }));
            }
        } else {
            // type === 'mapel'
            if (existing?.pengajarId || draft.pengajarId) {
                // Both fields are now filled — save immediately
                const pid = existing?.pengajarId || draft.pengajarId!;
                await saveJadwal(kelasId, pid, value);
            } else {
                // Only mapel set — save as draft, wait for pengajar
                setDrafts(prev => new Map(prev).set(kelasId, { ...draft, mapelName: value }));
            }
        }
    };

    const kelasLabel = (k: KelasItem) => `${k.tingkat?.jenjang?.nama || ''} ${k.tingkat?.nama || ''} ${k.nama}`.trim();

    const filteredSantri = khidmahSantriList.filter(ks =>
        ks.santri.namaLengkap.toLowerCase().includes(searchGuru.toLowerCase()) || ks.santri.nis.includes(searchGuru)
    );
    const filteredMapel = masterMapels.filter(m =>
        m.nama.toLowerCase().includes(searchMapel.toLowerCase())
    );

    // ─── DND ────────────────────────────────────
    const onDragStart = (e: DragStartEvent) => {
        const id = String(e.active.id);
        if (id.startsWith('pengajar:')) {
            const santriId = id.replace('pengajar:', '');
            const info = khidmahSantriList.find(ks => ks.santri.id === santriId);
            setActiveDrag({ id: santriId, type: 'pengajar', label: info?.santri.namaLengkap || '' });
        } else if (id.startsWith('mapel:')) {
            const name = id.replace('mapel:', '');
            setActiveDrag({ id: name, type: 'mapel', label: name });
        }
    };

    const onDragEnd = (event: DragEndEvent) => {
        const drag = activeDrag;
        setActiveDrag(null);
        if (!canEdit || !drag) return;
        const { over } = event;
        if (!over) return;
        const overId = String(over.id);
        // Format: "cell:{type}:{kelasId}"
        if (!overId.startsWith('cell:')) return;
        const parts = overId.split(':');
        const cellType = parts[1] as 'pengajar' | 'mapel';
        const kelasId = Number(parts[2]);
        // Validate: pengajar can only drop on pengajar cell, mapel on mapel cell
        if (drag.type !== cellType) return;
        handleDrop(kelasId, drag.type, drag.id, drag.label);
    };

    // ─── SUB COMPONENTS ─────────────────────────

    const PengajarDraggable = ({ ks }: { ks: KhidmahSantri }) => {
        const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `pengajar:${ks.santri.id}` });
        return (
            <div ref={setNodeRef} {...listeners} {...attributes}
                className={`flex items-center gap-2 px-3 py-[7px] border-b border-slate-100 hover:bg-slate-50 cursor-grab active:cursor-grabbing transition ${isDragging ? 'opacity-20' : ''}`}>
                <GripVertical size={12} className="text-slate-300 shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-slate-700 truncate leading-tight">{ks.santri.namaLengkap}</div>
                    <div className="text-[10px] text-slate-400 font-mono leading-tight">{ks.santri.nis}</div>
                </div>
                {ks.keterangan && <div className="text-[9px] text-teal-600 font-medium bg-teal-50 px-1.5 py-0.5 rounded truncate max-w-[70px]" title={ks.keterangan}>{ks.keterangan}</div>}
            </div>
        );
    };

    const MapelDraggable = ({ m }: { m: any }) => {
        const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `mapel:${m.nama}` });
        return (
            <div ref={setNodeRef} {...listeners} {...attributes}
                className={`flex items-center gap-2 px-3 py-[7px] border-b border-slate-100 hover:bg-slate-50 cursor-grab active:cursor-grabbing transition ${isDragging ? 'opacity-20' : ''}`}>
                <GripVertical size={12} className="text-slate-300 shrink-0" />
                <BookOpen size={11} className="text-orange-400 shrink-0" />
                <span className="text-[12px] font-medium text-slate-700 truncate">{m.nama}</span>
            </div>
        );
    };

    const DroppableCell = ({ id, children, isEmpty }: { id: string; children: React.ReactNode; isEmpty?: boolean }) => {
        const { setNodeRef, isOver } = useDroppable({ id });
        const highlight = isOver && canEdit;
        return (
            <div ref={setNodeRef}
                className={`px-3 py-[7px] border-r border-slate-100 truncate transition-colors ${highlight ? 'bg-teal-50 ring-1 ring-inset ring-teal-300' : ''} ${isEmpty && canEdit ? 'cursor-copy' : ''}`}>
                {children}
            </div>
        );
    };

    // ─── RENDER ─────────────────────────────────
    return (
        <div className="flex h-[calc(100dvh-64px)] bg-white text-slate-700 overflow-hidden">
            <DndContext onDragEnd={onDragEnd} onDragStart={onDragStart}>

                {/* ═══ LEFT SIDEBAR: Pengajar ═══ */}
                <div className="w-[200px] shrink-0 border-r border-slate-200 bg-slate-50/80 flex flex-col hidden md:flex">
                    <div className="h-10 border-b border-slate-200 flex items-center justify-between px-3 shrink-0 bg-white">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Pengajar</span>
                        {canEdit && (
                            <button onClick={() => setIsSlidePanelOpen(true)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition" title="Kelola Mapel">
                                <Settings size={13} />
                            </button>
                        )}
                    </div>

                    {/* Model picker */}
                    <div className="px-3 py-2 border-b border-slate-200 space-y-1.5 bg-white">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-teal-600 uppercase tracking-widest">
                            <ClipboardList size={10} /> Khidmah
                        </div>
                        <select value={selectedKhidmahModel} onChange={e => setSelectedKhidmahModel(e.target.value)}
                            className="w-full text-[11px] px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-600 focus:border-teal-400 outline-none">
                            <option value="">Pilih model...</option>
                            {khidmahModels.map(m => <option key={m.id} value={m.id}>{m.nama} ({m._count?.dataKhidmah ?? 0})</option>)}
                        </select>
                    </div>

                    {/* Search */}
                    {selectedKhidmahModel && khidmahSantriList.length > 0 && (
                        <div className="px-3 py-2 border-b border-slate-200 bg-white">
                            <div className="relative">
                                <Search size={11} className="absolute left-2 top-[6px] text-slate-400" />
                                <input type="text" value={searchGuru} onChange={e => setSearchGuru(e.target.value)} placeholder="Cari pengajar..."
                                    className="w-full text-[11px] pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-600 focus:border-teal-400 outline-none" />
                            </div>
                        </div>
                    )}

                    {/* List */}
                    <div className="flex-1 overflow-y-auto bg-white">
                        {!selectedKhidmahModel ? (
                            <div className="text-center py-8 px-3"><p className="text-[11px] text-slate-400">Pilih model khidmah</p></div>
                        ) : loadingKhidmahSantri ? (
                            <div className="py-8 flex justify-center"><Loader2 size={14} className="animate-spin text-slate-400" /></div>
                        ) : filteredSantri.length === 0 ? (
                            <div className="text-center py-8 text-[11px] text-slate-400">{searchGuru ? 'Tidak ditemukan' : 'Kosong'}</div>
                        ) : filteredSantri.map(ks => <PengajarDraggable key={ks.santri.id} ks={ks} />)}
                    </div>
                </div>

                {/* ═══ MAIN AREA ═══ */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Toolbar */}
                    <div className="h-10 border-b border-slate-200 bg-white flex items-center px-3 gap-1.5 shrink-0 overflow-x-auto">
                        <button onClick={() => fetchJadwal(selectedHari)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition" title="Refresh">
                            <RefreshCw size={13} />
                        </button>
                        <div className="w-px h-5 bg-slate-200 mx-0.5" />

                        {HARI.map(h => (
                            <button key={h.id} onClick={() => setSelectedHari(h.id)}
                                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition whitespace-nowrap ${
                                    selectedHari === h.id
                                        ? 'bg-teal-500 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                }`}>
                                {h.name}
                            </button>
                        ))}

                        <div className="flex-1" />
                        <button onClick={() => setPrintOpen(true)}
                            className="px-2 py-0.5 text-[10px] font-semibold text-teal-600 hover:bg-teal-50 rounded flex items-center gap-1 transition shrink-0">
                            <Printer size={11} /> Cetak
                        </button>
                        <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{kelasList.length} kelas</span>
                    </div>

                    {/* Column header */}
                    <div className="bg-slate-50 border-b border-slate-200 shrink-0">
                        <div className="grid grid-cols-[36px_1fr_1fr_1fr_40px] min-w-[500px]">
                            <div className="px-2 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 text-center">#</div>
                            <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Kelas</div>
                            <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Pengajar</div>
                            <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Mata Pelajaran</div>
                            <div className="px-2 py-[7px]"></div>
                        </div>
                    </div>

                    {/* Table body */}
                    <div className="flex-1 overflow-auto">
                        {loadingKelas || loadingJadwal ? (
                            <div className="flex items-center justify-center h-full"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
                        ) : kelasList.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                <div className="text-center space-y-1">
                                    <p className="text-xs">Belum ada kelas</p>
                                    <p className="text-[10px]">Buat kelas terlebih dahulu di <a href="/madrasah/kelas" className="text-teal-600 underline">Manajemen Kelas</a></p>
                                </div>
                            </div>
                        ) : (
                            <div className="min-w-[500px]">
                                {kelasList.map((k, idx) => {
                                    const jadwal = jadwalList.find(j => j.kelas.id === k.id);
                                    const draft = drafts.get(k.id);
                                    const pengajarName = jadwal?.pengajar?.name || draft?.pengajarName;
                                    const mapelName = jadwal?.mataPelajaran || draft?.mapelName;
                                    const hasDraft = !jadwal && draft && (draft.pengajarName || draft.mapelName);

                                    return (
                                        <div key={k.id} className={`grid grid-cols-[36px_1fr_1fr_1fr_40px] border-b border-slate-100 hover:bg-slate-50/80 transition group ${hasDraft ? 'bg-amber-50/40' : ''}`}>
                                            <div className="px-2 py-[7px] text-[11px] text-slate-400 border-r border-slate-100 text-center tabular-nums">{idx + 1}</div>
                                            <div className="px-3 py-[7px] text-[12px] font-medium text-slate-700 border-r border-slate-100 truncate">
                                                {kelasLabel(k)}
                                            </div>
                                            <DroppableCell id={`cell:pengajar:${k.id}`} isEmpty={!pengajarName}>
                                                {pengajarName ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-4 h-4 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                                                            <UserIcon size={9} className="text-teal-500" />
                                                        </div>
                                                        <span className={`text-[12px] font-medium truncate ${jadwal ? 'text-slate-700' : 'text-amber-600 italic'}`}>{pengajarName}</span>
                                                        {!jadwal && <span className="text-[8px] text-amber-400 font-bold shrink-0">DRAFT</span>}
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-slate-300 italic">Drop pengajar</span>
                                                )}
                                            </DroppableCell>
                                            <DroppableCell id={`cell:mapel:${k.id}`} isEmpty={!mapelName}>
                                                {mapelName ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-[12px] font-medium ${jadwal ? 'text-orange-600' : 'text-amber-600 italic'}`}>{mapelName}</span>
                                                        {!jadwal && <span className="text-[8px] text-amber-400 font-bold shrink-0">DRAFT</span>}
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-slate-300 italic">Drop mapel</span>
                                                )}
                                            </DroppableCell>
                                            <div className="px-2 py-[7px] flex items-center justify-center gap-0.5">
                                                {jadwal && canEdit && (
                                                    <button onClick={() => handleDelete(jadwal.id)}
                                                        className="p-0.5 text-slate-300 hover:text-red-500 rounded transition opacity-0 group-hover:opacity-100">
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                                {!jadwal && draft && (
                                                    <button onClick={() => setDrafts(prev => { const n = new Map(prev); n.delete(k.id); return n; })}
                                                        className="p-0.5 text-amber-300 hover:text-red-500 rounded transition opacity-0 group-hover:opacity-100" title="Hapus draft">
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Status bar */}
                    <div className="h-7 border-t border-slate-200 bg-slate-50/80 flex items-center px-3 shrink-0">
                        <span className="text-[10px] text-slate-400">
                            {jadwalList.length} jadwal · {kelasList.length} kelas · {HARI.find(h => h.id === selectedHari)?.name}
                        </span>
                    </div>
                </div>

                {/* ═══ RIGHT SIDEBAR: Mata Pelajaran ═══ */}
                <div className="w-[180px] shrink-0 border-l border-slate-200 bg-slate-50/80 flex flex-col hidden md:flex">
                    <div className="h-10 border-b border-slate-200 flex items-center justify-between px-3 shrink-0 bg-white">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Mapel</span>
                        {canEdit && (
                            <button onClick={() => setIsSlidePanelOpen(true)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition" title="Kelola Mapel">
                                <Plus size={13} />
                            </button>
                        )}
                    </div>

                    {masterMapels.length > 5 && (
                        <div className="px-3 py-2 border-b border-slate-200 bg-white">
                            <div className="relative">
                                <Search size={11} className="absolute left-2 top-[6px] text-slate-400" />
                                <input type="text" value={searchMapel} onChange={e => setSearchMapel(e.target.value)} placeholder="Cari mapel..."
                                    className="w-full text-[11px] pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-600 focus:border-orange-400 outline-none" />
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto bg-white">
                        {masterMapels.length === 0 ? (
                            <div className="text-center py-8 px-3">
                                <p className="text-[11px] text-slate-400">Belum ada mapel</p>
                                {canEdit && <button onClick={() => setIsSlidePanelOpen(true)} className="text-[10px] text-teal-600 underline mt-1">Buat Mapel</button>}
                            </div>
                        ) : filteredMapel.map(m => <MapelDraggable key={m.id} m={m} />)}
                    </div>
                </div>

                <DragOverlay dropAnimation={null}>
                    {activeDrag ? (
                        <div className={`rounded p-2 shadow-xl opacity-95 cursor-grabbing w-[180px] border flex items-center gap-2 ${
                            activeDrag.type === 'pengajar'
                                ? 'bg-teal-600 text-white border-teal-500'
                                : 'bg-orange-500 text-white border-orange-400'
                        }`}>
                            <GripVertical size={12} className="opacity-60" />
                            {activeDrag.type === 'pengajar'
                                ? <UserIcon size={11} />
                                : <BookOpen size={11} />
                            }
                            <div className="text-[11px] font-semibold truncate">{activeDrag.label}</div>
                        </div>
                    ) : null}
                </DragOverlay>

            </DndContext>

            {/* ═══ SLIDE PANEL: Kelola Mapel ═══ */}
            {isSlidePanelOpen && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] z-40" onClick={() => setIsSlidePanelOpen(false)} />}
            <div className={`fixed top-0 right-0 h-full w-full sm:w-[340px] bg-white shadow-2xl z-50 transform transition-transform duration-300 border-l border-slate-200 flex flex-col ${isSlidePanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between shrink-0">
                    <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2"><BookOpen size={14} className="text-orange-500" /> Mata Pelajaran</h2>
                    <button onClick={() => setIsSlidePanelOpen(false)} className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition"><X size={14} /></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 border-b border-slate-100">
                        <form onSubmit={handleCreateMapel} className="flex gap-2">
                            <input type="text" value={newMapelName} onChange={e => setNewMapelName(e.target.value)} placeholder="Nama mapel baru..." required
                                className="flex-1 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:border-teal-400 outline-none" />
                            <button type="submit" disabled={addingMapel} className="bg-teal-500 hover:bg-teal-600 text-white font-semibold px-3 py-1.5 rounded text-xs flex items-center gap-1">
                                {addingMapel ? <Loader2 size={12} className="animate-spin" /> : <><Plus size={12} /> Buat</>}
                            </button>
                        </form>
                    </div>
                    <div className="p-4 space-y-1">
                        {masterMapels.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-4">Belum ada mapel</p>
                        ) : masterMapels.map(m => (
                            <div key={m.id} className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-slate-50 group transition">
                                <span className="text-xs font-medium text-slate-600">{m.nama}</span>
                                <button onClick={async () => {
                                    if (!window.confirm(`Hapus "${m.nama}"?`)) return;
                                    try { await api.delete(`/jadwal/mata-pelajaran/${m.id}`); fetchMapel(); } catch { alert('Gagal'); }
                                }} className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                                    <Trash2 size={11} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {printOpen && (
                <JadwalPrintPanel
                    isOpen={printOpen}
                    kelasList={kelasList.map(k => ({ id: k.id, name: kelasLabel(k) }))}
                    hari={selectedHari}
                    onClose={() => setPrintOpen(false)}
                />
            )}
        </div>
    );
}
