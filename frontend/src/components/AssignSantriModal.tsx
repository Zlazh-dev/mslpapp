import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../lib/api';
import { Santri } from '../types';
import { Search, X, UserPlus, Check } from 'lucide-react';

interface Props {
    /** 'kamar' or 'kelas' */
    type: 'kamar' | 'kelas';
    /** ID of the kamar/kelas to assign to */
    targetId: number;
    targetName: string;
    onClose: () => void;
    onAssigned: () => void;
    accentColor?: 'emerald' | 'blue';
}

export default function AssignSantriModal({ type, targetId, targetName, onClose, onAssigned, accentColor = 'emerald' }: Props) {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Santri[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [savedCount, setSavedCount] = useState(0);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const inputRef = useRef<HTMLInputElement>(null);

    const accent = accentColor === 'blue' ? {
        btn: 'bg-blue-600 hover:bg-blue-700',
        ring: 'focus:border-blue-400 focus:ring-blue-200',
        check: 'bg-blue-600 border-blue-600',
        badge: 'bg-blue-50 text-blue-700',
    } : {
        btn: 'bg-emerald-600 hover:bg-emerald-700',
        ring: 'focus:border-emerald-400 focus:ring-emerald-200',
        check: 'bg-emerald-600 border-emerald-600',
        badge: 'bg-emerald-50 text-emerald-700',
    };

    const doSearch = useCallback((q: string) => {
        if (!q.trim()) { setResults([]); return; }
        setSearching(true);
        // Search santri NOT already in this kamar/kelas + active
        const excludeParam = type === 'kamar' ? { kamarId: 'none' } : { kelasId: 'none' };
        api.get('/santri', {
            params: { search: q, limit: 30, status: 'ACTIVE' },
        }).then(r => {
            const all: Santri[] = r.data.data ?? [];
            // Filter out ones already assigned to this target
            const filtered = all.filter(s => {
                if (type === 'kamar') return s.kamarId !== targetId;
                return s.kelasId !== targetId;
            });
            setResults(filtered);
        }).catch(() => setResults([])).finally(() => setSearching(false));
    }, [type, targetId]);

    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(search), 300);
    }, [search, doSearch]);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 80);
    }, []);

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleAssign = async () => {
        if (selected.size === 0) return;
        setSaving(true);
        setError('');
        try {
            const ids = Array.from(selected);
            await Promise.all(ids.map(santriId =>
                api.put(`/santri/${santriId}`, type === 'kamar' ? { kamarId: targetId } : { kelasId: targetId })
            ));
            setSavedCount(ids.length);
            setTimeout(() => { onAssigned(); onClose(); }, 800);
        } catch (e: any) {
            setError(e.response?.data?.message || 'Gagal meng-assign santri');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentColor === 'blue' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                            <UserPlus size={16} className={accentColor === 'blue' ? 'text-blue-600' : 'text-emerald-600'} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Assign Santri</h3>
                            <p className="text-[10px] text-gray-400 mt-0.5">ke {type === 'kamar' ? 'Kamar' : 'Kelas'} <span className="font-medium text-gray-600">{targetName}</span></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 text-gray-400 hover:text-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-100 transition">
                        <X size={16} />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 pt-3 pb-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            ref={inputRef}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Ketik NIS atau nama santri..."
                            className={`w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-1 ${accent.ring} transition`}
                        />
                    </div>
                    {selected.size > 0 && (
                        <div className="flex items-center justify-between mt-2">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${accent.badge}`}>
                                {selected.size} santri dipilih
                            </span>
                            <button onClick={() => setSelected(new Set())} className="text-[11px] text-gray-400 hover:text-red-500 transition">
                                Batal pilih semua
                            </button>
                        </div>
                    )}
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-[120px]">
                    {!search.trim() ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <Search size={28} className="text-gray-200 mb-2" />
                            <p className="text-xs">Ketik NIS atau nama untuk mencari santri</p>
                        </div>
                    ) : searching ? (
                        <div className="flex items-center justify-center py-10 text-gray-400 text-sm">Mencari...</div>
                    ) : results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <p className="text-xs">Tidak ada santri yang ditemukan</p>
                            <p className="text-[10px] mt-1 text-gray-300">Coba kata kunci lain atau santri mungkin sudah di {type} ini</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {results.map(s => {
                                const isSelected = selected.has(s.id);
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => toggle(s.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition text-left ${isSelected
                                            ? accentColor === 'blue' ? 'border-blue-200 bg-blue-50' : 'border-emerald-200 bg-emerald-50'
                                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        {/* Checkbox */}
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${isSelected ? accent.check : 'border-gray-300 bg-white'}`}>
                                            {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                                        </div>
                                        {/* Avatar */}
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0">
                                            <span className="text-xs font-bold text-gray-500">{s.namaLengkap.charAt(0).toUpperCase()}</span>
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-800 truncate">{s.namaLengkap}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-mono text-gray-400">{s.nis}</span>
                                                {s.jenjangPendidikan && (
                                                    <span className="text-[10px] text-gray-400">· {s.jenjangPendidikan}</span>
                                                )}
                                                {type === 'kamar' && s.kelas && (
                                                    <span className="text-[10px] text-gray-400">· {s.kelas.nama}</span>
                                                )}
                                                {type === 'kelas' && s.kamar && (
                                                    <span className="text-[10px] text-gray-400">· Kamar {s.kamar.nama}</span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Current assignment */}
                                        {type === 'kamar' && s.kamarId && (
                                            <span className="text-[9px] bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded font-medium shrink-0">Pindah kamar</span>
                                        )}
                                        {type === 'kelas' && s.kelasId && (
                                            <span className="text-[9px] bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded font-medium shrink-0">Pindah kelas</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {error && <p className="mx-4 mb-2 text-xs text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
                {savedCount > 0 && (
                    <p className="mx-4 mb-2 text-xs text-emerald-600 bg-emerald-50 rounded px-3 py-2 flex items-center gap-1.5">
                        <Check size={13} /> {savedCount} santri berhasil di-assign!
                    </p>
                )}
                <div className="flex gap-3 px-4 py-3 border-t border-gray-100">
                    <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                    <button
                        onClick={handleAssign}
                        disabled={selected.size === 0 || saving}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-40 ${accent.btn}`}
                    >
                        {saving ? 'Menyimpan...' : `Assign ${selected.size > 0 ? `(${selected.size})` : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
