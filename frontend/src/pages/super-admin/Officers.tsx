import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "../../components/LogoutButton";
import { apiRequest } from "../../services/api";
import "../../styles/super-admin-dashboard.css";

type Officer = {
  officerId: string;
  employeeId: string;
  position?: string | null;
  assignedArea?: string | null;
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
    subCity?: string | null;
    woreda?: string | null;
  };
};

type OfficerListResponse = {
  success: boolean;
  message?: string;
  data: Officer[];
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

function Officers() {
  const navigate = useNavigate();

  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [statusLoadingId, setStatusLoadingId] =
    useState<string | null>(null);

  const [success, setSuccess] = useState("");

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

  const loadOfficers = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      const response =
        await apiRequest<OfficerListResponse>(
          "/dashboard/officers",
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

      setOfficers(response.data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load officers.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOfficers();
  }, []);

  const handleAccountStatus = async (
    officer: Officer
  ) => {
    const nextStatus = !officer.user.isActive;

    const action = nextStatus
      ? "activate"
      : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${officer.user.firstName} ${officer.user.lastName}'s account?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setStatusLoadingId(officer.officerId);

    try {
      const token = localStorage.getItem("token");

      const response =
        await apiRequest<AccountStatusResponse>(
          `/auth/users/${officer.user.userId}/status`,
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

      setOfficers((previous) =>
        previous.map((item) =>
          item.officerId === officer.officerId
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
          `Officer account ${
            nextStatus ? "activated" : "deactivated"
          } successfully.`
      );
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          `Failed to ${action} officer account.`
        );
      }
    } finally {
      setStatusLoadingId(null);
    }
  };

  const activeCount = officers.filter(
    (officer) => officer.user.isActive
  ).length;

  const inactiveCount =
    officers.length - activeCount;

  const filteredOfficers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return officers;
    }

    return officers.filter((officer) => {
      return [
        officer.user.firstName,
        officer.user.lastName,
        officer.user.username,
        officer.user.email,
        officer.user.phone,
        officer.employeeId,
        officer.position,
        officer.assignedArea,
        officer.office.officeCode,
        officer.office.officeName,
        officer.office.subCity,
        officer.office.woreda,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        );
    });
  }, [officers, search]);

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
            className="super-admin-nav-item"
            onClick={() =>
              navigate(
                "/super-admin/administrators"
              )
            }
          >
            <span className="super-admin-nav-icon">
              ♟
            </span>
            <span>Administrators</span>
          </button>

          <button
            type="button"
            className="super-admin-nav-item active"
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
        {/* ================= TOP BAR ================= */}

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
              placeholder="Search officers..."
              aria-label="Search officers"
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

        {/* ================= CONTENT ================= */}

        <main className="super-admin-content">
          <section className="super-admin-page-heading">
            <div>
              <span className="super-admin-eyebrow">
                OFFICER MANAGEMENT
              </span>

              <h1>Officers</h1>

              <p>
                Manage SmartRent officers and their
                assigned Government Offices.
              </p>
            </div>

            <button
              type="button"
              className="super-admin-outline-button"
              onClick={() => void loadOfficers()}
              disabled={loading}
            >
              {loading
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </section>

          {/* ================= STATS ================= */}

          <section className="super-admin-stat-grid">
            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ♟
              </div>

              <div className="super-admin-stat-content">
                <span>Total Officers</span>

                <strong>
                  {officers.length}
                </strong>

                <small>
                  Registered officers
                </small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ✓
              </div>

              <div className="super-admin-stat-content">
                <span>Active Officers</span>

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
                <span>Inactive Officers</span>

                <strong>
                  {inactiveCount}
                </strong>

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

          {/* ================= OFFICER TABLE ================= */}

          <section className="super-admin-management-card">
            <div className="super-admin-management-header">
              <div>
                <span className="super-admin-section-eyebrow">
                  OFFICER ACCOUNTS
                </span>

                <h2>All Officers</h2>

                <p>
                  Officers registered in SmartRent ET.
                </p>
              </div>

              <button
                type="button"
                className="super-admin-outline-button"
                onClick={() => void loadOfficers()}
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

                <h3>Loading officers...</h3>

                <p>
                  Retrieving officer accounts.
                </p>
              </div>
            ) : filteredOfficers.length ===
              0 ? (
              <div className="super-admin-empty-state">
                <div className="super-admin-empty-icon">
                  ♟
                </div>

                <h3>
                  {search
                    ? "No officers found"
                    : "No officers yet"}
                </h3>

                <p>
                  {search
                    ? `No officers match "${search}".`
                    : "Officer accounts will appear here once they are created."}
                </p>
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
                      "1180px",
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
                        Officer
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
                        Position
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
                        Office
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
                        Assigned Area
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
                    {filteredOfficers.map(
                      (officer) => {
                        const changingStatus =
                          statusLoadingId ===
                          officer.officerId;

                        return (
                          <tr
                            key={
                              officer.officerId
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
                                  officer.user
                                    .firstName
                                }{" "}
                                {
                                  officer.user
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
                                {officer.user
                                  .username ||
                                  "No username"}
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
                                {
                                  officer.user
                                    .phone
                                }
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
                              {
                                officer.employeeId
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
                                officer.position ||
                                "—"
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
                                  officer.office
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
                                  officer.office
                                    .officeName
                                }
                              </div>
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
                                officer.assignedArea ||
                                "—"
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
                              <span
                                style={{
                                  display:
                                    "inline-block",
                                  padding:
                                    "6px 10px",
                                  borderRadius:
                                    "999px",
                                  background:
                                    officer
                                      .user
                                      .isActive
                                      ? "#e6f7f3"
                                      : "#f3f4f6",
                                  color:
                                    officer
                                      .user
                                      .isActive
                                      ? "#008f78"
                                      : "#6b7280",
                                  fontSize:
                                    "12px",
                                  fontWeight:
                                    700,
                                }}
                              >
                                {officer
                                  .user
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
                                    officer
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
                                    officer
                                      .user
                                      .isActive
                                      ? "#fff5f5"
                                      : "#ecfdf5",
                                  color:
                                    officer
                                      .user
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
                                  : officer
                                      .user
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

export default Officers;