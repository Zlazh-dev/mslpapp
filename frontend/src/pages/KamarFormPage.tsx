import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../lib/api';
import { User } from '../types';
import { ArrowLeft, Save } from 'lucide-react';

const schema = z.object({
    name: z.string().min(1, 'Nama kamar wajib diisi'),
    gedung: z.string().min(1, 'Gedung wajib diisi'),
    kapasitas: z.coerce.number().min(1, 'Kapasitas minimal 1'),
});

type FormData = z.infer<typeof schema>;

export default function KamarFormPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEdit = !!id;
    const [users, setUsers] = useState<User[]>([]);
    const [error, setError] = useState('');

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    useEffect(() => {
        if (isEdit) api.get(`/kamar/${id}`).then(r => reset(r.data.data));
    }, [id]);

    const onSubmit = async (data: FormData) => {
        try {
            setError('');
            if (isEdit) await api.put(`/kamar/${id}`, data);
            else await api.post('/kamar', data);
            navigate('/kamar');
        } catch (err: any) { setError(err.response?.data?.message || 'Gagal menyimpan'); }
    };

    return (
        <div className="max-w-lg space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={18} /></button>
                <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Kamar' : 'Tambah Kamar'}</h1>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
                {[['name', 'Nama Kamar', 'text', 'Kamar A1'], ['gedung', 'Gedung', 'text', 'Gedung A']].map(([n, l, t, p]) => (
                    <div key={n}>
                        <label className="form-label">{l}</label>
                        <input {...register(n as any)} type={t} className="form-input" placeholder={p} />
                        {(errors as any)[n] && <p className="text-red-500 text-xs mt-1">{(errors as any)[n]?.message}</p>}
                    </div>
                ))}
                <div>
                    <label className="form-label">Kapasitas</label>
                    <input {...register('kapasitas')} type="number" className="form-input" placeholder="20" />
                    {errors.kapasitas && <p className="text-red-500 text-xs mt-1">{errors.kapasitas.message}</p>}
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
