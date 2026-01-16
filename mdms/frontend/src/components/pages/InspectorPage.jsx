import { useEffect, useState } from "react";
import "../styles/InspectorPage.css";
import TicketLog from "./TicketLog";

export default function InspectorPage() {
  const [view, setView] = useState("complaints"); // complaints | tickets
  const [complaints, setComplaints] = useState([]);
  const inspector = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const storedComplaints =
      JSON.parse(localStorage.getItem("complaints")) || [];
    setComplaints(storedComplaints);
  }, []);

  const saveComplaints = (updated) => {
    localStorage.setItem("complaints", JSON.stringify(updated));
    setComplaints(updated);
  };

  /* ===== Assign Time ===== */
  const assignTime = (id, hours) => {
    const updated = complaints.map((c) =>
      c.id === id
        ? { ...c, assignedTime: hours, status: "IN_PROGRESS" }
        : c
    );
    saveComplaints(updated);

    /* log action */
    const actions =
      JSON.parse(localStorage.getItem("inspectorActions")) || [];

    actions.push({
      id: Date.now(),
      inspectorName: inspector?.email || "Inspector",
      action: `Assigned ${hours} hrs`,
      ticketId: id,
      time: new Date().toLocaleString()
    });

    localStorage.setItem("inspectorActions", JSON.stringify(actions));
  };

  const newComplaints = complaints.filter((c) => c.status === "NEW");

  return (
    <div className="inspector-container">
      <h2 className="inspector-title">Inspector Dashboard</h2>

      {/* TABS */}
      <div className="inspector-tabs">
        <button onClick={() => setView("complaints")}>
          New Complaints ({newComplaints.length})
        </button>
        <button onClick={() => setView("tickets")}>Ticket Logs</button>
      </div>

      {/* NEW COMPLAINTS */}
      {view === "complaints" && (
        <>
          {newComplaints.length === 0 && (
            <p className="empty-text">No new complaints</p>
          )}

          {newComplaints.map((c) => (
            <div className="card" key={c.id}>
              <div className="card-info">
                <strong>{c.title}</strong>
                <span>Complaint ID: {c.id}</span>
                <span>Status: {c.status}</span>
              </div>

              <div className="assign-time">
                <input
                  type="number"
                  placeholder="Hours"
                  min="1"
                  id={`time-${c.id}`}
                />
                <button
                  onClick={() =>
                    assignTime(
                      c.id,
                      document.getElementById(`time-${c.id}`).value
                    )
                  }
                >
                  Assign Time
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* TICKET LOGS */}
      {view === "tickets" && (
        <>
          <h3>All Ticket Logs</h3>
          <TicketLog />
        </>
      )}
    </div>
  );
}
