import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import {
    GraduationCap, Users, UserCheck, BookOpen, Printer, TrendingUp,
    AlertCircle, Loader2, ChevronRight, CalendarDays
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

interface MadrasahStats {
    totalKelas: number;
    totalSantriInKelas: number;
    totalWaliKelas: number;
    assignedWaliKelas: number;
    kelasDistribution: { name: string; count: number }[];
    jenjangDistribution: { name: string; count: number }[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#4f46e5', '#7c3aed', '#6d28d9'];

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
                const jenjangMap = new Map<string, number>();
                (dashData.kelasDistribution || []).forEach((k: any) => {
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
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    const totalJenjang = stats?.jenjangDistribution.reduce((s, d) => s + d.count, 0) || 0;
    const rasioGuru = stats && stats.totalWaliKelas > 0 ? Math.round(stats.totalSantriInKelas / stats.totalWaliKelas) : 0;

    return (
        <div className="max-w-7xl mx-auto pb-10 space-y-8">
            {/* ═══ HEADER ═══ */}
            <div className="pt-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
                    <GraduationCap size={24} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Portal Madrasah</h1>
                    <p className="text-sm text-slate-500">Dashboard akademik & manajemen kelas</p>
                </div>
            </div>

            {/* ═══ STAT CARDS ═══ */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Kelas */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition">
                                <GraduationCap size={20} className="text-indigo-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{stats.totalKelas}</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">Total Kelas</p>
                    </div>

                    {/* Santri Terdaftar */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition">
                                <Users size={20} className="text-emerald-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{stats.totalSantriInKelas.toLocaleString()}</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">Santri Terdaftar</p>
                    </div>

                    {/* Guru / Wali Kelas */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition">
                                <UserCheck size={20} className="text-violet-600" />
                            </div>
                            <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                                {stats.assignedWaliKelas} aktif
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{stats.totalWaliKelas}</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">Guru / Wali Kelas</p>
                        <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5">
                            <div className="bg-violet-500 rounded-full h-1.5 transition-all duration-700"
                                style={{ width: `${stats.totalWaliKelas > 0 ? (stats.assignedWaliKelas / stats.totalWaliKelas * 100) : 0}%` }} />
                        </div>
                    </div>

                    {/* Rasio Guru */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition">
                                <TrendingUp size={20} className="text-amber-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{rasioGuru > 0 ? `1:${rasioGuru}` : '-'}</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">Rasio Guru : Santri</p>
                    </div>
                </div>
            )}

            {/* ═══ ALERT ═══ */}
            {stats && stats.totalWaliKelas > stats.assignedWaliKelas && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-4 rounded-xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertCircle size={16} className="text-amber-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-amber-800 text-sm">Perhatian</h3>
                        <p className="text-xs text-amber-700 mt-0.5">
                            Ada <strong>{stats.totalWaliKelas - stats.assignedWaliKelas}</strong> guru wali kelas yang belum ditugaskan ke kelas manapun.
                        </p>
                    </div>
                </div>
            )}

            {/* ═══ CHARTS GRID ═══ */}
            {stats && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Bar Chart — Kelas Distribution */}
                    <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <div className="mb-6">
                            <h3 className="text-base font-bold text-slate-800">Distribusi Santri per Kelas</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">10 kelas dengan santri terbanyak</p>
                        </div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.kelasDistribution.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                                    <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569', fontWeight: 500 }} width={160} />
                                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                                    <Bar dataKey="count" name="Santri" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={18} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Donut — Jenjang */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <div className="mb-4">
                            <h3 className="text-base font-bold text-slate-800">Komposisi Jenjang</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">Proporsi santri tiap jenjang</p>
                        </div>
                        <div className="h-52 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.jenjangDistribution}
                                        cx="50%" cy="50%"
                                        innerRadius={50} outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="count" nameKey="name"
                                        stroke="none"
                                    >
                                        {stats.jenjangDistribution.map((_, idx) => (
                                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ borderRadius: '10px', fontSize: '11px', border: '1px solid #e2e8f0' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <p className="text-xl font-bold text-slate-800">{totalJenjang.toLocaleString()}</p>
                                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">Santri</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                            {stats.jenjangDistribution.map((d, idx) => (
                                <div key={d.name} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                    <span className="text-[10px] text-slate-600 font-medium truncate">{d.name}</span>
                                    <span className="text-[10px] text-slate-400 ml-auto tabular-nums">{d.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ QUICK ACTIONS ═══ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link to="/madrasah/kelas" className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition group">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition">
                        <GraduationCap size={16} className="text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700">Kelola Kelas</p>
                        <p className="text-[10px] text-slate-400">Atur data kelas</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition" />
                </Link>
                <Link to="/madrasah/jadwal" className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-xl hover:border-violet-200 hover:shadow-sm transition group">
                    <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition">
                        <CalendarDays size={16} className="text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700">Jadwal Pelajaran</p>
                        <p className="text-[10px] text-slate-400">Manajemen jadwal</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-violet-400 transition" />
                </Link>
                <Link to="/pengaturan/cetak" className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-xl hover:border-sky-200 hover:shadow-sm transition group">
                    <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center group-hover:bg-sky-100 transition">
                        <Printer size={16} className="text-sky-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700">Cetak Dokumen</p>
                        <p className="text-[10px] text-slate-400">Template kustom</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-sky-400 transition" />
                </Link>
            </div>
        </div>
    );
}
