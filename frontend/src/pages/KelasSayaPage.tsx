import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Santri, Kelas } from '../types';
import { Search, GraduationCap, Eye, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';

const LIMIT = 15;
const GENDER_LABEL: Record<string, string> = { L: 'Putra', P: 'Putri' };

function fmt(date?: string | null) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function KelasSayaPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const canEdit = user && ['ADMIN', 'STAF_PENDATAAN'].includes(user.roles?.[0]);

    const [kelas, setKelas] = useState<Kelas | null>(null);
    const [loadingKelas, setLoadingKelas] = useState(true);
    const [noKelas, setNoKelas] = useState(false);

    const [data, setData] = useState<Santri[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const searchRef = useRef<ReturnType<typeof setTimeout>>();

    const totalPages = Math.ceil(total / LIMIT);
    const startIndex = (page - 1) * LIMIT;

    // Fetch my kelas
    useEffect(() => {
        if (!user) return;
        setLoadingKelas(true);
        api.get('/kelas')
            .then(r => {
                const list: Kelas[] = r.data?.data ?? r.data ?? [];
                const mine = list.find((k: any) => k.waliKelasId === user.id);
                if (mine) { setKelas(mine); }
                else { setNoKelas(true); }
            })
            .finally(() => setLoadingKelas(false));
    }, [user]);

    // Fetch santri in that kelas
    useEffect(() => {
        if (!kelas) return;
        clearTimeout(searchRef.current);
        searchRef.current = setTimeout(() => {
            setLoading(true);
            api.get('/santri', { params: { kelasId: kelas.id, search: search || undefined, page, limit: LIMIT } })
                .then(r => { setData(r.data.data ?? []); setTotal(r.data.meta?.total ?? 0); })
                .finally(() => setLoading(false));
        }, 300);
    }, [kelas, search, page]);

    if (loadingKelas) return (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            <svg className="animate-spin h-5 w-5 mr-2 text-blue-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Memuat kelas Anda...
        </div>
    );

    if (noKelas) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                <GraduationCap size={24} className="text-blue-400" />
            </div>
            <p className="text-sm text-gray-500 text-center">Anda belum ditugaskan sebagai wali kelas di kelas manapun.</p>
            <p className="text-xs text-gray-400">Hubungi administrator untuk penugasan kelas.</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Info Card */}
            {kelas && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <GraduationCap size={18} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Kelas Saya</p>
                            <h1 className="text-lg font-bold text-gray-900">{kelas.nama}</h1>
                            {kelas.tingkat && (
                                <p className="text-xs text-gray-400">{kelas.tingkat.jenjang?.nama} › {kelas.tingkat.nama}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold text-blue-600">{total}</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Siswa</p>
                        </div>
                        {kelas.tahunAjaran && (
                            <div>
                                <p className="text-sm font-bold text-gray-500">{kelas.tahunAjaran}</p>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Tahun Ajaran</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Santri Table */}
            <div className="bg-white rounded-xl border border-gray-200">
                {/* Search Header */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-gray-700">Daftar Siswa</h2>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Cari nama / NIS..."
                            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-48"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/60">
                                <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-8">No</th>
                                <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">NIS</th>
                                <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama</th>
                                <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kamar</th>
                                <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Masuk</th>
                                <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gender</th>
                                <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">Memuat data...</td></tr>
                            ) : data.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">Belum ada siswa di kelas ini</td></tr>
                            ) : data.map((s, idx) => (
                                <tr key={s.id} onClick={() => navigate(`/santri/${s.id}`)} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/80 cursor-pointer transition group">
                                    <td className="px-4 py-2.5">
                                        <span className="text-[11px] text-gray-400">{startIndex + idx + 1}</span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="text-xs font-mono font-medium text-gray-700">{s.nis}</span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <p className="text-xs font-semibold text-gray-900 group-hover:text-blue-700 transition truncate max-w-[200px]">{s.namaLengkap}</p>
                                        {s.tempatLahir && s.tanggalLahir && (
                                            <p className="text-[10px] text-gray-400 mt-0.5">{s.tempatLahir}, {fmt(s.tanggalLahir)}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="text-xs text-gray-600">{s.kamar?.nama || <span className="text-gray-300">—</span>}</span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="text-xs text-gray-500">{fmt(s.tanggalMasuk)}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${s.gender === 'L' ? 'bg-sky-100 text-sky-700' : 'bg-pink-100 text-pink-700'}`}>
                                            {GENDER_LABEL[s.gender] || s.gender}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => navigate(`/santri/${s.id}`)} className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Detail">
                                                <Eye size={14} />
                                            </button>
                                            {canEdit && (
                                                <button onClick={() => navigate(`/santri/${s.id}/edit`)} className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                                                    <Edit2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-400">{total} siswa · Hal {page} dari {totalPages}</span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                                <ChevronLeft size={14} className="text-gray-500" />
                            </button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                                <ChevronRight size={14} className="text-gray-500" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
