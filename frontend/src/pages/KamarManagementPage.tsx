import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Kompleks, Gedung, Kamar, User } from '../types';
import { useAuthStore } from '../stores/authStore';
import { Plus, Trash2, GripVertical, Pencil, Check, X, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type DeleteTarget = { type: 'kompleks' | 'gedung' | 'kamar'; id: number; nama: string };

// ── Small helpers ─────────────────────────────────────────────────────────────

const TrashIcon = () => (
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);
const PlusIcon = () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
    </svg>
);

interface InlineAddProps {
    value: string;
    onChange: (v: string) => void;
    onConfirm: () => void;
    placeholder: string;
    type?: string;
    loading?: boolean;
    extraInput?: React.ReactNode;
}
function InlineAdd({ value, onChange, onConfirm, placeholder, type = 'text', loading, extraInput }: InlineAddProps) {
    return (
        <div className="flex gap-1 p-2 border-b border-dashed border-emerald-200 bg-emerald-50/50">
            <input
                type={type} value={value} autoFocus
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                onKeyDown={e => e.key === 'Enter' && value && onConfirm()}
                className="flex-1 min-w-0 px-2 py-1 rounded border border-emerald-200 text-xs bg-white outline-none focus:border-emerald-400"
            />
            {extraInput}
            <button
                onClick={() => value && onConfirm()} disabled={!value || loading}
                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium disabled:opacity-50 transition"
            >OK</button>
        </div>
    );
}

// ── Rename Modal (for Kompleks & Gedung) ───────────────────────────────────────────────────
function RenameModal({ title, initialValue, onSave, onClose }: { title: string; initialValue: string; onSave: (v: string) => void; onClose: () => void }) {
    const [val, setVal] = useState(initialValue);
    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-xs rounded-2xl bg-white shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900">Edit {title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
                </div>
                <input autoFocus value={val} onChange={e => setVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && val.trim()) onSave(val.trim()); if (e.key === 'Escape') onClose(); }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200" />
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                    <button onClick={() => val.trim() && onSave(val.trim())} disabled={!val.trim()}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50">Simpan</button>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function KamarManagementPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canEdit = user && ['ADMIN', 'STAF_PENDATAAN'].includes(user.roles?.[0]);

    // Selection state
    const [selKompleks, setSelKompleks] = useState<number | null>(null);
    const [selGedung, setSelGedung] = useState<number | null>(null);

    // Data
    const [kompleksList, setKompleksList] = useState<Kompleks[]>([]);
    const [gedungList, setGedungList] = useState<Gedung[]>([]);
    const [kamarList, setKamarList] = useState<Kamar[]>([]);
    const [pembimbingList, setPembimbingList] = useState<User[]>([]);

    // Add forms
    const [addingKompleks, setAddingKompleks] = useState(false);
    const [newKompleksNama, setNewKompleksNama] = useState('');
    const [addingGedung, setAddingGedung] = useState(false);
    const [newGedungNama, setNewGedungNama] = useState('');
    const [addingKamar, setAddingKamar] = useState(false);
    const [newKamarNama, setNewKamarNama] = useState('');
    const [newKamarKap, setNewKamarKap] = useState('');
    const [filterKamar, setFilterKamar] = useState('');
    const [sortKamar, setSortKamar] = useState<{ key: 'nama' | 'terisi'; dir: 'asc' | 'desc' }>({ key: 'nama', dir: 'asc' });

    // Drag & drop for pembimbing
    const [draggingUser, setDraggingUser] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<number | null>(null);

    // Global map: userId -> { kamarId, kamarNama } across ALL gedungs
    const [globalAssignMap, setGlobalAssignMap] = useState<Map<string, { kamarId: number; kamarNama: string }>>(new Map());

    // Inline edit state: 'kompleks-5', 'gedung-2'
    const [renaming, setRenaming] = useState<{ type: 'kompleks' | 'gedung'; id: number; current: string } | null>(null);

    // Delete confirm
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

    // Status messages
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const showMsg = (msg: string) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000); };
    const showErr = (msg: string) => { setError(msg); setTimeout(() => setError(''), 4000); };

    // ── Fetchers ───────────────────────────────────────────────────────────────

    const fetchKompleks = async () => {
        const r = await api.get('/kompleks');
        setKompleksList(r.data.data);
    };

    const fetchGedung = async (kompleksId: number) => {
        const r = await api.get('/gedung', { params: { kompleksId } });
        setGedungList(r.data.data);
    };

    const fetchKamar = async (gedungId: number) => {
        const r = await api.get('/kamar', { params: { gedungId } });
        setKamarList(r.data.data);
    };

    const fetchPembimbing = async () => {
        const r = await api.get('/users', { params: { limit: 200 } });
        setPembimbingList((r.data.data as User[]).filter((u: User) => u.roles?.includes('PEMBIMBING_KAMAR')));
    };

    // Fetch ALL kamars globally to build accurate assignment map
    const fetchAllAssignments = async () => {
        try {
            const r = await api.get('/kamar');
            const allKamar: Kamar[] = r.data.data;
            const map = new Map<string, { kamarId: number; kamarNama: string }>();
            allKamar.forEach(k => { k.pembimbings?.forEach(p => map.set(p.id, { kamarId: k.id, kamarNama: k.nama })); });
            setGlobalAssignMap(map);
        } catch { /* ignore */ }
    };

    useEffect(() => { fetchKompleks(); fetchPembimbing(); fetchAllAssignments(); }, []);
    useEffect(() => { if (selKompleks) fetchGedung(selKompleks); else setGedungList([]); setSelGedung(null); }, [selKompleks]);
    useEffect(() => { if (selGedung) fetchKamar(selGedung); else setKamarList([]); setFilterKamar(''); }, [selGedung]);

    // ── CRUD handlers ──────────────────────────────────────────────────────────

    const createKompleks = async () => {
        if (!newKompleksNama.trim()) return;
        setLoading(true);
        try {
            const r = await api.post('/kompleks', { nama: newKompleksNama });
            showMsg(`Kompleks "${r.data.data.nama}" dibuat`);
            setAddingKompleks(false); setNewKompleksNama('');
            await fetchKompleks();
            setSelKompleks(r.data.data.id);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal'); }
        finally { setLoading(false); }
    };

    const createGedung = async () => {
        if (!newGedungNama.trim() || !selKompleks) return;
        setLoading(true);
        try {
            const r = await api.post('/gedung', { nama: newGedungNama, kompleksId: selKompleks });
            showMsg(`Gedung "${r.data.data.nama}" dibuat`);
            setAddingGedung(false); setNewGedungNama('');
            await fetchGedung(selKompleks);
            setSelGedung(r.data.data.id);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal'); }
        finally { setLoading(false); }
    };

    const createKamar = async () => {
        if (!newKamarNama.trim() || !selGedung) return;
        setLoading(true);
        try {
            await api.post('/kamar', { nama: newKamarNama, gedungId: selGedung, kapasitas: newKamarKap ? parseInt(newKamarKap) : undefined });
            showMsg('Kamar berhasil dibuat');
            setAddingKamar(false); setNewKamarNama(''); setNewKamarKap('');
            await fetchKamar(selGedung);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal'); }
        finally { setLoading(false); }
    };

    const assignPembimbing = async (kamarId: number, userId: string) => {
        try {
            await api.put(`/users/${userId}`, { kamarId: String(kamarId) });
            showMsg('Pembimbing berhasil di-assign');
            if (selGedung) await fetchKamar(selGedung);
            await Promise.all([fetchPembimbing(), fetchAllAssignments()]);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal'); }
    };

    const removePembimbing = async (userId: string) => {
        try {
            await api.put(`/users/${userId}`, { kamarId: '' });
            showMsg('Pembimbing berhasil dihapus');
            if (selGedung) await fetchKamar(selGedung);
            await Promise.all([fetchPembimbing(), fetchAllAssignments()]);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal'); }
    };

    const renameItem = async (type: 'kompleks' | 'gedung', id: number, nama: string) => {
        try {
            await api.patch(`/${type}/${id}`, { nama });
            showMsg('Nama berhasil diperbarui');
            setRenaming(null);
            if (type === 'kompleks') await fetchKompleks();
            else if (type === 'gedung' && selKompleks) await fetchGedung(selKompleks);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal'); }
    };

    const handleDrop = (kamarId: number) => {
        if (!draggingUser) return;
        assignPembimbing(kamarId, draggingUser);
        setDraggingUser(null); setDropTarget(null);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            if (deleteTarget.type === 'kompleks') {
                await api.delete(`/kompleks/${deleteTarget.id}`);
                if (selKompleks === deleteTarget.id) { setSelKompleks(null); }
                await fetchKompleks();
            } else if (deleteTarget.type === 'gedung') {
                await api.delete(`/gedung/${deleteTarget.id}`);
                if (selGedung === deleteTarget.id) { setSelGedung(null); }
                if (selKompleks) await fetchGedung(selKompleks);
            } else {
                await api.delete(`/kamar/${deleteTarget.id}`);
                if (selGedung) await fetchKamar(selGedung);
                await fetchPembimbing();
            }
            showMsg(`"${deleteTarget.nama}" berhasil dihapus`);
            setDeleteTarget(null);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal menghapus'); setDeleteTarget(null); }
    };

    // Use global assignment map for accurate available/assigned split
    const available = pembimbingList.filter(p => !globalAssignMap.has(p.id));
    const assigned = pembimbingList.filter(p => globalAssignMap.has(p.id));

    const deleteDescriptions: Record<string, string> = {
        kompleks: 'Semua gedung dan kamar di dalamnya akan ikut dihapus.',
        gedung: 'Semua kamar di gedung ini akan ikut dihapus.',
        kamar: 'Santri yang menghuni kamar ini tidak akan terhapus.',
    };

    return (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
            {/* Header */}
            <div className="mb-3 flex-shrink-0 flex items-center justify-between">
                <div>
                    <h1 className="text-sm font-bold text-gray-900">Manajemen Kamar Asrama</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Kelola Kompleks → Gedung → Kamar, assign pembimbing via drag & drop</p>
                </div>
            </div>

            {success && <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700 flex-shrink-0">{success}</div>}
            {error && <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 flex-shrink-0">{error}</div>}

            {/* 4-Panel layout */}
            <div className="flex flex-1 min-h-0 bg-white rounded-xl border border-gray-200 overflow-hidden">

                {/* ── Panel 1: Kompleks ───────────────────────────────────────────── */}
                <div className="w-[180px] flex-shrink-0 border-r border-gray-200 flex flex-col">
                    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
                        <span className="text-xs font-semibold text-gray-700">Kompleks</span>
                        {canEdit && (
                            <button onClick={() => setAddingKompleks(v => !v)} className="w-5 h-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center justify-center transition">
                                <PlusIcon />
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {addingKompleks && (
                            <InlineAdd value={newKompleksNama} onChange={setNewKompleksNama} onConfirm={createKompleks} placeholder="Nama kompleks" loading={loading} />
                        )}
                        {kompleksList.map(k => (
                            <div key={k.id}
                                onClick={() => { if (!renaming) setSelKompleks(k.id); }}
                                className={`flex items-center gap-1 px-3 py-2 border-b border-gray-100 cursor-pointer group/row transition ${selKompleks === k.id ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                                <span className={`text-xs font-medium flex-1 truncate ${selKompleks === k.id ? 'text-emerald-700' : 'text-gray-800'}`}>{k.nama}</span>
                                {canEdit && (
                                    <>
                                        <button onClick={e => { e.stopPropagation(); setRenaming({ type: 'kompleks', id: k.id, current: k.nama }); }}
                                            className="w-5 h-5 flex-shrink-0 text-gray-400 hover:text-emerald-600 rounded flex items-center justify-center transition opacity-0 group-hover/row:opacity-100">
                                            <Pencil size={10} />
                                        </button>
                                        <button onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'kompleks', id: k.id, nama: k.nama }); }}
                                            className="w-5 h-5 flex-shrink-0 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover/row:opacity-100">
                                            <TrashIcon />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                        {!kompleksList.length && <div className="p-4 text-center text-xs text-gray-400">Belum ada kompleks</div>}
                    </div>
                </div>

                {/* ── Panel 2: Gedung ─────────────────────────────────────────────── */}
                <div className="w-[180px] flex-shrink-0 border-r border-gray-200 flex flex-col">
                    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
                        <span className="text-xs font-semibold text-gray-700">Gedung</span>
                        {canEdit && selKompleks && (
                            <button onClick={() => setAddingGedung(v => !v)} className="w-5 h-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center justify-center transition">
                                <PlusIcon />
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {!selKompleks
                            ? <div className="p-4 text-center text-xs text-gray-400">Pilih kompleks</div>
                            : <>
                                {addingGedung && (
                                    <InlineAdd value={newGedungNama} onChange={setNewGedungNama} onConfirm={createGedung} placeholder="Nama gedung" loading={loading} />
                                )}
                                {gedungList.map(g => (
                                    <div key={g.id}
                                        onClick={() => { if (!renaming) setSelGedung(g.id); }}
                                        className={`flex items-center gap-1 px-3 py-2 border-b border-gray-100 cursor-pointer group/row transition ${selGedung === g.id ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                                        <span className={`text-xs font-medium flex-1 truncate ${selGedung === g.id ? 'text-emerald-700' : 'text-gray-800'}`}>{g.nama}</span>
                                        {canEdit && (
                                            <>
                                                <button onClick={e => { e.stopPropagation(); setRenaming({ type: 'gedung', id: g.id, current: g.nama }); }}
                                                    className="w-5 h-5 flex-shrink-0 text-gray-400 hover:text-emerald-600 rounded flex items-center justify-center transition opacity-0 group-hover/row:opacity-100">
                                                    <Pencil size={10} />
                                                </button>
                                                <button onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'gedung', id: g.id, nama: g.nama }); }}
                                                    className="w-5 h-5 flex-shrink-0 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover/row:opacity-100">
                                                    <TrashIcon />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                                {!gedungList.length && <div className="p-4 text-center text-xs text-gray-400">Belum ada gedung</div>}
                            </>
                        }
                    </div>
                </div>

                {/* ── Panel 3: Kamar ──────────────────────────────────────────────── */}
                <div className="flex-1 border-r border-gray-200 flex flex-col min-w-0">
                    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex flex-col gap-1.5 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700">Kamar</span>
                            {canEdit && selGedung && (
                                <button onClick={() => setAddingKamar(v => !v)} className="w-5 h-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center justify-center transition">
                                    <PlusIcon />
                                </button>
                            )}
                        </div>
                        {selGedung && kamarList.length > 0 && (
                            <div className="relative">
                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={filterKamar}
                                    onChange={e => setFilterKamar(e.target.value)}
                                    placeholder="Cari nama kamar..."
                                    className="w-full pl-7 pr-2 py-1 rounded border border-gray-200 text-xs bg-white outline-none focus:border-emerald-400 placeholder-gray-400"
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {!selGedung
                            ? <div className="p-6 text-center text-xs text-gray-400">Pilih gedung</div>
                            : <>
                                {addingKamar && (
                                    <InlineAdd
                                        value={newKamarNama} onChange={setNewKamarNama}
                                        onConfirm={createKamar} placeholder="Nama kamar" loading={loading}
                                        extraInput={
                                            <input type="number" value={newKamarKap} onChange={e => setNewKamarKap(e.target.value)}
                                                placeholder="Kap" min={1}
                                                className="w-12 px-2 py-1 rounded border border-emerald-200 text-xs bg-white outline-none focus:border-emerald-400" />
                                        }
                                    />
                                )}
                                {kamarList.length === 0
                                    ? <div className="p-6 text-center text-xs text-gray-400">Belum ada kamar</div>
                                    : (
                                        <table className="w-full">
                                            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-500">
                                                        <button onClick={() => setSortKamar(s => ({ key: 'nama', dir: s.key === 'nama' && s.dir === 'asc' ? 'desc' : 'asc' }))}
                                                            className="flex items-center gap-1 hover:text-emerald-600 transition">
                                                            Nama
                                                            {sortKamar.key === 'nama' ? (sortKamar.dir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="opacity-30" />}
                                                        </button>
                                                    </th>
                                                    <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-500">
                                                        <button onClick={() => setSortKamar(s => ({ key: 'terisi', dir: s.key === 'terisi' && s.dir === 'asc' ? 'desc' : 'asc' }))}
                                                            className="flex items-center gap-1 hover:text-emerald-600 transition">
                                                            Terisi
                                                            {sortKamar.key === 'terisi' ? (sortKamar.dir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="opacity-30" />}
                                                        </button>
                                                    </th>
                                                    <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-500">Pembimbing</th>
                                                    {canEdit && <th className="px-3 py-1.5 text-center text-[10px] font-medium text-gray-500 w-10">Aksi</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {kamarList
                                                    .filter(k => !filterKamar || k.nama.toLowerCase().includes(filterKamar.toLowerCase()))
                                                    .sort((a, b) => {
                                                        const dir = sortKamar.dir === 'asc' ? 1 : -1;
                                                        if (sortKamar.key === 'terisi') {
                                                            return ((a._count?.santris ?? 0) - (b._count?.santris ?? 0)) * dir;
                                                        }
                                                        // Natural sort for nama: "1 AA" < "2 AA" < "10 AA"
                                                        return a.nama.localeCompare(b.nama, 'id', { numeric: true, sensitivity: 'base' }) * dir;
                                                    })
                                                    .map(k => {
                                                    const terisi = k._count?.santris ?? 0;
                                                    const kap = k.kapasitas ?? 0;
                                                    const pct = kap > 0 ? Math.min(100, (terisi / kap) * 100) : 0;
                                                    const isOver = kap > 0 && terisi > kap;
                                                    const isDragOver = dropTarget === k.id;
                                                    const pems = k.pembimbings || [];
                                                    return (
                                                        <tr key={k.id}
                                                            onDragOver={e => { e.preventDefault(); setDropTarget(k.id); }}
                                                            onDragLeave={() => setDropTarget(null)}
                                                            onDrop={e => { e.preventDefault(); handleDrop(k.id); }}
                                                            className={`border-b border-gray-100 transition group/row ${isDragOver ? 'bg-emerald-100 ring-1 ring-inset ring-emerald-400' : 'hover:bg-gray-50'}`}>
                                                            <td className="px-3 py-2 cursor-pointer" onClick={() => navigate(`/kamar/${k.id}`)}>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-xs font-medium text-gray-900 group-hover/row:text-emerald-700 transition">{k.nama}</span>
                                                                    <svg className="w-3 h-3 text-gray-300 group-hover/row:text-emerald-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <div className="flex items-center gap-1.5">
                                                                    {kap > 0 && (
                                                                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                            <div className={`h-full rounded-full ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                                                                        </div>
                                                                    )}
                                                                    <span className={`text-xs ${isOver ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                                                        {terisi}{kap > 0 ? `/${kap}` : ''}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                {pems.length > 0 ? (
                                                                    <div className="flex flex-col gap-1">
                                                                        {pems.map(pem => (
                                                                            <div key={pem.id} className="flex items-center gap-1">
                                                                                <span className="text-[10px] text-emerald-700 font-medium truncate max-w-[100px]">{pem.name}</span>
                                                                                {canEdit && (
                                                                                    <button onClick={() => removePembimbing(pem.id)}
                                                                                        className="text-gray-300 hover:text-red-500 text-[10px] transition opacity-0 group-hover/row:opacity-100">✕</button>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span className={`text-xs italic ${isDragOver ? 'text-emerald-600 font-medium' : 'text-gray-300'}`}>
                                                                        {isDragOver ? '↓ Lepas di sini' : 'Drop pembimbing'}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            {canEdit && (
                                                                <td className="px-3 py-2">
                                                                    <button onClick={() => setDeleteTarget({ type: 'kamar', id: k.id, nama: k.nama })}
                                                                        className="w-5 h-5 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover/row:opacity-100 mx-auto">
                                                                        <TrashIcon />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )
                                }
                            </>
                        }
                    </div>
                </div>

                {/* ── Panel 4: Pembimbing (drag source) ──────────────────────────── */}
                <div className="w-[190px] flex-shrink-0 flex flex-col">
                    <div className="px-3 py-2 border-b border-gray-200 bg-violet-600 flex-shrink-0">
                        <p className="text-xs font-semibold text-white">Pembimbing</p>
                        <p className="text-[10px] text-violet-300">Drag ke kamar untuk assign</p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {available.length > 0 && (
                            <>
                                <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tersedia ({available.length})</span>
                                </div>
                                {available.map(p => (
                                    <div key={p.id}
                                        draggable onDragStart={() => setDraggingUser(p.id)} onDragEnd={() => { setDraggingUser(null); setDropTarget(null); }}
                                        className={`flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 cursor-grab active:cursor-grabbing hover:bg-violet-50 transition group ${draggingUser === p.id ? 'opacity-50' : ''}`}>
                                        <GripVertical size={10} className="text-gray-300 group-hover:text-violet-400 flex-shrink-0" />
                                        <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                                            <span className="text-[9px] font-bold text-violet-700">{p.name.charAt(0)}</span>
                                        </div>
                                        <span className="text-xs text-gray-700 truncate flex-1">{p.name}</span>
                                    </div>
                                ))}
                            </>
                        )}
                        {assigned.length > 0 && (
                            <>
                                <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Ditugaskan ({assigned.length})</span>
                                </div>
                                {assigned.map(p => {
                                    const assignInfo = globalAssignMap.get(p.id);
                                    const isCurrentGedung = assignInfo && kamarList.find(k => k.id === assignInfo.kamarId);
                                    return (
                                        <div key={p.id} className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 group/sup">
                                            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                <span className="text-[9px] font-bold text-emerald-600">{p.name.charAt(0)}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-600 truncate">{p.name}</p>
                                                {assignInfo && (
                                                    <p className="text-[9px] text-gray-400 truncate">
                                                        {assignInfo.kamarNama}{!isCurrentGedung ? ' (gedung lain)' : ''}
                                                    </p>
                                                )}
                                            </div>
                                            {canEdit && assignInfo && (
                                                <button onClick={() => removePembimbing(p.id)}
                                                    className="w-4 h-4 text-emerald-300 hover:text-red-500 flex items-center justify-center transition text-[10px] opacity-0 group-hover/sup:opacity-100 flex-shrink-0">✕</button>
                                            )}
                                        </div>
                                    );
                                })}
                            </>
                        )}
                        {!pembimbingList.length && <div className="p-4 text-center text-xs text-gray-400 italic">Belum ada pembimbing</div>}
                    </div>
                </div>
            </div>

            {/* Rename Modal for Kompleks/Gedung */}
            {renaming && (
                <RenameModal
                    title={renaming.type === 'kompleks' ? 'Kompleks' : 'Gedung'}
                    initialValue={renaming.current}
                    onSave={v => renameItem(renaming.type, renaming.id, v)}
                    onClose={() => setRenaming(null)}
                />
            )}

            {/* ── Delete Modal ───────────────────────────────────────────────────── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                            <Trash2 size={22} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-gray-900">
                                Hapus {deleteTarget.type === 'kompleks' ? 'Kompleks' : deleteTarget.type === 'gedung' ? 'Gedung' : 'Kamar'}?
                            </h3>
                            <p className="text-sm font-semibold text-gray-800 mt-1">"{deleteTarget.nama}"</p>
                            <p className="text-xs text-gray-500 mt-2">{deleteDescriptions[deleteTarget.type]}</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                            <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition">Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
