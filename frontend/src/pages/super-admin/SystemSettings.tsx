import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "../../components/LogoutButton";
import "../../styles/super-admin-dashboard.css";

type StoredUser = {
  userId?: number | string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

function SystemSettings() {
  const navigate = useNavigate();

  const [requireRelogin, setRequireRelogin] = useState(false);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [systemNotifications, setSystemNotifications] =
    useState(true);

  const storedUser = localStorage.getItem("user");

  const user: StoredUser = useMemo(() => {
    if (!storedUser) {
      return {};
    }

    try {
      return JSON.parse(storedUser) as StoredUser;
    } catch {
      return {};
    }
  }, [storedUser]);

  const displayName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username || "Super Admin";

  const currentDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="super-admin-page">
      <aside className="super-admin-sidebar">
        <div className="super-admin-sidebar-brand">
          <img
            src="/smartrent-logo.png"
            alt="SmartRent ET"
            className="super-admin-sidebar-logo"
          />

          <div className="super-admin-sidebar-brand-text">
            <h1>SmartRent ET</h1>
            <span>ADMINISTRATION</span>
          </div>
        </div>

        <div className="super-admin-sidebar-divider" />

        <nav
          className="super-admin-navigation"
          aria-label="Super Admin navigation"
        >
          <button
            type="button"
            className="super-admin-nav-item"
            onClick={() => navigate("/super-admin")}
          >
            <span className="super-admin-nav-icon">
              ▦
            </span>
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className="super-admin-nav-item"
            onClick={() =>
              navigate("/super-admin/administrators")
            }
          >
            <span className="super-admin-nav-icon">
              ♟
            </span>
            <span>Administrators</span>
          </button>

          <button
            type="button"
            className="super-admin-nav-item"
            onClick={() =>
              navigate("/super-admin/officers")
            }
          >
            <span className="super-admin-nav-icon">
              ♟
            </span>
            <span>Officers</span>
          </button>

          <button
            type="button"
            className="super-admin-nav-item"
            onClick={() =>
              navigate("/super-admin/offices")
            }
          >
            <span className="super-admin-nav-icon">
              ◎
            </span>
            <span>Government Offices</span>
          </button>

          <button
            type="button"
            className="super-admin-nav-item active"
          >
            <span className="super-admin-nav-icon">
              ⚙
            </span>
            <span>System Settings</span>
          </button>
        </nav>

        <div className="super-admin-sidebar-bottom">
          <div className="super-admin-profile">
            <div className="super-admin-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div className="super-admin-profile-info">
              <strong>{displayName}</strong>
              <span>Super Administrator</span>
            </div>
          </div>

          <div className="super-admin-logout">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="super-admin-main">
        <header className="super-admin-topbar">
          <div className="super-admin-search">
            <span className="super-admin-search-icon">
              ⌕
            </span>

            <input
              type="text"
              placeholder="Search settings..."
              aria-label="Search settings"
            />
          </div>

          <div className="super-admin-topbar-user">
            <span className="super-admin-user-status" />

            <span className="super-admin-topbar-name">
              {displayName}
            </span>
          </div>
        </header>

        <main className="super-admin-content">
          <section className="super-admin-page-heading">
            <div>
              <span className="super-admin-eyebrow">
                SYSTEM CONFIGURATION
              </span>

              <h1>System Settings</h1>

              <p>
                Manage Super Admin preferences and system
                behavior.
              </p>
            </div>

            <button
              type="button"
              className="super-admin-outline-button"
              onClick={() => navigate("/super-admin")}
            >
              Back to Dashboard
            </button>
          </section>

          <section className="super-admin-management-card">
            <div className="super-admin-management-header">
              <div>
                <span className="super-admin-section-eyebrow">
                  SECURITY
                </span>

                <h2>Security Settings</h2>

                <p>
                  Configure security-related preferences for
                  the administration interface.
                </p>
              </div>
            </div>

            <div style={{ padding: "24px 28px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "20px",
                  padding: "18px 0",
                  borderBottom:
                    "1px solid #eef2f0",
                }}
              >
                <div>
                  <strong
                    style={{
                      display: "block",
                      color: "#111820",
                      fontSize: "15px",
                    }}
                  >
                    Multi-factor authentication
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: "5px",
                      color: "#788991",
                      fontSize: "13px",
                    }}
                  >
                    OTP verification is supported for
                    applicable accounts.
                  </span>
                </div>

                <span
                  style={{
                    padding: "6px 11px",
                    borderRadius: "999px",
                    background: "#e6f7f3",
                    color: "#008f78",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  Enabled
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "20px",
                  padding: "18px 0",
                }}
              >
                <div>
                  <strong
                    style={{
                      display: "block",
                      color: "#111820",
                      fontSize: "15px",
                    }}
                  >
                    Require re-login after inactivity
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: "5px",
                      color: "#788991",
                      fontSize: "13px",
                    }}
                  >
                    Frontend preference only for now.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setRequireRelogin(
                      (previous) => !previous
                    )
                  }
                  style={{
                    minWidth: "82px",
                    height: "38px",
                    border: "1px solid #cbd8d5",
                    borderRadius: "999px",
                    background: requireRelogin
                      ? "#0db792"
                      : "#f3f6f5",
                    color: requireRelogin
                      ? "#ffffff"
                      : "#53636c",
                    fontFamily: "inherit",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {requireRelogin
                    ? "Enabled"
                    : "Disabled"}
                </button>
              </div>
            </div>
          </section>

          <section className="super-admin-management-card">
            <div className="super-admin-management-header">
              <div>
                <span className="super-admin-section-eyebrow">
                  NOTIFICATIONS
                </span>

                <h2>Notification Preferences</h2>

                <p>
                  Manage local notification preferences
                  for this interface.
                </p>
              </div>
            </div>

            <div style={{ padding: "24px 28px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "20px",
                  padding: "18px 0",
                  borderBottom:
                    "1px solid #eef2f0",
                }}
              >
                <div>
                  <strong
                    style={{
                      display: "block",
                      color: "#111820",
                      fontSize: "15px",
                    }}
                  >
                    SMS notifications
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: "5px",
                      color: "#788991",
                      fontSize: "13px",
                    }}
                  >
                    Frontend preference only; SMS delivery
                    is handled by the backend.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSmsNotifications(
                      (previous) => !previous
                    )
                  }
                  style={{
                    minWidth: "82px",
                    height: "38px",
                    border: "1px solid #cbd8d5",
                    borderRadius: "999px",
                    background: smsNotifications
                      ? "#0db792"
                      : "#f3f6f5",
                    color: smsNotifications
                      ? "#ffffff"
                      : "#53636c",
                    fontFamily: "inherit",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {smsNotifications
                    ? "Enabled"
                    : "Disabled"}
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "20px",
                  padding: "18px 0",
                }}
              >
                <div>
                  <strong
                    style={{
                      display: "block",
                      color: "#111820",
                      fontSize: "15px",
                    }}
                  >
                    System notifications
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: "5px",
                      color: "#788991",
                      fontSize: "13px",
                    }}
                  >
                    Show system notifications within the
                    administration interface.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSystemNotifications(
                      (previous) => !previous
                    )
                  }
                  style={{
                    minWidth: "82px",
                    height: "38px",
                    border: "1px solid #cbd8d5",
                    borderRadius: "999px",
                    background: systemNotifications
                      ? "#0db792"
                      : "#f3f6f5",
                    color: systemNotifications
                      ? "#ffffff"
                      : "#53636c",
                    fontFamily: "inherit",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {systemNotifications
                    ? "Enabled"
                    : "Disabled"}
                </button>
              </div>
            </div>
          </section>

          <section className="super-admin-management-card">
            <div className="super-admin-management-header">
              <div>
                <span className="super-admin-section-eyebrow">
                  SYSTEM INFORMATION
                </span>

                <h2>SmartRent ET</h2>

                <p>
                  Government rental management portal.
                </p>
              </div>
            </div>

            <div style={{ padding: "24px 28px" }}>
              <div
                style={{
                  display: "grid",
                  gap: "14px",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "block",
                      color: "#84929a",
                      fontSize: "12px",
                    }}
                  >
                    Application
                  </span>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "4px",
                      color: "#111820",
                      fontSize: "15px",
                    }}
                  >
                    SmartRent ET
                  </strong>
                </div>

                <div>
                  <span
                    style={{
                      display: "block",
                      color: "#84929a",
                      fontSize: "12px",
                    }}
                  >
                    Portal
                  </span>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "4px",
                      color: "#111820",
                      fontSize: "15px",
                    }}
                  >
                    Government Rental Management Portal
                  </strong>
                </div>

                <div>
                  <span
                    style={{
                      display: "block",
                      color: "#84929a",
                      fontSize: "12px",
                    }}
                  >
                    Access level
                  </span>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "4px",
                      color: "#111820",
                      fontSize: "15px",
                    }}
                  >
                    Super Administrator
                  </strong>
                </div>
              </div>
            </div>
          </section>

          <div className="super-admin-footer-date">
            SmartRent ET Administration ·{" "}
            {currentDate}
          </div>
        </main>
      </div>
    </div>
  );
}

export default SystemSettings;