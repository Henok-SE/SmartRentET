import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "../../components/LogoutButton";
import { apiRequest } from "../../services/api";
import "../../styles/super-admin-dashboard.css";

type OfficeAdmin = {
  officeAdminId: string;
  employeeId: string;
  createdAt: string;
  user: {
    userId: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone: string;
    username?: string | null;
    role: string;
    isActive: boolean;
  };
  office: {
    officeId: string;
    officeCode: string;
    officeName: string;
    region?: string | null;
    city?: string | null;
    subCity?: string | null;
    woreda?: string | null;
    status?: "ACTIVE" | "INACTIVE";
  };
};

type OfficeAdminListResponse = {
  success: boolean;
  message?: string;
  data: OfficeAdmin[];
};

type StoredUser = {
  userId?: number | string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

function Administrators() {
  const navigate = useNavigate();

  const [admins, setAdmins] = useState<OfficeAdmin[]>([]);
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

  const loadAdmins = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      const response =
        await apiRequest<OfficeAdminListResponse>(
          "/dashboard/office-admins",
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

      setAdmins(response.data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load administrators.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAdmins();
  }, []);

  const filteredAdmins = admins.filter((admin) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [
      admin.user.firstName,
      admin.user.lastName,
      admin.user.username,
      admin.user.email,
      admin.user.phone,
      admin.employeeId,
      admin.office.officeCode,
      admin.office.officeName,
      admin.office.city,
      admin.office.subCity,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(query)
      );
  });

  const activeCount = admins.filter(
    (admin) => admin.user.isActive
  ).length;

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
            className="super-admin-nav-item active"
          >
            <span className="super-admin-nav-icon">
              ♟
            </span>
            <span>Administrators</span>
          </button>

          <button
            type="button"
            className="super-admin-nav-item"
            onClick={() => navigate("/super-admin/officers")}
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
              placeholder="Search administrators..."
              aria-label="Search administrators"
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
                USER MANAGEMENT
              </span>

              <h1>Administrators</h1>

              <p>
                Manage Office Administrators and their
                assigned Government Offices.
              </p>
            </div>

            <button
              type="button"
              className="super-admin-primary-button"
              onClick={() =>
                navigate("/super-admin/create-admin")
              }
            >
              <span>+</span>
              Create Admin
            </button>
          </section>

          <section className="super-admin-stat-grid">
            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ♟
              </div>

              <div className="super-admin-stat-content">
                <span>Total Administrators</span>
                <strong>{admins.length}</strong>
                <small>Registered accounts</small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ✓
              </div>

              <div className="super-admin-stat-content">
                <span>Active Administrators</span>
                <strong>{activeCount}</strong>
                <small>Currently active</small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ◎
              </div>

              <div className="super-admin-stat-content">
                <span>Inactive Administrators</span>
                <strong>
                  {admins.length - activeCount}
                </strong>
                <small>Currently inactive</small>
              </div>
            </article>
          </section>

          <section className="super-admin-management-card">
            <div className="super-admin-management-header">
              <div>
                <span className="super-admin-section-eyebrow">
                  ADMINISTRATOR ACCOUNTS
                </span>

                <h2>All Administrators</h2>

                <p>
                  Office Administrators registered in
                  SmartRent ET.
                </p>
              </div>

              <button
                type="button"
                className="super-admin-outline-button"
                onClick={() => void loadAdmins()}
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

                <h3>Loading administrators...</h3>

                <p>
                  Retrieving Office Administrator
                  accounts.
                </p>
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="super-admin-empty-state">
                <div className="super-admin-empty-icon">
                  ♟
                </div>

                <h3>
                  {search
                    ? "No administrators found"
                    : "No administrators yet"}
                </h3>

                <p>
                  {search
                    ? `No administrators match "${search}".`
                    : "Create an administrator account to begin managing SmartRent officers and operations."}
                </p>

                {!search && (
                  <button
                    type="button"
                    className="super-admin-primary-button super-admin-empty-button"
                    onClick={() =>
                      navigate(
                        "/super-admin/create-admin"
                      )
                    }
                  >
                    Create First Admin
                  </button>
                )}
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
                    minWidth: "900px",
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
                        Administrator
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
                        Employee ID
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
                        Phone
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
                        Government Office
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
                    {filteredAdmins.map((admin) => (
                      <tr key={admin.officeAdminId}>
                        <td
                          style={{
                            padding: "16px 12px",
                            borderBottom:
                              "1px solid #eef2f0",
                          }}
                        >
                          <strong>
                            {admin.user.firstName}{" "}
                            {admin.user.lastName}
                          </strong>

                          <div
                            style={{
                              marginTop: "4px",
                              color: "#788991",
                              fontSize: "12px",
                            }}
                          >
                            @{admin.user.username ||
                              "No username"}
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
                          {admin.employeeId}
                        </td>

                        <td
                          style={{
                            padding: "16px 12px",
                            borderBottom:
                              "1px solid #eef2f0",
                            color: "#53636c",
                          }}
                        >
                          {admin.user.phone}
                        </td>

                        <td
                          style={{
                            padding: "16px 12px",
                            borderBottom:
                              "1px solid #eef2f0",
                          }}
                        >
                          <strong>
                            {admin.office.officeCode}
                          </strong>

                          <div
                            style={{
                              marginTop: "4px",
                              color: "#788991",
                              fontSize: "12px",
                            }}
                          >
                            {admin.office.officeName}
                          </div>
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
                                admin.user.isActive
                                  ? "#e6f7f3"
                                  : "#f3f4f6",
                              color:
                                admin.user.isActive
                                  ? "#008f78"
                                  : "#6b7280",
                              fontSize: "12px",
                              fontWeight: 700,
                            }}
                          >
                            {admin.user.isActive
                              ? "Active"
                              : "Inactive"}
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

export default Administrators;