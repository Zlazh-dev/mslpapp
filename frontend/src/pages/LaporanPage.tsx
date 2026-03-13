import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Kelas } from '../types';
import { Download, FileText } from 'lucide-react';

export default function LaporanPage() {
    const [type, setType] = useState<'santri' | 'nilai'>('santri');
    const [kelas, setKelas] = useState<Kelas[]>([]);
    const [filter, setFilter] = useState({ kelasId: '', semester: '', status: '' });
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        api.get('/kelas').then(r => setKelas(r.data.data));
    }, []);

    const handleSearch = async () => {
        setLoading(true);
        try {
            const params: any = { ...filter };
            Object.keys(params).forEach(k => !params[k] && delete params[k]);
            const res = await api.get(`/laporan/${type}`, { params });
            setData(res.data.data); setTotal(res.data.meta?.total || res.data.data.length);
        } finally { setLoading(false); }
    };

    const exportExcel = async () => {
        const XLSX = await import('xlsx');
        const ws = XLSX.utils.json_to_sheet(data.map((item: any) => {
            if (type === 'santri') return { NIS: item.nis, Nama: item.name, Gender: item.gender, Kelas: item.kelas?.name, Kamar: item.kamar?.name, Status: item.status };
            return { Santri: item.santri?.name, Kelas: item.kelas?.name, 'Mata Pelajaran': item.mataPelajaran, Semester: item.semester, 'Nilai Harian': item.nilaiHarian, UTS: item.nilaiUTS, UAS: item.nilaiUAS };
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
        XLSX.writeFile(wb, `laporan_${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const typeLabels = { santri: 'Santri', nilai: 'Nilai' };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
                    <p className="text-gray-500 text-sm mt-1">Generate dan ekspor laporan data</p>
                </div>
                {data.length > 0 && (
                    <button onClick={exportExcel} className="btn-primary flex items-center gap-2">
                        <Download size={16} /> Export Excel
                    </button>
                )}
            </div>

            <div className="card space-y-4">
                <div className="flex gap-2 flex-wrap">
                    {(['santri', 'nilai'] as const).map(t => (
                        <button key={t} onClick={() => { setType(t); setData([]); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${type === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            Laporan {typeLabels[t]}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {type === 'santri' && (
                        <>
                            <select className="form-input" value={filter.kelasId} onChange={e => setFilter(p => ({ ...p, kelasId: e.target.value }))}>
                                <option value="">Semua Kelas</option>
                                {kelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                            <select className="form-input" value={filter.status} onChange={e => setFilter(p => ({ ...p, status: e.target.value }))}>
                                <option value="">Semua Status</option>
                                <option value="ACTIVE">Aktif</option>
                                <option value="INACTIVE">Tidak Aktif</option>
                            </select>
                        </>
                    )}
                    {type === 'nilai' && (
                        <>
                            <select className="form-input" value={filter.kelasId} onChange={e => setFilter(p => ({ ...p, kelasId: e.target.value }))}>
                                <option value="">Semua Kelas</option>
                                {kelas.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                            <select className="form-input" value={filter.semester} onChange={e => setFilter(p => ({ ...p, semester: e.target.value }))}>
                                <option value="">Semua Semester</option>
                                <option value="Ganjil 2024/2025">Ganjil 2024/2025</option>
                                <option value="Genap 2024/2025">Genap 2024/2025</option>
                            </select>
                        </>
                    )}
                    <button onClick={handleSearch} className="btn-primary">Tampilkan</button>
                </div>

                {data.length > 0 && (
                    <div className="p-3 bg-primary-50 rounded-xl text-primary-700 text-sm flex items-center gap-2">
                        <FileText size={16} />
                        Menampilkan <strong>{total}</strong> data laporan {typeLabels[type]}
                    </div>
                )}
            </div>

            {data.length > 0 && (
                <div className="table-wrapper">
                    <table className="w-full text-sm bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                {type === 'santri' && ['NIS', 'Nama', 'Jenis Kelamin', 'Kelas', 'Kamar', 'Status'].map(h => <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>)}
                                {type === 'nilai' && ['Santri', 'Kelas', 'Mata Pelajaran', 'Semester', 'Harian', 'UTS', 'UAS'].map(h => <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    {type === 'santri' && <>
                                        <td className="px-4 py-3 font-mono text-xs">{item.nis}</td>
                                        <td className="px-4 py-3 font-medium">{item.name}</td>
                                        <td className="px-4 py-3 text-gray-600">{item.gender === 'LAKI_LAKI' ? 'L' : 'P'}</td>
                                        <td className="px-4 py-3 text-gray-600">{item.kelas?.name || '-'}</td>
                                        <td className="px-4 py-3 text-gray-600">{item.kamar?.name || '-'}</td>
                                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{item.status}</span></td>
                                    </>}
                                    {type === 'nilai' && <>
                                        <td className="px-4 py-3 font-medium">{item.santri?.name}</td>
                                        <td className="px-4 py-3 text-gray-600">{item.kelas?.name}</td>
                                        <td className="px-4 py-3">{item.mataPelajaran}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{item.semester}</td>
                                        <td className="px-4 py-3 text-center">{item.nilaiHarian ?? '-'}</td>
                                        <td className="px-4 py-3 text-center">{item.nilaiUTS ?? '-'}</td>
                                        <td className="px-4 py-3 text-center">{item.nilaiUAS ?? '-'}</td>
                                    </>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
