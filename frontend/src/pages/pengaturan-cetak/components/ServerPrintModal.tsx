import { useState, useEffect, useCallback } from 'react';
import { X, Search, FileText, GraduationCap, Loader2, Download, AlertCircle } from 'lucide-react';
import api from '../../../lib/api';
import { CanvasElement } from '../types';
import { exportToKonvaJson } from '../utils/konvaExporter';

interface Santri {
    id: string;
    nis: string;
    namaLengkap: string;
    kelas?: { nama: string } | null;
    kamar?: { nama: string; gedung?: { nama: string } } | null;
}

type PrintType = 'biodata' | 'nilai';

interface ServerPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    elements: CanvasElement[];
}

export function ServerPrintModal({ isOpen, onClose, elements }: ServerPrintModalProps) {
    const [search, setSearch] = useState('');
    const [santriList, setSantriList] = useState<Santri[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<Santri | null>(null);
    const [printType, setPrintType] = useState<PrintType>('biodata');
    const [semester, setSemester] = useState('');
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    // Fetch santri list
    const fetchSantri = useCallback(async (q: string) => {
        setLoading(true);
        try {
            const res = await api.get('/santri', { params: { search: q, limit: 50, status: 'ACTIVE' } });
            setSantriList(res.data.data || []);
        } catch {
            setSantriList([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchSantri('');
            setSelected(null);
            setError('');
        }
    }, [isOpen, fetchSantri]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen) fetchSantri(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search, isOpen, fetchSantri]);

    const handleGenerate = async () => {
        if (!selected) return;

        setGenerating(true);
        setError('');

        try {
            const konvaJson = exportToKonvaJson(elements);
            const endpoint = printType === 'biodata' ? '/pdf/biodata' : '/pdf/nilai';

            const body: any = {
                konvaJson,
                santriId: selected.id,
                qrFields: ['qr_data', 'qr_nis'],
            };

            if (printType === 'nilai' && semester) {
                body.semester = semester;
            }

            const res = await api.post(endpoint, body, { responseType: 'blob' });
            
            // Create download link
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${printType}_${selected.nis}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error('Server print error:', err);
            setError(err.response?.data?.message || 'Gagal mencetak PDF dari server. Pastikan server berjalan.');
        } finally {
            setGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Cetak Data</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Pilih santri dan jenis dokumen untuk dicetak</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Step 1: Select Santri */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">1. Pilih Santri</label>
                        
                        {selected ? (
                            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                <div>
                                    <p className="text-sm font-semibold text-emerald-800">{selected.namaLengkap}</p>
                                    <p className="text-xs text-emerald-600">NIS: {selected.nis} • {selected.kelas?.nama || 'Tanpa Kelas'}</p>
                                </div>
                                <button onClick={() => setSelected(null)} className="text-xs text-emerald-600 hover:text-red-500 font-medium transition">
                                    Ganti
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="relative mb-2">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Cari nama atau NIS..."
                                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-gray-50 focus:bg-white transition"
                                        autoFocus
                                    />
                                </div>

                                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                                    {loading ? (
                                        <div className="flex items-center justify-center py-6">
                                            <Loader2 size={18} className="animate-spin text-gray-400" />
                                        </div>
                                    ) : santriList.length === 0 ? (
                                        <div className="py-6 text-center text-xs text-gray-400">Tidak ditemukan</div>
                                    ) : (
                                        santriList.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => setSelected(s)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition text-left"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-xs font-bold text-blue-700">{s.namaLengkap.charAt(0)}</span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-gray-800 truncate">{s.namaLengkap}</p>
                                                    <p className="text-[10px] text-gray-500">{s.nis} • {s.kelas?.nama || '-'}</p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Step 2: Print Type */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">2. Jenis Dokumen</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setPrintType('biodata')}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                                    printType === 'biodata'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <FileText size={22} />
                                <span className="text-xs font-semibold">Biodata</span>
                            </button>
                            <button
                                onClick={() => setPrintType('nilai')}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                                    printType === 'nilai'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <GraduationCap size={22} />
                                <span className="text-xs font-semibold">Nilai</span>
                            </button>
                        </div>

                        {printType === 'nilai' && (
                            <div className="mt-3">
                                <label className="block text-[10px] font-medium text-gray-500 mb-1">Semester (opsional)</label>
                                <input
                                    value={semester}
                                    onChange={e => setSemester(e.target.value)}
                                    placeholder="Contoh: Ganjil 2025/2026"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400"
                                />
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-700">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition">
                        Batal
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={!selected || generating}
                        className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {generating ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Memproses...
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                Cetak PDF
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
