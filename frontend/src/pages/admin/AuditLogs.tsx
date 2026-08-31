import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LogoutButton from "../../components/LogoutButton";
import { apiRequest } from "../../services/api";

type AuditLog = {
  auditId: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
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
    username?: string | null;
    phone: string;
    email?: string | null;
    isActive: boolean;
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

function AuditLogs() {
  const navigate = useNavigate();
  const location = useLocation();

  const [logs, setLogs] = useState<AuditLog[]>([]);

  const [officers, setOfficers] = useState<Officer[]>(
    []
  );

  const [officeId, setOfficeId] = useState<
    string | null
  >(null);

  const [officeName, setOfficeName] =
    useState("");

  const [officeCode, setOfficeCode] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [currentDateTime, setCurrentDateTime] =
    useState(new Date());

  /* =========================================================
     CURRENT USER
  ========================================================== */

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
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username ||
        "Office Admin";

  const userInitials =
    user.firstName && user.lastName
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

  /* =========================================================
     LIVE DATE / TIME
  ========================================================== */

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

  /* =========================================================
     LOAD OFFICE ADMIN
  ========================================================== */

  const loadOfficeDetails =
    async () => {
      const token =
        localStorage.getItem(
          "token"
        );

      const response =
        await apiRequest<OfficeAdminListResponse>(
          "/dashboard/office-admins",
          {
            method: "GET",
            cache: "no-store",
            headers: token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : undefined,
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

      setOfficeId(
        String(
          currentAdmin.office.officeId
        )
      );

      setOfficeName(
        currentAdmin.office.officeName ||
          "Government Office"
      );

      setOfficeCode(
        currentAdmin.office.officeCode ||
          ""
      );
    };

  /* =========================================================
     LOAD OFFICERS
  ========================================================== */

  const loadOfficers =
    async () => {
      const token =
        localStorage.getItem(
          "token"
        );

      const response =
        await apiRequest<OfficerListResponse>(
          "/dashboard/officers",
          {
            method: "GET",
            cache: "no-store",
            headers: token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : undefined,
          }
        );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Failed to load officers."
        );
      }

      setOfficers(
        response.data ?? []
      );
    };

  /* =========================================================
     LOAD AUDIT LOGS
  ========================================================== */

  const loadAuditLogs =
    async () => {
      const token =
        localStorage.getItem(
          "token"
        );

      const response =
        await apiRequest<AuditLogResponse>(
          "/dashboard/audit-logs",
          {
            method: "GET",
            cache: "no-store",
            headers: token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : undefined,
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

  /* =========================================================
     LOAD PAGE
  ========================================================== */

  const loadPage =
    async () => {
      setLoading(true);
      setError("");

      try {
        await Promise.all([
          loadOfficeDetails(),
          loadOfficers(),
          loadAuditLogs(),
        ]);
      } catch (err) {
        console.error(
          "Audit Logs error:",
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
            "Failed to load audit logs."
          );
        }
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

  /* =========================================================
     USERS BELONGING TO CURRENT OFFICE
  ========================================================== */

  const officeUserIds =
    useMemo(() => {
      const ids =
        new Set<string>();

      /*
       * Current Office Admin
       */
      if (user.userId) {
        ids.add(
          String(user.userId)
        );
      }

      /*
       * Officers returned for the office.
       */
      officers.forEach(
        (officer) => {
          if (
            !officeId ||
            String(
              officer.office.officeId
            ) === String(officeId)
          ) {
            ids.add(
              String(
                officer.user.userId
              )
            );
          }
        }
      );

      return ids;
    }, [
      officers,
      officeId,
      user.userId,
    ]);

  /* =========================================================
     OFFICE-SCOPED AUDIT LOGS
  ========================================================== */

  const officeLogs =
    useMemo(() => {
      /*
       * System logs without a user are kept only if
       * the backend has already scoped the response.
       */
      return logs.filter(
        (log) => {
          if (!log.user) {
            return true;
          }

          return officeUserIds.has(
            String(
              log.user.userId
            )
          );
        }
      );
    }, [
      logs,
      officeUserIds,
    ]);

  /* =========================================================
     SEARCH
  ========================================================== */

  const filteredLogs =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return officeLogs;
      }

      return officeLogs.filter(
        (log) => {
          const actor =
            log.user
              ? `${log.user.firstName} ${log.user.lastName} ${log.user.username || ""}`
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
        }
      );
    }, [
      officeLogs,
      search,
    ]);

  /* =========================================================
     RENDER
  ========================================================== */

  return (
    <div className="office-admin-page">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

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

          <div style={{ marginTop: "14px" }}>
            <LogoutButton />
          </div>

        </div>

      </aside>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="office-admin-main">

        {/* TOP BAR */}

        <header className="office-admin-topbar">

          <div className="office-admin-search">

            <span>⌕</span>

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

          <div
            className="office-admin-user"
            style={{
              gap: "16px",
            }}
          >

            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                alignItems:
                  "flex-end",
              }}
            >

              <span
                style={{
                  fontSize:
                    "13px",
                  fontWeight: 700,
                  color:
                    "#27343a",
                }}
              >
                {formattedDate}
              </span>

              <span
                style={{
                  marginTop:
                    "3px",
                  fontSize:
                    "12px",
                  color:
                    "#778790",
                }}
              >
                {formattedTime}
              </span>

            </div>

            <div className="office-admin-user-avatar">
              {userInitials}
            </div>

            <div className="office-admin-user-details">

              <strong>
                {displayName}
              </strong>

              <span>
                Office Administrator
              </span>

            </div>

          </div>

        </header>

        {/* CONTENT */}

        <section className="office-admin-content">

          <div className="officers-management-page">

            {/* HEADER */}

            <div className="officers-management-header">

              <div>

                <span className="officers-management-eyebrow">
                  SYSTEM ACTIVITY
                </span>

                <h1>
                  Audit Logs
                </h1>

                <p>
                  Review recorded system
                  actions and administrative
                  activity for your office.
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
                className="office-admin-refresh-button"
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

            {/* ERROR */}

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

            {/* TABLE CARD */}

            <div className="officers-management-card">

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
                    Retrieving recorded
                    system activity.
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

                  <h3>

                    {search
                      ? "No audit logs found"
                      : "No audit logs yet"}

                  </h3>

                  <p>

                    {search
                      ? `No audit records match "${search}".`
                      : "Recorded system activity for your office will appear here."}

                  </p>

                </div>

              ) : (

                <div className="officers-table-wrapper">

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

                            <td>
                              {formatDateTime(
                                log.createdAt
                              )}
                            </td>

                            {/* ACTION */}

                            <td>

                              <span
                                className="officer-management-status officer-status-active"
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
                                    {
                                      log
                                        .user
                                        .username ||
                                      "No username"
                                    }
                                  </div>

                                </>

                              ) : (

                                <span>
                                  System
                                </span>

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
                                }}
                              >
                                {
                                  log.entityId
                                }
                              </div>

                            </td>

                            {/* DESCRIPTION */}

                            <td
                              style={{
                                minWidth:
                                  "280px",
                                whiteSpace:
                                  "normal",
                              }}
                            >
                              {
                                log.description
                              }
                            </td>

                            {/* IP */}

                            <td>
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