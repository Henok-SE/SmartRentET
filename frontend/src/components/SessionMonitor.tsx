import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { refreshSession } from "../services/authService";

const ONE_HOUR_MS = 60 * 60 * 1000;
const REFRESH_WINDOW_MS = 5 * 60 * 1000;

const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("sessionExpiry");
};

function SessionMonitor() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem("token");
      const expiry = Number(localStorage.getItem("sessionExpiry") || "0");

      if (!token) {
        return;
      }

      const now = Date.now();

      if (!expiry || now >= expiry) {
        clearSession();
        navigate("/login", { replace: true });
        return;
      }

      if (expiry - now <= REFRESH_WINDOW_MS) {
        try {
          const result = await refreshSession(token);
          const newToken = result?.data?.token || token;

          localStorage.setItem("token", newToken);
          localStorage.setItem("sessionExpiry", String(Date.now() + ONE_HOUR_MS));
        } catch {
          clearSession();
          navigate("/login", { replace: true });
        }
      }
    };

    const handleActivity = () => {
      const token = localStorage.getItem("token");
      const expiry = Number(localStorage.getItem("sessionExpiry") || "0");

      if (!token || !expiry) {
        return;
      }

      const remaining = expiry - Date.now();
      if (remaining <= REFRESH_WINDOW_MS) {
        void checkSession();
      }
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity);
    });

    const intervalId = window.setInterval(() => {
      void checkSession();
    }, 30 * 1000);

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      window.clearInterval(intervalId);
    };
  }, [location.pathname, navigate]);

  return null;
}

export default SessionMonitor;
