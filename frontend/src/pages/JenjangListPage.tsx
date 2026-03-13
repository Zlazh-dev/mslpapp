import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Jenjang } from '../types';
import { useAuthStore } from '../stores/authStore';
import { Plus, Pencil, Trash2, ChevronRight } from 'lucide-react';

export default function JenjangListPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const canEdit = user && ['ADMIN', 'STAF_MADRASAH'].includes(user.role);

    const [data, setData] = useState<Jenjang[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Jenjang | null>(null);
    const [nama, setNama] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Jenjang | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try { const r = await api.get('/jenjang'); setData(r.data.data); } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const openCreate = () => { setEditing(null); setNama(''); setShowForm(true); };
    const openEdit = (j: Jenjang) => { setEditing(j); setNama(j.nama); setShowForm(true); };

    const handleSave = async () => {
        if (!nama.trim()) return;
        setSaving(true);
        try {
            if (editing) await api.patch(`/jenjang/${editing.id}`, { nama });
            else await api.post('/jenjang', { nama });
            setShowForm(false);
            fetchData();
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        await api.delete(`/jenjang/${deleteTarget.id}`);
        setDeleteTarget(null);
        fetchData();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-gray-900">Manajemen Jenjang</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Kelola jenjang pendidikan (MTs, MA, dll.)</p>
                </div>
                {canEdit && (
                    <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition">
                        <Plus size={14} /> Tambah Jenjang
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">No</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">Nama Jenjang</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">Jumlah Tingkat</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i} className="animate-pulse">{[1, 2, 3, 4].map(j => <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 rounded" /></td>)}</tr>
                        )) : data.length === 0 ? (
                            <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-400">Belum ada data jenjang</td></tr>
                        ) : data.map((j, i) => (
                            <tr key={j.id} className="hover:bg-gray-50 transition group">
                                <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                <td className="px-4 py-3">
                                    <button onClick={() => navigate(`/kelas-management/tingkat?jenjangId=${j.id}&jenjangNama=${j.nama}`)}
                                        className="text-sm font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 transition">
                                        {j.nama} <ChevronRight size={14} />
                                    </button>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                                        {j.tingkats?.length ?? 0} Tingkat
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                        {canEdit && (<>
                                            <button onClick={() => openEdit(j)} className="w-7 h-7 bg-gray-100 hover:bg-blue-100 hover:text-blue-600 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100"><Pencil size={13} /></button>
                                            <button onClick={() => setDeleteTarget(j)} className="w-7 h-7 bg-gray-100 hover:bg-red-100 hover:text-red-500 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100"><Trash2 size={13} /></button>
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
                        <h3 className="text-base font-bold text-gray-900">{editing ? 'Edit Jenjang' : 'Tambah Jenjang'}</h3>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Nama Jenjang</label>
                            <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Contoh: MTs"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                            <button onClick={handleSave} disabled={saving || !nama.trim()} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50">
                                {saving ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-bold text-gray-900">Hapus Jenjang?</h3>
                        <p className="text-sm text-gray-500">Menghapus <strong>"{deleteTarget.nama}"</strong> akan menghapus semua Tingkat dan Kelas di dalamnya.</p>
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
