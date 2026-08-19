import { useEffect, useMemo, useState } from "react";
import LogoutButton from "../../components/LogoutButton";
import { apiRequest } from "../../services/api";
import "../../styles/officer-dashboard.css";

type StoredUser = {
  userId?: string;
  username?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  subCity?: string;
};

type DashboardSection =
  | "dashboard"
  | "agreements"
  | "payments"
  | "compliance"
  | "investigations";

type DashboardSummary = {
  totalAgreements: number;
  activeAgreements: number;
  pendingAgreements: number;
  totalLandlords: number;
  totalTenants: number;
  totalOfficers: number;
  totalOffices: number;
  totalPayments: number;
  collectedPayments: number;
  overduePayments: number;
  pendingVerifications: number;
};

type SummaryResponse = {
  success: boolean;
  message?: string;
  data: DashboardSummary;
};

type AgreementStatus =
  | "DRAFT"
  | "PENDING_VERIFICATION"
  | "PENDING_SERVICE_FEE"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "TERMINATED"
  | "EXPIRED";

type Contract = {
  agreementId: number;
  referenceNumber: string;
  status: AgreementStatus;
  durationValue: number;
  durationUnit: "MONTH" | "YEAR";
  rentalAmount: number | string;
  effectiveDate: string;
  terminationDate?: string | null;
  createdAt: string;

  landlord: {
    landlordId: number;
    user: {
      firstName: string;
      lastName: string;
      phone?: string | null;
    };
  };

  tenant: {
    tenantId: number;
    user: {
      firstName: string;
      lastName: string;
      phone?: string | null;
    };
  };

  unit: {
    unitId: number;
    unitNumber: string;
    property: {
      location: string;
      subCity: string;
      woreda: string;
    };
  };

  office: {
    officeId: number;
    officeCode: string;
    officeName: string;
  };

  createdByOfficer: {
    officerId: number;
    employeeId: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };

  serviceFeePayment?: {
    serviceFeePaymentId: number;
    status: string;
  } | null;

  payments: {
    paymentId: number;
    amount: number | string;
    status: string;
    dueDate: string;
    paidDate?: string | null;
  }[];
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
  };
  data: Contract[];
};

function OfficerDashboard() {
  const [activeSection, setActiveSection] =
    useState<DashboardSection>("dashboard");

  const [search, setSearch] = useState("");

  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);

  const [contracts, setContracts] = useState<
    Contract[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [contractsLoading, setContractsLoading] =
    useState(true);

  const [error, setError] = useState("");
  const [contractsError, setContractsError] =
    useState("");

  /*
   * ---------------------------------------------------------
   * CURRENT USER
   * ---------------------------------------------------------
   */

  const storedUser = localStorage.getItem("user");

  const user: StoredUser = useMemo(() => {
    if (!storedUser) {
      return {};
    }

    try {
      return JSON.parse(storedUser);
    } catch {
      return {};
    }
  }, [storedUser]);

  const displayName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username || "Officer";

  const initials =
    user.firstName && user.lastName
      ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
      : displayName.charAt(0).toUpperCase();

  /*
   * ---------------------------------------------------------
   * DATE
   * ---------------------------------------------------------
   */

  const currentDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  /*
   * ---------------------------------------------------------
   * HELPERS
   * ---------------------------------------------------------
   */

  const formatMoney = (
    value: number | string
  ) => {
    const amount = Number(value);

    if (Number.isNaN(amount)) {
      return `ETB ${value}`;
    }

    return `ETB ${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
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

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const getStatusLabel = (
    status: AgreementStatus
  ) => {
    return status
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const getStatusClass = (
    status: AgreementStatus
  ) => {
    switch (status) {
      case "ACTIVE":
        return "active";

      case "EXPIRED":
      case "TERMINATED":
      case "REJECTED":
        return "expired";

      case "PENDING_VERIFICATION":
      case "PENDING_SERVICE_FEE":
        return "pending";

      default:
        return "pending";
    }
  };

  /*
   * ---------------------------------------------------------
   * LOAD SUMMARY
   * ---------------------------------------------------------
   */

  const loadSummary = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      const response =
        await apiRequest<SummaryResponse>(
          "/dashboard/summary",
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

      setSummary(response.data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Failed to load dashboard summary."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * LOAD CONTRACTS
   * ---------------------------------------------------------
   */

  const loadContracts = async () => {
    setContractsLoading(true);
    setContractsError("");

    try {
      const token = localStorage.getItem("token");

      const response =
        await apiRequest<ContractsResponse>(
          "/dashboard/contracts",
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

      setContracts(response.data);
    } catch (err) {
      if (err instanceof Error) {
        setContractsError(err.message);
      } else {
        setContractsError(
          "Failed to load rental agreements."
        );
      }
    } finally {
      setContractsLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * INITIAL LOAD
   * ---------------------------------------------------------
   */

  useEffect(() => {
    void loadSummary();
    void loadContracts();
  }, []);

  /*
   * ---------------------------------------------------------
   * SEARCH
   * ---------------------------------------------------------
   */

  const filteredContracts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return contracts;
    }

    return contracts.filter((contract) => {
      const landlordName =
        `${contract.landlord.user.firstName} ${contract.landlord.user.lastName}`
          .toLowerCase();

      const tenantName =
        `${contract.tenant.user.firstName} ${contract.tenant.user.lastName}`
          .toLowerCase();

      const values = [
        contract.referenceNumber,
        contract.status,
        contract.office.officeCode,
        contract.office.officeName,
        contract.unit.unitNumber,
        contract.unit.property.location,
        contract.unit.property.subCity,
        contract.unit.property.woreda,
        landlordName,
        tenantName,
        contract.createdByOfficer.employeeId,
      ];

      return values.some((value) =>
        value
          .toString()
          .toLowerCase()
          .includes(query)
      );
    });
  }, [contracts, search]);

  /*
   * ---------------------------------------------------------
   * NAVIGATION
   * ---------------------------------------------------------
   */

  const handleNavigation = (
    section: DashboardSection
  ) => {
    setActiveSection(section);
    setSearch("");
  };

  /*
   * ---------------------------------------------------------
   * AGREEMENT LIST
   * ---------------------------------------------------------
   */

  const renderContracts = () => {
    if (contractsLoading) {
      return (
        <div className="officer-empty-state">
          <div className="officer-empty-icon">
            ⏳
          </div>

          <h3>
            Loading agreements...
          </h3>

          <p>
            Retrieving SmartRent rental agreements.
          </p>
        </div>
      );
    }

    if (contractsError) {
      return (
        <div
          className="officer-error"
          role="alert"
        >
          {contractsError}
        </div>
      );
    }

    if (filteredContracts.length === 0) {
      return (
        <div className="officer-empty-state">
          <div className="officer-empty-icon">
            ▣
          </div>

          <h3>
            {search
              ? "No agreements found"
              : "No agreements yet"}
          </h3>

          <p>
            {search
              ? `No agreements match "${search}".`
              : "Rental agreements registered in SmartRent will appear here."}
          </p>
        </div>
      );
    }

    return (
      <div
        style={{
          display: "grid",
          gap: "14px",
        }}
      >
        {filteredContracts.map((contract) => (
          <article
            key={contract.agreementId}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "18px",
              background: "#ffffff",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                alignItems: "flex-start",
              }}
            >
              <div>
                <span
                  className="officer-section-eyebrow"
                >
                  AGREEMENT
                </span>

                <h3
                  style={{
                    margin: "4px 0 0",
                  }}
                >
                  {contract.referenceNumber}
                </h3>

                <p
                  style={{
                    margin: "4px 0 0",
                    color: "#6b7280",
                  }}
                >
                  Created {formatDate(contract.createdAt)}
                </p>
              </div>

              <span
                className={`legend-dot ${getStatusClass(
                  contract.status
                )}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  width: "auto",
                  height: "auto",
                  padding: "6px 10px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                {getStatusLabel(contract.status)}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "14px",
                marginTop: "18px",
              }}
            >
              <div>
                <small>Landlord</small>

                <strong
                  style={{
                    display: "block",
                    marginTop: "4px",
                  }}
                >
                  {contract.landlord.user.firstName}{" "}
                  {contract.landlord.user.lastName}
                </strong>
              </div>

              <div>
                <small>Tenant</small>

                <strong
                  style={{
                    display: "block",
                    marginTop: "4px",
                  }}
                >
                  {contract.tenant.user.firstName}{" "}
                  {contract.tenant.user.lastName}
                </strong>
              </div>

              <div>
                <small>Property</small>

                <strong
                  style={{
                    display: "block",
                    marginTop: "4px",
                  }}
                >
                  {contract.unit.property.location}
                </strong>
              </div>

              <div>
                <small>Unit</small>

                <strong
                  style={{
                    display: "block",
                    marginTop: "4px",
                  }}
                >
                  {contract.unit.unitNumber}
                </strong>
              </div>

              <div>
                <small>Sub-City</small>

                <strong
                  style={{
                    display: "block",
                    marginTop: "4px",
                  }}
                >
                  {contract.unit.property.subCity}
                </strong>
              </div>

              <div>
                <small>Government Office</small>

                <strong
                  style={{
                    display: "block",
                    marginTop: "4px",
                  }}
                >
                  {contract.office.officeCode}
                </strong>
              </div>

              <div>
                <small>Rental Amount</small>

                <strong
                  style={{
                    display: "block",
                    marginTop: "4px",
                  }}
                >
                  {formatMoney(
                    contract.rentalAmount
                  )}
                </strong>
              </div>

              <div>
                <small>Effective Date</small>

                <strong
                  style={{
                    display: "block",
                    marginTop: "4px",
                  }}
                >
                  {formatDate(
                    contract.effectiveDate
                  )}
                </strong>
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  };

  /*
   * ---------------------------------------------------------
   * PAGE CONTENT
   * ---------------------------------------------------------
   */

  const renderPageContent = () => {
    if (activeSection === "agreements") {
      return (
        <section className="officer-workspace-card">
          <div className="officer-workspace-header">
            <div>
              <span className="officer-section-eyebrow">
                RENTAL MANAGEMENT
              </span>

              <h2>
                Rental Agreements
              </h2>

              <p>
                Register, validate, approve and manage
                SmartRent rental agreements.
              </p>
            </div>

            <button
              type="button"
              className="officer-primary-button"
            >
              + Register Agreement
            </button>
          </div>

          <div
            style={{
              marginBottom: "20px",
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search agreements, tenants, landlords..."
              aria-label="Search rental agreements"
              style={{
                width: "100%",
                padding: "12px 14px",
                border:
                  "1px solid #d1d5db",
                borderRadius: "8px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {renderContracts()}
        </section>
      );
    }

    if (activeSection === "payments") {
      return (
        <section className="officer-workspace-card">
          <div className="officer-workspace-header">
            <div>
              <span className="officer-section-eyebrow">
                FINANCIAL OPERATIONS
              </span>

              <h2>Payment Records</h2>

              <p>
                Review payments and verify payment
                transactions.
              </p>
            </div>

            <button
              type="button"
              className="officer-outline-button"
            >
              Search Payment
            </button>
          </div>

          <div className="officer-empty-state">
            <div className="officer-empty-icon">
              ETB
            </div>

            <h3>
              {summary?.totalPayments ?? 0} payment
              records
            </h3>

            <p>
              Collected payments:{" "}
              <strong>
                {formatMoney(
                  summary?.collectedPayments ?? 0
                )}
              </strong>
              .
              <br />
              Overdue payments:{" "}
              <strong>
                {summary?.overduePayments ?? 0}
              </strong>
              .
            </p>
          </div>
        </section>
      );
    }

    if (activeSection === "compliance") {
      return (
        <section className="officer-workspace-card">
          <div className="officer-workspace-header">
            <div>
              <span className="officer-section-eyebrow">
                COMPLIANCE
              </span>

              <h2>
                Compliance & Flags
              </h2>

              <p>
                Review, raise and resolve SmartRent
                compliance cases.
              </p>
            </div>

            <button
              type="button"
              className="officer-primary-button"
            >
              + Raise Flag
            </button>
          </div>

          <div className="officer-empty-state">
            <div className="officer-empty-icon">
              !
            </div>

            <h3>
              {summary?.pendingVerifications ?? 0} pending
              verifications
            </h3>

            <p>
              Verification and compliance workflows can
              be connected here.
            </p>
          </div>
        </section>
      );
    }

    if (activeSection === "investigations") {
      return (
        <section className="officer-workspace-card">
          <div className="officer-workspace-header">
            <div>
              <span className="officer-section-eyebrow">
                CASE MANAGEMENT
              </span>

              <h2>Investigations</h2>

              <p>
                Open and manage SmartRent investigations.
              </p>
            </div>

            <button
              type="button"
              className="officer-primary-button"
            >
              + Open Investigation
            </button>
          </div>

          <div className="officer-empty-state">
            <div className="officer-empty-icon">
              !
            </div>

            <h3>No investigations</h3>

            <p>
              Investigation cases assigned to or created
              by this officer will appear here.
            </p>
          </div>
        </section>
      );
    }

    /*
     * -------------------------------------------------------
     * MAIN DASHBOARD
     * -------------------------------------------------------
     */

    return (
      <>
        <section className="officer-page-heading">
          <div>
            <span className="officer-eyebrow">
              FIELD OPERATIONS
            </span>

            <h1>Officer Dashboard</h1>

            <p>
              Manage rental agreements, payments,
              compliance and investigations.
            </p>
          </div>

          <div className="officer-heading-actions">
            <button
              type="button"
              className="officer-outline-button"
              onClick={() =>
                handleNavigation("agreements")
              }
            >
              View Agreements
            </button>

            <button
              type="button"
              className="officer-primary-button"
              onClick={() =>
                handleNavigation("agreements")
              }
            >
              + Register Agreement
            </button>
          </div>
        </section>

        {error && (
          <div
            className="officer-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <section className="officer-stat-grid">

          <article className="officer-stat-card">

            <div className="officer-stat-icon">
              ▣
            </div>

            <div className="officer-stat-content">
              <span>Total Agreements</span>

              <strong>
                {loading
                  ? "..."
                  : summary?.totalAgreements ?? 0}
              </strong>

              <small>
                Registered agreements
              </small>
            </div>

          </article>

          <article className="officer-stat-card">

            <div className="officer-stat-icon">
              ✓
            </div>

            <div className="officer-stat-content">
              <span>Active Contracts</span>

              <strong>
                {loading
                  ? "..."
                  : summary?.activeAgreements ?? 0}
              </strong>

              <small>
                Currently active
              </small>
            </div>

          </article>

          <article className="officer-stat-card">

            <div className="officer-stat-icon">
              ETB
            </div>

            <div className="officer-stat-content">
              <span>Collected Payments</span>

              <strong>
                {loading
                  ? "..."
                  : formatMoney(
                      summary?.collectedPayments ?? 0
                    )}
              </strong>

              <small>
                Recorded paid transactions
              </small>
            </div>

          </article>

          <article className="officer-stat-card">

            <div className="officer-stat-icon warning">
              !
            </div>

            <div className="officer-stat-content">
              <span>Pending Verification</span>

              <strong>
                {loading
                  ? "..."
                  : summary?.pendingVerifications ?? 0}
              </strong>

              <small>
                Requiring attention
              </small>
            </div>

          </article>

        </section>

        <section className="officer-dashboard-grid">

          <article className="officer-panel">

            <div className="officer-panel-header">

              <div>
                <span className="officer-section-eyebrow">
                  AGREEMENTS
                </span>

                <h2>Agreement Status</h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleNavigation("agreements")
                }
                className="officer-text-button"
              >
                View All
              </button>

            </div>

            <div className="officer-status-content">

              <div className="officer-donut">

                <div className="officer-donut-inner">

                  <strong>
                    {loading
                      ? "..."
                      : summary?.totalAgreements ?? 0}
                  </strong>

                  <span>Total</span>

                </div>

              </div>

              <div className="officer-status-legend">

                <div className="officer-legend-item">
                  <span className="legend-dot active" />
                  <span>Active</span>

                  <strong>
                    {summary?.activeAgreements ?? 0}
                  </strong>
                </div>

                <div className="officer-legend-item">
                  <span className="legend-dot pending" />
                  <span>Pending</span>

                  <strong>
                    {summary?.pendingAgreements ?? 0}
                  </strong>
                </div>

                <div className="officer-legend-item">
                  <span className="legend-dot expired" />
                  <span>Expired</span>

                  <strong>—</strong>
                </div>

                <div className="officer-legend-item">
                  <span className="legend-dot terminated" />
                  <span>Terminated</span>

                  <strong>—</strong>
                </div>

              </div>

            </div>

          </article>

          <article className="officer-panel">

            <div className="officer-panel-header">

              <div>
                <span className="officer-section-eyebrow">
                  QUICK ACTIONS
                </span>

                <h2>Officer Operations</h2>
              </div>

            </div>

            <div className="officer-quick-actions">

              <button
                type="button"
                onClick={() =>
                  handleNavigation("agreements")
                }
                className="officer-action-card"
              >
                <span className="action-icon">
                  +
                </span>

                <span>
                  <strong>
                    Register Agreement
                  </strong>

                  <small>
                    Create a new rental agreement
                  </small>
                </span>

                <span className="action-arrow">
                  →
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleNavigation("payments")
                }
                className="officer-action-card"
              >
                <span className="action-icon">
                  ETB
                </span>

                <span>
                  <strong>
                    Verify Payment
                  </strong>

                  <small>
                    Verify a payment transaction
                  </small>
                </span>

                <span className="action-arrow">
                  →
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleNavigation("compliance")
                }
                className="officer-action-card"
              >
                <span className="action-icon">
                  !
                </span>

                <span>
                  <strong>
                    Compliance
                  </strong>

                  <small>
                    Review compliance cases
                  </small>
                </span>

                <span className="action-arrow">
                  →
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleNavigation("investigations")
                }
                className="officer-action-card"
              >
                <span className="action-icon">
                  #
                </span>

                <span>
                  <strong>
                    Investigations
                  </strong>

                  <small>
                    Manage investigation cases
                  </small>
                </span>

                <span className="action-arrow">
                  →
                </span>
              </button>

            </div>

          </article>

        </section>

        <section className="officer-activity-card">

          <div className="officer-activity-header">

            <div>
              <span className="officer-section-eyebrow">
                RECENT AGREEMENTS
              </span>

              <h2>Latest Rental Agreements</h2>

              <p>
                Most recently registered SmartRent
                agreements.
              </p>
            </div>

            <button
              type="button"
              className="officer-text-button"
              onClick={() =>
                handleNavigation("agreements")
              }
            >
              View All
            </button>

          </div>

          {contractsLoading ? (

            <div className="officer-empty-state compact">

              <div className="officer-empty-icon">
                ⏳
              </div>

              <h3>
                Loading agreements...
              </h3>

            </div>

          ) : contractsError ? (

            <div
              className="officer-error"
              role="alert"
            >
              {contractsError}
            </div>

          ) : contracts.length === 0 ? (

            <div className="officer-empty-state compact">

              <div className="officer-empty-icon">
                ◷
              </div>

              <h3>No recent agreements</h3>

              <p>
                Agreement activity will appear here.
              </p>

            </div>

          ) : (

            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >

              {contracts.slice(0, 5).map(
                (contract) => (
                  <article
                    key={contract.agreementId}
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: "16px",
                      padding: "14px 16px",
                      border:
                        "1px solid #e5e7eb",
                      borderRadius: "10px",
                      background:
                        "#ffffff",
                    }}
                  >

                    <div>

                      <strong>
                        {contract.referenceNumber}
                      </strong>

                      <p
                        style={{
                          margin:
                            "4px 0 0",
                          color:
                            "#6b7280",
                        }}
                      >
                        {contract.landlord.user.firstName}{" "}
                        {contract.landlord.user.lastName}
                        {" → "}
                        {contract.tenant.user.firstName}{" "}
                        {contract.tenant.user.lastName}
                      </p>

                    </div>

                    <div
                      style={{
                        textAlign:
                          "right",
                      }}
                    >

                      <strong>
                        {formatMoney(
                          contract.rentalAmount
                        )}
                      </strong>

                      <p
                        style={{
                          margin:
                            "4px 0 0",
                          color:
                            "#6b7280",
                        }}
                      >
                        {formatDate(
                          contract.createdAt
                        )}
                      </p>

                    </div>

                  </article>
                )
              )}

            </div>

          )}

        </section>
      </>
    );
  };

  return (
    <div className="officer-page">

      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside className="officer-sidebar">

        <div className="officer-sidebar-brand">

          <img
            src="/smartrent-logo.png"
            alt="SmartRent ET"
            className="officer-sidebar-logo"
          />

          <div className="officer-sidebar-brand-text">
            <h1>SmartRent ET</h1>
            <span>OFFICER PORTAL</span>
          </div>

        </div>

        <div className="officer-sidebar-divider" />

        <nav className="officer-navigation">

          <button
            type="button"
            className={`officer-nav-item ${
              activeSection === "dashboard"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleNavigation("dashboard")
            }
          >
            <span className="officer-nav-icon">
              ▦
            </span>

            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={`officer-nav-item ${
              activeSection === "agreements"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleNavigation("agreements")
            }
          >
            <span className="officer-nav-icon">
              ▣
            </span>

            <span>Rental Agreements</span>
          </button>

          <button
            type="button"
            className={`officer-nav-item ${
              activeSection === "payments"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleNavigation("payments")
            }
          >
            <span className="officer-nav-icon">
              ETB
            </span>

            <span>Payment Records</span>
          </button>

          <button
            type="button"
            className={`officer-nav-item ${
              activeSection === "compliance"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleNavigation("compliance")
            }
          >
            <span className="officer-nav-icon">
              !
            </span>

            <span>Compliance</span>
          </button>

          <button
            type="button"
            className={`officer-nav-item ${
              activeSection === "investigations"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleNavigation("investigations")
            }
          >
            <span className="officer-nav-icon">
              #
            </span>

            <span>Investigations</span>
          </button>

        </nav>

        <div className="officer-sidebar-bottom">

          <div className="officer-profile">

            <div className="officer-avatar">
              {initials}
            </div>

            <div className="officer-profile-info">
              <strong>
                {displayName}
              </strong>

              <span>
                {user.subCity
                  ? `${user.subCity} Officer`
                  : "SmartRent Officer"}
              </span>
            </div>

          </div>

          <div className="officer-logout">
            <LogoutButton />
          </div>

        </div>

      </aside>

      {/* =====================================================
          MAIN
          ===================================================== */}

      <div className="officer-main">

        <header className="officer-topbar">

          <div className="officer-search">

            <span className="officer-search-icon">
              ⌕
            </span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search agreements, tenants, landlords..."
              aria-label="Search SmartRent records"
            />

          </div>

          <div className="officer-topbar-user">

            <span className="officer-user-status" />

            <span className="officer-topbar-name">
              {displayName}
            </span>

          </div>

        </header>

        <main className="officer-content">

          {renderPageContent()}

          <div className="officer-footer-date">
            SmartRent ET Officer Portal ·{" "}
            {currentDate}
          </div>

        </main>

      </div>

    </div>
  );
}

export default OfficerDashboard;