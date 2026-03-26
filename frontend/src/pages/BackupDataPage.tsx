import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
    Download, Upload, Shield, AlertTriangle, CheckCircle2,
    FileJson, ArrowLeft, Loader2, RefreshCw, Database
} from 'lucide-react';

type ImportStatus = 'idle' | 'loading' | 'success' | 'error';

export default function BackupDataPage() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [exportLoading, setExportLoading] = useState(false);
    const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
    const [importReport, setImportReport] = useState<Record<string, number> | null>(null);
    const [importError, setImportError] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleExport = async () => {
        setExportLoading(true);
        try {
            const res = await api.get('/backup/export', { responseType: 'blob' });
            const date = new Date().toISOString().slice(0, 10);
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `mslpapp_backup_${date}.json`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('Gagal mengekspor data. Pastikan server berjalan.');
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
            const text = await selectedFile.text();
            const json = JSON.parse(text);
            const res = await api.post('/backup/import', json);
            setImportReport(res.data.report);
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
                    <p className="text-xs text-slate-500 mt-0.5">Ekspor dan impor data aplikasi dalam format JSON</p>
                </div>
            </div>

            {/* Warning banner */}
            <div className="flex gap-3 items-start bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Perhatian Sebelum Mengimpor</p>
                    <ul className="list-disc list-inside space-y-1 text-xs leading-relaxed">
                        <li>Proses impor akan <strong>menimpa (upsert)</strong> data yang sudah ada berdasarkan ID.</li>
                        <li>File yang diimpor harus berasal dari aplikasi MSLPAPP.</li>
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
                        <p className="text-xs text-slate-500">Unduh semua data sebagai file JSON</p>
                    </div>
                </div>
                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                        Mengekspor seluruh data termasuk Santri, Kamar, Kelas, Gedung, Kompleks, Jenjang,
                        Tingkat, Nilai, dan Pengaturan Aplikasi ke dalam satu file <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">.json</code>.
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
                        <p className="text-xs text-slate-500">Pulihkan data dari file JSON backup</p>
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
                            accept=".json,application/json"
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
                                <p className="text-xs text-slate-400 mt-1">Format: .json — hanya file dari MSLPAPP</p>
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
        </div>
    );
}
