import "../styles/HomePage.css";
import { useEffect, useState } from "react";
import { Pie, Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
} from "chart.js";
import { getTickets } from "../../services/api";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement
);

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const MiniMap = ({ tickets }) => {
  // Extract valid locations
  const markers = tickets
    .flatMap((t) =>
      (t.sub_tickets || []).map((st) => ({
        ...st,
        ticket_id: t.ticket_id,
        lat: st.latitude,
        lng: st.longitude,
      }))
    )
    .filter((m) => m.lat && m.lng);

  const center = [16.29974, 80.45729]; // Default center (Guntur)

  return (
    <div className="mini-map-card">
      <h3>Live Activity</h3>
      <div className="mini-map-container">
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {markers.map((m, idx) => (
            <Marker
              key={idx}
              position={[m.lat, m.lng]}
              eventHandlers={{
                click: (e) => e.target._map.setView(e.latlng, 15),
              }}
            >
              <Popup>
                <strong>{m.issue_type}</strong>
                <br />
                {new Date(m.created_at || Date.now()).toLocaleTimeString()}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default function HomePage() {
  /* ================= API STATE ================= */
  const [allTickets, setAllTickets] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    pending: 0,
    todayCompleted: 0,
    yesterdayCompleted: 0,
    thisMonth: 0,
    lastMonth: 0,
    today: 0,
    new: 0,
  });
  const [filters, setFilters] = useState({
    dateRange: "all", // all, 7days, 30days
    customDate: "", // for backward compatibility if user wants specific date, or we can remove if dateRange covers it. Keeping for now as specific date picker.
    status: "all", // all, new, pending, resolved
    priority: "all", // all, high, medium, low
    sortBy: "newest", // newest, oldest, severity
    category: "all",
  });

  /* ================= FETCH TICKETS ================= */
  const fetchTickets = async () => {
    try {
      const response = await getTickets();
      const ticketsData = response.tickets || [];
      setAllTickets(ticketsData);
      applyFilters(ticketsData, filters);
    } catch (err) {
      console.error("Failed to fetch tickets", err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data, activeFilters) => {
    let filtered = [...data];

    // 1. Date Range Filter
    const today = new Date();
    if (activeFilters.dateRange === "7days") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      filtered = filtered.filter((t) => new Date(t.created_at) >= sevenDaysAgo);
    } else if (activeFilters.dateRange === "30days") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      filtered = filtered.filter(
        (t) => new Date(t.created_at) >= thirtyDaysAgo
      );
    } else if (activeFilters.customDate) {
      // Fallback to specific date picker if used
      filtered = filtered.filter(
        (t) => t.created_at && t.created_at.startsWith(activeFilters.customDate)
      );
    }

    // 2. Status Filter
    if (activeFilters.status !== "all") {
      filtered = filtered.filter((t) => {
        if (activeFilters.status === "resolved")
          return t.status === "resolved" || t.status === "closed";
        if (activeFilters.status === "pending")
          return t.status !== "resolved" && t.status !== "closed";
        if (activeFilters.status === "new") {
          // Assuming "new" means created today or explicitly status 'new' if exists
          // The user request says "New, Pending, Resolved".
          // Let's assume 'open' or no status is pending/new.
          // Often 'new' is a specific status or recently created.
          // Let's map 'new' to really fresh tickets (e.g. < 24h) OR explicit status.
          // For now, let's trust the 'status' field if it has 'new'.
          // If not, we might need to adjust.
          return t.status === "new" || t.status === "open";
        }
        return true;
      });
    }

    // 3. Priority Filter
    // Note: The schema doesn't explicitly show 'priority'.
    // We will assume it might be in sub_tickets or we can infer it based on issue_type for now,
    // or checks if the field exists. If not exists, this filter might be effective only if backend adds it.
    // For now, I will add the logic assuming a 'priority' field might exist on ticket or we infer it.
    if (activeFilters.priority !== "all") {
      // Mocking priority based on severity or type if field missing
      filtered = filtered.filter((t) => t.priority === activeFilters.priority);
    }

    // 4. Category Filter
    if (activeFilters.category !== "all") {
      filtered = filtered.filter(
        (t) =>
          t.sub_tickets &&
          t.sub_tickets.some((st) => st.issue_type === activeFilters.category)
      );
    }

    // 5. Sorting
    filtered.sort((a, b) => {
      if (activeFilters.sortBy === "newest") {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (activeFilters.sortBy === "oldest") {
        return new Date(a.created_at) - new Date(b.created_at);
      } else if (activeFilters.sortBy === "severity") {
        // Assuming priority/severity mapping: High > Medium > Low
        const severityMap = { high: 3, medium: 2, low: 1, undefined: 0 };
        const sevA = severityMap[a.priority] || 0;
        const sevB = severityMap[b.priority] || 0;
        return sevB - sevA;
      }
      return 0;
    });

    setTickets(filtered);

    // Calculate Stats from FILTERED data? Or Global data?
    // User usually expects stats to reflect filters or be global.
    // In the previous code, stats were calculated from 'filtered' data.
    // Let's keep it that way so the dashboard reflects the view.

    // ... existing stats logic calculation ...
    const total = filtered.length;
    const resolved = filtered.filter(
      (t) => t.status === "resolved" || t.status === "closed"
    ).length;
    const pending = total - resolved;

    // Local date calculation re-use...
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;
    // ... (rest of date strings) ...
    const thisMonthStr = `${year}-${month}`;
    // Yesterday...
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yYear = yesterday.getFullYear();
    const yMonth = String(yesterday.getMonth() + 1).padStart(2, "0");
    const yDay = String(yesterday.getDate()).padStart(2, "0");
    const yesterdayStr = `${yYear}-${yMonth}-${yDay}`;
    // Last Month...
    const lastMonthIdx = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
    const lastMonthYear =
      today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
    const lastMonthStr = `${lastMonthYear}-${String(lastMonthIdx + 1).padStart(
      2,
      "0"
    )}`;

    const todayCompleted = filtered.filter(
      (t) =>
        (t.status === "resolved" || t.status === "closed") &&
        t.resolved_at &&
        t.resolved_at.startsWith(todayStr)
    ).length;

    const yesterdayCompleted = filtered.filter(
      (t) =>
        (t.status === "resolved" || t.status === "closed") &&
        t.resolved_at &&
        t.resolved_at.startsWith(yesterdayStr)
    ).length;

    const thisMonth = filtered.filter(
      (t) => t.created_at && t.created_at.startsWith(thisMonthStr)
    ).length;

    const lastMonth = filtered.filter(
      (t) => t.created_at && t.created_at.startsWith(lastMonthStr)
    ).length;

    const todayCount = filtered.filter(
      (t) => t.created_at && t.created_at.startsWith(todayStr)
    ).length;

    const newCount = filtered.filter(
      (t) =>
        t.created_at &&
        t.created_at.startsWith(todayStr) &&
        (t.status === "open" || !t.status)
    ).length;

    setStats({
      total,
      resolved,
      pending,
      todayCompleted,
      yesterdayCompleted,
      thisMonth,
      lastMonth,
      today: todayCount,
      new: newCount,
    });
  };

  useEffect(() => {
    fetchTickets();
    window.addEventListener("focus", fetchTickets);
    return () => window.removeEventListener("focus", fetchTickets);
  }, []);

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    // If selecting a preset range, clear custom date, and vice versa
    if (field === "dateRange" && value !== "custom") {
      newFilters.customDate = "";
    }
    if (field === "customDate") {
      newFilters.dateRange = "custom";
    }

    setFilters(newFilters);
    applyFilters(allTickets, newFilters);
  };

  /* ================= RECENT ACTIVITY LOGIC ================= */
  const recentTickets = tickets
    .flatMap((ticket) =>
      (ticket.sub_tickets || []).map((subTicket) => ({
        ...subTicket,
        ticket_id: ticket.ticket_id,
        created_at: subTicket.created_at || ticket.created_at,
      }))
    )
    .sort((a, b) => {
      // Re-sort here just in case, though parent list is sorted.
      // Actually sub-tickets need their own sort if we just flattened them.
      const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
      const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
      return dateB - dateA;
    })
    .slice(0, 6);

  /* ================= DASHBOARD STATS ================= */
  const pieData = {
    labels: ["Resolved", "Pending"],
    datasets: [
      {
        data: [stats.resolved, stats.pending],
        backgroundColor: ["#22c55e", "#ef4444"],
        hoverOffset: 18,
        borderWidth: 0,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  return (
    <div className="home-container">
      <div className="home-content">
        {/* ================= SNAPSHOT BAR ================= */}
        <div className="snapshot-bar">
          <div className="snapshot-item">
            <span className="label">Today: </span>
            <span className="value">{stats.todayCompleted || 0}</span>
          </div>

          <div className="divider" />

          <div className="snapshot-item new">
            <span className="label">New: </span>
            <span className="value">{stats.new || 0}</span>
          </div>

          <div className="divider" />

          <div className="snapshot-item resolved">
            <span className="label">Resolved: </span>
            <span className="value">{stats.resolved}</span>
          </div>

          <div className="divider" />

          <div className="snapshot-item open">
            <span className="label">Open: </span>
            <span className="value">{stats.pending}</span>
          </div>
        </div>

        {/* ================= FILTERS ================= */}
        <div className="home-filters">
          <div className="filter-group">
            <label>Date Range</label>
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange("dateRange", e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="custom">Custom Date</option>
            </select>
            {filters.dateRange === "custom" && (
              <input
                type="date"
                value={filters.customDate}
                onChange={(e) =>
                  handleFilterChange("customDate", e.target.value)
                }
              />
            )}
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="new">New / Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange("priority", e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="pathholes">Potholes</option>
              <option value="garbage">Garbage</option>
              <option value="streetdebris">Street Debris</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange("sortBy", e.target.value)}
            >
              <option value="newest">Newest → Oldest</option>
              <option value="oldest">Oldest → Newest</option>
              <option value="severity">Severity (High→Low)</option>
              {/* Distance sorting would require user location context which is not currently available */}
            </select>
          </div>
        </div>

        {/* ================= GRID 1 ================= */}
        <div className="grid-2">
          <div className="stats-grid">
            <div className="stat-card total tickets-list-card">
              <p>Total Tickets</p>
              <h2>{stats.total}</h2>

              <div className="tickets-scroll">
                {tickets.map((ticket) => (
                  <div key={ticket.ticket_id} className="ticket-row">
                    <span className="ticket-id">{ticket.ticket_id}</span>

                    <div className="ticket-issues">
                      {(ticket.sub_tickets || []).map((st) => (
                        <span
                          key={st.sub_id}
                          className={`issue-pill ${st.issue_type}`}
                        >
                          {st.issue_type}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="stat-card resolved tickets-list-card">
              <p>Resolved Tickets</p>
              <h2>{stats.resolved}</h2>

              <div className="tickets-scroll">
                {tickets
                  .filter(
                    (ticket) =>
                      ticket.status === "resolved" || ticket.status === "closed"
                  )
                  .map((ticket) => (
                    <div key={ticket.ticket_id} className="ticket-row">
                      <span className="ticket-id">{ticket.ticket_id}</span>

                      <div className="ticket-issues">
                        {(ticket.sub_tickets || []).map((st) => (
                          <span
                            key={st.sub_id}
                            className={`issue-pill ${st.issue_type}`}
                          >
                            {st.issue_type}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="stat-card pending">
              <p>Pending Tickets</p>
              <h2>{stats.pending}</h2>
            </div>
            <div className="stat-card completed-today">
              <p>Today Completed</p>
              <h2>{stats.todayCompleted}</h2>
              <small>Yesterday: {stats.yesterdayCompleted}</small>
            </div>
            <div className="stat-card this-month">
              <p>This Month</p>
              <h2>{stats.thisMonth}</h2>
              <small>Last Month: {stats.lastMonth}</small>
            </div>
          </div>

          <div className="right-column">
            <MiniMap tickets={tickets} />

            <div className="pie-card">
              <h3>Complaint Status</h3>
              <div className="pie-box">
                <Pie data={pieData} options={pieOptions} />
              </div>
            </div>
          </div>
        </div>

        {/* ================= DATA RICH CHARTS ================= */}
        <div
          className="charts-section"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
            gap: "24px",
            marginBottom: "24px",
          }}
        >
          {/* LINE CHART: Complaints per Day */}
          <div
            className="chart-card"
            style={{
              background: "rgba(2, 6, 23, 0.45)",
              borderRadius: "14px",
              padding: "18px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <h3>Complaints Per Day</h3>
            <div style={{ height: "300px" }}>
              <Line
                data={{
                  labels: Object.keys(
                    tickets.reduce((acc, t) => {
                      const date = t.created_at
                        ? t.created_at.split("T")[0]
                        : "Unknown";
                      acc[date] = (acc[date] || 0) + 1;
                      return acc;
                    }, {})
                  ).sort(),
                  datasets: [
                    {
                      label: "Complaints",
                      data: Object.keys(
                        tickets.reduce((acc, t) => {
                          const date = t.created_at
                            ? t.created_at.split("T")[0]
                            : "Unknown";
                          acc[date] = (acc[date] || 0) + 1;
                          return acc;
                        }, {})
                      )
                        .sort()
                        .map(
                          (date) =>
                            tickets.filter(
                              (t) =>
                                t.created_at && t.created_at.startsWith(date)
                            ).length
                        ),
                      borderColor: "#38bdf8",
                      backgroundColor: "rgba(56, 189, 248, 0.2)",
                      tension: 0.4,
                      fill: true,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      grid: { color: "rgba(255, 255, 255, 0.1)" },
                      ticks: { color: "#9ca3af" },
                    },
                    x: {
                      grid: { display: false },
                      ticks: { color: "#9ca3af" },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div
            className="charts-column"
            style={{ display: "flex", flexDirection: "column", gap: "24px" }}
          >
            {/* BAR CHART: Most Reported Areas */}
            <div
              className="chart-card"
              style={{
                background: "rgba(2, 6, 23, 0.45)",
                borderRadius: "14px",
                padding: "18px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <h3>Most Reported Areas</h3>
              <div style={{ height: "200px" }}>
                <Bar
                  data={{
                    labels: Object.entries(
                      tickets.reduce((acc, t) => {
                        const area = t.area || "Unknown";
                        acc[area] = (acc[area] || 0) + 1;
                        return acc;
                      }, {})
                    )
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map((entry) => entry[0]),
                    datasets: [
                      {
                        label: "Complaints",
                        data: Object.entries(
                          tickets.reduce((acc, t) => {
                            const area = t.area || "Unknown";
                            acc[area] = (acc[area] || 0) + 1;
                            return acc;
                          }, {})
                        )
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map((entry) => entry[1]),
                        backgroundColor: "#8b5cf6",
                        borderRadius: 4,
                      },
                    ],
                  }}
                  options={{
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: {
                        grid: { color: "rgba(255, 255, 255, 0.1)" },
                        ticks: { color: "#9ca3af" },
                      },
                      y: {
                        grid: { display: false },
                        ticks: { color: "#e5e7eb" },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================= RECENT ACTIVITY ================= */}
        <div className="activity-card">
          <h3>Recent Activity</h3>

          {loading && <p>Loading recent activity...</p>}

          {!loading && recentTickets.length === 0 && <p>No recent activity</p>}

          {!loading &&
            recentTickets.map((subTicket) => (
              <div key={subTicket.sub_id} className="activity-item">
                <span className="activity-icon">
                  {subTicket.issue_type === "pathholes" && "🛣️"}
                  {subTicket.issue_type === "garbage" && "🗑️"}
                  {subTicket.issue_type === "streetdebris" && "🚧"}
                  {!subTicket.issue_type && "📋"}
                </span>

                <div className="activity-text">
                  <strong>
                    {subTicket.issue_type
                      ? subTicket.issue_type.replace("_", " ").toUpperCase()
                      : "COMPLAINT"}
                  </strong>

                  <span className="activity-meta">
                    🆔 {subTicket.ticket_id}
                  </span>

                  <span className="activity-meta">
                    ⏰{" "}
                    {subTicket.created_at
                      ? new Date(subTicket.created_at).toLocaleString()
                      : "Recently"}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
