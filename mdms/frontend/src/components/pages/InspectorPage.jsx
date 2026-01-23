import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/InspectorPage.css";
import TicketLog from "./TicketLog";
import { getTickets, getImageUrl, resolveSubTicket } from "../../services/api";

export default function InspectorPage() {
    const [view, setView] = useState("complaints");
    const [complaints, setComplaints] = useState([]);
    const [departmentComplaints, setDepartmentComplaints] = useState([]);
    const [inspectorDepartment, setInspectorDepartment] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("all");
    const [selectedDate, setSelectedDate] = useState("");
    
    // Popup state
    const [showPopup, setShowPopup] = useState(false);
    const [popupType, setPopupType] = useState("success"); // "success" or "error"
    const [popupMessage, setPopupMessage] = useState("");
    
    const navigate = useNavigate();

    // Map issue types to departments - UPDATED WITH SPECIFIC ISSUES
    const ISSUE_TO_DEPARTMENT = {
        // Roads Department Issues - ADDED MULTIPLE VARIATIONS
        "sand on road": "Roads",
        "sandonroad": "Roads",
        "sand_on_road": "Roads",
        "road cracks": "Roads",
        "roadcracks": "Roads",
        "road_cracks": "Roads",
        "potholes": "Roads",
        "pothole": "Roads",
        "water puddles": "Roads",  // This is the key mapping
        "waterpuddles": "Roads",
        "water_puddles": "Roads",
        "puddles": "Roads",
        "open manholes": "Roads",
        "openmanholes": "Roads",
        "open_manholes": "Roads",
        "street debris": "Roads",
        "streetdebris": "Roads",
        "street_debris": "Roads",
        "debris": "Roads",
        
        // Garbage Department Issues
        "street hawkers": "Garbage",
        "streethawkers": "Garbage",
        "street_hawkers": "Garbage",
        "animal carcases": "Garbage",
        "animalcarcases": "Garbage",
        "animal_carcases": "Garbage",
        "garbage overflow": "Garbage",
        "garbageoverflow": "Garbage",
        "garbage_overflow": "Garbage",
        
        // Water Department Issues
        "waterleak": "Water",
        "water leak": "Water",
        "water_leak": "Water",
        "water contamination": "Water",
        "watercontamination": "Water",
        "water_contamination": "Water",
        "drainage": "Water",
        "flooding": "Water",
        
        // Electricity Department Issues
        "poweroutage": "Electricity",
        "power outage": "Electricity",
        "power_outage": "Electricity",
        "streetlight": "Electricity",
        "street light": "Electricity",
        "street_light": "Electricity",
    };

    // SLA RULES FOR EACH ISSUE TYPE
    const SLA_RULES = {
        // Roads Department SLAs - ADDED ALL VARIATIONS
        "sand on road": 8,
        "sandonroad": 8,
        "sand_on_road": 8,
        "road cracks": 12,
        "roadcracks": 12,
        "road_cracks": 12,
        "potholes": 12,
        "pothole": 12,
        "water puddles": 6,  // SLA for water puddles
        "waterpuddles": 6,
        "water_puddles": 6,
        "puddles": 6,
        "open manholes": 4,
        "openmanholes": 4,
        "open_manholes": 4,
        "street debris": 10,
        "streetdebris": 10,
        "street_debris": 10,
        "debris": 10,
        
        // Garbage Department SLAs
        "street hawkers": 24,
        "streethawkers": 24,
        "street_hawkers": 24,
        "animal carcases": 4,
        "animalcarcases": 4,
        "animal_carcases": 4,
        "garbage overflow": 8,
        "garbageoverflow": 8,
        "garbage_overflow": 8,
        
        // Water Department SLAs
        "waterleak": 24,
        "water leak": 24,
        "water_leak": 24,
        "water contamination": 12,
        "watercontamination": 12,
        "water_contamination": 12,
        "drainage": 24,
        "flooding": 6,
        
        // Electricity Department SLAs
        "poweroutage": 6,
        "power outage": 6,
        "power_outage": 6,
        "streetlight": 24,
        "street light": 24,
        "street_light": 24,
        
        // Default
        "unknown": 24
    };

    // Get current logged-in inspector
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));

        if (!user || user.role !== "INSPECTOR") {
            alert("Access denied. Please login as inspector.");
            navigate("/");
            return;
        }

        if (user.department) {
            setInspectorDepartment(user.department);
        } else {
            console.warn("Inspector has no department assigned");
        }
    }, [navigate]);

    useEffect(() => {
        let intervalId;

        const loadComplaints = async () => {
            try {
                const user = JSON.parse(localStorage.getItem("user"));
                if (!user || !inspectorDepartment) return;

                const response = await getTickets();
                const extracted = [];
                const departmentExtracted = [];

                (response.tickets || []).forEach(ticket => {
                    (ticket.sub_tickets || []).forEach(st => {
                        // Get issue type and normalize it
                        const issue = st.issue_type ? st.issue_type.toLowerCase().trim() : "unknown";
                        
                        // Debug: log the actual issue type from backend
                        console.log("Issue from backend:", issue);
                        
                        // Determine department based on issue type
                        let complaintDepartment = ISSUE_TO_DEPARTMENT[issue] || "General";

                        // If not found, try to match with fallback logic
                        if (!complaintDepartment || complaintDepartment === "General") {
                            console.log("Issue not directly mapped, using fallback:", issue);
                            
                            // First, check if it contains any of our keywords (more specific)
                            if (issue.includes("water") && issue.includes("puddle")) {
                                complaintDepartment = "Roads";
                            } else if (issue.includes("puddle")) {
                                complaintDepartment = "Roads";
                            } else if (issue.includes("water") && (issue.includes("leak") || issue.includes("drainage") || issue.includes("flood"))) {
                                complaintDepartment = "Water";
                            } else if (issue.includes("road") || issue.includes("pothole") || issue.includes("crack") || 
                                      issue.includes("sand") || issue.includes("manhole") || issue.includes("debris")) {
                                complaintDepartment = "Roads";
                            } else if (issue.includes("electric") || issue.includes("power") || issue.includes("light")) {
                                complaintDepartment = "Electricity";
                            } else if (issue.includes("garbage") || issue.includes("hawker") || 
                                      issue.includes("carcas") || issue.includes("overflow")) {
                                complaintDepartment = "Garbage";
                            }
                        }
                        
                        // Get SLA hours
                        const slaHours = SLA_RULES[issue] || 24;
                        
                        console.log(`Issue: ${issue}, Department: ${complaintDepartment}, SLA: ${slaHours} hrs`);

                        const complaint = {
                            id: st.sub_id,
                            issue_type: issue,
                            department: complaintDepartment,
                            confidence: st.confidence,
                            image: st.image_id,
                            mediaType: st.media_type,
                            date: st.created_at,
                            status: st.status || "open",
                            latitude: st.latitude,
                            longitude: st.longitude,
                            area: ticket.area,
                            district: ticket.district,
                            slaHours,
                            ticketId: ticket.ticket_id,
                            timestamp: new Date(st.created_at).getTime(),
                            formattedDate: new Date(st.created_at).toISOString().split('T')[0]
                        };

                        extracted.push(complaint);

                        // Filter complaints by inspector's department
                        if (
                            complaintDepartment &&
                            inspectorDepartment &&
                            complaintDepartment.toLowerCase() === inspectorDepartment.toLowerCase()
                        ) {
                            departmentExtracted.push(complaint);
                        }
                    });
                });

                // Sort all complaints by date (newest first)
                const sortedExtracted = extracted.sort((a, b) => b.timestamp - a.timestamp);

                // Sort department complaints by date (newest first)
                const sortedDepartmentExtracted = departmentExtracted.sort((a, b) => b.timestamp - a.timestamp);

                setComplaints(sortedExtracted);
                setDepartmentComplaints(sortedDepartmentExtracted);
                
                // Debug: log department complaints
                console.log(`Total complaints: ${sortedExtracted.length}`);
                console.log(`Department complaints (${inspectorDepartment}): ${sortedDepartmentExtracted.length}`);
                console.log("Department complaints details:", sortedDepartmentExtracted);
            } catch (err) {
                console.error("Error:", err);
            }
        };

        if (inspectorDepartment) {
            loadComplaints();
            // Poll every 5 seconds for real-time updates
            intervalId = setInterval(loadComplaints, 5000);
        }

        return () => clearInterval(intervalId);
    }, [inspectorDepartment]);

    // Filter complaints based on selected status AND date
    const filteredComplaints = useMemo(() => {
        let filtered = departmentComplaints;

        // Apply status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter(complaint => complaint.status === statusFilter);
        }

        // Apply date filter
        if (dateFilter === "specific" && selectedDate) {
            const selectedDateObj = new Date(selectedDate);
            filtered = filtered.filter(complaint => {
                const complaintDate = new Date(complaint.date);
                return complaintDate.toDateString() === selectedDateObj.toDateString();
            });
        } else if (dateFilter !== "all") {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const last7Days = new Date(today);
            last7Days.setDate(last7Days.getDate() - 7);
            const last30Days = new Date(today);
            last30Days.setDate(last30Days.getDate() - 30);

            filtered = filtered.filter(complaint => {
                const complaintDate = new Date(complaint.date);

                switch (dateFilter) {
                    case "today":
                        return complaintDate.toDateString() === today.toDateString();
                    case "yesterday":
                        return complaintDate.toDateString() === yesterday.toDateString();
                    case "last7days":
                        return complaintDate >= last7Days;
                    case "last30days":
                        return complaintDate >= last30Days;
                    default:
                        return true;
                }
            });
        }

        // Sort by date (newest first) after filtering
        return filtered.sort((a, b) => b.timestamp - a.timestamp);
    }, [departmentComplaints, statusFilter, dateFilter, selectedDate]);

    // Get complaint stats for current department
    const getDepartmentStats = () => {
        const stats = {
            all: departmentComplaints.length,
            open: 0,
            in_progress: 0,
            resolved: 0
        };

        departmentComplaints.forEach(complaint => {
            if (complaint.status === "open") stats.open++;
            else if (complaint.status === "in_progress") stats.in_progress++;
            else if (complaint.status === "resolved") stats.resolved++;
        });

        return stats;
    };

    const departmentStats = getDepartmentStats();

    // Get date range stats
    const getDateRangeStats = () => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);
        const last30Days = new Date(today);
        last30Days.setDate(last30Days.getDate() - 30);

        return {
            today: departmentComplaints.filter(c => new Date(c.date).toDateString() === today.toDateString()).length,
            yesterday: departmentComplaints.filter(c => new Date(c.date).toDateString() === yesterday.toDateString()).length,
            last7days: departmentComplaints.filter(c => new Date(c.date) >= last7Days).length,
            last30days: departmentComplaints.filter(c => new Date(c.date) >= last30Days).length
        };
    };

    const dateRangeStats = getDateRangeStats();

    // Logout handler
    const handleLogout = () => {
        localStorage.clear();
        navigate("/");
    };

    // Update status
    const updateStatus = async (id, newStatus) => {
        try {
            const user = JSON.parse(localStorage.getItem("user"));
            const inspectorName = user ? user.name : null;

            // Call API to update status in backend
            await resolveSubTicket(id, newStatus, null, "", inspectorName);

            // Update in department complaints
            const updatedDepartmentComplaints = departmentComplaints.map(c =>
                c.id === id ? { ...c, status: newStatus } : c
            );

            // Sort after update
            const sortedUpdated = updatedDepartmentComplaints.sort((a, b) => b.timestamp - a.timestamp);
            setDepartmentComplaints(sortedUpdated);

            // Also update in full complaints list if needed
            const updatedAllComplaints = complaints.map(c =>
                c.id === id ? { ...c, status: newStatus } : c
            ).sort((a, b) => b.timestamp - a.timestamp);

            setComplaints(updatedAllComplaints);

            // Save to localStorage for persistence (optional now since backend is updated)
            localStorage.setItem("updated_complaints", JSON.stringify(updatedAllComplaints));

            // Show success message
            setPopupType("success");
            setPopupMessage(`Status updated to ${newStatus.replace('_', ' ')}`);
            setShowPopup(true);
        } catch (error) {
            console.error("Failed to update status:", error);
            setPopupType("error");
            setPopupMessage("Failed to update status. Please try again.");
            setShowPopup(true);
        }
    };

    // Check SLA Breach
    const checkSLABreach = (date, slaHours) => {
        if (!date) return false;
        const created = new Date(date);
        const hoursPassed = (new Date() - created) / 36e5;
        return hoursPassed > slaHours;
    };

    // Handle status filter change
    const handleStatusFilterChange = (e) => {
        setStatusFilter(e.target.value);
    };

    // Handle date filter change
    const handleDateFilterChange = (e) => {
        const value = e.target.value;
        setDateFilter(value);
        if (value !== "specific") {
            setSelectedDate("");
        }
    };

    // Handle specific date change
    const handleSpecificDateChange = (e) => {
        setSelectedDate(e.target.value);
        if (dateFilter !== "specific") {
            setDateFilter("specific");
        }
    };

    // Clear all filters
    const clearAllFilters = () => {
        setStatusFilter("all");
        setDateFilter("all");
        setSelectedDate("");
    };

    // Get status display text
    const getStatusDisplayText = (status) => {
        const statusMap = {
            all: "All",
            open: "Open",
            in_progress: "In Progress",
            resolved: "Resolved"
        };
        return statusMap[status] || status;
    };

    // Get date filter display text
    const getDateFilterDisplayText = () => {
        if (dateFilter === "all") return "All Dates";
        if (dateFilter === "specific" && selectedDate) {
            return new Date(selectedDate).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }

        const dateMap = {
            today: "Today",
            yesterday: "Yesterday",
            last7days: "Last 7 Days",
            last30days: "Last 30 Days",
            specific: "Specific Date"
        };
        return dateMap[dateFilter] || dateFilter;
    };

    // Format relative time (e.g., "2 hours ago")
    const getRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return diffMinutes < 1 ? "Just now" : `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
        }
    };

    return (
        <div className="inspector-container">
            {/* HEADER */}
            <div className="inspector-header">
                <div className="inspector-header-left">
                    <h2 className="inspector-title">Inspector Dashboard</h2>
                    <div className="department-badge">
                        Department: {inspectorDepartment || "Not Assigned"}
                    </div>
                </div>
                <button className="logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </div>

            {/* DEPARTMENT STATS */}
            {inspectorDepartment && (
                <div className="department-stats">
                    <div
                        className={`stat-card ${statusFilter === "all" && dateFilter === "all" ? "stat-active" : ""}`}
                        onClick={clearAllFilters}
                        style={{ cursor: "pointer" }}
                    >
                        <h3>{departmentStats.all}</h3>
                        <p>Total Complaints</p>
                    </div>
                    <div
                        className={`stat-card ${statusFilter === "open" ? "stat-active" : ""}`}
                        onClick={() => {
                            setStatusFilter("open");
                            setDateFilter("all");
                            setSelectedDate("");
                        }}
                        style={{ cursor: "pointer" }}
                    >
                        <h3 style={{ color: '#fbbf24' }}>{departmentStats.open}</h3>
                        <p>Open</p>
                    </div>
                    <div
                        className={`stat-card ${statusFilter === "in_progress" ? "stat-active" : ""}`}
                        onClick={() => {
                            setStatusFilter("in_progress");
                            setDateFilter("all");
                            setSelectedDate("");
                        }}
                        style={{ cursor: "pointer" }}
                    >
                        <h3 style={{ color: '#60a5fa' }}>{departmentStats.in_progress}</h3>
                        <p>In Progress</p>
                    </div>
                    <div
                        className={`stat-card ${statusFilter === "resolved" ? "stat-active" : ""}`}
                        onClick={() => {
                            setStatusFilter("resolved");
                            setDateFilter("all");
                            setSelectedDate("");
                        }}
                        style={{ cursor: "pointer" }}
                    >
                        <h3 style={{ color: '#34d399' }}>{departmentStats.resolved}</h3>
                        <p>Resolved</p>
                    </div>
                </div>
            )}

            <div className="inspector-tabs">
                <button
                    onClick={() => setView("complaints")}
                    className={view === "complaints" ? "active-tab" : ""}
                >
                    Department Complaints ({filteredComplaints.length})
                </button>
                <button
                    onClick={() => setView("tickets")}
                    className={view === "tickets" ? "active-tab" : ""}
                >
                    Ticket Logs
                </button>
            </div>

            {view === "complaints" && (
                <>
                    {departmentComplaints.length === 0 ? (
                        <div className="empty-state">
                            <p className="empty-text">No complaints found for your department ({inspectorDepartment})</p>
                            <p className="empty-subtext">
                                Complaints will automatically appear here when they are assigned to {inspectorDepartment} department.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="complaints-header">
                                <div>
                                    <h3>
                                        Complaints for {inspectorDepartment} Department
                                        {(statusFilter !== "all" || dateFilter !== "all") && (
                                            <span style={{ fontSize: "14px", color: "#94a3b8", marginLeft: "10px" }}>
                                                {statusFilter !== "all" && `Status: ${getStatusDisplayText(statusFilter)}`}
                                                {dateFilter !== "all" && statusFilter !== "all" && " | "}
                                                {dateFilter !== "all" && `Date: ${getDateFilterDisplayText()}`}
                                                {` (${filteredComplaints.length})`}
                                            </span>
                                        )}
                                    </h3>
                                </div>
                                <div className="filter-controls">
                                    <div className="filter-group">
                                        <label className="filter-label">Status</label>
                                        <select
                                            className="filter-dropdown"
                                            value={statusFilter}
                                            onChange={handleStatusFilterChange}
                                        >
                                            <option value="all">All ({departmentStats.all})</option>
                                            <option value="open">Open ({departmentStats.open})</option>
                                            <option value="in_progress">In Progress ({departmentStats.in_progress})</option>
                                            <option value="resolved">Resolved ({departmentStats.resolved})</option>
                                        </select>
                                    </div>

                                    <div className="filter-group">
                                        <label className="filter-label">Date</label>
                                        <select
                                            className="filter-dropdown"
                                            value={dateFilter}
                                            onChange={handleDateFilterChange}
                                        >
                                            <option value="all">All Dates</option>
                                            <option value="today">Today ({dateRangeStats.today})</option>
                                            <option value="yesterday">Yesterday ({dateRangeStats.yesterday})</option>
                                            <option value="last7days">Last 7 Days ({dateRangeStats.last7days})</option>
                                            <option value="last30days">Last 30 Days ({dateRangeStats.last30days})</option>
                                            <option value="specific">Specific Date</option>
                                        </select>
                                    </div>

                                    {dateFilter === "specific" && (
                                        <div className="filter-group">
                                            <label className="filter-label">Select Date</label>
                                            <div className="date-input-container">
                                                <div className="date-label">DATE</div>
                                                <input
                                                    type="date"
                                                    className="date-input"
                                                    value={selectedDate}
                                                    onChange={handleSpecificDateChange}
                                                    placeholder="dd-mm-yyyy"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {(statusFilter !== "all" || dateFilter !== "all") && (
                                        <button
                                            className="clear-filter-btn"
                                            onClick={clearAllFilters}
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            </div>

                            {filteredComplaints.length === 0 ? (
                                <div className="empty-state">
                                    <p className="empty-text">
                                        No complaints found for the selected filters
                                    </p>
                                    <p className="empty-subtext">
                                        {statusFilter !== "all" && dateFilter !== "all"
                                            ? `No ${getStatusDisplayText(statusFilter).toLowerCase()} complaints found for ${getDateFilterDisplayText().toLowerCase()}`
                                            : statusFilter !== "all"
                                                ? `No ${getStatusDisplayText(statusFilter).toLowerCase()} complaints found`
                                                : dateFilter !== "all"
                                                    ? `No complaints found for ${getDateFilterDisplayText().toLowerCase()}`
                                                    : "No complaints found"}
                                    </p>
                                    <button
                                        className="logout-btn"
                                        onClick={clearAllFilters}
                                        style={{ marginTop: "20px", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
                                    >
                                        Clear All Filters
                                    </button>
                                </div>
                            ) : (
                                <div className="complaints-grid">
                                    {filteredComplaints.map((c, index) => {
                                        const breached = checkSLABreach(c.date, c.slaHours);
                                        const hoursPassed = c.date ? ((new Date() - new Date(c.date)) / 36e5).toFixed(1) : "N/A";
                                        const relativeTime = getRelativeTime(c.date);

                                        return (
                                            <div
                                                className="complaint-card-grid"
                                                key={c.id}
                                                style={{
                                                    border: breached ? "2px solid #ef4444" : "1px solid rgba(255,255,255,0.08)",
                                                    borderLeft: breached ? "4px solid #ef4444" : "4px solid rgba(59, 130, 246, 0.5)",
                                                    position: "relative"
                                                }}
                                            >
                                                {/* New indicator for recent complaints */}
                                                {index < 3 && statusFilter === "all" && dateFilter === "all" && (
                                                    <div className="new-indicator">
                                                        {index === 0 ? "🆕 NEWEST" : index === 1 ? "🆕 RECENT" : "🆕 RECENT"}
                                                    </div>
                                                )}

                                                <div className="complaint-image-wrapper">
                                                    {c.image ? (
                                                        c.mediaType === 'video' ? (
                                                            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                                                <video
                                                                    src={getImageUrl(c.image)}
                                                                    className="complaint-image-grid"
                                                                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                                                                    controls
                                                                />
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    top: '8px',
                                                                    right: '8px',
                                                                    background: 'rgba(0,0,0,0.6)',
                                                                    color: 'white',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    fontSize: '10px',
                                                                    fontWeight: 'bold'
                                                                }}>
                                                                    VIDEO
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <img
                                                                src={getImageUrl(c.image)}
                                                                className="complaint-image-grid"
                                                                alt="Complaint"
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.style.display = 'none';
                                                                    e.target.parentElement.innerHTML = '<div class="no-media-box">Image Not Available</div>';
                                                                }}
                                                            />
                                                        )
                                                    ) : (
                                                        <div className="no-media-box">No Media</div>
                                                    )}
                                                </div>

                                                <div className="complaint-info-grid">
                                                    <div className="complaint-header-row">
                                                        <div>
                                                            <p><strong>ID:</strong> {c.id}</p>
                                                            <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "-5px" }}>
                                                                Ticket: {c.ticketId}
                                                            </p>
                                                        </div>
                                                        <div style={{ textAlign: "right" }}>
                                                            <span className={`status-badge status-${c.status}`}>
                                                                {c.status.replace('_', ' ')}
                                                            </span>
                                                            <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "5px" }}>
                                                                {relativeTime}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <p><strong>Issue:</strong> {c.issue_type}</p>
                                                    <p><strong>Department:</strong> {c.department}</p>
                                                    <p><strong>Confidence:</strong> <span style={{ color: c.confidence > 0.8 ? "#34d399" : c.confidence > 0.6 ? "#fbbf24" : "#f87171" }}>
                                                        {(c.confidence * 100).toFixed(1)}%
                                                    </span></p>

                                                    <div className="status-control">
                                                        <label><strong>Update Status:</strong></label>
                                                        <select
                                                            className="status-dropdown"
                                                            value={c.status}
                                                            onChange={(e) => updateStatus(c.id, e.target.value)}
                                                        >
                                                            <option value="open">Open</option>
                                                            <option value="in_progress">In Progress</option>
                                                            <option value="resolved">Resolved</option>
                                                        </select>
                                                    </div>

                                                    <div style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        margin: "10px 0",
                                                        padding: "10px",
                                                        background: breached ? "rgba(220, 38, 38, 0.1)" : "rgba(34, 197, 94, 0.1)",
                                                        borderRadius: "8px",
                                                        border: `1px solid ${breached ? "rgba(220, 38, 38, 0.3)" : "rgba(34, 197, 94, 0.3)"}`
                                                    }}>
                                                        <div>
                                                            <p style={{ fontSize: "12px", margin: 0, color: "#94a3b8" }}>SLA Limit</p>
                                                            <p style={{ fontSize: "14px", margin: "4px 0 0 0", fontWeight: "600" }}>{c.slaHours} hrs</p>
                                                        </div>
                                                        <div>
                                                            <p style={{ fontSize: "12px", margin: 0, color: "#94a3b8" }}>Time Passed</p>
                                                            <p style={{ fontSize: "14px", margin: "4px 0 0 0", fontWeight: "600", color: breached ? "#f87171" : "#34d399" }}>
                                                                {hoursPassed} hrs
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p style={{ fontSize: "12px", margin: 0, color: "#94a3b8" }}>Status</p>
                                                            <span className={breached ? "breach-yes" : "breach-no"}>
                                                                {breached ? "Breached" : "OK"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <p><strong>Area:</strong> {c.area}</p>
                                                    <p><strong>District:</strong> {c.district}</p>
                                                    <p><strong>Reported:</strong> {new Date(c.date).toLocaleDateString()} at {new Date(c.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>

                                                    {c.latitude && c.longitude && (
                                                        <p style={{ marginTop: "15px" }}>
                                                            <a
                                                                href={`https://maps.google.com/?q=${c.latitude},${c.longitude}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="map-link"
                                                            >
                                                                📍 View Location on Map
                                                            </a>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {view === "tickets" && (
                <>
                    <div className="complaints-header">
                        <h3>All Ticket Logs</h3>
                    </div>
                    <TicketLog />
                </>
            )}

            {/* POPUP MODAL */}
            {showPopup && (
                <div className="popup-overlay">
                    <div className={`popup-modal ${popupType}`}>
                        <h3>{popupType === "success" ? "Success" : "Error"}</h3>
                        <p>{popupMessage}</p>
                        <button onClick={() => setShowPopup(false)}>OK</button>
                    </div>
                </div>
            )}
        </div>
    );
}