import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/TicketLog.css";
import { getTickets, getImageUrl, deleteTicket } from "../../services/api";

function TicketLog() {
  /* ===============================
     CONSTANTS
  =============================== */
  const ITEMS_PER_PAGE = 10;

  /* ===============================
     FILTER OPTIONS - UPDATED
  =============================== */
  const distortions = [
    "all",
    "sand_on_road",
    "road_cracks",
    "street_hawkers",
    "animal_carcases",
    "potholes",
    "water_puddles",
    "garbage_overflow",
    "open_manholes",
    "street_debris"
  ];

  const statuses = ["all", "open", "in_progress", "resolved", "closed"];

  /* ===============================
     STATE
  =============================== */
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);

  /* ===============================
     FETCH TICKETS
  =============================== */
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await getTickets();
        // Flatten tickets with sub_tickets
        const allSubTickets = [];
        (response.tickets || []).forEach(ticket => {
          (ticket.sub_tickets || []).forEach(subTicket => {
            allSubTickets.push({
              ...subTicket,
              ticket_id: ticket.ticket_id,
              latitude: subTicket.latitude,
              longitude: subTicket.longitude,
              area: ticket.area,
              district: ticket.district
            });
          });
        });
        setTickets(allSubTickets);
      } catch (error) {
        console.error("Failed to fetch tickets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();

    // Refresh data when user returns to this tab
    window.addEventListener('focus', fetchTickets);
    return () => window.removeEventListener('focus', fetchTickets);
  }, []);

  /* ===============================
     FILTER STATE
  =============================== */
  const [selectedDistortion, setSelectedDistortion] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");

  /* ===============================
     FILTER VISIBILITY STATE
  =============================== */
  const [showFilters, setShowFilters] = useState(false);

  /* ===============================
     PAGINATION STATE
  =============================== */
  const [currentPage, setCurrentPage] = useState(1);

  /* ===============================
     HELPER FUNCTIONS
  =============================== */
  
  // Function to normalize issue_type from database to match filter values
  const normalizeIssueType = (issueType) => {
    if (!issueType) return "";
    
    // Convert to lowercase and remove any spaces
    const cleaned = issueType.toLowerCase().trim();
    
    // Direct mapping of database values to filter values
    const mapping = {
      // Water puddles variations
      "waterpuddles": "water_puddles",
      "waterpuddle": "water_puddles",
      "water_puddle": "water_puddles",
      "water_puddles": "water_puddles",
      
      // Open manholes variations
      "openmanholes": "open_manholes",
      "openmanhole": "open_manholes",
      "open_manholes": "open_manholes",
      "open_manhole": "open_manholes",
      
      // Garbage overflow variations
      "garbageoverflow": "garbage_overflow",
      "garbage_overflow": "garbage_overflow",
      
      // Sand on road variations
      "sandonroad": "sand_on_road",
      "sand_on_road": "sand_on_road",
      
      // Road cracks variations
      "roadcracks": "road_cracks",
      "roadcrack": "road_cracks",
      "road_cracks": "road_cracks",
      "road_crack": "road_cracks",
      
      // Street hawkers variations
      "streethawkers": "street_hawkers",
      "streethawker": "street_hawkers",
      "street_hawkers": "street_hawkers",
      "street_hawker": "street_hawkers",
      
      // Animal carcases variations
      "animalcarcases": "animal_carcases",
      "animalcarcass": "animal_carcases",
      "animal_carcases": "animal_carcases",
      "animal_carcass": "animal_carcases",
      
      // Potholes variations
      "potholes": "potholes",
      "pothole": "potholes",
      
      // Street debris variations
      "streetdebris": "street_debris",
      "street_debris": "street_debris",
    };
    
    // Return the mapped value or the original if not found
    return mapping[cleaned] || cleaned;
  };

  // Function to format distortion for display
  const formatDistortionName = (distortion) => {
    if (distortion === "all") return "ALL";
    
    return distortion
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  /* ===============================
     FILTER + SORT LOGIC
  =============================== */
  const filteredTickets = tickets
    .filter((ticket) => {
      // Normalize the ticket's issue_type for comparison
      const normalizedIssueType = normalizeIssueType(ticket.issue_type);
      
      // Debug logging
      console.log(`Filtering: Ticket issue_type="${ticket.issue_type}", Normalized="${normalizedIssueType}", Selected filter="${selectedDistortion}"`);
      
      const distortionMatch =
        selectedDistortion === "all" ||
        normalizedIssueType === selectedDistortion;

      const statusMatch =
        selectedStatus === "all" || 
        (ticket.status && ticket.status.toLowerCase() === selectedStatus.toLowerCase());

      const dateMatch =
        selectedDate === "" ||
        (ticket.created_at && ticket.created_at.startsWith(selectedDate));

      return distortionMatch && statusMatch && dateMatch;
    })
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
      const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
      return dateB - dateA;
    });

  /* ===============================
     PAGINATION LOGIC
  =============================== */
  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleLocationClick = (ticketId, lat, lng) => {
    if (!lat || !lng) return;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, "_blank");
  };

  const handleDelete = async (ticketId) => {
    if (!window.confirm(`Are you sure you want to delete ticket ${ticketId}?`)) {
      return;
    }

    try {
      await deleteTicket(ticketId);
      // Remove all sub-tickets belonging to this ticket from local state
      setTickets((prev) => prev.filter((t) => t.ticket_id !== ticketId));
      alert("Ticket deleted successfully");
    } catch (error) {
      console.error("Failed to delete ticket:", error);
      alert("Failed to delete ticket: " + error.message);
    }
  };

  return (
    <div className="ticket-log">
      {/* ===============================
          FILTER BUTTON
      =============================== */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "12px",
        }}
      >
        <button
          onClick={() => setShowFilters((prev) => !prev)}
          style={{
            background: "#ff5a4e",
            color: "#ffffff",
            border: "none",
            padding: "10px 18px",
            borderRadius: "6px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          🔽 FILTER
        </button>
      </div>

      {/* ===============================
          FILTER BAR (TOGGLE)
      =============================== */}
      {showFilters && (
        <div className="filter-bar">
          <div className="filter-group">
            <label className="filter-label">Distortion Type</label>
            <select
              value={selectedDistortion}
              onChange={(e) =>
                handleFilterChange(setSelectedDistortion)(e.target.value)
              }
              style={{ width: "100%" }}
            >
              {distortions.map((dist) => (
                <option key={dist} value={dist}>
                  {formatDistortionName(dist)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) =>
                handleFilterChange(setSelectedStatus)(e.target.value)
              }
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? "ALL" : status.replace("_", " ").toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) =>
                handleFilterChange(setSelectedDate)(e.target.value)
              }
            />
          </div>
        </div>
      )}

      {/* ===============================
          TABLE
      =============================== */}
      <div className="table-wrapper">
        <table className="ticket-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Preview</th>
              <th>Sub ID</th>
              <th>Issue Type</th>
              <th>Confidence</th>
              <th>Area</th>
              <th>District</th>
              <th>Date & Time</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="11" className="no-data">
                  Loading...
                </td>
              </tr>
            ) : paginatedTickets.length === 0 ? (
              <tr>
                <td colSpan="11" className="no-data">
                  No records found
                </td>
              </tr>
            ) : (
              paginatedTickets.map((ticket, index) => {
                const lat = ticket.latitude;
                const lng = ticket.longitude;
                const imageId = ticket.image_id;

                return (
                  <tr key={ticket.sub_id || index}>
                    <td>{startIndex + index + 1}</td>

                    <td className="preview-cell">
                      {imageId ? (
                        ticket.media_type === 'video' ? (
                          <div className="preview-video-container" onClick={() => setPreviewImage({ url: getImageUrl(imageId), type: 'video' })}>
                            <video
                              src={getImageUrl(imageId)}
                              className="preview-img clickable"
                              muted
                              playsInline
                            />
                            <div className="play-overlay">▶</div>
                          </div>
                        ) : (
                          <img
                            src={getImageUrl(imageId)}
                            alt="Complaint"
                            className="preview-img clickable"
                            onClick={() => setPreviewImage({ url: getImageUrl(imageId), type: 'image' })}
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%" y="50%" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        )
                      ) : (
                        <div className="preview-img" style={{
                          background: '#ddd',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#999'
                        }}>
                          No Media
                        </div>
                      )}
                    </td>

                    <td>{ticket.sub_id || ticket.ticket_id}</td>
                    <td>
                      {ticket.issue_type ? 
                        formatDistortionName(normalizeIssueType(ticket.issue_type)) : 
                        "-"
                      }
                    </td>
                    <td>
                      {ticket.confidence
                        ? `${(ticket.confidence * 100).toFixed(1)}%`
                        : "-"}
                    </td>
                    <td>{ticket.area || "-"}</td>
                    <td>{ticket.district || "-"}</td>
                    <td>
                      {ticket.created_at
                        ? new Date(ticket.created_at).toLocaleDateString()
                        : "-"}
                      <br />
                      <span style={{ fontSize: "12px", opacity: 0.7 }}>
                        {ticket.created_at
                          ? new Date(ticket.created_at).toLocaleTimeString()
                          : "-"}
                      </span>
                    </td>

                    <td>
                      {lat && lng ? (
                        <span
                          className="location-link"
                          onClick={() => handleLocationClick(ticket.sub_id || ticket.ticket_id, lat, lng)}
                        >
                          {lat.toFixed(6)}, {lng.toFixed(6)}
                        </span>
                      ) : (
                        <span className="location-link" style={{ opacity: 0.7, cursor: 'default' }}>
                          Location not available
                        </span>
                      )}
                    </td>

                    <td>
                      <span className={`status-badge status-${ticket.status?.toLowerCase() || 'unknown'}`}>
                        {ticket.status ? ticket.status.toUpperCase() : "-"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(ticket.ticket_id)}
                        title="Delete Ticket"
                        style={{
                          background: "#ff4d4d",
                          color: "white",
                          border: "none",
                          padding: "6px 10px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "14px"
                        }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ===============================
          PAGINATION
      =============================== */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              className={currentPage === i + 1 ? "active" : ""}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* ===============================
          IMAGE MODAL PREVIEW
      =============================== */}
      {previewImage && (
        <div className="modal-overlay" onClick={() => setPreviewImage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPreviewImage(null)}>
              &times;
            </button>
            {previewImage.type === 'video' ? (
              <video src={previewImage.url} controls autoPlay className="modal-img" />
            ) : (
              <img src={previewImage.url} alt="Enlarged preview" className="modal-img" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketLog;