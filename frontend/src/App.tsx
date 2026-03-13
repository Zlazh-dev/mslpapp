import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { Role } from './types';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SantriListPage from './pages/SantriListPage';
import SantriDetailPage from './pages/SantriDetailPage';
import SantriFormPage from './pages/SantriFormPage';
import KamarManagementPage from './pages/KamarManagementPage';
import KelasManagementPage from './pages/KelasManagementPage';
import KamarDetailPage from './pages/KamarDetailPage';
import KelasDetailPage from './pages/KelasDetailPage';
import KamarSayaPage from './pages/KamarSayaPage';
import KelasSayaPage from './pages/KelasSayaPage';
import ChatPage from './pages/ChatPage';
import UserListPage from './pages/UserListPage';
import UserFormPage from './pages/UserFormPage';
import SantriPublicPage from './pages/SantriPublicPage';

function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: Role[] }) {
    const { isAuthenticated, user } = useAuthStore();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
}

export default function App() {
    const { isAuthenticated } = useAuthStore();

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

                <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />

                    {/* Santri */}
                    <Route path="santri" element={<PrivateRoute allowedRoles={['ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH']}><SantriListPage /></PrivateRoute>} />
                    <Route path="santri/baru" element={<PrivateRoute allowedRoles={['ADMIN', 'STAF_PENDATAAN']}><SantriFormPage /></PrivateRoute>} />
                    <Route path="santri/:id" element={<SantriDetailPage />} />
                    <Route path="santri/:id/edit" element={<PrivateRoute allowedRoles={['ADMIN', 'STAF_PENDATAAN']}><SantriFormPage /></PrivateRoute>} />

                    {/* Manajemen Kelas */}
                    <Route path="kelas" element={<PrivateRoute allowedRoles={['ADMIN', 'STAF_MADRASAH']}><KelasManagementPage /></PrivateRoute>} />
                    <Route path="kelas/:id" element={<PrivateRoute allowedRoles={['ADMIN', 'STAF_MADRASAH', 'WALI_KELAS']}><KelasDetailPage /></PrivateRoute>} />

                    {/* Manajemen Kamar */}
                    <Route path="kamar" element={<PrivateRoute allowedRoles={['ADMIN', 'STAF_PENDATAAN']}><KamarManagementPage /></PrivateRoute>} />
                    <Route path="kamar/:id" element={<PrivateRoute allowedRoles={['ADMIN', 'STAF_PENDATAAN', 'PEMBIMBING_KAMAR']}><KamarDetailPage /></PrivateRoute>} />

                    {/* Kamar Saya (Pembimbing Kamar) */}
                    <Route path="kamar-saya" element={<PrivateRoute allowedRoles={['PEMBIMBING_KAMAR']}><KamarSayaPage /></PrivateRoute>} />

                    {/* Kelas Saya (Wali Kelas) */}
                    <Route path="kelas-saya" element={<PrivateRoute allowedRoles={['WALI_KELAS']}><KelasSayaPage /></PrivateRoute>} />

                    {/* Chat — semua role */}
                    <Route path="chat" element={<ChatPage />} />

                    {/* Users — Admin only */}
                    <Route path="users" element={<PrivateRoute allowedRoles={['ADMIN']}><UserListPage /></PrivateRoute>} />
                    <Route path="users/baru" element={<PrivateRoute allowedRoles={['ADMIN']}><UserFormPage /></PrivateRoute>} />
                    <Route path="users/:id/edit" element={<PrivateRoute allowedRoles={['ADMIN']}><UserFormPage /></PrivateRoute>} />
                </Route>

                {/* Public routes — no auth required */}
                <Route path="/p/santri/:id" element={<SantriPublicPage />} />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
