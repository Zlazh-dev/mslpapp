import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { User, Kelas, Kamar } from '../types';
import { Plus, Edit2, Trash2, X, ShieldCheck, UserPlus } from 'lucide-react';

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
const roleOptions: { value: string; label: string }[] = [
    { value: 'ADMIN', label: 'Administrator' },
    { value: 'STAF_PENDATAAN', label: 'Staf Pendataan' },
    { value: 'STAF_MADRASAH', label: 'Staf Madrasah' },
    { value: 'PEMBIMBING_KAMAR', label: 'Pembimbing Kamar' },
    { value: 'WALI_KELAS', label: 'Wali Kelas' },
];

interface FormState {
    name: string;
    username: string;
    password: string;
    roles: string[];
    kelasId: string;
    kamarId: string;
    santriNis: string;
}
const emptyForm = (defaultRole = 'STAF_PENDATAAN'): FormState => ({
    name: '', username: '', password: '', roles: [defaultRole],
    kelasId: '', kamarId: '', santriNis: '',
});

export default function UserListPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
    const [deleting, setDeleting] = useState(false);

    // ── Sidebar state ──
    const [showPanel, setShowPanel] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm());
    const [linkedSantri, setLinkedSantri] = useState<any>(null);
    const [kelas, setKelas] = useState<Kelas[]>([]);
    const [kamar, setKamar] = useState<Kamar[]>([]);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        api.get('/users').then(r => setUsers(r.data.data)).finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // ── Panel helpers ──
    const openAddPanel = (defaultRole?: string) => {
        setEditingUser(null); setLinkedSantri(null);
        setForm(emptyForm(defaultRole || 'STAF_PENDATAAN'));
        setFormError('');
        api.get('/kelas').then(r => setKelas(r.data.data));
        api.get('/kamar').then(r => setKamar(r.data.data));
        setShowPanel(true);
    };

    const openEditPanel = async (u: User) => {
        setEditingUser(u);
        setFormError('');
        api.get('/kelas').then(r => setKelas(r.data.data));
        api.get('/kamar').then(r => setKamar(r.data.data));
        const { data } = await api.get(`/users/${u.id}`);
        const d = data.data;
        if (d.santri) setLinkedSantri(d.santri); else setLinkedSantri(null);
        setForm({
            name: d.name || '', username: d.username || '', password: '',
            roles: d.roles?.length ? d.roles : ['STAF_PENDATAAN'],
            kelasId: String(d.kelasWali?.[0]?.id || ''),
            kamarId: String(d.kamarBimbing?.id || ''),
            santriNis: d.santri?.nis || '',
        });
        setShowPanel(true);
    };

    const closePanel = () => { setShowPanel(false); setEditingUser(null); setLinkedSantri(null); setFormError(''); };

    const handleSave = async () => {
        if (!form.name.trim()) { setFormError('Nama wajib diisi'); return; }
        if (!form.username?.trim() && !linkedSantri) { setFormError('Username wajib diisi jika tidak terhubung Santri'); return; }
        if (form.roles.length === 0) { setFormError('Pilih minimal satu role'); return; }
        if (!editingUser && form.password.length < 6) { setFormError('Password minimal 6 karakter'); return; }

        setSaving(true); setFormError('');
        try {
            const payload: any = {
                ...form,
                kelasId: form.kelasId || undefined,
                kamarId: form.kamarId || undefined,
                santriNis: form.santriNis?.trim() || undefined,
            };
            if (!payload.username?.trim()) payload.username = '';
            if (!payload.password) delete payload.password;
            if (editingUser) await api.put(`/users/${editingUser.id}`, payload);
            else await api.post('/users', payload);
            closePanel(); fetchUsers();
        } catch (err: any) { setFormError(err.response?.data?.message || 'Gagal menyimpan'); }
        finally { setSaving(false); }
    };

    const toggleRole = (role: string) => {
        setForm(prev => ({
            ...prev,
            roles: prev.roles.includes(role)
                ? prev.roles.filter(r => r !== role)
                : [...prev.roles, role],
        }));
    };

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
                <button onClick={() => openAddPanel()}
                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition shrink-0">
                    <Plus size={12} /> Tambah
                </button>
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
                                    <button onClick={() => openEditPanel(u)}
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

            {/* ═══ Slide-in Panel: Tambah / Edit User ═════════════════ */}
            {showPanel && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] z-40" onClick={closePanel} />}
            <div className={`fixed top-0 right-0 h-full w-full sm:w-[380px] bg-white shadow-2xl z-50 transform transition-transform duration-300 border-l border-slate-200 flex flex-col ${showPanel ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between shrink-0">
                    <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <UserPlus size={14} className="text-emerald-500" />
                        {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna'}
                    </h2>
                    <button onClick={closePanel} className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition"><X size={14} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {formError && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-[11px]">{formError}</div>}

                    {/* Name */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Nama Lengkap *</label>
                        <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ahmad Fauzi"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:border-emerald-400 outline-none" />
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Username <span className="normal-case text-slate-400 font-normal">(opsional jika terhubung Santri)</span></label>
                        <input type="text" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="ahmadFauzi"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:border-emerald-400 outline-none" />
                    </div>

                    {linkedSantri && (
                        <div className="px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Terhubung Santri</p>
                            <p className="text-xs font-mono text-emerald-700">{linkedSantri.nis}</p>
                        </div>
                    )}

                    {/* Password */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                            {editingUser ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'}
                        </label>
                        <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                            placeholder={editingUser ? '••••••••' : 'Minimal 6 karakter'}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:border-emerald-400 outline-none" />
                    </div>

                    {/* Roles */}
                    <div>
                        <div className="flex items-center gap-1.5 mb-2">
                            <ShieldCheck size={12} className="text-emerald-500" />
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role *</label>
                        </div>
                        <div className="space-y-1">
                            {roleOptions.map(r => (
                                <label key={r.value} className={`flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer transition ${form.roles.includes(r.value) ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'}`}>
                                    <input type="checkbox" checked={form.roles.includes(r.value)} onChange={() => toggleRole(r.value)}
                                        className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-400 w-3.5 h-3.5" />
                                    <span className={`text-xs font-medium ${form.roles.includes(r.value) ? 'text-emerald-700' : 'text-slate-600'}`}>{r.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Wali Kelas → Kelas */}
                    {form.roles.includes('WALI_KELAS') && (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Kelas yang diasuh</label>
                            <select value={form.kelasId} onChange={e => setForm(p => ({ ...p, kelasId: e.target.value }))}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:border-emerald-400 outline-none">
                                <option value="">-- Pilih Kelas --</option>
                                {kelas.map(k => <option key={k.id} value={k.id}>{[k.tingkat?.jenjang?.nama, k.tingkat?.nama, k.nama].filter(Boolean).join(' ')}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Pembimbing Kamar → Kamar */}
                    {form.roles.includes('PEMBIMBING_KAMAR') && (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Kamar yang dibimbing</label>
                            <select value={form.kamarId} onChange={e => setForm(p => ({ ...p, kamarId: e.target.value }))}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:border-emerald-400 outline-none">
                                <option value="">-- Pilih Kamar --</option>
                                {kamar.map(k => <option key={k.id} value={k.id}>{k.gedung?.nama} — {k.nama}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Link Santri */}
                    {!linkedSantri && (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Tautkan ke Santri <span className="normal-case text-slate-400 font-normal">(opsional)</span></label>
                            <input type="text" value={form.santriNis} onChange={e => setForm(p => ({ ...p, santriNis: e.target.value }))}
                                placeholder="Masukkan NIS..."
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:border-emerald-400 outline-none" />
                        </div>
                    )}
                </div>
                <div className="p-3 border-t border-slate-200 flex gap-2 shrink-0">
                    <button onClick={closePanel} className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition">Batal</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 py-2 rounded-lg bg-emerald-500 text-xs font-semibold text-white hover:bg-emerald-600 transition disabled:opacity-50">
                        {saving ? 'Menyimpan...' : (editingUser ? 'Perbarui' : 'Simpan')}
                    </button>
                </div>
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
