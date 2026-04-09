import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Kelas, Santri } from '../types';
import { useAuthStore } from '../stores/authStore';
import { ArrowLeft, Pencil, X, UserPlus, Printer } from 'lucide-react';
import AssignSantriModal from '../components/AssignSantriModal';
import { PresensiPrintModal } from './madrasah/components/PresensiPrintModal';

const LIMIT = 20;

// ── Edit Modal (slide-in from right) ──────────────────────────────────────────
function EditKelasPanel({ kelas, onClose, onSaved }: { kelas: Kelas; onClose: () => void; onSaved: () => void }) {
    const [nama, setNama] = useState(kelas.nama);
    const [tahunAjaran, setTahunAjaran] = useState(kelas.tahunAjaran ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [visible, setVisible] = useState(false);

    useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
    const handleClose = () => { setVisible(false); setTimeout(onClose, 200); };

    const handleSave = async () => {
        if (!nama.trim()) return;
        setSaving(true);
        try {
            await api.patch(`/kelas/${kelas.id}`, {
                nama: nama.trim(),
                tahunAjaran: tahunAjaran.trim() || undefined,
            });
            onSaved();
            handleClose();
        } catch (e: any) { setError(e.response?.data?.message || 'Gagal menyimpan'); }
        finally { setSaving(false); }
    };

    return (
        <>
            <div className={`fixed inset-0 bg-black/15 backdrop-blur-[1px] z-[200] transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose} />
            <div className={`fixed top-0 right-0 h-full w-full max-w-xs bg-white shadow-2xl z-[201] flex flex-col transition-transform duration-200 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <h3 className="text-sm font-bold text-slate-800">Edit Kelas</h3>
                    <button onClick={handleClose} className="p-1 text-slate-400 hover:text-slate-600 rounded transition"><X size={14} /></button>
                </div>
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                    {error && <p className="text-[11px] text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Kelas</label>
                        <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama kelas"
                            onKeyDown={e => e.key === 'Enter' && handleSave()}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tahun Ajaran</label>
                        <input value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)} placeholder="2024/2025"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                    </div>
                </div>
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex gap-2 shrink-0">
                    <button onClick={handleClose} className="flex-1 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition">Batal</button>
                    <button onClick={handleSave} disabled={!nama.trim() || saving}
                        className="flex-1 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                        {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </div>
        </>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function KelasDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canEdit = user && ['ADMIN', 'STAF_MADRASAH'].includes(user.roles?.[0]);

    const [kelas, setKelas] = useState<Kelas | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [printOpen, setPrintOpen] = useState(false);

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

    const fetchKelas = useCallback(async () => {
        if (!id) return;
        const r = await api.get(`/kelas/${id}`);
        setKelas(r.data.data);
    }, [id]);

    const fetchSantri = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const params: any = { page, limit: LIMIT, kelasId: id };
            if (debouncedSearch) params.search = debouncedSearch;
            if (filterStatus) params.status = filterStatus;
            if (filterGender) params.gender = filterGender;
            const res = await api.get('/santri', { params });
            const list: Santri[] = res.data.data;
            setSantriList(list);
            setTotal(res.data.meta?.total || 0);
            setTotalPages(res.data.meta?.totalPages || 1);
        } finally { setLoading(false); }
    }, [id, page, debouncedSearch, filterGender, filterStatus]);

    useEffect(() => { fetchKelas(); }, [fetchKelas]);
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

    if (!kelas) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const kelasFullName = [kelas.tingkat?.jenjang?.nama, kelas.tingkat?.nama, kelas.nama].filter(Boolean).join(' ');

    return (
        <div className="flex flex-col h-[calc(100dvh-64px)] bg-white text-slate-700 overflow-hidden">
            {/* ── Toolbar ─────────────────────────────────────── */}
            <div className="h-10 border-b border-slate-200 flex items-center px-3 gap-2 shrink-0 bg-white">
                <button onClick={() => navigate('/madrasah/kelas')} className="p-1 text-slate-400 hover:text-slate-700 rounded transition">
                    <ArrowLeft size={14} />
                </button>
                <div className="w-px h-5 bg-slate-200" />
                <span className="text-[11px] font-bold text-slate-700 truncate">{kelasFullName}</span>
                <div className="w-px h-5 bg-slate-200 mx-0.5" />
                <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{loading ? '...' : `${total} santri`}</span>
                <div className="flex-1" />
                {canEdit && (
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => setPrintOpen(true)}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition shrink-0">
                            <Printer size={12} /> Cetak
                        </button>
                        <button onClick={() => setAssignOpen(true)}
                            className="px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition shrink-0">
                            <UserPlus size={12} /> Assign
                        </button>
                        <button onClick={() => setEditOpen(true)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="Edit Kelas">
                            <Pencil size={13} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── Info bar ─────────────────────────────────────── */}
            <div className="border-b border-slate-200 bg-slate-50/80 px-3 py-2 shrink-0">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <InfoChip label="Jenjang" value={kelas.tingkat?.jenjang?.nama} />
                    <InfoChip label="Tingkat" value={kelas.tingkat?.nama} />
                    <InfoChip label="TA" value={kelas.tahunAjaran} />
                    <InfoChip label="Wali" value={kelas.waliKelas?.name} />
                </div>

                {/* Search + Filter row */}
                <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 relative">
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" placeholder="Cari nama atau NIS..." value={search} onChange={e => handleSearch(e.target.value)}
                            className="w-full pl-7 pr-3 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-700 placeholder-slate-400 focus:border-blue-400 outline-none" />
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                        {[{ value: '', label: 'Semua' }, { value: 'ACTIVE', label: 'Aktif' }, { value: 'INACTIVE', label: 'Nonaktif' }].map(opt => (
                            <button key={opt.value} onClick={() => { setFilterStatus(opt.value); setPage(1); }}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${filterStatus === opt.value ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>{opt.label}</button>
                        ))}
                    </div>
                    <div className="w-px h-4 bg-slate-200" />
                    <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Gender:</span>
                        {[{ value: '', label: 'Semua' }, { value: 'L', label: 'L' }, { value: 'P', label: 'P' }].map(opt => (
                            <button key={opt.value} onClick={() => { setFilterGender(opt.value); setPage(1); }}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${filterGender === opt.value ? 'bg-purple-500 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>{opt.label}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Column header ────────────────────────────────── */}
            <div className="bg-slate-50 border-b border-slate-200 shrink-0">
                <div className="grid grid-cols-[36px_72px_1fr_120px_100px_70px_48px] min-w-[600px]">
                    <div className="px-2 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 text-center">#</div>
                    <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">NIS</div>
                    <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Nama</div>
                    <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Kamar</div>
                    <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Tgl Masuk</div>
                    <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Status</div>
                    <div className="px-2 py-[7px]"></div>
                </div>
            </div>

            {/* ── Body ────────────────────────────────────────── */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="min-w-[600px]">{Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-[36px_72px_1fr_120px_100px_70px_48px] border-b border-slate-100 animate-pulse">
                            {Array.from({ length: 7 }).map((_, j) => <div key={j} className="px-3 py-3 border-r border-slate-100"><div className="h-3 bg-slate-100 rounded" /></div>)}
                        </div>))}</div>
                ) : santriList.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        <p className="text-xs">{search || filterGender || filterStatus ? 'Tidak ada santri yang sesuai filter' : 'Belum ada siswa di kelas ini'}</p>
                    </div>
                ) : (
                    <div className="min-w-[600px]">{santriList.map((s, idx) => (
                        <div key={s.id} onClick={() => navigate(`/santri/${s.id}`)}
                            className="grid grid-cols-[36px_72px_1fr_120px_100px_70px_48px] border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer group transition">
                            <div className="px-2 py-[7px] text-[11px] text-slate-400 border-r border-slate-100 text-center tabular-nums">{startIndex + idx + 1}</div>
                            <div className="px-3 py-[7px] text-[11px] font-mono font-medium text-slate-600 border-r border-slate-100 truncate">{s.nis}</div>
                            <div className="px-3 py-[7px] border-r border-slate-100">
                                <p className="text-[12px] font-medium text-slate-800 truncate group-hover:text-blue-700 transition">{s.namaLengkap}</p>
                                {s.tempatLahir && s.tanggalLahir && (
                                    <p className="text-[9px] text-slate-400 mt-0.5">{s.tempatLahir}, {new Date(s.tanggalLahir).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                )}
                            </div>
                            <div className="px-3 py-[7px] text-[11px] text-slate-600 border-r border-slate-100 truncate">{s.kamar?.nama || <span className="text-slate-300">—</span>}</div>
                            <div className="px-3 py-[7px] text-[11px] text-slate-500 border-r border-slate-100 whitespace-nowrap">
                                {s.tanggalMasuk ? new Date(s.tanggalMasuk).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : <span className="text-slate-300">—</span>}
                            </div>
                            <div className="px-3 py-[7px] border-r border-slate-100">
                                <span className={`text-[10px] font-semibold ${s.status === 'ACTIVE' ? 'text-emerald-600' : 'text-orange-500'}`}>
                                    {s.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                                </span>
                            </div>
                            <div className="px-2 py-[7px] flex items-center justify-center gap-0.5" onClick={e => e.stopPropagation()}>
                                {canEdit && (<>
                                    <button onClick={() => navigate(`/santri/${s.id}/edit`)} className="w-5 h-5 text-slate-300 hover:text-blue-500 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button onClick={() => setDeleteTarget(s)} className="w-5 h-5 text-slate-300 hover:text-red-500 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </>)}
                            </div>
                        </div>
                    ))}</div>
                )}
            </div>

            {/* ── Status bar + Pagination ──────────────────────── */}
            <div className="h-8 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between px-3 shrink-0">
                <span className="text-[10px] text-slate-400">{total > 0 ? `${startIndex + 1}–${Math.min(startIndex + LIMIT, total)} dari ${total}` : '0 santri'}</span>
                {totalPages > 1 && (
                    <div className="flex items-center gap-0.5">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-200 rounded disabled:opacity-30 transition">← Prev</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), Math.min(totalPages, page + 2)).map(p => (
                            <button key={p} onClick={() => setPage(p)} className={`w-5 h-5 rounded text-[10px] font-medium transition ${p === page ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>{p}</button>
                        ))}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-200 rounded disabled:opacity-30 transition">Next →</button>
                    </div>
                )}
            </div>

            {/* ── Panels & Modals ──────────────────────────────── */}
            {editOpen && <EditKelasPanel kelas={kelas} onClose={() => setEditOpen(false)} onSaved={fetchKelas} />}

            {assignOpen && (
                <AssignSantriModal
                    type="kelas"
                    targetId={kelas.id as unknown as number}
                    targetName={kelasFullName}
                    onClose={() => setAssignOpen(false)}
                    onAssigned={fetchSantri}
                    accentColor="blue"
                />
            )}

            {printOpen && (
                <PresensiPrintModal
                    isOpen={printOpen}
                    kelasId={kelas.id.toString()}
                    kelasName={kelasFullName}
                    onClose={() => setPrintOpen(false)}
                />
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-slate-900">Hapus Santri?</h3>
                            <p className="text-sm text-slate-500 mt-1">Data <strong>"{deleteTarget.namaLengkap}"</strong> akan dihapus permanen.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Batal</button>
                            <button onClick={handleDelete} disabled={deleting}
                                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition disabled:opacity-50">
                                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Sub-component ─────────────────────────────────────────────────────────────
function InfoChip({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}:</span>
            <span className="text-[11px] font-medium text-slate-700">{value || <span className="text-slate-300 italic">—</span>}</span>
        </div>
    );
}
