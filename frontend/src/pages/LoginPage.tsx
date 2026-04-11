import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
    username: z.string().trim().min(3, 'Username minimal 3 karakter'),
    password: z.string().min(6, 'Password minimal 6 karakter'),
});

type LoginForm = z.infer<typeof loginSchema>;

/* ── Preloader ─────────────────────────────────────────── */
const IMAGES_TO_PRELOAD = ['/logo.png', '/hero-image.jpg'];
const SPLASH_DURATION = 3500; // ms

function useSplashLoader(srcs: string[]) {
    const [ready, setReady] = useState(false);
    const [counter, setCounter] = useState(0);
    const [imagesLoaded, setImagesLoaded] = useState(false);

    // Preload images
    useEffect(() => {
        let count = 0;
        srcs.forEach((src) => {
            const img = new Image();
            img.onload = img.onerror = () => {
                count++;
                if (count >= srcs.length) setImagesLoaded(true);
            };
            img.src = src;
        });
    }, [srcs]);

    // Animate counter 0 → 100 over SPLASH_DURATION
    useEffect(() => {
        const start = performance.now();
        let raf: number;
        const tick = (now: number) => {
            const elapsed = now - start;
            const pct = Math.min(Math.round((elapsed / SPLASH_DURATION) * 100), 100);
            setCounter(pct);
            if (pct < 100) {
                raf = requestAnimationFrame(tick);
            } else if (imagesLoaded) {
                setTimeout(() => setReady(true), 300);
            }
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [imagesLoaded]);

    // If counter hit 100 but images loaded later
    useEffect(() => {
        if (counter >= 100 && imagesLoaded) {
            setTimeout(() => setReady(true), 300);
        }
    }, [counter, imagesLoaded]);

    return { ready, counter };
}

/* ── Splash Screen Component ──────────────────────────── */
function SplashScreen({ counter, exiting }: { counter: number; exiting: boolean }) {
    return (
        <div className={`splash-screen ${exiting ? 'splash-exit' : ''}`}>
            {/* Aurora waves */}
            <div className="aurora-blob aurora-1" />
            <div className="aurora-blob aurora-2" />
            <div className="aurora-blob aurora-3" />
            <div className="aurora-blob aurora-4" />
            <div className="aurora-blob aurora-5" />

            {/* Big counter at bottom-right */}
            <div className="splash-counter">
                <span className="splash-counter-num">{counter}</span>
            </div>

            {/* Center brand (subtle) */}
            <div className="splash-center">
                <img src="/logo.png" alt="LPAPP" className="splash-logo" />
            </div>
        </div>
    );
}

/* ── Glass-like input wrapper ──────────────────────────── */
const GlassInput = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/60 backdrop-blur-sm transition-colors focus-within:border-primary-400/70 focus-within:bg-primary-50/40">
        {children}
    </div>
);

/* ── Main Login Page ──────────────────────────────────── */
export default function LoginPage() {
    const navigate = useNavigate();
    const { setAuth } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { ready, counter } = useSplashLoader(IMAGES_TO_PRELOAD);
    const [splashExiting, setSplashExiting] = useState(false);
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        if (ready) {
            setSplashExiting(true);
            const timer = setTimeout(() => setShowContent(true), 600);
            return () => clearTimeout(timer);
        }
    }, [ready]);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = useCallback(async (data: LoginForm) => {
        try {
            setError('');
            const res = await api.post('/auth/login', data);
            const { user, access_token } = res.data.data;
            setAuth(user, access_token);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login gagal. Periksa username dan password Anda.');
        }
    }, [setAuth, navigate]);

    /* Show splash while loading */
    if (!showContent) {
        return <SplashScreen counter={counter} exiting={splashExiting} />;
    }

    return (
        <div className="h-[100dvh] flex flex-col md:flex-row font-sans w-full overflow-hidden bg-white">
            {/* ── Left: Login form ──────────────────────────── */}
            <section className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <div className="flex flex-col gap-6">
                        {/* Brand */}
                        <div className="login-animate login-delay-100">
                            <img src="/logo.png" alt="LPAPP" className="w-14 h-14 object-contain mb-5" />
                        </div>

                        <h1 className="login-animate login-delay-200 text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-gray-900">
                            <span className="font-light">Selamat Datang</span>
                        </h1>
                        <p className="login-animate login-delay-300 text-gray-500">
                            Masuk ke sistem manajemen santri LPAPP
                        </p>

                        {/* Error alert */}
                        {error && (
                            <div className="login-animate login-delay-100 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm flex items-center gap-3">
                                <span className="w-5 h-5 rounded-full bg-red-500 flex-shrink-0 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">!</span>
                                </span>
                                {error}
                            </div>
                        )}

                        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                            {/* Username */}
                            <div className="login-animate login-delay-400">
                                <label className="text-sm font-medium text-gray-500 mb-1.5 block">Username</label>
                                <GlassInput>
                                    <input
                                        {...register('username')}
                                        type="text"
                                        placeholder="Masukkan username"
                                        autoComplete="username"
                                        className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-gray-900 placeholder-gray-400"
                                    />
                                </GlassInput>
                                {errors.username && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.username.message}</p>}
                            </div>

                            {/* Password */}
                            <div className="login-animate login-delay-500">
                                <label className="text-sm font-medium text-gray-500 mb-1.5 block">Password</label>
                                <GlassInput>
                                    <div className="relative">
                                        <input
                                            {...register('password')}
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Masukkan password"
                                            autoComplete="current-password"
                                            className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none text-gray-900 placeholder-gray-400"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-3 flex items-center"
                                        >
                                            {showPassword
                                                ? <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                                                : <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                                            }
                                        </button>
                                    </div>
                                </GlassInput>
                                {errors.password && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.password.message}</p>}
                            </div>

                            {/* Remember me */}
                            <div className="login-animate login-delay-600 flex items-center text-sm">
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                    <span className="text-gray-600">Ingat saya</span>
                                </label>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="login-animate login-delay-700 w-full rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 py-4 font-medium text-white hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg shadow-primary-600/25 hover:shadow-primary-700/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Memproses...
                                    </span>
                                ) : 'Masuk'}
                            </button>
                        </form>

                        {/* Footer */}
                        <p className="login-animate login-delay-800 text-center text-xs text-gray-400 mt-4">
                            LPAPP &copy; {new Date().getFullYear()} &middot; Sistem Manajemen Santri
                        </p>
                    </div>
                </div>
            </section>

            {/* ── Right: Aurora panel ──────────────────────── */}
            <section className="hidden md:block flex-1 relative p-4">
                <div className="login-slide-right login-delay-300 absolute inset-4 rounded-3xl overflow-hidden hero-aurora">
                    {/* Aurora waves */}
                    <div className="hero-wave hero-wave-1" />
                    <div className="hero-wave hero-wave-2" />
                    <div className="hero-wave hero-wave-3" />
                    <div className="hero-wave hero-wave-4" />
                    <div className="hero-wave hero-wave-5" />

                    {/* Grain overlay */}
                    <div className="hero-aurora-grain" />

                    {/* Bottom info card */}
                    <div className="absolute bottom-8 left-8 right-8 z-10">
                        <div className="login-testimonial login-delay-1000 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <img src="/logo.png" alt="LPAPP" className="w-10 h-10 rounded-2xl object-cover" />
                                <div>
                                    <p className="text-white font-semibold text-sm">LPAPP</p>
                                    <p className="text-white/60 text-xs">Manajemen Santri</p>
                                </div>
                            </div>
                            <p className="text-white/80 text-sm leading-relaxed">
                                Platform terpadu untuk pengelolaan data santri, madrasah, kamar, dan administrasi pesantren secara digital.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
