import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  LogOut,
  Menu,
  Search,
  User,
  X,
  XCircle,
  RefreshCw,
} from "lucide-react";

import CreateAgreement from "./CreateAgreement";

/* =========================================================
   TYPES
========================================================= */

type AgreementStatus =
  | "Approved"
  | "Pending"
  | "Draft"
  | "Rejected"
  | "Active";

interface RentalAgreement {
  id: string;
  referenceNumber: string;
  landlord: string;
  tenant: string;
  property: string;
  location: string;
  monthlyRent: number;
  status: AgreementStatus;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  landlordNationalId?: string;
  landlordPhone?: string;
  tenantNationalId?: string;
  tenantPhone?: string;
  notes?: string;
}

/* =========================================================
   BACKEND RESPONSE TYPES
========================================================= */

type BackendAgreement = {
  agreementId: string;
  referenceNumber: string;
  status: string;
  durationValue?: number;
  durationUnit?: string;
  rentalAmount?: number | string | null;
  effectiveDate?: string | null;
  terminationDate?: string | null;
  createdAt?: string;

  landlord?: {
    landlordId?: string;
    user?: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
    };
  };

  tenant?: {
    tenantId?: string;
    user?: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
    };
  };

  unit?: {
    unitId?: string;
    unitNumber?: string;
    property?: {
      location?: string | null;
      subCity?: string | null;
      woreda?: string | null;
    };
  };

  office?: {
    officeId?: string;
    officeCode?: string;
    officeName?: string;
  };

  serviceFeePayment?: {
    serviceFeePaymentId?: string;
    status?: string;
  };
};

type ContractsResponse = {
  success: boolean;
  message?: string;
  filters?: Record<string, unknown>;
  data: BackendAgreement[];
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

const formatMoney = (
  value?: number | string | null
) => {
  const amount = Number(value ?? 0);

  if (Number.isNaN(amount)) {
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

const getDisplayStatus = (
  status: string
): AgreementStatus => {
  switch (status) {
    case "ACTIVE":
      return "Active";

    case "APPROVED":
    case "PENDING_SERVICE_FEE":
      return "Approved";

    case "PENDING_VERIFICATION":
      return "Pending";

    case "DRAFT":
      return "Draft";

    case "REJECTED":
    case "TERMINATED":
      return "Rejected";

    default:
      return "Pending";
  }
};

const getPersonName = (
  firstName?: string,
  lastName?: string
) => {
  const name = `${firstName ?? ""} ${
    lastName ?? ""
  }`.trim();

  return name || "—";
};

const mapBackendAgreement = (
  agreement: BackendAgreement
): RentalAgreement => {
  const propertyLocation =
    agreement.unit?.property?.location ||
    "—";

  const subCity =
    agreement.unit?.property?.subCity;

  const woreda =
    agreement.unit?.property?.woreda;

  const locationParts = [
    propertyLocation,
    subCity,
    woreda
      ? `Woreda ${woreda}`
      : "",
  ].filter(Boolean);

  return {
    id: agreement.agreementId,

    referenceNumber:
      agreement.referenceNumber || "—",

    landlord: getPersonName(
      agreement.landlord?.user?.firstName,
      agreement.landlord?.user?.lastName
    ),

    tenant: getPersonName(
      agreement.tenant?.user?.firstName,
      agreement.tenant?.user?.lastName
    ),

    property:
      agreement.unit?.unitNumber
        ? `Unit ${agreement.unit.unitNumber}`
        : "Rental Property",

    location:
      locationParts.join(", ") || "—",

    monthlyRent: Number(
      agreement.rentalAmount ?? 0
    ),

    status: getDisplayStatus(
      agreement.status
    ),

    startDate: agreement.effectiveDate
      ? formatDate(
          agreement.effectiveDate
        )
      : undefined,

    endDate: agreement.terminationDate
      ? formatDate(
          agreement.terminationDate
        )
      : undefined,

    landlordPhone:
      agreement.landlord?.user?.phone ??
      undefined,

    tenantPhone:
      agreement.tenant?.user?.phone ??
      undefined,
  };
};

/* =========================================================
   COMPONENT
========================================================= */

const RentalAgreements: React.FC =
  () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [
      isCreateModalOpen,
      setIsCreateModalOpen,
    ] = useState(false);

    const [
      searchQuery,
      setSearchQuery,
    ] = useState("");

    const [
      isMobileMenuOpen,
      setIsMobileMenuOpen,
    ] = useState(false);

    const [
      selectedAgreement,
      setSelectedAgreement,
    ] =
      useState<RentalAgreement | null>(
        null
      );

    const [
      agreements,
      setAgreements,
    ] = useState<RentalAgreement[]>(
      []
    );

    const [
      loading,
      setLoading,
    ] = useState(true);

    const [
      error,
      setError,
    ] = useState("");

    const [
      refreshing,
      setRefreshing,
    ] = useState(false);

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
            setError(
              "Your session has expired. Please login again."
            );

            setLoading(false);

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

            const mapped =
              (result.data ?? []).map(
                mapBackendAgreement
              );

            setAgreements(mapped);
          } catch (err) {
            console.error(
              "Failed to load agreements:",
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

    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {
      void loadAgreements(true);
    }, [loadAgreements]);

    /* =====================================================
       OPEN CREATE MODAL FROM DASHBOARD
    ===================================================== */

    useEffect(() => {
      const state =
        location.state as
          | {
              openCreateAgreement?: boolean;
            }
          | null;

      if (
        state?.openCreateAgreement
      ) {
        setIsCreateModalOpen(true);

        navigate(
          location.pathname,
          {
            replace: true,
            state: {},
          }
        );
      }
    }, [
      location.state,
      location.pathname,
      navigate,
    ]);

    /* =====================================================
       REFRESH WHEN CREATE MODAL CLOSES
    ===================================================== */

    useEffect(() => {
      if (!isCreateModalOpen) {
        void loadAgreements(false);
      }
    }, [
      isCreateModalOpen,
      loadAgreements,
    ]);

    /* =====================================================
       SEARCH
    ===================================================== */

    const filteredAgreements =
      useMemo(() => {
        const query =
          searchQuery
            .trim()
            .toLowerCase();

        if (!query) {
          return agreements;
        }

        return agreements.filter(
          (agreement) =>
            agreement.referenceNumber
              .toLowerCase()
              .includes(query) ||
            agreement.landlord
              .toLowerCase()
              .includes(query) ||
            agreement.tenant
              .toLowerCase()
              .includes(query) ||
            agreement.location
              .toLowerCase()
              .includes(query)
        );
      }, [
        agreements,
        searchQuery,
      ]);

    /* =====================================================
       STATUS ICON
    ===================================================== */

    const getStatusIcon = (
      status: AgreementStatus
    ) => {
      switch (status) {
        case "Active":
        case "Approved":
          return (
            <CheckCircle2
              size={14}
            />
          );

        case "Pending":
          return (
            <Clock3 size={14} />
          );

        case "Rejected":
          return (
            <XCircle size={14} />
          );

        case "Draft":
        default:
          return (
            <FileText
              size={14}
            />
          );
      }
    };

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
       RENDER
    ===================================================== */

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
            <button
              type="button"
              className="officer-nav-item"
              onClick={() =>
                navigate(
                  "/officer/dashboard"
                )
              }
            >
              <Building2
                size={19}
              />

              <span>
                Dashboard
              </span>
            </button>

            <button
              type="button"
              className="officer-nav-item officer-nav-item-active"
              onClick={() =>
                navigate(
                  "/officer/rental-agreements"
                )
              }
            >
              <FileText
                size={19}
              />

              <span>
                Rental Agreements
              </span>
            </button>
          </nav>

          <div className="officer-sidebar-bottom">
            <div className="officer-profile-card">
              <div className="officer-avatar">
                <User size={18} />
              </div>

              <div className="officer-profile-details">
                <strong>
                  Officer
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
                <Menu size={21} />
              </button>

              <div className="officer-search">
                <Search size={18} />

                <input
                  type="search"
                  placeholder="Search agreements..."
                  value={
                    searchQuery
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchQuery(
                      event.target
                        .value
                    )
                  }
                />
              </div>
            </div>

            <div className="officer-account">
              <div className="officer-account-avatar">
                <User size={18} />
              </div>

              <div>
                <strong>
                  Officer
                </strong>

                <span>
                  Rental Officer
                </span>
              </div>
            </div>
          </header>

          {/* =================================================
              CONTENT
          ================================================= */}

          <main className="officer-page-content">

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
                    RENTAL MANAGEMENT
                  </span>

                  <h1>
                    Rental Agreements
                  </h1>

                  <p>
                    View, manage, and create
                    rental agreements registered
                    within the SmartRent ET system.
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
                  title="Refresh agreements"
                >
                  <RefreshCw
                    size={16}
                    className={
                      refreshing
                        ? "refresh-spinning"
                        : ""
                    }
                  />

                  Refresh
                </button>

                <button
                  type="button"
                  className="agreement-primary-button agreements-create-button"
                  onClick={() =>
                    setIsCreateModalOpen(
                      true
                    )
                  }
                >
                  <FileText
                    size={17}
                  />

                  Create Agreement
                </button>

              </div>
            </div>

            {/* =================================================
                ERROR
            ================================================= */}

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
                TABLE CARD
            ================================================= */}

            <section className="agreements-table-card">

              <div className="agreements-table-header">

                <div>
                  <h2>
                    All Rental Agreements
                  </h2>

                  <p>
                    Search and review rental
                    agreement records using
                    reference number, landlord,
                    tenant, or location.
                  </p>
                </div>

                <div className="agreements-count">
                  {loading
                    ? "Loading..."
                    : `${filteredAgreements.length} ${
                        filteredAgreements.length ===
                        1
                          ? "Agreement"
                          : "Agreements"
                      }`}
                </div>
              </div>

              {/* =================================================
                  TABLE
              ================================================= */}

              <div className="agreements-table-wrapper">

                <table className="agreements-table">

                  <thead>
                    <tr>
                      <th>
                        Reference Number
                      </th>

                      <th>
                        Landlord
                      </th>

                      <th>
                        Tenant
                      </th>

                      <th>
                        Property
                      </th>

                      <th>
                        Location
                      </th>

                      <th>
                        Monthly Rent
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
                          colSpan={8}
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
                              Loading rental agreements
                            </h3>

                            <p>
                              Retrieving the latest
                              agreement records.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredAgreements.length >
                      0 ? (
                      filteredAgreements.map(
                        (
                          agreement
                        ) => (
                          <tr
                            key={
                              agreement.id
                            }
                          >
                            <td>
                              <span className="agreement-reference">
                                {
                                  agreement.referenceNumber
                                }
                              </span>
                            </td>

                            <td>
                              <span className="agreement-person-name">
                                {
                                  agreement.landlord
                                }
                              </span>
                            </td>

                            <td>
                              <span className="agreement-person-name">
                                {
                                  agreement.tenant
                                }
                              </span>
                            </td>

                            <td>
                              {
                                agreement.property
                              }
                            </td>

                            <td>
                              {
                                agreement.location
                              }
                            </td>

                            <td>
                              <span className="agreement-rent">
                                {formatMoney(
                                  agreement.monthlyRent
                                )}{" "}
                                ETB
                              </span>
                            </td>

                            <td>
                              <span
                                className={`agreement-status-badge agreement-status-${agreement.status.toLowerCase()}`}
                              >
                                {getStatusIcon(
                                  agreement.status
                                )}

                                {
                                  agreement.status
                                }
                              </span>
                            </td>

                            <td>
                              <button
                                type="button"
                                className="agreement-view-button"
                                onClick={() =>
                                  setSelectedAgreement(
                                    agreement
                                  )
                                }
                                title="View agreement"
                              >
                                <Eye
                                  size={
                                    16
                                  }
                                />

                                <span>
                                  View
                                </span>
                              </button>
                            </td>
                          </tr>
                        )
                      )
                    ) : (
                      <tr>
                        <td
                          colSpan={8}
                          className="agreements-empty-cell"
                        >
                          <div className="agreements-empty-state">

                            <div className="agreements-empty-icon">
                              <FileText
                                size={
                                  27
                                }
                              />
                            </div>

                            <h3>
                              {searchQuery
                                ? "No agreements found"
                                : "No rental agreements yet"}
                            </h3>

                            <p>
                              {searchQuery
                                ? `No agreement matches "${searchQuery}". Try another search.`
                                : "Create your first rental agreement to start managing rental records."}
                            </p>

                            {!searchQuery && (
                              <button
                                type="button"
                                className="agreement-primary-button"
                                onClick={() =>
                                  setIsCreateModalOpen(
                                    true
                                  )
                                }
                              >
                                <FileText
                                  size={
                                    17
                                  }
                                />

                                Create Agreement
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

        {/* =================================================
            CREATE AGREEMENT
        ================================================= */}

        {isCreateModalOpen && (
          <CreateAgreement
            onClose={() =>
              setIsCreateModalOpen(
                false
              )
            }
          />
        )}

        {/* =================================================
            VIEW AGREEMENT
        ================================================= */}

        {selectedAgreement && (
          <div
            className="agreement-modal-overlay"
            role="dialog"
            aria-modal="true"
          >
            <div className="agreement-view-modal">

              <div className="agreement-modal-header">

                <div>
                  <span className="agreement-modal-eyebrow">
                    AGREEMENT DETAILS
                  </span>

                  <h2>
                    Rental Agreement
                  </h2>

                  <p>
                    {
                      selectedAgreement.referenceNumber
                    }
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close-button"
                  onClick={() =>
                    setSelectedAgreement(
                      null
                    )
                  }
                  aria-label="Close agreement details"
                >
                  <X
                    size={21}
                  />
                </button>
              </div>

              <div className="agreement-view-body">

                <div className="agreement-view-status-row">
                  <span>
                    Status
                  </span>

                  <span
                    className={`agreement-status-badge agreement-status-${selectedAgreement.status.toLowerCase()}`}
                  >
                    {getStatusIcon(
                      selectedAgreement.status
                    )}

                    {
                      selectedAgreement.status
                    }
                  </span>
                </div>

                <div className="agreement-detail-grid">

                  <div>
                    <span>
                      Reference Number
                    </span>

                    <strong>
                      {
                        selectedAgreement.referenceNumber
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Monthly Rent
                    </span>

                    <strong>
                      {formatMoney(
                        selectedAgreement.monthlyRent
                      )}{" "}
                      ETB
                    </strong>
                  </div>

                  <div>
                    <span>
                      Landlord
                    </span>

                    <strong>
                      {
                        selectedAgreement.landlord
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Landlord Phone
                    </span>

                    <strong>
                      {
                        selectedAgreement.landlordPhone ||
                        "—"
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Tenant
                    </span>

                    <strong>
                      {
                        selectedAgreement.tenant
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Tenant Phone
                    </span>

                    <strong>
                      {
                        selectedAgreement.tenantPhone ||
                        "—"
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Property
                    </span>

                    <strong>
                      {
                        selectedAgreement.property
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Location
                    </span>

                    <strong>
                      {
                        selectedAgreement.location
                      }
                    </strong>
                  </div>

                  {selectedAgreement.startDate && (
                    <div>
                      <span>
                        Start Date
                      </span>

                      <strong>
                        {
                          selectedAgreement.startDate
                        }
                      </strong>
                    </div>
                  )}

                  {selectedAgreement.endDate && (
                    <div>
                      <span>
                        End Date
                      </span>

                      <strong>
                        {
                          selectedAgreement.endDate
                        }
                      </strong>
                    </div>
                  )}

                </div>
              </div>

              <div className="agreement-modal-footer">

                <button
                  type="button"
                  className="agreement-secondary-button"
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
  };

export default RentalAgreements;