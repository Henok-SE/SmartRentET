import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "../../components/LogoutButton";
import { apiRequest } from "../../services/api";
import "../../styles/super-admin-dashboard.css";

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
  stats?: {
    officers: number;
    admins: number;
    agreements: number;
  };
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
    isNationalIdVerified?: boolean;
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

  totalSuperAdmins: number;
  activeSuperAdmins: number;

  totalOfficeAdmins: number;
  activeOfficeAdmins: number;
};

type SummaryResponse = {
  success: boolean;
  message?: string;
  data: DashboardSummary;
};

type OfficeListResponse = {
  success: boolean;
  message?: string;
  data: GovernmentOffice[];
};

type OfficeAdminListResponse = {
  success: boolean;
  message?: string;
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
  data?: {
    user?: {
      userId: string;
      firstName: string;
      lastName: string;
      username?: string | null;
      phone: string;
      email?: string | null;
      role: string;
      isActive: boolean;
      isNationalIdVerified: boolean;
    };
    generatedUsername?: string;
    passwordSent?: boolean;
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
  employeeId: "",
  officeId: "",
});

function SuperAdminDashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);

  const [offices, setOffices] =
    useState<GovernmentOffice[]>([]);

  const [admins, setAdmins] =
    useState<OfficeAdmin[]>([]);

  const [summaryLoading, setSummaryLoading] =
    useState(true);

  const [officeLoading, setOfficeLoading] =
    useState(false);

  const [adminLoading, setAdminLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [officeError, setOfficeError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [officeSuccess, setOfficeSuccess] =
    useState("");

  const [search, setSearch] = useState("");

  const [showCreateOffice, setShowCreateOffice] =
    useState(false);

  const [showCreateAdmin, setShowCreateAdmin] =
    useState(false);

  const [officeForm, setOfficeForm] =
    useState<OfficeForm>(
      createEmptyOfficeForm()
    );

  const [adminForm, setAdminForm] =
    useState<AdminForm>(
      createEmptyAdminForm()
    );

  /*
   * =========================================================
   * CURRENT USER
   * =========================================================
   */

  const storedUser =
    localStorage.getItem("user");

  const user: StoredUser = useMemo(() => {
    if (!storedUser) {
      return {};
    }

    try {
      return JSON.parse(
        storedUser
      ) as StoredUser;
    } catch {
      return {};
    }
  }, [storedUser]);

  const displayName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username || "Super Admin";

  /*
   * =========================================================
   * DATE
   * =========================================================
   */

  const currentDate =
    new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date());

  /*
   * =========================================================
   * AUTH HEADER
   * =========================================================
   */

  const getAuthHeaders = () => {
    const token =
      localStorage.getItem("token");

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined;
  };

  /*
   * =========================================================
   * LOAD SUMMARY
   * =========================================================
   */

  const loadSummary = async () => {
    setSummaryLoading(true);
    setError("");

    try {
      const response =
        await apiRequest<SummaryResponse>(
          "/dashboard/summary",
          {
            method: "GET",
            cache: "no-store",
            headers: getAuthHeaders(),
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
      setSummaryLoading(false);
    }
  };

  /*
   * =========================================================
   * LOAD OFFICES
   * =========================================================
   */

  const loadOffices = async () => {
    setOfficeLoading(true);
    setOfficeError("");

    try {
      const response =
        await apiRequest<OfficeListResponse>(
          "/dashboard/offices",
          {
            method: "GET",
            cache: "no-store",
            headers: getAuthHeaders(),
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

  /*
   * =========================================================
   * LOAD ADMINISTRATORS
   * =========================================================
   */

  const loadAdmins = async () => {
    setAdminLoading(true);
    setError("");

    try {
      const response =
        await apiRequest<OfficeAdminListResponse>(
          "/dashboard/office-admins",
          {
            method: "GET",
            cache: "no-store",
            headers: getAuthHeaders(),
          }
        );

      setAdmins(response.data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Failed to load administrators."
        );
      }
    } finally {
      setAdminLoading(false);
    }
  };

  /*
   * =========================================================
   * LOAD ALL DASHBOARD DATA
   * =========================================================
   */

  const loadDashboard = async () => {
    setError("");

    await Promise.all([
      loadSummary(),
      loadOffices(),
      loadAdmins(),
    ]);
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  /*
   * =========================================================
   * SEARCHED ADMINS
   * =========================================================
   */

  const filteredAdmins = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return admins;
    }

    return admins.filter((admin) =>
      [
        admin.user.firstName,
        admin.user.lastName,
        admin.user.username,
        admin.user.email,
        admin.user.phone,
        admin.employeeId,
        admin.office.officeCode,
        admin.office.officeName,
        admin.office.region,
        admin.office.city,
        admin.office.subCity,
        admin.office.woreda,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        )
    );
  }, [admins, search]);

  /*
   * =========================================================
   * SEARCHED OFFICES
   * =========================================================
   */

  const filteredOffices = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return offices;
    }

    return offices.filter((office) =>
      [
        office.officeCode,
        office.officeName,
        office.region,
        office.city,
        office.subCity,
        office.woreda,
        office.address,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        )
    );
  }, [offices, search]);

  /*
   * =========================================================
   * FORM HANDLERS
   * =========================================================
   */

  const handleOfficeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } =
      event.target;

    setOfficeForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleAdminChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } =
      event.target;

    setAdminForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleAdminOfficeChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setAdminForm((previous) => ({
      ...previous,
      officeId: event.target.value,
    }));
  };

  /*
   * =========================================================
   * OPEN/CLOSE CREATE OFFICE
   * =========================================================
   */

  const openCreateOffice = () => {
    setOfficeError("");
    setOfficeSuccess("");
    setOfficeForm(
      createEmptyOfficeForm()
    );
    setShowCreateOffice(true);
  };

  const closeCreateOffice = () => {
    if (officeLoading) {
      return;
    }

    setShowCreateOffice(false);
    setOfficeError("");
    setOfficeSuccess("");
    setOfficeForm(
      createEmptyOfficeForm()
    );
  };

  /*
   * =========================================================
   * OPEN/CLOSE CREATE ADMIN
   * =========================================================
   */

  const openCreateAdmin = async () => {
    setError("");
    setSuccess("");
    setAdminForm(
      createEmptyAdminForm()
    );
    setShowCreateAdmin(true);

    if (offices.length === 0) {
      await loadOffices();
    }
  };

  const closeCreateAdmin = () => {
    if (adminLoading) {
      return;
    }

    setShowCreateAdmin(false);
    setError("");
    setSuccess("");
    setAdminForm(
      createEmptyAdminForm()
    );
  };

  /*
   * =========================================================
   * CREATE OFFICE
   * =========================================================
   */

  const handleCreateOffice = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setOfficeError("");
    setOfficeSuccess("");

    if (!officeForm.officeName.trim()) {
      setOfficeError(
        "Office name is required."
      );
      return;
    }

    if (!officeForm.officeCode.trim()) {
      setOfficeError(
        "Office code is required."
      );
      return;
    }

    setOfficeLoading(true);

    try {
      const response =
        await apiRequest<OfficeCreateResponse>(
          "/dashboard/offices",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              ...(getAuthHeaders() || {}),
            },
            body: JSON.stringify({
              officeName:
                officeForm.officeName.trim(),
              officeCode:
                officeForm.officeCode.trim(),
              region:
                officeForm.region.trim() || null,
              city:
                officeForm.city.trim() || null,
              subCity:
                officeForm.subCity.trim() ||
                null,
              woreda:
                officeForm.woreda.trim() ||
                null,
              address:
                officeForm.address.trim() ||
                null,
            }),
          }
        );

      setOffices((previous) => [
        response.data,
        ...previous.filter(
          (office) =>
            office.officeId !==
            response.data.officeId
        ),
      ]);

      await loadSummary();

      setOfficeSuccess(
        "Government Office created successfully."
      );

      setOfficeForm(
        createEmptyOfficeForm()
      );

      window.setTimeout(() => {
        setShowCreateOffice(false);
        setOfficeSuccess("");
      }, 1200);
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
   * =========================================================
   * CREATE OFFICE ADMIN
   * =========================================================
   */

  const handleCreateAdmin = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!adminForm.firstName.trim()) {
      setError(
        "First name is required."
      );
      return;
    }

    if (!adminForm.lastName.trim()) {
      setError(
        "Last name is required."
      );
      return;
    }

    if (!adminForm.username.trim()) {
      setError(
        "Username is required."
      );
      return;
    }

    if (!adminForm.phone.trim()) {
      setError(
        "Phone number is required."
      );
      return;
    }

    if (!adminForm.nationalId.trim()) {
      setError(
        "National ID is required."
      );
      return;
    }

    if (!adminForm.employeeId.trim()) {
      setError(
        "Employee ID is required."
      );
      return;
    }

    if (!adminForm.officeId) {
      setError(
        "Please select a Government Office."
      );
      return;
    }

    setAdminLoading(true);

    try {
      const response =
        await apiRequest<CreateAdminResponse>(
          "/auth/office-admin",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              ...(getAuthHeaders() || {}),
            },
            body: JSON.stringify({
              firstName:
                adminForm.firstName.trim(),
              lastName:
                adminForm.lastName.trim(),
              username:
                adminForm.username.trim(),
              phone:
                adminForm.phone.trim(),
              nationalId:
                adminForm.nationalId.trim(),
              employeeId:
                adminForm.employeeId.trim(),
              officeId:
                adminForm.officeId,
            }),
          }
        );

      const username =
        response.data?.generatedUsername ||
        adminForm.username.trim();

      setSuccess(
        response.data?.passwordSent
          ? `Administrator created successfully. Username: ${username}. The generated password has been sent via SMS.`
          : `Administrator created successfully. Username: ${username}.`
      );

      await Promise.all([
        loadAdmins(),
        loadSummary(),
      ]);

      setAdminForm(
        createEmptyAdminForm()
      );

      window.setTimeout(() => {
        setShowCreateAdmin(false);
        setSuccess("");
      }, 1800);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Failed to create administrator."
        );
      }
    } finally {
      setAdminLoading(false);
    }
  };

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
            className="super-admin-nav-item active"
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
  className="super-admin-nav-item"
  onClick={() =>
    navigate("/super-admin/agreements")
  }
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
        {/* TOP BAR */}

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
              placeholder="Search administrators or offices..."
              aria-label="Search administrators or offices"
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

        {/* CONTENT */}

        <main className="super-admin-content">
          {/* PAGE HEADER */}

          <section className="super-admin-page-heading">
            <div>
              <span className="super-admin-eyebrow">
                SYSTEM ADMINISTRATION
              </span>

              <h1>
                Super Admin Dashboard
              </h1>

              <p>
                Manage SmartRent ET administrators,
                government offices, officers, and
                system activity.
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

          {/* ERROR */}

          {error && (
            <div
              className="super-admin-form-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {success && !showCreateAdmin && (
            <div
              className="super-admin-form-success"
              role="status"
            >
              {success}
            </div>
          )}

          {/* =================================================
              SYSTEM STATISTICS
              ================================================= */}

          <section className="super-admin-stat-grid">
            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ♟
              </div>

              <div className="super-admin-stat-content">
                <span>
                  Total Administrators
                </span>

                <strong>
                  {summaryLoading
                    ? "—"
                    : summary
                      ? summary.totalOfficeAdmins
                      : admins.length}
                </strong>

                <small>
                  {summary
                    ? `${summary.activeOfficeAdmins} active`
                    : "Office Administrator accounts"}
                </small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ♟
              </div>

              <div className="super-admin-stat-content">
                <span>Total Officers</span>

                <strong>
                  {summaryLoading
                    ? "—"
                    : summary?.totalOfficers ?? 0}
                </strong>

                <small>
                  Registered officer accounts
                </small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ◎
              </div>

              <div className="super-admin-stat-content">
                <span>
                  Government Offices
                </span>

                <strong>
                  {summaryLoading
                    ? "—"
                    : summary?.totalOffices ?? offices.length}
                </strong>

                <small>
                  Registered offices
                </small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                □
              </div>

              <div className="super-admin-stat-content">
                <span>
                  Total Agreements
                </span>

                <strong>
                  {summaryLoading
                    ? "—"
                    : summary?.totalAgreements ?? 0}
                </strong>

                <small>
                  Rental agreements
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
                  {summaryLoading
                    ? "—"
                    : summary?.activeAgreements ?? 0}
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
                  {summaryLoading
                    ? "—"
                    : summary?.pendingAgreements ?? 0}
                </strong>

                <small>
                  Awaiting verification
                </small>
              </div>
            </article>
          </section>

          {/* =================================================
              ADDITIONAL SYSTEM OVERVIEW
              ================================================= */}

          <section className="super-admin-stat-grid">
            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                $
              </div>

              <div className="super-admin-stat-content">
                <span>Total Payments</span>

                <strong>
                  {summaryLoading
                    ? "—"
                    : summary?.totalPayments ?? 0}
                </strong>

                <small>
                  Recorded payments
                </small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ✓
              </div>

              <div className="super-admin-stat-content">
                <span>
                  Collected Payments
                </span>

                <strong>
                  {summaryLoading
                    ? "—"
                    : summary?.collectedPayments ?? 0}
                </strong>

                <small>
                  Paid payments
                </small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                !
              </div>

              <div className="super-admin-stat-content">
                <span>
                  Overdue Payments
                </span>

                <strong>
                  {summaryLoading
                    ? "—"
                    : summary?.overduePayments ?? 0}
                </strong>

                <small>
                  Currently overdue
                </small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                ?
              </div>

              <div className="super-admin-stat-content">
                <span>
                  Pending Verifications
                </span>

                <strong>
                  {summaryLoading
                    ? "—"
                    : summary?.pendingVerifications ?? 0}
                </strong>

                <small>
                  Awaiting verification
                </small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                L
              </div>

              <div className="super-admin-stat-content">
                <span>Landlords</span>

                <strong>
                  {summaryLoading
                    ? "—"
                    : summary?.totalLandlords ?? 0}
                </strong>

                <small>
                  Registered landlords
                </small>
              </div>
            </article>

            <article className="super-admin-stat-card">
              <div className="super-admin-stat-icon">
                T
              </div>

              <div className="super-admin-stat-content">
                <span>Tenants</span>

                <strong>
                  {summaryLoading
                    ? "—"
                    : summary?.totalTenants ?? 0}
                </strong>

                <small>
                  Registered tenants
                </small>
              </div>
            </article>
          </section>

          {/* =================================================
              ADMINISTRATORS
              ================================================= */}

          <section className="super-admin-management-card">
            <div className="super-admin-management-header">
              <div>
                <span className="super-admin-section-eyebrow">
                  USER MANAGEMENT
                </span>

                <h2>Administrators</h2>

                <p>
                  Office Administrators registered
                  in SmartRent ET.
                </p>
              </div>

              <button
                type="button"
                className="super-admin-outline-button"
                onClick={() =>
                  navigate(
                    "/super-admin/administrators"
                  )
                }
              >
                View All
              </button>
            </div>

            {adminLoading ? (
              <div className="super-admin-empty-state">
                <div className="super-admin-empty-icon">
                  ⏳
                </div>

                <h3>
                  Loading administrators...
                </h3>

                <p>
                  Retrieving Office Administrator
                  accounts.
                </p>
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="super-admin-empty-state">
                <div className="super-admin-empty-icon">
                  ♟
                </div>

                <h3>
                  {search
                    ? "No administrators found"
                    : "No administrators yet"}
                </h3>

                <p>
                  {search
                    ? `No administrators match "${search}".`
                    : "Create an administrator account to begin managing SmartRent operations."}
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
                      "900px",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign: "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Administrator
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign: "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Employee ID
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign: "left",
                          borderBottom:
                            "1px solid #e8edeb",
                          color:
                            "#5f707a",
                          fontSize:
                            "13px",
                        }}
                      >
                        Government Office
                      </th>

                      <th
                        style={{
                          padding:
                            "14px 12px",
                          textAlign: "left",
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
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAdmins
                      .slice(0, 5)
                      .map((admin) => (
                        <tr
                          key={
                            admin.officeAdminId
                          }
                        >
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
                                admin.user
                                  .firstName
                              }{" "}
                              {
                                admin.user
                                  .lastName
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
                              @
                              {admin.user
                                .username ||
                                "No username"}
                            </div>
                          </td>

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
                              admin.employeeId
                            }
                          </td>

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
                                admin.office
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
                                admin.office
                                  .officeName
                              }
                            </div>
                          </td>

                          <td
                            style={{
                              padding:
                                "16px 12px",
                              borderBottom:
                                "1px solid #eef2f0",
                            }}
                          >
                            <span
                              style={{
                                display:
                                  "inline-block",
                                padding:
                                  "6px 10px",
                                borderRadius:
                                  "999px",
                                background:
                                  admin.user
                                    .isActive
                                    ? "#e6f7f3"
                                    : "#f3f4f6",
                                color:
                                  admin.user
                                    .isActive
                                    ? "#008f78"
                                    : "#6b7280",
                                fontSize:
                                  "12px",
                                fontWeight:
                                  700,
                              }}
                            >
                              {admin.user
                                .isActive
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* =================================================
              GOVERNMENT OFFICES
              ================================================= */}

          <section className="super-admin-management-card">
            <div className="super-admin-management-header">
              <div>
                <span className="super-admin-section-eyebrow">
                  OFFICE MANAGEMENT
                </span>

                <h2>
                  Government Offices
                </h2>

                <p>
                  Offices available for
                  administrators and officers.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  className="super-admin-outline-button"
                  onClick={() =>
                    navigate(
                      "/super-admin/offices"
                    )
                  }
                >
                  View All
                </button>

                <button
                  type="button"
                  className="super-admin-primary-button"
                  onClick={openCreateOffice}
                >
                  + Create Office
                </button>
              </div>
            </div>

            {officeError && (
              <div
                className="super-admin-form-error"
                role="alert"
              >
                {officeError}
              </div>
            )}

            {officeLoading &&
            offices.length === 0 ? (
              <div className="super-admin-empty-state">
                <div className="super-admin-empty-icon">
                  ⏳
                </div>

                <h3>
                  Loading government offices...
                </h3>

                <p>
                  Retrieving available
                  offices.
                </p>
              </div>
            ) : filteredOffices.length === 0 ? (
              <div className="super-admin-empty-state">
                <div className="super-admin-empty-icon">
                  ◎
                </div>

                <h3>
                  {search
                    ? "No offices found"
                    : "No government offices yet"}
                </h3>

                <p>
                  {search
                    ? `No offices match "${search}".`
                    : "Create a Government Office before assigning administrators or officers."}
                </p>

                {!search && (
                  <button
                    type="button"
                    className="super-admin-primary-button super-admin-empty-button"
                    onClick={
                      openCreateOffice
                    }
                  >
                    Create First Office
                  </button>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "12px",
                  padding:
                    "20px 28px 28px",
                }}
              >
                {filteredOffices
                  .slice(0, 6)
                  .map((office) => (
                    <article
                      key={office.officeId}
                      style={{
                        padding:
                          "18px",
                        border:
                          "1px solid #e5ebe8",
                        borderRadius:
                          "8px",
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
                          alignItems:
                            "flex-start",
                          gap: "16px",
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              color:
                                "#111820",
                              fontSize:
                                "15px",
                            }}
                          >
                            {
                              office.officeCode
                            }{" "}
                            —{" "}
                            {
                              office.officeName
                            }
                          </strong>

                          <p
                            style={{
                              margin:
                                "6px 0 0",
                              color:
                                "#778790",
                              fontSize:
                                "13px",
                            }}
                          >
                            {[
                              office.city,
                              office.subCity,
                              office.region,
                            ]
                              .filter(
                                Boolean
                              )
                              .join(
                                " · "
                              ) ||
                              "Location not provided"}
                          </p>
                        </div>

                        <span
                          style={{
                            padding:
                              "6px 10px",
                            borderRadius:
                              "999px",
                            background:
                              office.status ===
                              "ACTIVE"
                                ? "#e6f7f3"
                                : "#f3f4f6",
                            color:
                              office.status ===
                              "ACTIVE"
                                ? "#008f78"
                                : "#6b7280",
                            fontSize:
                              "11px",
                            fontWeight:
                              700,
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {office.status ||
                            "UNKNOWN"}
                        </span>
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: "22px",
                          marginTop:
                            "14px",
                          color:
                            "#84929a",
                          fontSize:
                            "12px",
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <span>
                          Officers:{" "}
                          <strong
                            style={{
                              color:
                                "#53636c",
                            }}
                          >
                            {office.stats
                              ?.officers ??
                              0}
                          </strong>
                        </span>

                        <span>
                          Admins:{" "}
                          <strong
                            style={{
                              color:
                                "#53636c",
                            }}
                          >
                            {office.stats
                              ?.admins ??
                              0}
                          </strong>
                        </span>

                        <span>
                          Agreements:{" "}
                          <strong
                            style={{
                              color:
                                "#53636c",
                            }}
                          >
                            {office.stats
                              ?.agreements ??
                              0}
                          </strong>
                        </span>
                      </div>
                    </article>
                  ))}
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
          CREATE GOVERNMENT OFFICE MODAL
          ===================================================== */}

      {showCreateOffice && (
        <div
          className="super-admin-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
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
                  Create a new Government
                  Office for SmartRent ET.
                </p>
              </div>

              <button
                type="button"
                className="super-admin-modal-close"
                onClick={
                  closeCreateOffice
                }
                disabled={
                  officeLoading
                }
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
              onSubmit={
                handleCreateOffice
              }
            >
              <div className="super-admin-form-group">
                <label htmlFor="office-officeName">
                  Office Name
                </label>

                <input
                  id="office-officeName"
                  name="officeName"
                  type="text"
                  value={
                    officeForm.officeName
                  }
                  onChange={
                    handleOfficeChange
                  }
                  placeholder="e.g. Addis Ababa Rental Office"
                  disabled={
                    officeLoading
                  }
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
                  value={
                    officeForm.officeCode
                  }
                  onChange={
                    handleOfficeChange
                  }
                  placeholder="e.g. ADDIS-001"
                  disabled={
                    officeLoading
                  }
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
                    value={
                      officeForm.region
                    }
                    onChange={
                      handleOfficeChange
                    }
                    placeholder="e.g. Addis Ababa"
                    disabled={
                      officeLoading
                    }
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
                    value={
                      officeForm.city
                    }
                    onChange={
                      handleOfficeChange
                    }
                    placeholder="e.g. Addis Ababa"
                    disabled={
                      officeLoading
                    }
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
                    value={
                      officeForm.subCity
                    }
                    onChange={
                      handleOfficeChange
                    }
                    placeholder="e.g. Bole"
                    disabled={
                      officeLoading
                    }
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
                    value={
                      officeForm.woreda
                    }
                    onChange={
                      handleOfficeChange
                    }
                    placeholder="e.g. 03"
                    disabled={
                      officeLoading
                    }
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
                  value={
                    officeForm.address
                  }
                  onChange={
                    handleOfficeChange
                  }
                  placeholder="Enter office address"
                  disabled={
                    officeLoading
                  }
                />
              </div>

              <div className="super-admin-form-actions">
                <button
                  type="button"
                  className="super-admin-cancel-button"
                  onClick={
                    closeCreateOffice
                  }
                  disabled={
                    officeLoading
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="super-admin-primary-button"
                  disabled={
                    officeLoading
                  }
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
          CREATE OFFICE ADMIN MODAL
          ===================================================== */}

      {showCreateAdmin && (
        <div
          className="super-admin-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !adminLoading
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
                  Create an Office
                  Administrator and assign
                  an existing Government
                  Office.
                </p>
              </div>

              <button
                type="button"
                className="super-admin-modal-close"
                onClick={
                  closeCreateAdmin
                }
                disabled={
                  adminLoading
                }
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
              onSubmit={
                handleCreateAdmin
              }
            >
              <div className="super-admin-form-row">
                <div className="super-admin-form-group">
                  <label htmlFor="admin-firstName">
                    First Name
                  </label>

                  <input
                    id="admin-firstName"
                    name="firstName"
                    type="text"
                    value={
                      adminForm.firstName
                    }
                    onChange={
                      handleAdminChange
                    }
                    placeholder="Enter first name"
                    autoComplete="given-name"
                    disabled={
                      adminLoading
                    }
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
                    value={
                      adminForm.lastName
                    }
                    onChange={
                      handleAdminChange
                    }
                    placeholder="Enter last name"
                    autoComplete="family-name"
                    disabled={
                      adminLoading
                    }
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
                    value={
                      adminForm.username
                    }
                    onChange={
                      handleAdminChange
                    }
                    placeholder="Choose username"
                    autoComplete="username"
                    disabled={
                      adminLoading
                    }
                    required
                  />

                  <small>
                    Username is provided by the
                    Super Admin.
                  </small>
                </div>

                <div className="super-admin-form-group">
                  <label htmlFor="admin-employeeId">
                    Employee ID
                  </label>

                  <input
                    id="admin-employeeId"
                    name="employeeId"
                    type="text"
                    value={
                      adminForm.employeeId
                    }
                    onChange={
                      handleAdminChange
                    }
                    placeholder="e.g. EMP-001"
                    disabled={
                      adminLoading
                    }
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
                    value={
                      adminForm.phone
                    }
                    onChange={
                      handleAdminChange
                    }
                    placeholder="Enter phone number"
                    autoComplete="tel"
                    disabled={
                      adminLoading
                    }
                    required
                  />

                  <small>
                    The generated password will
                    be sent to this number.
                  </small>
                </div>

                <div className="super-admin-form-group">
                  <label htmlFor="admin-nationalId">
                    National ID
                  </label>

                  <input
                    id="admin-nationalId"
                    name="nationalId"
                    type="text"
                    value={
                      adminForm.nationalId
                    }
                    onChange={
                      handleAdminChange
                    }
                    placeholder="Enter national ID"
                    disabled={
                      adminLoading
                    }
                    required
                  />
                </div>
              </div>

              <div
                style={{
                  padding:
                    "14px 16px",
                  border:
                    "1px solid #dbeee7",
                  borderRadius:
                    "6px",
                  background:
                    "#f8fffc",
                  color:
                    "#53636c",
                  fontSize:
                    "13px",
                  lineHeight:
                    "1.6",
                }}
              >
                <strong
                  style={{
                    display:
                      "block",
                    marginBottom:
                      "3px",
                    color:
                      "#047857",
                  }}
                >
                  Automatic password
                </strong>

                SmartRent ET will generate a
                secure password automatically
                and send it to the administrator
                by SMS. No password is entered
                here.
              </div>

              <div className="super-admin-form-group">
                <label htmlFor="admin-officeId">
                  Government Office
                </label>

                <select
                  id="admin-officeId"
                  name="officeId"
                  value={
                    adminForm.officeId
                  }
                  onChange={
                    handleAdminOfficeChange
                  }
                  disabled={
                    adminLoading ||
                    officeLoading ||
                    offices.length ===
                      0
                  }
                  required
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
                    {officeLoading
                      ? "Loading offices..."
                      : offices.length ===
                          0
                        ? "No government offices available"
                        : "Select a Government Office"}
                  </option>

                  {offices.map(
                    (office) => (
                      <option
                        key={
                          office.officeId
                        }
                        value={
                          office.officeId
                        }
                      >
                        {
                          office.officeCode
                        }{" "}
                        —{" "}
                        {
                          office.officeName
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {offices.length ===
                0 &&
                !officeLoading && (
                  <div
                    className="super-admin-form-error"
                    role="alert"
                  >
                    No Government
                    Offices are
                    available. Create
                    an office first.
                  </div>
                )}

              <div className="super-admin-form-actions">
                <button
                  type="button"
                  className="super-admin-cancel-button"
                  onClick={
                    closeCreateAdmin
                  }
                  disabled={
                    adminLoading
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="super-admin-primary-button"
                  disabled={
                    adminLoading ||
                    officeLoading ||
                    offices.length ===
                      0
                  }
                >
                  {adminLoading
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