import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/auth/Login";
import Unauthorized from "./pages/auth/Unauthorized";

import AdminDashboard from "./pages/admin/AdminDashboard";

import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import CreateAdmin from "./pages/super-admin/CreateAdmin";

import OfficerDashboard from "./pages/officer/OfficerDashboard";

import ProtectedRoute from "./components/ProtectedRoute";
import Administrators from "./pages/super-admin/Administrators";
import Officers from "./pages/super-admin/Officers";
import GovernmentOffices from "./pages/super-admin/GovernmentOffices";
import SystemSettings from "./pages/super-admin/SystemSettings";
function App() {
  return (
    <Routes>
      {/* =========================
          AUTHENTICATION
      ========================== */}

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/unauthorized"
        element={<Unauthorized />}
      />

      {/* =========================
          SUPER ADMIN
      ========================== */}

      <Route
        element={
          <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} />
        }
      >
        <Route
          path="/super-admin"
          element={<SuperAdminDashboard />}
        />

        <Route
          path="/super-admin/create-admin"
          element={<CreateAdmin />}
        />

        <Route
          path="/super-admin/administrators"
          element={<Administrators />}
        />

        <Route
  path="/super-admin/offices"
  element={<GovernmentOffices />}
/>

        <Route
          path="/super-admin/officers"
          element={<Officers />}
        />
      </Route>
      <Route
  path="/super-admin/settings"
  element={<SystemSettings />}
/>

      {/* =========================
          ADMIN
      ========================== */}

      <Route
        element={
  <ProtectedRoute allowedRoles={["OFFICE_ADMIN"]} />
        }
      >
        <Route
          path="/admin"
          element={<AdminDashboard />}
        />
      </Route>

      {/* =========================
          OFFICER
      ========================== */}

      <Route
        element={
          <ProtectedRoute allowedRoles={["OFFICER"]} />
        }
      >
        <Route
          path="/officer"
          element={<OfficerDashboard />}
        />
      </Route>

      {/* =========================
          DEFAULT
      ========================== */}

      <Route
        path="/"
        element={
          <Navigate to="/login" replace />
        }
      />

      {/* =========================
          UNKNOWN ROUTES
      ========================== */}

      <Route
        path="*"
        element={
          <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}

export default App;