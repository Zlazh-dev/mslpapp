import React, { useEffect, useState } from 'react';
import { Calendar, User as UserIcon, Plus, Trash2, Loader2, Settings, X, GripVertical, Search, Filter, BookOpen, Users, ClipboardList } from 'lucide-react';
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

interface GuruData {
    userId: string;
    name: string;
    mapels: string[];
}

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

    // State ─ Data
    const [guruMapel, setGuruMapel] = useState<any[]>([]);
    const [masterMapels, setMasterMapels] = useState<any[]>([]);
    const [kelasList, setKelasList] = useState<any[]>([]);
    const [jadwalList, setJadwalList] = useState<any[]>([]);

    // State ─ Khidmah integration
    const [khidmahModels, setKhidmahModels] = useState<KhidmahModel[]>([]);
    const [selectedKhidmahModel, setSelectedKhidmahModel] = useState('');
    const [khidmahSantriList, setKhidmahSantriList] = useState<KhidmahSantri[]>([]);
    const [loadingKhidmahSantri, setLoadingKhidmahSantri] = useState(false);

    // State ─ Loading
    const [loadingMaster, setLoadingMaster] = useState(false);
    const [loadingJadwal, setLoadingJadwal] = useState(false);

    // State ─ Selections & Search
    const [selectedKelas, setSelectedKelas] = useState('');
    const [searchGuru, setSearchGuru] = useState('');

    // State ─ Panels & Modals
    const [isSlidePanelOpen, setIsSlidePanelOpen] = useState(false);
    const [modalData, setModalData] = useState<{ guruStr: string, hari: number, mapelOptions: string[] } | null>(null);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    // Form: Create Master Mapel
    const [newMapelName, setNewMapelName] = useState('');
    const [addingMapel, setAddingMapel] = useState(false);

    // Form: Assign Pengajar (Khidmah-based)
    const [mmSantriUserId, setMmSantriUserId] = useState('');
    const [mmMapelId, setMmMapelId] = useState('');
    const [mmAdding, setMmAdding] = useState(false);

    // ─── FETCH INITIAL DATA ──────────────────────────────────────────────────────

    useEffect(() => {
        // Kelas (with Jenjang and Tingkat)
        api.get('/kelas').then(res => {
            setKelasList(res.data.data || []);
            if (res.data.data.length > 0) setSelectedKelas(res.data.data[0].id.toString());
        });

        // Khidmah Models
        api.get('/khidmah/model').then(res => setKhidmahModels(res.data || [])).catch(() => {});

        fetchMasterMapel();
        fetchGuruMapel();
    }, []);

    useEffect(() => {
        if (!selectedKelas) return;
        fetchJadwal(selectedKelas);
    }, [selectedKelas]);

    // When khidmah model is selected, fetch santri assigned to it
    useEffect(() => {
        if (!selectedKhidmahModel) {
            setKhidmahSantriList([]);
            return;
        }
        setLoadingKhidmahSantri(true);
        api.get('/khidmah/data', { params: { modelKhidmahId: selectedKhidmahModel } })
            .then(res => setKhidmahSantriList(res.data || []))
            .catch(() => setKhidmahSantriList([]))
            .finally(() => setLoadingKhidmahSantri(false));
    }, [selectedKhidmahModel]);

    const fetchMasterMapel = () => {
        api.get('/jadwal/mata-pelajaran')
            .then(res => setMasterMapels(res.data.data))
            .catch(console.error);
    };

    const fetchGuruMapel = () => {
        setLoadingMaster(true);
        api.get('/jadwal/guru-mapel')
            .then(res => setGuruMapel(res.data.data))
            .catch(console.error)
            .finally(() => setLoadingMaster(false));
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

    const handleAddGuruMapel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mmSantriUserId || !mmMapelId) return;
        setMmAdding(true);
        try {
            await api.post('/jadwal/guru-mapel', { santriId: mmSantriUserId, mataPelajaran: mmMapelId });
            setMmMapelId('');
            fetchGuruMapel();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Gagal menyambungkan');
        } finally {
            setMmAdding(false);
        }
    };

    const handleDeleteGuruMapel = async (id: string) => {
        if (!window.confirm('Hapus relasi mapel ini?')) return;
        try {
            await api.delete(`/jadwal/guru-mapel/${id}`);
            setGuruMapel(guruMapel.filter(g => g.id !== id));
        } catch (err) {
            alert('Gagal menghapus');
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

    const submitJadwal = async (hari: number, mataPelajaran: string, pengajarId: string) => {
        try {
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
            setModalData(null);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Gagal menyimpan jadwal');
        }
    };

    // ─── FORMATTERS & DATA PROCESSING ──────────────────────────────────────────

    const groupedGuruMapel = guruMapel.reduce((acc, curr) => {
        if (!acc[curr.userId]) acc[curr.userId] = { userId: curr.userId, name: curr.user?.name || 'Unknown', mapels: [] };
        acc[curr.userId].mapels.push(curr.mataPelajaran);
        return acc;
    }, {} as Record<string, GuruData>);

    const draggables: GuruData[] = Object.values(groupedGuruMapel);
    const filteredDraggables = draggables.filter(g => g.name.toLowerCase().includes(searchGuru.toLowerCase()));

    const getKelasLabel = (k: any) => {
        const jenjang = k.tingkat?.jenjang?.nama || 'Unknown';
        const tNama = k.tingkat?.nama || '-';
        return `${jenjang} - KLS ${tNama} ${k.nama}`;
    };

    // ─── DND EVENTS ─────────────────────────────────────────────────────────────

    const onDragStart = (e: any) => setActiveDragId(e.active.id);

    const onDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        if (!canEdit) return;

        const { active, over } = event;
        if (!over) return;
        
        const hari = Number(over.id);
        const userId = active.id as string;
        const guruInfo = draggables.find(d => d.userId === userId);

        if (!guruInfo || guruInfo.mapels.length === 0) return;
        
        if (guruInfo.mapels.length === 1) {
            submitJadwal(hari, guruInfo.mapels[0], userId);
        } else {
            setModalData({ guruStr: userId, hari, mapelOptions: guruInfo.mapels });
        }
    };

    // ─── SUB COMPONENTS ─────────────────────────────────────────────────────────

    const DraggableGuruItem = ({ guru }: { guru: GuruData }) => {
        const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
            id: guru.userId,
            data: guru
        });

        return (
            <div 
                ref={setNodeRef} 
                {...listeners} 
                {...attributes}
                className={`py-2 px-3 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 cursor-grab active:cursor-grabbing transition-colors ${isDragging ? 'opacity-30 bg-orange-50' : ''}`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <GripVertical size={14} className="text-slate-300 shrink-0" />
                    <div className="text-xs font-medium text-slate-700 truncate">{guru.name}</div>
                </div>
                <div className="text-[10px] text-slate-500 font-semibold shrink-0 ml-2 bg-slate-100 px-1.5 py-0.5 rounded">
                    {guru.mapels.length} Mapel
                </div>
            </div>
        );
    };

    const DroppableTableRow = ({ hariObj }: { hariObj: typeof HARI_MAP[0] }) => {
        const { setNodeRef, isOver } = useDroppable({ id: hariObj.id });
        const assignedItem = jadwalList.find(j => j.hari === hariObj.id);

        return (
            <tr 
                ref={setNodeRef}
                className={`border-b border-slate-200 transition-colors ${isOver ? 'bg-orange-50' : 'hover:bg-slate-50/50 bg-white'}`}
            >
                <td className="px-4 py-3 align-middle text-sm text-slate-500 w-12 text-center border-r border-slate-200">{hariObj.id}</td>
                <td className="px-4 py-3 align-middle text-sm font-semibold text-slate-800 w-32 border-r border-slate-200">{hariObj.name}</td>
                <td className="px-4 py-3 align-middle text-sm border-r border-slate-200">
                    {assignedItem ? (
                        <span className="inline-flex py-1 px-2.5 bg-orange-100 text-orange-800 rounded-md font-semibold text-xs border border-orange-200">
                            {assignedItem.mataPelajaran}
                        </span>
                    ) : <span className="text-slate-400 text-xs italic">Kosong...</span>}
                </td>
                <td className="px-4 py-3 align-middle text-sm border-r border-slate-200">
                    {assignedItem ? (
                        <div className="flex items-center gap-2">
                            <UserIcon size={14} className="text-slate-400" />
                            <span className="text-slate-700 font-medium">{assignedItem.pengajar?.name || 'Unknown'}</span>
                        </div>
                    ) : <span className="text-slate-400 text-xs italic">Seret pengampu ke baris ini</span>}
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
            {/* Header Title Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 shrink-0 gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <Calendar className="text-orange-500" size={24} />
                        Jadwal Pelajaran
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Kelola jadwal dengan drag-and-drop antar baris kelas.</p>
                </div>
            </div>

            {/* Split Pane Main Layout */}
            <div className="flex flex-1 overflow-hidden border border-slate-200 shadow-sm rounded-xl bg-white">
                
                <DndContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
                    
                    {/* LEFT PANE (Sidebar Supabase Style) */}
                    <div className="w-[280px] shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col hidden md:flex">
                        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-white shrink-0">
                            <span className="text-sm font-bold text-slate-700">Daftar Pengampu</span>
                            {canEdit && (
                                <button onClick={() => setIsSlidePanelOpen(true)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 transition" title="Kelola Master Mapel">
                                    <Settings size={16} />
                                </button>
                            )}
                        </div>
                        <div className="p-3 border-b border-slate-200 bg-white">
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                                <input type="text" value={searchGuru} onChange={e => setSearchGuru(e.target.value)} placeholder="Cari pengampu..." className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-100 border-none rounded-md focus:bg-slate-200 focus:outline-none transition" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-white">
                            {loadingMaster ? <div className="py-10 flex justify-center"><Loader2 size={16} className="animate-spin text-slate-400" /></div> : filteredDraggables.length === 0 ? <div className="text-center py-10 text-xs text-slate-400">Tidak ada pengampu terdaftar.</div> : filteredDraggables.map(guru => <DraggableGuruItem key={guru.userId} guru={guru} />)}
                        </div>
                    </div>

                    {/* RIGHT PANE (Main Datagrid) */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white">
                        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-white shrink-0 gap-3">
                            <div className="flex items-center gap-4 cursor-pointer">
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
                                            <th className="font-semibold text-[11px] py-3 px-4 border-r border-slate-200 uppercase tracking-widest leading-none">Pengajar / Wali Kelas</th>
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
                            const ac = draggables.find(d => d.userId === activeDragId);
                            if(!ac) return null;
                            return (
                                <div className="bg-slate-800 text-white rounded-md p-2 shadow-xl opacity-90 scale-105 cursor-grabbing w-[200px] border border-slate-700 flex items-center gap-2">
                                    <GripVertical size={14} className="text-slate-400" />
                                    <div className="font-semibold text-xs truncate max-w-[150px]">{ac.name}</div>
                                </div>
                            );
                        })() : null}
                    </DragOverlay>

                </DndContext>
            </div>

            {/* ─── SLIDE-OVER SIDE PANEL (KELOLA MAPEL & PENGAJAR) ─── */}
            {isSlidePanelOpen && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] z-40 transition-opacity" onClick={() => setIsSlidePanelOpen(false)} />
            )}
            
            <div className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-slate-50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col ${isSlidePanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Settings size={18} className="text-slate-500" /> Tambah Data Mapel & Pengajar
                    </h2>
                    <button onClick={() => setIsSlidePanelOpen(false)} className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100 transition"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* SECTION 1: MASTER DATA MAPEL (tetap sama) */}
                    <div className="p-5 border-b border-slate-200 bg-white">
                        <h3 className="text-[13px] font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                            <BookOpen size={14} className="text-orange-500"/> 1. Buat Mata Pelajaran Utama
                        </h3>
                        <form onSubmit={handleCreateMataPelajaran} className="space-y-3">
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={newMapelName} 
                                    onChange={e => setNewMapelName(e.target.value)}
                                    placeholder="Ketikan Mata Pelajaran..." 
                                    required
                                    className="flex-1 bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:border-orange-500 outline-none transition"
                                />
                                <button type="submit" disabled={addingMapel} className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-4 py-1.5 rounded-md transition text-sm flex items-center gap-2">
                                    {addingMapel ? <Loader2 size={14} className="animate-spin" /> : 'Buat Baru'}
                                </button>
                            </div>
                        </form>
                        
                        <div className="flex flex-wrap gap-1.5 mt-4">
                            {masterMapels.map(m => (
                                <span key={m.id} className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                    {m.nama}
                                </span>
                            ))}
                            {masterMapels.length === 0 && <span className="text-xs text-slate-400 italic">Belum ada Kategori Mapel</span>}
                        </div>
                    </div>

                    {/* SECTION 2: ASSIGN PENGAJAR KE MAPEL (Khidmah-based) */}
                    <div className="p-5">
                       <h3 className="text-[13px] font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                            <ClipboardList size={14} className="text-teal-500"/> 2. Assign Pengajar ke Mapel
                        </h3>
                        <form onSubmit={handleAddGuruMapel} className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1 mb-8">
                            {/* Step A: Pilih Model Khidmah */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pilih Variabel Khidmah <span className="text-red-500">*</span></label>
                                <select 
                                    value={selectedKhidmahModel} 
                                    onChange={e => { setSelectedKhidmahModel(e.target.value); setMmSantriUserId(''); }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:border-teal-500 outline-none transition"
                                >
                                    <option value="">-- Pilih Model Khidmah --</option>
                                    {khidmahModels.map(m => (
                                        <option key={m.id} value={m.id}>{m.nama} ({m._count?.dataKhidmah ?? 0} santri)</option>
                                    ))}
                                </select>
                                {khidmahModels.length === 0 && (
                                    <p className="text-[11px] text-amber-600 mt-1.5">⚠ Belum ada model khidmah. Buat dulu di halaman <strong>Data Khidmah</strong>.</p>
                                )}
                            </div>

                            {/* Step B: Pilih Santri dari daftar khidmah */}
                            {selectedKhidmahModel && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pilih Pengajar (Santri Khidmah) <span className="text-red-500">*</span></label>
                                    {loadingKhidmahSantri ? (
                                        <div className="flex items-center gap-2 py-2 text-xs text-slate-400"><Loader2 size={12} className="animate-spin" /> Memuat data...</div>
                                    ) : khidmahSantriList.length === 0 ? (
                                        <div className="py-3 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-lg">
                                            Tidak ada santri yang ter-assign ke model ini
                                        </div>
                                    ) : (
                                        <>
                                            <select 
                                                required 
                                                value={mmSantriUserId} 
                                                onChange={e => setMmSantriUserId(e.target.value)} 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:border-teal-500 outline-none transition"
                                            >
                                                <option value="">-- Pilih Santri --</option>
                                                {khidmahSantriList.map(ks => (
                                                    <option key={ks.id} value={ks.santri.id}>
                                                        {ks.santri.namaLengkap} ({ks.santri.nis}){ks.keterangan ? ` — ${ks.keterangan}` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-[10px] text-slate-400 mt-1">{khidmahSantriList.length} santri tersedia dari khidmah ini</p>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Step C: Pilih Mapel */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pilih Mata Pelajaran <span className="text-red-500">*</span></label>
                                <select required value={mmMapelId} onChange={e => setMmMapelId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:border-teal-500 outline-none transition disabled:opacity-50" disabled={masterMapels.length === 0}>
                                    <option value="">-- Pilih Mapel dari Induk --</option>
                                    {masterMapels.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
                                </select>
                            </div>
                            <button type="submit" disabled={mmAdding || !mmSantriUserId || !mmMapelId} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 rounded-md transition text-sm mt-2 flex justify-center items-center gap-2 disabled:bg-slate-300">
                                {mmAdding ? <Loader2 size={14} className="animate-spin" /> : 'Assign Relasi'}
                            </button>
                        </form>

                        {/* LIST RELATION */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                                Rekap Relasi Aktif
                                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded shadow-sm">{guruMapel.length} records</span>
                            </h3>
                            {loadingMaster ? <div className="flex justify-center"><Loader2 size={16} className="animate-spin text-slate-400" /></div> : (
                                <ul className="space-y-2">
                                    {draggables.length === 0 && <li className="text-center text-xs text-slate-400 py-4 italic border border-dashed border-slate-200 rounded-lg">Belum ada pengajar ter-assign.</li>}
                                    {draggables.map(g => (
                                        <li key={g.userId} className="border border-slate-200 shadow-sm rounded-lg p-3 bg-white">
                                            <div className="font-bold text-slate-800 text-[13px] mb-2">{g.name}</div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {guruMapel.filter(gm => gm.userId === g.userId).map(gm => (
                                                    <div key={gm.id} className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-medium pl-2 pr-1 py-0.5 rounded-sm shadow-sm transition hover:bg-slate-100">
                                                        {gm.mataPelajaran}
                                                        <button onClick={() => handleDeleteGuruMapel(gm.id)} className="text-slate-300 hover:text-red-500 transition cursor-pointer p-[1px]">
                                                            <X size={10} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal for Selecting Multiple Mapels smoothly */}
            {modalData && (
                <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-base text-slate-800 tracking-tight">Opsi Mata Pelajaran</h3>
                            <p className="text-[13px] text-slate-500 mt-1">
                                Pilih mata pelajaran yang akan diajarkan pada <b>Hari {HARI_MAP.find(h => h.id === modalData.hari)?.name}</b>.
                            </p>
                        </div>
                        <div className="p-1 space-y-0.5 bg-slate-50">
                            {modalData.mapelOptions?.map((mapel: string, i: number) => (
                                <button key={i} onClick={() => submitJadwal(modalData.hari, mapel, modalData.guruStr)} className="w-full text-left px-4 py-3 rounded-md hover:bg-white hover:shadow-sm font-semibold text-slate-700 text-sm transition-all border border-transparent hover:border-slate-200 hover:text-orange-600">
                                    {mapel}
                                </button>
                            ))}
                        </div>
                        <div className="p-2 bg-slate-100 flex justify-end">
                            <button onClick={() => setModalData(null)} className="px-4 py-1.5 text-[13px] font-bold text-slate-500 hover:text-slate-800 transition">Batal</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
