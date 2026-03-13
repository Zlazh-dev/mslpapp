import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Tingkat } from '../types';
import { useAuthStore } from '../stores/authStore';
import { Plus, Pencil, Trash2, ChevronRight, ArrowLeft } from 'lucide-react';

export default function TingkatListPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const jenjangId = searchParams.get('jenjangId');
    const jenjangNama = searchParams.get('jenjangNama') || 'Jenjang';
    const canEdit = user && ['ADMIN', 'STAF_MADRASAH'].includes(user.role);

    const [data, setData] = useState<Tingkat[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Tingkat | null>(null);
    const [nama, setNama] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Tingkat | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = jenjangId ? { jenjangId } : {};
            const r = await api.get('/tingkat', { params });
            setData(r.data.data);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [jenjangId]);

    const openCreate = () => { setEditing(null); setNama(''); setShowForm(true); };
    const openEdit = (t: Tingkat) => { setEditing(t); setNama(t.nama); setShowForm(true); };

    const handleSave = async () => {
        if (!nama.trim()) return;
        setSaving(true);
        try {
            if (editing) await api.patch(`/tingkat/${editing.id}`, { nama });
            else await api.post('/tingkat', { nama, jenjangId: parseInt(jenjangId!) });
            setShowForm(false);
            fetchData();
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        await api.delete(`/tingkat/${deleteTarget.id}`);
        setDeleteTarget(null);
        fetchData();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/kelas-management/jenjang')} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg flex items-center justify-center transition">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
                            <span>Jenjang</span><ChevronRight size={10} /><span className="text-gray-600 font-medium">{jenjangNama}</span>
                        </div>
                        <h1 className="text-lg font-bold text-gray-900">Daftar Tingkat</h1>
                    </div>
                </div>
                {canEdit && jenjangId && (
                    <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition">
                        <Plus size={14} /> Tambah Tingkat
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">No</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">Nama Tingkat</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">Jenjang</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">Jumlah Kelas</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i} className="animate-pulse">{[1, 2, 3, 4, 5].map(j => <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 rounded" /></td>)}</tr>
                        )) : data.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">Belum ada tingkat di jenjang ini</td></tr>
                        ) : data.map((t, i) => (
                            <tr key={t.id} className="hover:bg-gray-50 transition group">
                                <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                <td className="px-4 py-3">
                                    <button onClick={() => navigate(`/kelas-management/kelas?tingkatId=${t.id}&tingkatNama=${t.nama}&jenjangNama=${jenjangNama}`)}
                                        className="text-sm font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 transition">
                                        {t.nama} <ChevronRight size={14} />
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500">{t.jenjang?.nama || jenjangNama}</td>
                                <td className="px-4 py-3">
                                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                                        {t.kelas?.length ?? 0} Kelas
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                        {canEdit && (<>
                                            <button onClick={() => openEdit(t)} className="w-7 h-7 bg-gray-100 hover:bg-blue-100 hover:text-blue-600 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100"><Pencil size={13} /></button>
                                            <button onClick={() => setDeleteTarget(t)} className="w-7 h-7 bg-gray-100 hover:bg-red-100 hover:text-red-500 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100"><Trash2 size={13} /></button>
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
                        <h3 className="text-base font-bold text-gray-900">{editing ? 'Edit Tingkat' : 'Tambah Tingkat'}</h3>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Nama Tingkat</label>
                            <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Contoh: Kelas VII"
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
                        <h3 className="text-base font-bold text-gray-900">Hapus Tingkat?</h3>
                        <p className="text-sm text-gray-500">Menghapus <strong>"{deleteTarget.nama}"</strong> akan menghapus semua Kelas di dalamnya.</p>
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
