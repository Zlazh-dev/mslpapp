import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../lib/api';
import { Kelas, Kamar, Role } from '../types';
import { ArrowLeft, Save } from 'lucide-react';

const schema = z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter'),
    username: z.string().optional(),
    password: z.string().min(6).optional().or(z.literal('')),
    role: z.enum(['ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'PEMBIMBING_KAMAR', 'WALI_KELAS']),
    kelasId: z.string().optional(),
    kamarId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const roles: { value: Role; label: string }[] = [
    { value: 'ADMIN', label: 'Administrator' },
    { value: 'STAF_PENDATAAN', label: 'Staf Pendataan' },
    { value: 'STAF_MADRASAH', label: 'Staf Madrasah' },
    { value: 'PEMBIMBING_KAMAR', label: 'Pembimbing Kamar' },
    { value: 'WALI_KELAS', label: 'Wali Kelas' },
];

export default function UserFormPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEdit = !!id;
    const [kelas, setKelas] = useState<Kelas[]>([]);
    const [kamar, setKamar] = useState<Kamar[]>([]);
    const [error, setError] = useState('');
    const [linkedSantri, setLinkedSantri] = useState<any>(null);

    const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { role: 'STAF_PENDATAAN' },
    });

    const selectedRole = watch('role');

    useEffect(() => {
        api.get('/kelas').then(r => setKelas(r.data.data));
        api.get('/kamar').then(r => setKamar(r.data.data));
        if (isEdit) {
            api.get(`/users/${id}`).then(r => {
                const data = r.data.data;
                if (data.santri) setLinkedSantri(data.santri);
                reset({ ...data, username: data.username || '', password: '', kelasId: String(data.kelasWali?.[0]?.id || ''), kamarId: String(data.kamarBimbing?.id || '') });
            });
        }
    }, [id]);

    const onSubmit = async (data: FormData) => {
        if (!data.username?.trim() && !linkedSantri) {
            setError('Username wajib diisi jika akun tidak terhubung dengan data Santri');
            return;
        }
        try {
            setError('');
            const payload: any = { ...data, kelasId: data.kelasId || undefined, kamarId: data.kamarId || undefined };
            if (!payload.username?.trim()) payload.username = '';
            if (!payload.password) delete payload.password;
            if (isEdit) await api.put(`/users/${id}`, payload);
            else await api.post('/users', payload);
            navigate('/users');
        } catch (err: any) { setError(err.response?.data?.message || 'Gagal menyimpan'); }
    };

    return (
        <div className="max-w-lg space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={18} /></button>
                <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Pengguna' : 'Tambah Pengguna'}</h1>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
                <div>
                    <label className="form-label">Nama Lengkap</label>
                    <input {...register('name')} type="text" className="form-input" placeholder="Ahmad Fauzi" />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                    <label className="form-label">Username <span className="text-gray-400 font-normal ml-1">(Opsional jika ditautkan ke Santri)</span></label>
                    <input {...register('username')} type="text" className="form-input" placeholder="ahmadFauzi" />
                    {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
                </div>
                {linkedSantri && (
                    <div>
                        <label className="form-label text-emerald-700">Terhubung dengan Santri (Login bisa menggunakan NIS)</label>
                        <input type="text" disabled value={linkedSantri.nis} className="form-input bg-emerald-50 text-emerald-800 font-mono shadow-sm border-emerald-200" />
                    </div>
                )}
                <div>
                    <label className="form-label">{isEdit ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}</label>
                    <input {...register('password')} type="password" className="form-input" placeholder={isEdit ? '••••••••' : 'Minimal 6 karakter'} />
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>
                <div>
                    <label className="form-label">Role</label>
                    <select {...register('role')} className="form-input">
                        {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                </div>
                {selectedRole === 'WALI_KELAS' && (
                    <div>
                        <label className="form-label">Kelas yang Diasuh</label>
                        <select {...register('kelasId')} className="form-input">
                            <option value="">-- Pilih Kelas --</option>
                            {kelas.map(k => <option key={k.id} value={k.id}>{k.tingkat?.jenjang?.nama} — {k.nama}</option>)}
                        </select>
                    </div>
                )}
                {selectedRole === 'PEMBIMBING_KAMAR' && (
                    <div>
                        <label className="form-label">Kamar yang Dibimbing</label>
                        <select {...register('kamarId')} className="form-input">
                            <option value="">-- Pilih Kamar --</option>
                            {kamar.map(k => <option key={k.id} value={k.id}>{k.gedung?.nama} — {k.nama}</option>)}
                        </select>
                    </div>
                )}
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
