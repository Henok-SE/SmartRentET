import { useEffect, useMemo, useState } from "react";
import LogoutButton from "../../components/LogoutButton";
import { apiRequest } from "../../services/api";
import "../../styles/super-admin-dashboard.css";
import { useNavigate } from "react-router-dom";

type GovernmentOffice = {
  officeId: string;
  officeCode: string;
  officeName: string;
  region?: string | null;
  city?: string | null;
  subCity?: string | null;
  woreda?: string | null;
  address?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  createdAt?: string;
};
type OfficeAdmin = {
  officeAdminId: string;
  employeeId: string;
  createdAt: string;
  user: {
    userId: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone: string;
    username?: string | null;
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

type OfficeForm = {
  officeName: string;
  officeCode: string;
  region: string;
  city: string;
  subCity: string;
  woreda: string;
  address: string;
};

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
  userId?: number | string;
  username?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
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

type OfficeAdminListResponse = {
  success: boolean;
  message?: string;
  filters?: {
    officeId?: string;
    subCity?: string;
    isActive?: string;
    officeCode?: string;
  };
  data: OfficeAdmin[];
};
type OfficeCreateResponse = {
  success: boolean;
  message: string;
  data: GovernmentOffice;
};

type CreateAdminResponse = {
  success: boolean;
  message: string;
  data?: unknown;
};

const createEmptyOfficeForm = (): OfficeForm => ({
  officeName: "",
  officeCode: "",
  region: "",
  city: "",
  subCity: "",
  woreda: "",
  address: "",
});

const createEmptyAdminForm = (): AdminForm => ({
  firstName: "",
  lastName: "",
  username: "",
  phone: "",
  nationalId: "",
  password: "",
  employeeId: "",
  officeId: "",
});

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showCreateOffice, setShowCreateOffice] = useState(false);

  const [loading, setLoading] = useState(false);
  const [officeLoading, setOfficeLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [officeError, setOfficeError] = useState("");
  const [officeSuccess, setOfficeSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [offices, setOffices] = useState<GovernmentOffice[]>([]);
  const [admins, setAdmins] = useState<OfficeAdmin[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  
  const [adminForm, setAdminForm] = useState<AdminForm>(
    createEmptyAdminForm
  );

  const [officeForm, setOfficeForm] = useState<OfficeForm>(
    createEmptyOfficeForm
  );

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
      return JSON.parse(storedUser) as StoredUser;
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
   * HELPERS
   * ---------------------------------------------------------
   */

  const resetAdminForm = () => {
    setAdminForm(createEmptyAdminForm());
  };

  const resetOfficeForm = () => {
    setOfficeForm(createEmptyOfficeForm());
  };

  const clearAdminMessages = () => {
    setError("");
    setSuccess("");
  };

  const clearOfficeMessages = () => {
    setOfficeError("");
    setOfficeSuccess("");
  };

  /*
   * ---------------------------------------------------------
   * ADMIN FORM
   * ---------------------------------------------------------
   */

  const handleAdminChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;

    setAdminForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleOfficeSelect = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setAdminForm((previous) => ({
      ...previous,
      officeId: event.target.value,
    }));
  };

  /*
   * ---------------------------------------------------------
   * OFFICE FORM
   * ---------------------------------------------------------
   */

  const handleOfficeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;

    setOfficeForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

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
    } catch (err) {
      if (err instanceof Error) {
        setOfficeError(err.message);
      } else {
        setOfficeError(
          "Failed to load government offices."
        );
      }
    } finally {
      setOfficeLoading(false);
    }
  };

  const loadAdmins = async () => {
  setAdminLoading(true);
  setAdminError("");

  try {
    const token = localStorage.getItem("token");

    const response =
      await apiRequest<OfficeAdminListResponse>(
        "/dashboard/office-admins",
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

    setAdmins(response.data);
  } catch (err) {
    if (err instanceof Error) {
      setAdminError(err.message);
    } else {
      setAdminError(
        "Failed to load administrators."
      );
    }
  } finally {
    setAdminLoading(false);
  }
};
useEffect(() => {
  void loadOffices();
  void loadAdmins();
}, []);
  /*
   * ---------------------------------------------------------
   * OPEN / CLOSE OFFICE MODAL
   * ---------------------------------------------------------
   */

  const openCreateOffice = () => {
    clearOfficeMessages();
    resetOfficeForm();
    setShowCreateOffice(true);
  };

  const closeCreateOffice = () => {
    if (officeLoading) {
      return;
    }

    setShowCreateOffice(false);
    clearOfficeMessages();
  };

  /*
   * ---------------------------------------------------------
   * OPEN / CLOSE ADMIN MODAL
   * ---------------------------------------------------------
   */

  const openCreateAdmin = async () => {
    clearAdminMessages();
    resetAdminForm();
    setShowCreateAdmin(true);

    await loadOffices();
  };

  const closeCreateAdmin = () => {
    if (loading) {
      return;
    }

    setShowCreateAdmin(false);
    clearAdminMessages();
  };

  /*
   * ---------------------------------------------------------
   * CREATE GOVERNMENT OFFICE
   * ---------------------------------------------------------
   */

  const validateOfficeForm = (): string | null => {
    if (!officeForm.officeName.trim()) {
      return "Office name is required.";
    }

    if (!officeForm.officeCode.trim()) {
      return "Office code is required.";
    }

    return null;
  };

  const handleCreateOffice = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    clearOfficeMessages();

    const validationError = validateOfficeForm();

    if (validationError) {
      setOfficeError(validationError);
      return;
    }

    setOfficeLoading(true);

    try {
      const token = localStorage.getItem("token");

      const response =
        await apiRequest<OfficeCreateResponse>(
          "/dashboard/offices",
          {
            method: "POST",
            headers: token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : undefined,
            body: JSON.stringify({
              officeName: officeForm.officeName.trim(),
              officeCode: officeForm.officeCode.trim(),
              region: officeForm.region.trim(),
              city: officeForm.city.trim(),
              subCity: officeForm.subCity.trim(),
              woreda: officeForm.woreda.trim(),
              address: officeForm.address.trim(),
            }),
          }
        );

      setOffices((previous) => {
        const withoutDuplicate = previous.filter(
          (office) =>
            office.officeId !== response.data.officeId
        );

        return [...withoutDuplicate, response.data].sort(
          (a, b) =>
            a.officeName.localeCompare(b.officeName)
        );
      });

      setAdminForm((previous) => ({
        ...previous,
        officeId: response.data.officeId,
      }));

      setOfficeSuccess(
        "Government Office created successfully."
      );

      resetOfficeForm();

      window.setTimeout(() => {
        setShowCreateOffice(false);
        setOfficeSuccess("");
      }, 1000);
    } catch (err) {
      if (err instanceof Error) {
        setOfficeError(err.message);
      } else {
        setOfficeError(
          "Failed to create government office."
        );
      }
    } finally {
      setOfficeLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * CREATE ADMINISTRATOR
   * ---------------------------------------------------------
   */

  const validateAdminForm = (): string | null => {
    if (!adminForm.firstName.trim()) {
      return "First name is required.";
    }

    if (!adminForm.lastName.trim()) {
      return "Last name is required.";
    }

    if (!adminForm.username.trim()) {
      return "Username is required.";
    }

    if (!adminForm.phone.trim()) {
      return "Phone number is required.";
    }

    if (!adminForm.nationalId.trim()) {
      return "National ID is required.";
    }

    if (!adminForm.employeeId.trim()) {
      return "Employee ID is required.";
    }

    if (!adminForm.officeId) {
      return "Please select a Government Office.";
    }

    if (adminForm.password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    return null;
  };

  const handleCreateAdmin = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    clearAdminMessages();

    const validationError = validateAdminForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      await apiRequest<CreateAdminResponse>(
        "/dashboard/office-admins",
        {
          method: "POST",
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
          body: JSON.stringify({
            firstName: adminForm.firstName.trim(),
            lastName: adminForm.lastName.trim(),
            username: adminForm.username.trim(),
            phone: adminForm.phone.trim(),
            nationalId: adminForm.nationalId.trim(),
            employeeId: adminForm.employeeId.trim(),
            officeId: adminForm.officeId,
            password: adminForm.password,
          }),
        }
      );

      setSuccess(
        "Administrator created successfully."
      );

      resetAdminForm();

      window.setTimeout(() => {
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
  className="super-admin-nav-item active"
  onClick={() => navigate("/super-admin")}
>
  <span className="super-admin-nav-icon">
    ▦
  </span>
  <span>Dashboard</span>
</button>

          <button
  type="button"
  className="super-admin-nav-item"
  onClick={() => navigate("/super-admin/administrators")}
>
  <span className="super-admin-nav-icon">
    ♟
  </span>
  <span>Administrators</span>
</button>

         <button
  type="button"
  className="super-admin-nav-item"
  onClick={() => navigate("/super-admin/officers")}
>
  <span className="super-admin-nav-icon">
    ♟
  </span>
  <span>Officers</span>
</button>

          <button
  type="button"
  className="super-admin-nav-item"
  onClick={() => navigate("/super-admin/offices")}
>
  <span className="super-admin-nav-icon">
    ◎
  </span>
  <span>Government Offices</span>
</button>

          <button
  type="button"
  className="super-admin-nav-item"
  onClick={() => navigate("/super-admin/settings")}
>
  <span className="super-admin-nav-icon">
    ⚙
  </span>
  <span>System Settings</span>
</button>
        </nav>

        <div className="super-admin-sidebar-bottom">
          <div className="super-admin-profile">
            <div className="super-admin-avatar">
              {displayName.charAt(0).toUpperCase()}
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

      <div className="super-admin-main">
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

        <main className="super-admin-content">
          <section className="super-admin-page-heading">
            <div>
              <span className="super-admin-eyebrow">
                SYSTEM ADMINISTRATION
              </span>

              <h1>Super Admin Dashboard</h1>

              <p>
                Manage SmartRent ET administrators,
                government offices, and system access.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="super-admin-outline-button"
                onClick={openCreateOffice}
              >
                + Create Government Office
              </button>

              <button
                type="button"
                className="super-admin-primary-button"
                onClick={openCreateAdmin}
              >
                <span>+</span>
                Create Admin
              </button>
            </div>
          </section>

          <section className="super-admin-stat-grid">
            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ♟
              </div>

              <div className="super-admin-stat-content">
                <span>Total Administrators</span>
                <strong>{admins.length}</strong>
                <small>Registered accounts</small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ✓
              </div>

              <div className="super-admin-stat-content">
                <span>Active Administrators</span>
                <strong>
  {admins.filter((admin) => admin.user.isActive).length}
</strong>
                <small>Currently active</small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ◎
              </div>

              <div className="super-admin-stat-content">
                <span>Government Offices</span>
                <strong>{offices.length}</strong>
                <small>Available offices</small>
              </div>
            </article>
          </section>

          <section className="super-admin-management-card">
            <div className="super-admin-management-header">
              <div>
                <span className="super-admin-section-eyebrow">
                  USER MANAGEMENT
                </span>

                <h2>Administrators</h2>

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

           {adminError && (
  <div
    className="super-admin-form-error"
    role="alert"
  >
    {adminError}
  </div>
)}

{adminLoading ? (
  <div className="super-admin-empty-state">
    <div className="super-admin-empty-icon">
      ⏳
    </div>

    <h3>Loading administrators...</h3>

    <p>
      Retrieving Office Administrator accounts.
    </p>
  </div>
) : admins.length === 0 ? (
  <div className="super-admin-empty-state">
    <div className="super-admin-empty-icon">
      ♟
    </div>

    <h3>No administrators yet</h3>

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
) : (
  <div
    style={{
      display: "grid",
      gap: "12px",
      padding: "20px 0",
    }}
  >
    {admins
      .filter((admin) => {
        const query = search.trim().toLowerCase();

        if (!query) {
          return true;
        }

        return [
          admin.user.firstName,
          admin.user.lastName,
          admin.user.username,
          admin.user.email,
          admin.user.phone,
          admin.employeeId,
          admin.office.officeCode,
          admin.office.officeName,
          admin.office.city,
          admin.office.subCity,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(query)
          );
      })
      .map((admin) => (
        <article
          key={admin.officeAdminId}
          style={{
            padding: "16px",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            background: "#ffffff",
          }}
        >
          <strong>
            {admin.user.firstName}{" "}
            {admin.user.lastName}
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              color: "#6b7280",
            }}
          >
            @{admin.user.username || "No username"} ·{" "}
            {admin.employeeId}
          </p>

          <p
            style={{
              margin: "6px 0 0",
              color: "#6b7280",
            }}
          >
            {admin.office.officeCode} —{" "}
            {admin.office.officeName}
          </p>

          <p
            style={{
              margin: "6px 0 0",
              color: admin.user.isActive
                ? "#047857"
                : "#b91c1c",
              fontWeight: 600,
            }}
          >
            {admin.user.isActive
              ? "Active"
              : "Inactive"}
          </p>
        </article>
      ))}
  </div>
)}
          </section>

          <section className="super-admin-management-card">
            <div className="super-admin-management-header">
              <div>
                <span className="super-admin-section-eyebrow">
                  OFFICE MANAGEMENT
                </span>

                <h2>Government Offices</h2>

                <p>
                  Government offices available for Office
                  Administrators.
                </p>
              </div>

              <button
                type="button"
                className="super-admin-outline-button"
                onClick={openCreateOffice}
              >
                + Create Office
              </button>
            </div>

            {officeError && (
              <div
                className="super-admin-form-error"
                role="alert"
              >
                {officeError}
              </div>
            )}

            {officeLoading && offices.length === 0 ? (
              <div className="super-admin-empty-state">
                <div className="super-admin-empty-icon">
                  ⏳
                </div>

                <h3>Loading government offices...</h3>

                <p>
                  Retrieving available offices.
                </p>
              </div>
            ) : offices.length === 0 ? (
              <div className="super-admin-empty-state">
                <div className="super-admin-empty-icon">
                  ◎
                </div>

                <h3>No government offices yet</h3>

                <p>
                  Create a Government Office before
                  assigning administrators to it.
                </p>

                <button
                  type="button"
                  className="super-admin-primary-button super-admin-empty-button"
                  onClick={openCreateOffice}
                >
                  Create First Office
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "12px",
                  padding: "20px 0",
                }}
              >
                {offices
                  .filter((office) => {
                    const query =
                      search.trim().toLowerCase();

                    if (!query) {
                      return true;
                    }

                    return [
                      office.officeCode,
                      office.officeName,
                      office.city,
                      office.subCity,
                      office.region,
                    ]
                      .filter(Boolean)
                      .some((value) =>
                        String(value)
                          .toLowerCase()
                          .includes(query)
                      );
                  })
                  .map((office) => (
                    <article
                      key={office.officeId}
                      style={{
                        padding: "16px",
                        border:
                          "1px solid #e5e7eb",
                        borderRadius:
                          "10px",
                        background:
                          "#ffffff",
                      }}
                    >
                      <strong>
                        {office.officeCode} —{" "}
                        {office.officeName}
                      </strong>

                      <p
                        style={{
                          margin: "6px 0 0",
                          color: "#6b7280",
                        }}
                      >
                        {[
                          office.city,
                          office.subCity,
                          office.region,
                        ]
                          .filter(Boolean)
                          .join(" · ") ||
                          "Location not provided"}
                      </p>
                    </article>
                  ))}
              </div>
            )}
          </section>

          <div className="super-admin-footer-date">
            SmartRent ET Administration · {currentDate}
          </div>
        </main>
      </div>

      {/* =====================================================
          CREATE OFFICE MODAL
          ===================================================== */}

      {showCreateOffice && (
        <div
          className="super-admin-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !officeLoading
            ) {
              closeCreateOffice();
            }
          }}
        >
          <div
            className="super-admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-office-title"
          >
            <div className="super-admin-modal-header">
              <div>
                <span className="super-admin-section-eyebrow">
                  OFFICE MANAGEMENT
                </span>

                <h2 id="create-office-title">
                  Create Government Office
                </h2>

                <p>
                  Create a government office before
                  assigning administrators to it.
                </p>
              </div>

              <button
                type="button"
                className="super-admin-modal-close"
                onClick={closeCreateOffice}
                disabled={officeLoading}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {officeError && (
              <div
                className="super-admin-form-error"
                role="alert"
              >
                {officeError}
              </div>
            )}

            {officeSuccess && (
              <div
                className="super-admin-form-success"
                role="status"
              >
                {officeSuccess}
              </div>
            )}

            <form
              className="super-admin-form"
              onSubmit={handleCreateOffice}
            >
              <div className="super-admin-form-group">
                <label htmlFor="office-officeName">
                  Office Name
                </label>

                <input
                  id="office-officeName"
                  name="officeName"
                  type="text"
                  value={officeForm.officeName}
                  onChange={handleOfficeChange}
                  placeholder="e.g. Addis Ababa Rental Office"
                  disabled={officeLoading}
                  required
                />
              </div>

              <div className="super-admin-form-group">
                <label htmlFor="office-officeCode">
                  Office Code
                </label>

                <input
                  id="office-officeCode"
                  name="officeCode"
                  type="text"
                  value={officeForm.officeCode}
                  onChange={handleOfficeChange}
                  placeholder="e.g. ADDIS-001"
                  disabled={officeLoading}
                  required
                />
              </div>

              <div className="super-admin-form-row">
                <div className="super-admin-form-group">
                  <label htmlFor="office-region">
                    Region
                  </label>

                  <input
                    id="office-region"
                    name="region"
                    type="text"
                    value={officeForm.region}
                    onChange={handleOfficeChange}
                    placeholder="e.g. Addis Ababa"
                    disabled={officeLoading}
                    required
                  />
                </div>

                <div className="super-admin-form-group">
                  <label htmlFor="office-city">
                    City
                  </label>

                  <input
                    id="office-city"
                    name="city"
                    type="text"
                    value={officeForm.city}
                    onChange={handleOfficeChange}
                    placeholder="e.g. Addis Ababa"
                    disabled={officeLoading}
                    required
                  />
                </div>
              </div>

              <div className="super-admin-form-row">
                <div className="super-admin-form-group">
                  <label htmlFor="office-subCity">
                    Sub-City
                  </label>

                  <input
                    id="office-subCity"
                    name="subCity"
                    type="text"
                    value={officeForm.subCity}
                    onChange={handleOfficeChange}
                    placeholder="e.g. Bole"
                    disabled={officeLoading}
                    required
                  />
                </div>

                <div className="super-admin-form-group">
                  <label htmlFor="office-woreda">
                    Woreda
                  </label>

                  <input
                    id="office-woreda"
                    name="woreda"
                    type="text"
                    value={officeForm.woreda}
                    onChange={handleOfficeChange}
                    placeholder="e.g. 03"
                    disabled={officeLoading}
                    required
                  />
                </div>
              </div>

              <div className="super-admin-form-group">
                <label htmlFor="office-address">
                  Address
                </label>

                <input
                  id="office-address"
                  name="address"
                  type="text"
                  value={officeForm.address}
                  onChange={handleOfficeChange}
                  placeholder="Enter office address"
                  disabled={officeLoading}
                  required
                />
              </div>

              <div className="super-admin-form-actions">
                <button
                  type="button"
                  className="super-admin-cancel-button"
                  onClick={closeCreateOffice}
                  disabled={officeLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="super-admin-primary-button"
                  disabled={officeLoading}
                >
                  {officeLoading
                    ? "Creating..."
                    : "Create Government Office"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            <div className="super-admin-modal-header">
              <div>
                <span className="super-admin-section-eyebrow">
                  USER MANAGEMENT
                </span>

                <h2 id="create-admin-title">
                  Create Administrator
                </h2>

                <p>
                  Create an Office Administrator and assign
                  an existing Government Office.
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

            {error && (
              <div
                className="super-admin-form-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="super-admin-form-success"
                role="status"
              >
                {success}
              </div>
            )}

            <form
              className="super-admin-form"
              onSubmit={handleCreateAdmin}
            >
              <div className="super-admin-form-section">
                <div className="super-admin-form-section-header">
                  <span className="super-admin-section-eyebrow">
                    USER MANAGEMENT
                  </span>

                  <h3>Administrator Information</h3>

                  <p>
                    Enter the account information for the new
                    Office Administrator.
                  </p>
                </div>

                <div className="super-admin-form-row">
                  <div className="super-admin-form-group">
                    <label htmlFor="admin-firstName">
                      First Name
                    </label>

                    <input
                      id="admin-firstName"
                      name="firstName"
                      type="text"
                      value={adminForm.firstName}
                      onChange={handleAdminChange}
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
                      value={adminForm.lastName}
                      onChange={handleAdminChange}
                      placeholder="Enter last name"
                      autoComplete="family-name"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="super-admin-form-row">
                  <div className="super-admin-form-group">
                    <label htmlFor="admin-username">
                      Username
                    </label>

                    <input
                      id="admin-username"
                      name="username"
                      type="text"
                      value={adminForm.username}
                      onChange={handleAdminChange}
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
                      value={adminForm.employeeId}
                      onChange={handleAdminChange}
                      placeholder="Enter employee ID"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="super-admin-form-row">
                  <div className="super-admin-form-group">
                    <label htmlFor="admin-phone">
                      Phone Number
                    </label>

                    <input
                      id="admin-phone"
                      name="phone"
                      type="tel"
                      value={adminForm.phone}
                      onChange={handleAdminChange}
                      placeholder="Enter phone number"
                      autoComplete="tel"
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="super-admin-form-group">
                    <label htmlFor="admin-nationalId">
                      National ID
                    </label>

                    <input
                      id="admin-nationalId"
                      name="nationalId"
                      type="text"
                      value={adminForm.nationalId}
                      onChange={handleAdminChange}
                      placeholder="Enter national ID"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="super-admin-form-group">
                  <label htmlFor="admin-password">
                    Temporary Password
                  </label>

                  <input
                    id="admin-password"
                    name="password"
                    type="password"
                    value={adminForm.password}
                    onChange={handleAdminChange}
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
              </div>

              <div className="super-admin-form-section">
                <div className="super-admin-form-section-header">
                  <span className="super-admin-section-eyebrow">
                    GOVERNMENT OFFICE
                  </span>

                  <h3>Assign Government Office</h3>

                  <p>
                    Select an existing Government Office for
                    this administrator.
                  </p>
                </div>

                <div className="super-admin-form-group">
                  <label htmlFor="admin-officeId">
                    Government Office
                  </label>

                  <select
                    id="admin-officeId"
                    name="officeId"
                    value={adminForm.officeId}
                    onChange={handleOfficeSelect}
                    disabled={
                      loading ||
                      officeLoading ||
                      offices.length === 0
                    }
                    required
                  >
                    <option value="">
                      {officeLoading
                        ? "Loading offices..."
                        : offices.length === 0
                        ? "No government offices available"
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

                {offices.length === 0 &&
                  !officeLoading && (
                    <div
                      className="super-admin-form-success"
                      role="status"
                    >
                      No Government Offices exist yet.
                      Close this dialog and create an office
                      first.
                    </div>
                  )}
              </div>

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
                  disabled={
                    loading ||
                    officeLoading ||
                    offices.length === 0
                  }
                >
                  {loading
                    ? "Creating..."
                    : "Create Administrator"}
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