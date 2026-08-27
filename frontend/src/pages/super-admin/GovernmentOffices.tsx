import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "../../components/LogoutButton";
import { apiRequest } from "../../services/api";
import "../../styles/super-admin-dashboard.css";

type GovernmentOffice = {
  officeId: string;
  officeCode: string;
  officeName: string;
  region?: string | null;
  city?: string | null;
  subCity?: string | null;
  woreda?: string | null;
  address?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  createdAt?: string;
};

type OfficeListResponse = {
  success: boolean;
  message?: string;
  data: GovernmentOffice[];
};

type StoredUser = {
  userId?: number | string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

function GovernmentOffices() {
  const navigate = useNavigate();

  const [offices, setOffices] = useState<GovernmentOffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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

  const loadOffices = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      const response =
        await apiRequest<OfficeListResponse>(
          "/dashboard/offices",
          {
            method: "GET",
            cache: "no-store",
            headers: token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : undefined,
          }
        );

      setOffices(response.data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Failed to load government offices."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOffices();
  }, []);

  const activeCount = offices.filter(
    (office) => office.status === "ACTIVE"
  ).length;

  const inactiveCount = offices.filter(
    (office) => office.status === "INACTIVE"
  ).length;

  const filteredOffices = offices.filter((office) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [
      office.officeCode,
      office.officeName,
      office.region,
      office.city,
      office.subCity,
      office.woreda,
      office.address,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value)
          .toLowerCase()
          .includes(query)
      );
  });

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
            className="super-admin-nav-item active"
          >
            <span className="super-admin-nav-icon">
              ◎
            </span>
            <span>Government Offices</span>
          </button>

          <button
            type="button"
            className="super-admin-nav-item"
            onClick={() =>
              navigate("/super-admin/settings")
            }
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
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search government offices..."
              aria-label="Search government offices"
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
                OFFICE MANAGEMENT
              </span>

              <h1>Government Offices</h1>

              <p>
                Manage government offices available in
                SmartRent ET.
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

          <section className="super-admin-stat-grid">
            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ◎
              </div>

              <div className="super-admin-stat-content">
                <span>Total Offices</span>
                <strong>{offices.length}</strong>
                <small>Registered offices</small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ✓
              </div>

              <div className="super-admin-stat-content">
                <span>Active Offices</span>
                <strong>{activeCount}</strong>
                <small>Currently active</small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ○
              </div>

              <div className="super-admin-stat-content">
                <span>Inactive Offices</span>
                <strong>{inactiveCount}</strong>
                <small>Currently inactive</small>
              </div>
            </article>
          </section>

          <section className="super-admin-management-card">
            <div className="super-admin-management-header">
              <div>
                <span className="super-admin-section-eyebrow">
                  GOVERNMENT OFFICES
                </span>

                <h2>All Government Offices</h2>

                <p>
                  Government offices registered in
                  SmartRent ET.
                </p>
              </div>

              <button
                type="button"
                className="super-admin-outline-button"
                onClick={() => void loadOffices()}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {error && (
              <div
                className="super-admin-form-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {loading ? (
              <div className="super-admin-empty-state">
                <div className="super-admin-empty-icon">
                  ⏳
                </div>

                <h3>Loading government offices...</h3>

                <p>
                  Retrieving registered government
                  offices.
                </p>
              </div>
            ) : filteredOffices.length === 0 ? (
              <div className="super-admin-empty-state">
                <div className="super-admin-empty-icon">
                  ◎
                </div>

                <h3>
                  {search
                    ? "No offices found"
                    : "No government offices yet"}
                </h3>

                <p>
                  {search
                    ? `No offices match "${search}".`
                    : "Government offices will appear here once they are created."}
                </p>
              </div>
            ) : (
              <div
                style={{
                  overflowX: "auto",
                  padding: "20px 28px 28px",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "950px",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          padding: "14px 12px",
                          textAlign: "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color: "#5f707a",
                          fontSize: "13px",
                        }}
                      >
                        Office
                      </th>

                      <th
                        style={{
                          padding: "14px 12px",
                          textAlign: "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color: "#5f707a",
                          fontSize: "13px",
                        }}
                      >
                        Location
                      </th>

                      <th
                        style={{
                          padding: "14px 12px",
                          textAlign: "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color: "#5f707a",
                          fontSize: "13px",
                        }}
                      >
                        Woreda
                      </th>

                      <th
                        style={{
                          padding: "14px 12px",
                          textAlign: "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color: "#5f707a",
                          fontSize: "13px",
                        }}
                      >
                        Address
                      </th>

                      <th
                        style={{
                          padding: "14px 12px",
                          textAlign: "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color: "#5f707a",
                          fontSize: "13px",
                        }}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOffices.map((office) => (
                      <tr key={office.officeId}>
                        <td
                          style={{
                            padding: "16px 12px",
                            borderBottom:
                              "1px solid #eef2f0",
                          }}
                        >
                          <strong>
                            {office.officeCode}
                          </strong>

                          <div
                            style={{
                              marginTop: "4px",
                              color: "#788991",
                              fontSize: "12px",
                            }}
                          >
                            {office.officeName}
                          </div>
                        </td>

                        <td
                          style={{
                            padding: "16px 12px",
                            borderBottom:
                              "1px solid #eef2f0",
                            color: "#53636c",
                          }}
                        >
                          {[
                            office.city,
                            office.subCity,
                            office.region,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </td>

                        <td
                          style={{
                            padding: "16px 12px",
                            borderBottom:
                              "1px solid #eef2f0",
                            color: "#53636c",
                          }}
                        >
                          {office.woreda || "—"}
                        </td>

                        <td
                          style={{
                            padding: "16px 12px",
                            borderBottom:
                              "1px solid #eef2f0",
                            color: "#53636c",
                          }}
                        >
                          {office.address || "—"}
                        </td>

                        <td
                          style={{
                            padding: "16px 12px",
                            borderBottom:
                              "1px solid #eef2f0",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              padding: "6px 10px",
                              borderRadius: "999px",
                              background:
                                office.status ===
                                "ACTIVE"
                                  ? "#e6f7f3"
                                  : "#f3f4f6",
                              color:
                                office.status ===
                                "ACTIVE"
                                  ? "#008f78"
                                  : "#6b7280",
                              fontSize: "12px",
                              fontWeight: 700,
                            }}
                          >
                            {office.status ||
                              "Unknown"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

export default GovernmentOffices;