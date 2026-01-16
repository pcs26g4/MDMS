import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Landing.css";

function Landing() {
  const [showModal, setShowModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  // Refs to clear form fields
  const loginFormRef = useRef(null);
  const signupFormRef = useRef(null);

  // Clear form fields when modal opens/closes or mode changes
  useEffect(() => {
    if (showModal) {
      clearFormFields();
    }
  }, [showModal, isLogin]);

  const clearFormFields = () => {
    if (loginFormRef.current) loginFormRef.current.reset();
    if (signupFormRef.current) signupFormRef.current.reset();
  };

  /* ================= LOGIN ================= */
  const handleLogin = (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    const email = formData.get("login_email_field");
    const password = formData.get("login_password_field");

    const users = JSON.parse(localStorage.getItem("users")) || [];

    // Admin login
    if (email === "admin@mdms.com" && password === "Admin@123") {
      localStorage.setItem("user", JSON.stringify({ role: "ADMIN" }));
      navigate("/admin");
      return;
    }

    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      alert("Invalid email or password!");
      return;
    }

    if (user.role === "INSPECTOR" && !user.isApproved) {
      alert("Inspector account not approved yet!");
      return;
    }

    localStorage.setItem("user", JSON.stringify(user));

    if (user.role === "INSPECTOR") navigate("/inspector");
    else navigate("/home");

    setShowModal(false);
    clearFormFields();
  };

  /* ================= SIGNUP ================= */
  const handleSignup = (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    const name = formData.get("signup_name_field");
    const email = formData.get("signup_email_field");
    const password = formData.get("signup_password_field");
    const role = formData.get("signup_role_field");

    const users = JSON.parse(localStorage.getItem("users")) || [];

    if (users.some((u) => u.email === email)) {
      alert("Email already registered!");
      return;
    }

    const newUser = {
      id: Date.now(),
      name,
      email,
      password,
      role,
      isApproved: role === "INSPECTOR" ? false : true,
    };

    users.push(newUser);
    localStorage.setItem("users", JSON.stringify(users));

    // Show success popup with appropriate message
    if (role === "INSPECTOR") {
      setSuccessMessage("Inspector account created. Waiting for admin approval.");
    } else {
      setSuccessMessage("Account created successfully! Please login.");
    }
    
    setShowSuccessPopup(true);
    
    // Switch to login mode after signup
    setIsLogin(true);
    if (signupFormRef.current) signupFormRef.current.reset();
    setShowModal(false);
  };

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false);
    setSuccessMessage("");
  };

  return (
    <>
      {/* TOP NAVIGATION */}
      <div className="top-nav">
        <div className="nav-left">
          <div className="logo-box">
            <img 
              src="/logo.png" 
              alt="MDMS Logo" 
              className="logo-img"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = "none";
              }}
            />
            <h1 className="logo-title">MDMS</h1>
          </div>
        </div>

        <div className="nav-right">
          {/* ⭐ ADMIN LOGIN BUTTON ADDED ⭐ */}
          <button
            className="nav-btn admin-btn-nav"
            onClick={() => {
              setIsLogin(true);
              setShowModal(true);
              clearFormFields();
            }}
            style={{ backgroundColor: "#f04444", marginRight: "10px" }}
          >
            Admin Login
          </button>

          {/* USER LOGIN BUTTON */}
          <button
            className="nav-btn login-btn-nav"
            onClick={() => {
              setIsLogin(true);
              setShowModal(true);
              clearFormFields();
            }}
          >
            Login
          </button>

          {/* SIGNUP BUTTON */}
          <button
            className="nav-btn signup-btn-nav"
            onClick={() => {
              setIsLogin(false);
              setShowModal(true);
              clearFormFields();
            }}
          >
            Signup
          </button>
        </div>
      </div>

      {/* MAIN LANDING PAGE */}
      <section className="hero-wrapper">
        <div className="hero-container">
          <div className="hero-left">
            <span className="org-label">[ Municipal Governance System ]</span>

            <h1 className="hero-title">
              Managing Municipal Deviations <br /> With Accuracy &
              Accountability
            </h1>

            <p className="hero-subtext">
              A unified digital platform for tracking, resolving, and monitoring
              municipal deviations efficiently.
            </p>

            <button
              className="cta-btn"
              onClick={() => {
                setIsLogin(true);
                setShowModal(true);
                clearFormFields();
              }}
            >
              View Dashboard →
            </button>

            <div className="features-row">
              <div className="feature-item">
                <h4>Complaint Tracking</h4>
                <p>Real-time logging and monitoring of deviations.</p>
              </div>
              <div className="feature-item">
                <h4>Smart Assignment</h4>
                <p>Auto-assign complaints by category & location.</p>
              </div>
              <div className="feature-item">
                <h4>Resolution Insights</h4>
                <p>Performance analytics with SLA tracking.</p>
              </div>
            </div>
          </div>

          <div className="hero-right">
            <div className="video-wrapper">
              <video
                className="hero-video"
                src="/landing-video2.mp4"
                autoPlay
                loop
                muted
              ></video>
            </div>
          </div>
        </div>
      </section>

      {/* LOGIN / SIGNUP MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button className="modal-close" onClick={() => setShowModal(false)}>
              ×
            </button>

            {/* LOGIN */}
            {isLogin ? (
              <>
                <h2>Login</h2>

                <form ref={loginFormRef} onSubmit={handleLogin}>
                  <input
                    name="login_email_field"
                    type="email"
                    placeholder="Email"
                    required
                    className="input-field"
                  />
                  <input
                    name="login_password_field"
                    type="password"
                    placeholder="Password"
                    required
                    className="input-field"
                  />

                  <button type="submit" className="login-btn">Login</button>
                </form>

                <p className="switch-text">
                  Don't have an account?
                  <span onClick={() => setIsLogin(false)}> Signup</span>
                </p>
              </>
            ) : (
              <>
                <h2>Signup</h2>

                <form ref={signupFormRef} onSubmit={handleSignup}>
                  <input
                    name="signup_name_field"
                    type="text"
                    required
                    placeholder="Full Name"
                    className="input-field"
                  />
                  <input
                    name="signup_email_field"
                    type="email"
                    required
                    placeholder="Email"
                    className="input-field"
                  />
                  <input
                    name="signup_password_field"
                    type="password"
                    required
                    placeholder="Password"
                    className="input-field"
                  />

                  <select 
                    name="signup_role_field"
                    className="input-field"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>Select Role</option>
                    <option value="USER">User</option>
                    <option value="INSPECTOR">Inspector</option>
                  </select>

                  <button type="submit" className="login-btn">Create Account</button>
                </form>

                <p className="switch-text">
                  Already have an account?
                  <span onClick={() => setIsLogin(true)}> Login</span>
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* SUCCESS POPUP */}
      {showSuccessPopup && (
        <div className="modal-overlay">
          <div className="modal-box success-popup">
            <button className="modal-close" onClick={handleCloseSuccessPopup}>
              ×
            </button>
            
            <div className="success-icon">
              {successMessage.includes("Inspector") ? (
                <div className="icon-wrapper">
                  <span className="pending-icon">⏳</span>
                </div>
              ) : (
                <div className="icon-wrapper">
                  <span className="success-icon-check">✓</span>
                </div>
              )}
            </div>
            
            <h3>
              {successMessage.includes("Inspector") 
                ? "Account Submitted" 
                : "Account Created"}
            </h3>
            
            <p className="success-message">{successMessage}</p>
            
            <button 
              className="login-btn" 
              onClick={handleCloseSuccessPopup}
              style={{ marginTop: "20px" }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Landing;