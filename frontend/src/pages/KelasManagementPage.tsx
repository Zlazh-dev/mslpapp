import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Jenjang, Tingkat, Kelas, User } from '../types';
import { useAuthStore } from '../stores/authStore';
import { Trash2, GripVertical, Pencil, X } from 'lucide-react';

type DeleteTarget = { type: 'jenjang' | 'tingkat' | 'kelas'; id: number; nama: string };

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
    loading?: boolean;
    extraInput?: React.ReactNode;
}
function InlineAdd({ value, onChange, onConfirm, placeholder, loading, extraInput }: InlineAddProps) {
    return (
        <div className="flex gap-1 p-2 border-b border-dashed border-blue-200 bg-blue-50/50">
            <input value={value} autoFocus onChange={e => onChange(e.target.value)} placeholder={placeholder}
                onKeyDown={e => e.key === 'Enter' && value && onConfirm()}
                className="flex-1 min-w-0 px-2 py-1 rounded border border-blue-200 text-xs bg-white outline-none focus:border-blue-400" />
            {extraInput}
            <button onClick={() => value && onConfirm()} disabled={!value || loading}
                className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium disabled:opacity-50 transition">OK</button>
        </div>
    );
}

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
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200" />
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                    <button onClick={() => val.trim() && onSave(val.trim())} disabled={!val.trim()}
                        className="flex-1 py-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50">Simpan</button>
                </div>
            </div>
        </div>
    );
}

export default function KelasManagementPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canEdit = user && ['ADMIN', 'STAF_MADRASAH'].includes(user.role);

    const [selJenjang, setSelJenjang] = useState<number | null>(null);
    const [selTingkat, setSelTingkat] = useState<number | null>(null);

    const [jenjangList, setJenjangList] = useState<Jenjang[]>([]);
    const [tingkatList, setTingkatList] = useState<Tingkat[]>([]);
    const [kelasList, setKelasList] = useState<Kelas[]>([]);
    const [waliList, setWaliList] = useState<User[]>([]);

    const [addingJenjang, setAddingJenjang] = useState(false);
    const [newJenjangNama, setNewJenjangNama] = useState('');
    const [addingTingkat, setAddingTingkat] = useState(false);
    const [newTingkatNama, setNewTingkatNama] = useState('');
    const [addingKelas, setAddingKelas] = useState(false);
    const [newKelasNama, setNewKelasNama] = useState('');
    const [newKelasTahun, setNewKelasTahun] = useState('');

    const [draggingUser, setDraggingUser] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<number | null>(null);

    // Global map: userId -> { kelasId, kelasNama } across ALL tingkats
    const [globalWaliMap, setGlobalWaliMap] = useState<Map<string, { kelasId: number; kelasNama: string }>>(new Map());

    const [renaming, setRenaming] = useState<{ type: 'jenjang' | 'tingkat'; id: number; current: string } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const showMsg = (msg: string) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000); };
    const showErr = (msg: string) => { setError(msg); setTimeout(() => setError(''), 4000); };

    const fetchJenjang = async () => { const r = await api.get('/jenjang'); setJenjangList(r.data.data); };
    const fetchTingkat = async (jenjangId: number) => { const r = await api.get('/tingkat', { params: { jenjangId } }); setTingkatList(r.data.data); };
    const fetchKelas = async (tingkatId: number) => { const r = await api.get('/kelas', { params: { tingkatId } }); setKelasList(r.data.data); };
    const fetchWali = async () => {
        const r = await api.get('/users', { params: { limit: 200 } });
        setWaliList((r.data.data as User[]).filter((u: User) => u.role === 'WALI_KELAS'));
    };

    // Fetch ALL kelas globally to build accurate wali assignment map
    const fetchAllWaliAssignments = async () => {
        try {
            const r = await api.get('/kelas');
            const allKelas: { id: number; nama: string; waliKelasId: string | null }[] = r.data.data;
            const map = new Map<string, { kelasId: number; kelasNama: string }>();
            allKelas.forEach(k => { if (k.waliKelasId) map.set(k.waliKelasId, { kelasId: k.id, kelasNama: k.nama }); });
            setGlobalWaliMap(map);
        } catch { /* ignore */ }
    };

    useEffect(() => { fetchJenjang(); fetchWali(); fetchAllWaliAssignments(); }, []);
    useEffect(() => { if (selJenjang) fetchTingkat(selJenjang); else setTingkatList([]); setSelTingkat(null); }, [selJenjang]);
    useEffect(() => { if (selTingkat) fetchKelas(selTingkat); else setKelasList([]); }, [selTingkat]);

    const createJenjang = async () => {
        if (!newJenjangNama.trim()) return;
        setLoading(true);
        try {
            const r = await api.post('/jenjang', { nama: newJenjangNama });
            showMsg(`Jenjang "${r.data.data.nama}" dibuat`);
            setAddingJenjang(false); setNewJenjangNama('');
            await fetchJenjang(); setSelJenjang(r.data.data.id);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal'); }
        finally { setLoading(false); }
    };

    const createTingkat = async () => {
        if (!newTingkatNama.trim() || !selJenjang) return;
        setLoading(true);
        try {
            const r = await api.post('/tingkat', { nama: newTingkatNama, jenjangId: selJenjang });
            showMsg(`Tingkat "${r.data.data.nama}" dibuat`);
            setAddingTingkat(false); setNewTingkatNama('');
            await fetchTingkat(selJenjang); setSelTingkat(r.data.data.id);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal'); }
        finally { setLoading(false); }
    };

    const createKelas = async () => {
        if (!newKelasNama.trim() || !selTingkat) return;
        setLoading(true);
        try {
            await api.post('/kelas', { nama: newKelasNama, tingkatId: selTingkat, tahunAjaran: newKelasTahun || undefined });
            showMsg('Kelas berhasil dibuat');
            setAddingKelas(false); setNewKelasNama(''); setNewKelasTahun('');
            await fetchKelas(selTingkat);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal'); }
        finally { setLoading(false); }
    };

    const assignWali = async (kelasId: number, userId: string) => {
        try {
            await api.patch(`/kelas/${kelasId}`, { waliKelasId: userId });
            showMsg('Wali kelas berhasil di-assign');
            if (selTingkat) await fetchKelas(selTingkat);
            await Promise.all([fetchWali(), fetchAllWaliAssignments()]);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal'); }
    };

    const removeWali = async (kelasId: number) => {
        try {
            await api.patch(`/kelas/${kelasId}`, { waliKelasId: null });
            showMsg('Wali kelas berhasil dihapus');
            if (selTingkat) await fetchKelas(selTingkat);
            await Promise.all([fetchWali(), fetchAllWaliAssignments()]);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal'); }
    };

    const renameItem = async (type: 'jenjang' | 'tingkat', id: number, nama: string) => {
        try {
            await api.patch(`/${type}/${id}`, { nama });
            showMsg('Nama berhasil diperbarui');
            setRenaming(null);
            if (type === 'jenjang') await fetchJenjang();
            else if (type === 'tingkat' && selJenjang) await fetchTingkat(selJenjang);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal'); }
    };

    const handleDrop = (kelasId: number) => {
        if (!draggingUser) return;
        assignWali(kelasId, draggingUser);
        setDraggingUser(null); setDropTarget(null);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            if (deleteTarget.type === 'jenjang') {
                await api.delete(`/jenjang/${deleteTarget.id}`);
                if (selJenjang === deleteTarget.id) setSelJenjang(null);
                await fetchJenjang();
            } else if (deleteTarget.type === 'tingkat') {
                await api.delete(`/tingkat/${deleteTarget.id}`);
                if (selTingkat === deleteTarget.id) setSelTingkat(null);
                if (selJenjang) await fetchTingkat(selJenjang);
            } else {
                await api.delete(`/kelas/${deleteTarget.id}`);
                if (selTingkat) await fetchKelas(selTingkat);
                await fetchWali();
            }
            showMsg(`"${deleteTarget.nama}" berhasil dihapus`);
            setDeleteTarget(null);
        } catch (e: any) { showErr(e.response?.data?.message || 'Gagal menghapus'); setDeleteTarget(null); }
    };

    // Use global wali assignment map for accurate available/assigned split
    const available = waliList.filter(w => !globalWaliMap.has(w.id));
    const assigned = waliList.filter(w => globalWaliMap.has(w.id));

    const deleteDescriptions: Record<string, string> = {
        jenjang: 'Semua tingkat dan kelas di dalamnya akan ikut dihapus.',
        tingkat: 'Semua kelas di tingkat ini akan ikut dihapus.',
        kelas: 'Santri di kelas ini tidak akan terhapus.',
    };

    return (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
            <div className="mb-3 flex-shrink-0">
                <h1 className="text-sm font-bold text-gray-900">Manajemen Kelas</h1>
                <p className="text-xs text-gray-500 mt-0.5">Kelola Jenjang → Tingkat → Kelas, assign wali kelas via drag & drop</p>
            </div>

            {success && <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 flex-shrink-0">{success}</div>}
            {error && <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 flex-shrink-0">{error}</div>}

            <div className="flex flex-1 min-h-0 bg-white rounded-xl border border-gray-200 overflow-hidden">

                {/* Panel 1: Jenjang */}
                <div className="w-[170px] flex-shrink-0 border-r border-gray-200 flex flex-col">
                    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
                        <span className="text-xs font-semibold text-gray-700">Jenjang</span>
                        {canEdit && (
                            <button onClick={() => setAddingJenjang(v => !v)} className="w-5 h-5 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center transition"><PlusIcon /></button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {addingJenjang && <InlineAdd value={newJenjangNama} onChange={setNewJenjangNama} onConfirm={createJenjang} placeholder="Nama jenjang" loading={loading} />}
                        {jenjangList.map(j => (
                            <div key={j.id} onClick={() => { if (!renaming) setSelJenjang(j.id); }}
                                className={`flex items-center gap-1 px-3 py-2 border-b border-gray-100 cursor-pointer group/row transition ${selJenjang === j.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                <span className={`text-xs font-medium flex-1 truncate ${selJenjang === j.id ? 'text-blue-700' : 'text-gray-800'}`}>{j.nama}</span>
                                {canEdit && (
                                    <>
                                        <button onClick={e => { e.stopPropagation(); setRenaming({ type: 'jenjang', id: j.id, current: j.nama }); }}
                                            className="w-5 h-5 flex-shrink-0 text-gray-400 hover:text-blue-600 rounded flex items-center justify-center transition opacity-0 group-hover/row:opacity-100"><Pencil size={10} /></button>
                                        <button onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'jenjang', id: j.id, nama: j.nama }); }}
                                            className="w-5 h-5 flex-shrink-0 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover/row:opacity-100"><TrashIcon /></button>
                                    </>
                                )}
                            </div>
                        ))}
                        {!jenjangList.length && <div className="p-4 text-center text-xs text-gray-400">Belum ada jenjang</div>}
                    </div>
                </div>

                {/* Panel 2: Tingkat */}
                <div className="w-[170px] flex-shrink-0 border-r border-gray-200 flex flex-col">
                    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
                        <span className="text-xs font-semibold text-gray-700">Tingkat</span>
                        {canEdit && selJenjang && (
                            <button onClick={() => setAddingTingkat(v => !v)} className="w-5 h-5 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center transition"><PlusIcon /></button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {!selJenjang ? <div className="p-4 text-center text-xs text-gray-400">Pilih jenjang</div> : <>
                            {addingTingkat && <InlineAdd value={newTingkatNama} onChange={setNewTingkatNama} onConfirm={createTingkat} placeholder="Nama tingkat" loading={loading} />}
                            {tingkatList.map(t => (
                                <div key={t.id} onClick={() => { if (!renaming) setSelTingkat(t.id); }}
                                    className={`flex items-center gap-1 px-3 py-2 border-b border-gray-100 cursor-pointer group/row transition ${selTingkat === t.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                    <span className={`text-xs font-medium flex-1 truncate ${selTingkat === t.id ? 'text-blue-700' : 'text-gray-800'}`}>{t.nama}</span>
                                    {canEdit && (
                                        <>
                                            <button onClick={e => { e.stopPropagation(); setRenaming({ type: 'tingkat', id: t.id, current: t.nama }); }}
                                                className="w-5 h-5 flex-shrink-0 text-gray-400 hover:text-blue-600 rounded flex items-center justify-center transition opacity-0 group-hover/row:opacity-100"><Pencil size={10} /></button>
                                            <button onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'tingkat', id: t.id, nama: t.nama }); }}
                                                className="w-5 h-5 flex-shrink-0 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover/row:opacity-100"><TrashIcon /></button>
                                        </>
                                    )}
                                </div>
                            ))}
                            {!tingkatList.length && <div className="p-4 text-center text-xs text-gray-400">Belum ada tingkat</div>}
                        </>}
                    </div>
                </div>

                {/* Panel 3: Kelas */}
                <div className="flex-1 border-r border-gray-200 flex flex-col min-w-0">
                    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
                        <span className="text-xs font-semibold text-gray-700">Kelas</span>
                        {canEdit && selTingkat && (
                            <button onClick={() => setAddingKelas(v => !v)} className="w-5 h-5 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center transition"><PlusIcon /></button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {!selTingkat ? <div className="p-6 text-center text-xs text-gray-400">Pilih tingkat</div> : <>
                            {addingKelas && (
                                <InlineAdd value={newKelasNama} onChange={setNewKelasNama} onConfirm={createKelas} placeholder="Nama kelas" loading={loading}
                                    extraInput={
                                        <input value={newKelasTahun} onChange={e => setNewKelasTahun(e.target.value)} placeholder="Tahun ajaran"
                                            className="w-24 px-2 py-1 rounded border border-blue-200 text-xs bg-white outline-none focus:border-blue-400" />
                                    }
                                />
                            )}
                            {kelasList.length === 0
                                ? <div className="p-6 text-center text-xs text-gray-400">Belum ada kelas</div>
                                : (
                                    <table className="w-full">
                                        <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-500">Nama</th>
                                                <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-500">Thn Ajaran</th>
                                                <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-500">Santri</th>
                                                <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-500">Wali Kelas</th>
                                                {canEdit && <th className="px-3 py-1.5 w-10"></th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {kelasList.map(k => {
                                                const isDragOver = dropTarget === k.id;
                                                const wali = waliList.find(w => w.id === k.waliKelasId);
                                                return (
                                                    <tr key={k.id}
                                                        onDragOver={e => { e.preventDefault(); setDropTarget(k.id); }}
                                                        onDragLeave={() => setDropTarget(null)}
                                                        onDrop={e => { e.preventDefault(); handleDrop(k.id); }}
                                                        className={`border-b border-gray-100 transition group/row ${isDragOver ? 'bg-blue-100 ring-1 ring-inset ring-blue-400' : 'hover:bg-gray-50'}`}>
                                                        <td className="px-3 py-2 cursor-pointer" onClick={() => navigate(`/kelas/${k.id}`)}>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs font-medium text-gray-900 group-hover/row:text-blue-700 transition">{k.nama}</span>
                                                                <svg className="w-3 h-3 text-gray-300 group-hover/row:text-blue-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <span className="text-xs text-gray-500">{k.tahunAjaran || '—'}</span>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <span className="text-xs text-gray-500">{k._count?.santris ?? 0}</span>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {wali ? (
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-xs text-blue-700 font-medium truncate max-w-[100px]">{wali.name}</span>
                                                                    {canEdit && <button onClick={() => removeWali(k.id)} className="text-gray-300 hover:text-red-500 text-[10px] transition opacity-0 group-hover/row:opacity-100">✕</button>}
                                                                </div>
                                                            ) : (
                                                                <span className={`text-xs italic ${isDragOver ? 'text-blue-600 font-medium' : 'text-gray-300'}`}>
                                                                    {isDragOver ? '↓ Lepas di sini' : 'Drop wali kelas'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        {canEdit && (
                                                            <td className="px-3 py-2">
                                                                <button onClick={() => setDeleteTarget({ type: 'kelas', id: k.id, nama: k.nama })}
                                                                    className="w-5 h-5 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover/row:opacity-100 mx-auto"><TrashIcon /></button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )
                            }
                        </>}
                    </div>
                </div>

                {/* Panel 4: Wali Kelas (drag source) */}
                <div className="w-[190px] flex-shrink-0 flex flex-col">
                    <div className="px-3 py-2 border-b border-gray-200 bg-blue-700 flex-shrink-0">
                        <p className="text-xs font-semibold text-white">Wali Kelas</p>
                        <p className="text-[10px] text-blue-300">Drag ke kelas untuk assign</p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {available.length > 0 && <>
                            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tersedia ({available.length})</span>
                            </div>
                            {available.map(w => (
                                <div key={w.id} draggable
                                    onDragStart={() => setDraggingUser(w.id)}
                                    onDragEnd={() => { setDraggingUser(null); setDropTarget(null); }}
                                    className={`flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 cursor-grab active:cursor-grabbing hover:bg-blue-50 transition group ${draggingUser === w.id ? 'opacity-50' : ''}`}>
                                    <GripVertical size={10} className="text-gray-300 group-hover:text-blue-400 flex-shrink-0" />
                                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-[9px] font-bold text-blue-700">{w.name.charAt(0)}</span>
                                    </div>
                                    <span className="text-xs text-gray-700 truncate flex-1">{w.name}</span>
                                </div>
                            ))}
                        </>}
                        {assigned.length > 0 && <>
                            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Ditugaskan ({assigned.length})</span>
                            </div>
                            {assigned.map(w => {
                                const kelasnya = kelasList.find(k => k.waliKelasId === w.id);
                                return (
                                    <div key={w.id} className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 group/wali">
                                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                            <span className="text-[9px] font-bold text-blue-600">{w.name.charAt(0)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-gray-600 truncate">{w.name}</p>
                                            {globalWaliMap.has(w.id) && (
                                                <p className="text-[9px] text-gray-400 truncate">
                                                    {globalWaliMap.get(w.id)?.kelasNama}
                                                    {kelasList.find(k => k.id === globalWaliMap.get(w.id)?.kelasId) ? '' : ' (tingkat lain)'}
                                                </p>
                                            )}
                                        </div>
                                        {canEdit && globalWaliMap.has(w.id) && (
                                            <button onClick={() => removeWali(globalWaliMap.get(w.id)!.kelasId)}
                                                className="w-4 h-4 text-blue-300 hover:text-red-500 flex items-center justify-center transition text-[10px] opacity-0 group-hover/wali:opacity-100 flex-shrink-0">✕</button>
                                        )}
                                    </div>
                                );
                            })}
                        </>}
                        {!waliList.length && <div className="p-4 text-center text-xs text-gray-400 italic">Belum ada wali kelas</div>}
                    </div>
                </div>
            </div>

            {/* Rename Modal for Jenjang/Tingkat */}
            {renaming && (
                <RenameModal
                    title={renaming.type === 'jenjang' ? 'Jenjang' : 'Tingkat'}
                    initialValue={renaming.current}
                    onSave={v => renameItem(renaming.type, renaming.id, v)}
                    onClose={() => setRenaming(null)}
                />
            )}

            {/* Delete Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                            <Trash2 size={22} className="text-red-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-gray-900">
                                Hapus {deleteTarget.type === 'jenjang' ? 'Jenjang' : deleteTarget.type === 'tingkat' ? 'Tingkat' : 'Kelas'}?
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
