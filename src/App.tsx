import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/features/auth';
import { Toaster } from '@/components/ui/sonner';

// Public Pages
import PublicLayout from '@/components/layouts/PublicLayout';
import PublicDashboard from '@/pages/public/Dashboard';
import PublicSubscriptions from '@/pages/public/Subscriptions';
import SubmitRequest from '@/pages/public/SubmitRequest';

// Admin Pages
import AdminLogin from '@/pages/admin/Login';
import AdminLayout from '@/components/layouts/AdminLayout';
import AdminDashboard from '@/pages/admin/Dashboard';
import Approvals from '@/pages/admin/Approvals';
import AdminSubscriptions from '@/pages/admin/Subscriptions/index';
import Vault from '@/pages/admin/Vault/index';
import Currencies from '@/pages/admin/Currencies';
import Settings from '@/pages/admin/Settings';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/admin/login" replace />;
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<PublicDashboard />} />
            <Route path="subscriptions" element={<PublicSubscriptions />} />
            <Route path="submit" element={<SubmitRequest />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="vault" element={<Vault />} />
            <Route path="currencies" element={<Currencies />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </HashRouter>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;
