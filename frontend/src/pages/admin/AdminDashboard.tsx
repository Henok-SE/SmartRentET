import { useEffect, useState } from "react";
import LogoutButton from "../../components/LogoutButton";
import { apiRequest } from "../../services/api";
import "../../styles/admin-dashboard.css";

type GovernmentOffice = {
  officeId: number;
  officeCode: string;
  officeName: string;
  region?: string | null;
  city?: string | null;
  subCity?: string | null;
  woreda?: string | null;
  address?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  _count?: {
    officeAdmins: number;
    officers: number;
    agreements: number;
  };
};

type OfficerForm = {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  nationalId: string;
  password: string;
  employeeId: string;
  subCity: string;
  assignedTo: string;
  officeId: string;
};

type Officer = {
  officerId: number;
  employeeId: string;
  position?: string | null;
  assignedArea?: string | null;
  createdAt: string;

  user: {
    userId: number;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    username?: string | null;
    role?: string;
    isActive: boolean;
  };

  office: {
    officeId: number;
    officeCode: string;
    officeName: string;
    subCity?: string | null;
    woreda?: string | null;
  };
};

type StoredUser = {
  firstName?: string;
  lastName?: string;
  username?: string;
  role?: string;
};

type OfficeListResponse = {
  success: boolean;
  message?: string;
  filters?: {
    status?: string;
    subCity?: string;
    city?: string;
  };
  data: GovernmentOffice[];
};

type OfficerListResponse = {
  success: boolean;
  message?: string;
  filters?: {
    subCity?: string;
    isActive?: string;
  };
  data: Officer[];
};

type OfficerCreateResponse = {
  success: boolean;
  message: string;
  data?: Officer;
};

const createEmptyOfficerForm = (): OfficerForm => ({
  firstName: "",
  lastName: "",
  username: "",
  phone: "",
  nationalId: "",
  password: "",
  employeeId: "",
  subCity: "",
  assignedTo: "",
  officeId: "",
});

function AdminDashboard() {
  const [showCreateOfficer, setShowCreateOfficer] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [officeLoading, setOfficeLoading] = useState(true);
  const [officerLoading, setOfficerLoading] =
    useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [officeError, setOfficeError] = useState("");
  const [officerListError, setOfficerListError] =
    useState("");

  const [offices, setOffices] = useState<
    GovernmentOffice[]
  >([]);

  const [officers, setOfficers] = useState<Officer[]>([]);

  const [form, setForm] = useState<OfficerForm>(
    createEmptyOfficerForm
  );

  /*
   * ---------------------------------------------------------
   * CURRENT USER
   * ---------------------------------------------------------
   */

  const storedUser = localStorage.getItem("user");

  let user: StoredUser = {};

  try {
    if (storedUser) {
      user = JSON.parse(storedUser) as StoredUser;
    }
  } catch {
    user = {};
  }

  const displayName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username || "Administrator";

  /*
   * ---------------------------------------------------------
   * LOAD GOVERNMENT OFFICES
   * ---------------------------------------------------------
   */

  const loadOffices = async () => {
    setOfficeLoading(true);
    setOfficeError("");

    try {
      const token = localStorage.getItem("token");

      const response =
        await apiRequest<OfficeListResponse>(
          "/dashboard/offices",
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

      setOffices(response.data);

      if (response.data.length === 1) {
        setForm((previous) => ({
          ...previous,
          officeId: String(
            response.data[0].officeId
          ),
        }));
      }
    } catch (err) {
      if (err instanceof Error) {
        setOfficeError(err.message);
      } else {
        setOfficeError(
          "Failed to load Government Offices."
        );
      }
    } finally {
      setOfficeLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * LOAD OFFICERS
   * ---------------------------------------------------------
   */

  const loadOfficers = async () => {
    setOfficerLoading(true);
    setOfficerListError("");

    try {
      const token = localStorage.getItem("token");

      const response =
        await apiRequest<OfficerListResponse>(
          "/dashboard/officers",
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

      setOfficers(response.data);
    } catch (err) {
      if (err instanceof Error) {
        setOfficerListError(err.message);
      } else {
        setOfficerListError(
          "Failed to load officers."
        );
      }
    } finally {
      setOfficerLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * INITIAL LOAD
   * ---------------------------------------------------------
   */

  useEffect(() => {
    void loadOffices();
    void loadOfficers();
  }, []);

  /*
   * ---------------------------------------------------------
   * FORM HANDLING
   * ---------------------------------------------------------
   */

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleOfficeChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setForm((previous) => ({
      ...previous,
      officeId: event.target.value,
    }));
  };

  /*
   * ---------------------------------------------------------
   * OPEN / CLOSE CREATE OFFICER
   * ---------------------------------------------------------
   */

  const openCreateOfficer = async () => {
    setError("");
    setSuccess("");
    setOfficeError("");

    setForm(createEmptyOfficerForm());

    setShowCreateOfficer(true);

    if (offices.length === 0) {
      await loadOffices();
    }
  };

  const closeCreateOfficer = () => {
    if (loading) {
      return;
    }

    setShowCreateOfficer(false);
    setError("");
    setSuccess("");
    setOfficeError("");
  };

  /*
   * ---------------------------------------------------------
   * VALIDATION
   * ---------------------------------------------------------
   */

  const validateOfficerForm = (): string | null => {
    if (!form.firstName.trim()) {
      return "First name is required.";
    }

    if (!form.lastName.trim()) {
      return "Last name is required.";
    }

    if (!form.username.trim()) {
      return "Username is required.";
    }

    if (!form.phone.trim()) {
      return "Phone number is required.";
    }

    if (!form.nationalId.trim()) {
      return "National ID is required.";
    }

    if (!form.employeeId.trim()) {
      return "Employee ID is required.";
    }

    if (!form.subCity.trim()) {
      return "Sub-City is required.";
    }

    if (!form.assignedTo.trim()) {
      return "Assigned Area is required.";
    }

    if (!form.officeId) {
      return "Please select a Government Office.";
    }

    if (form.password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    return null;
  };

  /*
   * ---------------------------------------------------------
   * CREATE OFFICER
   * ---------------------------------------------------------
   */

  const handleCreateOfficer = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError =
      validateOfficerForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      await apiRequest<OfficerCreateResponse>(
        "/dashboard/officers",
        {
          method: "POST",
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
          body: JSON.stringify({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            username: form.username.trim(),
            phone: form.phone.trim(),
            nationalId: form.nationalId.trim(),
            employeeId: form.employeeId.trim(),
            officeId: Number(form.officeId),
            position: "",
            assignedArea: form.assignedTo.trim(),
            password: form.password,
          }),
        }
      );

      await loadOfficers();

      setSuccess(
        "Officer created successfully."
      );

      setForm(createEmptyOfficerForm());

      window.setTimeout(() => {
        setShowCreateOfficer(false);
        setSuccess("");
      }, 1200);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Failed to create officer."
        );
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

        <nav
          className="sidebar-navigation"
          aria-label="Office Admin navigation"
        >
          <button
            type="button"
            className="sidebar-item active"
          >
            <span className="sidebar-icon">
              ▦
            </span>

            <span>Dashboard</span>

            <span className="sidebar-status-dot" />
          </button>

          <button
            type="button"
            className="sidebar-item"
          >
            <span className="sidebar-icon">
              ▣
            </span>

            <span>Rental Agreements</span>
          </button>

          <button
            type="button"
            className="sidebar-item"
          >
            <span className="sidebar-icon">
              ▤
            </span>

            <span>Payment Records</span>
          </button>

          <button
            type="button"
            className="sidebar-item"
          >
            <span className="sidebar-icon">
              ▥
            </span>

            <span>Report And Analysis</span>
          </button>
        </nav>

        <div className="sidebar-bottom">

          <div className="sidebar-user">

            <div className="sidebar-user-icon">
              ●
            </div>

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

            <span className="search-icon">
              ⌕
            </span>

            <input
              type="text"
              placeholder="Search agreements, tenants, landlords..."
              aria-label="Search"
            />

          </div>

          <div className="admin-topbar-right">

            <span className="admin-date">
              {new Intl.DateTimeFormat(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }
              ).format(new Date())}
            </span>

            <span className="admin-role-badge">
              OFFICE ADMIN
            </span>

            <span className="admin-user">
              {displayName}
            </span>

          </div>

        </header>

        {/* =================================================
            CONTENT
            ================================================= */}

        <main className="admin-content">

          <div className="admin-page-heading">

            <div>
              <h1>Dashboard Overview</h1>

              <p>
                SmartRent ET Administration
              </p>
            </div>

          </div>

          {/* =================================================
              STATISTICS
              ================================================= */}

          <section className="admin-stat-grid">

            <div className="admin-stat-card">

              <div>
                <strong>0</strong>

                <span>Total Agreements</span>

                <small>
                  +0 this month
                </small>
              </div>

              <div className="stat-arrow">
                ↑
              </div>

            </div>

            <div className="admin-stat-card">

              <div>
                <strong>0</strong>

                <span>Active Contracts</span>

                <small>
                  0% of total
                </small>
              </div>

              <div className="stat-arrow">
                ↑
              </div>

            </div>

            <div className="admin-stat-card">

              <div>
                <strong>ETB 0</strong>

                <span>Today's Payments</span>

                <small>
                  0 transactions
                </small>
              </div>

              <div className="stat-arrow">
                ↑
              </div>

            </div>

            <div className="admin-stat-card">

              <div>
                <strong>{officers.length}</strong>

                <span>Total Officers</span>

                <small>
                  Loaded from dashboard
                </small>
              </div>

              <div className="stat-arrow">
                ↑
              </div>

            </div>

          </section>

          {/* =================================================
              ANALYTICS
              ================================================= */}

          <section className="admin-analytics-grid">

            {/* PAYMENT TREND */}

            <div className="admin-panel">

              <div className="admin-panel-header">

                <h2>
                  Six Month Payment Trends
                </h2>

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

                <h2>
                  Agreement Status
                </h2>

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
                <h2>
                  Officer Management
                </h2>

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

            {officeError && (
              <div
                className="auth-error"
                role="alert"
              >
                {officeError}
              </div>
            )}

            {officerListError && (
              <div
                className="auth-error"
                role="alert"
              >
                {officerListError}
              </div>
            )}

            {officerLoading ? (

              <div className="officer-empty-state">

                <div className="officer-empty-icon">
                  ⏳
                </div>

                <h3>
                  Loading officers...
                </h3>

                <p>
                  Loading SmartRent officers.
                </p>

              </div>

            ) : officers.length === 0 ? (

              <div className="officer-empty-state">

                <div className="officer-empty-icon">
                  👤
                </div>

                <h3>
                  No officers yet
                </h3>

                <p>
                  Create an officer account to start
                  managing SmartRent operations.
                </p>

                <button
                  type="button"
                  className="admin-primary-button"
                  onClick={openCreateOfficer}
                >
                  Create First Officer
                </button>

              </div>

            ) : (

              <div
                style={{
                  display: "grid",
                  gap: "16px",
                }}
              >

                {officers.map((officer) => (

                  <article
                    key={officer.officerId}
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      borderRadius:
                        "12px",
                      padding:
                        "18px",
                      background:
                        "#ffffff",
                    }}
                  >

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap:
                          "16px",
                        alignItems:
                          "flex-start",
                      }}
                    >

                      <div>

                        <h3
                          style={{
                            margin: 0,
                          }}
                        >
                          {officer.user.firstName}{" "}
                          {officer.user.lastName}
                        </h3>

                        <p
                          style={{
                            margin:
                              "4px 0 0",
                            color:
                              "#6b7280",
                          }}
                        >
                          @
                          {officer.user.username ||
                            "No username"}
                        </p>

                      </div>

                      <span
                        style={{
                          fontSize:
                            "12px",
                          fontWeight:
                            600,
                          padding:
                            "6px 10px",
                          borderRadius:
                            "999px",
                          background:
                            officer.user
                              .isActive
                              ? "#ecfdf5"
                              : "#f3f4f6",
                          color:
                            officer.user
                              .isActive
                              ? "#047857"
                              : "#6b7280",
                        }}
                      >
                        {officer.user.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>

                    </div>

                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(180px, 1fr))",
                        gap:
                          "14px",
                        marginTop:
                          "18px",
                      }}
                    >

                      <div>

                        <small>
                          Employee ID
                        </small>

                        <strong
                          style={{
                            display:
                              "block",
                            marginTop:
                              "4px",
                          }}
                        >
                          {officer.employeeId}
                        </strong>

                      </div>

                      <div>

                        <small>
                          Government Office
                        </small>

                        <strong
                          style={{
                            display:
                              "block",
                            marginTop:
                              "4px",
                          }}
                        >
                          {officer.office.officeCode}
                        </strong>

                      </div>

                      <div>

                        <small>
                          Office
                        </small>

                        <strong
                          style={{
                            display:
                              "block",
                            marginTop:
                              "4px",
                          }}
                        >
                          {officer.office.officeName}
                        </strong>

                      </div>

                      <div>

                        <small>
                          Sub-City
                        </small>

                        <strong
                          style={{
                            display:
                              "block",
                            marginTop:
                              "4px",
                          }}
                        >
                          {officer.office.subCity ||
                            "Not provided"}
                        </strong>

                      </div>

                      <div>

                        <small>
                          Assigned Area
                        </small>

                        <strong
                          style={{
                            display:
                              "block",
                            marginTop:
                              "4px",
                          }}
                        >
                          {officer.assignedArea ||
                            "Not assigned"}
                        </strong>

                      </div>

                      <div>

                        <small>
                          Position
                        </small>

                        <strong
                          style={{
                            display:
                              "block",
                            marginTop:
                              "4px",
                          }}
                        >
                          {officer.position ||
                            "Not provided"}
                        </strong>

                      </div>

                    </div>

                  </article>

                ))}

              </div>

            )}

          </section>

        </main>

      </div>

      {/* =====================================================
          CREATE OFFICER MODAL
          ===================================================== */}

      {showCreateOfficer && (

        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !loading
            ) {
              closeCreateOfficer();
            }
          }}
        >

          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-officer-title"
          >

            <div className="modal-header">

              <div>

                <h2 id="create-officer-title">
                  Create Officer
                </h2>

                <p>
                  Create a new SmartRent officer
                  and assign a Government Office.
                </p>

              </div>

              <button
                type="button"
                onClick={closeCreateOfficer}
                disabled={loading}
                aria-label="Close"
              >
                ×
              </button>

            </div>

            {error && (
              <div
                className="auth-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="admin-success"
                role="status"
              >
                {success}
              </div>
            )}

            <form
              onSubmit={handleCreateOfficer}
            >

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
                    autoComplete="given-name"
                    disabled={loading}
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
                    autoComplete="family-name"
                    disabled={loading}
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
                  autoComplete="username"
                  disabled={loading}
                  required
                />

              </div>

              <div className="form-row">

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
                    autoComplete="tel"
                    disabled={loading}
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
                    disabled={loading}
                    required
                  />

                </div>

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
                  disabled={loading}
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
                  onChange={handleOfficeChange}
                  disabled={
                    loading ||
                    officeLoading ||
                    offices.length === 0
                  }
                  required
                >
                  <option value="">
                    {officeLoading
                      ? "Loading Government Offices..."
                      : offices.length === 0
                      ? "No Government Offices available"
                      : "Select a Government Office"}
                  </option>

                  {offices.map((office) => (
                    <option
                      key={office.officeId}
                      value={office.officeId}
                    >
                      {office.officeCode} —{" "}
                      {office.officeName}
                    </option>
                  ))}
                </select>

              </div>

              {!officeLoading &&
                offices.length === 0 && (
                  <div
                    className="auth-error"
                    role="alert"
                  >
                    No Government Offices are
                    available.
                  </div>
                )}

              <div className="form-row">

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
                    disabled={loading}
                    required
                  />

                </div>

                <div className="form-group">

                  <label htmlFor="assignedTo">
                    Assigned Area
                  </label>

                  <input
                    id="assignedTo"
                    name="assignedTo"
                    type="text"
                    value={form.assignedTo}
                    onChange={handleChange}
                    placeholder="e.g. Bole area"
                    disabled={loading}
                    required
                  />

                </div>

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
                  autoComplete="new-password"
                  minLength={6}
                  disabled={loading}
                  required
                />

                <small>
                  Minimum 6 characters.
                </small>

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
                  disabled={
                    loading ||
                    officeLoading ||
                    offices.length === 0
                  }
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