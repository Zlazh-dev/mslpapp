import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { User } from '../types';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const roleLabels: Record<string, string> = {
    ADMIN: 'Administrator',
    STAF_PENDATAAN: 'Staf Pendataan',
    STAF_MADRASAH: 'Staf Madrasah',
    PEMBIMBING_KAMAR: 'Pembimbing Kamar',
    WALI_KELAS: 'Wali Kelas',
};
const roleDot: Record<string, string> = {
    ADMIN: 'bg-red-500', STAF_PENDATAAN: 'bg-blue-500', STAF_MADRASAH: 'bg-amber-500',
    PEMBIMBING_KAMAR: 'bg-emerald-500', WALI_KELAS: 'bg-slate-500',
};

export default function UserListPage() {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        api.get('/users').then(r => setUsers(r.data.data)).finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        await api.delete(`/users/${deleteTarget.id}`);
        setDeleting(false); setDeleteTarget(null);
        fetchUsers();
    };

    return (
        <div className="flex flex-col h-[calc(100dvh-64px)] bg-white text-slate-700 overflow-hidden">
            {/* ── Toolbar ─────────────────────────────────────────── */}
            <div className="h-10 border-b border-slate-200 flex items-center px-3 gap-2 shrink-0 bg-white">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest shrink-0">Pengguna</span>
                <div className="w-px h-5 bg-slate-200 mx-0.5" />
                <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{loading ? '...' : `${users.length} user`}</span>
                <div className="flex-1" />
                <Link to="/users/baru"
                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition shrink-0">
                    <Plus size={12} /> Tambah
                </Link>
            </div>

            {/* ── Column header ────────────────────────────────── */}
            <div className="bg-slate-50 border-b border-slate-200 shrink-0">
                <div className="grid grid-cols-[40px_1fr_120px_140px_1fr_60px] min-w-[650px]">
                    <div className="px-2 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 text-center">#</div>
                    <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Nama</div>
                    <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Username</div>
                    <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Role</div>
                    <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Penugasan</div>
                    <div className="px-2 py-[7px]"></div>
                </div>
            </div>

            {/* ── Body ────────────────────────────────────────── */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="min-w-[650px]">{Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-[40px_1fr_120px_140px_1fr_60px] border-b border-slate-100 animate-pulse">
                            {Array.from({ length: 6 }).map((_, j) => <div key={j} className="px-3 py-3 border-r border-slate-100"><div className="h-3 bg-slate-100 rounded" /></div>)}
                        </div>))}</div>
                ) : users.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        <p className="text-xs">Belum ada pengguna</p>
                    </div>
                ) : (
                    <div className="min-w-[650px]">{users.map((u, idx) => {
                        const role = u.roles?.[0] || '';
                        const penugasan: string[] = [];
                        if (u.kelasWali && u.kelasWali.length > 0) {
                            const labels = u.kelasWali.map(k => [k.tingkat?.jenjang?.nama, k.tingkat?.nama, k.nama].filter(Boolean).join(' '));
                            penugasan.push(`Kelas: ${labels.join(', ')}`);
                        }
                        if (u.kamarBimbing) penugasan.push(`Kamar: ${u.kamarBimbing.nama}`);
                        return (
                            <div key={u.id} className="grid grid-cols-[40px_1fr_120px_140px_1fr_60px] border-b border-slate-100 hover:bg-slate-50/80 transition group">
                                <div className="px-2 py-[7px] text-[11px] text-slate-400 border-r border-slate-100 text-center tabular-nums">{idx + 1}</div>
                                <div className="px-3 py-[7px] border-r border-slate-100 flex items-center gap-2 truncate">
                                    <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                        <span className="text-[9px] font-bold text-emerald-600">{u.name.charAt(0)}</span>
                                    </div>
                                    <span className="text-[12px] font-medium text-slate-800 truncate">{u.name}</span>
                                    {(u as any).santri && <span className="text-[8px] bg-emerald-50 text-emerald-600 font-bold px-1 py-0 rounded border border-emerald-100 shrink-0">Santri</span>}
                                </div>
                                <div className="px-3 py-[7px] text-[11px] font-mono text-slate-500 border-r border-slate-100 truncate">
                                    {u.username || <span className="text-slate-300 italic">NIS: {(u as any).santri?.nis}</span>}
                                </div>
                                <div className="px-3 py-[7px] text-[11px] border-r border-slate-100">
                                    <span className="inline-flex items-center gap-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${roleDot[role] || 'bg-slate-400'}`} />
                                        <span className="text-[10px] font-medium text-slate-600">{roleLabels[role] || role}</span>
                                    </span>
                                </div>
                                <div className="px-3 py-[7px] text-[11px] text-slate-500 border-r border-slate-100 truncate">
                                    {penugasan.length > 0 ? penugasan.join(' · ') : <span className="text-slate-300">—</span>}
                                </div>
                                <div className="px-2 py-[7px] flex items-center justify-center gap-0.5" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => navigate(`/users/${u.id}/edit`)}
                                        className="w-5 h-5 text-slate-300 hover:text-blue-500 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100">
                                        <Edit2 size={11} />
                                    </button>
                                    <button onClick={() => setDeleteTarget(u)}
                                        className="w-5 h-5 text-slate-300 hover:text-red-500 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100">
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}</div>
                )}
            </div>

            {/* ── Status bar ──────────────────────────────────── */}
            <div className="h-7 border-t border-slate-200 bg-slate-50/80 flex items-center px-3 shrink-0">
                <span className="text-[10px] text-slate-400">{users.length} pengguna</span>
            </div>

            {/* ── Delete Modal ─────────────────────────────────── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-slate-900">Hapus Pengguna?</h3>
                            <p className="text-sm text-slate-500 mt-1">Data <strong>"{deleteTarget.name}"</strong> akan dihapus permanen.</p>
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
