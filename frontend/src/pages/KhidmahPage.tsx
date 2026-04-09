import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Trash2, Search, X, ClipboardList, Tags, AlertCircle } from 'lucide-react';

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
    const [showAssignModal, setShowAssignModal] = useState(false);
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
        try {
            const r = await api.get('/khidmah/model');
            setModels(r.data);
        } catch { showErr('Gagal memuat model khidmah'); }
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
            setShowAssignModal(false);
            setAssignNis(''); setAssignModelId(''); setAssignKeterangan('');
            await fetchData(filterModel || undefined);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal menambahkan'); }
        finally { setLoading(false); }
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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Data Khidmah</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Kelola kepengurusan dan tugas santri</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('data')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'data' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <ClipboardList size={16} /> Daftar Khidmah
                </button>
                <button
                    onClick={() => setActiveTab('model')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'model' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Tags size={16} /> Variabel Model
                </button>
            </div>

            {/* Messages */}
            {success && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">{success}</div>}
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

            {/* ═══ Tab 1: Daftar Data Khidmah ═══════════════════════════════════ */}
            {activeTab === 'data' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Cari nama santri atau NIS..."
                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 placeholder-gray-400"
                            />
                        </div>
                        <select
                            value={filterModel}
                            onChange={e => setFilterModel(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-emerald-400"
                        >
                            <option value="">Semua Model Khidmah</option>
                            {models.map(m => (
                                <option key={m.id} value={m.id}>{m.nama}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => { setShowAssignModal(true); setAssignModelId(models[0]?.id || ''); }}
                            disabled={models.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            <Plus size={16} /> Tambah Khidmah
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Santri</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">NIS</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Model Khidmah</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Keterangan</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center">
                                            <div className="flex flex-col items-center gap-2 text-gray-400">
                                                <ClipboardList size={32} className="opacity-50" />
                                                <p className="text-sm">{searchQuery || filterModel ? 'Tidak ada hasil' : 'Belum ada data khidmah'}</p>
                                                {models.length === 0 && <p className="text-xs">Buat variabel model khidmah terlebih dahulu di tab "Variabel Model"</p>}
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredData.map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50 transition group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                    {d.santri.foto
                                                        ? <img src={d.santri.foto} alt="" className="w-full h-full object-cover" />
                                                        : <span className="text-xs font-bold text-emerald-600">{d.santri.namaLengkap.charAt(0)}</span>
                                                    }
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">{d.santri.namaLengkap}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">{d.santri.nis}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                                                {d.modelKhidmah.nama}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{d.keterangan || <span className="italic text-gray-300">—</span>}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => setDeleteTarget({ type: 'data', id: d.id, label: `${d.santri.namaLengkap} - ${d.modelKhidmah.nama}` })}
                                                className="w-7 h-7 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded-lg flex items-center justify-center transition opacity-0 group-hover:opacity-100 mx-auto"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                        <p className="text-xs text-gray-500">Total: {filteredData.length} data khidmah</p>
                    </div>
                </div>
            )}

            {/* ═══ Tab 2: Variabel Model Khidmah ═══════════════════════════════ */}
            {activeTab === 'model' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Add new model */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                        <h3 className="text-sm font-bold text-gray-900">Tambah Model Khidmah Baru</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Model *</label>
                                <input
                                    type="text"
                                    value={newModelNama}
                                    onChange={e => setNewModelNama(e.target.value)}
                                    placeholder="Contoh: Pengajar, Keamanan, Ketua Kamar..."
                                    onKeyDown={e => e.key === 'Enter' && createModel()}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 placeholder-gray-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi (opsional)</label>
                                <input
                                    type="text"
                                    value={newModelDesc}
                                    onChange={e => setNewModelDesc(e.target.value)}
                                    placeholder="Keterangan singkat..."
                                    onKeyDown={e => e.key === 'Enter' && createModel()}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 placeholder-gray-400"
                                />
                            </div>
                            <button
                                onClick={createModel}
                                disabled={!newModelNama.trim() || loading}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                            >
                                <Plus size={16} /> Tambah
                            </button>
                        </div>
                    </div>

                    {/* Existing models list */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="text-sm font-bold text-gray-900">Model Khidmah ({models.length})</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Daftar variabel model yang tersedia</p>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                            {models.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <Tags size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Belum ada model khidmah</p>
                                    <p className="text-xs mt-1">Tambahkan model di sebelah kiri</p>
                                </div>
                            ) : models.map(m => (
                                <div key={m.id} className="px-6 py-3 flex items-center justify-between group hover:bg-gray-50 transition">
                                    {editingModel?.id === m.id ? (
                                        <div className="flex-1 flex items-center gap-2">
                                            <input
                                                autoFocus
                                                value={editNama}
                                                onChange={e => setEditNama(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') updateModel(); if (e.key === 'Escape') setEditingModel(null); }}
                                                className="flex-1 px-2 py-1 rounded border border-emerald-300 text-sm outline-none focus:ring-1 focus:ring-emerald-200"
                                            />
                                            <input
                                                value={editDesc}
                                                onChange={e => setEditDesc(e.target.value)}
                                                placeholder="Deskripsi"
                                                onKeyDown={e => { if (e.key === 'Enter') updateModel(); if (e.key === 'Escape') setEditingModel(null); }}
                                                className="flex-1 px-2 py-1 rounded border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-emerald-200"
                                            />
                                            <button onClick={updateModel} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-medium">OK</button>
                                            <button onClick={() => setEditingModel(null)} className="px-2 py-1 text-gray-400 hover:text-gray-600 text-xs">Batal</button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-gray-900">{m.nama}</span>
                                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{m._count?.dataKhidmah ?? 0} santri</span>
                                                </div>
                                                {m.deskripsi && <p className="text-xs text-gray-500 mt-0.5 truncate">{m.deskripsi}</p>}
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                <button
                                                    onClick={() => { setEditingModel(m); setEditNama(m.nama); setEditDesc(m.deskripsi || ''); }}
                                                    className="px-2 py-1 text-xs text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget({ type: 'model', id: m.id, label: m.nama })}
                                                    className="w-7 h-7 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded-lg flex items-center justify-center transition"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Assign Modal ═══════════════════════════════════════════════════ */}
            {showAssignModal && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAssignModal(false)}>
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900">Tambah Khidmah Santri</h3>
                            <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">NIS Santri *</label>
                                <input
                                    type="text"
                                    value={assignNis}
                                    onChange={e => setAssignNis(e.target.value)}
                                    placeholder="Masukkan NIS santri..."
                                    autoFocus
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Model Khidmah *</label>
                                <select
                                    value={assignModelId}
                                    onChange={e => setAssignModelId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-emerald-400"
                                >
                                    {models.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan (opsional)</label>
                                <input
                                    type="text"
                                    value={assignKeterangan}
                                    onChange={e => setAssignKeterangan(e.target.value)}
                                    placeholder="Misal: Pengajar Nahwu, Ketua Kamar 5A..."
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setShowAssignModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                            <button
                                onClick={assignKhidmah}
                                disabled={!assignNis.trim() || !assignModelId || loading}
                                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                            >
                                {loading ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Delete Confirm Modal ═══════════════════════════════════════════ */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                            <AlertCircle size={22} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-gray-900">
                                Hapus {deleteTarget.type === 'model' ? 'Model Khidmah' : 'Data Khidmah'}?
                            </h3>
                            <p className="text-sm font-semibold text-gray-800 mt-1">"{deleteTarget.label}"</p>
                            {deleteTarget.type === 'model' && (
                                <p className="text-xs text-gray-500 mt-2">Semua data santri yang terkait model ini akan ikut dihapus.</p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                            <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition">Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
