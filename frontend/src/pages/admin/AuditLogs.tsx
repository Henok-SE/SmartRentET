import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LogoutButton from "../../components/LogoutButton";
import { apiRequest } from "../../services/api";

type AuditLog = {
  auditId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  ipAddress?: string | null;
  createdAt: string;

  user?: {
    userId: string;
    firstName: string;
    lastName: string;
    username?: string | null;
  } | null;
};

type AuditLogResponse = {
  success: boolean;
  message?: string;
  filters?: {
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  };
  data: AuditLog[];
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
  userId?: string | number;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getActionClass(action: string) {
  switch (action) {
    case "CREATE":
    case "ACTIVATE":
    case "APPROVE":
    case "PAYMENT_RECORDED":
    case "VERIFICATION_COMPLETED":
    case "SERVICE_FEE_PAID":
      return "audit-action-success";

    case "UPDATE":
    case "LOGIN":
    case "LOGOUT":
    case "VERIFICATION_SENT":
    case "SERVICE_FEE_INITIATED":
      return "audit-action-info";

    case "REJECT":
    case "DEACTIVATE":
    case "DELETE":
      return "audit-action-danger";

    default:
      return "audit-action-default";
  }
}

function AuditLogs() {
  const navigate = useNavigate();
  const location = useLocation();

  const [logs, setLogs] = useState<AuditLog[]>([]);

  const [officeName, setOfficeName] = useState("");
  const [officeCode, setOfficeCode] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [actionFilter, setActionFilter] =
    useState("");

  const [currentDateTime, setCurrentDateTime] =
    useState(new Date());

  /*
   * =========================================================
   * CURRENT USER
   * =========================================================
   */

  const storedUser = localStorage.getItem("user");

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
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username || "Office Admin";

  const userInitials =
    user.firstName && user.lastName
      ? `${user.firstName.charAt(
          0
        )}${user.lastName.charAt(0)}`.toUpperCase()
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
   * AUTH
   * =========================================================
   */

  const getAuthHeaders = () => {
    const token =
      localStorage.getItem("token");

    return token
      ? {
          Authorization:
            `Bearer ${token}`,
        }
      : undefined;
  };

  /*
   * =========================================================
   * DATE / TIME
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
   * LOAD OFFICE DETAILS
   * =========================================================
   *
   * We only use this to display the Office Admin's office
   * context. Audit-log authorization/scoping remains on the
   * backend.
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
   * LOAD AUDIT LOGS
   * =========================================================
   */

  const loadAuditLogs =
    async () => {
      const response =
        await apiRequest<AuditLogResponse>(
          "/dashboard/audit-logs",
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
            "Failed to load audit logs."
        );
      }

      setLogs(
        response.data ?? []
      );
    };

  /*
   * =========================================================
   * LOAD PAGE
   * =========================================================
   */

  const loadPage =
    async () => {
      setLoading(true);
      setError("");

      try {
        await Promise.all([
          loadOfficeDetails(),
          loadAuditLogs(),
        ]);
      } catch (err) {
        console.error(
          "Audit Logs error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load audit logs."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (
      user.userId !==
      undefined
    ) {
      void loadPage();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.userId]);

  /*
   * =========================================================
   * FILTER
   * =========================================================
   */

  const filteredLogs =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return logs.filter((log) => {
        const matchesAction =
          !actionFilter ||
          log.action ===
            actionFilter;

        if (!matchesAction) {
          return false;
        }

        if (!query) {
          return true;
        }

        const actor = log.user
          ? `${log.user.firstName} ${log.user.lastName} ${
              log.user.username || ""
            }`
          : "system";

        return [
          log.action,
          log.entityType,
          log.entityId,
          log.description,
          log.ipAddress,
          actor,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(query)
          );
      });
    }, [
      logs,
      search,
      actionFilter,
    ]);

  /*
   * =========================================================
   * COUNTS
   * =========================================================
   */

  const totalLogs =
    logs.length;

  const createCount =
    logs.filter(
      (log) =>
        log.action === "CREATE"
    ).length;

  const statusChangeCount =
    logs.filter(
      (log) =>
        log.action ===
          "ACTIVATE" ||
        log.action ===
          "DEACTIVATE"
    ).length;

  /*
   * =========================================================
   * CLEAR FILTERS
   * =========================================================
   */

  const clearFilters = () => {
    setSearch("");
    setActionFilter("");
  };

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

        {/* TOP BAR */}

        <header className="office-admin-topbar">

          <div className="office-admin-search">

            <span>
              ⌕
            </span>

            <input
              type="text"
              placeholder="Search audit logs..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              aria-label="Search audit logs"
            />

          </div>

          <div className="office-admin-user">
  <div className="office-admin-user-avatar">
    {userInitials}
  </div>

  <div className="office-admin-user-details">
    <strong>
      {displayName}
    </strong>

    <span>
      {formattedDate}
    </span>

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

        {/* CONTENT */}

        <section className="office-admin-content">

          <div className="officers-management-page">

            {/* PAGE HEADER */}

            <div className="officers-management-header">

              <div>

                <span className="officers-management-eyebrow">
                  SYSTEM ACTIVITY
                </span>

                <h1>
                  Audit Logs
                </h1>

                <p>
                  Review recorded system actions
                  and administrative activity for
                  your Government Office.
                </p>

                {officeName && (
                  <div className="office-admin-office-context">

                    <span>
                      GOVERNMENT OFFICE
                    </span>

                    <strong>
                      {officeName}
                    </strong>

                    {officeCode && (
                      <span>
                        {officeCode}
                      </span>
                    )}

                  </div>
                )}

              </div>

              <button
                type="button"
                className="create-officer-button"
                onClick={() =>
                  void loadPage()
                }
                disabled={loading}
              >
                {loading
                  ? "Refreshing..."
                  : "Refresh"}
              </button>

            </div>

            {/* FILTERS */}

            <section
              className="office-admin-table-card"
              style={{
                marginBottom:
                  "20px",
              }}
            >

              <div className="office-admin-table-header">

                <div>

                  <span className="office-admin-eyebrow">
                    ACTIVITY FILTERS
                  </span>

                  <h2>
                    Search & Filter
                  </h2>

                  <p>
                    Search recorded activity or
                    filter by action.
                  </p>

                </div>

              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "2fr 1fr auto",
                  gap:
                    "14px",
                  alignItems:
                    "end",
                  padding:
                    "20px",
                }}
              >

                <div className="form-group">
                  <label htmlFor="audit-search">
                    Search
                  </label>

                  <input
                    id="audit-search"
                    type="text"
                    value={
                      search
                    }
                    onChange={(
                      event
                    ) =>
                      setSearch(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Search action, user, entity, description..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="audit-action">
                    Action
                  </label>

                  <select
                    id="audit-action"
                    value={
                      actionFilter
                    }
                    onChange={(
                      event
                    ) =>
                      setActionFilter(
                        event
                          .target
                          .value
                      )
                    }
                  >
                    <option value="">
                      All actions
                    </option>

                    <option value="CREATE">
                      CREATE
                    </option>

                    <option value="UPDATE">
                      UPDATE
                    </option>

                    <option value="DELETE">
                      DELETE
                    </option>

                    <option value="LOGIN">
                      LOGIN
                    </option>

                    <option value="LOGOUT">
                      LOGOUT
                    </option>

                    <option value="APPROVE">
                      APPROVE
                    </option>

                    <option value="REJECT">
                      REJECT
                    </option>

                    <option value="ACTIVATE">
                      ACTIVATE
                    </option>

                    <option value="DEACTIVATE">
                      DEACTIVATE
                    </option>

                    <option value="PAYMENT_RECORDED">
                      PAYMENT_RECORDED
                    </option>

                    <option value="VERIFICATION_SENT">
                      VERIFICATION_SENT
                    </option>

                    <option value="VERIFICATION_COMPLETED">
                      VERIFICATION_COMPLETED
                    </option>

                    <option value="SERVICE_FEE_INITIATED">
                      SERVICE_FEE_INITIATED
                    </option>

                    <option value="SERVICE_FEE_PAID">
                      SERVICE_FEE_PAID
                    </option>
                  </select>
                </div>

                <button
                  type="button"
                  className="office-admin-outline-button"
                  onClick={
                    clearFilters
                  }
                >
                  Clear
                </button>

              </div>

            </section>

            {/* STATISTICS */}

            <section className="office-admin-stats">

              <article className="office-admin-stat-card">

                <div className="office-admin-stat-icon">
                  ◷
                </div>

                <div>
                  <span>
                    Total Activity
                  </span>

                  <strong>
                    {loading
                      ? "—"
                      : totalLogs}
                  </strong>

                  <small>
                    Recorded audit events
                  </small>
                </div>

              </article>

              <article className="office-admin-stat-card">

                <div className="office-admin-stat-icon">
                  +
                </div>

                <div>
                  <span>
                    Create Actions
                  </span>

                  <strong>
                    {loading
                      ? "—"
                      : createCount}
                  </strong>

                  <small>
                    CREATE events
                  </small>
                </div>

              </article>

              <article className="office-admin-stat-card">

                <div className="office-admin-stat-icon">
                  ✓
                </div>

                <div>
                  <span>
                    Status Changes
                  </span>

                  <strong>
                    {loading
                      ? "—"
                      : statusChangeCount}
                  </strong>

                  <small>
                    Activate / Deactivate
                  </small>
                </div>

              </article>

            </section>

            {/* LOG TABLE */}

            <div className="officers-management-card">

              <div
                style={{
                  padding:
                    "20px",
                  borderBottom:
                    "1px solid #e8edeb",
                }}
              >

                <span className="office-admin-eyebrow">
                  AUDIT HISTORY
                </span>

                <h2
                  style={{
                    margin:
                      "4px 0 0",
                    color:
                      "#25343a",
                    fontSize:
                      "20px",
                  }}
                >
                  Office Activity
                </h2>

                <p
                  style={{
                    margin:
                      "6px 0 0",
                    color:
                      "#788991",
                    fontSize:
                      "13px",
                  }}
                >
                  {filteredLogs.length}{" "}
                  {filteredLogs.length ===
                  1
                    ? "record"
                    : "records"}{" "}
                  shown.
                </p>

              </div>

              {error && (
                <div
                  className="auth-error"
                  role="alert"
                  style={{
                    margin:
                      "20px",
                  }}
                >
                  {error}
                </div>
              )}

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
                    Loading audit logs...
                  </h3>

                  <p>
                    Retrieving recorded system
                    activity.
                  </p>

                </div>

              ) : filteredLogs.length ===
                0 ? (

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

                  <div
                    style={{
                      width:
                        "64px",
                      height:
                        "64px",
                      margin:
                        "0 auto 16px",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      borderRadius:
                        "50%",
                      background:
                        "#eaf8f5",
                      color:
                        "#08a68b",
                      fontSize:
                        "24px",
                    }}
                  >
                    ◷
                  </div>

                  <h3>
                    {search ||
                    actionFilter
                      ? "No audit logs found"
                      : "No audit logs yet"}
                  </h3>

                  <p>
                    {search ||
                    actionFilter
                      ? "No audit records match the selected filters."
                      : "Recorded office activity will appear here when audit events are created."}
                  </p>

                  {(search ||
                    actionFilter) && (
                    <button
                      type="button"
                      className="office-admin-outline-button"
                      onClick={
                        clearFilters
                      }
                    >
                      Clear Filters
                    </button>
                  )}

                </div>

              ) : (

                <div
                  className="officers-table-wrapper"
                  style={{
                    overflowX:
                      "auto",
                  }}
                >

                  <table className="officers-table">

                    <thead>

                      <tr>

                        <th>
                          Date & Time
                        </th>

                        <th>
                          Action
                        </th>

                        <th>
                          Performed By
                        </th>

                        <th>
                          Entity
                        </th>

                        <th>
                          Description
                        </th>

                        <th>
                          IP Address
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {filteredLogs.map(
                        (log) => (
                          <tr
                            key={
                              log.auditId
                            }
                          >

                            {/* DATE */}

                            <td
                              style={{
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {formatDateTime(
                                log.createdAt
                              )}
                            </td>

                            {/* ACTION */}

                            <td>

                              <span
                                className={`audit-action-badge ${getActionClass(
                                  log.action
                                )}`}
                              >
                                {
                                  log.action
                                }
                              </span>

                            </td>

                            {/* ACTOR */}

                            <td>

                              {log.user ? (

                                <>

                                  <strong>
                                    {
                                      log
                                        .user
                                        .firstName
                                    }{" "}
                                    {
                                      log
                                        .user
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
                                    {log
                                      .user
                                      .username ||
                                      "No username"}
                                  </div>

                                </>

                              ) : (

                                <strong>
                                  System
                                </strong>

                              )}

                            </td>

                            {/* ENTITY */}

                            <td>

                              <strong>
                                {
                                  log.entityType
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
                                  maxWidth:
                                    "220px",
                                  overflow:
                                    "hidden",
                                  textOverflow:
                                    "ellipsis",
                                  whiteSpace:
                                    "nowrap",
                                }}
                              >
                                {
                                  log.entityId ||
                                  "—"
                                }
                              </div>

                            </td>

                            {/* DESCRIPTION */}

                            <td
                              style={{
                                minWidth:
                                  "280px",
                                maxWidth:
                                  "420px",
                                whiteSpace:
                                  "normal",
                              }}
                            >
                              {
                                log.description ||
                                "—"
                              }
                            </td>

                            {/* IP */}

                            <td
                              style={{
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {
                                log.ipAddress ||
                                "—"
                              }
                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

export default AuditLogs;