import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { User } from '../types';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { Plus, Edit2, Trash2, UserCheck } from 'lucide-react';

const roleLabels: Record<string, string> = {
    ADMIN: 'Administrator',
    STAF_PENDATAAN: 'Staf Pendataan',
    STAF_MADRASAH: 'Staf Madrasah',
    PEMBIMBING_KAMAR: 'Pembimbing Kamar',
    WALI_KELAS: 'Wali Kelas',
};
const roleColors: Record<string, 'danger' | 'info' | 'warning' | 'success' | 'gray'> = {
    ADMIN: 'danger', STAF_PENDATAAN: 'info', STAF_MADRASAH: 'warning', PEMBIMBING_KAMAR: 'success', WALI_KELAS: 'gray',
};

export default function UserListPage() {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        api.get('/users').then(r => setUsers(r.data.data)).finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const handleDelete = async () => {
        if (!deleteId) return;
        await api.delete(`/users/${deleteId}`);
        setDeleteId(null); fetch();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pengguna</h1>
                    <p className="text-gray-500 text-sm mt-1">Kelola akun pengguna sistem</p>
                </div>
                <Link to="/users/baru" className="btn-primary flex items-center gap-2"><Plus size={16} /> Tambah Pengguna</Link>
            </div>
            <div className="card">
                <div className="table-wrapper">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nama</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Username</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Penugasan</th>
                                <th className="text-right px-4 py-3 font-semibold text-gray-600">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">Memuat...</td></tr>
                                : users.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-400">Belum ada pengguna</td></tr>
                                    : users.map(u => (
                                        <tr key={u.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <span className="text-primary-700 text-sm font-bold">{u.name.charAt(0)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-900 block">{u.name}</span>
                                                        {(u as any).santri && <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded shadow-sm border border-emerald-100 inline-block mt-0.5">Terkait Santri</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                                                {u.username || <span className="text-gray-400 italic">NIS: {(u as any).santri?.nis}</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={roleColors[u.role] || 'gray'}>{roleLabels[u.role] || u.role}</Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-xs text-gray-500 mt-0.5 space-y-0.5">
                                                    {u.kelasWali && u.kelasWali.length > 0 && <span>Kelas: {u.kelasWali.map(k => k.nama).join(', ')}</span>}
                                                    {u.kamarBimbing && <span> Kamar: {u.kamarBimbing.nama}</span>}
                                                    {(!u.kelasWali || u.kelasWali.length === 0) && !u.kamarBimbing && '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => navigate(`/users/${u.id}/edit`)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500"><Edit2 size={14} /></button>
                                                    <button onClick={() => setDeleteId(u.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Pengguna" size="sm">
                <p className="text-gray-600 text-sm">Apakah Anda yakin ingin menghapus pengguna ini?</p>
                <div className="flex gap-3 mt-6">
                    <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Batal</button>
                    <button onClick={handleDelete} className="btn-danger flex-1">Hapus</button>
                </div>
            </Modal>
        </div>
    );
}
