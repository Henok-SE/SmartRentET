import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CreateOfficer from "./CreateOfficer";

type Officer = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  subCity: string;
  status: "Active" | "Inactive";
  dateCreated: string;
  lastLogin: string;
};

const initialOfficers: Officer[] = [
  {
    id: 1,
    firstName: "Abebe",
    lastName: "Kebede",
    username: "abebe.k",
    subCity: "Addis Ketema",
    status: "Active",
    dateCreated: "Aug 20, 2026",
    lastLogin: "Aug 26, 2026",
  },
  {
    id: 2,
    firstName: "Marta",
    lastName: "Tesfaye",
    username: "marta.t",
    subCity: "Bole",
    status: "Active",
    dateCreated: "Aug 18, 2026",
    lastLogin: "Aug 25, 2026",
  },
];

export default function OfficersManagement() {
    const navigate = useNavigate();
    const location = useLocation();
    
  const [showCreateOfficer, setShowCreateOfficer] = useState(false);
  const [search, setSearch] = useState("");
  const [officers, setOfficers] = useState(initialOfficers);

  const filteredOfficers = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) return officers;

    return officers.filter((officer) => {
      const fullName =
        `${officer.firstName} ${officer.lastName}`.toLowerCase();

      return (
        fullName.includes(value) ||
        officer.username.toLowerCase().includes(value)
      );
    });
  }, [search, officers]);

  const handleDeactivate = (id: number) => {
    setOfficers((current) =>
      current.map((officer) =>
        officer.id === id
          ? {
              ...officer,
              status:
                officer.status === "Active" ? "Inactive" : "Active",
            }
          : officer
      )
    );
  };

  const handleResetPassword = (officer: Officer) => {
    alert(`Reset password for ${officer.username}`);
  };

  const handleEdit = (officer: Officer) => {
    alert(`Edit officer: ${officer.username}`);
  };

  return (
  <div className="office-admin-page">

    {/* ================= SIDEBAR ================= */}
    <aside className="office-admin-sidebar">

      <div className="office-admin-brand">
        <img
          src="/smartrent-logo.png"
          alt="SmartRent ET"
          className="office-admin-logo"
        />

        <div>
          <h2>SmartRent ET</h2>
          <span>OFFICE ADMIN PORTAL</span>
        </div>
      </div>

      <div className="office-admin-divider" />

      <nav className="office-admin-navigation">

        {/* DASHBOARD */}
        <button
          className={`office-admin-nav-item ${
            location.pathname === "/office-admin/dashboard"
              ? "active"
              : ""
          }`}
          onClick={() =>
            navigate("/office-admin/dashboard")
          }
        >
          <span className="nav-icon">▦</span>
          Dashboard
        </button>

        {/* OFFICERS MANAGEMENT */}
        <button
          className={`office-admin-nav-item ${
            location.pathname === "/office-admin/officers"
              ? "active"
              : ""
          }`}
          onClick={() =>
            navigate("/office-admin/officers")
          }
        >
          <span className="nav-icon">👥</span>
          Officers Management
        </button>

        {/* AUDIT LOGS */}
        <button
          className={`office-admin-nav-item ${
            location.pathname === "/office-admin/audit-logs"
              ? "active"
              : ""
          }`}
          onClick={() =>
            navigate("/office-admin/audit-logs")
          }
        >
          <span className="nav-icon">◷</span>
          Audit Logs
        </button>

      </nav>

      <div className="office-admin-sidebar-bottom">
        <div className="office-admin-profile">

          <div className="office-admin-avatar">
            OA
          </div>

          <div>
            <strong>Office Admin</strong>
            <span>SmartRent ET</span>
          </div>

        </div>
      </div>

    </aside>


    {/* ================= MAIN ================= */}
    <main className="office-admin-main">

      {/* TOP BAR */}
      <header className="office-admin-topbar">

        <div className="office-admin-search">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search officers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="office-admin-user">

          <div className="office-admin-user-avatar">
            OA
          </div>

          <span>Office Admin</span>

        </div>

      </header>


      {/* ================= OFFICERS CONTENT ================= */}
      <section className="office-admin-content">

        <div className="officers-management-page">

          {/* PAGE HEADER */}
          <div className="officers-management-header">

            <div>
              <span className="officers-management-eyebrow">
                USER MANAGEMENT
              </span>

              <h1>Officers</h1>

              <p>
                Manage officers and their assigned government offices.
              </p>
            </div>

            <button
              className="create-officer-button"
              onClick={() => setShowCreateOfficer(true)}
            >
              + Create Officer
            </button>

          </div>


          {/* TABLE CARD */}
          <div className="officers-management-card">

            <div className="officers-table-wrapper">

              <table className="officers-table">

                <thead>
                  <tr>
                    <th>Officer Name</th>
                    <th>Username</th>
                    <th>Sub-city</th>
                    <th>Status</th>
                    <th>Date Created</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>

                  {filteredOfficers.length > 0 ? (

                    filteredOfficers.map((officer) => (

                      <tr key={officer.id}>

                        <td>
                          <div className="officer-management-name">

                            <div className="officer-management-avatar">
                              {officer.firstName.charAt(0)}
                              {officer.lastName.charAt(0)}
                            </div>

                            <strong>
                              {officer.firstName} {officer.lastName}
                            </strong>

                          </div>
                        </td>

                        <td>{officer.username}</td>

                        <td>{officer.subCity}</td>

                        <td>
                          <span
                            className={`officer-management-status ${
                              officer.status === "Active"
                                ? "officer-status-active"
                                : "officer-status-inactive"
                            }`}
                          >
                            {officer.status}
                          </span>
                        </td>

                        <td>{officer.dateCreated}</td>

                        <td>{officer.lastLogin}</td>

                        <td>

                          <div className="officer-management-actions">

                            <button
                              className="officer-action-edit"
                              onClick={() =>
                                handleEdit(officer)
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="officer-action-reset"
                              onClick={() =>
                                handleResetPassword(officer)
                              }
                            >
                              Reset Password
                            </button>

                            <button
                              className={
                                officer.status === "Active"
                                  ? "officer-action-deactivate"
                                  : "officer-action-activate"
                              }
                              onClick={() =>
                                handleDeactivate(officer.id)
                              }
                            >
                              {officer.status === "Active"
                                ? "Deactivate"
                                : "Activate"}
                            </button>

                          </div>

                        </td>

                      </tr>

                    ))

                  ) : (

                    <tr>
                      <td
                        colSpan={7}
                        className="officers-no-results"
                      >
                        No officers found.
                      </td>
                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      </section>

    </main>


    {/* ================= CREATE OFFICER MODAL ================= */}
    {showCreateOfficer && (
      <CreateOfficer
        onClose={() => setShowCreateOfficer(false)}
      />
    )}

  </div>
);}