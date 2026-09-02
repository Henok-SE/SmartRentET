import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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
} from "lucide-react";



/* =========================================================
   TYPES
========================================================= */

type AgreementStatus = "Approved" | "Pending" | "Draft" | "Rejected";

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
   INITIAL FORM
========================================================= */



/* =========================================================
   RENTAL AGREEMENTS PAGE
========================================================= */

const RentalAgreements: React.FC = () => {
  const navigate = useNavigate();
  

  

  const [searchQuery, setSearchQuery] = useState("");

  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  const [selectedAgreement, setSelectedAgreement] =
    useState<RentalAgreement | null>(null);

  /*
   * This starts empty intentionally.
   *
   * Later this should be replaced with data from your
   * rental agreements API.
   */
  const [agreements] = useState<
    RentalAgreement[]
  >([]);

  /* =======================================================
     OPEN CREATE MODAL FROM OFFICER DASHBOARD
  ======================================================= */

  

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredAgreements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return agreements;
    }

    return agreements.filter((agreement) =>
      agreement.referenceNumber
        .toLowerCase()
        .includes(query)
    );
  }, [agreements, searchQuery]);

  /* =======================================================
     CREATE AGREEMENT
  ======================================================= */


  /* =======================================================
     STATUS ICON
  ======================================================= */

  const getStatusIcon = (status: AgreementStatus) => {
    switch (status) {
      case "Approved":
        return <CheckCircle2 size={14} />;

      case "Pending":
        return <Clock3 size={14} />;

      case "Rejected":
        return <XCircle size={14} />;

      case "Draft":
      default:
        return <FileText size={14} />;
    }
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {
    /*
     * Add your existing authentication logout logic here.
     *
     * Example:
     * localStorage.removeItem("token");
     */

    navigate("/officer-login");
  };

  return (
    <div className="officer-layout">
      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`officer-sidebar ${
          isMobileMenuOpen
            ? "officer-sidebar-open"
            : ""
        }`}
      >
        <div className="officer-sidebar-brand">
          <img
            src= "/smartrent-logo.png"
            alt="SmartRent ET"
            className="officer-brand-logo"
          />

          <div>
            <h2>SmartRent ET</h2>
            <span>RENTAL MONITORING</span>
          </div>
        </div>

        <nav className="officer-sidebar-navigation">
          <button
            type="button"
            className="officer-nav-item"
            onClick={() =>
              navigate("/officer/Agreement/dashboard")
            }
          >
            <Building2 size={19} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className="officer-nav-item officer-nav-item-active"
            onClick={() =>
              navigate("/officer/rental-agreements")
            }
          >
            <FileText size={19} />
            <span>Rental Agreements</span>
          </button>
        </nav>

        <div className="officer-sidebar-bottom">
          <div className="officer-profile-card">
            <div className="officer-avatar">
              <User size={18} />
            </div>

            <div className="officer-profile-details">
              <strong>Officer</strong>
              <span>Rental Monitoring Officer</span>
            </div>
          </div>

          <button
            type="button"
            className="officer-logout-button"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {isMobileMenuOpen && (
        <div
          className="officer-mobile-overlay"
          onClick={() =>
            setIsMobileMenuOpen(false)
          }
        />
      )}

      {/* =====================================================
          MAIN AREA
      ===================================================== */}

      <div className="officer-main">
        {/* TOP BAR */}
        <header className="officer-topbar">
          <div className="officer-topbar-left">
            <button
              type="button"
              className="officer-mobile-menu-button"
              onClick={() =>
                setIsMobileMenuOpen(true)
              }
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>

            <div className="officer-search">
              <Search size={18} />

              <input
                type="search"
                placeholder="Search by reference number..."
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
              />
            </div>
          </div>

          <div className="officer-account">
            <div className="officer-account-avatar">
              <User size={18} />
            </div>

            <div>
              <strong>Officer</strong>
              <span>Rental Officer</span>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="officer-page-content">
          {/* PAGE HEADER */}
          <div className="agreements-page-header">
            <div className="agreements-page-title">
              <button
                type="button"
                className="agreements-back-button"
                onClick={() =>
                  navigate("/officer/dashboard")
                }
                aria-label="Back to dashboard"
              >
                <ArrowLeft size={18} />
              </button>

              <div>
                <span className="officer-eyebrow">
                  RENTAL MANAGEMENT
                </span>

                <h1>Rental Agreements</h1>

                <p>
                  View, manage, and create rental
                  agreements registered within the
                  SmartRent ET system.
                </p>
              </div>
            </div>

            <button
  type="button"
  className="agreement-primary-button agreements-create-button"
  onClick={() => navigate("/officer/create-agreement")}
>
  <FileText size={17} />
  Create Agreement
</button>
          </div>

          {/* TABLE CARD */}
          <section className="agreements-table-card">
            <div className="agreements-table-header">
              <div>
                <h2>All Rental Agreements</h2>

                <p>
                  Search and review rental agreement
                  records using their reference number.
                </p>
              </div>

              <div className="agreements-count">
                {filteredAgreements.length}{" "}
                {filteredAgreements.length === 1
                  ? "Agreement"
                  : "Agreements"}
              </div>
            </div>

            {/* TABLE */}
            <div className="agreements-table-wrapper">
              <table className="agreements-table">
                <thead>
                  <tr>
                    <th>Reference Number</th>
                    <th>Landlord</th>
                    <th>Tenant</th>
                    <th>Property</th>
                    <th>Location</th>
                    <th>Monthly Rent</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAgreements.length > 0 ? (
                    filteredAgreements.map(
                      (agreement) => (
                        <tr key={agreement.id}>
                          <td>
                            <span className="agreement-reference">
                              {
                                agreement.referenceNumber
                              }
                            </span>
                          </td>

                          <td>
                            <span className="agreement-person-name">
                              {agreement.landlord}
                            </span>
                          </td>

                          <td>
                            <span className="agreement-person-name">
                              {agreement.tenant}
                            </span>
                          </td>

                          <td>
                            {agreement.property}
                          </td>

                          <td>
                            {agreement.location}
                          </td>

                          <td>
                            <span className="agreement-rent">
                              {agreement.monthlyRent.toLocaleString()}{" "}
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

                              {agreement.status}
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
                              <Eye size={16} />
                              <span>View</span>
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
                            <FileText size={27} />
                          </div>

                          <h3>
                            {searchQuery
                              ? "No agreements found"
                              : "No rental agreements yet"}
                          </h3>

                          <p>
                            {searchQuery
                              ? `No agreement matches "${searchQuery}". Try another reference number.`
                              : "Create your first rental agreement to start managing rental records."}
                          </p>

                          {!searchQuery && (
                            <button
                              type="button"
                              className="agreement-primary-button"
                              onClick={() =>
                                navigate("/officer/create-agreement")
                              }
                            >
                              <FileText size={17} />
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

      {/* =====================================================
          CREATE AGREEMENT MODAL
      ===================================================== */}

      
      {/* =====================================================
          VIEW AGREEMENT MODAL
      ===================================================== */}

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

                <h2>Rental Agreement</h2>

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
                  setSelectedAgreement(null)
                }
                aria-label="Close agreement details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="agreement-view-body">
              <div className="agreement-view-status-row">
                <span>Status</span>

                <span
                  className={`agreement-status-badge agreement-status-${selectedAgreement.status.toLowerCase()}`}
                >
                  {getStatusIcon(
                    selectedAgreement.status
                  )}

                  {selectedAgreement.status}
                </span>
              </div>

              <div className="agreement-detail-grid">
                <div>
                  <span>Reference Number</span>
                  <strong>
                    {
                      selectedAgreement.referenceNumber
                    }
                  </strong>
                </div>

                <div>
                  <span>Monthly Rent</span>
                  <strong>
                    {selectedAgreement.monthlyRent.toLocaleString()}{" "}
                    ETB
                  </strong>
                </div>

                <div>
                  <span>Landlord</span>
                  <strong>
                    {selectedAgreement.landlord}
                  </strong>
                </div>

                <div>
                  <span>Tenant</span>
                  <strong>
                    {selectedAgreement.tenant}
                  </strong>
                </div>

                <div>
                  <span>Property</span>
                  <strong>
                    {selectedAgreement.property}
                  </strong>
                </div>

                <div>
                  <span>Location</span>
                  <strong>
                    {selectedAgreement.location}
                  </strong>
                </div>

                {selectedAgreement.startDate && (
                  <div>
                    <span>Start Date</span>
                    <strong>
                      {selectedAgreement.startDate}
                    </strong>
                  </div>
                )}

                {selectedAgreement.endDate && (
                  <div>
                    <span>End Date</span>
                    <strong>
                      {selectedAgreement.endDate}
                    </strong>
                  </div>
                )}

                {selectedAgreement.paymentMethod && (
                  <div>
                    <span>Payment Method</span>
                    <strong>
                      {
                        selectedAgreement.paymentMethod
                      }
                    </strong>
                  </div>
                )}
              </div>

              {selectedAgreement.notes && (
                <div className="agreement-detail-notes">
                  <span>Additional Notes</span>
                  <p>{selectedAgreement.notes}</p>
                </div>
              )}
            </div>

            <div className="agreement-modal-footer">
              <button
                type="button"
                className="agreement-secondary-button"
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
};

export default RentalAgreements;
