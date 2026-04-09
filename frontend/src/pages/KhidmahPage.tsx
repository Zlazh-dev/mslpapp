import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Trash2, Search, X, ClipboardList, Tags, AlertCircle, Edit2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModelKhidmah {
    id: string;
    nama: string;
    deskripsi: string | null;
    _count?: { dataKhidmah: number };
}

interface DataKhidmah {
    id: string;
    santri: { id: string; nis: string; namaLengkap: string; foto: string | null; status: string };
    modelKhidmah: { id: string; nama: string };
    keterangan: string | null;
    createdAt: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KhidmahPage() {
    const [activeTab, setActiveTab] = useState<'data' | 'model'>('data');

    // ── Model Khidmah state ──
    const [models, setModels] = useState<ModelKhidmah[]>([]);
    const [newModelNama, setNewModelNama] = useState('');
    const [newModelDesc, setNewModelDesc] = useState('');
    const [editingModel, setEditingModel] = useState<ModelKhidmah | null>(null);
    const [editNama, setEditNama] = useState('');
    const [editDesc, setEditDesc] = useState('');

    // ── Data Khidmah state ──
    const [dataList, setDataList] = useState<DataKhidmah[]>([]);
    const [filterModel, setFilterModel] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAssignPanel, setShowAssignPanel] = useState(false);
    const [editingData, setEditingData] = useState<DataKhidmah | null>(null);
    const [assignNis, setAssignNis] = useState('');
    const [assignModelId, setAssignModelId] = useState('');
    const [assignKeterangan, setAssignKeterangan] = useState('');

    // ── UI state ──
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'model' | 'data'; id: string; label: string } | null>(null);

    const showMsg = (msg: string) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000); };
    const showErr = (msg: string) => { setError(msg); setTimeout(() => setError(''), 4000); };

    // ─── Fetchers ─────────────────────────────────────────────────────────────

    const fetchModels = async () => {
        try { const r = await api.get('/khidmah/model'); setModels(r.data); }
        catch { showErr('Gagal memuat model khidmah'); }
    };

    const fetchData = async (modelId?: string) => {
        try {
            const params: any = {};
            if (modelId) params.modelKhidmahId = modelId;
            const r = await api.get('/khidmah/data', { params });
            setDataList(r.data);
        } catch { showErr('Gagal memuat data khidmah'); }
    };

    useEffect(() => { fetchModels(); fetchData(); }, []);
    useEffect(() => { fetchData(filterModel || undefined); }, [filterModel]);

    // ─── Model CRUD ───────────────────────────────────────────────────────────

    const createModel = async () => {
        if (!newModelNama.trim()) return;
        setLoading(true);
        try {
            await api.post('/khidmah/model', { nama: newModelNama.trim(), deskripsi: newModelDesc.trim() || undefined });
            showMsg(`Model "${newModelNama}" berhasil ditambahkan`);
            setNewModelNama(''); setNewModelDesc('');
            await fetchModels();
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal menambahkan'); }
        finally { setLoading(false); }
    };

    const updateModel = async () => {
        if (!editingModel || !editNama.trim()) return;
        setLoading(true);
        try {
            await api.patch(`/khidmah/model/${editingModel.id}`, { nama: editNama.trim(), deskripsi: editDesc.trim() || null });
            showMsg(`Model berhasil diperbarui`);
            setEditingModel(null);
            await fetchModels(); await fetchData(filterModel || undefined);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal memperbarui'); }
        finally { setLoading(false); }
    };

    // ─── Data Khidmah CRUD ────────────────────────────────────────────────────

    const assignKhidmah = async () => {
        if (!assignNis.trim() || !assignModelId) return;
        setLoading(true);
        try {
            await api.post('/khidmah/data', {
                nis: assignNis.trim(),
                modelKhidmahId: assignModelId,
                keterangan: assignKeterangan.trim() || undefined,
            });
            showMsg('Khidmah berhasil ditambahkan');
            closePanel();
            await fetchData(filterModel || undefined);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal menambahkan'); }
        finally { setLoading(false); }
    };

    const updateKhidmah = async () => {
        if (!editingData) return;
        setLoading(true);
        try {
            await api.patch(`/khidmah/data/${editingData.id}`, {
                modelKhidmahId: assignModelId || undefined,
                keterangan: assignKeterangan.trim() || null,
            });
            showMsg('Khidmah berhasil diperbarui');
            closePanel();
            await fetchData(filterModel || undefined);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal memperbarui'); }
        finally { setLoading(false); }
    };

    const openAddPanel = () => {
        setEditingData(null);
        setAssignNis('');
        setAssignModelId(models[0]?.id || '');
        setAssignKeterangan('');
        setShowAssignPanel(true);
    };

    const openEditPanel = (d: DataKhidmah) => {
        setEditingData(d);
        setAssignNis(d.santri.nis);
        setAssignModelId(d.modelKhidmah.id);
        setAssignKeterangan(d.keterangan || '');
        setShowAssignPanel(true);
    };

    const closePanel = () => {
        setShowAssignPanel(false);
        setEditingData(null);
        setAssignNis(''); setAssignModelId(''); setAssignKeterangan('');
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            if (deleteTarget.type === 'model') {
                await api.delete(`/khidmah/model/${deleteTarget.id}`);
                await fetchModels();
            } else {
                await api.delete(`/khidmah/data/${deleteTarget.id}`);
            }
            showMsg(`"${deleteTarget.label}" berhasil dihapus`);
            setDeleteTarget(null);
            await fetchData(filterModel || undefined);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal menghapus'); setDeleteTarget(null); }
    };

    // ─── Filtered data ────────────────────────────────────────────────────────

    const filteredData = dataList.filter(d => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return d.santri.namaLengkap.toLowerCase().includes(q) ||
            d.santri.nis.toLowerCase().includes(q) ||
            d.modelKhidmah.nama.toLowerCase().includes(q);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════

    return (
        <div className="flex flex-col h-[calc(100dvh-64px)] bg-white text-slate-700 overflow-hidden">
            {/* ── Toolbar ─────────────────────────────────────────── */}
            <div className="h-10 border-b border-slate-200 flex items-center px-3 gap-2 shrink-0 bg-white overflow-x-auto">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest shrink-0">Data Khidmah</span>
                <div className="w-px h-5 bg-slate-200 mx-0.5" />

                {/* Tabs */}
                <button onClick={() => setActiveTab('data')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition ${activeTab === 'data' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                    <ClipboardList size={12} /> Daftar
                </button>
                <button onClick={() => setActiveTab('model')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition ${activeTab === 'model' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                    <Tags size={12} /> Variabel Model
                </button>

                <div className="flex-1" />
                <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                    {activeTab === 'data' ? `${filteredData.length} data` : `${models.length} model`}
                </span>
            </div>

            {/* Messages */}
            {(success || error) && (
                <div className={`px-3 py-1.5 text-[11px] shrink-0 ${success ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-100' : 'bg-red-50 text-red-600 border-b border-red-100'}`}>
                    {success || error}
                </div>
            )}

            {/* ═══ Tab 1: Daftar Data Khidmah ════════════════════════ */}
            {activeTab === 'data' && (
                <>
                    {/* Filter bar */}
                    <div className="border-b border-slate-200 bg-slate-50/80 px-3 py-2 flex items-center gap-2 shrink-0">
                        <div className="flex-1 relative">
                            <Search size={11} className="absolute left-2.5 top-[7px] text-slate-400" />
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari nama atau NIS..."
                                className="w-full pl-7 pr-3 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-700 placeholder-slate-400 focus:border-emerald-400 outline-none" />
                        </div>
                        <select value={filterModel} onChange={e => setFilterModel(e.target.value)}
                            className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-600 focus:border-emerald-400 outline-none">
                            <option value="">Semua Model</option>
                            {models.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                        </select>
                        <button onClick={openAddPanel} disabled={models.length === 0}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold transition disabled:opacity-50 shrink-0">
                            <Plus size={12} /> Tambah
                        </button>
                    </div>

                    {/* Column header */}
                    <div className="bg-slate-50 border-b border-slate-200 shrink-0">
                        <div className="grid grid-cols-[40px_1fr_90px_120px_100px_48px] min-w-[600px]">
                            <div className="px-2 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 text-center">#</div>
                            <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Santri</div>
                            <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">NIS</div>
                            <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Model</div>
                            <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Keterangan</div>
                            <div className="px-2 py-[7px]"></div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-auto">
                        {filteredData.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                <div className="text-center space-y-1">
                                    <ClipboardList size={24} className="mx-auto opacity-40" />
                                    <p className="text-xs">{searchQuery || filterModel ? 'Tidak ada hasil' : 'Belum ada data khidmah'}</p>
                                    {models.length === 0 && <p className="text-[10px]">Buat variabel model dulu di tab "Variabel Model"</p>}
                                </div>
                            </div>
                        ) : (
                            <div className="min-w-[600px]">
                                {filteredData.map((d, idx) => (
                                    <div key={d.id} className="grid grid-cols-[40px_1fr_90px_120px_100px_48px] border-b border-slate-100 hover:bg-slate-50/80 transition group">
                                        <div className="px-2 py-[7px] text-[11px] text-slate-400 border-r border-slate-100 text-center tabular-nums">{idx + 1}</div>
                                        <div className="px-3 py-[7px] text-[12px] font-medium text-slate-800 border-r border-slate-100 truncate flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 overflow-hidden">
                                                {d.santri.foto
                                                    ? <img src={d.santri.foto} alt="" className="w-full h-full object-cover" />
                                                    : <span className="text-[9px] font-bold text-emerald-600">{d.santri.namaLengkap.charAt(0)}</span>
                                                }
                                            </div>
                                            <span className="truncate">{d.santri.namaLengkap}</span>
                                        </div>
                                        <div className="px-3 py-[7px] text-[11px] font-mono text-slate-500 border-r border-slate-100 truncate">{d.santri.nis}</div>
                                        <div className="px-3 py-[7px] text-[11px] border-r border-slate-100">
                                            <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded text-[10px] font-semibold">{d.modelKhidmah.nama}</span>
                                        </div>
                                        <div className="px-3 py-[7px] text-[11px] text-slate-500 border-r border-slate-100 truncate">{d.keterangan || <span className="text-slate-300 italic">—</span>}</div>
                                        <div className="px-2 py-[7px] flex items-center justify-center gap-0.5">
                                            <button onClick={() => openEditPanel(d)}
                                                className="p-1 text-slate-300 hover:text-blue-500 rounded transition opacity-0 group-hover:opacity-100">
                                                <Edit2 size={11} />
                                            </button>
                                            <button onClick={() => setDeleteTarget({ type: 'data', id: d.id, label: `${d.santri.namaLengkap} - ${d.modelKhidmah.nama}` })}
                                                className="p-1 text-slate-300 hover:text-red-500 rounded transition opacity-0 group-hover:opacity-100">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Status bar */}
                    <div className="h-7 border-t border-slate-200 bg-slate-50/80 flex items-center px-3 shrink-0">
                        <span className="text-[10px] text-slate-400">Total: {filteredData.length} data khidmah</span>
                    </div>
                </>
            )}

            {/* ═══ Tab 2: Variabel Model Khidmah ═════════════════════ */}
            {activeTab === 'model' && (
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: add form */}
                    <div className="w-[280px] shrink-0 border-r border-slate-200 bg-slate-50/50 flex flex-col">
                        <div className="h-9 px-3 border-b border-slate-200 bg-white flex items-center shrink-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tambah Baru</span>
                        </div>
                        <div className="p-3 space-y-2">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Nama *</label>
                                <input type="text" value={newModelNama} onChange={e => setNewModelNama(e.target.value)} placeholder="Contoh: Pengajar, Keamanan..."
                                    onKeyDown={e => e.key === 'Enter' && createModel()}
                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-700 placeholder-slate-400 focus:border-emerald-400 outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Deskripsi</label>
                                <input type="text" value={newModelDesc} onChange={e => setNewModelDesc(e.target.value)} placeholder="Opsional..."
                                    onKeyDown={e => e.key === 'Enter' && createModel()}
                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-700 placeholder-slate-400 focus:border-emerald-400 outline-none" />
                            </div>
                            <button onClick={createModel} disabled={!newModelNama.trim() || loading}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs font-semibold transition disabled:opacity-50">
                                <Plus size={12} /> Tambah
                            </button>
                        </div>
                    </div>

                    {/* Right: model list */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-200 shrink-0">
                            <div className="grid grid-cols-[40px_1fr_80px_1fr_80px] min-w-[500px]">
                                <div className="px-2 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 text-center">#</div>
                                <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Nama</div>
                                <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Jumlah</div>
                                <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Deskripsi</div>
                                <div className="px-2 py-[7px]"></div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {models.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-slate-400">
                                    <div className="text-center space-y-1">
                                        <Tags size={24} className="mx-auto opacity-40" />
                                        <p className="text-xs">Belum ada model khidmah</p>
                                        <p className="text-[10px]">Tambahkan di panel kiri</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="min-w-[500px]">
                                    {models.map((m, idx) => (
                                        <div key={m.id} className="grid grid-cols-[40px_1fr_80px_1fr_80px] border-b border-slate-100 hover:bg-slate-50/80 transition group">
                                            <div className="px-2 py-[7px] text-[11px] text-slate-400 border-r border-slate-100 text-center tabular-nums">{idx + 1}</div>
                                            <div className="px-3 py-[7px] border-r border-slate-100">
                                                {editingModel?.id === m.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <input autoFocus value={editNama} onChange={e => setEditNama(e.target.value)}
                                                            onKeyDown={e => { if (e.key === 'Enter') updateModel(); if (e.key === 'Escape') setEditingModel(null); }}
                                                            className="flex-1 px-1.5 py-0.5 rounded border border-emerald-300 text-xs outline-none" />
                                                        <button onClick={updateModel} className="px-1.5 py-0.5 bg-emerald-500 text-white rounded text-[10px] font-medium">OK</button>
                                                        <button onClick={() => setEditingModel(null)} className="text-[10px] text-slate-400">✕</button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[12px] font-semibold text-slate-800 cursor-pointer hover:text-emerald-700 transition"
                                                        onClick={() => { setEditingModel(m); setEditNama(m.nama); setEditDesc(m.deskripsi || ''); }}>
                                                        {m.nama}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="px-3 py-[7px] text-[11px] text-slate-500 border-r border-slate-100 tabular-nums">{m._count?.dataKhidmah ?? 0} santri</div>
                                            <div className="px-3 py-[7px] text-[11px] text-slate-400 border-r border-slate-100 truncate">
                                                {editingModel?.id === m.id ? (
                                                    <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Deskripsi"
                                                        onKeyDown={e => { if (e.key === 'Enter') updateModel(); if (e.key === 'Escape') setEditingModel(null); }}
                                                        className="w-full px-1.5 py-0.5 rounded border border-slate-200 text-xs outline-none" />
                                                ) : (m.deskripsi || <span className="text-slate-300 italic">—</span>)}
                                            </div>
                                            <div className="px-2 py-[7px] flex items-center justify-center gap-1">
                                                <button onClick={() => { setEditingModel(m); setEditNama(m.nama); setEditDesc(m.deskripsi || ''); }}
                                                    className="text-[10px] text-slate-400 hover:text-emerald-600 transition opacity-0 group-hover:opacity-100">Edit</button>
                                                <button onClick={() => setDeleteTarget({ type: 'model', id: m.id, label: m.nama })}
                                                    className="p-0.5 text-slate-300 hover:text-red-500 rounded transition opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={11} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="h-7 border-t border-slate-200 bg-slate-50/80 flex items-center px-3 shrink-0">
                            <span className="text-[10px] text-slate-400">{models.length} model khidmah</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Slide-in Panel: Tambah/Edit Khidmah ═════════════════════ */}
            {showAssignPanel && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] z-40" onClick={closePanel} />}
            <div className={`fixed top-0 right-0 h-full w-full sm:w-[340px] bg-white shadow-2xl z-50 transform transition-transform duration-300 border-l border-slate-200 flex flex-col ${showAssignPanel ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between shrink-0">
                    <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <ClipboardList size={14} className="text-emerald-500" />
                        {editingData ? 'Edit Khidmah' : 'Tambah Khidmah'}
                    </h2>
                    <button onClick={closePanel} className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition"><X size={14} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {editingData && (
                        <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Santri</p>
                            <p className="text-xs font-semibold text-slate-700">{editingData.santri.namaLengkap}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{editingData.santri.nis}</p>
                        </div>
                    )}
                    {!editingData && (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">NIS Santri *</label>
                            <input type="text" autoFocus value={assignNis} onChange={e => setAssignNis(e.target.value)} placeholder="Masukkan NIS..."
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:border-emerald-400 outline-none" />
                        </div>
                    )}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Model Khidmah *</label>
                        <select value={assignModelId} onChange={e => setAssignModelId(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:border-emerald-400 outline-none">
                            {models.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                        </select>
                        <p className="text-[9px] text-slate-400 mt-1">Satu santri bisa memiliki lebih dari satu model khidmah</p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Keterangan</label>
                        <input type="text" value={assignKeterangan} onChange={e => setAssignKeterangan(e.target.value)} placeholder="Opsional..."
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:border-emerald-400 outline-none" />
                    </div>
                </div>
                <div className="p-3 border-t border-slate-200 flex gap-2 shrink-0">
                    <button onClick={closePanel} className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition">Batal</button>
                    <button onClick={editingData ? updateKhidmah : assignKhidmah}
                        disabled={(!editingData && !assignNis.trim()) || !assignModelId || loading}
                        className="flex-1 py-2 rounded-lg bg-emerald-500 text-xs font-semibold text-white hover:bg-emerald-600 transition disabled:opacity-50">
                        {loading ? 'Menyimpan...' : (editingData ? 'Perbarui' : 'Simpan')}
                    </button>
                </div>
            </div>

            {/* ═══ Delete Confirm Modal ════════════════════════════════ */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                            <AlertCircle size={18} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-sm font-bold text-slate-900">Hapus {deleteTarget.type === 'model' ? 'Model' : 'Data'} Khidmah?</h3>
                            <p className="text-xs font-semibold text-slate-600 mt-1">"{deleteTarget.label}"</p>
                            {deleteTarget.type === 'model' && <p className="text-[10px] text-slate-400 mt-1">Semua data santri terkait akan ikut dihapus.</p>}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">Batal</button>
                            <button onClick={handleDelete} className="flex-1 py-2 rounded-lg bg-red-500 text-xs font-semibold text-white hover:bg-red-600 transition">Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
