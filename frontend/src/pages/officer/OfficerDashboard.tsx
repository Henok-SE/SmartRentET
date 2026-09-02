import { useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  LogOut,
  User,
  Home,
  ClipboardList,
  CreditCard,

} from "lucide-react";

function OfficerDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear authentication data if your project stores it
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  const handleRentalAgreements = () => {
    navigate("/officer/rental-agreements");
  };

  

  return (
    <div className="officer-dashboard-page">
      {/* =========================
          SIDEBAR
      ========================== */}
      <aside className="officer-dashboard-sidebar">
        {/* Logo / Brand */}
        <div className="officer-dashboard-brand">
          <img
            src="/smartrent-logo.png"
            alt="SmartRent ET Logo"
            className="officer-dashboard-logo"
          />

          <div>
            <h2>SmartRent ET</h2>
            <span>RENTAL MONITORING</span>
          </div>
        </div>

        <div className="officer-dashboard-divider" />

        {/* Navigation */}
        <nav className="officer-dashboard-navigation">
          <button
            className="officer-dashboard-nav-item active"
            onClick={() => navigate("/officer/dashboard")}
          >
            <Home size={19} />
            <span>Dashboard</span>
          </button>

          <button
            className="officer-dashboard-nav-item"
            onClick={handleRentalAgreements}
          >
            <FileText size={19} />
            <span>Rental Agreements</span>
          </button>
          <button
  className="officer-dashboard-nav-item"
  onClick={() => navigate("/officer/payment-records")}
>
  <CreditCard size={19} />
  <span>Payment Records</span>
</button>
        </nav>

        {/* Sidebar Bottom */}
        <div className="officer-dashboard-sidebar-bottom">
          <div className="officer-dashboard-profile">
            <div className="officer-dashboard-avatar">
              <User size={19} />
            </div>

            <div className="officer-dashboard-profile-info">
              <strong>Officer</strong>
              <span>Government Officer</span>
            </div>
          </div>

          <button
            className="officer-dashboard-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* =========================
          MAIN CONTENT
      ========================== */}
      <main className="officer-dashboard-main">
        {/* Top Bar */}
        <header className="officer-dashboard-topbar">
          <div className="officer-dashboard-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search..."
              aria-label="Search"
            />
          </div>

          <div className="officer-dashboard-user">
            <div className="officer-dashboard-user-avatar">
              O
            </div>

            <div>
              <strong>Officer</strong>
              <span>Officer Account</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <section className="officer-dashboard-content">
          <div className="officer-dashboard-heading">
            <div>
              <span className="officer-dashboard-eyebrow">
                OFFICER PORTAL
              </span>

              <h1>Officer Dashboard</h1>

              <p>
                Manage rental agreements and monitor rental information
                assigned to your office.
              </p>
            </div>

            
          </div>

          {/* Statistics */}
          <div className="officer-dashboard-stats">
            <div className="officer-dashboard-stat-card">
              <div className="officer-dashboard-stat-icon">
                <FileText size={23} />
              </div>

              <div>
                <span>Total Agreements</span>
                <strong>0</strong>
                <small>Rental agreements</small>
              </div>
            </div>

            <div className="officer-dashboard-stat-card">
              <div className="officer-dashboard-stat-icon">
                <ClipboardList size={23} />
              </div>

              <div>
                <span>Pending Agreements</span>
                <strong>0</strong>
                <small>Awaiting review</small>
              </div>
            </div>

            <div className="officer-dashboard-stat-card">
              <div className="officer-dashboard-stat-icon">
                <Home size={23} />
              </div>

              <div>
                <span>Approved Agreements</span>
                <strong>0</strong>
                <small>Approved rentals</small>
              </div>
            </div>
          </div>

          {/* Rental Agreements Section */}
          <section className="officer-dashboard-section">
            <div className="officer-dashboard-section-header">
              <div>
                <span className="officer-dashboard-section-label">
                  RENTAL MANAGEMENT
                </span>

                <h2>Rental Agreements</h2>

                <p>
                  Create and manage rental agreements for properties in
                  your assigned area.
                </p>
              </div>

              <button
                className="officer-dashboard-view-button"
                onClick={handleRentalAgreements}
              >
                <FileText size={17} />
                View Agreements
              </button>
            </div>

            <div className="officer-dashboard-empty-state">
              <div className="officer-dashboard-empty-icon">
                <FileText size={28} />
              </div>

              <h3>No rental agreements yet</h3>

              <p>
                You haven't created any rental agreements yet. Start by
                creating your first agreement.
              </p>

              
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

export default OfficerDashboard;