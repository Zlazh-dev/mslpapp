import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { PrintTemplate } from '../types';
import { TemplateCard } from './TemplateCard';

interface TemplateListProps {
    templates: PrintTemplate[];
    loading: boolean;
    isAdmin: boolean;
    onCreateNew: () => void;
    onEdit: (id: string, elements: any[]) => void;
    onSetDefault: (id: string) => void;
    onDelete: (id: string, name: string) => void;
    onDuplicate: (id: string, name: string) => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function TemplateList({
    templates,
    loading,
    isAdmin,
    onCreateNew,
    onEdit,
    onSetDefault,
    onDelete,
    onDuplicate,
    onImport
}: TemplateListProps) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'active'>('all');
    
    const displayedTemplates = useMemo(() => {
        let result = templates;
        
        if (filter === 'active') {
            result = result.filter(t => t.isDefault);
        }
        
        if (search) {
            result = result.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
        }
        
        // Terurut berdasarkan update terbaru
        return result.sort((a, b) => b.updatedAt - a.updatedAt);
    }, [templates, search, filter]);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Memuat Pengaturan...</div>;
    }

    return (
        <div className="w-full">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Cari Template..." 
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-blue-500 shadow-sm"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <select 
                            className="pl-9 pr-6 py-2 bg-white border border-gray-200 rounded-xl text-sm cursor-pointer shadow-sm text-gray-600 appearance-none"
                            value={filter}
                            onChange={e => setFilter(e.target.value as any)}
                        >
                            <option value="all">Semua</option>
                            <option value="active">Default Aktif</option>
                        </select>
                        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <label className="btn-secondary py-2 px-4 rounded-xl text-sm bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center cursor-pointer shadow-sm text-gray-700 whitespace-nowrap">
                        <input type="file" accept=".json" className="hidden" onChange={onImport} />
                        Import JSON
                    </label>
                    <button 
                        onClick={onCreateNew}
                        className="btn-primary py-2 px-6 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                    >
                        <Plus size={16} /> Buat Kanvas Baru
                    </button>
                </div>
            </div>

            {displayedTemplates.length === 0 ? (
                <div className="text-center py-20 px-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                    <p className="text-gray-500 mb-2">Tidak ada template ditemukan.</p>
                    {search ? <p className="text-sm text-gray-400">Coba kata kunci pencarian yang lain.</p> : null}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {displayedTemplates.map(tpl => (
                        <TemplateCard 
                            key={tpl.id}
                            template={tpl}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onSetDefault={onSetDefault}
                            onDuplicate={onDuplicate}
                            isAdmin={isAdmin}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
