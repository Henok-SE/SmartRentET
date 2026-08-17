import { useState } from "react";
import LogoutButton from "../../components/LogoutButton";
import "../../styles/admin-dashboard.css";
function AdminDashboard() {
  const [showCreateOfficer, setShowCreateOfficer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    phone: "",
    nationalId: "",
    password: "",
    employeeId: "",
    subCity: "",
    assignedTo: "",
    officeId: "1",
  });

  const storedUser = localStorage.getItem("user");

  let user: {
    firstName?: string;
    lastName?: string;
    username?: string;
    role?: string;
  } = {};

  try {
    if (storedUser) {
      user = JSON.parse(storedUser);
    }
  } catch {
    user = {};
  }

  const displayName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username || "Administrator";

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openCreateOfficer = () => {
    setError("");
    setSuccess("");
    setShowCreateOfficer(true);
  };

  const closeCreateOfficer = () => {
    if (!loading) {
      setShowCreateOfficer(false);
      setError("");
      setSuccess("");
    }
  };

 const handleCreateOfficer = async (
  event: React.FormEvent<HTMLFormElement>
) => {
  event.preventDefault();

  setError("");
  setSuccess("");
  setLoading(true);

  try {
    const token = localStorage.getItem("token");

    const response = await fetch(
      "http://localhost:5000/api/auth/register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          nationalId: form.nationalId,
          username: form.username,
          password: form.password,
          role: "OFFICER",
          profileData: {
            employeeId: form.employeeId,
            subCity: form.subCity,
            assignedTo: form.assignedTo,
            officeId: Number(form.officeId),
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Failed to create officer."
      );
    }

    setSuccess("Officer created successfully.");

    setForm({
      firstName: "",
      lastName: "",
      username: "",
      phone: "",
      nationalId: "",
      password: "",
      employeeId: "",
      subCity: "",
      assignedTo: "",
      officeId: "1",
    });

    setTimeout(() => {
      setShowCreateOfficer(false);
      setSuccess("");
    }, 1200);
  } catch (err) {
    if (err instanceof Error) {
      setError(err.message);
    } else {
      setError("Failed to create officer.");
    }
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="admin-figma-page">

      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside className="admin-sidebar">

        <div className="sidebar-logo">
          <img
            src="/smartrent-logo.png"
            alt="SmartRent ET"
          />
        </div>

        <nav className="sidebar-navigation">

          <button className="sidebar-item active">
            <span className="sidebar-icon">▦</span>
            <span>Dashboard</span>
            <span className="sidebar-status-dot" />
          </button>

          <button className="sidebar-item">
            <span className="sidebar-icon">▣</span>
            <span>Rental Agreements</span>
          </button>

          <button className="sidebar-item">
            <span className="sidebar-icon">▤</span>
            <span>Payment Records</span>
          </button>

          <button className="sidebar-item">
            <span className="sidebar-icon">▥</span>
            <span>Report And Analysis</span>
          </button>

        </nav>

        <div className="sidebar-bottom">

          <div className="sidebar-user">
            <div className="sidebar-user-icon">●</div>

            <div>
              <strong>{displayName}</strong>
              <span>Administrator</span>
            </div>
          </div>

          <LogoutButton />

        </div>

      </aside>


      {/* =====================================================
          MAIN AREA
          ===================================================== */}

      <div className="admin-main">

        {/* TOP BAR */}

        <header className="admin-topbar">

          <div className="admin-search">

            <span className="search-icon">⌕</span>

            <input
              type="text"
              placeholder="Search agreements, tenants, landlords....."
            />

          </div>

          <div className="admin-topbar-right">

  <span className="admin-date">
    Aug 12, 2026
  </span>

  <span className="admin-role-badge">
    ADMIN
  </span>

  <span className="admin-user">
    {displayName}
  </span>

</div>

        </header>


        {/* =================================================
            DASHBOARD CONTENT
            ================================================= */}

        <main className="admin-content">

          <div className="admin-page-heading">

            <h1>Dashboard Overview</h1>

            <p>
              SmartRent ET Administration · August 12, 2026
            </p>

          </div>


          {/* =================================================
              STATISTICS
              ================================================= */}

          <section className="admin-stat-grid">

            <div className="admin-stat-card">

              <div>
                <strong>0</strong>
                <span>Total Agreements</span>
                <small>+0 this month</small>
              </div>

              <div className="stat-arrow">↑</div>

            </div>


            <div className="admin-stat-card">

              <div>
                <strong>0</strong>
                <span>Active Contracts</span>
                <small>0% of total</small>
              </div>

              <div className="stat-arrow">↑</div>

            </div>


            <div className="admin-stat-card">

              <div>
                <strong>ETB 0</strong>
                <span>Today's Payments</span>
                <small>0 transactions</small>
              </div>

              <div className="stat-arrow">↑</div>

            </div>


            <div className="admin-stat-card">

              <div>
                <strong>0</strong>
                <span>Flagged Cases</span>
                <small>0 critical, 0 medium</small>
              </div>

              <div className="stat-arrow">↑</div>

            </div>

          </section>


          {/* =================================================
              ANALYTICS
              ================================================= */}

          <section className="admin-analytics-grid">

            {/* PAYMENT TREND */}

            <div className="admin-panel">

              <div className="admin-panel-header">

                <h2>Six Month Payment Trends</h2>

              </div>

              <div className="payment-chart">

                <div className="chart-y-axis">
                  <span>3,000</span>
                  <span>2,000</span>
                  <span>1,000</span>
                  <span>0</span>
                </div>

                <div className="chart-area">

                  <div className="chart-grid-line" />
                  <div className="chart-grid-line" />
                  <div className="chart-grid-line" />
                  <div className="chart-grid-line" />

                  <svg
                    viewBox="0 0 600 250"
                    preserveAspectRatio="none"
                    className="payment-line"
                  >
                    <path
                      d="
                        M 0 175
                        C 70 125, 105 110, 150 135
                        C 205 165, 235 150, 275 115
                        C 320 75, 350 120, 395 125
                        C 450 130, 475 85, 525 70
                        C 555 60, 580 45, 600 35
                        L 600 250
                        L 0 250
                        Z
                      "
                    />

                    <path
                      d="
                        M 0 175
                        C 70 125, 105 110, 150 135
                        C 205 165, 235 150, 275 115
                        C 320 75, 350 120, 395 125
                        C 450 130, 475 85, 525 70
                        C 555 60, 580 45, 600 35
                      "
                      className="payment-line-stroke"
                    />
                  </svg>

                  <div className="chart-months">
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                    <span>Jul</span>
                    <span>Aug</span>
                  </div>

                </div>

              </div>

            </div>


            {/* AGREEMENT STATUS */}

            <div className="admin-panel">

              <div className="admin-panel-header">

                <h2>Agreement Status</h2>

              </div>

              <div className="agreement-chart-wrapper">

                <div className="agreement-donut">

                  <div className="donut-center" />

                </div>

              </div>

              <div className="agreement-legend">

                <div>
                  <span className="legend-dot active" />
                  Active
                </div>

                <div>
                  <span className="legend-dot expired" />
                  Expired
                </div>

                <div>
                  <span className="legend-dot pending" />
                  Pending
                </div>

                <div>
                  <span className="legend-dot terminated" />
                  Terminated
                </div>

              </div>

            </div>

          </section>


          {/* =================================================
              OFFICER MANAGEMENT
              ================================================= */}

          <section className="admin-officer-section">

            <div className="admin-section-heading">

              <div>
                <h2>Officer Management</h2>

                <p>
                  Create and manage SmartRent officers.
                </p>
              </div>

              <button
                type="button"
                className="admin-primary-button"
                onClick={openCreateOfficer}
              >
                + Create Officer
              </button>

            </div>


            <div className="officer-empty-state">

              <div className="officer-empty-icon">
                👤
              </div>

              <h3>No officers yet</h3>

              <p>
                Create an officer account to start managing
                SmartRent operations.
              </p>

              <button
                type="button"
                className="admin-primary-button"
                onClick={openCreateOfficer}
              >
                Create First Officer
              </button>

            </div>

          </section>

        </main>

      </div>


      {/* =====================================================
          CREATE OFFICER MODAL
          ===================================================== */}

      {showCreateOfficer && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <div>
                <h2>Create Officer</h2>

                <p>
                  Create a new SmartRent officer account.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateOfficer}
                disabled={loading}
              >
                ×
              </button>

            </div>


            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}


            {success && (
              <div className="admin-success">
                {success}
              </div>
            )}


            <form onSubmit={handleCreateOfficer}>

              <div className="form-row">

                <div className="form-group">

                  <label htmlFor="firstName">
                    First Name
                  </label>

                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    required
                  />

                </div>


                <div className="form-group">

                  <label htmlFor="lastName">
                    Last Name
                  </label>

                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    required
                  />

                </div>

              </div>


              <div className="form-group">

                <label htmlFor="username">
                  Username
                </label>

                <input
                  id="username"
                  name="username"
                  type="text"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Choose username"
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="phone">
                  Phone Number
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="nationalId">
                  National ID
                </label>

                <input
                  id="nationalId"
                  name="nationalId"
                  type="text"
                  value={form.nationalId}
                  onChange={handleChange}
                  placeholder="Enter national ID"
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="employeeId">
                  Employee ID
                </label>

                <input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  value={form.employeeId}
                  onChange={handleChange}
                  placeholder="Enter employee ID"
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="subCity">
                  Sub-City
                </label>

                <input
                  id="subCity"
                  name="subCity"
                  type="text"
                  value={form.subCity}
                  onChange={handleChange}
                  placeholder="Enter sub-city"
                  required
                />

              </div>
              <div className="form-group">
  <label htmlFor="officeId">
    Government Office
  </label>

  <select
    id="officeId"
    name="officeId"
    value={form.officeId}
    onChange={(event) =>
      setForm((previous) => ({
        ...previous,
        officeId: event.target.value,
      }))
    }
    disabled={loading}
    required
  >
    <option value="1">
      ADDIS-001 — Addis Ababa Rental Office
    </option>
  </select>
</div>
 <div className="form-group">
  <label htmlFor="assignedTo">
    Assigned To
  </label>

  <input
    id="assignedTo"
    name="assignedTo"
    type="text"
    value={form.assignedTo}
    onChange={handleChange}
    placeholder="e.g. Office 1"
    disabled={loading}
    required
  />
</div>

              <div className="form-group">

                <label htmlFor="password">
                  Temporary Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create temporary password"
                  minLength={6}
                  required
                />

              </div>


              <div className="form-actions">

                <button
                  type="button"
                  onClick={closeCreateOfficer}
                  disabled={loading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Creating..."
                    : "Create Officer"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default AdminDashboard;