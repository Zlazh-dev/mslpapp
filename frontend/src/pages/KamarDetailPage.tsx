import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Kamar, Santri } from '../types';
import { useAuthStore } from '../stores/authStore';
import { ArrowLeft, Pencil, X, Check, Home, Users, UserPlus } from 'lucide-react';
import AssignSantriModal from '../components/AssignSantriModal';

const LIMIT = 20;

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditKamarModal({ kamar, onClose, onSaved }: { kamar: Kamar; onClose: () => void; onSaved: () => void }) {
    const [nama, setNama] = useState(kamar.nama);
    const [kapasitas, setKapasitas] = useState(kamar.kapasitas?.toString() ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (!nama.trim()) return;
        setSaving(true);
        try {
            await api.patch(`/kamar/${kamar.id}`, {
                nama: nama.trim(),
                kapasitas: kapasitas ? parseInt(kapasitas) : undefined,
            });
            onSaved();
            onClose();
        } catch (e: any) { setError(e.response?.data?.message || 'Gagal menyimpan'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900">Edit Kamar</h3>
                    <button onClick={onClose} className="w-7 h-7 text-gray-400 hover:text-gray-600 rounded flex items-center justify-center"><X size={16} /></button>
                </div>
                {error && <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Nama Kamar <span className="text-red-500">*</span></label>
                        <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama kamar"
                            onKeyDown={e => e.key === 'Enter' && handleSave()}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Kapasitas</label>
                        <input type="number" value={kapasitas} onChange={e => setKapasitas(e.target.value)} placeholder="Jumlah tempat"
                            min={1}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200" />
                    </div>
                </div>
                <div className="flex gap-3 pt-1">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                    <button onClick={handleSave} disabled={!nama.trim() || saving}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50">
                        {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function KamarDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canEdit = user && ['ADMIN', 'STAF_PENDATAAN'].includes(user.role);

    const [kamar, setKamar] = useState<Kamar | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);

    // Santri table state
    const [santriList, setSantriList] = useState<Santri[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState<Santri | null>(null);
    const [deleting, setDeleting] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchKamar = useCallback(async () => {
        if (!id) return;
        const r = await api.get(`/kamar/${id}`);
        setKamar(r.data.data);
    }, [id]);

    const fetchSantri = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const params: any = { page, limit: LIMIT, kamarId: id };
            if (debouncedSearch) params.search = debouncedSearch;
            if (filterStatus) params.status = filterStatus;
            const res = await api.get('/santri', { params });
            const list: Santri[] = res.data.data;
            const filtered = filterGender ? list.filter(s => s.gender === filterGender) : list;
            setSantriList(filtered);
            setTotal(res.data.meta?.total || 0);
            setTotalPages(res.data.meta?.totalPages || 1);
        } finally { setLoading(false); }
    }, [id, page, debouncedSearch, filterGender, filterStatus]);

    useEffect(() => { fetchKamar(); }, [fetchKamar]);
    useEffect(() => { fetchSantri(); }, [fetchSantri]);

    const handleSearch = (val: string) => {
        setSearch(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 300);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        await api.delete(`/santri/${deleteTarget.id}`);
        setDeleting(false); setDeleteTarget(null);
        fetchSantri();
    };

    const startIndex = (page - 1) * LIMIT;

    if (!kamar) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const terisi = kamar._count?.santris ?? 0;
    const kap = kamar.kapasitas ?? 0;
    const pct = kap > 0 ? Math.min(100, (terisi / kap) * 100) : 0;
    const isOver = kap > 0 && terisi > kap;

    return (
        <div className="space-y-4">
            {/* Breadcrumb / Back */}
            <div className="flex items-center gap-2">
                <button onClick={() => navigate('/kamar')}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition">
                    <ArrowLeft size={14} /> Manajemen Kamar
                </button>
                <span className="text-gray-300">/</span>
                <span className="text-xs text-gray-700 font-medium">{kamar.nama}</span>
            </div>

            {/* Info Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Home size={22} className="text-emerald-600" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">{kamar.nama}</h1>
                            {/* Breadcrumb lokasi */}
                            <p className="text-xs text-gray-500 mt-0.5">
                                {kamar.gedung?.kompleks?.nama && `${kamar.gedung.kompleks.nama} → `}
                                {kamar.gedung?.nama && `${kamar.gedung.nama} → `}
                                {kamar.nama}
                            </p>
                        </div>
                    </div>
                    {canEdit && (
                        <button onClick={() => setEditOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition flex-shrink-0">
                            <Pencil size={13} /> Edit
                        </button>
                    )}
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kompleks</p>
                        <p className="text-sm font-medium text-gray-700 mt-0.5">{kamar.gedung?.kompleks?.nama || '—'}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gedung</p>
                        <p className="text-sm font-medium text-gray-700 mt-0.5">{kamar.gedung?.nama || '—'}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kapasitas</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-sm font-medium ${isOver ? 'text-red-600' : 'text-gray-700'}`}>
                                {terisi}{kap > 0 ? `/${kap}` : ''} santri
                            </span>
                            {kap > 0 && (
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[50px]">
                                    <div className={`h-full rounded-full ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                        style={{ width: `${pct}%` }} />
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pembimbing</p>
                        <p className="text-sm font-medium text-gray-700 mt-0.5">{kamar.pembimbing?.name || <span className="text-gray-400 italic text-xs">Belum ditugaskan</span>}</p>
                    </div>
                </div>
            </div>

            {/* Santri Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Users size={15} className="text-emerald-600" />
                            Daftar Penghuni
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {loading ? 'Memuat...' : `${total} santri di kamar ini`}
                        </p>
                    </div>
                    {canEdit && (
                        <button onClick={() => setAssignOpen(true)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition">
                            <UserPlus size={14} />
                            Assign Santri
                        </button>
                    )}
                </div>

                {/* Search & Filter */}
                <div className="px-3 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
                    <div className="flex-1 relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input type="text" placeholder="Cari nama atau NIS..." value={search}
                            onChange={e => handleSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded text-xs text-gray-900 placeholder-gray-400 focus:border-emerald-500 outline-none" />
                    </div>
                    <select value={filterGender} onChange={e => { setFilterGender(e.target.value); setPage(1); }}
                        className="h-[30px] px-2 border border-gray-200 bg-white rounded text-xs text-gray-600 outline-none focus:border-emerald-400">
                        <option value="">Semua Gender</option>
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                    </select>
                    <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                        className="h-[30px] px-2 border border-gray-200 bg-white rounded text-xs text-gray-600 outline-none focus:border-emerald-400">
                        <option value="">Semua Status</option>
                        <option value="ACTIVE">Aktif</option>
                        <option value="INACTIVE">Nonaktif</option>
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-10">No</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">NIS</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nama Lengkap</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Kelas</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tgl Masuk</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array.from({ length: 7 }).map((_, j) => (
                                            <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 rounded" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : santriList.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center">
                                        <Users size={32} className="text-gray-200 mx-auto mb-2" />
                                        <p className="text-sm text-gray-400 font-medium">
                                            {search || filterGender || filterStatus ? 'Tidak ada santri yang sesuai filter' : 'Belum ada penghuni di kamar ini'}
                                        </p>
                                    </td>
                                </tr>
                            ) : santriList.map((s, idx) => (
                                <tr key={s.id} onClick={() => navigate(`/santri/${s.id}`)}
                                    className="hover:bg-gray-50/80 cursor-pointer transition group">
                                    <td className="px-4 py-2.5"><span className="text-[11px] text-gray-400">{startIndex + idx + 1}</span></td>
                                    <td className="px-4 py-2.5"><span className="text-xs font-mono font-medium text-gray-700">{s.nis}</span></td>
                                    <td className="px-4 py-2.5">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-900 group-hover:text-emerald-700 transition truncate max-w-[200px]">{s.namaLengkap}</p>
                                            {s.tempatLahir && s.tanggalLahir && (
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    {s.tempatLahir}, {new Date(s.tanggalLahir).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="text-xs text-gray-700">{s.kelas?.nama || <span className="text-gray-300">—</span>}</span>
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <span className="text-xs text-gray-500">
                                            {s.tanggalMasuk ? new Date(s.tanggalMasuk).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : <span className="text-gray-300">—</span>}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-600'}`}>
                                            {s.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => navigate(`/santri/${s.id}`)}
                                                className="w-7 h-7 bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 text-gray-500 rounded flex items-center justify-center transition" title="Lihat">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                            </button>
                                            {canEdit && (
                                                <>
                                                    <button onClick={() => navigate(`/santri/${s.id}/edit`)}
                                                        className="w-7 h-7 bg-gray-100 hover:bg-blue-100 hover:text-blue-600 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100" title="Edit">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button onClick={() => setDeleteTarget(s)}
                                                        className="w-7 h-7 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100" title="Hapus">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                            {startIndex + 1}–{Math.min(startIndex + LIMIT, total)} dari {total}
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                                className="px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded text-xs flex items-center gap-1 disabled:opacity-40 transition">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Prev
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                                return (
                                    <button key={p} onClick={() => setPage(p)}
                                        className={`w-7 h-7 rounded text-xs font-medium transition ${p === page ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                                        {p}
                                    </button>
                                );
                            })}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                                className="px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded text-xs flex items-center gap-1 disabled:opacity-40 transition">
                                Next <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editOpen && (
                <EditKamarModal kamar={kamar} onClose={() => setEditOpen(false)} onSaved={fetchKamar} />
            )}

            {/* Assign Modal */}
            {assignOpen && (
                <AssignSantriModal
                    type="kamar"
                    targetId={kamar.id as unknown as number}
                    targetName={kamar.nama}
                    onClose={() => setAssignOpen(false)}
                    onAssigned={fetchSantri}
                    accentColor="emerald"
                />
            )}

            {/* Delete Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-gray-900">Hapus Santri?</h3>
                            <p className="text-sm text-gray-500 mt-1">Data santri <strong>"{deleteTarget.namaLengkap}"</strong> akan dihapus. Aksi ini tidak bisa dibatalkan.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                            <button onClick={handleDelete} disabled={deleting}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition disabled:opacity-50">
                                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
