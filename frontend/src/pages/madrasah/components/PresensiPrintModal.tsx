import { useState, useEffect } from 'react';
import { X, Loader2, Download, AlertCircle } from 'lucide-react';
import api from '../../../lib/api';

interface PresensiPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    kelasId: string;
}

export function PresensiPrintModal({ isOpen, onClose, kelasId }: PresensiPrintModalProps) {
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            api.get('/settings/print-templates')
                .then(res => {
                    const parsed = JSON.parse(res.data.data.value || '[]');
                    // We can just show all templates, or those containing a table
                    setTemplates(parsed);
                    if (parsed.length > 0) setSelectedTemplate(parsed[0]);
                })
                .catch(err => {
                    setError('Gagal memuat template');
                })
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        if (!selectedTemplate) return;

        setGenerating(true);
        setError('');

        try {
            // Need to convert template.elements -> konva JSON
            const konvaModule = await import('../../pengaturan-cetak/utils/konvaExporter');
            const konvaJson = konvaModule.exportToKonvaJson(selectedTemplate.elements);
            
            const body = {
                konvaJson,
                kelasId: Number(kelasId)
            };

            const res = await api.post('/pdf/presensi/kelas', body, { responseType: 'blob' });
            
            // Create download link
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Presensi_Kelas_${kelasId}.pdf`;
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Cetak Presensi Kelas</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Pilih template desain yang mengandung tabel presensi</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">Pilih Template</label>
                        {loading ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-gray-400" /></div>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {templates.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelectedTemplate(t)}
                                        className={`w-full text-left px-4 py-3 border rounded-xl flex items-center justify-between transition ${
                                            selectedTemplate?.id === t.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="font-semibold text-sm text-gray-800">{t.name}</div>
                                        {t.isDefault && <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-bold">Default</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-700">{error}</p>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition">
                        Batal
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={!selectedTemplate || generating}
                        className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                    >
                        {generating ? <><Loader2 size={16} className="animate-spin" /> Memproses...</> : <><Download size={16} /> Cetak PDF</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
