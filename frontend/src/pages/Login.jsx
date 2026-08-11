import { useState } from "react";
import {
  User,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import "../App.css";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!username || !password) {
      alert("Please enter your username and password.");
      return;
    }

    alert("Login button is working!");
  };

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Header */}
        <div className="login-header">
          <div className="admin-icon">
            <ShieldCheck size={30} />
          </div>

          <h1>SmartRent ET</h1>
          <p>Government portal</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>

          {/* Username */}
          <div className="form-group">
            <label htmlFor="username">Username</label>

            <div className="input-with-icon">
              <User size={18} />

              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">Password</label>

            <div className="input-with-icon">
              <KeyRound size={18} />

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="forgot-password-container">
            <button
              type="button"
              className="forgot-password"
              onClick={() =>
                alert("Password reset feature coming soon.")
              }
            >
              Forgot password?
            </button>
          </div>

          {/* Login Button */}
          <button type="submit" className="login-button">
            Login
          </button>

          {/* Authorization Notice */}
          <p className="authorization-notice">
            Authorized Government Personnel Only
          </p>

        </form>
      </div>
    </div>
  );
}

export default Login;

