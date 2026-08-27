import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/auth/Login";
import Unauthorized from "./pages/auth/Unauthorized";

// Office Admin
import OfficeAdminDashboard from "./pages/admin/OfficeAdminDashboard";
import OfficersManagement from "./pages/admin/OfficersManagement";

// Super Admin
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import CreateAdmin from "./pages/super-admin/CreateAdmin";

// Officer
import OfficerDashboard from "./pages/officer/OfficerDashboard";
import RentalAgreements from "./pages/officer/RentalAgreements";

<<<<<<< HEAD
import ProtectedRoute from "./components/ProtectedRoute";
import Administrators from "./pages/super-admin/Administrators";
import Officers from "./pages/super-admin/Officers";
import GovernmentOffices from "./pages/super-admin/GovernmentOffices";
import SystemSettings from "./pages/super-admin/SystemSettings";
=======

>>>>>>> 38d9206 (Update admin and officer dashboards)
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
        path="/super-admin"
        element={<SuperAdminDashboard />}
      />

      <Route
        path="/super-admin/create-admin"
        element={<CreateAdmin />}
      />

<<<<<<< HEAD
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
=======
>>>>>>> 38d9206 (Update admin and officer dashboards)

      {/* =========================
          OFFICE ADMIN
      ========================== */}

      <Route
        path="/office-admin/dashboard"
        element={<OfficeAdminDashboard />}
      />

      <Route
        path="/office-admin/officers"
        element={<OfficersManagement />}
      />


      {/* =========================
          OFFICER
      ========================== */}

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
