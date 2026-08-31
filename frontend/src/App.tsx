import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/auth/Login";
import Unauthorized from "./pages/auth/Unauthorized";

// Office Admin
import OfficeAdminDashboard from "./pages/admin/OfficeAdminDashboard";
import OfficersManagement from "./pages/admin/OfficersManagement";
import AuditLogs from "./pages/admin/AuditLogs";
// Super Admin
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import CreateAdmin from "./pages/super-admin/CreateAdmin";
import Administrators from "./pages/super-admin/Administrators";
import Officers from "./pages/super-admin/Officers";
import GovernmentOffices from "./pages/super-admin/GovernmentOffices";
import SystemSettings from "./pages/super-admin/SystemSettings";

// Officer
import OfficerDashboard from "./pages/officer/OfficerDashboard";
import RentalAgreements from "./pages/officer/RentalAgreements";

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

        <Route
          path="/super-admin/settings"
          element={<SystemSettings />}
        />
      </Route>

     {/* =========================
    OFFICE ADMIN
========================== */}

<Route
  element={
    <ProtectedRoute allowedRoles={["OFFICE_ADMIN"]} />
  }
>
  <Route
    path="/office-admin/dashboard"
    element={<OfficeAdminDashboard />}
  />

  <Route
    path="/office-admin/officers"
    element={<OfficersManagement />}
  />

  <Route
    path="/office-admin/audit-logs"
    element={<AuditLogs />}
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

        <Route
          path="/officer/dashboard"
          element={<OfficerDashboard />}
        />

        <Route
          path="/officer/rental-agreements"
          element={<RentalAgreements />}
        />
      </Route>

      {/* =========================
          DEFAULT
      ========================== */}

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      {/* =========================
          UNKNOWN ROUTES
      ========================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

    </Routes>
  );
}

export default App;
