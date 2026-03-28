import React from 'react';
import { ArrowLeft, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderBreadcrumbProps {
    onBack?: () => void;
    title?: string;
    subtitle?: string;
}

export function HeaderBreadcrumb({ onBack, title = "Desain Cetak Biodata", subtitle = "Kelola dan pilih template rancangan dokumen cetak untuk biodata Santri." }: HeaderBreadcrumbProps) {
    const navigate = useNavigate();

    return (
        <div className="text-center mb-10 w-full relative">
            {onBack && (
                <button 
                    onClick={onBack} 
                    className="absolute left-0 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg text-gray-500 flex items-center gap-2"
                >
                    <ArrowLeft size={18} /> Kembali
                </button>
            )}
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Square size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-500 text-sm">{subtitle}</p>
        </div>
    );
}

export function EditorHeader({
    templateName,
    onBack,
    onSave,
    snapToGrid,
    setSnapToGrid,
    showGrid,
    setShowGrid,
    scale,
    setScale,
    saving,
    onShowPreview
}: {
    templateName: string;
    onBack: () => void;
    onSave: () => void;
    snapToGrid: boolean;
    setSnapToGrid: (v: boolean) => void;
    showGrid: boolean;
    setShowGrid: (v: boolean) => void;
    scale: number;
    setScale: (v: number) => void;
    saving: boolean;
    onShowPreview: () => void;
}) {
    return (
        <div className="h-14 bg-white border-b shrink-0 flex items-center justify-between px-4 z-10 w-full">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="font-bold text-gray-800 text-sm">Cetak Layout Editor (A4)</h1>
                    <p className="text-xs text-gray-500">{templateName}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer bg-gray-50 py-1.5 px-3 rounded border">
                    <input type="checkbox" checked={snapToGrid} onChange={e => setSnapToGrid(e.target.checked)} className="rounded text-primary-600 focus:ring-primary-500" />
                    Snap to Grid
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer bg-gray-50 py-1.5 px-3 rounded border">
                    <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} className="rounded text-primary-600 focus:ring-primary-500" />
                    Garis Bantu
                </label>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Zoom:</label>
                    <input type="range" min="0.3" max="1.5" step="0.1" value={scale} onChange={e => setScale(Number(e.target.value))} />
                </div>
                <button onClick={onShowPreview} className="btn-secondary flex items-center gap-2 py-1.5 px-3 text-sm rounded-lg bg-gray-100 hover:bg-gray-200">
                    Preview Cetak
                </button>
                <button onClick={onSave} disabled={saving} className="btn-primary flex items-center gap-2 py-1.5 px-3 text-sm rounded-lg">
                    {saving ? 'Menyimpan... ' : 'Simpan Layout'}
                </button>
            </div>
        </div>
    );
}
