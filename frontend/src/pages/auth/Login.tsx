import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  login,
  verifyOTP,
  changePassword,
} from "../../services/authService";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [requiresOTP, setRequiresOTP] = useState(false);
  const [otpUserId, setOtpUserId] = useState<number | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [requiresPasswordChange, setRequiresPasswordChange] =
    useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await login({
        username: username.trim(),
        password,
      });

      /*
       * OFFICE ADMIN OTP FLOW
       */
      if (response.requiresOTP) {
        if (response.userId === undefined) {
          throw new Error(
            "OTP user ID was not returned by the server."
          );
        }

        setRequiresOTP(true);
        setOtpUserId(response.userId);
        setOtpCode("");
        return;
      }

      /*
       * NORMAL LOGIN
       * SUPER_ADMIN / OFFICER
       */
      const { token, user } = response.data ?? {};

      if (!token || !user) {
        throw new Error(
          "Invalid login response from server."
        );
      }

      localStorage.setItem("token", token);
      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      if (user.role === "SUPER_ADMIN") {
  navigate("/super-admin");
} else if (user.role === "OFFICE_ADMIN") {
  navigate("/office-admin/dashboard");
} else if (user.role === "OFFICER") {
  navigate("/officer");
} else {
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
        setError("Unable to login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };
const handleOtpDigitChange = (
  index: number,
  value: string
) => {
  const digit = value
    .replace(/\D/g, "")
    .slice(-1);

  const digits = otpCode.padEnd(6, "").split("");

  digits[index] = digit;

  const nextCode = digits.join("").slice(0, 6);

  setOtpCode(nextCode);

  if (digit && index < 5) {
    otpInputRefs.current[index + 1]?.focus();
  }
};

const handleOtpKeyDown = (
  index: number,
  event: React.KeyboardEvent<HTMLInputElement>
) => {
  if (
    event.key === "Backspace" &&
    !event.currentTarget.value &&
    index > 0
  ) {
    otpInputRefs.current[index - 1]?.focus();
  }
};

const handleOtpPaste = (
  event: React.ClipboardEvent<HTMLInputElement>
) => {
  event.preventDefault();

  const pastedCode = event.clipboardData
    .getData("text")
    .replace(/\D/g, "")
    .slice(0, 6);

  if (!pastedCode) {
    return;
  }

  setOtpCode(pastedCode);

  const lastIndex = Math.min(
    pastedCode.length,
    6
  ) - 1;

  if (lastIndex >= 0) {
    otpInputRefs.current[lastIndex]?.focus();
  }
};
  const handleOTPSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (otpUserId === null) {
      setError(
        "OTP session is invalid. Please login again."
      );
      return;
    }

    if (!otpCode.trim()) {
      setError("Please enter the verification code.");
      return;
    }

    setLoading(true);

    try {
      const response = await verifyOTP(
        otpUserId,
        otpCode.trim()
      );

      /*
       * FIRST-TIME OFFICE ADMIN
       *
       * Backend returns tempToken and asks for
       * immediate password change.
       */
      if (response.requiresPasswordChange) {
        if (!response.tempToken) {
          throw new Error(
            "OTP verified, but no temporary session was returned."
          );
        }

        localStorage.setItem(
          "tempToken",
          response.tempToken
        );

        localStorage.setItem(
          "otpUserId",
          String(otpUserId)
        );

        setRequiresPasswordChange(true);
        return;
      }

      /*
       * NORMAL OTP-VERIFIED LOGIN
       */
      const { token, user } = response.data ?? {};

      if (!token || !user) {
        throw new Error(
          "OTP verified, but no login session was returned."
        );
      }

      localStorage.setItem("token", token);
      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      if (user.role === "OFFICE_ADMIN") {
  navigate("/office-admin/dashboard");
} else if (user.role === "OFFICER") {
  navigate("/officer");
} else if (user.role === "SUPER_ADMIN") {
  navigate("/super-admin");
} else {
  setError(
    "This account does not have dashboard access."
  );
} 
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("OTP verification failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (otpUserId === null) {
      setError(
        "Password change session is invalid. Please login again."
      );
      return;
    }

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setError(
        "New password must be at least 6 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await changePassword(
        otpUserId,
        password,
        newPassword
      );

      localStorage.removeItem("tempToken");
      localStorage.removeItem("otpUserId");

      /*
       * Log in again using the new password.
       * The backend should skip OTP after the one-time OTP
       * has already been used.
       */
      const response = await login({
        username: username.trim(),
        password: newPassword,
      });

      const { token, user } = response.data ?? {};

      if (!token || !user) {
        throw new Error(
          "Password changed, but login session was not returned."
        );
      }

      localStorage.setItem("token", token);
      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      navigate("/office-admin/dashboard");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to change password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="figma-login-page">
      <div className="figma-login-container">
        <div className="figma-login-brand">
          <img
            src="/smartrent-logo.png"
            alt="SmartRent ET"
            className="figma-login-logo"
          />

          <h1>SmartRent ET</h1>
          <p>Government Portal</p>
        </div>

        {requiresPasswordChange ? (
          <form
            className="figma-login-form"
            onSubmit={handlePasswordChange}
          >
            {error && (
              <div
                className="figma-login-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="figma-login-field">
              <label htmlFor="newPassword">
                New Password
              </label>

              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(event.target.value)
                }
                placeholder="Enter your new password"
                autoComplete="new-password"
                disabled={loading}
                minLength={6}
                required
              />
            </div>

            <div className="figma-login-field">
              <label htmlFor="confirmPassword">
                Confirm New Password
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Confirm your new password"
                autoComplete="new-password"
                disabled={loading}
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              className="figma-login-button"
              disabled={loading}
            >
              {loading
                ? "Changing Password..."
                : "Change Password"}
            </button>

            <div className="figma-forgot-password">
              Please change your temporary password before
              continuing.
            </div>
          </form>
       ) : requiresOTP ? (
  <form
    className="figma-login-form otp-login-form"
    onSubmit={handleOTPSubmit}
  >
    <div className="otp-card">
      <div
        className="otp-security-icon"
        aria-hidden="true"
      >
        <span>✓</span>
      </div>

      <h2>Verify Your Identity</h2>

      <p className="otp-description">
        We've sent a 6-digit verification code to
        your registered phone number.
      </p>

      {error && (
        <div
          className="figma-login-error"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="otp-field">
        <label htmlFor="otp-0">
          Verification Code
        </label>

        <div className="otp-input-group">
          {Array.from({ length: 6 }).map(
            (_, index) => (
              <input
                key={index}
                ref={(element) => {
                  otpInputRefs.current[index] =
                    element;
                }}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={otpCode[index] || ""}
                onChange={(event) =>
                  handleOtpDigitChange(
                    index,
                    event.target.value
                  )
                }
                onKeyDown={(event) =>
                  handleOtpKeyDown(
                    index,
                    event
                  )
                }
                onPaste={
                  index === 0
                    ? handleOtpPaste
                    : undefined
                }
                autoComplete={
                  index === 0
                    ? "one-time-code"
                    : "off"
                }
                disabled={loading}
                aria-label={`Verification digit ${
                  index + 1
                }`}
                required
              />
            )
          )}
        </div>

        <small className="otp-help-text">
          Enter the 6-digit code sent to your phone.
        </small>
      </div>

      <button
        type="submit"
        className="figma-login-button"
        disabled={
          loading || otpCode.length !== 6
        }
      >
        {loading
          ? "Verifying..."
          : "Verify Code"}
      </button>

      <div className="otp-footer-message">
        <span aria-hidden="true">🔒</span>

        <span>
          Your verification code helps protect your
          SmartRent ET account.
        </span>
      </div>
    </div>
  </form>

        ) : (
          <form
            className="figma-login-form"
            onSubmit={handleSubmit}
          >
            {error && (
              <div
                className="figma-login-error"
                role="alert"
              >
                {error}
              </div>
            )}

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
          </form>
        )}

        <div className="figma-government-notice">
          Authorized Government Personnel Only
        </div>
      </div>
    </div>
  );
}

export default Login;