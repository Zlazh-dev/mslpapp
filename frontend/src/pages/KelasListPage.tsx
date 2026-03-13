import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Kelas, User } from '../types';
import { useAuthStore } from '../stores/authStore';
import { Plus, Pencil, Trash2, ArrowLeft, ChevronRight, Users } from 'lucide-react';

export default function KelasListPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tingkatId = searchParams.get('tingkatId');
    const tingkatNama = searchParams.get('tingkatNama') || 'Tingkat';
    const jenjangNama = searchParams.get('jenjangNama') || '';
    const canEdit = user && ['ADMIN', 'STAF_MADRASAH'].includes(user.role);

    const [data, setData] = useState<Kelas[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Kelas | null>(null);
    const [formNama, setFormNama] = useState('');
    const [formTahun, setFormTahun] = useState('');
    const [formWali, setFormWali] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Kelas | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = tingkatId ? { tingkatId } : {};
            const [r, ru] = await Promise.all([
                api.get('/kelas', { params }),
                api.get('/users', { params: { limit: 100 } }),
            ]);
            setData(r.data.data);
            setUsers((ru.data.data as User[]).filter(u => u.role === 'WALI_KELAS'));
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [tingkatId]);

    const openCreate = () => { setEditing(null); setFormNama(''); setFormTahun(''); setFormWali(''); setShowForm(true); };
    const openEdit = (k: Kelas) => {
        setEditing(k); setFormNama(k.nama); setFormTahun(k.tahunAjaran || '');
        setFormWali(k.waliKelasId || ''); setShowForm(true);
    };

    const handleSave = async () => {
        if (!formNama.trim()) return;
        setSaving(true);
        try {
            const body: any = { nama: formNama, tahunAjaran: formTahun || undefined, waliKelasId: formWali || null };
            if (editing) await api.patch(`/kelas/${editing.id}`, body);
            else await api.post('/kelas', { ...body, tingkatId: parseInt(tingkatId!) });
            setShowForm(false);
            fetchData();
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        await api.delete(`/kelas/${deleteTarget.id}`);
        setDeleteTarget(null);
        fetchData();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(`/kelas-management/tingkat?jenjangId=${data[0]?.tingkat?.jenjangId ?? ''}&jenjangNama=${jenjangNama}`)}
                        className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg flex items-center justify-center transition">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
                            {jenjangNama && <><span>{jenjangNama}</span><ChevronRight size={10} /></>}
                            <span className="text-gray-600 font-medium">{tingkatNama}</span>
                        </div>
                        <h1 className="text-lg font-bold text-gray-900">Daftar Kelas</h1>
                    </div>
                </div>
                {canEdit && tingkatId && (
                    <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition">
                        <Plus size={14} /> Tambah Kelas
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">No</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">Nama Kelas</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">Tingkat / Jenjang</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">Tahun Ajaran</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">Wali Kelas</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">Santri</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? Array.from({ length: 4 }).map((_, i) => (
                            <tr key={i} className="animate-pulse">{[1, 2, 3, 4, 5, 6, 7].map(j => <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 rounded" /></td>)}</tr>
                        )) : data.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">Belum ada kelas di tingkat ini</td></tr>
                        ) : data.map((k, i) => (
                            <tr key={k.id} className="hover:bg-gray-50 transition group">
                                <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-gray-800">{k.nama}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">
                                    {k.tingkat?.jenjang?.nama} › {k.tingkat?.nama}
                                </td>
                                <td className="px-4 py-3">
                                    {k.tahunAjaran ? <span className="text-xs text-gray-600">{k.tahunAjaran}</span>
                                        : <span className="text-xs text-gray-300">—</span>}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-600">{k.waliKelas?.name || <span className="text-gray-300">—</span>}</td>
                                <td className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                                        <Users size={11} />{k._count?.santris ?? 0}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                        {canEdit && (<>
                                            <button onClick={() => openEdit(k)} className="w-7 h-7 bg-gray-100 hover:bg-blue-100 hover:text-blue-600 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100"><Pencil size={13} /></button>
                                            <button onClick={() => setDeleteTarget(k)} className="w-7 h-7 bg-gray-100 hover:bg-red-100 hover:text-red-500 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100"><Trash2 size={13} /></button>
                                        </>)}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
                    <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-bold text-gray-900">{editing ? 'Edit Kelas' : 'Tambah Kelas'}</h3>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Nama Kelas</label>
                            <input value={formNama} onChange={e => setFormNama(e.target.value)} placeholder="Contoh: VII-A"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Tahun Ajaran</label>
                            <input value={formTahun} onChange={e => setFormTahun(e.target.value)} placeholder="Contoh: 2024/2025"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Wali Kelas</label>
                            <select value={formWali} onChange={e => setFormWali(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white">
                                <option value="">— Tanpa Wali Kelas —</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                            <button onClick={handleSave} disabled={saving || !formNama.trim()} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50">
                                {saving ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-bold text-gray-900">Hapus Kelas?</h3>
                        <p className="text-sm text-gray-500">Hapus kelas <strong>"{deleteTarget.nama}"</strong>? Santri di kelas ini tidak akan terhapus.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                            <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition">Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
