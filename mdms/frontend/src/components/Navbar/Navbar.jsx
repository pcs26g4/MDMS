import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));

  function handleLogout() {
    localStorage.clear();
    navigate("/");
  }

  return (
    <nav className="navbar">
      {/* LEFT: Logo + Brand */}
      <div className="nav-left">
        <div className="logo">MDMS</div>
        <span className="brand-text">Municipal Deviation Management System</span>
      </div>

      {/* HAMBURGER (mobile only) */}
      <button
        className="hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰
      </button>

      {/* RIGHT: Links + Logout */}
      <div className={`nav-right ${menuOpen ? "open" : ""}`}>
        {/* SHARED LINKS */}

        {/* USER SPECIFIC */}
        {user?.role === "USER" && (
          <Link to="/home" onClick={() => setMenuOpen(false)}>Home</Link>
        )}

        {/* INSPECTOR SPECIFIC */}
        {user?.role === "INSPECTOR" && (
          <Link to="/inspector" onClick={() => setMenuOpen(false)}>Dashboard</Link>
        )}

        {/* COMMON LINKS (ACCESSIBLE TO BOTH) */}
        {(user?.role === "USER" || user?.role === "INSPECTOR") && (
          <>
            <Link to="/map" onClick={() => setMenuOpen(false)}>Map</Link>
            <Link to="/complaints" onClick={() => setMenuOpen(false)}>Complaints</Link>
            <Link to="/tickets" onClick={() => setMenuOpen(false)}>TicketLog</Link>
            <Link to="/live" onClick={() => setMenuOpen(false)}>Live Monitoring</Link>
          </>
        )}

        <button
          className="logout-btn"
          onClick={() => {
            setMenuOpen(false);
            handleLogout();
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
