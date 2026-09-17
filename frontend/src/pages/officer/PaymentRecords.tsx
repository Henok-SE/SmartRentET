import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
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
  X,
  XCircle,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type AgreementStatus = string;

type BackendAgreement = {
  agreementId: string;
  referenceNumber: string;

  status: AgreementStatus;

  rentalAmount?: number | string | null;

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

  payments?: Array<{
    paymentId?: string;
    amount?: number | string | null;
    status?: string | null;
    dueDate?: string | null;
    paidDate?: string | null;
    createdAt?: string | null;
  }>;
};

type ContractsResponse = {
  success: boolean;
  message?: string;
  error?: string;
  data: BackendAgreement[];
};

type PaymentAgreement = {
  agreementId: string;
  referenceNumber: string;

  tenantName: string;
  tenantPhone: string;

  rentalAmount: number;

  agreementStatus: string;

  paymentCount: number;

  paidCount: number;
  pendingCount: number;

  totalPaid: number;

  latestPayment: {
    amount?: number | string | null;
    status?: string | null;
    dueDate?: string | null;
    paidDate?: string | null;
  } | null;
};

/* =========================================================
   API
========================================================= */

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

/* =========================================================
   HELPERS
========================================================= */

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  sessionStorage.getItem("token") ||
  sessionStorage.getItem("accessToken") ||
  "";

const clearSession = () => {
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
};

const getUser = () => {
  try {
    const stored =
      localStorage.getItem(
        "user"
      );

    if (!stored) {
      return null;
    }

    return JSON.parse(
      stored
    ) as {
      firstName?: string;
      lastName?: string;
      username?: string;
    };
  } catch {
    return null;
  }
};

const getDisplayName = () => {
  const user =
    getUser();

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
  const user =
    getUser();

  if (!user) {
    return "O";
  }

  const first =
    user.firstName?.charAt(0) ??
    "";

  const last =
    user.lastName?.charAt(0) ??
    "";

  const initials =
    `${first}${last}`.trim();

  if (initials) {
    return initials.toUpperCase();
  }

  return (
    user.username
      ?.slice(0, 2)
      .toUpperCase() ||
    "O"
  );
};

const getPersonName = (
  firstName?: string | null,
  lastName?: string | null
) => {
  const name =
    `${firstName ?? ""} ${
      lastName ?? ""
    }`.trim();

  return name || "—";
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

/* =========================================================
   COMPONENT
========================================================= */

const PaymentRecords: React.FC =
  () => {
    const navigate =
      useNavigate();

    /* =====================================================
       MOBILE
    ===================================================== */

    const [
      isMobileMenuOpen,
      setIsMobileMenuOpen,
    ] = useState(false);

    /* =====================================================
       AGREEMENTS
    ===================================================== */

    const [
      agreements,
      setAgreements,
    ] = useState<
      BackendAgreement[]
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
       SEARCH
    ===================================================== */

    const [
      searchQuery,
      setSearchQuery,
    ] = useState("");

    const [
      statusFilter,
      setStatusFilter,
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
       LIVE CLOCK
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
        clearSession();

        navigate(
          "/login",
          {
            replace: true,
          }
        );
      }, [navigate]);

    /* =====================================================
       LOAD AGREEMENTS

       IMPORTANT:
       This endpoint is the source for the list.

       It is already office-scoped for the Officer.
       Therefore every agreement belonging to the
       officer's Government Office is shown here,
       whether or not a Payment record exists.

       createdByOfficerId is NOT used for filtering.
    ===================================================== */

    const loadAgreements =
      useCallback(
        async (
          showLoader = true
        ) => {
          const token =
            getToken();

          if (!token) {
            handleLogout();
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

            const result =
              (await response.json()) as
                ContractsResponse;

            if (
              response.status ===
              401
            ) {
              handleLogout();
              return;
            }

            if (
              response.status ===
              403
            ) {
              throw new Error(
                "You are not authorized to view agreements for this Government Office."
              );
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
              result.data ??
                []
            );
          } catch (err) {
            console.error(
              "Payment records agreement load error:",
              err
            );

            setAgreements([]);

            setError(
              err instanceof Error
                ? err.message
                : "Failed to load agreements for payment records."
            );
          } finally {
            setLoading(false);
            setRefreshing(false);
          }
        },
        [handleLogout]
      );

    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {
      void loadAgreements(
        true
      );
    }, [loadAgreements]);

    /* =====================================================
       MAP AGREEMENTS

       Every agreement is retained, even when:
       payments = []
    ===================================================== */

    const paymentAgreements =
      useMemo<
        PaymentAgreement[]
      >(() => {
        return agreements.map(
          (
            agreement
          ) => {
            const payments =
              agreement.payments ??
              [];

            const sortedPayments =
              [
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
                    bDate -
                    aDate
                  );
                }
              );

            const latestPayment =
              sortedPayments[0] ??
              null;

            const paidCount =
              payments.filter(
                (
                  payment
                ) =>
                  payment.status
                    ?.toUpperCase() ===
                  "PAID"
              ).length;

            const pendingCount =
              payments.filter(
                (
                  payment
                ) =>
                  payment.status
                    ?.toUpperCase() ===
                  "PENDING"
              ).length;

            const totalPaid =
              payments
                .filter(
                  (
                    payment
                  ) =>
                    payment.status
                      ?.toUpperCase() ===
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
                );

            const tenant =
              agreement
                .tenant
                ?.user;

            return {
              agreementId:
                agreement.agreementId,

              referenceNumber:
                agreement.referenceNumber ||
                "—",

              tenantName:
                getPersonName(
                  tenant?.firstName,
                  tenant?.lastName
                ),

              tenantPhone:
                tenant?.phone ||
                "",

              rentalAmount:
                Number(
                  agreement.rentalAmount ??
                    0
                ),

              agreementStatus:
                agreement.status ||
                "—",

              paymentCount:
                payments.length,

              paidCount,

              pendingCount,

              totalPaid,

              latestPayment,
            };
          }
        );
      }, [agreements]);

    /* =====================================================
       FILTER
    ===================================================== */

    const filteredRecords =
      useMemo(() => {
        const query =
          searchQuery
            .trim()
            .toLowerCase();

        return paymentAgreements.filter(
          (
            record
          ) => {
            const matchesSearch =
              !query ||
              record.referenceNumber
                .toLowerCase()
                .includes(query) ||
              record.tenantName
                .toLowerCase()
                .includes(query) ||
              record.tenantPhone
                .toLowerCase()
                .includes(query);

            /*
             * Status filtering:
             *
             * If an agreement has payments,
             * filter by latest payment status.
             *
             * If it has no payments, it remains
             * visible when "All Payment Statuses"
             * is selected.
             */
            const matchesStatus =
              !statusFilter
                ? true
                : record.latestPayment
                    ?.status
                    ?.toUpperCase() ===
                  statusFilter;

            return (
              matchesSearch &&
              matchesStatus
            );
          }
        );
      }, [
        paymentAgreements,
        searchQuery,
        statusFilter,
      ]);

    /* =====================================================
       SUMMARY
    ===================================================== */

    const totalAgreements =
      paymentAgreements.length;

    const agreementsWithPayments =
      paymentAgreements.filter(
        (
          record
        ) =>
          record.paymentCount >
          0
      ).length;

    const agreementsWithoutPayments =
      paymentAgreements.filter(
        (
          record
        ) =>
          record.paymentCount ===
          0
      ).length;

    
    /* =====================================================
       DATE / TIME
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
       CLEAR FILTERS
    ===================================================== */

    const clearFilters =
      () => {
        setSearchQuery("");
        setStatusFilter("");
      };

    const hasFilters =
      Boolean(
        searchQuery ||
        statusFilter
      );

    /* =====================================================
       OPEN PAYMENT HISTORY
    ===================================================== */

    const openPaymentHistory =
      (
        agreementId: string
      ) => {
        navigate(
          `/officer/payment-records/${agreementId}`
        );
      };

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

          {/* =================================================
              TOP BAR
          ================================================= */}

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
                  placeholder="Search payment agreements..."
                  value={
                    searchQuery
                  }
                  onChange={(
                    event
                  ) => {
                    setSearchQuery(
                      event.target.value
                    );
                  }}
                  aria-label="Search payment agreements"
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
              CONTENT
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
                      "/officer/dashboard"
                    )
                  }
                  aria-label="Back to dashboard"
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
                    Payment Records
                  </h1>

                  <p>
                    View payment history for every
                    rental agreement registered within
                    your Government Office.
                  </p>

                </div>

              </div>

              <div className="agreements-header-actions">

                <button
                  type="button"
                  className="agreement-secondary-button"
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
                    void loadAgreements(
                      true
                    )
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

            {/* =================================================
                SUMMARY
            ================================================= */}

            <div className="payment-agreement-summary-grid">

              {/* ALL AGREEMENTS */}

              <div className="payment-agreement-summary-card">

                <div className="payment-agreement-summary-icon">

                  <FileText
                    size={21}
                  />

                </div>

                <div>

                  <span>
                    Office Agreements
                  </span>

                  <strong>
                    {loading
                      ? "—"
                      : totalAgreements}
                  </strong>

                  <small>
                    All agreements in your Government
                    Office
                  </small>

                </div>

              </div>

              {/* WITH PAYMENTS */}

              <div className="payment-agreement-summary-card">

                <div className="payment-agreement-summary-icon">

                  <CreditCard
                    size={21}
                  />

                </div>

                <div>

                  <span>
                    With Payment Records
                  </span>

                  <strong>
                    {loading
                      ? "—"
                      : agreementsWithPayments}
                  </strong>

                  <small>
                    Agreements with recorded payments
                  </small>

                </div>

              </div>

              {/* WITHOUT PAYMENTS */}

              <div className="payment-agreement-summary-card">

                <div className="payment-agreement-summary-icon">

                  <Clock3
                    size={21}
                  />

                </div>

                <div>

                  <span>
                    No Payments Yet
                  </span>

                  <strong>
                    {loading
                      ? "—"
                      : agreementsWithoutPayments}
                  </strong>

                  <small>
                    Agreements awaiting their first
                    payment
                  </small>

                </div>

              </div>

            </div>

            {/* =================================================
                SEARCH / FILTER
            ================================================= */}

            <section
              className="agreements-table-card payment-records-filter-card"
            >

              <div className="agreements-table-header">

                <div>

                  <span className="officer-eyebrow">
                    PAYMENT SEARCH
                  </span>

                  <h2>
                    Find Agreement
                  </h2>

                  <p>
                    Search the agreements in your
                    Government Office and open their
                    payment history.
                  </p>

                </div>

                <div className="agreements-count">

                  {filteredRecords.length}{" "}

                  {filteredRecords.length ===
                  1
                    ? "Agreement"
                    : "Agreements"}

                </div>

              </div>

              <div className="payment-records-filter-row">

                {/* SEARCH */}

                <div className="payment-records-search-input">

                  <Search
                    size={17}
                  />

                  <input
                    type="search"
                    placeholder="Search reference number, tenant, or phone..."
                    value={
                      searchQuery
                    }
                    onChange={(
                      event
                    ) =>
                      setSearchQuery(
                        event.target.value
                      )
                    }
                  />

                </div>

                {/* STATUS */}

                <select
                  className="payment-records-status-filter"
                  value={
                    statusFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                  aria-label="Filter latest payment status"
                >

                  <option value="">
                    All Payment Statuses
                  </option>

                  <option value="PENDING">
                    Pending
                  </option>

                  <option value="PAID">
                    Paid
                  </option>

                  <option value="PARTIALLY_PAID">
                    Partially Paid
                  </option>

                  <option value="OVERDUE">
                    Overdue
                  </option>

                  <option value="FAILED">
                    Failed
                  </option>

                  <option value="CANCELLED">
                    Cancelled
                  </option>

                </select>

                {hasFilters && (

                  <button
                    type="button"
                    className="payment-clear-button"
                    onClick={
                      clearFilters
                    }
                  >

                    <X
                      size={15}
                    />

                    Clear

                  </button>

                )}

              </div>

            </section>

            {/* =================================================
                AGREEMENT LIST
            ================================================= */}

            <section className="agreements-table-card payment-records-list-card">

              <div className="agreements-table-header">

                <div>

                  <span className="officer-eyebrow">
                    RENTAL PAYMENT RECORDS
                  </span>

                  <h2>
                    Government Office Agreements
                  </h2>

                  <p>
                    Every rental agreement in your
                    Government Office is listed,
                    including agreements with no
                    payments yet.
                  </p>

                </div>

                <div className="agreements-count">

                  {paymentAgreements.length}{" "}

                  {paymentAgreements.length ===
                  1
                    ? "Agreement"
                    : "Agreements"}

                </div>

              </div>

              <div className="agreements-table-wrapper">

                <table className="agreements-table payment-agreement-table">

                  <thead>

                    <tr>

                      <th>
                        Agreement Reference
                      </th>

                      <th>
                        Tenant
                      </th>

                      <th>
                        Rental Amount
                      </th>

                      <th>
                        Payment Records
                      </th>

                      <th>
                        Latest Payment
                      </th>

                      <th>
                        Status
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {/* LOADING */}

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
                              Loading agreements
                            </h3>

                            <p>
                              Retrieving agreements
                              registered in your
                              Government Office.
                            </p>

                          </div>

                        </td>

                      </tr>

                    ) : filteredRecords.length >
                      0 ? (

                      filteredRecords.map(
                        (
                          record
                        ) => {

                          const latest =
                            record.latestPayment;

                          return (

                            <tr
                              key={
                                record.agreementId
                              }
                            >

                              {/* REFERENCE */}

                              <td>

                                <button
                                  type="button"
                                  className="payment-agreement-reference-button"
                                  onClick={() =>
                                    openPaymentHistory(
                                      record.agreementId
                                    )
                                  }
                                >

                                  {
                                    record.referenceNumber
                                  }

                                </button>

                                <small
                                  style={{
                                    display:
                                      "block",
                                    marginTop:
                                      "5px",
                                    color:
                                      "#7b8a91",
                                  }}
                                >

                                  Agreement status:{" "}

                                  {formatLabel(
                                    record.agreementStatus
                                  )}

                                </small>

                              </td>

                              {/* TENANT */}

                              <td>

                                <strong>
                                  {
                                    record.tenantName
                                  }
                                </strong>

                                {record.tenantPhone && (

                                  <small
                                    style={{
                                      display:
                                        "block",
                                      marginTop:
                                        "5px",
                                      color:
                                        "#7b8a91",
                                    }}
                                  >

                                    {
                                      record.tenantPhone
                                    }

                                  </small>

                                )}

                              </td>

                              {/* RENT */}

                              <td>

                                <span className="agreement-rent">

                                  {
                                    formatMoney(
                                      record.rentalAmount
                                    )
                                  }{" "}
                                  ETB

                                </span>

                              </td>

                              {/* COUNT */}

                              <td>

                                {record.paymentCount >
                                0 ? (

                                  <div className="payment-count-cell">

                                    <strong>
                                      {
                                        record.paymentCount
                                      }
                                    </strong>

                                    <small>

                                      {record.paymentCount ===
                                      1
                                        ? "payment"
                                        : "payments"}

                                    </small>

                                  </div>

                                ) : (

                                  <span className="payment-status-badge payment-status-default">

                                    No Payments

                                  </span>

                                )}

                              </td>

                              {/* LATEST PAYMENT */}

                              <td>

                                {latest ? (

                                  <div className="payment-latest-cell">

                                    <strong>

                                      {formatMoney(
                                        latest.amount
                                      )}{" "}
                                      ETB

                                    </strong>

                                    <small>

                                      {formatDate(
                                        latest.paidDate ||
                                          latest.dueDate
                                      )}

                                    </small>

                                  </div>

                                ) : (

                                  <span
                                    style={{
                                      color:
                                        "#89969b",
                                      fontSize:
                                        "12px",
                                    }}
                                  >
                                    No payment recorded
                                  </span>

                                )}

                              </td>

                              {/* STATUS */}

                              <td>

                                {latest ? (

                                  <span
                                    className={`payment-status-badge ${getPaymentStatusClass(
                                      latest.status
                                    )}`}
                                  >

                                    {
                                      getPaymentStatusIcon(
                                        latest.status
                                      )
                                    }

                                    {
                                      formatLabel(
                                        latest.status
                                      )
                                    }

                                  </span>

                                ) : (

                                  <span
                                    className={`agreement-status-badge ${getAgreementStatusClass(
                                      record.agreementStatus
                                    )}`}
                                  >

                                    No Payment

                                  </span>

                                )}

                              </td>

                              {/* ACTION */}

                              <td>

                                <button
                                  type="button"
                                  className="agreement-view-button"
                                  onClick={() =>
                                    openPaymentHistory(
                                      record.agreementId
                                    )
                                  }
                                >

                                  <CreditCard
                                    size={16}
                                  />

                                  View History

                                </button>

                              </td>

                            </tr>

                          );
                        }
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
                              No agreements found
                            </h3>

                            <p>

                              {hasFilters
                                ? "No Government Office agreement matches the selected search or payment status."
                                : "There are no rental agreements available for your Government Office."}

                            </p>

                            {hasFilters && (

                              <button
                                type="button"
                                className="agreement-secondary-button"
                                onClick={
                                  clearFilters
                                }
                              >

                                <X
                                  size={15}
                                />

                                Clear Filters

                              </button>

                            )}

                          </div>

                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>

            </section>

          </main>

        </div>

      </div>
    );
  };

export default PaymentRecords;