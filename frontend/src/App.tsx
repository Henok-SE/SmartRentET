import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/auth/Login";
import Unauthorized from "./pages/auth/Unauthorized";

import AdminDashboard from "./pages/admin/AdminDashboard";

import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import CreateAdmin from "./pages/super-admin/CreateAdmin";

import OfficerDashboard from "./pages/officer/OfficerDashboard";

import ProtectedRoute from "./components/ProtectedRoute";

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
      </Route>

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