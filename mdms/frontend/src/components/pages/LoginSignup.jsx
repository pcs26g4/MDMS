import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LoginSignup.css";
import { login, signup } from "../../services/api";

export default function LoginSignup() {
  const [action, setAction] = useState("Sign Up");

  // Existing states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // NEW: role (only for signup)
  const [role, setRole] = useState("USER");
  const [department, setDepartment] = useState(""); // Add department state

  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  // ---------------- VALIDATION ----------------
  const validateForm = () => {
    let newErrors = {};

    if (action === "Sign Up") {
      if (!name.trim()) {
        newErrors.name = "Name is required";
      } else if (name.length < 3) {
        newErrors.name = "Name must be at least 3 characters";
      }
    }

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = "Enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (action === "Sign Up" && password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---------------- SUBMIT ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    console.log("Submitting form...", action, name, email);

    try {
      /* ---------------- SIGN UP ---------------- */
      if (action === "Sign Up") {
        const res = await signup(name, email, password, role, department);
        console.log("Signup response:", res);
        alert(
          role === "INSPECTOR"
            ? "Inspector account created. Waiting for admin approval."
            : "Signup successful. Please login."
        );
        // Switch to login view
        setAction("Log In");
        return;
      }

      /* ---------------- LOG IN ---------------- */
      const data = await login(email, password);
      console.log("Login success:", data);

      if (data.status === "success") {
        // Save user to storage (session for now to allow multi-tab testing if desired, or local)
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.user.role === "INSPECTOR") navigate("/inspector");
        else if (data.user.role === "ADMIN") navigate("/admin");
        else navigate("/home");
      }

    } catch (error) {
      console.error("Auth failed:", error);
      if (error.message && error.message.includes("Email already registered")) {
        alert("This email is already registered. Please use another email or log in.");
      } else {
        alert(error.message || "Authentication failed");
      }
    }
  };

  // ---------------- UI ----------------
  return (
    <div className="container">
      <div className="head">
        <div className="header">{action}</div>
        <div className="underline"></div>
      </div>

      <div className="submit-container">
        <button
          className={action === "Log In" ? "submit gray" : "submit"}
          onClick={() => setAction("Sign Up")}
        >
          Sign Up
        </button>

        <button
          className={action === "Sign Up" ? "submit gray" : "submit"}
          onClick={() => setAction("Log In")}
        >
          Log In
        </button>
      </div>

      {/* Name */}
      {action === "Sign Up" && (
        <>
          <div className="input">
            <input
              type="text"
              placeholder="Name"
              className="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {errors.name && <p className="error">{errors.name}</p>}
        </>
      )}

      {/* Email */}
      <div className="input">
        <input
          type="email"
          placeholder="Email"
          className="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {errors.email && <p className="error">{errors.email}</p>}

      {/* Password */}
      <div className="input">
        <input
          type="password"
          placeholder="Password"
          className="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {errors.password && <p className="error">{errors.password}</p>}

      {/* Role selection (ONLY signup) */}
      {action === "Sign Up" && (
        <div className="input">
          <select
            className="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="USER">User</option>
            <option value="INSPECTOR">Inspector</option>
          </select>
        </div>
      )}

      {action === "Sign Up" && role === "INSPECTOR" && (
        <div className="input">
          <select
            className="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="" disabled>Select Department</option>
            <option value="Roads">Roads Department</option>
            <option value="Garbage">Garbage Department</option>
            <option value="Water">Water Department</option>
            <option value="Electricity">Electricity Department</option>
          </select>
        </div>
      )}

      {action === "Log In" && (
        <div className="forget-password">
          Forget Password? <span>Click here!</span>
        </div>
      )}

      <button className="submit full" onClick={handleSubmit}>
        {action}
      </button>
    </div>
  );
}