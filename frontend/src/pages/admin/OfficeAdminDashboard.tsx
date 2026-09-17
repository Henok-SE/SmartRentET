import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LogoutButton from "../../components/LogoutButton";
import { apiRequest } from "../../services/api";
import "../../App.css";

type DashboardSummary = {
  totalAgreements: number;
  activeAgreements: number;
  pendingAgreements: number;

  totalLandlords: number;
  totalTenants: number;

  totalOfficers: number;
  totalOffices: number;

  totalPayments: number;
  collectedPayments: number;
  overduePayments: number;

  pendingVerifications: number;

  totalSuperAdmins: number;
  activeSuperAdmins: number;

  totalOfficeAdmins: number;
  activeOfficeAdmins: number;
};

type DashboardSummaryResponse = {
  success: boolean;
  message?: string;
  data: DashboardSummary;
};

type Officer = {
  officerId: string;
  employeeId: string;
  position?: string | null;
  assignedArea?: string | null;
  subCity?: string | null;
  assignedTo?: string | null;
  createdAt: string;

  user: {
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

  office: {
    officeId: string;
    officeCode: string;
    officeName: string;
    subCity?: string | null;
    woreda?: string | null;
    city?: string | null;
    region?: string | null;
  };
};

type OfficerListResponse = {
  success: boolean;
  message?: string;
  filters?: {
    subCity?: string;
    isActive?: string;
  };
  data: Officer[];
};

type OfficeAdmin = {
  officeAdminId: string;
  employeeId: string;
  createdAt: string;

  user: {
    userId: string;
    firstName: string;
    lastName: string;
    username?: string | null;
    phone?: string | null;
    email?: string | null;
    role: string;
    isActive: boolean;
  };

  office: {
    officeId: string;
    officeCode: string;
    officeName: string;
    subCity?: string | null;
    woreda?: string | null;
    city?: string | null;
    region?: string | null;
  };
};

type OfficeAdminListResponse = {
  success: boolean;
  message?: string;
  data: OfficeAdmin[];
};

type StoredUser = {
  userId?: string | number;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function OfficeAdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  

  const [officers, setOfficers] = useState<Officer[]>(
    []
  );

  

  const [officeName, setOfficeName] =
    useState("");

  const [officeCode, setOfficeCode] =
    useState("");

  const [search, setSearch] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [currentDateTime, setCurrentDateTime] =
    useState(new Date());

  /*
   * =========================================================
   * CURRENT USER
   * =========================================================
   */

  const storedUser =
    localStorage.getItem("user");

  const user: StoredUser = useMemo(() => {
    if (!storedUser) {
      return {};
    }

    try {
      return JSON.parse(
        storedUser
      ) as StoredUser;
    } catch {
      return {};
    }
  }, [storedUser]);

  const displayName =
    user.firstName &&
    user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username ||
        "Office Admin";

  const userInitials =
    user.firstName &&
    user.lastName
      ? `${user.firstName.charAt(
          0
        )}${user.lastName.charAt(
          0
        )}`.toUpperCase()
      : displayName
          .split(" ")
          .filter(Boolean)
          .map((part) =>
            part.charAt(0)
          )
          .slice(0, 2)
          .join("")
          .toUpperCase() || "OA";

  /*
   * =========================================================
   * AUTH HEADERS
   * =========================================================
   */

  const getAuthHeaders = () => {
    const token =
      localStorage.getItem("token");

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined;
  };

  /*
   * =========================================================
   * LIVE DATE / TIME
   * =========================================================
   */

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        setCurrentDateTime(
          new Date()
        );
      }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const formattedDate =
    new Intl.DateTimeFormat(
      "en-US",
      {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    ).format(currentDateTime);

  const formattedTime =
    new Intl.DateTimeFormat(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      }
    ).format(currentDateTime);

  /*
   * =========================================================
   * LOAD OFFICE ADMIN DETAILS
   * =========================================================
   */

  const loadOfficeDetails =
    async () => {
      const response =
        await apiRequest<OfficeAdminListResponse>(
          "/dashboard/office-admins",
          {
            method: "GET",
            cache: "no-store",
            headers:
              getAuthHeaders(),
          }
        );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Failed to load Office Admin information."
        );
      }

      const currentUserId =
        String(
          user.userId ?? ""
        );

      const currentAdmin =
        response.data.find(
          (admin) =>
            String(
              admin.user.userId
            ) === currentUserId
        );

      if (!currentAdmin) {
        throw new Error(
          "Your Office Admin record could not be found."
        );
      }

      if (
        !currentAdmin.office ||
        !currentAdmin.office.officeId
      ) {
        throw new Error(
          "Your account is not assigned to a Government Office."
        );
      }

      

      setOfficeName(
        currentAdmin.office
          .officeName ||
          "Government Office"
      );

      setOfficeCode(
        currentAdmin.office
          .officeCode || ""
      );
    };

  /*
   * =========================================================
   * LOAD SUMMARY
   * =========================================================
   */

  const loadSummary =
    async () => {
      const response =
        await apiRequest<DashboardSummaryResponse>(
          "/dashboard/summary",
          {
            method: "GET",
            cache: "no-store",
            headers:
              getAuthHeaders(),
          }
        );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Failed to load dashboard summary."
        );
      }
    };

  const loadOfficers =
    async () => {
      const response =
        await apiRequest<OfficerListResponse>(
          "/dashboard/officers",
          {
            method: "GET",
            cache: "no-store",
            headers:
              getAuthHeaders(),
          }
        );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Failed to load officers."
        );
      }

      /*
       * The backend scopes OFFICER results for
       * OFFICE_ADMIN to the administrator's office.
       *
       * We therefore use the response directly.
       */
      setOfficers(
        response.data ?? []
      );
    };

  /*
   * =========================================================
   * LOAD DASHBOARD
   * =========================================================
   */

  const loadDashboard =
    async () => {
      setLoading(true);
      setError("");

      try {
        await Promise.all([
          loadOfficeDetails(),
          loadSummary(),
          loadOfficers(),
        ]);
      } catch (err) {
        console.error(
          "Office Admin dashboard error:",
          err
        );

        if (
          err instanceof Error
        ) {
          setError(
            err.message
          );
        } else {
          setError(
            "Failed to load Office Admin dashboard."
          );
        }
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    void loadDashboard();

    // Dashboard loads once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * =========================================================
   * SEARCH OFFICERS
   * =========================================================
   */

  const filteredOfficers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return officers;
      }

      return officers.filter(
        (officer) => {
          const fullName =
            `${officer.user.firstName} ${officer.user.lastName}`
              .toLowerCase();

          return [
            fullName,
            officer.user.username,
            officer.user.phone,
            officer.user.email,
            officer.employeeId,
            officer.position,
            officer.assignedArea,
            officer.subCity,
            officer.assignedTo,
            officer.office.officeCode,
            officer.office.officeName,
            officer.office.subCity,
            officer.office.woreda,
            officer.office.city,
            officer.office.region,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(query)
            );
        }
      );
    }, [officers, search]);

  /*
   * =========================================================
   * OFFICE COUNTS
   * =========================================================
   *
   * The officer list is already office-scoped by the backend
   * for Office Admin users, so these counts are specific to
   * the Office Admin's office.
   */

  const totalOfficers =
    officers.length;

  const activeOfficers =
    officers.filter(
      (officer) =>
        officer.user.isActive
    ).length;

  const inactiveOfficers =
    totalOfficers -
    activeOfficers;

 

  

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div className="office-admin-page">
      {/* ===================================================
          SIDEBAR
          =================================================== */}

      <aside className="office-admin-sidebar">
        <div className="office-admin-brand">
          <img
            src="/smartrent-logo.png"
            alt="SmartRent ET"
            className="office-admin-logo"
          />

          <div>
            <h2>
              SmartRent ET
            </h2>

            <span>
              OFFICE ADMIN PORTAL
            </span>
          </div>
        </div>

        <div className="office-admin-divider" />

        <nav
          className="office-admin-navigation"
          aria-label="Office Admin navigation"
        >
          <button
            type="button"
            className={`office-admin-nav-item ${
              location.pathname ===
              "/office-admin/dashboard"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigate(
                "/office-admin/dashboard"
              )
            }
          >
            <span className="nav-icon">
              ▦
            </span>

            Dashboard
          </button>

          <button
            type="button"
            className={`office-admin-nav-item ${
              location.pathname ===
              "/office-admin/officers"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigate(
                "/office-admin/officers"
              )
            }
          >
            <span className="nav-icon">
              👥
            </span>

            Officers Management
          </button>

          <button
            type="button"
            className={`office-admin-nav-item ${
              location.pathname ===
              "/office-admin/agreements"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigate(
                "/office-admin/agreements"
              )
            }
          >
            <span className="nav-icon">
              □
            </span>

            Agreements
          </button>

          <button
            type="button"
            className={`office-admin-nav-item ${
              location.pathname ===
              "/office-admin/audit-logs"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigate(
                "/office-admin/audit-logs"
              )
            }
          >
            <span className="nav-icon">
              ◷
            </span>

            Audit Logs
          </button>
        </nav>

        <div className="office-admin-sidebar-bottom">
          <div className="office-admin-profile">
            <div className="office-admin-avatar">
              {userInitials}
            </div>

            <div>
              <strong>
                {displayName}
              </strong>

              <span>
                Office Administrator
              </span>
            </div>
          </div>

          <LogoutButton />
        </div>
      </aside>

      {/* ===================================================
          MAIN
          =================================================== */}

      <main className="office-admin-main">
        {/* =================================================
            TOP BAR
            ================================================= */}

        <header className="office-admin-topbar">
          <div className="office-admin-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search officers..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              aria-label="Search officers"
            />
          </div>

          <div className="office-admin-user">
  <div className="office-admin-user-avatar">
    {userInitials}
  </div>

  <div className="office-admin-user-details">
    <strong>{displayName}</strong>

    <span>{formattedDate}</span>

    <small
      style={{
        display: "block",
        marginTop: "2px",
        color: "#6b7280",
      }}
    >
      {formattedTime}
    </small>
  </div>
</div>
        </header>

        {/* =================================================
            CONTENT
            ================================================= */}

        <section className="office-admin-content">
          <div className="officers-management-page">
            {/* =================================================
                PAGE HEADER
                ================================================= */}

            <div
              className="officers-management-header"
              style={{
                marginBottom:
                  "24px",
              }}
            >
              <div>
                <span className="officers-management-eyebrow">
                  OFFICE ADMINISTRATION
                </span>

                <h1>
                  Dashboard
                </h1>

                <p>
                  Manage officers,
                  agreements, and
                  activity for your
                  Government Office.
                </p>

                {officeName && (
                  <div
                    style={{
                      marginTop:
                        "12px",
                      display:
                        "inline-flex",
                      alignItems:
                        "center",
                      gap:
                        "10px",
                      padding:
                        "8px 12px",
                      border:
                        "1px solid #dceae6",
                      borderRadius:
                        "8px",
                      background:
                        "#f7fcfa",
                    }}
                  >
                    <span
                      style={{
                        color:
                          "#06b485",
                        fontSize:
                          "11px",
                        fontWeight:
                          700,
                        letterSpacing:
                          "0.08em",
                      }}
                    >
                      OFFICE
                    </span>

                    <strong
                      style={{
                        color:
                          "#25343a",
                        fontSize:
                          "13px",
                      }}
                    >
                      {officeCode
                        ? `${officeCode} — `
                        : ""}
                      {officeName}
                    </strong>
                  </div>
                )}
              </div>

              <div
                style={{
                  display:
                    "flex",
                  gap:
                    "10px",
                  flexWrap:
                    "wrap",
                }}
              >
                <button
                  type="button"
                  className="office-admin-outline-button"
                  onClick={() =>
                    navigate(
                      "/office-admin/officers"
                    )
                  }
                >
                  Manage Officers
                </button>

               
              </div>
            </div>

            {/* =================================================
                ERROR
                ================================================= */}

            {error && (
              <div
                className="auth-error"
                role="alert"
                style={{
                  marginBottom:
                    "20px",
                }}
              >
                {error}
              </div>
            )}

            {/* =================================================
                OFFICE OFFICER STATS
                ================================================= */}

            <section className="office-admin-stats">
              <article className="office-admin-stat-card">
                <div className="office-admin-stat-icon">
                  👥
                </div>

                <div>
                  <span>
                    Total Officers
                  </span>

                  <strong>
                    {loading
                      ? "—"
                      : totalOfficers}
                  </strong>

                  <small>
                    Officers in your
                    office
                  </small>
                </div>
              </article>

              <article className="office-admin-stat-card">
                <div className="office-admin-stat-icon">
                  ✓
                </div>

                <div>
                  <span>
                    Active Officers
                  </span>

                  <strong>
                    {loading
                      ? "—"
                      : activeOfficers}
                  </strong>

                  <small>
                    Currently active
                  </small>
                </div>
              </article>

              <article className="office-admin-stat-card">
                <div className="office-admin-stat-icon inactive-icon">
                  !
                </div>

                <div>
                  <span>
                    Inactive Officers
                  </span>

                  <strong>
                    {loading
                      ? "—"
                      : inactiveOfficers}
                  </strong>

                  <small>
                    Currently inactive
                  </small>
                </div>
              </article>
            </section>


            {/* =================================================
                QUICK ACTIONS
                ================================================= */}

            <section
              className="office-admin-table-card"
              style={{
                marginBottom:
                  "24px",
              }}
            >
              <div className="office-admin-table-header">
                <div>
                  <span className="office-admin-eyebrow">
                    QUICK ACCESS
                  </span>

                  <h2>
                    Office Operations
                  </h2>

                  <p>
                    Access the main
                    administrative areas
                    for your office.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(0, 1fr))",
                  gap:
                    "14px",
                  padding:
                    "20px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/office-admin/officers"
                    )
                  }
                  style={{
                    border:
                      "1px solid #dceae6",
                    background:
                      "#f8fcfb",
                    borderRadius:
                      "10px",
                    padding:
                      "18px",
                    textAlign:
                      "left",
                    cursor:
                      "pointer",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        "22px",
                      marginBottom:
                        "8px",
                    }}
                  >
                    👥
                  </div>

                  <strong
                    style={{
                      display:
                        "block",
                      color:
                        "#25343a",
                      fontSize:
                        "14px",
                    }}
                  >
                    Officers
                  </strong>

                  <span
                    style={{
                      display:
                        "block",
                      marginTop:
                        "5px",
                      color:
                        "#778790",
                      fontSize:
                        "12px",
                    }}
                  >
                    Create, manage,
                    activate, and
                    deactivate officers.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/office-admin/agreements"
                    )
                  }
                  style={{
                    border:
                      "1px solid #dceae6",
                    background:
                      "#f8fcfb",
                    borderRadius:
                      "10px",
                    padding:
                      "18px",
                    textAlign:
                      "left",
                    cursor:
                      "pointer",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        "22px",
                      marginBottom:
                        "8px",
                    }}
                  >
                    □
                  </div>

                  <strong
                    style={{
                      display:
                        "block",
                      color:
                        "#25343a",
                      fontSize:
                        "14px",
                    }}
                  >
                    Agreements
                  </strong>

                  <span
                    style={{
                      display:
                        "block",
                      marginTop:
                        "5px",
                      color:
                        "#778790",
                      fontSize:
                        "12px",
                    }}
                  >
                    Review rental
                    agreements handled
                    by your office.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/office-admin/audit-logs"
                    )
                  }
                  style={{
                    border:
                      "1px solid #dceae6",
                    background:
                      "#f8fcfb",
                    borderRadius:
                      "10px",
                    padding:
                      "18px",
                    textAlign:
                      "left",
                    cursor:
                      "pointer",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        "22px",
                      marginBottom:
                        "8px",
                    }}
                  >
                    ◷
                  </div>

                  <strong
                    style={{
                      display:
                        "block",
                      color:
                        "#25343a",
                      fontSize:
                        "14px",
                    }}
                  >
                    Audit Logs
                  </strong>

                  <span
                    style={{
                      display:
                        "block",
                      marginTop:
                        "5px",
                      color:
                        "#778790",
                      fontSize:
                        "12px",
                    }}
                  >
                    Review recorded
                    administrative activity.
                  </span>
                </button>
              </div>
            </section>

            {/* =================================================
                OFFICERS
                ================================================= */}

            <section className="office-admin-table-card">
              <div className="office-admin-table-header">
                <div>
                  <span className="office-admin-eyebrow">
                    OFFICER OVERVIEW
                  </span>

                  <h2>
                    Officers
                  </h2>

                  <p>
                    Officers assigned to{" "}
                    {officeName ||
                      "your Government Office"}.
                  </p>
                </div>

                <button
                  type="button"
                  className="office-admin-outline-button"
                  onClick={() =>
                    navigate(
                      "/office-admin/officers"
                    )
                  }
                >
                  View All
                </button>
              </div>

              {loading ? (
                <div
                  style={{
                    padding:
                      "60px 20px",
                    textAlign:
                      "center",
                    color:
                      "#6b7280",
                  }}
                >
                  <h3>
                    Loading officers...
                  </h3>

                  <p>
                    Retrieving officer
                    information.
                  </p>
                </div>
              ) : filteredOfficers.length >
                0 ? (
                <div className="office-admin-table-wrapper">
                  <table className="office-admin-table">
                    <thead>
                      <tr>
                        <th>
                          Officer Name
                        </th>

                        <th>
                          Employee ID
                        </th>

                        <th>
                          Position
                        </th>

                        <th>
                          Assigned Area
                        </th>

                        <th>
                          Date Created
                        </th>

                        <th>
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredOfficers
                        .slice(0, 8)
                        .map(
                          (
                            officer
                          ) => (
                            <tr
                              key={
                                officer.officerId
                              }
                            >
                              <td>
                                <div className="officer-name">
                                  <div className="officer-table-avatar">
                                    {officer.user.firstName.charAt(
                                      0
                                    )}
                                    {officer.user.lastName.charAt(
                                      0
                                    )}
                                  </div>

                                  <div>
                                    <strong>
                                      {
                                        officer
                                          .user
                                          .firstName
                                      }{" "}
                                      {
                                        officer
                                          .user
                                          .lastName
                                      }
                                    </strong>

                                    <div
                                      style={{
                                        marginTop:
                                          "3px",
                                        color:
                                          "#788991",
                                        fontSize:
                                          "12px",
                                      }}
                                    >
                                      @
                                      {officer
                                        .user
                                        .username ||
                                        "No username"}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td>
                                {
                                  officer.employeeId
                                }
                              </td>

                              <td>
                                {
                                  officer.position ||
                                  "—"
                                }
                              </td>

                              <td>
                                {officer
                                  .assignedArea ||
                                  officer
                                    .subCity ||
                                  officer
                                    .office
                                    .subCity ||
                                  "—"}
                              </td>

                              <td>
                                {formatDate(
                                  officer.createdAt
                                )}
                              </td>

                              <td>
                                <span
                                  className={`officer-status ${
                                    officer.user
                                      .isActive
                                      ? "status-active"
                                      : "status-inactive"
                                  }`}
                                >
                                  {officer.user
                                    .isActive
                                    ? "Active"
                                    : "Inactive"}
                                </span>
                              </td>
                            </tr>
                          )
                        )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  style={{
                    padding:
                      "55px 20px",
                    textAlign:
                      "center",
                    color:
                      "#6b7280",
                  }}
                >
                  <h3>
                    {search
                      ? "No officers found"
                      : "No officers yet"}
                  </h3>

                  <p
                    style={{
                      maxWidth:
                        "500px",
                      margin:
                        "8px auto 20px",
                    }}
                  >
                    {search
                      ? `No officers match "${search}" in your office.`
                      : "Create an officer account to begin managing officers in your office."}
                  </p>

                  {!search && (
                    <button
                      type="button"
                      className="create-officer-button"
                      onClick={() =>
                       navigate("/office-admin/officers/create")
                      }
                    >
                      + Create Officer
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

export default OfficeAdminDashboard;