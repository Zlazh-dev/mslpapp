import { useState, useCallback } from 'react';
import api from '../../../lib/api';
import { PrintTemplate } from '../types';

export function useTemplates() {
    const [templates, setTemplates] = useState<PrintTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadTemplates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/settings/CETAK_TEMPLATES');
            if (res.data?.data && Array.isArray(res.data.data)) {
                setTemplates(res.data.data);
            } else {
                // Migration logic for old data format if CETAK_TEMPLATES is empty but CETAK_BIODATA_LAYOUT exists
                const oldRes = await api.get('/settings/CETAK_BIODATA_LAYOUT');
                if (oldRes.data?.data && Array.isArray(oldRes.data.data)) {
                    setTemplates([{
                        id: 'tpl_migrated',
                        name: 'Layout Lama',
                        updatedAt: Date.now(),
                        isDefault: true,
                        elements: oldRes.data.data
                    }]);
                }
            }
        } catch (e: any) {
            console.error('Error fetching templates:', e);
            setError(e.message || 'Gagal memuat template');
        } finally {
            setLoading(false);
        }
    }, []);

    const saveTemplates = async (newTemplates: PrintTemplate[]) => {
        setSaving(true);
        setError(null);
        try {
            await api.put('/settings/CETAK_TEMPLATES', { value: newTemplates });
            setTemplates(newTemplates);
            return true;
        } catch (e: any) {
            console.error('Error saving templates:', e);
            setError(e.message || 'Gagal menyimpan template');
            return false;
        } finally {
            setSaving(false);
        }
    };

    const duplicateTemplate = async (id: string, newName: string) => {
        const toDuplicate = templates.find(t => t.id === id);
        if (!toDuplicate) return false;

        const cloned: PrintTemplate = {
            ...toDuplicate,
            id: 'tpl_' + Date.now(),
            name: newName,
            updatedAt: Date.now(),
            isDefault: false // Duplicates are never default initially
        };

        const updated = [...templates, cloned];
        return await saveTemplates(updated);
    };

    const deleteTemplate = async (id: string) => {
        const updated = templates.filter(t => t.id !== id);
        return await saveTemplates(updated);
    };

    const setAsDefault = async (id: string) => {
        const updated = templates.map(t => ({
            ...t,
            isDefault: t.id === id
        }));
        return await saveTemplates(updated);
    };

    return {
        templates,
        loading,
        saving,
        error,
        loadTemplates,
        saveTemplates,
        duplicateTemplate,
        deleteTemplate,
        setAsDefault,
    };
}
