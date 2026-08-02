import { Navigate, Route, Routes } from 'react-router-dom';

import UndefPage from './features/404';
import AdminDashboard from './features/admin/AdminDashboard';
import AdminLayout from './features/admin/AdminLayout';
import AppointmentsPage from './features/admin/AppointmentsPage';
import BarbersPage from './features/admin/BarbersPage';
import PaymentsPage from './features/admin/PaymentsPage';
import ReportsPage from './features/admin/ReportsPage';
import RevenuePage from './features/admin/RevenuePage';
import SchedulesPage from './features/admin/SchedulesPage';
import ServicesPage from './features/admin/ServicesPage';
import SettingsPage from './features/admin/SettingsPage';
import UsersPage from './features/admin/UsersPage';
import ForgotPassPage from './features/auth/ForgotPasswordPage';
import LoginPage from './features/auth/LoginPage';
import SignupPage from './features/auth/SignupPage';
import BarbersCatalogPage from './features/barbers/BarbersCatalogPage';
import HomePage from './features/home/HomePage';
import ServicesCatalogPage from './features/services/ServicesCatalogPage';
import ProfilePage from './features/profile/ProfilePage';
import CustomerRoute from './shared/CustomerRoute';
import ProtectedRoute from './shared/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/services" element={<ServicesCatalogPage />} />
      <Route path="/barbers" element={<BarbersCatalogPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPassPage />} />
      <Route
        path="/profile"
        element={
          <CustomerRoute>
            <ProfilePage />
          </CustomerRoute>
        }
      />

      <Route
        path="/administrator"
        element={
          <ProtectedRoute checkEndpoint="/administrator/check">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="revenue" element={<RevenuePage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="barbers" element={<BarbersPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="schedules" element={<SchedulesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />

        <Route
          path="user"
          element={<Navigate to="/administrator/users" replace />}
        />
        <Route
          path="barber"
          element={<Navigate to="/administrator/barbers" replace />}
        />
        <Route
          path="appointment"
          element={<Navigate to="/administrator/appointments" replace />}
        />
        <Route
          path="payment"
          element={<Navigate to="/administrator/payments" replace />}
        />
      </Route>

      <Route path="*" element={<UndefPage />} />
    </Routes>
  );
}

export default App;
