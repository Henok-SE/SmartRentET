import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "../../components/LogoutButton";
import { apiRequest } from "../../services/api";
import "../../styles/super-admin-dashboard.css";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

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

type StoredUser = {
  userId?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

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

function formatCurrency(value?: number | string | null) {
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

function getStatusClass(status: AgreementStatus) {
  switch (status) {
    case "APPROVED":
    case "ACTIVE":
      return "agreement-status-approved";

    case "PENDING_VERIFICATION":
    case "PENDING_SERVICE_FEE":
      return "agreement-status-pending";

    case "REJECTED":
    case "TERMINATED":
    case "EXPIRED":
      return "agreement-status-rejected";

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
      return "agreement-status-approved";

    case "PENDING":
    case "INITIATED":
      return "agreement-status-pending";

    case "FAILED":
    case "EXPIRED":
    case "CANCELLED":
      return "agreement-status-rejected";

    default:
      return "agreement-status-draft";
  }
}

function getPaymentClass(status: PaymentStatus) {
  switch (status) {
    case "PAID":
      return "agreement-status-approved";

    case "PENDING":
    case "PARTIALLY_PAID":
      return "agreement-status-pending";

    case "OVERDUE":
    case "FAILED":
    case "CANCELLED":
      return "agreement-status-rejected";

    default:
      return "agreement-status-draft";
  }
}

function getPartyName(
  party?: {
    user?: {
      firstName?: string;
      lastName?: string;
    };
  } | null
) {
  if (!party?.user) {
    return "—";
  }

  return `${party.user.firstName || ""} ${
    party.user.lastName || ""
  }`.trim() || "—";
}

/*
 * =========================================================
 * COMPONENT
 * =========================================================
 */

function Agreements() {
  const navigate = useNavigate();

  const [agreements, setAgreements] = useState<
    Agreement[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [subCityFilter, setSubCityFilter] =
    useState("");

  const [selectedAgreement, setSelectedAgreement] =
    useState<Agreement | null>(null);

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
      return JSON.parse(storedUser) as StoredUser;
    } catch {
      return {};
    }
  }, [storedUser]);

  const displayName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username || "Super Admin";

  const currentDate = new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(new Date());

  /*
   * =========================================================
   * LOAD AGREEMENTS
   * =========================================================
   */

  const loadAgreements = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      const params = new URLSearchParams();

      const query = search.trim();

      if (query) {
        params.set(
          "referenceNumber",
          query
        );
      }

      if (statusFilter) {
        params.set(
          "status",
          statusFilter
        );
      }

      if (subCityFilter.trim()) {
        params.set(
          "subCity",
          subCityFilter.trim()
        );
      }

      const queryString =
        params.toString();

      const endpoint = queryString
        ? `/dashboard/contracts?${queryString}`
        : "/dashboard/contracts";

      const response =
        await apiRequest<ContractsResponse>(
          endpoint,
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

      setAgreements(response.data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Failed to load rental agreements."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAgreements();
  }, []);

  /*
   * =========================================================
   * FRONTEND SEARCH
   *
   * This allows searching names, offices, unit numbers,
   * etc. even when the backend filter was only applied
   * using referenceNumber.
   * =========================================================
   */

  const filteredAgreements = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return agreements.filter(
      (agreement) => {
        const matchesStatus =
          !statusFilter ||
          agreement.status ===
            statusFilter;

        const matchesSubCity =
          !subCityFilter.trim() ||
          agreement.unit.property.subCity
            ?.toLowerCase()
            .includes(
              subCityFilter
                .trim()
                .toLowerCase()
            );

        const searchableValues = [
          agreement.referenceNumber,

          agreement.landlord.user
            .firstName,

          agreement.landlord.user
            .lastName,

          agreement.landlord.user
            .phone,

          agreement.tenant.user
            .firstName,

          agreement.tenant.user
            .lastName,

          agreement.tenant.user
            .phone,

          agreement.office.officeCode,

          agreement.office.officeName,

          agreement.unit.unitNumber,

          agreement.unit.property
            .location,

          agreement.unit.property
            .subCity,

          agreement.unit.property
            .woreda,

          agreement.createdByOfficer
            .employeeId,

          agreement.createdByOfficer.user
            .firstName,

          agreement.createdByOfficer.user
            .lastName,
        ];

        const matchesSearch =
          !query ||
          searchableValues
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(query)
            );

        return (
          matchesStatus &&
          matchesSubCity &&
          matchesSearch
        );
      }
    );
  }, [
    agreements,
    search,
    statusFilter,
    subCityFilter,
  ]);

  /*
   * =========================================================
   * COUNTS
   * =========================================================
   */

  const activeCount =
    agreements.filter(
      (agreement) =>
        agreement.status === "ACTIVE"
    ).length;

  const pendingCount =
    agreements.filter(
      (agreement) =>
        agreement.status ===
          "PENDING_VERIFICATION" ||
        agreement.status ===
          "PENDING_SERVICE_FEE"
    ).length;

  const approvedCount =
    agreements.filter(
      (agreement) =>
        agreement.status ===
        "APPROVED"
    ).length;

  /*
   * =========================================================
   * CLEAR FILTERS
   * =========================================================
   */

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setSubCityFilter("");
  };

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div className="super-admin-page">
      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside className="super-admin-sidebar">
        <div className="super-admin-sidebar-brand">
          <img
            src="/smartrent-logo.png"
            alt="SmartRent ET"
            className="super-admin-sidebar-logo"
          />

          <div className="super-admin-sidebar-brand-text">
            <h1>SmartRent ET</h1>
            <span>ADMINISTRATION</span>
          </div>
        </div>

        <div className="super-admin-sidebar-divider" />

        <nav
          className="super-admin-navigation"
          aria-label="Super Admin navigation"
        >
          <button
            type="button"
            className="super-admin-nav-item"
            onClick={() =>
              navigate("/super-admin")
            }
          >
            <span className="super-admin-nav-icon">
              ▦
            </span>

            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className="super-admin-nav-item"
            onClick={() =>
              navigate(
                "/super-admin/administrators"
              )
            }
          >
            <span className="super-admin-nav-icon">
              ♟
            </span>

            <span>Administrators</span>
          </button>

          <button
            type="button"
            className="super-admin-nav-item"
            onClick={() =>
              navigate(
                "/super-admin/officers"
              )
            }
          >
            <span className="super-admin-nav-icon">
              ♟
            </span>

            <span>Officers</span>
          </button>

          <button
            type="button"
            className="super-admin-nav-item"
            onClick={() =>
              navigate(
                "/super-admin/offices"
              )
            }
          >
            <span className="super-admin-nav-icon">
              ◎
            </span>

            <span>Government Offices</span>
          </button>

          <button
            type="button"
            className="super-admin-nav-item active"
          >
            <span className="super-admin-nav-icon">
              □
            </span>

            <span>Agreements</span>
          </button>
        </nav>

        <div className="super-admin-sidebar-bottom">
          <div className="super-admin-profile">
            <div className="super-admin-avatar">
              {displayName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="super-admin-profile-info">
              <strong>
                {displayName}
              </strong>

              <span>
                Super Administrator
              </span>
            </div>
          </div>

          <div className="super-admin-logout">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* =====================================================
          MAIN
          ===================================================== */}

      <div className="super-admin-main">
        {/* =================================================
            TOP BAR
            ================================================= */}

        <header className="super-admin-topbar">
          <div className="super-admin-search">
            <span className="super-admin-search-icon">
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
              placeholder="Search agreements, landlords, tenants..."
              aria-label="Search agreements"
            />
          </div>

          <div className="super-admin-topbar-user">
            <span className="super-admin-user-status" />

            <span className="super-admin-role-badge">
              SUPER ADMIN
            </span>

            <span className="super-admin-topbar-name">
              {displayName}
            </span>
          </div>
        </header>

        {/* =================================================
            PAGE CONTENT
            ================================================= */}

        <main className="super-admin-content">
          <section className="super-admin-page-heading">
            <div>
              <span className="super-admin-eyebrow">
                RENTAL AGREEMENTS
              </span>

              <h1>Agreements</h1>

              <p>
                View rental agreements registered
                across SmartRent ET government
                offices.
              </p>
            </div>

            <button
              type="button"
              className="super-admin-outline-button"
              onClick={() =>
                void loadAgreements()
              }
              disabled={loading}
            >
              {loading
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </section>

          {/* =================================================
              STATISTICS
              ================================================= */}

          <section className="super-admin-stat-grid">
            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                □
              </div>

              <div className="super-admin-stat-content">
                <span>
                  Total Agreements
                </span>

                <strong>
                  {agreements.length}
                </strong>

                <small>
                  Registered agreements
                </small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ✓
              </div>

              <div className="super-admin-stat-content">
                <span>
                  Active Agreements
                </span>

                <strong>
                  {activeCount}
                </strong>

                <small>
                  Currently active
                </small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                !
              </div>

              <div className="super-admin-stat-content">
                <span>
                  Pending Agreements
                </span>

                <strong>
                  {pendingCount}
                </strong>

                <small>
                  Awaiting workflow completion
                </small>
              </div>
            </article>
          </section>

          {/* =================================================
              FILTERS
              ================================================= */}

          <section
            className="super-admin-management-card"
            style={{
              minHeight: "auto",
              marginBottom: "22px",
            }}
          >
            <div
              className="super-admin-management-header"
              style={{
                minHeight: "auto",
              }}
            >
              <div>
                <span className="super-admin-section-eyebrow">
                  AGREEMENT FILTERS
                </span>

                <h2>
                  Search & Filter
                </h2>

                <p>
                  Filter agreements by reference,
                  status, or Sub-City.
                </p>
              </div>
            </div>

            <div
              style={{
                padding:
                  "20px 28px 26px",
                display: "grid",
                gridTemplateColumns:
                  "2fr 1fr 1fr auto",
                gap: "14px",
                alignItems: "end",
              }}
            >
              <div className="super-admin-form-group">
                <label htmlFor="agreement-search">
                  Search
                </label>

                <input
                  id="agreement-search"
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Reference, landlord, tenant, office..."
                  style={{
                    width: "100%",
                    height: "45px",
                    padding:
                      "0 13px",
                    border:
                      "1px solid #d4ddda",
                    borderRadius:
                      "5px",
                    background:
                      "#ffffff",
                    color:
                      "#111820",
                    fontFamily:
                      "inherit",
                    fontSize:
                      "14px",
                    outline: "none",
                  }}
                />
              </div>

              <div className="super-admin-form-group">
                <label htmlFor="agreement-status">
                  Status
                </label>

                <select
                  id="agreement-status"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                  style={{
                    width: "100%",
                    height: "45px",
                    padding:
                      "0 13px",
                    border:
                      "1px solid #d4ddda",
                    borderRadius:
                      "5px",
                    background:
                      "#ffffff",
                    color:
                      "#111820",
                    fontFamily:
                      "inherit",
                    fontSize:
                      "14px",
                  }}
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

              <div className="super-admin-form-group">
                <label htmlFor="agreement-subcity">
                  Sub-City
                </label>

                <input
                  id="agreement-subcity"
                  type="text"
                  value={subCityFilter}
                  onChange={(event) =>
                    setSubCityFilter(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Bole"
                  style={{
                    width: "100%",
                    height: "45px",
                    padding:
                      "0 13px",
                    border:
                      "1px solid #d4ddda",
                    borderRadius:
                      "5px",
                    background:
                      "#ffffff",
                    color:
                      "#111820",
                    fontFamily:
                      "inherit",
                    fontSize:
                      "14px",
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="button"
                className="super-admin-outline-button"
                onClick={clearFilters}
              >
                Clear
              </button>
            </div>
          </section>

          {/* =================================================
              AGREEMENTS TABLE
              ================================================= */}

          <section className="super-admin-management-card">
            <div className="super-admin-management-header">
              <div>
                <span className="super-admin-section-eyebrow">
                  AGREEMENT ACCOUNTS
                </span>

                <h2>
                  All Rental Agreements
                </h2>

                <p>
                  {filteredAgreements.length} agreement
                  {filteredAgreements.length === 1
                    ? ""
                    : "s"} shown.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                }}
              >
                <span
                  className="agreement-status-badge agreement-status-approved"
                >
                  {approvedCount} approved
                </span>
              </div>
            </div>

            {error && (
              <div
                className="super-admin-form-error"
                role="alert"
                style={{
                  margin:
                    "20px 28px",
                }}
              >
                {error}
              </div>
            )}

            {loading ? (
              <div className="super-admin-empty-state">
                <div className="super-admin-empty-icon">
                  ⏳
                </div>

                <h3>
                  Loading agreements...
                </h3>

                <p>
                  Retrieving rental agreements
                  from SmartRent ET.
                </p>
              </div>
            ) : filteredAgreements.length ===
              0 ? (
              <div className="super-admin-empty-state">
                <div className="super-admin-empty-icon">
                  □
                </div>

                <h3>
                  {search ||
                  statusFilter ||
                  subCityFilter
                    ? "No agreements found"
                    : "No agreements yet"}
                </h3>

                <p>
                  {search ||
                  statusFilter ||
                  subCityFilter
                    ? "No agreements match the selected search or filters."
                    : "Rental agreements will appear here once they are created."}
                </p>

                {(search ||
                  statusFilter ||
                  subCityFilter) && (
                  <button
                    type="button"
                    className="super-admin-outline-button"
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
                style={{
                  overflowX: "auto",
                  padding:
                    "20px 28px 28px",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse",
                    minWidth:
                      "1350px",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Reference
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Landlord
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Tenant
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Property / Unit
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Office
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Rent
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Duration
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Status
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Service Fee
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Effective
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAgreements.map(
                      (agreement) => (
                        <tr
                          key={
                            agreement.agreementId
                          }
                        >
                          {/* REFERENCE */}

                          <td
                            style={{
                              padding:
                                "16px 12px",
                              borderBottom:
                                "1px solid #eef2f0",
                            }}
                          >
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
                              {
                                agreement.agreementId
                              }
                            </div>
                          </td>

                          {/* LANDLORD */}

                          <td
                            style={{
                              padding:
                                "16px 12px",
                              borderBottom:
                                "1px solid #eef2f0",
                            }}
                          >
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
                                  .user.phone
                              }
                            </div>
                          </td>

                          {/* TENANT */}

                          <td
                            style={{
                              padding:
                                "16px 12px",
                              borderBottom:
                                "1px solid #eef2f0",
                            }}
                          >
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
                                  .user.phone
                              }
                            </div>
                          </td>

                          {/* PROPERTY */}

                          <td
                            style={{
                              padding:
                                "16px 12px",
                              borderBottom:
                                "1px solid #eef2f0",
                            }}
                          >
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

                          {/* OFFICE */}

                          <td
                            style={{
                              padding:
                                "16px 12px",
                              borderBottom:
                                "1px solid #eef2f0",
                            }}
                          >
                            <strong>
                              {
                                agreement
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
                                agreement
                                  .office
                                  .officeName
                              }
                            </div>
                          </td>

                          {/* RENT */}

                          <td
                            style={{
                              padding:
                                "16px 12px",
                              borderBottom:
                                "1px solid #eef2f0",
                              color:
                                "#53636c",
                              fontWeight:
                                600,
                            }}
                          >
                            {formatCurrency(
                              agreement.rentalAmount
                            )}
                          </td>

                          {/* DURATION */}

                          <td
                            style={{
                              padding:
                                "16px 12px",
                              borderBottom:
                                "1px solid #eef2f0",
                              color:
                                "#53636c",
                            }}
                          >
                            {
                              agreement.durationValue
                            }{" "}
                            {
                              agreement
                                .durationUnit
                            }
                          </td>

                          {/* STATUS */}

                          <td
                            style={{
                              padding:
                                "16px 12px",
                              borderBottom:
                                "1px solid #eef2f0",
                            }}
                          >
                            <span
                              className={`agreement-status-badge ${getStatusClass(
                                agreement.status
                              )}`}
                            >
                              {
                                agreement.status
                              }
                            </span>
                          </td>

                          {/* SERVICE FEE */}

                          <td
                            style={{
                              padding:
                                "16px 12px",
                              borderBottom:
                                "1px solid #eef2f0",
                            }}
                          >
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

                          {/* EFFECTIVE DATE */}

                          <td
                            style={{
                              padding:
                                "16px 12px",
                              borderBottom:
                                "1px solid #eef2f0",
                              color:
                                "#53636c",
                            }}
                          >
                            {formatDate(
                              agreement.effectiveDate
                            )}
                          </td>

                          {/* ACTION */}

                          <td
                            style={{
                              padding:
                                "16px 12px",
                              borderBottom:
                                "1px solid #eef2f0",
                            }}
                          >
                            <button
                              type="button"
                              className="super-admin-outline-button"
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

          <div className="super-admin-footer-date">
            SmartRent ET Administration ·{" "}
            {currentDate}
          </div>
        </main>
      </div>

      {/* =====================================================
          VIEW AGREEMENT MODAL
          ===================================================== */}

      {selectedAgreement && (
        <div
          className="super-admin-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedAgreement(null);
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
                  Agreement details and payment
                  information.
                </p>
              </div>

              <button
                type="button"
                className="super-admin-modal-close"
                onClick={() =>
                  setSelectedAgreement(null)
                }
                aria-label="Close agreement details"
              >
                ×
              </button>
            </div>

            {/* STATUS */}

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap: "16px",
                marginBottom:
                  "20px",
                padding:
                  "14px 16px",
                border:
                  "1px solid #e8edeb",
                borderRadius:
                  "7px",
                background:
                  "#f9fbfa",
              }}
            >
              <span
                style={{
                  color:
                    "#5f707a",
                  fontSize:
                    "13px",
                  fontWeight:
                    700,
                }}
              >
                Agreement Status
              </span>

              <span
                className={`agreement-status-badge ${getStatusClass(
                  selectedAgreement.status
                )}`}
              >
                {
                  selectedAgreement.status
                }
              </span>
            </div>

            {/* DETAILS */}

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: "14px",
              }}
            >
              <div
                style={{
                  padding:
                    "15px",
                  border:
                    "1px solid #e8edeb",
                  borderRadius:
                    "7px",
                  background:
                    "#ffffff",
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
                  LANDLORD
                </span>

                <strong
                  style={{
                    display:
                      "block",
                    marginTop:
                      "6px",
                    color:
                      "#25343a",
                    fontSize:
                      "14px",
                  }}
                >
                  {getPartyName(
                    selectedAgreement.landlord
                  )}
                </strong>

                <span
                  style={{
                    display:
                      "block",
                    marginTop:
                      "4px",
                    color:
                      "#788991",
                    fontSize:
                      "12px",
                  }}
                >
                  {
                    selectedAgreement
                      .landlord.user
                      .phone
                  }
                </span>
              </div>

              <div
                style={{
                  padding:
                    "15px",
                  border:
                    "1px solid #e8edeb",
                  borderRadius:
                    "7px",
                  background:
                    "#ffffff",
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
                  TENANT
                </span>

                <strong
                  style={{
                    display:
                      "block",
                    marginTop:
                      "6px",
                    color:
                      "#25343a",
                    fontSize:
                      "14px",
                  }}
                >
                  {getPartyName(
                    selectedAgreement.tenant
                  )}
                </strong>

                <span
                  style={{
                    display:
                      "block",
                    marginTop:
                      "4px",
                    color:
                      "#788991",
                    fontSize:
                      "12px",
                  }}
                >
                  {
                    selectedAgreement
                      .tenant.user
                      .phone
                  }
                </span>
              </div>

              <div
                style={{
                  padding:
                    "15px",
                  border:
                    "1px solid #e8edeb",
                  borderRadius:
                    "7px",
                  background:
                    "#ffffff",
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
                  GOVERNMENT OFFICE
                </span>

                <strong
                  style={{
                    display:
                      "block",
                    marginTop:
                      "6px",
                    color:
                      "#25343a",
                    fontSize:
                      "14px",
                  }}
                >
                  {
                    selectedAgreement
                      .office
                      .officeCode
                  }{" "}
                  —{" "}
                  {
                    selectedAgreement
                      .office
                      .officeName
                  }
                </strong>
              </div>

              <div
                style={{
                  padding:
                    "15px",
                  border:
                    "1px solid #e8edeb",
                  borderRadius:
                    "7px",
                  background:
                    "#ffffff",
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
                  PROPERTY
                </span>

                <strong
                  style={{
                    display:
                      "block",
                    marginTop:
                      "6px",
                    color:
                      "#25343a",
                    fontSize:
                      "14px",
                  }}
                >
                  Unit{" "}
                  {
                    selectedAgreement
                      .unit
                      .unitNumber
                  }
                </strong>

                <span
                  style={{
                    display:
                      "block",
                    marginTop:
                      "4px",
                    color:
                      "#788991",
                    fontSize:
                      "12px",
                  }}
                >
                  {
                    selectedAgreement
                      .unit
                      .property
                      .location
                  }
                </span>
              </div>

              <div
                style={{
                  padding:
                    "15px",
                  border:
                    "1px solid #e8edeb",
                  borderRadius:
                    "7px",
                  background:
                    "#ffffff",
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
                  RENTAL AMOUNT
                </span>

                <strong
                  style={{
                    display:
                      "block",
                    marginTop:
                      "6px",
                    color:
                      "#25343a",
                    fontSize:
                      "16px",
                  }}
                >
                  {formatCurrency(
                    selectedAgreement.rentalAmount
                  )}
                </strong>
              </div>

              <div
                style={{
                  padding:
                    "15px",
                  border:
                    "1px solid #e8edeb",
                  borderRadius:
                    "7px",
                  background:
                    "#ffffff",
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
                  DURATION
                </span>

                <strong
                  style={{
                    display:
                      "block",
                    marginTop:
                      "6px",
                    color:
                      "#25343a",
                    fontSize:
                      "14px",
                  }}
                >
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

              <div
                style={{
                  padding:
                    "15px",
                  border:
                    "1px solid #e8edeb",
                  borderRadius:
                    "7px",
                  background:
                    "#ffffff",
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
                  EFFECTIVE DATE
                </span>

                <strong
                  style={{
                    display:
                      "block",
                    marginTop:
                      "6px",
                    color:
                      "#25343a",
                    fontSize:
                      "14px",
                  }}
                >
                  {formatDate(
                    selectedAgreement.effectiveDate
                  )}
                </strong>
              </div>

              <div
                style={{
                  padding:
                    "15px",
                  border:
                    "1px solid #e8edeb",
                  borderRadius:
                    "7px",
                  background:
                    "#ffffff",
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
                  TERMINATION DATE
                </span>

                <strong
                  style={{
                    display:
                      "block",
                    marginTop:
                      "6px",
                    color:
                      "#25343a",
                    fontSize:
                      "14px",
                  }}
                >
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
                  "18px",
                padding:
                  "15px 16px",
                border:
                  "1px solid #e8edeb",
                borderRadius:
                  "7px",
                background:
                  "#f9fbfa",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: "16px",
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
                    fontSize:
                      "14px",
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
                  ?.status || "N/A"}
              </span>
            </div>

            {/* PAYMENTS */}

            <div
              style={{
                marginTop:
                  "18px",
              }}
            >
              <span className="super-admin-section-eyebrow">
                RECENT PAYMENTS
              </span>

              {selectedAgreement
                .payments.length ===
              0 ? (
                <div
                  style={{
                    padding:
                      "16px",
                    border:
                      "1px solid #e8edeb",
                    borderRadius:
                      "7px",
                    color:
                      "#788991",
                    fontSize:
                      "13px",
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
                        (payment) => (
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
                                color:
                                  "#53636c",
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
                                color:
                                  "#53636c",
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
                                className={`agreement-status-badge ${getPaymentClass(
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

            {/* OFFICER */}

            <div
              style={{
                marginTop:
                  "18px",
                padding:
                  "15px 16px",
                border:
                  "1px solid #e8edeb",
                borderRadius:
                  "7px",
                background:
                  "#ffffff",
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
                CREATED / PROCESSED BY
              </span>

              <strong
                style={{
                  display:
                    "block",
                  marginTop:
                    "5px",
                  color:
                    "#25343a",
                  fontSize:
                    "14px",
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

              <span
                style={{
                  display:
                    "block",
                  marginTop:
                    "4px",
                  color:
                    "#788991",
                  fontSize:
                    "12px",
                }}
              >
                Employee ID:{" "}
                {
                  selectedAgreement
                    .createdByOfficer
                    .employeeId
                }
              </span>
            </div>

            <div className="super-admin-form-actions">
              <button
                type="button"
                className="super-admin-cancel-button"
                onClick={() =>
                  setSelectedAgreement(null)
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

export default Agreements;