import { useNavigate } from "react-router-dom";

function Unauthorized() {
  const navigate = useNavigate();

  const handleBack = () => {
    const storedUser = localStorage.getItem("user");

    try {
      const user = storedUser
        ? JSON.parse(storedUser)
        : null;

      if (user?.role === "SUPER_ADMIN") {
        navigate("/super-admin");
      } else if (user?.role === "OFFICE_ADMIN") {
  navigate("/admin");
      } else if (user?.role === "OFFICER") {
        navigate("/officer");
      } else {
        navigate("/login");
      }
    } catch {
      navigate("/login");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Access Denied</h1>

          <p>
            You do not have permission to access this page.
          </p>
        </div>

        <button
          type="button"
          onClick={handleBack}
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}

export default Unauthorized;