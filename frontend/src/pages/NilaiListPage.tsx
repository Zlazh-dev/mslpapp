import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Nilai } from '../types';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';

export default function NilaiListPage() {
    const navigate = useNavigate();
    const [nilai, setNilai] = useState<Nilai[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [semester, setSemester] = useState('');

    const fetch = useCallback(async () => {
        setLoading(true);
        const params: any = {};
        if (semester) params.semester = semester;
        api.get('/nilai', { params }).then(r => setNilai(r.data.data)).finally(() => setLoading(false));
    }, [semester]);

    useEffect(() => { fetch(); }, [fetch]);

    const handleDelete = async () => {
        if (!deleteId) return;
        await api.delete(`/nilai/${deleteId}`);
        setDeleteId(null); fetch();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Nilai Santri</h1>
                    <p className="text-gray-500 text-sm mt-1">Kelola nilai akademik santri</p>
                </div>
                <Link to="/nilai/baru" className="btn-primary flex items-center gap-2"><Plus size={16} /> Input Nilai</Link>
            </div>

            <div className="card">
                <div className="flex gap-3 mb-4">
                    <select className="form-input w-48" value={semester} onChange={e => setSemester(e.target.value)}>
                        <option value="">Semua Semester</option>
                        <option value="Ganjil 2024/2025">Ganjil 2024/2025</option>
                        <option value="Genap 2024/2025">Genap 2024/2025</option>
                    </select>
                </div>
                <div className="table-wrapper">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Santri</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Kelas</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Mata Pelajaran</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Semester</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Harian</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">UTS</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">UAS</th>
                                <th className="text-right px-4 py-3 font-semibold text-gray-600">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">Memuat...</td></tr>
                                : nilai.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-400">Belum ada data nilai</td></tr>
                                    : nilai.map(n => (
                                        <tr key={n.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{n.santri?.namaLengkap}</td>
                                            <td className="px-4 py-3 text-gray-600">{n.kelas?.nama}</td>
                                            <td className="px-4 py-3 text-gray-700">{n.mataPelajaran}</td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">{n.semester}</td>
                                            <td className="px-4 py-3 text-center font-mono">{n.nilaiHarian ?? '-'}</td>
                                            <td className="px-4 py-3 text-center font-mono">{n.nilaiUTS ?? '-'}</td>
                                            <td className="px-4 py-3 text-center font-mono">{n.nilaiUAS ?? '-'}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => navigate(`/nilai/${n.id}/edit`)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500"><Edit2 size={14} /></button>
                                                    <button onClick={() => setDeleteId(n.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Nilai" size="sm">
                <p className="text-gray-600 text-sm">Apakah Anda yakin ingin menghapus data nilai ini?</p>
                <div className="flex gap-3 mt-6">
                    <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Batal</button>
                    <button onClick={handleDelete} className="btn-danger flex-1">Hapus</button>
                </div>
            </Modal>
        </div>
    );
}
