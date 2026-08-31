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
  ClipboardList,
  CheckCircle2,
  Clock3,
  RefreshCw,
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

const getUser = () => {
  try {
    const storedUser =
      localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser) as {
      firstName?: string;
      lastName?: string;
      username?: string;
      role?: string;
    };
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

  const [agreements, setAgreements] =
    useState<BackendAgreement[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    currentDateTime,
    setCurrentDateTime,
  ] = useState(new Date());

  const displayName =
    getDisplayName();

  const initials =
    getInitials();

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
     LOAD AGREEMENTS
  ===================================================== */

  const loadAgreements =
    useCallback(
      async (
        showLoader = true
      ) => {
        const token = getToken();

        if (!token) {
          localStorage.removeItem(
            "token"
          );
          localStorage.removeItem(
            "user"
          );

          navigate("/login", {
            replace: true,
          });

          return;
        }

        if (showLoader) {
          setLoading(true);
        }

        setRefreshing(true);
        setError("");

        try {
          const response =
            await fetch(
              `${API_URL}/dashboard/contracts`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
              }
            );

          const result =
            (await response.json()) as ContractsResponse & {
              error?: string;
            };

          if (
            response.status === 401
          ) {
            localStorage.removeItem(
              "token"
            );
            localStorage.removeItem(
              "user"
            );

            navigate("/login", {
              replace: true,
            });

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
          setLoading(false);
          setRefreshing(false);
        }
      },
      [navigate]
    );

  useEffect(() => {
    void loadAgreements();
  }, [loadAgreements]);

  /* =====================================================
     STATISTICS
  ===================================================== */

  const totalAgreements =
    agreements.length;

  const pendingAgreements =
    agreements.filter(
      (agreement) =>
        agreement.status ===
          "PENDING_VERIFICATION" ||
        agreement.status ===
          "PENDING_SERVICE_FEE" ||
        agreement.status === "DRAFT"
    ).length;

  const approvedAgreements =
    agreements.filter(
      (agreement) =>
        agreement.status === "ACTIVE" ||
        agreement.status === "APPROVED"
    ).length;

  /* =====================================================
     SEARCH
  ===================================================== */

  const filteredAgreements =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return agreements;
      }

      return agreements.filter(
        (agreement) => {
          const reference =
            agreement.referenceNumber?.toLowerCase() ||
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
            agreement.unit?.property?.location
              ?.toLowerCase() || "";

          return (
            reference.includes(query) ||
            landlord.includes(query) ||
            tenant.includes(query) ||
            location.includes(query)
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
      return [...filteredAgreements]
        .sort(
          (a, b) =>
            new Date(
              b.createdAt ?? 0
            ).getTime() -
            new Date(
              a.createdAt ?? 0
            ).getTime()
        )
        .slice(0, 5);
    }, [filteredAgreements]);

  /* =====================================================
     LOGOUT
  ===================================================== */

  const handleLogout = () => {
    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "accessToken"
    );

    localStorage.removeItem(
      "user"
    );

    sessionStorage.removeItem(
      "token"
    );

    sessionStorage.removeItem(
      "accessToken"
    );

    navigate("/login", {
      replace: true,
    });
  };

  /* =====================================================
     FORMAT CURRENT TIME
  ===================================================== */

  const formattedDate =
    currentDateTime.toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

  const formattedTime =
    currentDateTime.toLocaleTimeString(
      "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
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
        return "Pending Payment";

      case "DRAFT":
        return "Draft";

      case "REJECTED":
        return "Rejected";

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
        return "status-rejected";

      case "PENDING_VERIFICATION":
      case "PENDING_SERVICE_FEE":
        return "status-pending";

      case "DRAFT":
      default:
        return "status-draft";
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

          <button
            type="button"
            className="officer-dashboard-nav-item active"
            onClick={() =>
              navigate(
                "/officer/dashboard"
              )
            }
          >
            <Home size={19} />

            <span>
              Dashboard
            </span>
          </button>

          <button
            type="button"
            className="officer-dashboard-nav-item"
            onClick={() =>
              navigate(
                "/officer/rental-agreements"
              )
            }
          >
            <FileText size={19} />

            <span>
              Rental Agreements
            </span>
          </button>

        </nav>

        <div className="officer-dashboard-sidebar-bottom">

          <div className="officer-dashboard-profile">

            <div className="officer-dashboard-avatar">
              <User size={19} />
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
            <LogOut size={18} />

            <span>
              Logout
            </span>
          </button>

        </div>
      </aside>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="officer-dashboard-main">

        {/* =================================================
            TOP BAR
        ================================================= */}

        <header className="officer-dashboard-topbar">

          <div className="officer-dashboard-search">

            <Search size={18} />

            <input
              type="search"
              placeholder="Search agreements..."
              value={search}
              onChange={(event) =>
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

        <section className="officer-dashboard-content">

          {/* PAGE HEADING */}

          <div className="officer-dashboard-heading">

            <div>
              <span className="officer-dashboard-eyebrow">
                OFFICER PORTAL
              </span>

              <h1>
                Officer Dashboard
              </h1>

              <p>
                Manage rental agreements and
                monitor rental information assigned
                to your office.
              </p>
            </div>

            <button
              type="button"
              className="officer-dashboard-view-button"
              onClick={() =>
                void loadAgreements(
                  true
                )
              }
              disabled={refreshing}
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "refresh-spinning"
                    : ""
                }
              />

              Refresh
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
                onClick={() =>
                  void loadAgreements(
                    true
                  )
                }
              >
                Try Again
              </button>
            </div>
          )}

          {/* =================================================
              STATISTICS
          ================================================= */}

          <div className="officer-dashboard-stats">

            <div className="officer-dashboard-stat-card">

              <div className="officer-dashboard-stat-icon">
                <FileText
                  size={23}
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
                  Rental agreements
                </small>
              </div>

            </div>

            <div className="officer-dashboard-stat-card">

              <div className="officer-dashboard-stat-icon">
                <ClipboardList
                  size={23}
                />
              </div>

              <div>
                <span>
                  Pending Agreements
                </span>

                <strong>
                  {loading
                    ? "—"
                    : pendingAgreements}
                </strong>

                <small>
                  Awaiting review
                </small>
              </div>

            </div>

            <div className="officer-dashboard-stat-card">

              <div className="officer-dashboard-stat-icon">
                <Home
                  size={23}
                />
              </div>

              <div>
                <span>
                  Approved Agreements
                </span>

                <strong>
                  {loading
                    ? "—"
                    : approvedAgreements}
                </strong>

                <small>
                  Approved rentals
                </small>
              </div>

            </div>

          </div>

          {/* =================================================
              RECENT AGREEMENTS
          ================================================= */}

          <section className="officer-dashboard-section">

            <div className="officer-dashboard-section-header">

              <div>
                <span className="officer-dashboard-section-label">
                  RENTAL MANAGEMENT
                </span>

                <h2>
                  Recent Rental Agreements
                </h2>

                <p>
                  View the latest rental agreements
                  registered in the system.
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
                  size={17}
                />

                View All
              </button>

            </div>

            {/* =================================================
                LOADING
            ================================================= */}

            {loading ? (
              <div className="officer-dashboard-empty-state">

                <div className="officer-dashboard-empty-icon">
                  <RefreshCw
                    size={28}
                    className="refresh-spinning"
                  />
                </div>

                <h3>
                  Loading agreements
                </h3>

                <p>
                  Retrieving your latest
                  rental agreement records.
                </p>

              </div>
            ) : recentAgreements.length >
              0 ? (

              <div className="officer-dashboard-recent-list">

                {recentAgreements.map(
                  (agreement) => (
                    <div
                      key={
                        agreement.agreementId
                      }
                      className="officer-dashboard-recent-item"
                    >

                      <div className="recent-item-icon">
                        <FileText
                          size={19}
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
                            : "Landlord"}{" "}
                          →{" "}
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
                          {agreement.status ===
                          "PENDING_VERIFICATION" ? (
                            <Clock3 size={13} />
                          ) : (
                            <CheckCircle2
                              size={13}
                            />
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
                    size={28}
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
                    : "You haven't created any rental agreements yet."}
                </p>

                {!search && (
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
                      size={17}
                    />

                    Create Agreement
                  </button>
                )}

              </div>

            )}

          </section>

        </section>
      </main>
    </div>
  );
}

export default OfficerDashboard;