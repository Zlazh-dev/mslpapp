import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Santri, Kelas, Kamar } from '../types';
import { useAuthStore } from '../stores/authStore';
import SantriImportModal from '../components/SantriImportModal';

const LIMIT = 20;

const GENDER_LABEL: Record<string, string> = { L: 'Laki-laki', P: 'Perempuan' };

function completenessOf(s: Santri): number {
    return [
        s.tanggalLahir, s.tempatLahir, s.noHp, s.nik,
        s.namaAyah, s.namaIbu, s.jalan,
        s.kelasId, s.kamarId,
    ].filter(Boolean).length;
}

export default function SantriListPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canEdit = user && ['ADMIN', 'STAF_PENDATAAN'].includes(user.roles?.[0]);

    // Filter state
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [nisYear, setNisYear] = useState('');
    const [filterKamar, setFilterKamar] = useState('');
    const [filterKelas, setFilterKelas] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // UI state
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [expandedFilter, setExpandedFilter] = useState<string | null>(null);
    const [showKebab, setShowKebab] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Santri | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Data
    const [data, setData] = useState<Santri[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [angkatan, setAngkatan] = useState<string[]>([]);
    const [kelas, setKelas] = useState<Kelas[]>([]);
    const [kamar, setKamar] = useState<Kamar[]>([]);

    const filterRef = useRef<HTMLDivElement>(null);
    const kebabRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Click outside to close filter panel
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setShowFilterPanel(false); setExpandedFilter(null);
            }
        };
        if (showFilterPanel) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showFilterPanel]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) setShowKebab(false);
        };
        if (showKebab) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showKebab]);

    // Debounced search
    const handleSearch = useCallback((val: string) => {
        setSearch(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 300);
    }, []);

    // Load reference data
    useEffect(() => {
        api.get('/santri/angkatan').then(r => setAngkatan(r.data.data)).catch(() => { });
        api.get('/kelas', { params: { limit: 100 } }).then(r => setKelas(r.data.data)).catch(() => { });
        api.get('/kamar', { params: { limit: 100 } }).then(r => setKamar(r.data.data)).catch(() => { });
    }, []);

    // Fetch table data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: LIMIT };
            if (debouncedSearch) params.search = debouncedSearch;
            if (nisYear) params.nisYear = nisYear;
            if (filterKamar) params.kamarId = filterKamar;
            if (filterKelas) params.kelasId = filterKelas;
            if (filterStatus) params.status = filterStatus;
            if (filterGender) params.gender = filterGender;
            const res = await api.get('/santri', { params });
            const list: Santri[] = res.data.data;
            setData(list);
            setTotal(res.data.meta?.total || 0);
            setTotalPages(res.data.meta?.totalPages || 1);
        } finally { setLoading(false); }
    }, [page, debouncedSearch, nisYear, filterKamar, filterKelas, filterStatus, filterGender]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        await api.delete(`/santri/${deleteTarget.id}`);
        setDeleting(false); setDeleteTarget(null);
        fetchData();
        api.get('/santri/angkatan').then(r => setAngkatan(r.data.data)).catch(() => { });
    };

    const exportExcel = async () => {
        setShowKebab(false);
        const XLSX = await import('xlsx');
        const params: any = { limit: 999999, page: 1 };
        if (debouncedSearch) params.search = debouncedSearch;
        if (nisYear) params.nisYear = nisYear;
        if (filterKamar) params.kamarId = filterKamar;
        if (filterKelas) params.kelasId = filterKelas;
        if (filterStatus) params.status = filterStatus;
        if (filterGender) params.gender = filterGender;
        const res = await api.get('/santri', { params });
        const rows = (res.data.data as Santri[]).map(s => ({
            NIS: s.nis, 'Nama Lengkap': s.namaLengkap, Gender: GENDER_LABEL[s.gender] || s.gender,
            'Tempat Lahir': s.tempatLahir, 'Tgl Lahir': s.tanggalLahir ? new Date(s.tanggalLahir).toLocaleDateString('id-ID') : '',
            'No HP': s.noHp || '', NIK: s.nik || '', 'No KK': s.noKk || '',
            'Jenjang': s.jenjangPendidikan || '', 'Tgl Masuk': s.tanggalMasuk ? new Date(s.tanggalMasuk).toLocaleDateString('id-ID') : '',
            'Tgl Keluar': s.tanggalKeluar ? new Date(s.tanggalKeluar).toLocaleDateString('id-ID') : '',
            'Nama Ayah': s.namaAyah || '', 'No HP Ayah': s.noHpAyah || '',
            'Nama Ibu': s.namaIbu || '', 'No HP Ibu': s.noHpIbu || '',
            'Nama Wali': s.namaWali || '', 'No HP Wali': s.noHpWali || '', 'Ket. Wali': s.deskripsiWali || '',
            Provinsi: s.provinsi || '', 'Kota/Kab': s.kotaKabupaten || '', Kecamatan: s.kecamatan || '',
            Kelurahan: s.kelurahan || '', Jalan: s.jalan || '', 'RT/RW': s.rtRw || '',
            Kelas: s.kelas?.nama || '', Kamar: s.kamar?.nama || '', Status: s.status,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Santri');
        XLSX.writeFile(wb, `data_santri_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const startIndex = (page - 1) * LIMIT;
    const activeFilterCount = (filterKamar ? 1 : 0) + (filterKelas ? 1 : 0) + (filterGender ? 1 : 0);
    const resetFilters = () => { setFilterKamar(''); setFilterKelas(''); setFilterGender(''); setFilterStatus(''); setPage(1); };

    return (
        <div className="flex flex-col h-[calc(100dvh-64px)] bg-white text-slate-700 overflow-hidden">
            {/* ── Toolbar: actions ─────────────────────────────── */}
            <div className="h-10 border-b border-slate-200 flex items-center px-3 gap-2 shrink-0 bg-white overflow-x-auto">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest shrink-0">Data Santri</span>
                <div className="w-px h-5 bg-slate-200 mx-0.5" />
                <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{loading ? '...' : `${total} santri`}</span>
                <div className="flex-1" />
                {canEdit && (
                    <button onClick={() => navigate('/santri/baru')}
                        className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition shrink-0">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        Tambah
                    </button>
                )}
                <div className="relative" ref={kebabRef}>
                    <button onClick={() => setShowKebab(!showKebab)} className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                    </button>
                    {showKebab && (
                        <div className="fixed right-3 mt-1 z-[9999] w-44 rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden" style={{ top: (kebabRef.current?.getBoundingClientRect().bottom ?? 40) + 2 }}>
                            <button onClick={exportExcel} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition">Export Excel <span className="ml-auto text-[10px] text-slate-400">({total})</span></button>
                            {canEdit && <button onClick={() => { setShowKebab(false); setImportOpen(true); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-emerald-50 border-t border-slate-100 transition">Import Excel</button>}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Filter bar ──────────────────────────────────── */}
            <div className="border-b border-slate-200 bg-slate-50/80 px-3 py-2 space-y-1.5 shrink-0 overflow-x-auto">
                {angkatan.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-0.5">Angkatan:</span>
                        <button onClick={() => { setNisYear(''); setPage(1); }} className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${!nisYear ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Semua</button>
                        {angkatan.map(yr => (
                            <button key={yr} onClick={() => { setNisYear(yr === nisYear ? '' : yr); setPage(1); }} className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${nisYear === yr ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>20{yr}</button>
                        ))}
                        <div className="w-px h-4 bg-slate-200 mx-1" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-0.5">Status:</span>
                        {[{ value: '', label: 'Semua' }, { value: 'ACTIVE', label: 'Aktif' }, { value: 'INACTIVE', label: 'Nonaktif' }].map(opt => (
                            <button key={opt.value} onClick={() => { setFilterStatus(opt.value); setPage(1); }}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${filterStatus === opt.value ? (opt.value === 'INACTIVE' ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white') : 'text-slate-500 hover:bg-slate-200'}`}>{opt.label}</button>
                        ))}
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" placeholder="Cari nama atau NIS..." value={search} onChange={e => handleSearch(e.target.value)}
                            className="w-full pl-7 pr-3 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-700 placeholder-slate-400 focus:border-emerald-400 outline-none" />
                    </div>
                    <div className="relative" ref={filterRef}>
                        <button type="button" onClick={() => { setShowFilterPanel(!showFilterPanel); setExpandedFilter(null); }}
                            className={`h-[26px] px-2 border rounded text-[10px] font-medium flex items-center gap-1 transition ${activeFilterCount > 0 ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                            Filter{activeFilterCount > 0 && <span className="min-w-[14px] h-[14px] rounded-full bg-emerald-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">{activeFilterCount}</span>}
                        </button>
                        {showFilterPanel && (() => {
                            const rect = filterRef.current?.getBoundingClientRect();
                            return (
                            <div className="fixed z-[9999] w-60 rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden"
                                style={{ top: (rect?.bottom ?? 0) + 4, right: window.innerWidth - (rect?.right ?? 0) }}>
                                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-700">Filter</span>
                                    {activeFilterCount > 0 && <button onClick={resetFilters} className="text-[10px] font-medium text-red-500 hover:text-red-700">Reset</button>}
                                </div>
                                <div className="divide-y divide-slate-100">
                                    <FilterSection label="Kamar" icon="home" color="teal" active={!!filterKamar} expanded={expandedFilter === 'kamar'} onToggle={() => setExpandedFilter(expandedFilter === 'kamar' ? null : 'kamar')}>
                                        <button onClick={() => { setFilterKamar(''); setPage(1); }} className={`w-full text-left px-5 py-1.5 text-xs transition ${!filterKamar ? 'text-teal-600 font-semibold bg-teal-50' : 'text-slate-600 hover:bg-slate-100'}`}>Semua</button>
                                        {kamar.map(k => <button key={k.id} onClick={() => { setFilterKamar(String(k.id)); setPage(1); }} className={`w-full text-left px-5 py-1.5 text-xs transition ${filterKamar === String(k.id) ? 'text-teal-600 font-semibold bg-teal-50' : 'text-slate-600 hover:bg-slate-100'}`}>{k.gedung?.nama} — {k.nama}</button>)}
                                    </FilterSection>
                                    <FilterSection label="Kelas" icon="book" color="blue" active={!!filterKelas} expanded={expandedFilter === 'kelas'} onToggle={() => setExpandedFilter(expandedFilter === 'kelas' ? null : 'kelas')}>
                                        <button onClick={() => { setFilterKelas(''); setPage(1); }} className={`w-full text-left px-5 py-1.5 text-xs transition ${!filterKelas ? 'text-blue-600 font-semibold bg-blue-50' : 'text-slate-600 hover:bg-slate-100'}`}>Semua</button>
                                        {kelas.map(k => <button key={k.id} onClick={() => { setFilterKelas(String(k.id)); setPage(1); }} className={`w-full text-left px-5 py-1.5 text-xs transition ${filterKelas === String(k.id) ? 'text-blue-600 font-semibold bg-blue-50' : 'text-slate-600 hover:bg-slate-100'}`}>{k.tingkat?.jenjang?.nama} — {k.nama}</button>)}
                                    </FilterSection>
                                    <FilterSection label="Gender" icon="user" color="purple" active={!!filterGender} expanded={expandedFilter === 'gender'} onToggle={() => setExpandedFilter(expandedFilter === 'gender' ? null : 'gender')}>
                                        {[{ value: '', label: 'Semua' }, { value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }].map(opt => <button key={opt.value} onClick={() => { setFilterGender(opt.value); setPage(1); }} className={`w-full text-left px-5 py-1.5 text-xs transition ${filterGender === opt.value ? 'text-purple-600 font-semibold bg-purple-50' : 'text-slate-600 hover:bg-slate-100'}`}>{opt.label}</button>)}
                                    </FilterSection>
                                </div>
                            </div>
                            );
                        })()}
                    </div>
                </div>
                {activeFilterCount > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                        {filterKamar && (() => { const k = kamar.find(k => String(k.id) === filterKamar); return <Chip color="teal" label={k ? `${k.gedung?.nama} — ${k.nama}` : 'Kamar'} onRemove={() => { setFilterKamar(''); setPage(1); }} />; })()}
                        {filterKelas && (() => { const k = kelas.find(k => String(k.id) === filterKelas); return <Chip color="blue" label={k ? `${k.tingkat?.jenjang?.nama} — ${k.nama}` : 'Kelas'} onRemove={() => { setFilterKelas(''); setPage(1); }} />; })()}
                        {filterGender && <Chip color="purple" label={GENDER_LABEL[filterGender] || filterGender} onRemove={() => { setFilterGender(''); setPage(1); }} />}
                    </div>
                )}
            </div>

            {/* ── Column header ────────────────────────────────── */}
            <div className="bg-slate-50 border-b border-slate-200 shrink-0">
                <div className="grid grid-cols-[36px_72px_1fr_180px_100px_84px_80px_48px] min-w-[750px]">
                    <div className="px-2 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 text-center">#</div>
                    <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">NIS</div>
                    <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Nama</div>
                    <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Kelas</div>
                    <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Kamar</div>
                    <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Masuk</div>
                    <div className="px-3 py-[7px] text-[10px] font-bold text-slate-400 border-r border-slate-200 uppercase tracking-wider">Data</div>
                    <div className="px-2 py-[7px]"></div>
                </div>
            </div>

            {/* ── Body ────────────────────────────────────────── */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="min-w-[750px]">{Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-[36px_72px_1fr_180px_100px_84px_80px_48px] border-b border-slate-100 animate-pulse">
                            {Array.from({ length: 8 }).map((_, j) => <div key={j} className="px-3 py-3 border-r border-slate-100"><div className="h-3 bg-slate-100 rounded" /></div>)}
                        </div>))}</div>
                ) : data.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        <p className="text-xs">{search || activeFilterCount || nisYear ? 'Tidak ada santri yang sesuai filter' : 'Belum ada data santri'}</p>
                    </div>
                ) : (
                    <div className="min-w-[750px]">{data.map((s, idx) => {
                        const c = completenessOf(s); const pct = Math.round((c / 9) * 100);
                        const kelasLabel = [s.kelas?.tingkat?.jenjang?.nama, s.kelas?.tingkat?.nama, s.kelas?.nama].filter(Boolean).join(' — ');
                        return (
                            <div key={s.id} onClick={() => navigate(`/santri/${s.id}`)}
                                className="grid grid-cols-[36px_72px_1fr_180px_100px_84px_80px_48px] border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer group transition">
                                <div className="px-2 py-[7px] text-[11px] text-slate-400 border-r border-slate-100 text-center tabular-nums">{startIndex + idx + 1}</div>
                                <div className="px-3 py-[7px] text-[11px] font-mono font-medium text-slate-600 border-r border-slate-100 truncate">{s.nis}</div>
                                <div className="px-3 py-[7px] text-[12px] font-medium text-slate-800 border-r border-slate-100 truncate group-hover:text-emerald-700 transition">{s.namaLengkap}</div>
                                <div className="px-3 py-[7px] text-[11px] text-slate-600 border-r border-slate-100 truncate">{kelasLabel || <span className="text-slate-300">—</span>}</div>
                                <div className="px-3 py-[7px] text-[11px] text-slate-600 border-r border-slate-100 truncate">{s.kamar?.nama || <span className="text-slate-300">—</span>}</div>
                                <div className="px-3 py-[7px] text-[11px] text-slate-500 border-r border-slate-100 whitespace-nowrap">
                                    {s.tanggalMasuk ? new Date(s.tanggalMasuk).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : <span className="text-slate-300">—</span>}
                                </div>
                                <div className="px-3 py-[7px] border-r border-slate-100">
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${pct >= 90 ? 'bg-emerald-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} /></div>
                                        <span className="text-[9px] font-semibold text-slate-500 w-6 text-right">{pct}%</span>
                                    </div>
                                </div>
                                <div className="px-2 py-[7px] flex items-center justify-center gap-0.5" onClick={e => e.stopPropagation()}>
                                    {canEdit && (<>
                                        <button onClick={() => navigate(`/santri/${s.id}/edit`)} className="w-5 h-5 text-slate-300 hover:text-blue-500 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button onClick={() => setDeleteTarget(s)} className="w-5 h-5 text-slate-300 hover:text-red-500 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </>)}
                                </div>
                            </div>
                        );
                    })}</div>
                )}
            </div>

            {/* ── Status bar + Pagination ──────────────────────── */}
            <div className="h-8 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between px-3 shrink-0">
                <span className="text-[10px] text-slate-400">{startIndex + 1}–{Math.min(startIndex + LIMIT, total)} dari {total}</span>
                {totalPages > 1 && (
                    <div className="flex items-center gap-0.5">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-200 rounded disabled:opacity-30 transition">← Prev</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), Math.min(totalPages, page + 2)).map(p => (
                            <button key={p} onClick={() => setPage(p)} className={`w-5 h-5 rounded text-[10px] font-medium transition ${p === page ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>{p}</button>
                        ))}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-200 rounded disabled:opacity-30 transition">Next →</button>
                    </div>
                )}
            </div>

            {/* ── Modals ──────────────────────────────────────── */}
            {importOpen && <SantriImportModal onClose={() => setImportOpen(false)} onImported={fetchData} />}
            {deleteTarget && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-slate-900">Hapus Santri?</h3>
                            <p className="text-sm text-slate-500 mt-1">Data <strong>"{deleteTarget.namaLengkap}"</strong> akan dihapus permanen.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Batal</button>
                            <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition disabled:opacity-50">
                                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterSection({ label, icon, color, active, expanded, onToggle, children }: {
    label: string; icon: string; color: string; active: boolean; expanded: boolean;
    onToggle: () => void; children: React.ReactNode;
}) {
    const iconColors: any = { teal: 'bg-teal-50 text-teal-600', blue: 'bg-blue-50 text-blue-600', purple: 'bg-purple-50 text-purple-600' };
    const dotColors: any = { teal: 'bg-teal-500', blue: 'bg-blue-500', purple: 'bg-purple-500' };
    const icons: any = {
        home: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
        book: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
        user: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    };
    return (
        <div>
            <button type="button" onClick={onToggle} className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition text-left">
                <span className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${iconColors[color]}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icons[icon]}</svg>
                </span>
                <span className="flex-1 text-xs font-medium text-slate-700">{label}</span>
                {active && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[color]}`} />}
                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            {expanded && <div className="bg-slate-50 max-h-40 overflow-y-auto">{children}</div>}
        </div>
    );
}

function Chip({ color, label, onRemove }: { color: string; label: string; onRemove: () => void }) {
    const styles: any = { teal: 'bg-teal-50 border-teal-200 text-teal-700', blue: 'bg-blue-50 border-blue-200 text-blue-700', purple: 'bg-purple-50 border-purple-200 text-purple-700' };
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border pl-2 pr-1 py-0.5 text-[10px] font-medium ${styles[color] || styles.blue}`}>
            {label}
            <button onClick={onRemove} className="w-3.5 h-3.5 rounded-full flex items-center justify-center transition">✕</button>
        </span>
    );
}

