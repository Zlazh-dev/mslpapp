import React, { useEffect, useState } from 'react';
import { Calendar, User as UserIcon, Trash2, Loader2, Settings, X, GripVertical, Search, Filter, BookOpen, ClipboardList } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { DndContext, useDraggable, useDroppable, DragEndEvent, DragOverlay } from '@dnd-kit/core';

// ─── TYPES & CONSTANTS ──────────────────────────────────────────────────────────

const HARI_MAP = [
    { id: 1, name: 'Senin' },
    { id: 2, name: 'Selasa' },
    { id: 3, name: 'Rabu' },
    { id: 4, name: 'Kamis' },
    { id: 5, name: 'Jumat' },
    { id: 6, name: 'Sabtu' },
    { id: 7, name: 'Ahad' }
];

interface KhidmahModel {
    id: string;
    nama: string;
    _count?: { dataKhidmah: number };
}

interface KhidmahSantri {
    id: string;
    santri: { id: string; nis: string; namaLengkap: string };
    modelKhidmah: { id: string; nama: string };
    keterangan: string | null;
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────────

export default function JadwalManagementPage() {
    const { user } = useAuthStore();
    const canEdit = user?.roles?.some(r => r === 'ADMIN' || r === 'STAF_MADRASAH');

    // State ─ Core data
    const [masterMapels, setMasterMapels] = useState<any[]>([]);
    const [kelasList, setKelasList] = useState<any[]>([]);
    const [jadwalList, setJadwalList] = useState<any[]>([]);

    // State ─ Khidmah-powered left panel
    const [khidmahModels, setKhidmahModels] = useState<KhidmahModel[]>([]);
    const [selectedKhidmahModel, setSelectedKhidmahModel] = useState('');
    const [khidmahSantriList, setKhidmahSantriList] = useState<KhidmahSantri[]>([]);
    const [loadingKhidmahSantri, setLoadingKhidmahSantri] = useState(false);

    // State ─ Loading
    const [loadingJadwal, setLoadingJadwal] = useState(false);

    // State ─ Selections & Search
    const [selectedKelas, setSelectedKelas] = useState('');
    const [searchGuru, setSearchGuru] = useState('');

    // State ─ Panels & Modals
    const [isSlidePanelOpen, setIsSlidePanelOpen] = useState(false);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    // Modal: after drop, user picks mapel
    const [dropModal, setDropModal] = useState<{ santriId: string; santriName: string; hari: number } | null>(null);

    // Form: Create Master Mapel
    const [newMapelName, setNewMapelName] = useState('');
    const [addingMapel, setAddingMapel] = useState(false);

    // ─── FETCH INITIAL DATA ──────────────────────────────────────────────────────

    useEffect(() => {
        api.get('/kelas').then(res => {
            setKelasList(res.data.data || []);
            if (res.data.data.length > 0) setSelectedKelas(res.data.data[0].id.toString());
        });
        api.get('/khidmah/model').then(res => setKhidmahModels(res.data || [])).catch(() => {});
        fetchMasterMapel();
    }, []);

    useEffect(() => {
        if (!selectedKelas) return;
        fetchJadwal(selectedKelas);
    }, [selectedKelas]);

    // Fetch santri list when khidmah model is selected
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

    const fetchJadwal = (kelasId: string) => {
        setLoadingJadwal(true);
        api.get(`/jadwal?kelasId=${kelasId}`)
            .then(res => setJadwalList(res.data.data))
            .catch(console.error)
            .finally(() => setLoadingJadwal(false));
    };

    // ─── HANDLERS ───────────────────────────────────────────────────────────────

    const handleCreateMataPelajaran = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMapelName) return;
        setAddingMapel(true);
        try {
            await api.post('/jadwal/mata-pelajaran', { nama: newMapelName });
            setNewMapelName('');
            fetchMasterMapel();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Gagal menyimpan');
        } finally {
            setAddingMapel(false);
        }
    };

    const handleDeleteJadwal = async (id: string, mapel: string) => {
        if (!window.confirm(`Kosongkan jadwal mapel ${mapel} di hari ini?`)) return;
        try {
            await api.delete(`/jadwal/${id}`);
            setJadwalList(jadwalList.filter(j => j.id !== id));
        } catch (err) {
            alert('Gagal menghapus');
        }
    };

    // Combined: auto-create guru-mapel + jadwal in one flow
    const submitDropAssignment = async (santriId: string, hari: number, mataPelajaran: string) => {
        try {
            // Step 1: Ensure guru-mapel record exists (backend auto-creates user if needed, returns existing if duplicate)
            const gmRes = await api.post('/jadwal/guru-mapel', { santriId, mataPelajaran });
            const userId = gmRes.data?.data?.userId;

            if (!userId) {
                alert('Gagal menentukan pengajar. Coba lagi.');
                return;
            }

            // Step 2: Create jadwal entry
            await submitJadwalDirect(hari, mataPelajaran, userId);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Gagal menyimpan');
        }
    };

    const submitJadwalDirect = async (hari: number, mataPelajaran: string, pengajarId: string) => {
        // Clear existing jadwal for this day
        const existings = jadwalList.filter(j => j.hari === hari);
        for (const item of existings) {
            await api.delete(`/jadwal/${item.id}`);
        }

        const res = await api.post('/jadwal', {
            kelasId: Number(selectedKelas),
            hari,
            mataPelajaran,
            pengajarId
        });

        const newList = jadwalList.filter(j => j.hari !== hari);
        newList.push(res.data.data);
        setJadwalList(newList);
        setDropModal(null);
    };

    // ─── FORMATTERS ────────────────────────────────────────────────────────────

    const getKelasLabel = (k: any) => {
        const jenjang = k.tingkat?.jenjang?.nama || 'Unknown';
        const tNama = k.tingkat?.nama || '-';
        return `${jenjang} - KLS ${tNama} ${k.nama}`;
    };

    const filteredSantriList = khidmahSantriList.filter(ks =>
        ks.santri.namaLengkap.toLowerCase().includes(searchGuru.toLowerCase()) ||
        ks.santri.nis.includes(searchGuru)
    );

    // ─── DND EVENTS ─────────────────────────────────────────────────────────────

    const onDragStart = (e: any) => setActiveDragId(e.active.id);

    const onDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        if (!canEdit) return;

        const { active, over } = event;
        if (!over) return;
        
        const hari = Number(over.id);
        const santriId = active.id as string;
        const santriInfo = khidmahSantriList.find(ks => ks.santri.id === santriId);

        if (!santriInfo) return;

        if (masterMapels.length === 1) {
            // Only one mapel exists, auto-assign
            submitDropAssignment(santriId, hari, masterMapels[0].nama);
        } else if (masterMapels.length > 1) {
            // Show modal to pick mapel
            setDropModal({ santriId, santriName: santriInfo.santri.namaLengkap, hari });
        } else {
            alert('Buat mata pelajaran terlebih dahulu di panel pengaturan.');
        }
    };

    // ─── SUB COMPONENTS ─────────────────────────────────────────────────────────

    const DraggableSantriItem = ({ ks }: { ks: KhidmahSantri }) => {
        const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
            id: ks.santri.id,
            data: ks
        });

        return (
            <div 
                ref={setNodeRef} 
                {...listeners} 
                {...attributes}
                className={`py-2.5 px-3 border-b border-slate-100 flex items-center gap-2 hover:bg-slate-50 cursor-grab active:cursor-grabbing transition-colors ${isDragging ? 'opacity-30 bg-teal-50' : ''}`}
            >
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

    const DroppableTableRow = ({ hariObj }: { hariObj: typeof HARI_MAP[0] }) => {
        const { setNodeRef, isOver } = useDroppable({ id: hariObj.id });
        const assignedItem = jadwalList.find(j => j.hari === hariObj.id);

        return (
            <tr 
                ref={setNodeRef}
                className={`border-b border-slate-200 transition-colors ${isOver ? 'bg-teal-50 ring-1 ring-inset ring-teal-300' : 'hover:bg-slate-50/50 bg-white'}`}
            >
                <td className="px-4 py-3 align-middle text-sm text-slate-500 w-12 text-center border-r border-slate-200">{hariObj.id}</td>
                <td className="px-4 py-3 align-middle text-sm font-semibold text-slate-800 w-32 border-r border-slate-200">{hariObj.name}</td>
                <td className="px-4 py-3 align-middle text-sm border-r border-slate-200">
                    {assignedItem ? (
                        <span className="inline-flex py-1 px-2.5 bg-orange-100 text-orange-800 rounded-md font-semibold text-xs border border-orange-200">
                            {assignedItem.mataPelajaran}
                        </span>
                    ) : <span className="text-slate-400 text-xs italic">{isOver ? '↓ Lepas di sini' : 'Kosong...'}</span>}
                </td>
                <td className="px-4 py-3 align-middle text-sm border-r border-slate-200">
                    {assignedItem ? (
                        <div className="flex items-center gap-2">
                            <UserIcon size={14} className="text-slate-400" />
                            <span className="text-slate-700 font-medium">{assignedItem.pengajar?.name || 'Unknown'}</span>
                        </div>
                    ) : <span className="text-slate-400 text-xs italic">{isOver ? 'Pilih mapel setelah drop' : 'Seret pengajar ke baris ini'}</span>}
                </td>
                <td className="px-4 py-3 align-middle w-24 text-center">
                    {assignedItem && canEdit && (
                        <button 
                            onClick={() => handleDeleteJadwal(assignedItem.id, assignedItem.mataPelajaran)}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md transition" title="Hapus Jadwal"
                        ><Trash2 size={14} /></button>
                    )}
                </td>
            </tr>
        );
    };

    // ─── RENDER ─────────────────────────────────────────────────────────────────

    return (
        <div className="p-4 md:p-6 w-full max-w-[1600px] mx-auto h-[calc(100vh-64px)] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 shrink-0 gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <Calendar className="text-orange-500" size={24} />
                        Jadwal Pelajaran
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Pilih model khidmah → seret pengajar ke jadwal → pilih mapel. Satu langkah.</p>
                </div>
            </div>

            {/* Split Pane */}
            <div className="flex flex-1 overflow-hidden border border-slate-200 shadow-sm rounded-xl bg-white">
                
                <DndContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
                    
                    {/* ═══ LEFT PANEL: Khidmah-powered Pengajar List ═══ */}
                    <div className="w-[280px] shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col hidden md:flex">
                        {/* Header + Settings */}
                        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-white shrink-0">
                            <span className="text-sm font-bold text-slate-700">Daftar Pengajar</span>
                            {canEdit && (
                                <button onClick={() => setIsSlidePanelOpen(true)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 transition" title="Kelola Master Mapel">
                                    <Settings size={16} />
                                </button>
                            )}
                        </div>

                        {/* Khidmah Model Picker */}
                        <div className="p-3 border-b border-slate-200 bg-white space-y-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-600 uppercase tracking-widest">
                                <ClipboardList size={12} /> Model Khidmah
                            </div>
                            <select 
                                value={selectedKhidmahModel} 
                                onChange={e => setSelectedKhidmahModel(e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:border-teal-400 outline-none transition"
                            >
                                <option value="">-- Pilih Model Khidmah --</option>
                                {khidmahModels.map(m => (
                                    <option key={m.id} value={m.id}>{m.nama} ({m._count?.dataKhidmah ?? 0})</option>
                                ))}
                            </select>
                        </div>

                        {/* Search (when model selected) */}
                        {selectedKhidmahModel && khidmahSantriList.length > 0 && (
                            <div className="p-3 border-b border-slate-200 bg-white">
                                <div className="relative">
                                    <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                                    <input type="text" value={searchGuru} onChange={e => setSearchGuru(e.target.value)} placeholder="Cari nama/NIS..." className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-100 border-none rounded-md focus:bg-slate-200 focus:outline-none transition" />
                                </div>
                            </div>
                        )}

                        {/* Santri List */}
                        <div className="flex-1 overflow-y-auto bg-white">
                            {!selectedKhidmahModel ? (
                                <div className="text-center py-10 px-4">
                                    <ClipboardList size={24} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-xs text-slate-400">Pilih model khidmah di atas untuk menampilkan daftar pengajar.</p>
                                </div>
                            ) : loadingKhidmahSantri ? (
                                <div className="py-10 flex justify-center"><Loader2 size={16} className="animate-spin text-slate-400" /></div>
                            ) : filteredSantriList.length === 0 ? (
                                <div className="text-center py-10 text-xs text-slate-400 px-4">
                                    {searchGuru ? 'Tidak ditemukan.' : 'Belum ada santri ter-assign ke model ini.'}
                                </div>
                            ) : (
                                <>
                                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        {filteredSantriList.length} pengajar · Seret ke jadwal →
                                    </div>
                                    {filteredSantriList.map(ks => <DraggableSantriItem key={ks.santri.id} ks={ks} />)}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ═══ RIGHT PANEL: Jadwal Table ═══ */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white">
                        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-white shrink-0 gap-3">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Filter size={14} className="text-slate-400" />
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kelas</span>
                                </div>
                                <select value={selectedKelas} onChange={e => setSelectedKelas(e.target.value)} className="text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 transition rounded-md px-3 py-1.5 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none w-[200px] shadow-sm">
                                    {kelasList.map(k => <option key={k.id} value={k.id}>{getKelasLabel(k)}</option>)}
                                </select>
                            </div>
                            <div className="md:hidden">
                                {canEdit && <button onClick={() => setIsSlidePanelOpen(true)} className="text-sm bg-slate-800 text-white px-3 py-1.5 rounded-md hover:bg-slate-700"><Settings size={14} className="inline mr-1"/> Pengaturan</button>}
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto bg-slate-50/30">
                            {loadingJadwal ? <div className="h-full flex items-center justify-center"><Loader2 size={24} className="animate-spin text-slate-400" /></div> : (
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead className="bg-slate-100 text-slate-500 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                                        <tr>
                                            <th className="font-semibold text-[11px] py-3 px-4 border-r border-slate-200 w-12 text-center text-slate-400 leading-none">#</th>
                                            <th className="font-semibold text-[11px] py-3 px-4 border-r border-slate-200 uppercase tracking-widest w-32 leading-none">Hari</th>
                                            <th className="font-semibold text-[11px] py-3 px-4 border-r border-slate-200 uppercase tracking-widest leading-none">Mata Pelajaran</th>
                                            <th className="font-semibold text-[11px] py-3 px-4 border-r border-slate-200 uppercase tracking-widest leading-none">Pengajar</th>
                                            <th className="font-semibold text-[11px] py-3 px-4 uppercase tracking-widest w-24 text-center leading-none">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {HARI_MAP.map(hariObj => <DroppableTableRow key={hariObj.id} hariObj={hariObj} />)}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    <DragOverlay dropAnimation={null}>
                        {activeDragId ? (() => {
                            const ac = khidmahSantriList.find(ks => ks.santri.id === activeDragId);
                            if(!ac) return null;
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

            {/* ═══ SLIDE PANEL: Kelola Master Mapel (hanya ini) ═══ */}
            {isSlidePanelOpen && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] z-40 transition-opacity" onClick={() => setIsSlidePanelOpen(false)} />
            )}
            
            <div className={`fixed top-0 right-0 h-full w-full sm:w-[380px] bg-slate-50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col ${isSlidePanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <BookOpen size={18} className="text-orange-500" /> Kelola Mata Pelajaran
                    </h2>
                    <button onClick={() => setIsSlidePanelOpen(false)} className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100 transition"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Create Mapel */}
                    <div className="p-5 border-b border-slate-200 bg-white">
                        <h3 className="text-[13px] font-bold text-slate-800 mb-3 uppercase tracking-wider">
                            Tambah Mata Pelajaran
                        </h3>
                        <form onSubmit={handleCreateMataPelajaran} className="flex gap-2">
                            <input 
                                type="text" 
                                value={newMapelName} 
                                onChange={e => setNewMapelName(e.target.value)}
                                placeholder="Nama mata pelajaran..." 
                                required
                                className="flex-1 bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:border-orange-500 outline-none transition"
                            />
                            <button type="submit" disabled={addingMapel} className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-4 py-1.5 rounded-md transition text-sm flex items-center gap-2">
                                {addingMapel ? <Loader2 size={14} className="animate-spin" /> : 'Buat'}
                            </button>
                        </form>
                    </div>

                    {/* Mapel List */}
                    <div className="p-5">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                            Daftar Mapel ({masterMapels.length})
                        </h3>
                        <div className="space-y-1.5">
                            {masterMapels.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-4 border border-dashed border-slate-200 rounded-lg">Belum ada mata pelajaran</p>
                            ) : masterMapels.map(m => (
                                <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg group hover:border-slate-300 transition">
                                    <span className="text-sm font-medium text-slate-700">{m.nama}</span>
                                    <button 
                                        onClick={async () => {
                                            if (!window.confirm(`Hapus mapel "${m.nama}"?`)) return;
                                            try {
                                                await api.delete(`/jadwal/mata-pelajaran/${m.id}`);
                                                fetchMasterMapel();
                                            } catch { alert('Gagal menghapus'); }
                                        }}
                                        className="w-6 h-6 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ MODAL: Pilih Mapel setelah Drop ═══ */}
            {dropModal && (
                <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-base text-slate-800 tracking-tight">Pilih Mata Pelajaran</h3>
                            <p className="text-[13px] text-slate-500 mt-1">
                                <strong>{dropModal.santriName}</strong> mengajar pada <strong>Hari {HARI_MAP.find(h => h.id === dropModal.hari)?.name}</strong>
                            </p>
                        </div>
                        <div className="p-1 space-y-0.5 bg-slate-50 max-h-[50vh] overflow-y-auto">
                            {masterMapels.map((mapel, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => submitDropAssignment(dropModal.santriId, dropModal.hari, mapel.nama)} 
                                    className="w-full text-left px-4 py-3 rounded-md hover:bg-white hover:shadow-sm font-semibold text-slate-700 text-sm transition-all border border-transparent hover:border-slate-200 hover:text-teal-600"
                                >
                                    {mapel.nama}
                                </button>
                            ))}
                        </div>
                        <div className="p-2 bg-slate-100 flex justify-end">
                            <button onClick={() => setDropModal(null)} className="px-4 py-1.5 text-[13px] font-bold text-slate-500 hover:text-slate-800 transition">Batal</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
