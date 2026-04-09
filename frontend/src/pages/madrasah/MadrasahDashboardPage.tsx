import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import {
    GraduationCap, Users, UserCheck, BookOpen, Printer, TrendingUp,
    AlertCircle, Loader2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

interface MadrasahStats {
    totalKelas: number;
    totalSantriInKelas: number;
    totalWaliKelas: number;
    assignedWaliKelas: number;
    kelasDistribution: { name: string; count: number }[];
    jenjangDistribution: { name: string; count: number }[];
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#f97316'];

export default function MadrasahDashboardPage() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<MadrasahStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dashRes, usersRes] = await Promise.all([
                    api.get('/laporan/dashboard'),
                    api.get('/users', { params: { limit: 500 } }),
                ]);

                const dashData = dashRes.data.data;
                const usersData: any[] = usersRes.data.data || [];

                const waliKelasUsers = usersData.filter((u: any) => u.roles?.some?.((r: any) =>
                    (typeof r === 'string' ? r : r?.name) === 'WALI_KELAS'
                ));
                const assignedCount = waliKelasUsers.filter((u: any) =>
                    u.kelasWali && u.kelasWali.length > 0
                ).length;

                // Build jenjang distribution from kelas distribution names
                // Each kelas name format is "Jenjang Tingkat Kelas"
                const jenjangMap = new Map<string, number>();
                (dashData.kelasDistribution || []).forEach((k: any) => {
                    // Use first word as jenjang proxy (simplified)
                    const parts = k.name.split(' ');
                    const jenjang = parts[0] || 'Lainnya';
                    jenjangMap.set(jenjang, (jenjangMap.get(jenjang) || 0) + k.count);
                });

                setStats({
                    totalKelas: dashData.summary.totalKelas,
                    totalSantriInKelas: dashData.kelasDistribution?.reduce((sum: number, k: any) => sum + k.count, 0) || 0,
                    totalWaliKelas: waliKelasUsers.length,
                    assignedWaliKelas: assignedCount,
                    kelasDistribution: dashData.kelasDistribution || [],
                    jenjangDistribution: Array.from(jenjangMap.entries()).map(([name, count]) => ({ name, count })),
                });
            } catch (err) {
                console.error('Failed to load madrasah stats', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="pt-4">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <GraduationCap size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Portal Madrasah</h1>
                        <p className="text-slate-500 text-sm">Dashboard akademik dan manajemen kelas</p>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center">
                                <GraduationCap size={18} className="text-sky-600" />
                            </div>
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Kelas</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{stats.totalKelas}</p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Users size={18} className="text-emerald-600" />
                            </div>
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Santri Terdaftar</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{stats.totalSantriInKelas.toLocaleString()}</p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                                <UserCheck size={18} className="text-violet-600" />
                            </div>
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Guru / Wali Kelas</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{stats.totalWaliKelas}</p>
                        <p className="text-xs text-slate-400 mt-1">{stats.assignedWaliKelas} ditugaskan</p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                                <TrendingUp size={18} className="text-amber-600" />
                            </div>
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Rasio Guru</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">
                            {stats.totalWaliKelas > 0
                                ? `1:${Math.round(stats.totalSantriInKelas / stats.totalWaliKelas)}`
                                : '-'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Guru : Santri</p>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Link to="/madrasah/kelas"
                    className="flex items-center justify-center gap-2.5 p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition text-slate-600 hover:text-indigo-700 font-medium text-sm shadow-sm">
                    <GraduationCap size={18} className="text-indigo-500" /> Kelola Kelas
                </Link>
                <Link to="/santri"
                    className="flex items-center justify-center gap-2.5 p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/50 transition text-slate-600 hover:text-emerald-700 font-medium text-sm shadow-sm">
                    <Users size={18} className="text-emerald-500" /> Data Santri
                </Link>
                <Link to="/pengaturan/cetak"
                    className="flex items-center justify-center gap-2.5 p-4 bg-white border border-slate-200 rounded-xl hover:border-sky-300 hover:bg-sky-50/50 transition text-slate-600 hover:text-sky-700 font-medium text-sm shadow-sm">
                    <Printer size={18} className="text-sky-500" /> Desain Cetak Dokumen
                </Link>
            </div>

            {/* Alert: Unassigned Wali Kelas */}
            {stats && stats.totalWaliKelas > stats.assignedWaliKelas && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start gap-3">
                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                    <div>
                        <h3 className="font-bold text-amber-800 text-sm">Perhatian</h3>
                        <p className="text-sm text-amber-700 mt-0.5">
                            Ada <strong>{stats.totalWaliKelas - stats.assignedWaliKelas}</strong> guru wali kelas yang belum ditugaskan ke kelas manapun.
                        </p>
                    </div>
                </div>
            )}

            {/* Charts */}
            {stats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Kelas Distribution */}
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 lg:p-8">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Distribusi Santri per Kelas</h3>
                            <p className="text-xs text-slate-500 mt-1">Jumlah santri di setiap kelas</p>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.kelasDistribution.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 30 }}>
                                    <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} width={180} />
                                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '12px' }} />
                                    <Bar dataKey="count" name="Jumlah Santri" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={22} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Jenjang Distribution Pie */}
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 lg:p-8">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Komposisi per Jenjang</h3>
                            <p className="text-xs text-slate-500 mt-1">Proporsi santri pada setiap jenjang pendidikan</p>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.jenjangDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={4}
                                        dataKey="count"
                                        nameKey="name"
                                        label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                                        labelLine={{ strokeWidth: 1 }}
                                    >
                                        {stats.jenjangDistribution.map((_, idx) => (
                                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
