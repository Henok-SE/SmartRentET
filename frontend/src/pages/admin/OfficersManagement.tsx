import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CreateOfficer from "./CreateOfficer";
import LogoutButton from "../../components/LogoutButton";
import { apiRequest } from "../../services/api";


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
    isActive: boolean;
    role?: string;
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
    phone?: string | null;
    email?: string | null;
    role?: string;
    isActive: boolean;
  };
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

export default function OfficersManagement() {
  const navigate = useNavigate();
  const location = useLocation();

  const [showCreateOfficer, setShowCreateOfficer] =
    useState(false);

  const [search, setSearch] = useState("");

  const [officers, setOfficers] = useState<Officer[]>(
    []
  );

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

  const [statusLoadingId, setStatusLoadingId] =
    useState<string | null>(null);

  const [statusError, setStatusError] =
    useState("");

  const [statusSuccess, setStatusSuccess] =
    useState("");
  const [currentDateTime, setCurrentDateTime] =
  useState(new Date());  

  /*
   * =========================================================
   * CURRENT USER
   * =========================================================
   */

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user");

    if (!storedUser) {
      return;
    }

    try {
      setCurrentUser(
        JSON.parse(
          storedUser
        ) as StoredUser
      );
    } catch {
      setCurrentUser({});
    }
  }, []);
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
   * LOAD CURRENT OFFICE ADMIN
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
   * LOAD OFFICERS
   * =========================================================
   */

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
       * The backend already scopes /dashboard/officers
       * for OFFICE_ADMIN users to their own office.
       */
      setOfficers(
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.userId]);

  /*
   * =========================================================
   * OFFICE FILTER
   *
   * Keep this as a defensive frontend check. The backend
   * already scopes the result, but this prevents accidental
   * rendering if an unexpected record ever comes back.
   * =========================================================
   */

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

  /*
   * =========================================================
   * SEARCH
   * =========================================================
   */

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
            officer.subCity,
            officer.assignedTo,
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

  /*
   * =========================================================
   * COUNTS
   * =========================================================
   */

  const activeCount =
    officeOfficers.filter(
      (officer) =>
        officer.user.isActive
    ).length;

  const inactiveCount =
    officeOfficers.length -
    activeCount;

  /*
   * =========================================================
   * ACTIVATE / DEACTIVATE
   * =========================================================
   */

  const handleStatusChange = async (
    officer: Officer
  ) => {
    const nextStatus =
      !officer.user.isActive;

    const actionLabel =
      nextStatus
        ? "activate"
        : "deactivate";

    const confirmed =
      window.confirm(
        `Are you sure you want to ${actionLabel} ${officer.user.firstName} ${officer.user.lastName}'s account?`
      );

    if (!confirmed) {
      return;
    }

    setStatusLoadingId(
      officer.user.userId
    );

    setStatusError("");
    setStatusSuccess("");

    try {
      const response =
        await apiRequest<AccountStatusResponse>(
          `/auth/users/${encodeURIComponent(
            officer.user.userId
          )}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
              ...(getAuthHeaders() || {}),
            },
            body: JSON.stringify({
              isActive:
                nextStatus,
            }),
          }
        );

      if (!response.success) {
        throw new Error(
          response.message ||
            response.error ||
            `Failed to ${actionLabel} officer account.`
        );
      }

      /*
       * Update the local row immediately.
       * This gives instant UI feedback without another
       * full-page request.
       */
      setOfficers(
        (previous) =>
          previous.map(
            (item) =>
              item.user.userId ===
              officer.user.userId
                ? {
                    ...item,
                    user: {
                      ...item.user,
                      isActive:
                        nextStatus,
                    },
                  }
                : item
          )
      );

      setStatusSuccess(
        `${officer.user.firstName} ${officer.user.lastName}'s account was ${
          nextStatus
            ? "activated"
            : "deactivated"
        } successfully.`
      );

      /*
       * Clear success message after a moment.
       */
      window.setTimeout(() => {
        setStatusSuccess("");
      }, 2500);
    } catch (err) {
      if (
        err instanceof Error
      ) {
        setStatusError(
          err.message
        );
      } else {
        setStatusError(
          `Failed to ${actionLabel} officer account.`
        );
      }
    } finally {
      setStatusLoadingId(null);
    }
  };

  /*
   * =========================================================
   * CREATE OFFICER CALLBACK
   * =========================================================
   */

  const handleOfficerModalClose = (
    created: boolean
  ) => {
    setShowCreateOfficer(false);

    if (created) {
      void loadPage();
    }
  };

  /*
   * =========================================================
   * DISPLAY USER
   * =========================================================
   */

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
                  className="create-officer-button"
                  onClick={() =>
                    void loadPage()
                  }
                  disabled={
                    loading ||
                    statusLoadingId !==
                      null
                  }
                >
                  {loading
                    ? "Refreshing..."
                    : "Refresh"}
                </button>

                <button
                  type="button"
                  className="create-officer-button"
                  onClick={() =>
                    setShowCreateOfficer(
                      true
                    )
                  }
                  disabled={
                    statusLoadingId !==
                    null
                  }
                >
                  + Create Officer
                </button>
              </div>
            </div>

            {/* =================================================
                GENERAL ERROR
                ================================================= */}

            {error && (
              <div
                className="auth-error"
                role="alert"
                style={{
                  marginBottom:
                    "14px",
                }}
              >
                {error}
              </div>
            )}

            {/* =================================================
                STATUS ERROR
                ================================================= */}

            {statusError && (
              <div
                className="auth-error"
                role="alert"
                style={{
                  marginBottom:
                    "14px",
                }}
              >
                {statusError}
              </div>
            )}

            {/* =================================================
                STATUS SUCCESS
                ================================================= */}

            {statusSuccess && (
              <div
                role="status"
                style={{
                  marginBottom:
                    "14px",
                  padding:
                    "12px 16px",
                  border:
                    "1px solid #a7e5d5",
                  borderRadius:
                    "6px",
                  background:
                    "#ecfdf8",
                  color:
                    "#047857",
                  fontSize:
                    "14px",
                }}
              >
                {statusSuccess}
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
                TABLE CARD
                ================================================= */}

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
                    Loading officers...
                  </h3>

                  <p>
                    Retrieving officers from your
                    Government Office.
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

                        <th>
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredOfficers.length >
                      0 ? (
                        filteredOfficers.map(
                          (officer) => {
                            const isChangingStatus =
                              statusLoadingId ===
                              officer.user.userId;

                            return (
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
                                        {
                                          officer
                                            .user
                                            .phone
                                        }
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* USERNAME */}

                                <td>
                                  {officer
                                    .user
                                    .username ||
                                    "—"}
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
                                  {officer.assignedArea ||
                                    officer.subCity ||
                                    officer
                                      .office
                                      .subCity ||
                                    "—"}
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

                                {/* ACTION */}

                                <td>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleStatusChange(
                                        officer
                                      )
                                    }
                                    disabled={
                                      isChangingStatus
                                    }
                                    style={{
                                      minWidth:
                                        "105px",
                                      height:
                                        "36px",
                                      padding:
                                        "0 12px",
                                      border:
                                        officer
                                          .user
                                          .isActive
                                          ? "1px solid #f1b8b4"
                                          : "1px solid #b7ddd3",
                                      borderRadius:
                                        "6px",
                                      background:
                                        officer
                                          .user
                                          .isActive
                                          ? "#fff7f6"
                                          : "#f3fbf8",
                                      color:
                                        officer
                                          .user
                                          .isActive
                                          ? "#b42318"
                                          : "#008f78",
                                      fontSize:
                                        "12px",
                                      fontWeight:
                                        700,
                                      cursor:
                                        isChangingStatus
                                          ? "not-allowed"
                                          : "pointer",
                                      opacity:
                                        isChangingStatus
                                          ? 0.6
                                          : 1,
                                    }}
                                  >
                                    {isChangingStatus
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
                        )
                      ) : (
                        <tr>
                          <td
                            colSpan={
                              9
                            }
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
          CREATE OFFICER
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