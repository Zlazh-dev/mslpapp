import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';


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
import PrintSettingsPage from './pages/PrintSettingsPage';
import BackupDataPage from './pages/BackupDataPage';
import UnauthorizedPage from './pages/error/Unauthorized';

// Guards
import DesktopGuard from './components/layout/DesktopGuard';

function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
    const { isAuthenticated, user } = useAuthStore();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (allowedRoles && user && !allowedRoles.some((r) => user.roles?.includes(r))) {
        return <Navigate to="/unauthorized" replace />;
    }
    return <>{children}</>;
}

export default function App() {
    const { isAuthenticated } = useAuthStore();

    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
                <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />

                <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />

                    {/* Santri */}
                    <Route path="santri" element={<PrivateRoute allowedRoles={['ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH']}><SantriListPage /></PrivateRoute>} />
                    <Route path="santri/baru" element={<PrivateRoute allowedRoles={['ADMIN', 'STAF_PENDATAAN']}><SantriFormPage /></PrivateRoute>} />
                    <Route path="santri/:id" element={<SantriDetailPage />} />
                    <Route path="santri/:id/edit" element={<PrivateRoute allowedRoles={['ADMIN', 'STAF_PENDATAAN']}><SantriFormPage /></PrivateRoute>} />

                    {/* Manajemen Kelas */}
                    <Route path="kelas" element={<PrivateRoute allowedRoles={['ADMIN', 'STAF_MADRASAH']}><DesktopGuard><KelasManagementPage /></DesktopGuard></PrivateRoute>} />
                    <Route path="kelas/:id" element={<PrivateRoute allowedRoles={['ADMIN', 'STAF_MADRASAH', 'WALI_KELAS']}><DesktopGuard><KelasDetailPage /></DesktopGuard></PrivateRoute>} />

                    {/* Manajemen Kamar */}
                    <Route path="kamar" element={<PrivateRoute allowedRoles={['ADMIN', 'STAF_PENDATAAN']}><DesktopGuard><KamarManagementPage /></DesktopGuard></PrivateRoute>} />
                    <Route path="kamar/:id" element={<PrivateRoute allowedRoles={['ADMIN', 'STAF_PENDATAAN', 'PEMBIMBING_KAMAR']}><DesktopGuard><KamarDetailPage /></DesktopGuard></PrivateRoute>} />

                    {/* Kamar Saya (Pembimbing Kamar) */}
                    <Route path="kamar-saya" element={<PrivateRoute allowedRoles={['PEMBIMBING_KAMAR']}><KamarSayaPage /></PrivateRoute>} />

                    {/* Kelas Saya (Wali Kelas) */}
                    <Route path="kelas-saya" element={<PrivateRoute allowedRoles={['WALI_KELAS']}><KelasSayaPage /></PrivateRoute>} />

                    {/* Chat — semua role */}
                    <Route path="chat" element={<ChatPage />} />

                    {/* Users — Admin only */}
                    <Route path="users" element={<PrivateRoute allowedRoles={['ADMIN']}><DesktopGuard><UserListPage /></DesktopGuard></PrivateRoute>} />
                    <Route path="users/baru" element={<PrivateRoute allowedRoles={['ADMIN']}><DesktopGuard><UserFormPage /></DesktopGuard></PrivateRoute>} />
                    <Route path="users/:id/edit" element={<PrivateRoute allowedRoles={['ADMIN']}><DesktopGuard><UserFormPage /></DesktopGuard></PrivateRoute>} />

                    {/* Pengaturan */}
                    <Route path="pengaturan/cetak" element={<PrivateRoute allowedRoles={['ADMIN']}><DesktopGuard><PrintSettingsPage /></DesktopGuard></PrivateRoute>} />
                    <Route path="pengaturan/backupdata" element={<PrivateRoute allowedRoles={['ADMIN']}><DesktopGuard><BackupDataPage /></DesktopGuard></PrivateRoute>} />
                </Route>

                {/* Public routes — no auth required */}
                <Route path="/p/santri/:id" element={<SantriPublicPage />} />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
