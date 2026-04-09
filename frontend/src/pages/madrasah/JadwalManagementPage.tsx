import React, { useEffect, useState } from 'react';
import { Calendar, User as UserIcon, Trash2, Loader2, Settings, X, GripVertical, Search, BookOpen, ClipboardList } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragOverlay } from '@dnd-kit/core';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────────

const HARI_LIST = [
    { id: 1, name: 'Senin' },
    { id: 2, name: 'Selasa' },
    { id: 3, name: 'Rabu' },
    { id: 4, name: 'Kamis' },
    { id: 5, name: 'Jumat' },
    { id: 6, name: 'Sabtu' },
    { id: 7, name: 'Ahad' }
];

interface KhidmahModel { id: string; nama: string; _count?: { dataKhidmah: number }; }
interface KhidmahSantri { id: string; santri: { id: string; nis: string; namaLengkap: string }; keterangan: string | null; }
interface JadwalRow { id: string; hari: number; mataPelajaran: string; pengajarId: string | null; pengajar: { id: string; name: string } | null; kelas: { id: number; nama: string; tingkat: { nama: string; jenjang: { nama: string } } }; }

// ─── MAIN ───────────────────────────────────────────────────────────────────────

export default function JadwalManagementPage() {
    const { user } = useAuthStore();
    const canEdit = user?.roles?.some(r => r === 'ADMIN' || r === 'STAF_MADRASAH');

    // Data
    const [masterMapels, setMasterMapels] = useState<any[]>([]);
    const [kelasList, setKelasList] = useState<any[]>([]);
    const [jadwalList, setJadwalList] = useState<JadwalRow[]>([]);
    const [loadingJadwal, setLoadingJadwal] = useState(false);

    // Khidmah left panel
    const [khidmahModels, setKhidmahModels] = useState<KhidmahModel[]>([]);
    const [selectedKhidmahModel, setSelectedKhidmahModel] = useState('');
    const [khidmahSantriList, setKhidmahSantriList] = useState<KhidmahSantri[]>([]);
    const [loadingKhidmahSantri, setLoadingKhidmahSantri] = useState(false);

    // Filter & search
    const [selectedHari, setSelectedHari] = useState(1); // Default: Senin
    const [searchGuru, setSearchGuru] = useState('');

    // Panels
    const [isSlidePanelOpen, setIsSlidePanelOpen] = useState(false);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    // Drop modal: pick kelas + mapel
    const [dropModal, setDropModal] = useState<{ santriId: string; santriName: string } | null>(null);
    const [dropKelasId, setDropKelasId] = useState('');
    const [dropMapelName, setDropMapelName] = useState('');
    const [dropping, setDropping] = useState(false);

    // Mapel form
    const [newMapelName, setNewMapelName] = useState('');
    const [addingMapel, setAddingMapel] = useState(false);

    // ─── FETCHERS ───────────────────────────────────────────────────────────────

    useEffect(() => {
        api.get('/kelas').then(res => setKelasList(res.data.data || []));
        api.get('/khidmah/model').then(res => setKhidmahModels(res.data || [])).catch(() => {});
        fetchMasterMapel();
    }, []);

    useEffect(() => { fetchJadwalByHari(selectedHari); }, [selectedHari]);

    useEffect(() => {
        if (!selectedKhidmahModel) { setKhidmahSantriList([]); return; }
        setLoadingKhidmahSantri(true);
        api.get('/khidmah/data', { params: { modelKhidmahId: selectedKhidmahModel } })
            .then(res => setKhidmahSantriList(res.data || []))
            .catch(() => setKhidmahSantriList([]))
            .finally(() => setLoadingKhidmahSantri(false));
    }, [selectedKhidmahModel]);

    const fetchMasterMapel = () => {
        api.get('/jadwal/mata-pelajaran').then(res => setMasterMapels(res.data.data)).catch(console.error);
    };

    const fetchJadwalByHari = (hari: number) => {
        setLoadingJadwal(true);
        api.get(`/jadwal/hari/${hari}`)
            .then(res => setJadwalList(res.data.data || []))
            .catch(console.error)
            .finally(() => setLoadingJadwal(false));
    };

    // ─── HANDLERS ───────────────────────────────────────────────────────────────

    const handleCreateMapel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMapelName) return;
        setAddingMapel(true);
        try {
            await api.post('/jadwal/mata-pelajaran', { nama: newMapelName });
            setNewMapelName('');
            fetchMasterMapel();
        } catch (err: any) { alert(err.response?.data?.message || 'Gagal'); }
        finally { setAddingMapel(false); }
    };

    const handleDeleteJadwal = async (id: string) => {
        if (!window.confirm('Hapus jadwal ini?')) return;
        try {
            await api.delete(`/jadwal/${id}`);
            setJadwalList(prev => prev.filter(j => j.id !== id));
        } catch { alert('Gagal menghapus'); }
    };

    const handleDropSubmit = async () => {
        if (!dropModal || !dropKelasId || !dropMapelName) return;
        setDropping(true);
        try {
            // Step 1: Ensure guru-mapel exists
            const gmRes = await api.post('/jadwal/guru-mapel', { santriId: dropModal.santriId, mataPelajaran: dropMapelName });
            const userId = gmRes.data?.data?.userId;
            if (!userId) { alert('Gagal menentukan pengajar'); return; }

            // Step 2: Create jadwal
            await api.post('/jadwal', {
                kelasId: Number(dropKelasId),
                hari: selectedHari,
                mataPelajaran: dropMapelName,
                pengajarId: userId
            });

            setDropModal(null);
            setDropKelasId('');
            setDropMapelName('');
            fetchJadwalByHari(selectedHari);
        } catch (err: any) { alert(err.response?.data?.message || 'Gagal menyimpan'); }
        finally { setDropping(false); }
    };

    // ─── HELPERS ────────────────────────────────────────────────────────────────

    const getKelasLabel = (k: any) => {
        const j = k.tingkat?.jenjang?.nama || '';
        const t = k.tingkat?.nama || '';
        return `${j} ${t} ${k.nama}`.trim();
    };

    const filteredSantri = khidmahSantriList.filter(ks =>
        ks.santri.namaLengkap.toLowerCase().includes(searchGuru.toLowerCase()) ||
        ks.santri.nis.includes(searchGuru)
    );

    // ─── DND ────────────────────────────────────────────────────────────────────

    const onDragStart = (e: any) => setActiveDragId(e.active.id);

    const onDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        if (!canEdit) return;
        const { active, over } = event;
        if (!over || over.id !== 'jadwal-drop-zone') return;

        const santriId = active.id as string;
        const info = khidmahSantriList.find(ks => ks.santri.id === santriId);
        if (!info) return;

        if (masterMapels.length === 0) { alert('Buat mata pelajaran terlebih dahulu.'); return; }
        if (kelasList.length === 0) { alert('Belum ada data kelas.'); return; }

        setDropModal({ santriId, santriName: info.santri.namaLengkap });
        setDropKelasId(kelasList[0]?.id?.toString() || '');
        setDropMapelName(masterMapels[0]?.nama || '');
    };

    // ─── SUB-COMPONENTS ─────────────────────────────────────────────────────────

    const DraggableSantri = ({ ks }: { ks: KhidmahSantri }) => {
        const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: ks.santri.id, data: ks });
        return (
            <div ref={setNodeRef} {...listeners} {...attributes}
                className={`py-2.5 px-3 border-b border-slate-100 flex items-center gap-2 hover:bg-slate-50 cursor-grab active:cursor-grabbing transition ${isDragging ? 'opacity-30 bg-teal-50' : ''}`}>
                <GripVertical size={14} className="text-slate-300 shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-700 truncate">{ks.santri.namaLengkap}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{ks.santri.nis}</div>
                </div>
                {ks.keterangan && (
                    <div className="text-[10px] text-teal-600 font-medium shrink-0 bg-teal-50 px-1.5 py-0.5 rounded truncate max-w-[80px]" title={ks.keterangan}>
                        {ks.keterangan}
                    </div>
                )}
            </div>
        );
    };

    // Droppable wrapper for the whole table
    const DroppableZone = ({ children }: { children: React.ReactNode }) => {
        const { setNodeRef, isOver } = useDroppable({ id: 'jadwal-drop-zone' });
        return (
            <div ref={setNodeRef} className={`flex-1 overflow-auto transition ${isOver ? 'bg-teal-50/30 ring-2 ring-inset ring-teal-300 rounded-lg' : ''}`}>
                {children}
            </div>
        );
    };

    // ─── RENDER ─────────────────────────────────────────────────────────────────

    return (
        <div className="p-4 md:p-6 w-full max-w-[1600px] mx-auto h-[calc(100vh-64px)] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 shrink-0 gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <Calendar className="text-orange-500" size={24} /> Jadwal Pelajaran
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Pilih hari → seret pengajar ke tabel → pilih kelas &amp; mapel.</p>
                </div>
            </div>

            {/* Split Pane */}
            <div className="flex flex-1 overflow-hidden border border-slate-200 shadow-sm rounded-xl bg-white">
                <DndContext onDragEnd={onDragEnd} onDragStart={onDragStart}>

                    {/* ═══ LEFT PANEL ═══ */}
                    <div className="w-[260px] shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col hidden md:flex">
                        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-white shrink-0">
                            <span className="text-sm font-bold text-slate-700">Daftar Pengajar</span>
                            {canEdit && (
                                <button onClick={() => setIsSlidePanelOpen(true)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 transition" title="Kelola Mapel">
                                    <Settings size={16} />
                                </button>
                            )}
                        </div>

                        {/* Khidmah model picker */}
                        <div className="p-3 border-b border-slate-200 bg-white space-y-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-600 uppercase tracking-widest">
                                <ClipboardList size={12} /> Model Khidmah
                            </div>
                            <select value={selectedKhidmahModel} onChange={e => setSelectedKhidmahModel(e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:border-teal-400 outline-none transition">
                                <option value="">-- Pilih Model Khidmah --</option>
                                {khidmahModels.map(m => <option key={m.id} value={m.id}>{m.nama} ({m._count?.dataKhidmah ?? 0})</option>)}
                            </select>
                        </div>

                        {/* Search */}
                        {selectedKhidmahModel && khidmahSantriList.length > 0 && (
                            <div className="p-3 border-b border-slate-200 bg-white">
                                <div className="relative">
                                    <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                                    <input type="text" value={searchGuru} onChange={e => setSearchGuru(e.target.value)} placeholder="Cari nama/NIS..." className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-100 border-none rounded-md focus:bg-slate-200 focus:outline-none transition" />
                                </div>
                            </div>
                        )}

                        {/* Santri list */}
                        <div className="flex-1 overflow-y-auto bg-white">
                            {!selectedKhidmahModel ? (
                                <div className="text-center py-10 px-4">
                                    <ClipboardList size={24} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-xs text-slate-400">Pilih model khidmah untuk menampilkan daftar pengajar.</p>
                                </div>
                            ) : loadingKhidmahSantri ? (
                                <div className="py-10 flex justify-center"><Loader2 size={16} className="animate-spin text-slate-400" /></div>
                            ) : filteredSantri.length === 0 ? (
                                <div className="text-center py-10 text-xs text-slate-400 px-4">
                                    {searchGuru ? 'Tidak ditemukan.' : 'Belum ada santri di model ini.'}
                                </div>
                            ) : (
                                <>
                                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        {filteredSantri.length} pengajar · Seret ke tabel →
                                    </div>
                                    {filteredSantri.map(ks => <DraggableSantri key={ks.santri.id} ks={ks} />)}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ═══ RIGHT PANEL: Hari filter + Table ═══ */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white">
                        {/* Day filter bar */}
                        <div className="h-14 border-b border-slate-200 flex items-center px-4 bg-white shrink-0 gap-1 overflow-x-auto">
                            {HARI_LIST.map(h => (
                                <button key={h.id} onClick={() => setSelectedHari(h.id)}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${selectedHari === h.id
                                        ? 'bg-orange-500 text-white shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
                                    {h.name}
                                </button>
                            ))}
                            <div className="ml-auto md:hidden">
                                {canEdit && <button onClick={() => setIsSlidePanelOpen(true)} className="text-xs bg-slate-800 text-white px-2.5 py-1.5 rounded-md hover:bg-slate-700"><Settings size={12} className="inline mr-1" /> Mapel</button>}
                            </div>
                        </div>

                        {/* Table */}
                        <DroppableZone>
                            {loadingJadwal ? (
                                <div className="h-full flex items-center justify-center"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-100 text-slate-500 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                                        <tr>
                                            <th className="font-semibold text-[11px] py-3 px-4 border-r border-slate-200 uppercase tracking-widest leading-none">Pengajar / Pengampu</th>
                                            <th className="font-semibold text-[11px] py-3 px-4 border-r border-slate-200 uppercase tracking-widest leading-none">Mata Pelajaran</th>
                                            <th className="font-semibold text-[11px] py-3 px-4 border-r border-slate-200 uppercase tracking-widest leading-none">Kelas</th>
                                            {canEdit && <th className="font-semibold text-[11px] py-3 px-4 uppercase tracking-widest w-16 text-center leading-none">Aksi</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jadwalList.length === 0 ? (
                                            <tr>
                                                <td colSpan={canEdit ? 4 : 3} className="px-4 py-16 text-center">
                                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                                        <Calendar size={32} className="opacity-40" />
                                                        <p className="text-sm font-medium">Belum ada jadwal untuk hari {HARI_LIST.find(h => h.id === selectedHari)?.name}</p>
                                                        <p className="text-xs">Seret pengajar dari panel kiri ke area ini</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : jadwalList.map(j => (
                                            <tr key={j.id} className="border-b border-slate-100 hover:bg-slate-50 transition group">
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                                            <UserIcon size={13} className="text-teal-600" />
                                                        </div>
                                                        <span className="font-medium text-slate-800">{j.pengajar?.name || '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className="inline-flex py-1 px-2.5 bg-orange-100 text-orange-800 rounded-md font-semibold text-xs border border-orange-200">
                                                        {j.mataPelajaran}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className="text-slate-600 font-medium">
                                                        {j.kelas ? getKelasLabel(j.kelas) : '—'}
                                                    </span>
                                                </td>
                                                {canEdit && (
                                                    <td className="px-4 py-3 text-center">
                                                        <button onClick={() => handleDeleteJadwal(j.id)}
                                                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md transition opacity-0 group-hover:opacity-100">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </DroppableZone>

                        {/* Footer: count */}
                        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between">
                            <p className="text-xs text-slate-500">{jadwalList.length} entri jadwal · <strong>{HARI_LIST.find(h => h.id === selectedHari)?.name}</strong></p>
                        </div>
                    </div>

                    <DragOverlay dropAnimation={null}>
                        {activeDragId ? (() => {
                            const ac = khidmahSantriList.find(ks => ks.santri.id === activeDragId);
                            if (!ac) return null;
                            return (
                                <div className="bg-teal-700 text-white rounded-md p-2 shadow-xl opacity-90 scale-105 cursor-grabbing w-[220px] border border-teal-600 flex items-center gap-2">
                                    <GripVertical size={14} className="text-teal-300" />
                                    <div>
                                        <div className="font-semibold text-xs truncate max-w-[160px]">{ac.santri.namaLengkap}</div>
                                        <div className="text-[10px] text-teal-200 font-mono">{ac.santri.nis}</div>
                                    </div>
                                </div>
                            );
                        })() : null}
                    </DragOverlay>

                </DndContext>
            </div>

            {/* ═══ SLIDE PANEL: Master Mapel ═══ */}
            {isSlidePanelOpen && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] z-40" onClick={() => setIsSlidePanelOpen(false)} />}
            <div className={`fixed top-0 right-0 h-full w-full sm:w-[380px] bg-slate-50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col ${isSlidePanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <BookOpen size={18} className="text-orange-500" /> Kelola Mata Pelajaran
                    </h2>
                    <button onClick={() => setIsSlidePanelOpen(false)} className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100 transition"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div className="p-5 border-b border-slate-200 bg-white">
                        <h3 className="text-[13px] font-bold text-slate-800 mb-3 uppercase tracking-wider">Tambah Mata Pelajaran</h3>
                        <form onSubmit={handleCreateMapel} className="flex gap-2">
                            <input type="text" value={newMapelName} onChange={e => setNewMapelName(e.target.value)} placeholder="Nama mata pelajaran..." required
                                className="flex-1 bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:border-orange-500 outline-none transition" />
                            <button type="submit" disabled={addingMapel} className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-4 py-1.5 rounded-md transition text-sm">
                                {addingMapel ? <Loader2 size={14} className="animate-spin" /> : 'Buat'}
                            </button>
                        </form>
                    </div>
                    <div className="p-5">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Daftar Mapel ({masterMapels.length})</h3>
                        <div className="space-y-1.5">
                            {masterMapels.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-4 border border-dashed border-slate-200 rounded-lg">Belum ada mata pelajaran</p>
                            ) : masterMapels.map(m => (
                                <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg group hover:border-slate-300 transition">
                                    <span className="text-sm font-medium text-slate-700">{m.nama}</span>
                                    <button onClick={async () => {
                                        if (!window.confirm(`Hapus mapel "${m.nama}"?`)) return;
                                        try { await api.delete(`/jadwal/mata-pelajaran/${m.id}`); fetchMasterMapel(); } catch { alert('Gagal menghapus'); }
                                    }} className="w-6 h-6 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ DROP MODAL: Pilih Kelas + Mapel ═══ */}
            {dropModal && (
                <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDropModal(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-base text-slate-800">Tambah Jadwal</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                <strong>{dropModal.santriName}</strong> pada <strong>Hari {HARI_LIST.find(h => h.id === selectedHari)?.name}</strong>
                            </p>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kelas yang Diampu <span className="text-red-500">*</span></label>
                                <select value={dropKelasId} onChange={e => setDropKelasId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:border-teal-500 outline-none transition">
                                    {kelasList.map(k => <option key={k.id} value={k.id}>{getKelasLabel(k)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mata Pelajaran <span className="text-red-500">*</span></label>
                                <select value={dropMapelName} onChange={e => setDropMapelName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:border-teal-500 outline-none transition">
                                    {masterMapels.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setDropModal(null)} className="flex-1 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">Batal</button>
                            <button onClick={handleDropSubmit} disabled={dropping || !dropKelasId || !dropMapelName}
                                className="flex-1 py-2 rounded-lg bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700 transition disabled:opacity-50">
                                {dropping ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
