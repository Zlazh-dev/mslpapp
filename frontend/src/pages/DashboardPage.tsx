import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import { DashboardStats } from '../types';
import { Users, GraduationCap, Home, UserCheck, TrendingUp, PlusCircle, Printer, Database, AlertCircle, Download, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [distModel, setDistModel] = useState<'kelas' | 'kamar'>('kelas');

    useEffect(() => {
        api.get('/laporan/dashboard')
            .then(res => setStats(res.data.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const exportToCSV = () => {
        if (!stats) return;
        const csvRows = [
            ['Kategori', 'Metrik', 'Nilai'],
            ['Ringkasan', 'Total Santri', stats.summary.totalSantri],
            ['Ringkasan', 'Santri Aktif', stats.summary.santriActive],
            ['Ringkasan', 'Santri Non-Aktif', stats.summary.santriInactive],
            ['Ringkasan', 'Total Kelas', stats.summary.totalKelas],
            ['Ringkasan', 'Total Kamar', stats.summary.totalKamar],
            ['Anomali', 'Santri Tanpa Kelas/Kamar', stats.anomalies.unassignedSantri],
            ['Anomali', 'Kamar Kelebihan Kapasitas', stats.anomalies.overcapacityRooms],
        ];

        stats.seriesData.forEach(s => {
            csvRows.push(['Tren Tahunan', `Pendaftaran ${s.name}`, s.pendaftaran]);
            csvRows.push(['Tren Tahunan', `Mutasi ${s.name}`, s.mutasi]);
        });

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
        const a = document.createElement('a');
        a.href = encodeURI(csvContent);
        a.download = `Laporan_Dashboard_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
            </div>
        );
    }

    const DONUT_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#4f46e5', '#7c3aed', '#6d28d9'];

    // Build jenjang distribution for donut
    const jenjangDist = (() => {
        if (!stats) return [];
        const map = new Map<string, number>();
        const source = distModel === 'kelas' ? stats.kelasDistribution : stats.kamarDistribution;
        source.forEach(k => {
            const jenjang = k.name.split(' - ')[0]?.split(' ')[0] || 'Lainnya';
            map.set(jenjang, (map.get(jenjang) || 0) + k.count);
        });
        return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    })();

    const totalDonut = jenjangDist.reduce((s, d) => s + d.count, 0);

    const isAdmin = user?.roles?.includes('ADMIN') || user?.roles?.includes('STAF_PENDATAAN');

    return (
        <div className="max-w-7xl mx-auto pb-10 space-y-8">
            {/* ═══ HEADER ═══ */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        Selamat Datang, <span className="text-indigo-600">{user?.name?.split(' ')[0] || 'Admin'}</span>
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Ringkasan data & statistik pesantren</p>
                </div>
                <button onClick={exportToCSV} className="flex items-center gap-2 text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition px-3.5 py-2 rounded-lg shadow-sm">
                    <Download size={14} /> Ekspor CSV
                </button>
            </div>

            {/* ═══ STAT CARDS ═══ */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Santri */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition">
                                <Users size={20} className="text-indigo-600" />
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <TrendingUp size={10} /> {stats.summary.santriActive > 0 ? Math.round(stats.summary.santriActive / stats.summary.totalSantri * 100) : 0}% Aktif
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{stats.summary.totalSantri.toLocaleString()}</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">Total Santri</p>
                    </div>

                    {/* Aktif */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition">
                                <UserCheck size={20} className="text-emerald-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{stats.summary.santriActive.toLocaleString()}</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">Santri Aktif</p>
                        <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5">
                            <div className="bg-emerald-500 rounded-full h-1.5 transition-all duration-700"
                                style={{ width: `${stats.summary.totalSantri > 0 ? (stats.summary.santriActive / stats.summary.totalSantri * 100) : 0}%` }} />
                        </div>
                    </div>

                    {/* Kelas */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition">
                                <GraduationCap size={20} className="text-violet-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{stats.summary.totalKelas}</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">Total Kelas</p>
                    </div>

                    {/* Kamar */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition">
                                <Home size={20} className="text-amber-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{stats.summary.totalKamar}</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">Total Kamar</p>
                    </div>
                </div>
            )}

            {/* ═══ ALERT ═══ */}
            {stats && (stats.anomalies.unassignedSantri > 0 || stats.anomalies.overcapacityRooms > 0) && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-4 rounded-xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertCircle size={16} className="text-amber-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-amber-800 text-sm">Perhatian — Data Integritas</h3>
                        <div className="text-xs text-amber-700 mt-1 space-y-0.5">
                            {stats.anomalies.unassignedSantri > 0 && <p>• <strong>{stats.anomalies.unassignedSantri}</strong> santri aktif belum dialokasikan ke kelas/kamar</p>}
                            {stats.anomalies.overcapacityRooms > 0 && <p>• <strong>{stats.anomalies.overcapacityRooms}</strong> kamar melebihi kapasitas</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ CHARTS GRID ═══ */}
            {stats && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Bar Chart — Yearly Trend (3 cols) */}
                    <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Tren Pendaftaran</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">Volume santri baru vs mutasi per tahun</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                                    <span className="text-[10px] text-slate-500 font-medium">Pendaftaran</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-sm bg-violet-300" />
                                    <span className="text-[10px] text-slate-500 font-medium">Mutasi</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.seriesData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }} barGap={4}>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={8} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,.08)', fontSize: '12px', color: '#334155' }}
                                        cursor={{ fill: '#f8fafc', radius: 8 }}
                                    />
                                    <Bar dataKey="pendaftaran" name="Pendaftaran" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={32} />
                                    <Bar dataKey="mutasi" name="Mutasi" fill="#c4b5fd" radius={[6, 6, 0, 0]} barSize={32} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Donut Chart — Distribution (2 cols) */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Distribusi</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">Proporsi santri per jenjang</p>
                            </div>
                            <div className="flex bg-slate-100 p-0.5 rounded-lg">
                                <button onClick={() => setDistModel('kelas')}
                                    className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition ${distModel === 'kelas' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                                    Kelas
                                </button>
                                <button onClick={() => setDistModel('kamar')}
                                    className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition ${distModel === 'kamar' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                                    Kamar
                                </button>
                            </div>
                        </div>
                        <div className="h-56 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={jenjangDist}
                                        cx="50%" cy="50%"
                                        innerRadius={55} outerRadius={85}
                                        paddingAngle={3}
                                        dataKey="count" nameKey="name"
                                        stroke="none"
                                    >
                                        {jenjangDist.map((_, idx) => (
                                            <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ borderRadius: '10px', fontSize: '11px', border: '1px solid #e2e8f0' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center label */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <p className="text-xl font-bold text-slate-800">{totalDonut.toLocaleString()}</p>
                                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">Santri</p>
                                </div>
                            </div>
                        </div>
                        {/* Legend */}
                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                            {jenjangDist.map((d, idx) => (
                                <div key={d.name} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }} />
                                    <span className="text-[10px] text-slate-600 font-medium truncate">{d.name}</span>
                                    <span className="text-[10px] text-slate-400 ml-auto tabular-nums">{d.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ QUICK ACTIONS ═══ */}
            {isAdmin && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Link to="/santri/baru" className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition group">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition">
                            <PlusCircle size={16} className="text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-700 truncate">Registrasi Santri</p>
                            <p className="text-[10px] text-slate-400">Input data baru</p>
                        </div>
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition" />
                    </Link>
                    <Link to="/kamar" className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-xl hover:border-violet-200 hover:shadow-sm transition group">
                        <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition">
                            <Home size={16} className="text-violet-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-700 truncate">Kelola Kamar</p>
                            <p className="text-[10px] text-slate-400">Atur penghuni</p>
                        </div>
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-violet-400 transition" />
                    </Link>
                    <Link to="/pengaturan/cetak" className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-xl hover:border-sky-200 hover:shadow-sm transition group">
                        <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center group-hover:bg-sky-100 transition">
                            <Printer size={16} className="text-sky-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-700 truncate">Desain Cetak ID</p>
                            <p className="text-[10px] text-slate-400">Template kustom</p>
                        </div>
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-sky-400 transition" />
                    </Link>
                    {user?.roles?.includes('ADMIN') && (
                        <Link to="/pengaturan/backupdata" className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition group">
                            <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition">
                                <Database size={16} className="text-slate-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-700 truncate">Backup Sistem</p>
                                <p className="text-[10px] text-slate-400">Export / Import</p>
                            </div>
                            <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-400 transition" />
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
