import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LogoutButton from "../../components/LogoutButton";
import { apiRequest } from "../../services/api";
import "../../App.css";

/* =========================================================
   TYPES
========================================================= */

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

/* =========================================================
   HELPERS
========================================================= */

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

/* =========================================================
   COMPONENT
========================================================= */

function OfficeAdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  /* =======================================================
     STATE
  ======================================================= */

  const [search, setSearch] = useState("");

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

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [currentDateTime, setCurrentDateTime] =
    useState(new Date());

  /* =======================================================
     CURRENT USER
  ======================================================= */

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

  /* =======================================================
     LIVE DATE / TIME
  ======================================================= */

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

  /* =======================================================
     LOAD OFFICE ADMIN DETAILS
  ======================================================= */

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
                  Authorization: `Bearer ${token}`,
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

  /* =======================================================
     LOAD OFFICERS
  ======================================================= */

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
                  Authorization: `Bearer ${token}`,
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

  /* =======================================================
     LOAD DASHBOARD
  ======================================================= */

  const loadDashboard =
    async () => {
      setLoading(true);
      setError("");

      try {
        await loadOfficeDetails();
        await loadOfficers();
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

    // We intentionally load the dashboard once
    // when the page is mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =======================================================
     FILTER TO CURRENT OFFICE
  ======================================================= */

  const officeOfficers =
    useMemo(() => {
      if (!officeId) {
        return [];
      }

      return officers.filter(
        (officer) =>
          String(
            officer.office.officeId
          ) ===
          String(officeId)
      );
    }, [
      officers,
      officeId,
    ]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredOfficers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return officeOfficers;
      }

      return officeOfficers.filter(
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
        }
      );
    }, [
      officeOfficers,
      search,
    ]);

  /* =======================================================
     COUNTS
  ======================================================= */

  const totalOfficers =
    officeOfficers.length;

  const activeOfficers =
    officeOfficers.filter(
      (officer) =>
        officer.user.isActive
    ).length;

  const inactiveOfficers =
    totalOfficers -
    activeOfficers;

  /* =======================================================
     RENDER
  ======================================================= */

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

        {/* =================================================
            NAVIGATION
        ================================================= */}

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

        {/* =================================================
            SIDEBAR PROFILE
        ================================================= */}

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

          <div
            style={{
              marginTop: "14px",
            }}
          >
            <LogoutButton />
          </div>

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

          <div
            className="office-admin-user"
            style={{
              gap: "16px",
            }}
          >

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >

              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#27343a",
                }}
              >
                {formattedDate}
              </span>

              <span
                style={{
                  marginTop: "3px",
                  fontSize: "12px",
                  color: "#778790",
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

        {/* =================================================
            CONTENT
        ================================================= */}

        <section className="office-admin-content">

          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <div className="office-admin-heading">

            <div>

              <span className="office-admin-eyebrow">
                OFFICERS MANAGEMENT
              </span>

              <h1>
                Dashboard
              </h1>

              <p>
                Monitor officers and
                their current status.
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
                void loadDashboard()
              }
              disabled={loading}
            >
              {loading
                ? "Refreshing..."
                : "Refresh"}
            </button>

          </div>

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div
              className="auth-error"
              role="alert"
              style={{
                marginBottom: "20px",
              }}
            >
              {error}
            </div>
          )}

          {/* =================================================
              STATISTICS
          ================================================= */}

          <section className="office-admin-stats">

            {/* TOTAL */}

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
                  Officers in your office
                </small>

              </div>

            </article>

            {/* ACTIVE */}

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

            {/* INACTIVE */}

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
              OFFICERS TABLE
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
                  View officers assigned to{" "}
                  {officeName ||
                    "your Government Office"}
                  .
                </p>

              </div>

            </div>

            {/* =================================================
                LOADING
            ================================================= */}

            {loading ? (

              <div
                style={{
                  padding: "60px 20px",
                  textAlign: "center",
                  color: "#6b7280",
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

            ) : (

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
                        Government Office
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

                    {filteredOfficers.length >
                    0 ? (

                      filteredOfficers.map(
                        (officer) => (
                          <tr
                            key={
                              officer.officerId
                            }
                          >

                            {/* NAME */}

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

                            {/* EMPLOYEE ID */}

                            <td>
                              {
                                officer.employeeId
                              }
                            </td>

                            {/* POSITION */}

                            <td>
                              {
                                officer.position ||
                                "—"
                              }
                            </td>

                            {/* OFFICE */}

                            <td>
                              {
                                officer.office
                                  .officeName
                              }
                            </td>

                            {/* AREA */}

                            <td>
                              {
                                officer
                                  .assignedArea ||
                                officer.office
                                  .subCity ||
                                "—"
                              }
                            </td>

                            {/* DATE */}

                            <td>
                              {formatDate(
                                officer.createdAt
                              )}
                            </td>

                            {/* STATUS */}

                            <td>

                              <span
                                className={`officer-status ${
                                  officer
                                    .user
                                    .isActive
                                    ? "status-active"
                                    : "status-inactive"
                                }`}
                              >

                                {officer
                                  .user
                                  .isActive
                                  ? "Active"
                                  : "Inactive"}

                              </span>

                            </td>

                          </tr>
                        )
                      )

                    ) : (

                      <tr>

                        <td
                          colSpan={7}
                          className="no-results"
                        >

                          {search
                            ? `No officers found for "${search}" in ${
                                officeName ||
                                "your office"
                              }.`
                            : "No officers found in your office."}

                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>

            )}

          </section>

        </section>

      </main>

    </div>
  );
}

export default OfficeAdminDashboard;