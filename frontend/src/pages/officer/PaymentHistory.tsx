import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  User,
  XCircle,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type PaymentHistoryItem = {
  paymentId: string;
  agreementId: string;

  amount: number | string | null;

  dueDate: string | null;
  paidDate: string | null;

  status: string;

  method?: string | null;
  provider?: string | null;

  transactionReference?: string | null;

  notes?: string | null;

  createdAt?: string | null;
};

type PaymentHistoryResponse = {
  success: boolean;
  message?: string;
  data: PaymentHistoryItem[];
  meta?: {
    count?: number;
  };
};

type AgreementInfo = {
  agreementId: string;
  referenceNumber: string;

  rentalAmount?: number | string | null;
  status?: string | null;

  effectiveDate?: string | null;
  terminationDate?: string | null;
  createdAt?: string | null;

  tenant?: {
    tenantId?: string;

    user?: {
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
    } | null;
  } | null;

  landlord?: {
    landlordId?: string;

    user?: {
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
    } | null;
  } | null;

  unit?: {
    unitId?: string;
    unitNumber?: string | null;

    property?: {
      location?: string | null;
      subCity?: string | null;
      woreda?: string | null;
    } | null;
  } | null;
};

type AgreementListResponse = {
  success: boolean;
  message?: string;
  data: AgreementInfo[];
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

const getCurrentUser = () => {
  try {
    const stored =
      localStorage.getItem("user");

    if (!stored) {
      return {
        firstName: "",
        lastName: "",
        username: "Officer",
      };
    }

    return JSON.parse(stored) as {
      firstName?: string;
      lastName?: string;
      username?: string;
    };
  } catch {
    return {
      firstName: "",
      lastName: "",
      username: "Officer",
    };
  }
};

const getDisplayName = () => {
  const user =
    getCurrentUser();

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
  const user =
    getCurrentUser();

  const initials =
    `${user.firstName?.charAt(0) ?? ""}${
      user.lastName?.charAt(0) ?? ""
    }`.trim();

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

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
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

const formatDateTime = (
  value?: string | null
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
};

const formatMoney = (
  value?: number | string | null
) => {
  const amount =
    Number(value ?? 0);

  if (
    Number.isNaN(amount)
  ) {
    return "0";
  }

  return amount.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  );
};

const getPersonName = (
  firstName?: string | null,
  lastName?: string | null
) => {
  const fullName =
    `${firstName ?? ""} ${
      lastName ?? ""
    }`.trim();

  return fullName || "—";
};

const formatLabel = (
  value?: string | null
) => {
  if (!value) {
    return "—";
  }

  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );
};

const getPaymentStatusClass = (
  status?: string | null
) => {
  switch (
    String(status ?? "")
      .toUpperCase()
  ) {
    case "PAID":
      return "payment-status-paid";

    case "PENDING":
      return "payment-status-pending";

    case "FAILED":
      return "payment-status-failed";

    case "CANCELLED":
      return "payment-status-cancelled";

    case "PARTIALLY_PAID":
      return "payment-status-partially-paid";

    case "OVERDUE":
      return "payment-status-overdue";

    default:
      return "payment-status-default";
  }
};

const getPaymentStatusIcon = (
  status?: string | null
) => {
  switch (
    String(status ?? "")
      .toUpperCase()
  ) {
    case "PAID":
      return (
        <CheckCircle2
          size={13}
        />
      );

    case "PENDING":
      return (
        <Clock3
          size={13}
        />
      );

    case "FAILED":
    case "CANCELLED":
    case "OVERDUE":
      return (
        <XCircle
          size={13}
        />
      );

    default:
      return (
        <CreditCard
          size={13}
        />
      );
  }
};

const getAgreementStatusClass = (
  status?: string | null
) => {
  switch (
    String(status ?? "")
      .toUpperCase()
  ) {
    case "ACTIVE":
    case "APPROVED":
      return "agreement-status-approved";

    case "REJECTED":
    case "TERMINATED":
    case "EXPIRED":
      return "agreement-status-rejected";

    case "PENDING_VERIFICATION":
    case "PENDING_SERVICE_FEE":
      return "agreement-status-pending";

    case "DRAFT":
    default:
      return "agreement-status-draft";
  }
};

/* =========================================================
   COMPONENT
========================================================= */

const PaymentHistory: React.FC =
  () => {
    const navigate =
      useNavigate();

    const {
      agreementId,
    } = useParams<{
      agreementId: string;
    }>();

    /* =====================================================
       MOBILE MENU
    ===================================================== */

    const [
      isMobileMenuOpen,
      setIsMobileMenuOpen,
    ] = useState(false);

    /* =====================================================
       DATA
    ===================================================== */

    const [
      agreement,
      setAgreement,
    ] =
      useState<AgreementInfo | null>(
        null
      );

    const [
      payments,
      setPayments,
    ] = useState<
      PaymentHistoryItem[]
    >([]);

    /* =====================================================
       LOADING
    ===================================================== */

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

    /* =====================================================
       CLOCK
    ===================================================== */

    const [
      currentDateTime,
      setCurrentDateTime,
    ] = useState(
      new Date()
    );

    /* =====================================================
       USER
    ===================================================== */

    const displayName =
      getDisplayName();

    const initials =
      getInitials();

    /* =====================================================
       CLOCK
    ===================================================== */

    useEffect(() => {
      const timer =
        window.setInterval(
          () => {
            setCurrentDateTime(
              new Date()
            );
          },
          1000
        );

      return () =>
        window.clearInterval(
          timer
        );
    }, []);

    /* =====================================================
       LOGOUT
    ===================================================== */

    const handleLogout =
      useCallback(() => {
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

        navigate(
          "/login",
          {
            replace: true,
          }
        );
      }, [navigate]);

    /* =====================================================
       LOAD AGREEMENT + HISTORY

       IMPORTANT:
       The frontend does NOT use createdByOfficerId.
       The backend must determine whether the agreement
       belongs to the authenticated officer's Government
       Office.
    ===================================================== */

    const loadPaymentHistory =
      useCallback(
        async () => {
          const token =
            getToken();

          if (!token) {
            handleLogout();
            return;
          }

          if (!agreementId) {
            setError(
              "Agreement ID is missing."
            );

            setLoading(false);
            return;
          }

          setLoading(true);
          setRefreshing(true);
          setError("");

          try {
            /*
             * -------------------------------------------------
             * 1. Load agreement information.
             *
             * This is NOT an ownership check based on
             * createdByOfficerId.
             *
             * The dashboard endpoint is office-scoped
             * for the authenticated Officer.
             * -------------------------------------------------
             */

            const agreementResponse =
              await fetch(
                `${API_URL}/dashboard/contracts`,
                {
                  method:
                    "GET",

                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },

                  cache:
                    "no-store",
                }
              );

            const agreementResult =
              (await agreementResponse.json()) as
                AgreementListResponse & {
                  error?: string;
                };

            if (
              agreementResponse.status ===
              401
            ) {
              handleLogout();
              return;
            }

            if (
              agreementResponse.status ===
              403
            ) {
              throw new Error(
                "You are not authorized to view agreements for this Government Office."
              );
            }

            if (
              !agreementResponse.ok ||
              !agreementResult.success
            ) {
              throw new Error(
                agreementResult.error ||
                  agreementResult.message ||
                  "Failed to load agreement information."
              );
            }

            const matchedAgreement =
              (
                agreementResult.data ??
                []
              ).find(
                (
                  item
                ) =>
                  item.agreementId ===
                  agreementId
              );

            /*
             * This protects against someone manually entering
             * another agreement ID in the URL.
             *
             * We do NOT compare createdByOfficerId.
             * Any agreement returned for the authenticated
             * officer's office is allowed.
             */

            if (!matchedAgreement) {
              throw new Error(
                "This agreement is not available in your Government Office."
              );
            }

            setAgreement(
              matchedAgreement
            );

            /*
             * -------------------------------------------------
             * 2. Load payment history.
             * -------------------------------------------------
             */

            const paymentResponse =
              await fetch(
                `${API_URL}/payments/agreement/${agreementId}`,
                {
                  method:
                    "GET",

                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },

                  cache:
                    "no-store",
                }
              );

            const paymentResult =
              (await paymentResponse.json()) as
                PaymentHistoryResponse & {
                  error?: string;
                };

            if (
              paymentResponse.status ===
              401
            ) {
              handleLogout();
              return;
            }

            if (
              paymentResponse.status ===
              403
            ) {
              throw new Error(
                "You are not authorized to view this payment history."
              );
            }

            if (
              !paymentResponse.ok ||
              !paymentResult.success
            ) {
              throw new Error(
                paymentResult.error ||
                  paymentResult.message ||
                  "Failed to load payment history."
              );
            }

            setPayments(
              paymentResult.data ??
                []
            );
          } catch (err) {
            console.error(
              "Payment history error:",
              err
            );

            setAgreement(
              null
            );

            setPayments(
              []
            );

            setError(
              err instanceof Error
                ? err.message
                : "Failed to load payment history."
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
        [
          agreementId,
          handleLogout,
        ]
      );

    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {
      void loadPaymentHistory();
    }, [
      loadPaymentHistory,
    ]);

    /* =====================================================
       PAYMENT SUMMARY
    ===================================================== */

    const totalPaid =
      useMemo(
        () =>
          payments
            .filter(
              (
                payment
              ) =>
                payment.status ===
                "PAID"
            )
            .reduce(
              (
                total,
                payment
              ) =>
                total +
                Number(
                  payment.amount ??
                    0
                ),
              0
            ),
        [payments]
      );

    const totalPending =
      useMemo(
        () =>
          payments
            .filter(
              (
                payment
              ) =>
                payment.status ===
                "PENDING"
            )
            .reduce(
              (
                total,
                payment
              ) =>
                total +
                Number(
                  payment.amount ??
                    0
                ),
              0
            ),
        [payments]
      );

    const paidCount =
      useMemo(
        () =>
          payments.filter(
            (
              payment
            ) =>
              payment.status ===
              "PAID"
          ).length,
        [payments]
      );

    const latestPayment =
      useMemo(() => {
        if (
          payments.length ===
          0
        ) {
          return null;
        }

        return [
          ...payments,
        ].sort(
          (a, b) => {
            const aDate =
              new Date(
                a.paidDate ||
                  a.createdAt ||
                  a.dueDate ||
                  0
              ).getTime();

            const bDate =
              new Date(
                b.paidDate ||
                  b.createdAt ||
                  b.dueDate ||
                  0
              ).getTime();

            return (
              bDate - aDate
            );
          }
        )[0];
      }, [payments]);

    /* =====================================================
       DISPLAY DATE / TIME
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

    return (
      <div className="officer-layout">

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside
          className={`officer-sidebar ${
            isMobileMenuOpen
              ? "officer-sidebar-open"
              : ""
          }`}
        >

          <div className="officer-sidebar-brand">

            <img
              src="/smartrent-logo.png"
              alt="SmartRent ET"
              className="officer-brand-logo"
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

          <nav className="officer-sidebar-navigation">

            {/* DASHBOARD */}

            <button
              type="button"
              className="officer-nav-item"
              onClick={() => {
                setIsMobileMenuOpen(
                  false
                );

                navigate(
                  "/officer/dashboard"
                );
              }}
            >
              <Building2
                size={19}
              />

              <span>
                Dashboard
              </span>
            </button>

            {/* RENTAL AGREEMENTS */}

            <button
              type="button"
              className="officer-nav-item"
              onClick={() => {
                setIsMobileMenuOpen(
                  false
                );

                navigate(
                  "/officer/rental-agreements"
                );
              }}
            >
              <FileText
                size={19}
              />

              <span>
                Rental Agreements
              </span>
            </button>

            {/* PAYMENT RECORDS */}

            <button
              type="button"
              className="officer-nav-item officer-nav-item-active"
              onClick={() => {
                setIsMobileMenuOpen(
                  false
                );

                navigate(
                  "/officer/payment-records"
                );
              }}
            >
              <CreditCard
                size={19}
              />

              <span>
                Payment Records
              </span>
            </button>

          </nav>

          {/* SIDEBAR BOTTOM */}

          <div className="officer-sidebar-bottom">

            <div className="officer-profile-card">

              <div className="officer-avatar">

                <User
                  size={18}
                />

              </div>

              <div className="officer-profile-details">

                <strong>
                  {displayName}
                </strong>

                <span>
                  Rental Monitoring Officer
                </span>

              </div>

            </div>

            <button
              type="button"
              className="officer-logout-button"
              onClick={
                handleLogout
              }
            >

              <LogOut
                size={18}
              />

              <span>
                Logout
              </span>

            </button>

          </div>

        </aside>

        {/* =================================================
            MOBILE OVERLAY
        ================================================= */}

        {isMobileMenuOpen && (
          <div
            className="officer-mobile-overlay"
            onClick={() =>
              setIsMobileMenuOpen(
                false
              )
            }
          />
        )}

        {/* =================================================
            MAIN
        ================================================= */}

        <div className="officer-main">

          {/* TOP BAR */}

          <header className="officer-topbar">

            <div className="officer-topbar-left">

              <button
                type="button"
                className="officer-mobile-menu-button"
                onClick={() =>
                  setIsMobileMenuOpen(
                    true
                  )
                }
                aria-label="Open menu"
              >
                <Menu
                  size={21}
                />
              </button>

              <div className="officer-search">

                <Search
                  size={18}
                />

                <input
                  type="search"
                  placeholder="Search payment history..."
                  readOnly
                />

              </div>

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
              PAGE CONTENT
          ================================================= */}

          <main className="officer-page-content">

            {/* PAGE HEADER */}

            <div className="agreements-page-header">

              <div className="agreements-page-title">

                <button
                  type="button"
                  className="agreements-back-button"
                  onClick={() =>
                    navigate(
                      "/officer/payment-records"
                    )
                  }
                  aria-label="Back to payment records"
                >
                  <ArrowLeft
                    size={18}
                  />
                </button>

                <div>

                  <span className="officer-eyebrow">
                    PAYMENT MANAGEMENT
                  </span>

                  <h1>
                    Payment History
                  </h1>

                  <p>
                    Review all rent payment
                    transactions recorded for this
                    rental agreement.
                  </p>

                </div>

              </div>

              <div className="agreements-header-actions">

                <button
                  type="button"
                  className="agreement-secondary-button"
                  onClick={() =>
                    void loadPaymentHistory()
                  }
                  disabled={
                    refreshing
                  }
                >

                  <RefreshCw
                    size={16}
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

            </div>

            {/* ERROR */}

            {error && (

              <div
                className="alert alert-error"
                role="alert"
              >

                {error}

                <button
                  type="button"
                  onClick={() =>
                    void loadPaymentHistory()
                  }
                  style={{
                    marginLeft:
                      "12px",
                  }}
                >
                  Try again
                </button>

              </div>

            )}

            {/* AGREEMENT INFORMATION */}

            {agreement && (

              <section className="agreements-table-card payment-history-agreement-card">

                <div className="agreements-table-header">

                  <div>

                    <span className="officer-eyebrow">
                      RENTAL AGREEMENT
                    </span>

                    <h2>
                      {
                        agreement.referenceNumber
                      }
                    </h2>

                    <p>
                      Payment history for this
                      agreement.
                    </p>

                  </div>

                  <span
                    className={`agreement-status-badge ${getAgreementStatusClass(
                      agreement.status
                    )}`}
                  >

                    {formatLabel(
                      agreement.status
                    )}

                  </span>

                </div>

                <div className="payment-history-agreement-grid">

                  <div>

                    <span>
                      Tenant
                    </span>

                    <strong>
                      {getPersonName(
                        agreement
                          .tenant
                          ?.user
                          ?.firstName,
                        agreement
                          .tenant
                          ?.user
                          ?.lastName
                      )}
                    </strong>

                    <small>
                      {
                        agreement
                          .tenant
                          ?.user
                          ?.phone
                      ||
                        "Phone not available"
                      }
                    </small>

                  </div>

                  <div>

                    <span>
                      Landlord
                    </span>

                    <strong>
                      {getPersonName(
                        agreement
                          .landlord
                          ?.user
                          ?.firstName,
                        agreement
                          .landlord
                          ?.user
                          ?.lastName
                      )}
                    </strong>

                    <small>
                      {
                        agreement
                          .landlord
                          ?.user
                          ?.phone
                      ||
                        "Phone not available"
                      }
                    </small>

                  </div>

                  <div>

                    <span>
                      Rental Amount
                    </span>

                    <strong>
                      {formatMoney(
                        agreement.rentalAmount
                      )}{" "}
                      ETB
                    </strong>

                  </div>

                  <div>

                    <span>
                      Property
                    </span>

                    <strong>
                      {agreement
                        .unit
                        ?.unitNumber
                        ? `Unit ${agreement.unit.unitNumber}`
                        : "Rental Property"}
                    </strong>

                    <small>
                      {[
                        agreement
                          .unit
                          ?.property
                          ?.location,

                        agreement
                          .unit
                          ?.property
                          ?.subCity,

                        agreement
                          .unit
                          ?.property
                          ?.woreda
                          ? `Woreda ${agreement.unit.property.woreda}`
                          : "",
                      ]
                        .filter(Boolean)
                        .join(", ") ||
                        "Location not available"}
                    </small>

                  </div>

                  <div>

                    <span>
                      Effective Date
                    </span>

                    <strong>
                      {formatDate(
                        agreement.effectiveDate
                      )}
                    </strong>

                  </div>

                  <div>

                    <span>
                      Termination Date
                    </span>

                    <strong>
                      {formatDate(
                        agreement.terminationDate
                      )}
                    </strong>

                  </div>

                </div>

              </section>

            )}

            {/* SUMMARY */}

            <div className="payment-history-summary-grid">

              <div className="payment-history-summary-card">

                <div className="payment-history-summary-icon">

                  <CreditCard
                    size={21}
                  />

                </div>

                <div>

                  <span>
                    Total Payments
                  </span>

                  <strong>
                    {loading
                      ? "—"
                      : payments.length}
                  </strong>

                  <small>
                    Recorded transactions
                  </small>

                </div>

              </div>

              <div className="payment-history-summary-card">

                <div className="payment-history-summary-icon">

                  <CheckCircle2
                    size={21}
                  />

                </div>

                <div>

                  <span>
                    Total Paid
                  </span>

                  <strong>
                    {loading
                      ? "—"
                      : `${formatMoney(
                          totalPaid
                        )} ETB`}
                  </strong>

                  <small>
                    {paidCount} successful{" "}
                    {paidCount ===
                    1
                      ? "payment"
                      : "payments"}
                  </small>

                </div>

              </div>

              <div className="payment-history-summary-card">

                <div className="payment-history-summary-icon">

                  <Clock3
                    size={21}
                  />

                </div>

                <div>

                  <span>
                    Pending Amount
                  </span>

                  <strong>
                    {loading
                      ? "—"
                      : `${formatMoney(
                          totalPending
                        )} ETB`}
                  </strong>

                  <small>
                    Awaiting confirmation
                  </small>

                </div>

              </div>

            </div>

            {/* PAYMENT HISTORY TABLE */}

            <section className="agreements-table-card payment-history-table-card">

              <div className="agreements-table-header">

                <div>

                  <span className="officer-eyebrow">
                    TRANSACTION HISTORY
                  </span>

                  <h2>
                    Payment History
                  </h2>

                  <p>
                    Every payment transaction
                    recorded against this agreement.
                  </p>

                </div>

                {latestPayment && (

                  <div className="payment-history-latest">

                    <span>
                      Latest Payment
                    </span>

                    <strong>
                      {formatMoney(
                        latestPayment.amount
                      )}{" "}
                      ETB
                    </strong>

                    <small>
                      {formatDate(
                        latestPayment.paidDate ||
                          latestPayment.createdAt ||
                          latestPayment.dueDate
                      )}
                    </small>

                  </div>

                )}

              </div>

              <div className="agreements-table-wrapper">

                <table className="agreements-table payment-history-table">

                  <thead>

                    <tr>

                      <th>
                        Due Date
                      </th>

                      <th>
                        Paid Date
                      </th>

                      <th>
                        Amount
                      </th>

                      <th>
                        Method
                      </th>

                      <th>
                        Provider
                      </th>

                      <th>
                        Transaction Reference
                      </th>

                      <th>
                        Status
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {loading ? (

                      <tr>

                        <td
                          colSpan={7}
                          className="agreements-empty-cell"
                        >

                          <div className="agreements-empty-state">

                            <div className="agreements-empty-icon">

                              <RefreshCw
                                size={27}
                                className="refresh-spinning"
                              />

                            </div>

                            <h3>
                              Loading payment history
                            </h3>

                            <p>
                              Retrieving payment
                              transactions for this
                              agreement.
                            </p>

                          </div>

                        </td>

                      </tr>

                    ) : payments.length >
                      0 ? (

                      payments.map(
                        (
                          payment
                        ) => (

                          <tr
                            key={
                              payment.paymentId
                            }
                          >

                            {/* DUE DATE */}

                            <td>

                              <div className="payment-history-date-cell">

                                <strong>
                                  {formatDate(
                                    payment.dueDate
                                  )}
                                </strong>

                                <small>
                                  Due
                                </small>

                              </div>

                            </td>

                            {/* PAID DATE */}

                            <td>

                              <div className="payment-history-date-cell">

                                <strong>
                                  {formatDate(
                                    payment.paidDate
                                  )}
                                </strong>

                                {payment.paidDate && (

                                  <small>
                                    {formatDateTime(
                                      payment.paidDate
                                    )}
                                  </small>

                                )}

                              </div>

                            </td>

                            {/* AMOUNT */}

                            <td>

                              <strong className="agreement-rent">

                                {formatMoney(
                                  payment.amount
                                )}{" "}
                                ETB

                              </strong>

                            </td>

                            {/* METHOD */}

                            <td>
                              {formatLabel(
                                payment.method
                              )}
                            </td>

                            {/* PROVIDER */}

                            <td>
                              {formatLabel(
                                payment.provider
                              )}
                            </td>

                            {/* TRANSACTION */}

                            <td>

                              <div className="payment-history-transaction-cell">

                                <strong>
                                  {
                                    payment.transactionReference ||
                                    "—"
                                  }
                                </strong>

                                <small>
                                  Payment ID:{" "}
                                  {
                                    payment.paymentId
                                  }
                                </small>

                              </div>

                            </td>

                            {/* STATUS */}

                            <td>

                              <span
                                className={`payment-status-badge ${getPaymentStatusClass(
                                  payment.status
                                )}`}
                              >

                                {getPaymentStatusIcon(
                                  payment.status
                                )}

                                {formatLabel(
                                  payment.status
                                )}

                              </span>

                            </td>

                          </tr>

                        )
                      )

                    ) : (

                      <tr>

                        <td
                          colSpan={7}
                          className="agreements-empty-cell"
                        >

                          <div className="agreements-empty-state">

                            <div className="agreements-empty-icon">

                              <CreditCard
                                size={27}
                              />

                            </div>

                            <h3>
                              No payment history
                            </h3>

                            <p>
                              No payment transactions
                              have been recorded for
                              this agreement yet.
                            </p>

                          </div>

                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>

              {/* FOOTER */}

              <div className="payment-history-footer">

                <span>
                  <strong>
                    {payments.length}
                  </strong>{" "}
                  {payments.length ===
                  1
                    ? "payment"
                    : "payments"}{" "}
                  recorded

                </span>

                <button
                  type="button"
                  className="agreement-secondary-button"
                  onClick={() =>
                    navigate(
                      "/officer/payment-records"
                    )
                  }
                >

                  <ArrowLeft
                    size={15}
                  />

                  Back to Payment Records

                </button>

              </div>

            </section>

          </main>

        </div>

      </div>
    );
  };

export default PaymentHistory;