import { useMemo, useState } from "react";
import LogoutButton from "../../components/LogoutButton";
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

function OfficerDashboard() {
  const [activeSection, setActiveSection] =
    useState<DashboardSection>("dashboard");

  const [search, setSearch] = useState("");

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

              <h2>Rental Agreements</h2>

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

          <div className="officer-empty-state">
            <div className="officer-empty-icon">
              ▣
            </div>

            <h3>No agreements yet</h3>

            <p>
              Rental agreements registered by officers
              will appear here.
            </p>

            <button
              type="button"
              className="officer-primary-button"
            >
              Register First Agreement
            </button>
          </div>
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

            <h3>No payment records</h3>

            <p>
              Payment transactions will appear here
              once they are recorded.
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

              <h2>Compliance & Flags</h2>

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
              ✓
            </div>

            <h3>No compliance flags</h3>

            <p>
              There are currently no compliance cases
              requiring officer attention.
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
        {/* Page heading */}

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


        {/* Statistics */}

        <section className="officer-stat-grid">

          <article className="officer-stat-card">

            <div className="officer-stat-icon">
              ▣
            </div>

            <div className="officer-stat-content">
              <span>Total Agreements</span>

              <strong>0</strong>

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

              <strong>0</strong>

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
              <span>Today's Payments</span>

              <strong>ETB 0</strong>

              <small>
                0 transactions
              </small>
            </div>

          </article>


          <article className="officer-stat-card">

            <div className="officer-stat-icon warning">
              !
            </div>

            <div className="officer-stat-content">
              <span>Compliance Flags</span>

              <strong>0</strong>

              <small>
                Requiring attention
              </small>
            </div>

          </article>

        </section>


        {/* Main analytics */}

        <section className="officer-dashboard-grid">

          {/* Agreement status */}

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
                  <strong>0</strong>
                  <span>Total</span>
                </div>
              </div>


              <div className="officer-status-legend">

                <div className="officer-legend-item">
                  <span className="legend-dot active" />
                  <span>Active</span>
                  <strong>0</strong>
                </div>

                <div className="officer-legend-item">
                  <span className="legend-dot pending" />
                  <span>Pending</span>
                  <strong>0</strong>
                </div>

                <div className="officer-legend-item">
                  <span className="legend-dot expired" />
                  <span>Expired</span>
                  <strong>0</strong>
                </div>

                <div className="officer-legend-item">
                  <span className="legend-dot terminated" />
                  <span>Terminated</span>
                  <strong>0</strong>
                </div>

              </div>

            </div>

          </article>


          {/* Quick actions */}

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


        {/* Recent activity */}

        <section className="officer-activity-card">

          <div className="officer-activity-header">

            <div>
              <span className="officer-section-eyebrow">
                ACTIVITY
              </span>

              <h2>Recent Activity</h2>

              <p>
                Recent SmartRent activity assigned to
                this officer.
              </p>
            </div>

          </div>


          <div className="officer-empty-state compact">

            <div className="officer-empty-icon">
              ◷
            </div>

            <h3>No recent activity</h3>

            <p>
              Agreement, payment and compliance activity
              will appear here.
            </p>

          </div>

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

        {/* Brand */}

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


        {/* Navigation */}

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


        {/* Sidebar bottom */}

        <div className="officer-sidebar-bottom">

          <div className="officer-profile">

            <div className="officer-avatar">
              {initials}
            </div>

            <div className="officer-profile-info">
              <strong>{displayName}</strong>

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

        {/* Topbar */}

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


        {/* Content */}

        <main className="officer-content">

          {renderPageContent()}

          <div className="officer-footer-date">
            SmartRent ET Officer Portal · {currentDate}
          </div>

        </main>

      </div>

    </div>
  );
}

export default OfficerDashboard;