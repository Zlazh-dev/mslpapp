import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Kamar, Gedung } from '../types';
import { useAuthStore } from '../stores/authStore';
import { Plus, Pencil, Trash2, ArrowLeft, ChevronRight, Users } from 'lucide-react';

export default function KamarListPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const gedungId = searchParams.get('gedungId');
    const gedungNama = searchParams.get('gedungNama') || 'Gedung';
    const kompleksNama = searchParams.get('kompleksNama') || '';
    const canEdit = user && ['ADMIN', 'STAF_PENDATAAN'].includes(user.roles?.[0]);

    const [data, setData] = useState<Kamar[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Kamar | null>(null);
    const [formNama, setFormNama] = useState('');
    const [formKapasitas, setFormKapasitas] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Kamar | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = gedungId ? { gedungId } : {};
            const r = await api.get('/kamar', { params });
            setData(r.data.data);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [gedungId]);

    const openCreate = () => { setEditing(null); setFormNama(''); setFormKapasitas(''); setShowForm(true); };
    const openEdit = (k: Kamar) => { setEditing(k); setFormNama(k.nama); setFormKapasitas(k.kapasitas?.toString() || ''); setShowForm(true); };

    const handleSave = async () => {
        if (!formNama.trim()) return;
        setSaving(true);
        try {
            const body: any = { nama: formNama };
            if (formKapasitas) body.kapasitas = parseInt(formKapasitas);
            if (editing) await api.patch(`/kamar/${editing.id}`, body);
            else await api.post('/kamar', { ...body, gedungId: parseInt(gedungId!) });
            setShowForm(false);
            fetchData();
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        await api.delete(`/kamar/${deleteTarget.id}`);
        setDeleteTarget(null);
        fetchData();
    };

    const backUrl = gedungId && kompleksNama
        ? `/kamar-management/gedung?kompleksId=${data[0]?.gedung?.kompleksId ?? ''}&kompleksNama=${kompleksNama}`
        : '/kamar-management/kompleks';

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(backUrl)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg flex items-center justify-center transition">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
                            {kompleksNama && <><span>{kompleksNama}</span><ChevronRight size={10} /></>}
                            <span className="text-gray-600 font-medium">{gedungNama}</span>
                        </div>
                        <h1 className="text-lg font-bold text-gray-900">Daftar Kamar</h1>
                    </div>
                </div>
                {canEdit && gedungId && (
                    <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition">
                        <Plus size={14} /> Tambah Kamar
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">No</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">Nama Kamar</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">Lokasi</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">Kapasitas</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">Terisi</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? Array.from({ length: 4 }).map((_, i) => (
                            <tr key={i} className="animate-pulse">{[1, 2, 3, 4, 5, 6].map(j => <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 rounded" /></td>)}</tr>
                        )) : data.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">Belum ada kamar di gedung ini</td></tr>
                        ) : data.map((k, i) => {
                            const terisi = k._count?.santris ?? 0;
                            const kap = k.kapasitas ?? 0;
                            const pct = kap > 0 ? Math.round((terisi / kap) * 100) : 0;
                            return (
                                <tr key={k.id} className="hover:bg-gray-50 transition group">
                                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">{k.nama}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {k.gedung?.kompleks?.nama} › {k.gedung?.nama}
                                    </td>
                                    <td className="px-4 py-3">
                                        {kap > 0 ? <span className="text-xs font-medium text-gray-700">{kap} orang</span>
                                            : <span className="text-xs text-gray-300">—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[50px]">
                                                <div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-yellow-400' : 'bg-emerald-500'}`}
                                                    style={{ width: `${Math.min(pct, 100)}%` }} />
                                            </div>
                                            <span className="text-[10px] text-gray-500 flex items-center gap-0.5"><Users size={10} />{terisi}{kap > 0 ? `/${kap}` : ''}</span>
                                        </div>
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
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
                    <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-bold text-gray-900">{editing ? 'Edit Kamar' : 'Tambah Kamar'}</h3>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Nama Kamar</label>
                            <input value={formNama} onChange={e => setFormNama(e.target.value)} placeholder="Contoh: Kamar 101"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Kapasitas (opsional)</label>
                            <input type="number" min="1" value={formKapasitas} onChange={e => setFormKapasitas(e.target.value)} placeholder="Contoh: 6"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                            <button onClick={handleSave} disabled={saving || !formNama.trim()} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50">
                                {saving ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-bold text-gray-900">Hapus Kamar?</h3>
                        <p className="text-sm text-gray-500">Hapus kamar <strong>"{deleteTarget.nama}"</strong>? Santri di kamar ini tidak akan terhapus.</p>
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
