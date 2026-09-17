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
    isNationalIdVerified?: boolean;
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

type AccountStatusResponse = {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    userId: string;
    firstName: string;
    lastName: string;
    username?: string | null;
    phone: string;
    email?: string | null;
    role: string;
    isActive: boolean;
    isNationalIdVerified?: boolean;
  };
};

type StoredUser = {
  userId?: string;
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
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusLoadingId, setStatusLoadingId] =
    useState<string | null>(null);

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

  const handleAccountStatus = async (
    admin: OfficeAdmin
  ) => {
    const nextStatus = !admin.user.isActive;

    const action = nextStatus
      ? "activate"
      : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${admin.user.firstName} ${admin.user.lastName}'s account?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setStatusLoadingId(admin.officeAdminId);

    try {
      const token = localStorage.getItem("token");

      const response =
        await apiRequest<AccountStatusResponse>(
          `/auth/users/${admin.user.userId}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...(token
                ? {
                    Authorization: `Bearer ${token}`,
                  }
                : {}),
            },
            body: JSON.stringify({
              isActive: nextStatus,
            }),
          }
        );

      setAdmins((previous) =>
        previous.map((item) =>
          item.officeAdminId === admin.officeAdminId
            ? {
                ...item,
                user: {
                  ...item.user,
                  isActive:
                    response.data?.isActive ??
                    nextStatus,
                },
              }
            : item
        )
      );

      setSuccess(
        response.message ||
          `Administrator account ${
            nextStatus ? "activated" : "deactivated"
          } successfully.`
      );
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          `Failed to ${action} administrator account.`
        );
      }
    } finally {
      setStatusLoadingId(null);
    }
  };

  const filteredAdmins = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return admins;
    }

    return admins.filter((admin) =>
      [
        admin.user.firstName,
        admin.user.lastName,
        admin.user.username,
        admin.user.email,
        admin.user.phone,
        admin.employeeId,
        admin.office.officeCode,
        admin.office.officeName,
        admin.office.region,
        admin.office.city,
        admin.office.subCity,
        admin.office.woreda,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        )
    );
  }, [admins, search]);

  const activeCount = admins.filter(
    (admin) => admin.user.isActive
  ).length;

  const inactiveCount =
    admins.length - activeCount;

  return (
    <div className="super-admin-page">
      {/* ================= SIDEBAR ================= */}

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
  className="super-admin-nav-item"
  onClick={() =>
    navigate("/super-admin/agreements")
  }
>
  <span className="super-admin-nav-icon">
    □
  </span>
  <span>Agreements</span>
</button>
        </nav>

        <div className="super-admin-sidebar-bottom">
          <div className="super-admin-profile">
            <div className="super-admin-avatar">
              {displayName
                .charAt(0)
                .toUpperCase()}
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

      {/* ================= MAIN ================= */}

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

            <span className="super-admin-role-badge">
              SUPER ADMIN
            </span>

            <span className="super-admin-topbar-name">
              {displayName}
            </span>
          </div>
        </header>

        <main className="super-admin-content">
          {/* ================= HEADER ================= */}

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
                navigate(
                  "/super-admin/create-admin"
                )
              }
            >
              <span>+</span>
              Create Admin
            </button>
          </section>

          {/* ================= STATS ================= */}

          <section className="super-admin-stat-grid">
            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ♟
              </div>

              <div className="super-admin-stat-content">
                <span>Total Administrators</span>

                <strong>{admins.length}</strong>

                <small>
                  Registered accounts
                </small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ✓
              </div>

              <div className="super-admin-stat-content">
                <span>Active Administrators</span>

                <strong>{activeCount}</strong>

                <small>
                  Currently active
                </small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ○
              </div>

              <div className="super-admin-stat-content">
                <span>Inactive Administrators</span>

                <strong>{inactiveCount}</strong>

                <small>
                  Currently inactive
                </small>
              </div>
            </article>
          </section>

          {/* ================= MESSAGES ================= */}

          {success && (
            <div
              className="super-admin-form-success"
              role="status"
            >
              {success}
            </div>
          )}

          {error && (
            <div
              className="super-admin-form-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* ================= TABLE ================= */}

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
                {loading
                  ? "Refreshing..."
                  : "Refresh"}
              </button>
            </div>

            {loading ? (
              <div className="super-admin-empty-state">
                <div className="super-admin-empty-icon">
                  ⏳
                </div>

                <h3>
                  Loading administrators...
                </h3>

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
                  padding:
                    "20px 28px 28px",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse",
                    minWidth:
                      "1120px",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Administrator
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Employee ID
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Phone
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Government Office
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Status
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAdmins.map(
                      (admin) => {
                        const changingStatus =
                          statusLoadingId ===
                          admin.officeAdminId;

                        return (
                          <tr
                            key={
                              admin.officeAdminId
                            }
                          >
                            <td
                              style={{
                                padding:
                                  "16px 12px",
                                borderBottom:
                                  "1px solid #eef2f0",
                              }}
                            >
                              <strong>
                                {
                                  admin.user
                                    .firstName
                                }{" "}
                                {
                                  admin.user
                                    .lastName
                                }
                              </strong>

                              <div
                                style={{
                                  marginTop:
                                    "4px",
                                  color:
                                    "#788991",
                                  fontSize:
                                    "12px",
                                }}
                              >
                                @
                                {admin.user
                                  .username ||
                                  "No username"}
                              </div>

                              {admin.user.email && (
                                <div
                                  style={{
                                    marginTop:
                                      "4px",
                                    color:
                                      "#9aa6ab",
                                    fontSize:
                                      "11px",
                                  }}
                                >
                                  {
                                    admin.user
                                      .email
                                  }
                                </div>
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  "16px 12px",
                                borderBottom:
                                  "1px solid #eef2f0",
                                color:
                                  "#53636c",
                              }}
                            >
                              {
                                admin.employeeId
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  "16px 12px",
                                borderBottom:
                                  "1px solid #eef2f0",
                                color:
                                  "#53636c",
                              }}
                            >
                              {
                                admin.user.phone
                              }
                            </td>

                            <td
                              style={{
                                padding:
                                  "16px 12px",
                                borderBottom:
                                  "1px solid #eef2f0",
                              }}
                            >
                              <strong>
                                {
                                  admin.office
                                    .officeCode
                                }
                              </strong>

                              <div
                                style={{
                                  marginTop:
                                    "4px",
                                  color:
                                    "#788991",
                                  fontSize:
                                    "12px",
                                }}
                              >
                                {
                                  admin.office
                                    .officeName
                                }
                              </div>

                              <div
                                style={{
                                  marginTop:
                                    "4px",
                                  color:
                                    "#9aa6ab",
                                  fontSize:
                                    "11px",
                                }}
                              >
                                {[
                                  admin.office
                                    .city,
                                  admin.office
                                    .subCity,
                                  admin.office
                                    .woreda,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") ||
                                  "Location not provided"}
                              </div>
                            </td>

                            <td
                              style={{
                                padding:
                                  "16px 12px",
                                borderBottom:
                                  "1px solid #eef2f0",
                              }}
                            >
                              <span
                                style={{
                                  display:
                                    "inline-block",
                                  padding:
                                    "6px 10px",
                                  borderRadius:
                                    "999px",
                                  background:
                                    admin.user
                                      .isActive
                                      ? "#e6f7f3"
                                      : "#f3f4f6",
                                  color:
                                    admin.user
                                      .isActive
                                      ? "#008f78"
                                      : "#6b7280",
                                  fontSize:
                                    "12px",
                                  fontWeight:
                                    700,
                                }}
                              >
                                {admin.user
                                  .isActive
                                  ? "Active"
                                  : "Inactive"}
                              </span>
                            </td>

                            <td
                              style={{
                                padding:
                                  "16px 12px",
                                borderBottom:
                                  "1px solid #eef2f0",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  void handleAccountStatus(
                                    admin
                                  )
                                }
                                disabled={
                                  changingStatus
                                }
                                style={{
                                  minWidth:
                                    "100px",
                                  height:
                                    "36px",
                                  padding:
                                    "0 12px",
                                  border:
                                    "1px solid #d4ddda",
                                  borderRadius:
                                    "6px",
                                  background:
                                    admin.user
                                      .isActive
                                      ? "#fff5f5"
                                      : "#ecfdf5",
                                  color:
                                    admin.user
                                      .isActive
                                      ? "#b42318"
                                      : "#047857",
                                  fontSize:
                                    "12px",
                                  fontWeight:
                                    700,
                                  cursor:
                                    changingStatus
                                      ? "not-allowed"
                                      : "pointer",
                                  opacity:
                                    changingStatus
                                      ? 0.65
                                      : 1,
                                }}
                              >
                                {changingStatus
                                  ? "Updating..."
                                  : admin.user
                                      .isActive
                                  ? "Deactivate"
                                  : "Activate"}
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    )}
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