import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CreateOfficer from "./CreateOfficer";
import { apiRequest } from "../../services/api";

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

export default function OfficersManagement() {
  const navigate = useNavigate();
  const location = useLocation();

  const [showCreateOfficer, setShowCreateOfficer] =
    useState(false);

  const [search, setSearch] = useState("");

  const [officers, setOfficers] = useState<Officer[]>([]);

  const [officeId, setOfficeId] =
    useState<string | null>(null);

  const [officeName, setOfficeName] =
    useState("");

  const [officeCode, setOfficeCode] =
    useState("");

  const [currentUser, setCurrentUser] =
    useState<StoredUser>({});

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* =========================================================
     CURRENT USER
  ========================================================== */

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user");

    if (!storedUser) {
      return;
    }

    try {
      setCurrentUser(
        JSON.parse(storedUser) as StoredUser
      );
    } catch {
      setCurrentUser({});
    }
  }, []);

  /* =========================================================
     LOAD CURRENT OFFICE ADMIN
  ========================================================== */

  const loadOfficeDetails =
    async () => {
      const token =
        localStorage.getItem("token");

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
          currentUser.userId ?? ""
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
        localStorage.getItem("token");

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

  /* =========================================================
     LOAD PAGE
  ========================================================== */

  const loadPage =
    async () => {
      setLoading(true);
      setError("");

      try {
        await loadOfficeDetails();
        await loadOfficers();
      } catch (err) {
        console.error(
          "Officers Management error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load officers."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (
      currentUser.userId !==
      undefined
    ) {
      void loadPage();
    }
  }, [currentUser.userId]);

  /* =========================================================
     FILTER TO CURRENT OFFICE
  ========================================================== */

  const officeOfficers =
    useMemo(() => {
      if (!officeId) {
        return [];
      }

      return officers.filter(
        (officer) =>
          String(
            officer.office.officeId
          ) === String(officeId)
      );
    }, [
      officers,
      officeId,
    ]);

  /* =========================================================
     SEARCH
  ========================================================== */

  const filteredOfficers =
    useMemo(() => {
      const value =
        search
          .toLowerCase()
          .trim();

      if (!value) {
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
            .some((field) =>
              String(field)
                .toLowerCase()
                .includes(value)
            );
        }
      );
    }, [
      search,
      officeOfficers,
    ]);

  /* =========================================================
     COUNTS
  ========================================================== */

  const activeCount =
    officeOfficers.filter(
      (officer) =>
        officer.user.isActive
    ).length;

  const inactiveCount =
    officeOfficers.length -
    activeCount;

  /* =========================================================
     CREATE OFFICER CALLBACK
  ========================================================== */

  const handleOfficerModalClose = (
    created: boolean
  ) => {
    setShowCreateOfficer(false);

    if (created) {
      void loadOfficers();
    }
  };

  /* =========================================================
     DISPLAY USER
  ========================================================== */

  const displayName =
    currentUser.firstName &&
    currentUser.lastName
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : currentUser.username ||
        "Office Admin";

  const userInitials =
    currentUser.firstName &&
    currentUser.lastName
      ? `${currentUser.firstName.charAt(
          0
        )}${currentUser.lastName.charAt(
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

        {/* PROFILE */}

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

        </div>

      </aside>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="office-admin-main">

        {/* TOP BAR */}

        <header className="office-admin-topbar">

          <div className="office-admin-search">

            <span>
              ⌕
            </span>

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

              <strong>
                {displayName}
              </strong>

              <span>
                Office Administrator
              </span>

            </div>

          </div>

        </header>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <section className="office-admin-content">

          <div className="officers-management-page">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="officers-management-header">

              <div>

                <span className="officers-management-eyebrow">
                  USER MANAGEMENT
                </span>

                <h1>
                  Officers
                </h1>

                <p>
                  Manage officers assigned to your
                  Government Office.
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

              <div
                className="officers-header-actions"
              >

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

                <button
                  type="button"
                  className="create-officer-button"
                  onClick={() =>
                    setShowCreateOfficer(true)
                  }
                >
                  + Create Officer
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
                  marginBottom: "20px",
                }}
              >
                {error}
              </div>
            )}

            {/* =================================================
                STATISTICS
            ================================================= */}

            <div className="office-admin-stats">

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
                      : officeOfficers.length}
                  </strong>

                  <small>
                    Officers in your office
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
                      : activeCount}
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
                      : inactiveCount}
                  </strong>

                  <small>
                    Currently inactive
                  </small>

                </div>

              </article>

            </div>

            {/* =================================================
                OFFICERS TABLE
            ================================================= */}

            <div className="officers-management-card">

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
                    Retrieving officers from
                    your Government Office.
                  </p>

                </div>

              ) : (

                <div className="officers-table-wrapper">

                  <table className="officers-table">

                    <thead>

                      <tr>

                        <th>
                          Officer Name
                        </th>

                        <th>
                          Username
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
                          Status
                        </th>

                        <th>
                          Date Created
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

                                <div className="officer-management-name">

                                  <div className="officer-management-avatar">

                                    {officer.user.firstName.charAt(
                                      0
                                    )}

                                    {officer.user.lastName.charAt(
                                      0
                                    )}

                                  </div>

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

                                </div>

                              </td>

                              {/* USERNAME */}

                              <td>
                                {
                                  officer
                                    .user
                                    .username ||
                                  "—"
                                }
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

                                <strong>
                                  {
                                    officer
                                      .office
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
                                    officer
                                      .office
                                      .officeName
                                  }
                                </div>

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

                              {/* STATUS */}

                              <td>

                                <span
                                  className={`officer-management-status ${
                                    officer.user
                                      .isActive
                                      ? "officer-status-active"
                                      : "officer-status-inactive"
                                  }`}
                                >

                                  {officer.user
                                    .isActive
                                    ? "Active"
                                    : "Inactive"}

                                </span>

                              </td>

                              {/* DATE */}

                              <td>
                                {formatDate(
                                  officer.createdAt
                                )}
                              </td>

                            </tr>
                          )
                        )

                      ) : (

                        <tr>

                          <td
                            colSpan={8}
                            className="officers-no-results"
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

            </div>

          </div>

        </section>

      </main>

      {/* =====================================================
          CREATE OFFICER MODAL
      ===================================================== */}

      {showCreateOfficer && (
        <CreateOfficer
          onClose={
            handleOfficerModalClose
          }
        />
      )}

    </div>
  );
}