import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
    Download, Upload, Shield, AlertTriangle, CheckCircle2,
    FileJson, ArrowLeft, Loader2, RefreshCw, Database
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

type ImportStatus = 'idle' | 'loading' | 'success' | 'error';

export default function BackupDataPage() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [exportLoading, setExportLoading] = useState(false);
    const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
    const [importReport, setImportReport] = useState<Record<string, number> | null>(null);
    const [importError, setImportError] = useState('');
    const [importWarnings, setImportWarnings] = useState<string[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [alertModal, setAlertModal] = useState({ show: false, message: '' });

    const handleExport = async () => {
        setExportLoading(true);
        const token = useAuthStore.getState().token;
        
        if (!token) {
            setAlertModal({ show: true, message: 'Harap masuk kembali ke akun Anda.' });
            setExportLoading(false);
            return;
        }

        try {
            const response = await api.get('/backup/export', {
                responseType: 'blob', // Important for file download
            });

            // Extract filename from content-disposition header if available
            const contentDisposition = response.headers['content-disposition'];
            let filename = `mslpapp_backup_${new Date().toISOString().slice(0, 10)}.zip`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) {
                    filename = match[1];
                }
            }

            // Create a Blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Backup export failed:', error);
            
            // Handle blob error response
            if (error.response && error.response.data instanceof Blob) {
                const text = await error.response.data.text();
                try {
                    const errorData = JSON.parse(text);
                    setAlertModal({ show: true, message: errorData.message || 'Gagal mengunduh backup.' });
                } catch (e) {
                    setAlertModal({ show: true, message: 'Gagal mengunduh backup.' });
                }
            } else {
                setAlertModal({ 
                    show: true, 
                    message: error.response?.data?.message || 'Gagal mengunduh backup.' 
                });
            }
        } finally {
            setExportLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setImportStatus('idle');
        setImportReport(null);
        setImportError('');
    };

    const handleImport = async () => {
        if (!selectedFile) return;
        setConfirmOpen(false);
        setImportStatus('loading');
        setImportReport(null);
        setImportError('');

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            
            const res = await api.post('/backup/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setImportReport(res.data.report);
            setImportWarnings(res.data.sampleErrors || []);
            setImportStatus('success');
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Gagal mengimpor backup.';
            setImportError(msg);
            setImportStatus('error');
        }
    };

    const tableLabels: Record<string, string> = {
        santri: 'Data Santri',
        kamar: 'Data Kamar',
        kelas: 'Data Kelas',
        kompleks: 'Kompleks',
        gedung: 'Gedung',
        jenjang: 'Jenjang',
        tingkat: 'Tingkat',
        settings: 'Pengaturan',
        nilai: 'Nilai Santri',
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-teal-600 hover:border-teal-200 shadow-sm transition-all">
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Backup & Restore Data</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Ekspor dan impor data dan gambar dalam format ZIP</p>
                </div>
            </div>

            {/* Warning banner */}
            <div className="flex gap-3 items-start bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Perhatian Sebelum Mengimpor</p>
                    <ul className="list-disc list-inside space-y-1 text-xs leading-relaxed">
                        <li>Proses impor akan <strong>menimpa (upsert)</strong> data yang sudah ada berdasarkan ID.</li>
                        <li>File yang diimpor harus berasal dari aplikasi LPAPP.</li>
                        <li>Data pengguna (akun login) <strong>tidak diimpor</strong> demi keamanan.</li>
                        <li>Pastikan Anda sudah memiliki backup terbaru sebelum melakukan impor.</li>
                    </ul>
                </div>
            </div>

            {/* Export Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                        <Download size={18} className="text-teal-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800 text-sm">Ekspor Backup</h2>
                        <p className="text-xs text-slate-500">Unduh semua data dan foto dalam file ZIP</p>
                    </div>
                </div>
                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                        Mengekspor seluruh data termasuk Foto, Kamar, Kelas, Gedung, Kompleks, Jenjang,
                        Tingkat, Nilai, dan Pengaturan Aplikasi ke dalam satu file arsip <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">.zip</code>.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-5">
                        {Object.values(tableLabels).map(label => (
                            <span key={label}
                                className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                                <Database size={10} /> {label}
                            </span>
                        ))}
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={exportLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition shadow-sm shadow-teal-200">
                        {exportLoading
                            ? <><Loader2 size={16} className="animate-spin" /> Mengekspor...</>
                            : <><Download size={16} /> Unduh Backup</>}
                    </button>
                </div>
            </div>

            {/* Import Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Upload size={18} className="text-blue-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800 text-sm">Impor Backup</h2>
                        <p className="text-xs text-slate-500">Pulihkan data dan foto dari file ZIP backup</p>
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    {/* File drop zone */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                            ${selectedFile
                                ? 'border-teal-300 bg-teal-50/40'
                                : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'}`}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".zip,application/zip"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <FileJson size={32} className={`mx-auto mb-3 ${selectedFile ? 'text-teal-500' : 'text-slate-300'}`} />
                        {selectedFile ? (
                            <>
                                <p className="text-sm font-semibold text-teal-700">{selectedFile.name}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {(selectedFile.size / 1024).toFixed(1)} KB · Klik untuk ganti file
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-sm font-medium text-slate-500">Klik untuk memilih file backup</p>
                                <p className="text-xs text-slate-400 mt-1">Format: .zip — Hanya file ekspor asli LPAPP</p>
                            </>
                        )}
                    </div>

                    {/* Import status */}
                    {importStatus === 'success' && importReport && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle2 size={18} className="text-emerald-600" />
                                <p className="text-sm font-bold text-emerald-800">Impor Berhasil!</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.entries(importReport).map(([key, count]) => (
                                    <div key={key} className="bg-white rounded-lg px-3 py-2 border border-emerald-100 text-center">
                                        <p className="text-lg font-bold text-emerald-700">{count}</p>
                                        <p className="text-[10px] text-slate-500">{tableLabels[key] || key}</p>
                                    </div>
                                ))}
                            </div>
                            {importWarnings.length > 0 && (
                                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-amber-700 mb-1">
                                        <AlertTriangle size={12} className="inline mr-1" />
                                        {importWarnings.length} data gagal diimpor:
                                    </p>
                                    <ul className="text-[11px] text-amber-600 space-y-0.5 list-disc list-inside">
                                        {importWarnings.map((w, i) => (
                                            <li key={i} className="truncate">{w}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {importStatus === 'error' && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
                            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{importError}</p>
                        </div>
                    )}

                    <button
                        onClick={() => setConfirmOpen(true)}
                        disabled={!selectedFile || importStatus === 'loading'}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition shadow-sm">
                        {importStatus === 'loading'
                            ? <><Loader2 size={16} className="animate-spin" /> Mengimpor...</>
                            : <><RefreshCw size={16} /> Mulai Impor Data</>}
                    </button>
                </div>
            </div>

            {/* Confirm Modal */}
            {confirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
                    onClick={() => setConfirmOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
                                <Shield size={20} className="text-amber-600" />
                            </div>
                            <h3 className="font-bold text-slate-800">Konfirmasi Impor</h3>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Anda akan mengimpor data dari <strong className="text-slate-800">{selectedFile?.name}</strong>.
                            Data yang sudah ada akan ditimpa. Apakah Anda yakin?
                        </p>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setConfirmOpen(false)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                                Batal
                            </button>
                            <button onClick={handleImport}
                                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition shadow-sm">
                                Ya, Impor Sekarang
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Alert Modal */}
            {alertModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
                    onClick={() => setAlertModal({ show: false, message: '' })}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center">
                                <AlertTriangle size={20} className="text-red-600" />
                            </div>
                            <h3 className="font-bold text-slate-800">Pemberitahuan</h3>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            {alertModal.message}
                        </p>
                        <div className="flex justify-end pt-2">
                            <button onClick={() => setAlertModal({ show: false, message: '' })}
                                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold transition shadow-sm">
                                Mengerti
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

