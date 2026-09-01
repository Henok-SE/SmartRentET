import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LogoutButton from "../../components/LogoutButton";
import { apiRequest } from "../../services/api";
import "../../App.css";

/* =========================================================
   TYPES
========================================================= */

type AgreementStatus =
  | "DRAFT"
  | "PENDING_VERIFICATION"
  | "PENDING_SERVICE_FEE"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "TERMINATED"
  | "EXPIRED";

type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "PARTIALLY_PAID"
  | "OVERDUE"
  | "FAILED"
  | "CANCELLED";

type ServiceFeeStatus =
  | "PENDING"
  | "INITIATED"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

type AgreementPayment = {
  paymentId: string;
  amount: number | string;
  status: PaymentStatus;
  dueDate: string;
  paidDate?: string | null;
};

type Agreement = {
  agreementId: string;
  referenceNumber: string;
  status: AgreementStatus;

  durationValue: number;
  durationUnit: "MONTH" | "YEAR";

  rentalAmount: number | string;

  effectiveDate: string;
  terminationDate?: string | null;
  createdAt: string;

  landlord: {
    landlordId: string;
    user: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };

  tenant: {
    tenantId: string;
    user: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };

  unit: {
    unitId: string;
    unitNumber: string;
    property: {
      location: string;
      subCity: string;
      woreda: string;
    };
  };

  office: {
    officeId: string;
    officeCode: string;
    officeName: string;
  };

  createdByOfficer: {
    officerId: string;
    employeeId: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };

  serviceFeePayment?: {
    serviceFeePaymentId: string;
    status: ServiceFeeStatus;
  } | null;

  payments: AgreementPayment[];
};

type ContractsResponse = {
  success: boolean;
  message?: string;
  filters?: {
    referenceNumber?: string;
    status?: string;
    subCity?: string;
    landlord?: string;
    tenant?: string;
    officeId?: string | null;
  };
  data: Agreement[];
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

/* =========================================================
   HELPERS
========================================================= */

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

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

function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCurrency(
  value?: number | string | null
) {
  if (value === null || value === undefined) {
    return "—";
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return String(value);
  }

  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} ETB`;
}

function getPartyName(
  party:
    | {
        user?: {
          firstName?: string;
          lastName?: string;
        };
      }
    | null
    | undefined
) {
  const firstName =
    party?.user?.firstName ?? "";

  const lastName =
    party?.user?.lastName ?? "";

  const name =
    `${firstName} ${lastName}`.trim();

  return name || "—";
}

function getAgreementStatusClass(
  status: AgreementStatus
) {
  switch (status) {
    case "ACTIVE":
    case "APPROVED":
      return "agreement-status-active";

    case "PENDING_VERIFICATION":
    case "PENDING_SERVICE_FEE":
      return "agreement-status-pending";

    case "REJECTED":
    case "TERMINATED":
    case "EXPIRED":
      return "agreement-status-danger";

    case "DRAFT":
    default:
      return "agreement-status-draft";
  }
}

function getServiceFeeClass(
  status?: ServiceFeeStatus | null
) {
  switch (status) {
    case "PAID":
      return "agreement-status-active";

    case "PENDING":
    case "INITIATED":
      return "agreement-status-pending";

    case "FAILED":
    case "EXPIRED":
    case "CANCELLED":
      return "agreement-status-danger";

    default:
      return "agreement-status-draft";
  }
}

function getPaymentStatusClass(
  status: PaymentStatus
) {
  switch (status) {
    case "PAID":
      return "agreement-status-active";

    case "PENDING":
    case "PARTIALLY_PAID":
      return "agreement-status-pending";

    case "OVERDUE":
    case "FAILED":
    case "CANCELLED":
      return "agreement-status-danger";

    default:
      return "agreement-status-draft";
  }
}

/* =========================================================
   COMPONENT
========================================================= */

function AdminAgreements() {
  const navigate = useNavigate();
  const location = useLocation();

  const [agreements, setAgreements] =
    useState<Agreement[]>([]);

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

  const [statusFilter, setStatusFilter] =
    useState("");

  const [selectedAgreement, setSelectedAgreement] =
    useState<Agreement | null>(null);

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
     AUTH HEADERS
  ======================================================= */

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

  /* =======================================================
     LIVE CLOCK
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
     LOAD OFFICE DETAILS
  ======================================================= */

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
        !currentAdmin.office?.officeId
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
          .officeCode ||
          ""
      );
    };

  /* =======================================================
     LOAD AGREEMENTS

     NOTE:
     No officeId is sent here.
     The existing backend handles Office Admin
     scoping for /dashboard/contracts.
  ======================================================= */

  const loadAgreements =
    async () => {
      const response =
        await apiRequest<ContractsResponse>(
          "/dashboard/contracts",
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
            "Failed to retrieve Rental Agreements."
        );
      }

      setAgreements(
        response.data ?? []
      );
    };

  /* =======================================================
     LOAD PAGE
  ======================================================= */

  const loadPage =
    async () => {
      setLoading(true);
      setError("");

      try {
        await Promise.all([
          loadOfficeDetails(),
          loadAgreements(),
        ]);
      } catch (err) {
        console.error(
          "Admin Agreements error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to retrieve Rental Agreements."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (
      user.userId !== undefined
    ) {
      void loadPage();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.userId]);

  /* =======================================================
     FILTER AGREEMENTS
  ======================================================= */

  const filteredAgreements =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return agreements.filter(
        (agreement) => {
          if (
            statusFilter &&
            agreement.status !==
              statusFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const searchableValues = [
            agreement.referenceNumber,
            agreement.status,

            agreement.landlord?.user
              ?.firstName,

            agreement.landlord?.user
              ?.lastName,

            agreement.landlord?.user
              ?.phone,

            agreement.tenant?.user
              ?.firstName,

            agreement.tenant?.user
              ?.lastName,

            agreement.tenant?.user
              ?.phone,

            agreement.unit?.unitNumber,

            agreement.unit?.property
              ?.location,

            agreement.unit?.property
              ?.subCity,

            agreement.unit?.property
              ?.woreda,

            agreement.createdByOfficer
              ?.employeeId,

            agreement.createdByOfficer
              ?.user?.firstName,

            agreement.createdByOfficer
              ?.user?.lastName,

            agreement.office?.officeCode,

            agreement.office?.officeName,
          ];

          return searchableValues
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(query)
            );
        }
      );
    }, [
      agreements,
      search,
      statusFilter,
    ]);

  /* =======================================================
     COUNTS
  ======================================================= */

  const totalAgreements =
    agreements.length;

  const activeCount =
    agreements.filter(
      (agreement) =>
        agreement.status ===
        "ACTIVE"
    ).length;

  const pendingCount =
    agreements.filter(
      (agreement) =>
        agreement.status ===
          "PENDING_VERIFICATION" ||
        agreement.status ===
          "PENDING_SERVICE_FEE"
    ).length;

  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="office-admin-page">

      {/* =================================================
          SIDEBAR
      ================================================= */}

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

          <div
            style={{
              marginTop:
                "14px",
            }}
          >
            <LogoutButton />
          </div>

        </div>

      </aside>

      {/* =================================================
          MAIN
      ================================================= */}

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
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search agreements..."
              aria-label="Search agreements"
            />

          </div>

          <div
            className="office-admin-user"
            style={{
              gap:
                "16px",
            }}
          >

            <div
              style={{
                display:
                  "flex",
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
                  fontWeight:
                    700,
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
                  RENTAL AGREEMENTS
                </span>

                <h1>
                  Agreements
                </h1>

                <p>
                  Review rental agreements handled
                  by your Government Office.
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
                STATISTICS
            ================================================= */}

            <div className="office-admin-stats">

              <article className="office-admin-stat-card">

                <div className="office-admin-stat-icon">
                  □
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
                    Agreements for your office
                  </small>
                </div>

              </article>

              <article className="office-admin-stat-card">

                <div className="office-admin-stat-icon">
                  ✓
                </div>

                <div>
                  <span>
                    Active Agreements
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
                    Pending Agreements
                  </span>

                  <strong>
                    {loading
                      ? "—"
                      : pendingCount}
                  </strong>

                  <small>
                    Awaiting verification or fee
                  </small>
                </div>

              </article>

            </div>

            {/* =================================================
                FILTERS
            ================================================= */}

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
                    AGREEMENT FILTERS
                  </span>

                  <h2>
                    Search & Filter
                  </h2>

                  <p>
                    Search by reference, landlord,
                    tenant, property, or status.
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

                  <label htmlFor="agreement-search">
                    Search
                  </label>

                  <input
                    id="agreement-search"
                    type="text"
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
                    placeholder="Reference, landlord, tenant, property..."
                  />

                </div>

                <div className="form-group">

                  <label htmlFor="agreement-status">
                    Status
                  </label>

                  <select
                    id="agreement-status"
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
                  >

                    <option value="">
                      All statuses
                    </option>

                    <option value="DRAFT">
                      Draft
                    </option>

                    <option value="PENDING_VERIFICATION">
                      Pending Verification
                    </option>

                    <option value="PENDING_SERVICE_FEE">
                      Pending Service Fee
                    </option>

                    <option value="APPROVED">
                      Approved
                    </option>

                    <option value="ACTIVE">
                      Active
                    </option>

                    <option value="REJECTED">
                      Rejected
                    </option>

                    <option value="TERMINATED">
                      Terminated
                    </option>

                    <option value="EXPIRED">
                      Expired
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

            {/* =================================================
                AGREEMENTS TABLE
            ================================================= */}

            <section className="office-admin-table-card">

              <div className="office-admin-table-header">

                <div>

                  <span className="office-admin-eyebrow">
                    AGREEMENT OVERVIEW
                  </span>

                  <h2>
                    Rental Agreements
                  </h2>

                  <p>
                    {filteredAgreements.length}{" "}
                    agreement
                    {filteredAgreements.length ===
                    1
                      ? ""
                      : "s"}{" "}
                    shown.
                  </p>

                </div>

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
                    Loading agreements...
                  </h3>

                  <p>
                    Retrieving rental agreements.
                  </p>

                </div>

              ) : filteredAgreements.length ===
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
                        "70px",
                      height:
                        "70px",
                      margin:
                        "0 auto 18px",
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
                        "28px",
                    }}
                  >
                    □
                  </div>

                  <h3>
                    {search ||
                    statusFilter
                      ? "No agreements found"
                      : "No agreements yet"}
                  </h3>

                  <p>
                    {search ||
                    statusFilter
                      ? "No agreements match the selected filters."
                      : "Rental agreements for your office will appear here."}
                  </p>

                  {(search ||
                    statusFilter) && (
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
                  className="office-admin-table-wrapper"
                  style={{
                    overflowX:
                      "auto",
                  }}
                >

                  <table
                    className="office-admin-table"
                    style={{
                      minWidth:
                        "1250px",
                    }}
                  >

                    <thead>

                      <tr>

                        <th>
                          Reference
                        </th>

                        <th>
                          Landlord
                        </th>

                        <th>
                          Tenant
                        </th>

                        <th>
                          Property / Unit
                        </th>

                        <th>
                          Rent
                        </th>

                        <th>
                          Duration
                        </th>

                        <th>
                          Status
                        </th>

                        <th>
                          Service Fee
                        </th>

                        <th>
                          Effective Date
                        </th>

                        <th>
                          Action
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {filteredAgreements.map(
                        (
                          agreement
                        ) => (

                          <tr
                            key={
                              agreement.agreementId
                            }
                          >

                            <td>

                              <strong
                                style={{
                                  color:
                                    "#008f78",
                                }}
                              >
                                {
                                  agreement.referenceNumber
                                }
                              </strong>

                              <div
                                style={{
                                  marginTop:
                                    "4px",
                                  color:
                                    "#788991",
                                  fontSize:
                                    "11px",
                                }}
                              >
                                Created{" "}
                                {formatDate(
                                  agreement.createdAt
                                )}
                              </div>

                            </td>

                            <td>

                              <strong>
                                {getPartyName(
                                  agreement.landlord
                                )}
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
                                  agreement
                                    .landlord
                                    .user
                                    .phone
                                }
                              </div>

                            </td>

                            <td>

                              <strong>
                                {getPartyName(
                                  agreement.tenant
                                )}
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
                                  agreement
                                    .tenant
                                    .user
                                    .phone
                                }
                              </div>

                            </td>

                            <td>

                              <strong>
                                Unit{" "}
                                {
                                  agreement
                                    .unit
                                    .unitNumber
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
                                  agreement
                                    .unit
                                    .property
                                    .location
                                }
                              </div>

                              <div
                                style={{
                                  marginTop:
                                    "3px",
                                  color:
                                    "#9aa6ab",
                                  fontSize:
                                    "11px",
                                }}
                              >
                                {
                                  agreement
                                    .unit
                                    .property
                                    .subCity
                                }{" "}
                                · Woreda{" "}
                                {
                                  agreement
                                    .unit
                                    .property
                                    .woreda
                                }
                              </div>

                            </td>

                            <td
                              style={{
                                fontWeight:
                                  700,
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {formatCurrency(
                                agreement.rentalAmount
                              )}
                            </td>

                            <td
                              style={{
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {
                                agreement.durationValue
                              }{" "}
                              {
                                agreement.durationUnit
                              }
                            </td>

                            <td>

                              <span
                                className={`agreement-status-badge ${getAgreementStatusClass(
                                  agreement.status
                                )}`}
                              >
                                {
                                  agreement.status
                                }
                              </span>

                            </td>

                            <td>

                              <span
                                className={`agreement-status-badge ${getServiceFeeClass(
                                  agreement
                                    .serviceFeePayment
                                    ?.status
                                )}`}
                              >
                                {agreement
                                  .serviceFeePayment
                                  ?.status ||
                                  "N/A"}
                              </span>

                            </td>

                            <td
                              style={{
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {formatDate(
                                agreement.effectiveDate
                              )}
                            </td>

                            <td>

                              <button
                                type="button"
                                className="office-admin-outline-button"
                                style={{
                                  height:
                                    "36px",
                                  minWidth:
                                    "70px",
                                  padding:
                                    "0 12px",
                                }}
                                onClick={() =>
                                  setSelectedAgreement(
                                    agreement
                                  )
                                }
                              >
                                View
                              </button>

                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </section>

          </div>

        </section>

      </main>

      {/* =================================================
          AGREEMENT DETAILS MODAL
      ================================================= */}

      {selectedAgreement && (

        <div
          className="super-admin-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedAgreement(
                null
              );
            }
          }}
        >

          <div
            className="super-admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agreement-details-title"
            style={{
              maxWidth:
                "760px",
            }}
          >

            {/* HEADER */}

            <div className="super-admin-modal-header">

              <div>

                <span className="super-admin-section-eyebrow">
                  RENTAL AGREEMENT
                </span>

                <h2 id="agreement-details-title">
                  {
                    selectedAgreement.referenceNumber
                  }
                </h2>

                <p>
                  Rental agreement details and
                  payment information.
                </p>

              </div>

              <button
                type="button"
                className="super-admin-modal-close"
                onClick={() =>
                  setSelectedAgreement(
                    null
                  )
                }
                aria-label="Close"
              >
                ×
              </button>

            </div>

            {/* STATUS */}

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap:
                  "16px",
                marginBottom:
                  "20px",
                padding:
                  "14px 16px",
                border:
                  "1px solid #e8edeb",
                borderRadius:
                  "8px",
                background:
                  "#f9fbfa",
              }}
            >

              <div>

                <span
                  style={{
                    display:
                      "block",
                    color:
                      "#8a979d",
                    fontSize:
                      "11px",
                    fontWeight:
                      700,
                  }}
                >
                  AGREEMENT STATUS
                </span>

                <strong
                  style={{
                    display:
                      "block",
                    marginTop:
                      "5px",
                    color:
                      "#25343a",
                  }}
                >
                  Workflow status
                </strong>

              </div>

              <span
                className={`agreement-status-badge ${getAgreementStatusClass(
                  selectedAgreement.status
                )}`}
              >
                {
                  selectedAgreement.status
                }
              </span>

            </div>

            {/* BASIC DETAILS */}

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap:
                  "14px",
              }}
            >

              {/* LANDLORD */}

              <div className="agreement-detail-box">

                <span>
                  LANDLORD
                </span>

                <strong>
                  {getPartyName(
                    selectedAgreement.landlord
                  )}
                </strong>

                <small>
                  {
                    selectedAgreement
                      .landlord
                      .user
                      .phone
                  }
                </small>

              </div>

              {/* TENANT */}

              <div className="agreement-detail-box">

                <span>
                  TENANT
                </span>

                <strong>
                  {getPartyName(
                    selectedAgreement.tenant
                  )}
                </strong>

                <small>
                  {
                    selectedAgreement
                      .tenant
                      .user
                      .phone
                  }
                </small>

              </div>

              {/* OFFICE */}

              <div className="agreement-detail-box">

                <span>
                  GOVERNMENT OFFICE
                </span>

                <strong>
                  {
                    selectedAgreement
                      .office
                      .officeCode
                  }
                </strong>

                <small>
                  {
                    selectedAgreement
                      .office
                      .officeName
                  }
                </small>

              </div>

              {/* PROPERTY */}

              <div className="agreement-detail-box">

                <span>
                  PROPERTY / UNIT
                </span>

                <strong>
                  Unit{" "}
                  {
                    selectedAgreement
                      .unit
                      .unitNumber
                  }
                </strong>

                <small>
                  {
                    selectedAgreement
                      .unit
                      .property
                      .location
                  }
                </small>

              </div>

              {/* RENT */}

              <div className="agreement-detail-box">

                <span>
                  RENTAL AMOUNT
                </span>

                <strong
                  style={{
                    color:
                      "#008f78",
                  }}
                >
                  {formatCurrency(
                    selectedAgreement
                      .rentalAmount
                  )}
                </strong>

              </div>

              {/* DURATION */}

              <div className="agreement-detail-box">

                <span>
                  DURATION
                </span>

                <strong>
                  {
                    selectedAgreement
                      .durationValue
                  }{" "}
                  {
                    selectedAgreement
                      .durationUnit
                  }
                </strong>

              </div>

              {/* EFFECTIVE DATE */}

              <div className="agreement-detail-box">

                <span>
                  EFFECTIVE DATE
                </span>

                <strong>
                  {formatDate(
                    selectedAgreement
                      .effectiveDate
                  )}
                </strong>

              </div>

              {/* TERMINATION DATE */}

              <div className="agreement-detail-box">

                <span>
                  TERMINATION DATE
                </span>

                <strong>
                  {formatDate(
                    selectedAgreement
                      .terminationDate
                  )}
                </strong>

              </div>

            </div>

            {/* SERVICE FEE */}

            <div
              style={{
                marginTop:
                  "20px",
                padding:
                  "15px 16px",
                border:
                  "1px solid #e8edeb",
                borderRadius:
                  "8px",
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                background:
                  "#f9fbfa",
              }}
            >

              <div>

                <span
                  style={{
                    display:
                      "block",
                    color:
                      "#8a979d",
                    fontSize:
                      "11px",
                    fontWeight:
                      700,
                  }}
                >
                  SERVICE FEE
                </span>

                <strong
                  style={{
                    display:
                      "block",
                    marginTop:
                      "5px",
                    color:
                      "#25343a",
                  }}
                >
                  50.00 ETB
                </strong>

              </div>

              <span
                className={`agreement-status-badge ${getServiceFeeClass(
                  selectedAgreement
                    .serviceFeePayment
                    ?.status
                )}`}
              >
                {selectedAgreement
                  .serviceFeePayment
                  ?.status ||
                  "N/A"}
              </span>

            </div>

            {/* PAYMENTS */}

            <div
              style={{
                marginTop:
                  "20px",
              }}
            >

              <span className="super-admin-section-eyebrow">
                RECENT PAYMENTS
              </span>

              <h3
                style={{
                  margin:
                    "5px 0 12px",
                  color:
                    "#25343a",
                  fontSize:
                    "17px",
                }}
              >
                Payment History
              </h3>

              {selectedAgreement.payments.length ===
              0 ? (

                <div
                  style={{
                    padding:
                      "16px",
                    border:
                      "1px solid #e8edeb",
                    borderRadius:
                      "8px",
                    color:
                      "#788991",
                  }}
                >
                  No payments recorded.
                </div>

              ) : (

                <div
                  style={{
                    overflowX:
                      "auto",
                  }}
                >

                  <table
                    style={{
                      width:
                        "100%",
                      borderCollapse:
                        "collapse",
                    }}
                  >

                    <thead>

                      <tr>

                        <th
                          style={{
                            padding:
                              "10px",
                            textAlign:
                              "left",
                            color:
                              "#5f707a",
                            fontSize:
                              "12px",
                            borderBottom:
                              "1px solid #e8edeb",
                          }}
                        >
                          Amount
                        </th>

                        <th
                          style={{
                            padding:
                              "10px",
                            textAlign:
                              "left",
                            color:
                              "#5f707a",
                            fontSize:
                              "12px",
                            borderBottom:
                              "1px solid #e8edeb",
                          }}
                        >
                          Due Date
                        </th>

                        <th
                          style={{
                            padding:
                              "10px",
                            textAlign:
                              "left",
                            color:
                              "#5f707a",
                            fontSize:
                              "12px",
                            borderBottom:
                              "1px solid #e8edeb",
                          }}
                        >
                          Paid Date
                        </th>

                        <th
                          style={{
                            padding:
                              "10px",
                            textAlign:
                              "left",
                            color:
                              "#5f707a",
                            fontSize:
                              "12px",
                            borderBottom:
                              "1px solid #e8edeb",
                          }}
                        >
                          Status
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {selectedAgreement.payments.map(
                        (
                          payment
                        ) => (

                          <tr
                            key={
                              payment.paymentId
                            }
                          >

                            <td
                              style={{
                                padding:
                                  "10px",
                                borderBottom:
                                  "1px solid #eef2f0",
                                fontWeight:
                                  600,
                              }}
                            >
                              {formatCurrency(
                                payment.amount
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  "10px",
                                borderBottom:
                                  "1px solid #eef2f0",
                              }}
                            >
                              {formatDate(
                                payment.dueDate
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  "10px",
                                borderBottom:
                                  "1px solid #eef2f0",
                              }}
                            >
                              {formatDate(
                                payment.paidDate
                              )}
                            </td>

                            <td
                              style={{
                                padding:
                                  "10px",
                                borderBottom:
                                  "1px solid #eef2f0",
                              }}
                            >

                              <span
                                className={`agreement-status-badge ${getPaymentStatusClass(
                                  payment.status
                                )}`}
                              >
                                {
                                  payment.status
                                }
                              </span>

                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

            {/* PROCESSED BY */}

            <div
              style={{
                marginTop:
                  "20px",
                padding:
                  "15px 16px",
                border:
                  "1px solid #e8edeb",
                borderRadius:
                  "8px",
              }}
            >

              <span
                style={{
                  display:
                    "block",
                  color:
                    "#8a979d",
                  fontSize:
                    "11px",
                  fontWeight:
                    700,
                }}
              >
                PROCESSED BY OFFICER
              </span>

              <strong
                style={{
                  display:
                    "block",
                  marginTop:
                    "5px",
                  color:
                    "#25343a",
                }}
              >
                {
                  selectedAgreement
                    .createdByOfficer
                    .user
                    .firstName
                }{" "}
                {
                  selectedAgreement
                    .createdByOfficer
                    .user
                    .lastName
                }
              </strong>

              <small
                style={{
                  display:
                    "block",
                  marginTop:
                    "4px",
                  color:
                    "#788991",
                }}
              >
                Employee ID:{" "}
                {
                  selectedAgreement
                    .createdByOfficer
                    .employeeId
                }
              </small>

            </div>

            {/* CREATED */}

            <div
              style={{
                marginTop:
                  "12px",
                color:
                  "#8a979d",
                fontSize:
                  "12px",
              }}
            >
              Agreement created:{" "}
              {formatDateTime(
                selectedAgreement.createdAt
              )}
            </div>

            {/* CLOSE */}

            <div className="super-admin-form-actions">

              <button
                type="button"
                className="super-admin-cancel-button"
                onClick={() =>
                  setSelectedAgreement(
                    null
                  )
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default AdminAgreements;