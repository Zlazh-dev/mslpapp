import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../lib/api';
import { User } from '../types';
import { ArrowLeft, Save } from 'lucide-react';

const schema = z.object({
    name: z.string().min(1, 'Nama kelas wajib diisi'),
    tingkat: z.string().min(1, 'Tingkat wajib diisi'),
    tahunAjaran: z.string().min(1, 'Tahun ajaran wajib diisi'),
    waliKelasId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function KelasFormPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEdit = !!id;
    const [users, setUsers] = useState<User[]>([]);
    const [error, setError] = useState('');

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    useEffect(() => {
        api.get('/users').then(r => setUsers(r.data.data.filter((u: User) => u.roles?.includes('WALI_KELAS') || u.roles?.includes('ADMIN'))));
        if (isEdit) api.get(`/kelas/${id}`).then(r => reset({ ...r.data.data, waliKelasId: r.data.data.waliKelasId || '' }));
    }, [id]);

    const onSubmit = async (data: FormData) => {
        try {
            setError('');
            const payload = { ...data, waliKelasId: data.waliKelasId || undefined };
            if (isEdit) await api.put(`/kelas/${id}`, payload);
            else await api.post('/kelas', payload);
            navigate('/kelas');
        } catch (err: any) { setError(err.response?.data?.message || 'Gagal menyimpan'); }
    };

    return (
        <div className="max-w-lg space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={18} /></button>
                <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Kelas' : 'Tambah Kelas'}</h1>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
                {[['name', 'Nama Kelas', 'text', 'Kelas 7A'], ['tingkat', 'Tingkat', 'text', '7'], ['tahunAjaran', 'Tahun Ajaran', 'text', '2024/2025']].map(([n, l, t, p]) => (
                    <div key={n}>
                        <label className="form-label">{l}</label>
                        <input {...register(n as any)} type={t} className="form-input" placeholder={p} />
                        {(errors as any)[n] && <p className="text-red-500 text-xs mt-1">{(errors as any)[n]?.message}</p>}
                    </div>
                ))}
                <div>
                    <label className="form-label">Wali Kelas</label>
                    <select {...register('waliKelasId')} className="form-input">
                        <option value="">-- Pilih Wali Kelas --</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Batal</button>
                    <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                        <Save size={16} />{isSubmitting ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </form>
        </div>
    );
}
