import { useRef, useState } from 'react';
import api from '../lib/api';
import { X, Upload, Download, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';

interface ImportResult {
    success: number;
    skipped: number;
    errors: { row: number; reason: string }[];
}

interface Props {
    onClose: () => void;
    onImported: () => void;
}

export default function SantriImportModal({ onClose, onImported }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!f.name.match(/\.(xlsx|xls)$/i)) {
            setError('File harus berformat .xlsx atau .xls');
            return;
        }
        setFile(f);
        setError('');
        setResult(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) {
            if (!f.name.match(/\.(xlsx|xls)$/i)) { setError('File harus berformat .xlsx atau .xls'); return; }
            setFile(f);
            setError('');
            setResult(null);
        }
    };

    const handleImport = async () => {
        if (!file) return;
        setUploading(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/santri/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setResult(res.data.data);
            if (res.data.data.success > 0) onImported();
        } catch (e: any) {
            setError(e.response?.data?.message || 'Gagal mengimport file');
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const res = await api.get('/santri/import-template', { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'template-import-santri.xlsx';
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            setError('Gagal mengunduh template');
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <FileSpreadsheet size={16} className="text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Import Data Santri</h3>
                            <p className="text-[10px] text-gray-400 mt-0.5">Upload file Excel untuk import data massal</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 text-gray-400 hover:text-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-100 transition">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {/* Download Template */}
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <div>
                            <p className="text-xs font-semibold text-blue-800">Template Excel</p>
                            <p className="text-[10px] text-blue-500 mt-0.5">Tanggal format: DD/MM/YYYY · Gender: L atau P</p>
                        </div>
                        <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
                        >
                            <Download size={12} /> Unduh Template
                        </button>
                    </div>

                    {/* Drop Zone */}
                    {!result && (
                        <div
                            onDrop={handleDrop}
                            onDragOver={e => e.preventDefault()}
                            onClick={() => inputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${file ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                                }`}
                        >
                            <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
                            {file ? (
                                <div className="flex flex-col items-center gap-2">
                                    <FileSpreadsheet size={28} className="text-emerald-500" />
                                    <p className="text-sm font-semibold text-emerald-700">{file.name}</p>
                                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB · Klik untuk ganti</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Upload size={28} className="text-gray-300" />
                                    <p className="text-sm font-medium text-gray-500">Drag & drop file Excel di sini</p>
                                    <p className="text-xs text-gray-400">atau klik untuk pilih file (.xlsx, .xls)</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                            <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                                    <CheckCircle size={20} className="text-emerald-500 mx-auto mb-1" />
                                    <p className="text-lg font-bold text-emerald-700">{result.success}</p>
                                    <p className="text-[10px] text-emerald-500 font-medium">Berhasil diimport</p>
                                </div>
                                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-center">
                                    <AlertCircle size={20} className="text-orange-400 mx-auto mb-1" />
                                    <p className="text-lg font-bold text-orange-600">{result.skipped}</p>
                                    <p className="text-[10px] text-orange-500 font-medium">Dilewati</p>
                                </div>
                            </div>
                            {result.errors.length > 0 && (
                                <div className="border border-red-100 rounded-xl overflow-hidden">
                                    <div className="px-3 py-2 bg-red-50">
                                        <p className="text-xs font-semibold text-red-700">Detail Error ({result.errors.length} baris)</p>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto divide-y divide-gray-50">
                                        {result.errors.map((e, i) => (
                                            <div key={i} className="px-3 py-2 flex items-start gap-2">
                                                <span className="text-[10px] font-bold text-gray-400 shrink-0">Baris {e.row}</span>
                                                <span className="text-[10px] text-red-600">{e.reason}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-5 py-3 border-t border-gray-100">
                    {result ? (
                        <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white transition">
                            Selesai
                        </button>
                    ) : (
                        <>
                            <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                                Batal
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!file || uploading}
                                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white transition disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mengimport...</>
                                ) : (
                                    <><Upload size={14} /> Import</>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
