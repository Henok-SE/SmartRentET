import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  FileText,
  Search,
  LogOut,
  User,
  Home,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Settings,
  KeyRound,
  X,
  Eye,
  EyeOff,
  CreditCard,
  XCircle,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type AgreementStatus =
  | "ACTIVE"
  | "APPROVED"
  | "PENDING_VERIFICATION"
  | "PENDING_SERVICE_FEE"
  | "DRAFT"
  | "REJECTED"
  | "TERMINATED"
  | "EXPIRED"
  | string;

type BackendAgreement = {
  agreementId: string;
  referenceNumber: string;
  status: AgreementStatus;

  rentalAmount?: number | string | null;
  effectiveDate?: string | null;
  terminationDate?: string | null;
  createdAt?: string;

  landlord?: {
    user?: {
      firstName?: string;
      lastName?: string;
    };
  };

  tenant?: {
    user?: {
      firstName?: string;
      lastName?: string;
    };
  };

  unit?: {
    unitNumber?: string;

    property?: {
      location?: string | null;
      subCity?: string | null;
      woreda?: string | null;
    };
  };
};

type ContractsResponse = {
  success: boolean;
  message?: string;
  data: BackendAgreement[];
  filters?: Record<string, unknown>;
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
    phone?: string | null;
    email?: string | null;
    role: string;
    isActive: boolean;
  };

  office?: {
    officeId: string;
    officeCode: string;
    officeName: string;
    region?: string | null;
    city?: string | null;
    subCity?: string | null;
    woreda?: string | null;
  } | null;
};

type OfficerListResponse = {
  success: boolean;
  message?: string;
  data: Officer[];
};

type ChangePasswordResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

type StoredUser = {
  userId?: string | number;
  firstName?: string;
  lastName?: string;
  username?: string;
  role?: string;
};

/* =========================================================
   HELPERS
========================================================= */

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  sessionStorage.getItem("token") ||
  sessionStorage.getItem("accessToken") ||
  "";

const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");

  sessionStorage.removeItem("token");
  sessionStorage.removeItem("accessToken");
};

const getUser = (): StoredUser | null => {
  try {
    const storedUser =
      localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    return JSON.parse(
      storedUser
    ) as StoredUser;
  } catch {
    return null;
  }
};

const getDisplayName = () => {
  const user = getUser();

  if (!user) {
    return "Officer";
  }

  const fullName =
    `${user.firstName ?? ""} ${
      user.lastName ?? ""
    }`.trim();

  return (
    fullName ||
    user.username ||
    "Officer"
  );
};

const getInitials = () => {
  const user = getUser();

  if (!user) {
    return "O";
  }

  const first =
    user.firstName?.charAt(0) ?? "";

  const last =
    user.lastName?.charAt(0) ?? "";

  const initials =
    `${first}${last}`.trim();

  if (initials) {
    return initials.toUpperCase();
  }

  return (
    user.username
      ?.slice(0, 2)
      .toUpperCase() || "O"
  );
};

const formatDate = (
  value?: string | null
) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
};

/* =========================================================
   COMPONENT
========================================================= */

function OfficerDashboard() {
  const navigate = useNavigate();

  /* =======================================================
     USER / OFFICE
  ======================================================= */

  const [
    currentOfficer,
    setCurrentOfficer,
  ] = useState<Officer | null>(null);

  const [
    officeName,
    setOfficeName,
  ] = useState("");

  const [
    officeCode,
    setOfficeCode,
  ] = useState("");

  /* =======================================================
     AGREEMENTS
  ======================================================= */

  const [
    agreements,
    setAgreements,
  ] = useState<BackendAgreement[]>([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  /* =======================================================
     CLOCK
  ======================================================= */

  const [
    currentDateTime,
    setCurrentDateTime,
  ] = useState(new Date());

  /* =======================================================
     CHANGE PASSWORD
  ======================================================= */

  const [
    showChangePassword,
    setShowChangePassword,
  ] = useState(false);

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    passwordError,
    setPasswordError,
  ] = useState("");

  const [
    passwordSuccess,
    setPasswordSuccess,
  ] = useState("");

  const [
    passwordLoading,
    setPasswordLoading,
  ] = useState(false);

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const displayName =
    getDisplayName();

  const initials =
    getInitials();

  const storedUser = getUser();

  /* =====================================================
     LIVE DATE / TIME
  ===================================================== */

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        setCurrentDateTime(
          new Date()
        );
      }, 1000);

    return () =>
      window.clearInterval(timer);
  }, []);

  /* =====================================================
     LOAD OFFICER DETAILS
     
     Uses the existing /dashboard/officers endpoint.
     The backend already returns office information.
  ===================================================== */

  const loadOfficerDetails =
    useCallback(
      async () => {
        const token =
          getToken();

        if (!token) {
          clearSession();

          navigate(
            "/login",
            {
              replace: true,
            }
          );

          return;
        }

        try {
          const response =
            await fetch(
              `${API_URL}/dashboard/officers`,
              {
                method: "GET",
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
                cache:
                  "no-store",
              }
            );

          const result =
            (await response.json()) as OfficerListResponse & {
              error?: string;
            };

          if (
            response.status === 401
          ) {
            clearSession();

            navigate(
              "/login",
              {
                replace: true,
              }
            );

            return;
          }

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ||
                result.error ||
                "Failed to load officer information."
            );
          }

          const currentUserId =
            String(
              storedUser?.userId ??
                ""
            );

          const officer =
            (result.data ?? []).find(
              (item) =>
                String(
                  item.user
                    ?.userId ??
                    ""
                ) ===
                currentUserId
            );

          if (!officer) {
            throw new Error(
              "Your officer record could not be found."
            );
          }

          setCurrentOfficer(
            officer
          );

          if (
            officer.office
          ) {
            setOfficeName(
              officer.office
                .officeName ||
                "Government Office"
            );

            setOfficeCode(
              officer.office
                .officeCode ||
                ""
            );
          } else {
            setOfficeName(
              ""
            );

            setOfficeCode(
              ""
            );
          }
        } catch (err) {
          console.error(
            "Officer details error:",
            err
          );

          throw err;
        }
      },
      [
        navigate,
        storedUser?.userId,
      ]
    );

  /* =====================================================
     LOAD AGREEMENTS
  ===================================================== */

  const loadAgreements =
    useCallback(
      async (
        showLoader = true
      ) => {
        const token =
          getToken();

        if (!token) {
          clearSession();

          navigate(
            "/login",
            {
              replace: true,
            }
          );

          return;
        }

        if (showLoader) {
          setLoading(
            true
          );
        }

        setRefreshing(
          true
        );

        setError("");

        try {
          const response =
            await fetch(
              `${API_URL}/dashboard/contracts`,
              {
                method: "GET",

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },

                cache:
                  "no-store",
              }
            );

          const result =
            (await response.json()) as ContractsResponse & {
              error?: string;
            };

          if (
            response.status ===
            401
          ) {
            clearSession();

            navigate(
              "/login",
              {
                replace: true,
              }
            );

            return;
          }

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.error ||
                result.message ||
                "Failed to load rental agreements."
            );
          }

          setAgreements(
            result.data ?? []
          );
        } catch (err) {
          console.error(
            "Officer dashboard error:",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "Failed to load rental agreements."
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [navigate]
    );

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    const loadDashboard =
      async () => {
        setLoading(
          true
        );

        setError("");

        try {
          await Promise.all([
            loadOfficerDetails(),
            loadAgreements(
              false
            ),
          ]);
        } catch (err) {
          console.error(
            "Officer dashboard initialization error:",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "Failed to load Officer Dashboard."
          );
        } finally {
          setLoading(
            false
          );
          setRefreshing(
            false
          );
        }
      };

    void loadDashboard();
  }, [
    loadOfficerDetails,
    loadAgreements,
  ]);

  /* =====================================================
     AGREEMENT STATISTICS
     
     IMPORTANT:
     These values are calculated ONLY from the
     agreements returned by /dashboard/contracts.
  ===================================================== */

  const totalAgreements =
    agreements.length;

  const pendingVerificationCount =
    agreements.filter(
      (agreement) =>
        agreement.status ===
        "PENDING_VERIFICATION"
    ).length;

  const pendingServiceFeeCount =
    agreements.filter(
      (agreement) =>
        agreement.status ===
        "PENDING_SERVICE_FEE"
    ).length;

  const approvedCount =
    agreements.filter(
      (agreement) =>
        agreement.status ===
        "APPROVED"
    ).length;

  const activeCount =
    agreements.filter(
      (agreement) =>
        agreement.status ===
        "ACTIVE"
    ).length;

  const rejectedCount =
    agreements.filter(
      (agreement) =>
        agreement.status ===
          "REJECTED" ||
        agreement.status ===
          "TERMINATED" ||
        agreement.status ===
          "EXPIRED"
    ).length;

  const draftCount =
    agreements.filter(
      (agreement) =>
        agreement.status ===
        "DRAFT"
    ).length;

  /* =====================================================
     SEARCH
  ===================================================== */

  const filteredAgreements =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return agreements;
      }

      return agreements.filter(
        (agreement) => {
          const reference =
            agreement.referenceNumber
              ?.toLowerCase() ||
            "";

          const landlord =
            `${agreement.landlord?.user?.firstName ?? ""} ${
              agreement.landlord?.user?.lastName ?? ""
            }`
              .trim()
              .toLowerCase();

          const tenant =
            `${agreement.tenant?.user?.firstName ?? ""} ${
              agreement.tenant?.user?.lastName ?? ""
            }`
              .trim()
              .toLowerCase();

          const location =
            agreement.unit
              ?.property
              ?.location
              ?.toLowerCase() ||
            "";

          const subCity =
            agreement.unit
              ?.property
              ?.subCity
              ?.toLowerCase() ||
            "";

          const status =
            agreement.status
              ?.toLowerCase() ||
            "";

          return (
            reference.includes(
              query
            ) ||
            landlord.includes(
              query
            ) ||
            tenant.includes(
              query
            ) ||
            location.includes(
              query
            ) ||
            subCity.includes(
              query
            ) ||
            status.includes(
              query
            )
          );
        }
      );
    }, [
      agreements,
      search,
    ]);

  /* =====================================================
     RECENT AGREEMENTS
  ===================================================== */

  const recentAgreements =
    useMemo(() => {
      return [
        ...filteredAgreements,
      ]
        .sort(
          (a, b) =>
            new Date(
              b.createdAt ??
                0
            ).getTime() -
            new Date(
              a.createdAt ??
                0
            ).getTime()
        )
        .slice(
          0,
          5
        );
    }, [
      filteredAgreements,
    ]);

  /* =====================================================
     LOGOUT
  ===================================================== */

  const handleLogout = () => {
    clearSession();

    navigate(
      "/login",
      {
        replace: true,
      }
    );
  };

  /* =====================================================
     OPEN SETTINGS
  ===================================================== */

  const openChangePassword =
    () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setPasswordError("");
      setPasswordSuccess("");

      setShowCurrentPassword(
        false
      );
      setShowNewPassword(
        false
      );
      setShowConfirmPassword(
        false
      );

      setShowChangePassword(
        true
      );
    };

  /* =====================================================
     CLOSE SETTINGS
  ===================================================== */

  const closeChangePassword =
    () => {
      if (
        passwordLoading
      ) {
        return;
      }

      setShowChangePassword(
        false
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setPasswordError("");
      setPasswordSuccess("");
    };

  /* =====================================================
     CHANGE PASSWORD
  ===================================================== */

  const handleChangePassword =
    async (
      event: React.FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      setPasswordError("");
      setPasswordSuccess("");

      const user =
        getUser();

      if (
        !user?.userId
      ) {
        setPasswordError(
          "Your user information could not be found. Please log in again."
        );

        return;
      }

      if (
        !currentPassword
      ) {
        setPasswordError(
          "Current password is required."
        );

        return;
      }

      if (
        !newPassword
      ) {
        setPasswordError(
          "New password is required."
        );

        return;
      }

      if (
        newPassword.length <
        6
      ) {
        setPasswordError(
          "New password must be at least 6 characters."
        );

        return;
      }

      if (
        !confirmPassword
      ) {
        setPasswordError(
          "Please confirm your new password."
        );

        return;
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        setPasswordError(
          "New passwords do not match."
        );

        return;
      }

      if (
        currentPassword ===
        newPassword
      ) {
        setPasswordError(
          "New password must be different from your current password."
        );

        return;
      }

      const token =
        getToken();

      if (!token) {
        handleLogout();

        return;
      }

      setPasswordLoading(
        true
      );

      try {
        const response =
          await fetch(
            `${API_URL}/auth/change-password`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  userId:
                    String(
                      user.userId
                    ),

                  currentPassword,

                  newPassword,
                }),
            }
          );

        const result =
          (await response.json()) as ChangePasswordResponse;

        if (
          response.status ===
          401
        ) {
          handleLogout();

          return;
        }

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ||
              result.message ||
              "Failed to change password."
          );
        }

        setPasswordSuccess(
          result.message ||
            "Password changed successfully."
        );

        window.setTimeout(
          () => {
            clearSession();

            navigate(
              "/login",
              {
                replace: true,
              }
            );
          },
          1200
        );
      } catch (err) {
        console.error(
          "Change password error:",
          err
        );

        setPasswordError(
          err instanceof Error
            ? err.message
            : "Failed to change password."
        );
      } finally {
        setPasswordLoading(
          false
        );
      }
    };

  /* =====================================================
     FORMAT CURRENT TIME
  ===================================================== */

  const formattedDate =
    currentDateTime.toLocaleDateString(
      "en-US",
      {
        weekday:
          "long",
        year:
          "numeric",
        month:
          "long",
        day:
          "numeric",
      }
    );

  const formattedTime =
    currentDateTime.toLocaleTimeString(
      "en-US",
      {
        hour:
          "2-digit",
        minute:
          "2-digit",
        second:
          "2-digit",
      }
    );

  /* =====================================================
     STATUS LABEL
  ===================================================== */

  const getStatusLabel = (
    status: string
  ) => {
    switch (status) {
      case "ACTIVE":
        return "Active";

      case "APPROVED":
        return "Approved";

      case "PENDING_VERIFICATION":
        return "Pending Verification";

      case "PENDING_SERVICE_FEE":
        return "Pending Service Fee";

      case "DRAFT":
        return "Draft";

      case "REJECTED":
        return "Rejected";

      case "TERMINATED":
        return "Terminated";

      case "EXPIRED":
        return "Expired";

      default:
        return status;
    }
  };

  /* =====================================================
     STATUS CLASS
  ===================================================== */

  const getStatusClass = (
    status: string
  ) => {
    switch (status) {
      case "ACTIVE":
      case "APPROVED":
        return "status-approved";

      case "REJECTED":
      case "TERMINATED":
      case "EXPIRED":
        return "status-rejected";

      case "PENDING_VERIFICATION":
      case "PENDING_SERVICE_FEE":
        return "status-pending";

      case "DRAFT":
      default:
        return "status-draft";
    }
  };

  /* =====================================================
     STATUS ICON
  ===================================================== */

  const getStatusIcon = (
    status: string
  ) => {
    switch (status) {
      case "ACTIVE":
      case "APPROVED":
        return (
          <CheckCircle2
            size={13}
          />
        );

      case "PENDING_VERIFICATION":
      case "PENDING_SERVICE_FEE":
        return (
          <Clock3
            size={13}
          />
        );

      case "REJECTED":
      case "TERMINATED":
      case "EXPIRED":
        return (
          <XCircle
            size={13}
          />
        );

      default:
        return (
          <FileText
            size={13}
          />
        );
    }
  };

  return (
    <div className="officer-dashboard-page">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="officer-dashboard-sidebar">

        <div className="officer-dashboard-brand">

          <img
            src="/smartrent-logo.png"
            alt="SmartRent ET Logo"
            className="officer-dashboard-logo"
          />

          <div>

            <h2>
              SmartRent ET
            </h2>

            <span>
              RENTAL MONITORING
            </span>

          </div>

        </div>

        <div className="officer-dashboard-divider" />

        <nav className="officer-dashboard-navigation">

          {/* DASHBOARD */}

          <button
            type="button"
            className="officer-dashboard-nav-item active"
            onClick={() =>
              navigate(
                "/officer/dashboard"
              )
            }
          >

            <Home
              size={
                19
              }
            />

            <span>
              Dashboard
            </span>

          </button>

          {/* RENTAL AGREEMENTS */}

          <button
            type="button"
            className="officer-dashboard-nav-item"
            onClick={() =>
              navigate(
                "/officer/rental-agreements"
              )
            }
          >

            <FileText
              size={
                19
              }
            />

            <span>
              Rental Agreements
            </span>

          </button>

          {/* SETTINGS */}

          <button
            type="button"
            className="officer-dashboard-nav-item"
            onClick={
              openChangePassword
            }
          >

            <Settings
              size={
                19
              }
            />

            <span>
              Settings
            </span>

          </button>

        </nav>

        <div className="officer-dashboard-sidebar-bottom">

          <div className="officer-dashboard-profile">

            <div className="officer-dashboard-avatar">

              <User
                size={
                  19
                }
              />

            </div>

            <div className="officer-dashboard-profile-info">

              <strong>
                {displayName}
              </strong>

              <span>
                Government Officer
              </span>

            </div>

          </div>

          <button
            type="button"
            className="officer-dashboard-logout"
            onClick={
              handleLogout
            }
          >

            <LogOut
              size={
                18
              }
            />

            <span>
              Logout
            </span>

          </button>

        </div>

      </aside>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="officer-dashboard-main">

        {/* =================================================
            TOP BAR
        ================================================= */}

        <header className="officer-dashboard-topbar">

          <div className="officer-dashboard-search">

            <Search
              size={
                18
              }
            />

            <input
              type="search"
              placeholder="Search agreements..."
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              aria-label="Search agreements"
            />

          </div>

          <div className="officer-dashboard-user">

            <div className="officer-dashboard-user-avatar">
              {initials}
            </div>

            <div>

              <strong>
                {displayName}
              </strong>

              <span>
                {formattedDate}
              </span>

              <small
                style={{
                  display:
                    "block",
                  marginTop:
                    "2px",
                  color:
                    "#6b7280",
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

        <section className="officer-dashboard-content">

          {/* =================================================
              PAGE HEADING
          ================================================= */}

          <div
            className="officer-dashboard-heading"
            style={{
              marginBottom:
                "24px",
            }}
          >

            <div>

              <span className="officer-dashboard-eyebrow">
                OFFICER PORTAL
              </span>

              <h1>
                Officer Dashboard
              </h1>

              <p>
                Manage rental agreements and monitor
                rental activity for your Government Office.
              </p>

              {/* OFFICE CONTEXT */}

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

                  {currentOfficer
                    ?.office
                    ?.subCity && (
                    <span
                      style={{
                        color:
                          "#778790",
                        fontSize:
                          "12px",
                      }}
                    >
                      {currentOfficer.office.subCity}
                    </span>
                  )}

                </div>
              )}

            </div>

            <button
              type="button"
              className="officer-dashboard-view-button"
              onClick={() =>
                void loadAgreements(
                  true
                )
              }
              disabled={
                refreshing
              }
            >

              <RefreshCw
                size={
                  17
                }
                className={
                  refreshing
                    ? "refresh-spinning"
                    : ""
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh"}

            </button>

          </div>

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (

            <div
              className="officer-dashboard-error"
              role="alert"
            >

              <strong>
                Unable to load dashboard data.
              </strong>

              <span>
                {error}
              </span>

              <button
                type="button"
                onClick={async () => {
                  setError("");

                  try {
                    await Promise.all([
                      loadOfficerDetails(),
                      loadAgreements(
                        true
                      ),
                    ]);
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Failed to refresh dashboard."
                    );
                  }
                }}
              >
                Try Again
              </button>

            </div>

          )}

          {/* =================================================
              AGREEMENT STATISTICS
          ================================================= */}

          <div
            className="officer-dashboard-stats"
            style={{
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
            }}
          >

            {/* TOTAL */}

            <div className="officer-dashboard-stat-card">

              <div className="officer-dashboard-stat-icon">

                <FileText
                  size={
                    23
                  }
                />

              </div>

              <div>

                <span>
                  Total Agreements
                </span>

                <strong>
                  {loading
                    ? "—"
                    : totalAgreements}
                </strong>

                <small>
                  Agreements in your office
                </small>

              </div>

            </div>

            {/* PENDING VERIFICATION */}

            <div className="officer-dashboard-stat-card">

              <div className="officer-dashboard-stat-icon">

                <Clock3
                  size={
                    23
                  }
                />

              </div>

              <div>

                <span>
                  Pending Verification
                </span>

                <strong>
                  {loading
                    ? "—"
                    : pendingVerificationCount}
                </strong>

                <small>
                  Awaiting USSD consent
                </small>

              </div>

            </div>

            {/* SERVICE FEE */}

            <div className="officer-dashboard-stat-card">

              <div className="officer-dashboard-stat-icon">

                <CreditCard
                  size={
                    23
                  }
                />

              </div>

              <div>

                <span>
                  Pending Service Fee
                </span>

                <strong>
                  {loading
                    ? "—"
                    : pendingServiceFeeCount}
                </strong>

                <small>
                  Awaiting 50 ETB payment
                </small>

              </div>

            </div>

            {/* APPROVED */}

            <div className="officer-dashboard-stat-card">

              <div className="officer-dashboard-stat-icon">

                <CheckCircle2
                  size={
                    23
                  }
                />

              </div>

              <div>

                <span>
                  Approved
                </span>

                <strong>
                  {loading
                    ? "—"
                    : approvedCount}
                </strong>

                <small>
                  Approved agreements
                </small>

              </div>

            </div>

            {/* ACTIVE */}

            <div className="officer-dashboard-stat-card">

              <div className="officer-dashboard-stat-icon">

                <Home
                  size={
                    23
                  }
                />

              </div>

              <div>

                <span>
                  Active
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

            </div>

            {/* REJECTED */}

            <div className="officer-dashboard-stat-card">

              <div className="officer-dashboard-stat-icon inactive-icon">

                <XCircle
                  size={
                    23
                  }
                />

              </div>

              <div>

                <span>
                  Rejected
                </span>

                <strong>
                  {loading
                    ? "—"
                    : rejectedCount}
                </strong>

                <small>
                  Rejected or ended
                </small>

              </div>

            </div>

          </div>

          {/* =================================================
              WORKFLOW SUMMARY
          ================================================= */}

          <section
            className="officer-dashboard-section"
            style={{
              marginTop:
                "24px",
            }}
          >

            <div className="officer-dashboard-section-header">

              <div>

                <span className="officer-dashboard-section-label">
                  AGREEMENT WORKFLOW
                </span>

                <h2>
                  What Needs Attention
                </h2>

                <p>
                  Monitor rental agreements that are
                  waiting for the next step.
                </p>

              </div>

              <button
                type="button"
                className="officer-dashboard-view-button"
                onClick={() =>
                  navigate(
                    "/officer/rental-agreements"
                  )
                }
              >

                <FileText
                  size={
                    17
                  }
                />

                Open Agreements

              </button>

            </div>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap:
                  "14px",
              }}
            >

              {/* VERIFICATION */}

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/officer/rental-agreements"
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

                <Clock3
                  size={
                    22
                  }
                />

                <strong
                  style={{
                    display:
                      "block",
                    marginTop:
                      "9px",
                    color:
                      "#25343a",
                  }}
                >
                  {loading
                    ? "—"
                    : pendingVerificationCount}{" "}
                  Pending Verification
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
                    lineHeight:
                      1.5,
                  }}
                >
                  Landlord or tenant USSD consent
                  is still required.
                </span>

              </button>

              {/* SERVICE FEE */}

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/officer/rental-agreements"
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

                <CreditCard
                  size={
                    22
                  }
                />

                <strong
                  style={{
                    display:
                      "block",
                    marginTop:
                      "9px",
                    color:
                      "#25343a",
                  }}
                >
                  {loading
                    ? "—"
                    : pendingServiceFeeCount}{" "}
                  Pending Service Fee
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
                    lineHeight:
                      1.5,
                  }}
                >
                  Agreements waiting for the
                  50 ETB service fee.
                </span>

              </button>

              {/* DRAFT */}

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/officer/rental-agreements"
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

                <FileText
                  size={
                    22
                  }
                />

                <strong
                  style={{
                    display:
                      "block",
                    marginTop:
                      "9px",
                    color:
                      "#25343a",
                  }}
                >
                  {loading
                    ? "—"
                    : draftCount}{" "}
                  Draft Agreements
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
                    lineHeight:
                      1.5,
                  }}
                >
                  Draft rental records in your
                  Government Office.
                </span>

              </button>

            </div>

          </section>

          {/* =================================================
              RECENT AGREEMENTS
          ================================================= */}

          <section
            className="officer-dashboard-section"
            style={{
              marginTop:
                "24px",
            }}
          >

            <div className="officer-dashboard-section-header">

              <div>

                <span className="officer-dashboard-section-label">
                  RENTAL MANAGEMENT
                </span>

                <h2>
                  Recent Rental Agreements
                </h2>

                <p>
                  Latest rental agreements registered
                  within your Government Office.
                </p>

              </div>

              <button
                type="button"
                className="officer-dashboard-view-button"
                onClick={() =>
                  navigate(
                    "/officer/rental-agreements"
                  )
                }
              >

                <FileText
                  size={
                    17
                  }
                />

                View All

              </button>

            </div>

            {/* LOADING */}

            {loading ? (

              <div className="officer-dashboard-empty-state">

                <div className="officer-dashboard-empty-icon">

                  <RefreshCw
                    size={
                      28
                    }
                    className="refresh-spinning"
                  />

                </div>

                <h3>
                  Loading agreements
                </h3>

                <p>
                  Retrieving rental agreements
                  for your Government Office.
                </p>

              </div>

            ) : recentAgreements.length >
              0 ? (

              <div className="officer-dashboard-recent-list">

                {recentAgreements.map(
                  (
                    agreement
                  ) => (

                    <div
                      key={
                        agreement.agreementId
                      }
                      className="officer-dashboard-recent-item"
                    >

                      <div className="recent-item-icon">

                        <FileText
                          size={
                            19
                          }
                        />

                      </div>

                      <div className="recent-item-main">

                        <strong>
                          {
                            agreement.referenceNumber
                          }
                        </strong>

                        <span>

                          {agreement.landlord?.user
                            ? `${agreement.landlord.user.firstName ?? ""} ${
                                agreement.landlord.user.lastName ?? ""
                              }`.trim()
                            : "Landlord"}

                          {" → "}

                          {agreement.tenant?.user
                            ? `${agreement.tenant.user.firstName ?? ""} ${
                                agreement.tenant.user.lastName ?? ""
                              }`.trim()
                            : "Tenant"}

                        </span>

                      </div>

                      <div className="recent-item-meta">

                        <span
                          className={`agreement-status-badge ${getStatusClass(
                            agreement.status
                          )}`}
                        >

                          {getStatusIcon(
                            agreement.status
                          )}

                          {getStatusLabel(
                            agreement.status
                          )}

                        </span>

                        <small>
                          {formatDate(
                            agreement.createdAt
                          )}
                        </small>

                      </div>

                    </div>

                  )
                )}

              </div>

            ) : (

              <div className="officer-dashboard-empty-state">

                <div className="officer-dashboard-empty-icon">

                  <FileText
                    size={
                      28
                    }
                  />

                </div>

                <h3>

                  {search
                    ? "No agreements found"
                    : "No rental agreements yet"}

                </h3>

                <p>

                  {search
                    ? `No agreement matches "${search}".`
                    : "There are no rental agreements currently available for your Government Office."}

                </p>

                <button
                  type="button"
                  className="officer-dashboard-view-button"
                  onClick={() =>
                    navigate(
                      "/officer/rental-agreements"
                    )
                  }
                >

                  <FileText
                    size={
                      17
                    }
                  />

                  Open Rental Agreements

                </button>

              </div>

            )}

          </section>

        </section>

      </main>

      {/* =================================================
          CHANGE PASSWORD MODAL
      ================================================= */}

      {showChangePassword && (

        <div
          role="presentation"
          onMouseDown={(
            event
          ) => {

            if (
              event.target ===
                event.currentTarget &&
              !passwordLoading
            ) {
              closeChangePassword();
            }

          }}
          style={{
            position:
              "fixed",
            inset: 0,
            zIndex:
              1000,
            padding:
              "20px",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            background:
              "rgba(15, 23, 42, 0.48)",
          }}
        >

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="officer-change-password-title"
            style={{
              width:
                "100%",
              maxWidth:
                "500px",
              maxHeight:
                "calc(100vh - 40px)",
              overflowY:
                "auto",
              background:
                "#ffffff",
              borderRadius:
                "14px",
              boxShadow:
                "0 25px 70px rgba(0,0,0,0.22)",
            }}
          >

            {/* HEADER */}

            <div
              style={{
                padding:
                  "22px 24px",
                borderBottom:
                  "1px solid #e8edeb",
                display:
                  "flex",
                alignItems:
                  "flex-start",
                justifyContent:
                  "space-between",
                gap:
                  "16px",
              }}
            >

              <div>

                <span
                  style={{
                    display:
                      "block",
                    marginBottom:
                      "6px",
                    color:
                      "#009681",
                    fontSize:
                      "11px",
                    fontWeight:
                      700,
                    letterSpacing:
                      "0.08em",
                  }}
                >
                  ACCOUNT SETTINGS
                </span>

                <h2
                  id="officer-change-password-title"
                  style={{
                    margin:
                      0,
                    color:
                      "#172126",
                    fontSize:
                      "22px",
                  }}
                >
                  Change Password
                </h2>

                <p
                  style={{
                    margin:
                      "8px 0 0",
                    color:
                      "#778790",
                    fontSize:
                      "13px",
                    lineHeight:
                      1.5,
                  }}
                >
                  Update your account password.
                  After the change, you will be
                  redirected to login.
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeChangePassword
                }
                disabled={
                  passwordLoading
                }
                aria-label="Close"
                style={{
                  width:
                    "36px",
                  height:
                    "36px",
                  flexShrink:
                    0,
                  border:
                    "none",
                  borderRadius:
                    "8px",
                  background:
                    "#f3f6f5",
                  color:
                    "#51616a",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  cursor:
                    passwordLoading
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                <X
                  size={
                    19
                  }
                />
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={
                handleChangePassword
              }
              style={{
                padding:
                  "24px",
              }}
            >

              {/* PASSWORD ERROR */}

              {passwordError && (

                <div
                  role="alert"
                  style={{
                    marginBottom:
                      "18px",
                    padding:
                      "12px 14px",
                    border:
                      "1px solid #f0b8b3",
                    borderRadius:
                      "8px",
                    background:
                      "#fff4f3",
                    color:
                      "#b42318",
                    fontSize:
                      "13px",
                    lineHeight:
                      1.5,
                  }}
                >
                  {
                    passwordError
                  }
                </div>

              )}

              {/* PASSWORD SUCCESS */}

              {passwordSuccess && (

                <div
                  role="status"
                  style={{
                    marginBottom:
                      "18px",
                    padding:
                      "12px 14px",
                    border:
                      "1px solid #a7e5d5",
                    borderRadius:
                      "8px",
                    background:
                      "#ecfdf8",
                    color:
                      "#047857",
                    fontSize:
                      "13px",
                    lineHeight:
                      1.5,
                  }}
                >
                  {
                    passwordSuccess
                  }
                </div>

              )}

              {/* CURRENT PASSWORD */}

              <div
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  gap:
                    "7px",
                  marginBottom:
                    "16px",
                }}
              >

                <label
                  htmlFor="officer-current-password"
                  style={{
                    color:
                      "#26343b",
                    fontSize:
                      "13px",
                    fontWeight:
                      700,
                  }}
                >
                  Current Password
                </label>

                <div
                  style={{
                    position:
                      "relative",
                  }}
                >

                  <KeyRound
                    size={
                      17
                    }
                    style={{
                      position:
                        "absolute",
                      left:
                        "13px",
                      top:
                        "50%",
                      transform:
                        "translateY(-50%)",
                      color:
                        "#8a979d",
                    }}
                  />

                  <input
                    id="officer-current-password"
                    type={
                      showCurrentPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      currentPassword
                    }
                    onChange={(
                      event
                    ) =>
                      setCurrentPassword(
                        event.target
                          .value
                      )
                    }
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    disabled={
                      passwordLoading
                    }
                    required
                    style={{
                      width:
                        "100%",
                      height:
                        "46px",
                      padding:
                        "0 46px 0 40px",
                      border:
                        "1px solid #d4ddda",
                      borderRadius:
                        "7px",
                      outline:
                        "none",
                      fontSize:
                        "14px",
                      color:
                        "#172126",
                      boxSizing:
                        "border-box",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowCurrentPassword(
                        (
                          value
                        ) =>
                          !value
                      )
                    }
                    disabled={
                      passwordLoading
                    }
                    aria-label={
                      showCurrentPassword
                        ? "Hide current password"
                        : "Show current password"
                    }
                    style={{
                      position:
                        "absolute",
                      right:
                        "10px",
                      top:
                        "50%",
                      transform:
                        "translateY(-50%)",
                      border:
                        "none",
                      background:
                        "transparent",
                      color:
                        "#7a898f",
                      cursor:
                        "pointer",
                    }}
                  >
                    {showCurrentPassword ? (
                      <EyeOff
                        size={
                          17
                        }
                      />
                    ) : (
                      <Eye
                        size={
                          17
                        }
                      />
                    )}
                  </button>

                </div>

              </div>

              {/* NEW PASSWORD */}

              <div
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  gap:
                    "7px",
                  marginBottom:
                    "16px",
                }}
              >

                <label
                  htmlFor="officer-new-password"
                  style={{
                    color:
                      "#26343b",
                    fontSize:
                      "13px",
                    fontWeight:
                      700,
                  }}
                >
                  New Password
                </label>

                <div
                  style={{
                    position:
                      "relative",
                  }}
                >

                  <KeyRound
                    size={
                      17
                    }
                    style={{
                      position:
                        "absolute",
                      left:
                        "13px",
                      top:
                        "50%",
                      transform:
                        "translateY(-50%)",
                      color:
                        "#8a979d",
                    }}
                  />

                  <input
                    id="officer-new-password"
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      newPassword
                    }
                    onChange={(
                      event
                    ) =>
                      setNewPassword(
                        event.target
                          .value
                      )
                    }
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    minLength={
                      6
                    }
                    disabled={
                      passwordLoading
                    }
                    required
                    style={{
                      width:
                        "100%",
                      height:
                        "46px",
                      padding:
                        "0 46px 0 40px",
                      border:
                        "1px solid #d4ddda",
                      borderRadius:
                        "7px",
                      outline:
                        "none",
                      fontSize:
                        "14px",
                      color:
                        "#172126",
                      boxSizing:
                        "border-box",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowNewPassword(
                        (
                          value
                        ) =>
                          !value
                      )
                    }
                    disabled={
                      passwordLoading
                    }
                    aria-label={
                      showNewPassword
                        ? "Hide new password"
                        : "Show new password"
                    }
                    style={{
                      position:
                        "absolute",
                      right:
                        "10px",
                      top:
                        "50%",
                      transform:
                        "translateY(-50%)",
                      border:
                        "none",
                      background:
                        "transparent",
                      color:
                        "#7a898f",
                      cursor:
                        "pointer",
                    }}
                  >
                    {showNewPassword ? (
                      <EyeOff
                        size={
                          17
                        }
                      />
                    ) : (
                      <Eye
                        size={
                          17
                        }
                      />
                    )}
                  </button>

                </div>

                <small
                  style={{
                    color:
                      "#84929a",
                    fontSize:
                      "11px",
                  }}
                >
                  Minimum 6 characters.
                </small>

              </div>

              {/* CONFIRM PASSWORD */}

              <div
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  gap:
                    "7px",
                }}
              >

                <label
                  htmlFor="officer-confirm-password"
                  style={{
                    color:
                      "#26343b",
                    fontSize:
                      "13px",
                    fontWeight:
                      700,
                  }}
                >
                  Confirm New Password
                </label>

                <div
                  style={{
                    position:
                      "relative",
                  }}
                >

                  <KeyRound
                    size={
                      17
                    }
                    style={{
                      position:
                        "absolute",
                      left:
                        "13px",
                      top:
                        "50%",
                      transform:
                        "translateY(-50%)",
                      color:
                        "#8a979d",
                    }}
                  />

                  <input
                    id="officer-confirm-password"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      confirmPassword
                    }
                    onChange={(
                      event
                    ) =>
                      setConfirmPassword(
                        event.target
                          .value
                      )
                    }
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    minLength={
                      6
                    }
                    disabled={
                      passwordLoading
                    }
                    required
                    style={{
                      width:
                        "100%",
                      height:
                        "46px",
                      padding:
                        "0 46px 0 40px",
                      border:
                        "1px solid #d4ddda",
                      borderRadius:
                        "7px",
                      outline:
                        "none",
                      fontSize:
                        "14px",
                      color:
                        "#172126",
                      boxSizing:
                        "border-box",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (
                          value
                        ) =>
                          !value
                      )
                    }
                    disabled={
                      passwordLoading
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmation password"
                        : "Show confirmation password"
                    }
                    style={{
                      position:
                        "absolute",
                      right:
                        "10px",
                      top:
                        "50%",
                      transform:
                        "translateY(-50%)",
                      border:
                        "none",
                      background:
                        "transparent",
                      color:
                        "#7a898f",
                      cursor:
                        "pointer",
                    }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff
                        size={
                          17
                        }
                      />
                    ) : (
                      <Eye
                        size={
                          17
                        }
                      />
                    )}
                  </button>

                </div>

              </div>

              {/* ACTIONS */}

              <div
                style={{
                  marginTop:
                    "24px",
                  paddingTop:
                    "18px",
                  borderTop:
                    "1px solid #e8edeb",
                  display:
                    "flex",
                  justifyContent:
                    "flex-end",
                  gap:
                    "10px",
                }}
              >

                <button
                  type="button"
                  onClick={
                    closeChangePassword
                  }
                  disabled={
                    passwordLoading
                  }
                  style={{
                    minWidth:
                      "100px",
                    height:
                      "44px",
                    padding:
                      "0 18px",
                    border:
                      "1px solid #ccd7d4",
                    borderRadius:
                      "7px",
                    background:
                      "#ffffff",
                    color:
                      "#4d5c64",
                    fontWeight:
                      700,
                    cursor:
                      passwordLoading
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    passwordLoading
                  }
                  style={{
                    minWidth:
                      "145px",
                    height:
                      "44px",
                    padding:
                      "0 18px",
                    border:
                      "none",
                    borderRadius:
                      "7px",
                    background:
                      "#0db792",
                    color:
                      "#ffffff",
                    fontWeight:
                      700,
                    cursor:
                      passwordLoading
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      passwordLoading
                        ? 0.65
                        : 1,
                  }}
                >
                  {passwordLoading
                    ? "Changing..."
                    : "Change Password"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default OfficerDashboard;