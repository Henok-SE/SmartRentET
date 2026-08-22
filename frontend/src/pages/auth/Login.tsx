import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login, verifyOTP } from "../../services/authService";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [otpUserId, setOtpUserId] = useState<number | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [debugOTP, setDebugOTP] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      if (requiresOTP && otpUserId) {
        // Submit OTP Verification
        const response = await verifyOTP(otpUserId, otpCode.trim());
        if (!response.data || !response.data.token || !response.data.user) {
          throw new Error("Invalid response from server during OTP verification.");
        }

        const { token, user } = response.data;
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));

        if (user.role === "SUPER_ADMIN") {
          navigate("/super-admin");
        } else if (user.role === "OFFICE_ADMIN") {
          navigate("/admin");
        } else if (user.role === "OFFICER") {
          navigate("/officer");
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setError("This account does not have dashboard access.");
        }
      } else {
        // Initial Login
        const response = await login({
          username: username.trim(),
          password,
        });

        if (response.requiresOTP && response.userId) {
          setRequiresOTP(true);
          setOtpUserId(response.userId);
          setDebugOTP(response.debugOTP || null);
          setLoading(false);
          return;
        }

        if (!response.data || !response.data.token || !response.data.user) {
          throw new Error("Invalid login response from server.");
        }

        const { token, user } = response.data;
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));

        if (user.role === "SUPER_ADMIN") {
          navigate("/super-admin");
        } else if (user.role === "OFFICE_ADMIN") {
          navigate("/admin");
        } else if (user.role === "OFFICER") {
          navigate("/officer");
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setError("This account does not have dashboard access.");
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to login. Please try again.");
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

          {requiresOTP ? (
            /* =====================================================
               OTP VERIFICATION FORM
               ===================================================== */
            <>
              <div className="figma-login-field">
                <label htmlFor="otpCode">
                  Enter 6-Digit OTP Code
                </label>
                <input
                  id="otpCode"
                  name="otpCode"
                  type="text"
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value)}
                  placeholder="Enter OTP (e.g. 123456)"
                  disabled={loading}
                  required
                />
                {debugOTP && (
                  <p style={{ fontSize: "12px", color: "#00b074", marginTop: "4px" }}>
                    Demo OTP: <strong>{debugOTP}</strong>
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="figma-login-button"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <div
                className="figma-forgot-password"
                style={{ cursor: "pointer", marginTop: "12px" }}
                onClick={() => {
                  setRequiresOTP(false);
                  setError("");
                }}
              >
                Back to Login
              </div>
            </>
          ) : (
            /* =====================================================
               STANDARD LOGIN FORM
               ===================================================== */
            <>
              <div className="figma-login-field">
                <label htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  disabled={loading}
                  required
                />
              </div>

              <div className="figma-login-field">
                <label htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
              </div>

              <button
                type="submit"
                className="figma-login-button"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login"}
              </button>

              <div className="figma-forgot-password">
                Forgot Password
              </div>
            </>
          )}

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