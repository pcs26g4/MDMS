import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/AdminPage.css";
import TicketLog from "./TicketLog";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [view, setView] = useState("inspectors");
  const [actions, setActions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUsers = () => {
      const storedUsers = JSON.parse(localStorage.getItem("users")) || [];
      const storedActions =
        JSON.parse(localStorage.getItem("inspectorActions")) || [];

      setUsers(storedUsers);
      setActions(storedActions);
    };

    loadUsers();
    window.addEventListener("storage", loadUsers);
    return () => window.removeEventListener("storage", loadUsers);
  }, []);

  const updateStorage = (updatedUsers) => {
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const approveInspector = (id) => {
    const updatedUsers = users.map((u) =>
      u.id === id ? { ...u, isApproved: true } : u
    );
    updateStorage(updatedUsers);
  };

  const removeInspector = (id) => {
    if (!window.confirm("Remove this approved inspector?")) return;

    const updatedUsers = users.filter((u) => u.id !== id);
    updateStorage(updatedUsers);
  };

  const rejectInspector = (id) => {
    if (!window.confirm("Reject this inspector request?")) return;
    const updatedUsers = users.filter((u) => u.id !== id);
    updateStorage(updatedUsers);
  };

  const pendingInspectors = users.filter(
    (u) => u.role === "INSPECTOR" && !u.isApproved
  );
  const approvedInspectors = users.filter(
    (u) => u.role === "INSPECTOR" && u.isApproved
  );
  const normalUsers = users.filter((u) => u.role === "USER");

  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <h2 className="sidebar-title">Admin Panel</h2>

        <button
          onClick={() => {
            setView("inspectors");
            setSidebarOpen(false);
          }}
        >
          Inspector Requests ({pendingInspectors.length})
        </button>

        <button
          onClick={() => {
            setView("tickets");
            setSidebarOpen(false);
          }}
        >
          Ticket Logs
        </button>

        <button
          onClick={() => {
            setView("actions");
            setSidebarOpen(false);
          }}
        >
          Inspector Actions
        </button>
      </aside>

      {/* OVERLAY */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* MAIN CONTENT */}
      <div className="admin-main">
        {/* TOP BAR */}
        <header className="admin-topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            ☰
          </button>

          <h2>Admin Dashboard</h2>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </header>

        {/* CONTENT AREA */}
        <div className="admin-container">
          {/* ===================== INSPECTORS VIEW ===================== */}
          {view === "inspectors" && (
            <>
              {/* Pending Inspectors */}
              <div className="admin-card">
                <h3>Pending Inspector Requests</h3>

                {pendingInspectors.length === 0 && (
                  <p className="empty-text">No pending requests</p>
                )}

                {pendingInspectors.map((i) => (
                  <div className="admin-list-item" key={i.id}>
                    <div className="item-left">
                      <strong>{i.name}</strong>
                      <span className="admin-user-email">{i.email}</span>
                    </div>

                    <div className="item-right">
                      <button
                        className="approve-btn"
                        onClick={() => approveInspector(i.id)}
                      >
                        Approve
                      </button>
                      <button
                        className="reject-btn"
                        onClick={() => rejectInspector(i.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Approved Inspectors */}
              <div className="admin-card">
                <h3>Approved Inspectors</h3>

                {approvedInspectors.length === 0 && (
                  <p className="empty-text">No approved inspectors yet</p>
                )}

                {approvedInspectors.map((i) => (
                  <div className="admin-list-item" key={i.id}>
                    <div className="item-left">
                      <strong>{i.name}</strong>
                      <span className="admin-user-email">{i.email}</span>
                    </div>

                    <div className="item-right">
                      <button
                        className="reject-btn"
                        onClick={() => removeInspector(i.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Users */}
              <div className="admin-card">
                <h3>Users</h3>

                {normalUsers.length === 0 && (
                  <p className="empty-text">No users found</p>
                )}

                {normalUsers.map((u) => (
                  <div className="admin-list-item" key={u.id}>
                    <strong>{u.name}</strong>
                    <span className="admin-user-email">{u.email}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ===================== TICKET LOGS VIEW ===================== */}
          {view === "tickets" && (
            <div className="admin-card">
              <h3>All Ticket Logs</h3>
              <TicketLog />
            </div>
          )}

          {/* ===================== INSPECTOR ACTIONS VIEW ===================== */}
          {view === "actions" && (
            <div className="admin-card">
              <h3>Inspector Actions</h3>

              {actions.length === 0 && (
                <p className="empty-text">No actions recorded</p>
              )}

              {actions.map((a) => (
                <div className="admin-list-item" key={a.id}>
                  <strong>{a.inspectorName}</strong>
                  <span>Action: {a.action}</span>
                  <span>Ticket ID: {a.ticketId}</span>
                  <span className="time">{a.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}