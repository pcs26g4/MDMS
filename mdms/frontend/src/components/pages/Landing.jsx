import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Landing.css";
import { login, signup } from "../../services/api";

function Landing() {
    const [showModal, setShowModal] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [selectedRole, setSelectedRole] = useState(""); // ADDED
    const navigate = useNavigate();

    // Refs to clear form fields
    const loginFormRef = useRef(null);
    const signupFormRef = useRef(null);

    useEffect(() => {
        if (showModal) {
            clearFormFields();
        }
    }, [showModal, isLogin]);

    const clearFormFields = () => {
        if (loginFormRef.current) loginFormRef.current.reset();
        if (signupFormRef.current) signupFormRef.current.reset();
        setSelectedRole(""); // reset dropdown state when modal closes
    };

    /* ================= LOGIN ================= */
    const handleLogin = async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const email = formData.get("login_email_field");
        const password = formData.get("login_password_field");

        // Admin login (keep hardcoded for now)
        if (email === "admin@mdms.com" && password === "Admin123") {
            localStorage.setItem("user", JSON.stringify({ role: "ADMIN", name: "Admin" }));
            navigate("/admin");
            return;
        }

        try {
            const response = await login(email, password);
            const user = response.user;

            localStorage.setItem("user", JSON.stringify(user));

            if (user.role === "INSPECTOR") navigate("/inspector");
            else navigate("/home");

            setShowModal(false);
            clearFormFields();
        } catch (err) {
            alert(err.message || "Login failed");
        }
    };

    /* ================= SIGNUP ================= */
    const handleSignup = async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const name = formData.get("signup_name_field");
        const email = formData.get("signup_email_field");
        const password = formData.get("signup_password_field");
        const role = formData.get("signup_role_field");
        const department = formData.get("signup_department_field") || null;

        try {
            await signup(name, email, password, role, department);
            alert("Signup successful! Please login.");
            setIsLogin(true);
            if (signupFormRef.current) signupFormRef.current.reset();
            setSelectedRole("");
        } catch (err) {
            alert(err.message || "Signup failed");
        }
    };

    // Function to assign complaint to inspector based on department
    const assignComplaintToInspector = (complaint) => {
        const users = JSON.parse(localStorage.getItem("users")) || [];
        const approvedInspectors = users.filter(
            (user) => user.role === "INSPECTOR" && user.isApproved
        );

        // Find inspectors in the same department as the complaint
        const departmentInspectors = approvedInspectors.filter(
            (inspector) => inspector.department === complaint.department
        );

        // If no inspector in the same department, get all inspectors
        const availableInspectors = departmentInspectors.length > 0
            ? departmentInspectors
            : approvedInspectors;

        if (availableInspectors.length === 0) {
            return null; // No inspectors available
        }

        // Simple round-robin assignment based on complaint count
        const complaints = JSON.parse(localStorage.getItem("complaints")) || [];

        // Find which inspector has the least complaints assigned
        const inspectorWorkload = availableInspectors.map(inspector => {
            const assignedCount = complaints.filter(
                c => c.assignedTo === inspector.id &&
                    (c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS')
            ).length;
            return { inspector, count: assignedCount };
        });

        // Sort by workload (ascending)
        inspectorWorkload.sort((a, b) => a.count - b.count);

        return inspectorWorkload[0].inspector.id;
    };

    // Function to create a complaint with automatic assignment
    const createComplaintWithAssignment = (complaintData) => {
        const complaints = JSON.parse(localStorage.getItem("complaints")) || [];
        const newComplaint = {
            ...complaintData,
            id: Date.now(),
            createdAt: new Date().toISOString(),
            status: 'PENDING'
        };

        // Try to auto-assign based on department
        const assignedInspectorId = assignComplaintToInspector(newComplaint);

        if (assignedInspectorId) {
            newComplaint.assignedTo = assignedInspectorId;
            newComplaint.status = 'ASSIGNED';
            newComplaint.assignedAt = new Date().toISOString();
        }

        complaints.push(newComplaint);
        localStorage.setItem("complaints", JSON.stringify(complaints));

        return {
            ...newComplaint,
            autoAssigned: !!assignedInspectorId
        };
    };

    // Function to manually assign complaint (for admin use)
    const manuallyAssignComplaint = (complaintId, inspectorId) => {
        const complaints = JSON.parse(localStorage.getItem("complaints")) || [];
        const complaintIndex = complaints.findIndex(c => c.id === complaintId);

        if (complaintIndex !== -1) {
            complaints[complaintIndex] = {
                ...complaints[complaintIndex],
                assignedTo: inspectorId,
                status: 'ASSIGNED',
                assignedAt: new Date().toISOString()
            };

            localStorage.setItem("complaints", JSON.stringify(complaints));
            return true;
        }
        return false;
    };

    // Function to get available inspectors for a department
    const getInspectorsByDepartment = (department) => {
        const users = JSON.parse(localStorage.getItem("users")) || [];
        return users.filter(
            user => user.role === "INSPECTOR" &&
                user.isApproved &&
                user.department === department
        );
    };

    // Function to get all inspectors grouped by department
    const getInspectorsByAllDepartments = () => {
        const users = JSON.parse(localStorage.getItem("users")) || [];
        const inspectors = users.filter(
            user => user.role === "INSPECTOR" && user.isApproved
        );

        const grouped = {};
        inspectors.forEach(inspector => {
            if (!grouped[inspector.department]) {
                grouped[inspector.department] = [];
            }
            grouped[inspector.department].push(inspector);
        });

        return grouped;
    };

    // Function to get complaints by inspector department
    const getComplaintsForInspectorDepartment = (inspectorId) => {
        const users = JSON.parse(localStorage.getItem("users")) || [];
        const complaints = JSON.parse(localStorage.getItem("complaints")) || [];

        const inspector = users.find(user => user.id === inspectorId);
        if (!inspector || inspector.role !== 'INSPECTOR') return [];

        return complaints.filter(complaint =>
            complaint.department === inspector.department
        );
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

            {/* MAIN PAGE */}
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
            <div className={`modal-overlay ${showModal ? '' : 'hidden'}`}>
                <div className="modal-box">
                    <button className="modal-close" onClick={() => setShowModal(false)}>
                        ×
                    </button>

                    {/* LOGIN FORM */}
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
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                >
                                    <option value="" disabled>Select Role</option>
                                    <option value="USER">User</option>
                                    <option value="INSPECTOR">Inspector</option>
                                </select>

                                {/* SHOW DEPARTMENT ONLY IF INSPECTOR */}
                                {selectedRole === "INSPECTOR" && (
                                    <select
                                        name="signup_department_field"
                                        className="input-field"
                                        required
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Select Department</option>
                                        <option value="Roads">Roads Department</option>
                                        <option value="Garbage">Garbage Department</option>
                                        <option value="Water">Water Department</option>
                                        <option value="Electricity">Electricity Department</option>
                                    </select>
                                )}

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
        </>
    );
}

export default Landing;