import { useMemo, useState } from "react";
import LogoutButton from "../../components/LogoutButton";
import "../../styles/super-admin-dashboard.css";

type AdminForm = {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  nationalId: string;
  password: string;
  employeeId: string;
  officeId: string;
};

type StoredUser = {
  userId?: string;
  username?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
};

function SuperAdminDashboard() {
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState<AdminForm>({
    firstName: "",
    lastName: "",
    username: "",
    phone: "",
    nationalId: "",
    password: "",
    employeeId: "",
    officeId: "1",
  });

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
      : user.username || "Super Admin";

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

  const openCreateAdmin = () => {
    setError("");
    setSuccess("");

    setForm({
      firstName: "",
      lastName: "",
      username: "",
      phone: "",
      nationalId: "",
      password: "",
      employeeId: "",
      officeId: "1",
    });

    setShowCreateAdmin(true);
  };

  const closeCreateAdmin = () => {
    if (loading) {
      return;
    }

    setShowCreateAdmin(false);
    setError("");
    setSuccess("");
  };

  /*
   * ---------------------------------------------------------
   * CREATE ADMIN
   * ---------------------------------------------------------
   */

  const handleCreateAdmin = async (
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
  firstName: form.firstName.trim(),
  lastName: form.lastName.trim(),
  phone: form.phone.trim(),
  nationalId: form.nationalId.trim(),
  username: form.username.trim(),
  password: form.password,
  role: "OFFICE_ADMIN",
  profileData: {
    employeeId: form.employeeId.trim(),
    officeId: Number(form.officeId),
  },
}),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create administrator."
        );
      }

      setSuccess(
        "Administrator created successfully."
      );

      setForm({
        firstName: "",
        lastName: "",
        username: "",
        phone: "",
        nationalId: "",
        password: "",
        employeeId: "",
        officeId: "1",
      });

      setTimeout(() => {
        setShowCreateAdmin(false);
        setSuccess("");
      }, 1200);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Failed to create administrator."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div className="super-admin-page">

      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside className="super-admin-sidebar">

        {/* Brand */}

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


        {/* Divider */}

        <div className="super-admin-sidebar-divider" />


        {/* Navigation */}

        <nav className="super-admin-navigation">

          <button
            type="button"
            className="super-admin-nav-item active"
          >
            <span className="super-admin-nav-icon">
              ▦
            </span>

            <span>Dashboard</span>
          </button>


          <button
            type="button"
            className="super-admin-nav-item"
          >
            <span className="super-admin-nav-icon">
              ♟
            </span>

            <span>Administrators</span>
          </button>


          <button
            type="button"
            className="super-admin-nav-item"
          >
            <span className="super-admin-nav-icon">
              ♟
            </span>

            <span>Officers</span>
          </button>


          <button
            type="button"
            className="super-admin-nav-item"
          >
            <span className="super-admin-nav-icon">
              ⚙
            </span>

            <span>System Settings</span>
          </button>

        </nav>


        {/* Sidebar bottom */}

        <div className="super-admin-sidebar-bottom">

          <div className="super-admin-profile">

            <div className="super-admin-avatar">
              S
            </div>

            <div className="super-admin-profile-info">
              <strong>{displayName}</strong>
              <span>Super Administrator</span>
            </div>

          </div>


          <div className="super-admin-logout">
            <LogoutButton />
          </div>

        </div>

      </aside>


      {/* =====================================================
          MAIN AREA
          ===================================================== */}

      <div className="super-admin-main">

        {/* ===================================================
            TOP BAR
            =================================================== */}

        <header className="super-admin-topbar">

          <div className="super-admin-search">

            <span className="super-admin-search-icon">
              ⌕
            </span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search administrators..."
              aria-label="Search administrators"
            />

          </div>

<div className="super-admin-topbar-user">
  <span className="super-admin-user-status" />
  <span className="super-admin-topbar-name">
    {displayName}
  </span>
</div>

        </header>


        {/* ===================================================
            CONTENT
            =================================================== */}

        <main className="super-admin-content">

          {/* Page heading */}

          <section className="super-admin-page-heading">

            <div>

              <span className="super-admin-eyebrow">
                SYSTEM ADMINISTRATION
              </span>

              <h1>
                Super Admin Dashboard
              </h1>

              <p>
                Manage SmartRent ET administrators and
                system access.
              </p>

            </div>


            <button
              type="button"
              className="super-admin-primary-button"
              onClick={openCreateAdmin}
            >
              <span>+</span>
              Create Admin
            </button>

          </section>


          {/* =================================================
              STATISTICS
              ================================================= */}

          <section className="super-admin-stat-grid">

            {/* Total Administrators */}

            <article className="super-admin-stat-card">

              <div className="super-admin-stat-icon">
                ♟
              </div>

              <div className="super-admin-stat-content">

                <span>
                  Total Administrators
                </span>

                <strong>
                  0
                </strong>

                <small>
                  Registered accounts
                </small>

              </div>

            </article>


            {/* Active Administrators */}

            <article className="super-admin-stat-card">

              <div className="super-admin-stat-icon">
                ✓
              </div>

              <div className="super-admin-stat-content">

                <span>
                  Active Administrators
                </span>

                <strong>
                  0
                </strong>

                <small>
                  Currently active
                </small>

              </div>

            </article>


            {/* System Status */}

            <article className="super-admin-stat-card">

              <div className="super-admin-stat-icon">
                ◎
              </div>

              <div className="super-admin-stat-content">

                <span>
                  System Status
                </span>

                <strong className="system-status-active">
                  Active
                </strong>

                <small>
                  All systems operational
                </small>

              </div>

            </article>

          </section>


          {/* =================================================
              ADMIN MANAGEMENT
              ================================================= */}

          <section className="super-admin-management-card">

            {/* Section header */}

            <div className="super-admin-management-header">

              <div>

                <span className="super-admin-section-eyebrow">
                  USER MANAGEMENT
                </span>

                <h2>
                  Administrators
                </h2>

                <p>
                  Administrators created and managed by
                  the Super Admin.
                </p>

              </div>


              <button
                type="button"
                className="super-admin-outline-button"
                onClick={openCreateAdmin}
              >
                + Create Admin
              </button>

            </div>


            {/* Empty state */}

            <div className="super-admin-empty-state">

              <div className="super-admin-empty-icon">
                ♟
              </div>

              <h3>
                No administrators yet
              </h3>

              <p>
                {search
                  ? `No administrators found for "${search}".`
                  : "Create an administrator account to begin managing SmartRent officers and operations."}
              </p>

              {!search && (
                <button
                  type="button"
                  className="super-admin-primary-button super-admin-empty-button"
                  onClick={openCreateAdmin}
                >
                  Create First Admin
                </button>
              )}

            </div>

          </section>


          {/* Current date */}

          <div className="super-admin-footer-date">
            SmartRent ET Administration · {currentDate}
          </div>

        </main>

      </div>


      {/* =====================================================
          CREATE ADMIN MODAL
          ===================================================== */}

      {showCreateAdmin && (

        <div
          className="super-admin-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !loading
            ) {
              closeCreateAdmin();
            }
          }}
        >

          <div
            className="super-admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-admin-title"
          >

            {/* Modal header */}

            <div className="super-admin-modal-header">

              <div>

                <span className="super-admin-section-eyebrow">
                  USER MANAGEMENT
                </span>

                <h2 id="create-admin-title">
                  Create Administrator
                </h2>

                <p>
                  Create a new SmartRent administrator
                  account.
                </p>

              </div>


              <button
                type="button"
                className="super-admin-modal-close"
                onClick={closeCreateAdmin}
                disabled={loading}
                aria-label="Close"
              >
                ×
              </button>

            </div>


            {/* Error */}

            {error && (

              <div
                className="super-admin-form-error"
                role="alert"
              >
                {error}
              </div>

            )}


            {/* Success */}

            {success && (

              <div
                className="super-admin-form-success"
                role="status"
              >
                {success}
              </div>

            )}


            {/* Form */}

            <form
              className="super-admin-form"
              onSubmit={handleCreateAdmin}
            >

              {/* First + Last */}

              <div className="super-admin-form-row">

                <div className="super-admin-form-group">

                  <label htmlFor="admin-firstName">
                    First Name
                  </label>

                  <input
                    id="admin-firstName"
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


                <div className="super-admin-form-group">

                  <label htmlFor="admin-lastName">
                    Last Name
                  </label>

                  <input
                    id="admin-lastName"
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


              {/* Username */}

              <div className="super-admin-form-group">

                <label htmlFor="admin-username">
                  Username
                </label>

                <input
                  id="admin-username"
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
              <div className="super-admin-form-group">

  <label htmlFor="admin-employeeId">
    Employee ID
  </label>

  <input
    id="admin-employeeId"
    name="employeeId"
    type="text"
    value={form.employeeId}
    onChange={handleChange}
    placeholder="Enter employee ID"
    disabled={loading}
    required
  />

</div>
     <div className="super-admin-form-group">
  <label htmlFor="admin-officeId">
    Government Office
  </label>

  <select
    id="admin-officeId"
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
              {/* Phone */}

              <div className="super-admin-form-group">

                <label htmlFor="admin-phone">
                  Phone Number
                </label>

                <input
                  id="admin-phone"
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


              {/* National ID */}

              <div className="super-admin-form-group">

                <label htmlFor="admin-nationalId">
                  National ID
                </label>

                <input
                  id="admin-nationalId"
                  name="nationalId"
                  type="text"
                  value={form.nationalId}
                  onChange={handleChange}
                  placeholder="Enter national ID"
                  disabled={loading}
                  required
                />

              </div>


              {/* Password */}

              <div className="super-admin-form-group">

                <label htmlFor="admin-password">
                  Temporary Password
                </label>

                <input
                  id="admin-password"
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


              {/* Actions */}

              <div className="super-admin-form-actions">

                <button
                  type="button"
                  className="super-admin-cancel-button"
                  onClick={closeCreateAdmin}
                  disabled={loading}
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="super-admin-primary-button"
                  disabled={loading}
                >
                  {loading
                    ? "Creating..."
                    : "Create Admin"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default SuperAdminDashboard;