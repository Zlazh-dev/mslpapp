import { useState, useEffect } from 'react';
import { X, Loader2, Printer, AlertCircle, ChevronRight } from 'lucide-react';
import api from '../../../lib/api';

interface JadwalPrintPanelProps {
    isOpen: boolean;
    onClose: () => void;
    kelasId: number;
    kelasName: string;
    hari?: number;
}

export function JadwalPrintPanel({ isOpen, onClose, kelasId, kelasName, hari }: JadwalPrintPanelProps) {
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            api.get('/settings/CETAK_TEMPLATES')
                .then(res => {
                    const data = res.data?.data;
                    const parsed = Array.isArray(data) ? data : [];
                    setTemplates(parsed);
                    if (parsed.length > 0) setSelectedTemplate(parsed[0]);
                })
                .catch(() => {
                    setError('Gagal memuat template');
                })
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    const buildFilename = () => {
        const templatePart = selectedTemplate?.name || 'Jadwal';
        const kelasPart = kelasName || `Kelas_${kelasId}`;
        const now = new Date();
        const datePart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9\u00C0-\u024F\u0600-\u06FF]/g, '_').replace(/_+/g, '_');
        return `${sanitize(templatePart)}_${sanitize(kelasPart)}_${datePart}.pdf`;
    };

    const handleGenerate = async () => {
        if (!selectedTemplate) return;

        setGenerating(true);
        setError('');

        try {
            const konvaModule = await import('../../pengaturan-cetak/utils/konvaExporter');
            const konvaJson = konvaModule.exportToKonvaJson(selectedTemplate.elements);
            
            const body: any = {
                konvaJson,
                kelasId,
            };
            if (hari) body.hari = hari;

            const res = await api.post('/pdf/jadwal/kelas', body, { responseType: 'blob' });
            
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            
            const printWindow = window.open(url, '_blank');
            if (printWindow) {
                printWindow.addEventListener('load', () => {
                    setTimeout(() => {
                        printWindow.print();
                    }, 500);
                });
                const filename = buildFilename().replace('.pdf', '');
                printWindow.document.title = filename;
            } else {
                const a = document.createElement('a');
                a.href = url;
                a.download = buildFilename();
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }

            setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        } catch (err: any) {
            console.error('Jadwal print error:', err);
            setError(err.response?.data?.message || 'Gagal mencetak PDF dari server.');
        } finally {
            setGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[250] transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
                onClick={handleClose}
            />
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[251] flex flex-col transition-transform duration-200 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Printer size={18} className="text-teal-600" />
                            Cetak Jadwal
                        </h2>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <ChevronRight size={10} className="text-gray-300" />
                            {kelasName}
                        </p>
                    </div>
                    <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Pilih Template</label>
                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-300" size={24} /></div>
                        ) : templates.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-sm text-gray-400">Belum ada template</p>
                                <p className="text-xs text-gray-300 mt-1">Buat template di Pengaturan → Cetak</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {templates.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelectedTemplate(t)}
                                        className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center justify-between transition group ${
                                            selectedTemplate?.id === t.id
                                                ? 'bg-teal-50 border border-teal-200 ring-1 ring-teal-100'
                                                : 'border border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${selectedTemplate?.id === t.id ? 'bg-teal-500' : 'bg-gray-200'}`} />
                                            <span className={`text-sm font-medium ${selectedTemplate?.id === t.id ? 'text-teal-700' : 'text-gray-700'}`}>{t.name}</span>
                                        </div>
                                        {t.isDefault && <span className="text-[9px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">Default</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedTemplate && (
                        <div className="bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">Nama File</p>
                            <p className="text-[11px] text-gray-600 font-mono mt-1 break-all leading-relaxed">{buildFilename()}</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                            <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-600">{error}</p>
                        </div>
                    )}
                </div>

                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-2 shrink-0">
                    <button onClick={handleClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition">
                        Batal
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={!selectedTemplate || generating}
                        className="flex-1 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {generating ? <><Loader2 size={15} className="animate-spin" /> Memproses...</> : <><Printer size={15} /> Cetak</>}
                    </button>
                </div>
            </div>
        </>
    );
}
