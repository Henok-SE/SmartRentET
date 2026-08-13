import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/authService";

const SUPER_ADMIN_USERNAME = "superadmin";
const SUPER_ADMIN_PASSWORD = "SuperAdmin123";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      /*
       * =====================================================
       * SUPER ADMIN
       * =====================================================
       *
       * Development-only authentication for now.
       * This should eventually be moved to the backend.
       */
      if (
        username.trim() === SUPER_ADMIN_USERNAME &&
        password === SUPER_ADMIN_PASSWORD
      ) {
        const superAdmin = {
          userId: "super-admin",
          username: SUPER_ADMIN_USERNAME,
          role: "SUPER_ADMIN" as const,
          firstName: "Super",
          lastName: "Admin",
        };

        localStorage.setItem(
          "token",
          "super-admin-token"
        );

        localStorage.setItem(
          "user",
          JSON.stringify(superAdmin)
        );

        navigate("/super-admin");

        return;
      }

      /*
       * =====================================================
       * ADMIN / OFFICER
       * =====================================================
       *
       * Authenticate through the backend.
       */
      const response = await login({
        username: username.trim(),
        password,
      });

      const { token, user } = response.data;

      if (!token || !user) {
        throw new Error(
          "Invalid login response from server."
        );
      }

      /*
       * Store authenticated session
       */
      localStorage.setItem("token", token);
      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      /*
       * =====================================================
       * ROLE ROUTING
       * =====================================================
       */

      if (user.role === "ADMIN") {
        navigate("/admin");
      } else if (user.role === "OFFICER") {
        navigate("/officer");
      } else {
        /*
         * Only these three roles are allowed:
         *
         * SUPER_ADMIN
         * ADMIN
         * OFFICER
         *
         * SUPER_ADMIN is handled above.
         */
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setError(
          "This account does not have dashboard access."
        );
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to login. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="figma-login-page">
      <div className="figma-login-container">

        {/* =====================================================
            BRAND
            ===================================================== */}
        <div className="figma-login-brand">

          <img
            src="/smartrent-logo.png"
            alt="SmartRent ET"
            className="figma-login-logo"
          />

          <h1>SmartRent ET</h1>

          <p>Government Portal</p>

        </div>


        {/* =====================================================
            LOGIN FORM
            ===================================================== */}
        <form
          className="figma-login-form"
          onSubmit={handleSubmit}
        >

          {/* Error */}
          {error && (
            <div
              className="figma-login-error"
              role="alert"
            >
              {error}
            </div>
          )}


          {/* Username */}
          <div className="figma-login-field">

            <label htmlFor="username">
              Username
            </label>

            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              placeholder="Enter username"
              autoComplete="username"
              disabled={loading}
              required
            />

          </div>


          {/* Password */}
          <div className="figma-login-field">

            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter password"
              autoComplete="current-password"
              disabled={loading}
              required
            />

          </div>


          {/* Login Button */}
          <button
            type="submit"
            className="figma-login-button"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>


          {/* Forgot Password */}
          <div className="figma-forgot-password">
            Forgot Password
          </div>

        </form>


        {/* =====================================================
            GOVERNMENT NOTICE
            ===================================================== */}
        <div className="figma-government-notice">
          Authorized Government Personnel Only
        </div>

      </div>
    </div>
  );
}

export default Login;