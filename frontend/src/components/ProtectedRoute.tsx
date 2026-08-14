import { Navigate, Outlet } from "react-router-dom";

type AllowedRole = "SUPER_ADMIN" | "ADMIN" | "OFFICER";

interface ProtectedRouteProps {
  allowedRoles?: AllowedRole[];
}

function ProtectedRoute({
  allowedRoles,
}: ProtectedRouteProps) {
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");

  // Not logged in
  if (!token || !storedUser) {
    return <Navigate to="/login" replace />;
  }

  let user: {
    role?: string;
  };

  try {
    user = JSON.parse(storedUser);
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    return <Navigate to="/login" replace />;
  }

  // Logged in, but wrong role
  if (
    allowedRoles &&
    (!user.role ||
      !allowedRoles.includes(user.role as AllowedRole))
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;