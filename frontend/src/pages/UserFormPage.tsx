import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../lib/api';
import { Kelas, Kamar,  } from '../types';
import { ArrowLeft, Save, ShieldCheck } from 'lucide-react';

const schema = z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter'),
    username: z.string().optional(),
    password: z.string().min(6).optional().or(z.literal('')),
    roles: z.array(z.string()).min(1, 'Pilih minimal satu role'),
    kelasId: z.string().optional(),
    kamarId: z.string().optional(),
    santriNis: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const roleOptions: { value: string; label: string }[] = [
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

    const [searchParams] = useSearchParams();
    const defaultRole = searchParams.get('role') || 'STAF_PENDATAAN';

    const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { roles: [defaultRole] },
    });

    const selectedRoles = watch('roles') || [];

    useEffect(() => {
        api.get('/kelas').then(r => setKelas(r.data.data));
        api.get('/kamar').then(r => setKamar(r.data.data));
        if (isEdit) {
            api.get(`/users/${id}`).then(r => {
                const data = r.data.data;
                if (data.santri) setLinkedSantri(data.santri);
                reset({ 
                    ...data, 
                    roles: data.roles?.length ? data.roles : ['STAF_PENDATAAN'], 
                    username: data.username || '', 
                    password: '', 
                    kelasId: String(data.kelasWali?.[0]?.id || ''), 
                    kamarId: String(data.kamarBimbing?.id || ''),
                    santriNis: data.santri?.nis || '' 
                });
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
            const payload: any = { 
                ...data, 
                kelasId: data.kelasId || undefined, 
                kamarId: data.kamarId || undefined, 
                santriNis: data.santriNis?.trim() || undefined 
            };
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
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck size={18} className="text-emerald-600 border-b-0" />
                        <label className="form-label mb-0 text-gray-700 font-semibold">Tugas & Hak Akses (Role)</label>
                    </div>
                    {errors.roles && <p className="text-red-500 text-xs mb-2">{errors.roles.message}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                        {roleOptions.map(r => (
                            <label key={r.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${selectedRoles.includes(r.value) ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                <input 
                                    type="checkbox" 
                                    value={r.value}
                                    {...register('roles')}
                                    className="w-4 h-4 mt-0.5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer" 
                                />
                                <span className={`text-sm tracking-wide ${selectedRoles.includes(r.value) ? 'font-bold text-emerald-800' : 'font-medium text-gray-700'}`}>{r.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
                {selectedRoles.includes('WALI_KELAS') && (
                    <div>
                        <label className="form-label">Kelas yang Diasuh</label>
                        <select {...register('kelasId')} className="form-input">
                            <option value="">-- Pilih Kelas --</option>
                            {kelas.map(k => <option key={k.id} value={k.id}>{k.tingkat?.jenjang?.nama} — {k.nama}</option>)}
                        </select>
                    </div>
                )}
                {selectedRoles.includes('PEMBIMBING_KAMAR') && (
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
