
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../App.css";

type OfficerStatus = "Active" | "Inactive";

type Officer = {
  id: number;
  name: string;
  role: string;
  activityDate: string;
  activityTime: string;
  status: OfficerStatus;
};

function OfficeAdminDashboard() {
  const [search, setSearch] = useState("");
    const navigate = useNavigate();
   const location = useLocation();


  const officers: Officer[] = [
    {
      id: 1,
      name: "Abel Tesfaye",
      role: "Rental Officer",
      activityDate: "Aug 26, 2026",
      activityTime: "09:30 AM",
      status: "Active",
    },
    {
      id: 2,
      name: "Marta Bekele",
      role: "Rental Officer",
      activityDate: "Aug 25, 2026",
      activityTime: "03:15 PM",
      status: "Active",
    },
    {
      id: 3,
      name: "Samuel Alemu",
      role: "Senior Officer",
      activityDate: "Aug 24, 2026",
      activityTime: "11:45 AM",
      status: "Inactive",
    },
    {
      id: 4,
      name: "Hana Getachew",
      role: "Rental Officer",
      activityDate: "Aug 23, 2026",
      activityTime: "10:20 AM",
      status: "Active",
    },
    {
      id: 5,
      name: "Daniel Tadesse",
      role: "Rental Officer",
      activityDate: "Aug 22, 2026",
      activityTime: "04:10 PM",
      status: "Inactive",
    },
  ];

  const filteredOfficers = officers.filter((officer) =>
    officer.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalOfficers = officers.length;

  const activeOfficers = officers.filter(
    (officer) => officer.status === "Active"
  ).length;

  const inactiveOfficers = officers.filter(
    (officer) => officer.status === "Inactive"
  ).length;

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

  <button
    className={`office-admin-nav-item ${
      location.pathname === "/office-admin/dashboard"
        ? "active"
        : ""
    }`}
    onClick={() => navigate("/office-admin/dashboard")}
  >
    <span className="nav-icon">▦</span>
    Dashboard
  </button>

  <button
    className={`office-admin-nav-item ${
      location.pathname === "/office-admin/officers"
        ? "active"
        : ""
    }`}
    onClick={() => navigate("/office-admin/officers")}
  >
    <span className="nav-icon">👥</span>
    Officers Management
  </button>

  <button
    className="office-admin-nav-item"
    onClick={() => alert("Audit Logs page is not created yet.")}
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
        {/* ================= TOP BAR ================= */}

        <header className="office-admin-topbar">
          <div className="office-admin-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search officers..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="office-admin-user">
            <div className="office-admin-user-avatar">
              OA
            </div>

            <span>Office Admin</span>
          </div>
        </header>

        {/* ================= CONTENT ================= */}

        <section className="office-admin-content">
          <div className="office-admin-heading">
            <div>
              <span className="office-admin-eyebrow">
                OFFICERS MANAGEMENT
              </span>

              <h1>Dashboard</h1>

              <p>
                Monitor officers and their recent
                activities.
              </p>
            </div>
          </div>

          {/* ================= STAT CARDS ================= */}

          <section className="office-admin-stats">
            <article className="office-admin-stat-card">
              <div className="office-admin-stat-icon">
                👥
              </div>

              <div>
                <span>Total Officers</span>

                <strong>
                  {totalOfficers}
                </strong>

                <small>
                  Registered officers
                </small>
              </div>
            </article>

            <article className="office-admin-stat-card">
              <div className="office-admin-stat-icon">
                ✓
              </div>

              <div>
                <span>Active Officers</span>

                <strong>
                  {activeOfficers}
                </strong>

                <small>
                  Currently active
                </small>
              </div>
            </article>

            <article className="office-admin-stat-card">
              <div className="office-admin-stat-icon inactive-icon">
                !
              </div>

              <div>
                <span>Inactive Officers</span>

                <strong>
                  {inactiveOfficers}
                </strong>

                <small>
                  Currently inactive
                </small>
              </div>
            </article>
          </section>

          {/* ================= OFFICERS TABLE ================= */}

          <section className="office-admin-table-card">
            <div className="office-admin-table-header">
              <div>
                <span className="office-admin-eyebrow">
                  RECENT ACTIVITY
                </span>

                <h2>Officer Activity</h2>

                <p>
                  View recent officer activities and
                  their current status.
                </p>
              </div>
            </div>

            <div className="office-admin-table-wrapper">
              <table className="office-admin-table">
                <thead>
                  <tr>
                    <th>Officer Name</th>
                    <th>Role</th>
                    <th>Activity Date</th>
                    <th>Activity Time</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOfficers.length > 0 ? (
                    filteredOfficers.map((officer) => (
                      <tr key={officer.id}>
                        <td>
                          <div className="officer-name">
                            <div className="officer-table-avatar">
                              {officer.name
                                .split(" ")
                                .map(
                                  (name) =>
                                    name.charAt(0)
                                )
                                .join("")}
                            </div>

                            <strong>
                              {officer.name}
                            </strong>
                          </div>
                        </td>

                        <td>
                          {officer.role}
                        </td>

                        <td>
                          {officer.activityDate}
                        </td>

                        <td>
                          {officer.activityTime}
                        </td>

                        <td>
                          <span
                            className={`officer-status ${
                              officer.status === "Active"
                                ? "status-active"
                                : "status-inactive"
                            }`}
                          >
                            {officer.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="no-results"
                      >
                        No officers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

export default OfficeAdminDashboard;