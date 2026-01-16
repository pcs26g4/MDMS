import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LoginSignup.css";

export default function LoginSignup() {
  const [action, setAction] = useState("Sign Up");

  // Existing states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // NEW: role (only for signup)
  const [role, setRole] = useState("USER");

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
  const handleSubmit = () => {
    if (!validateForm()) return;

    /* ---------------- ADMIN LOGIN ---------------- */
    if (
      action === "Log In" &&
      email === "admin@mdms.com" &&
      password === "Admin@123"
    ) {
      localStorage.setItem(
        "user",
        JSON.stringify({ role: "ADMIN", email })
      );
      navigate("/admin");
      return;
    }

    /* ---------------- SIGN UP ---------------- */
    if (action === "Sign Up") {
      const users = JSON.parse(localStorage.getItem("users")) || [];

      if (users.find((u) => u.email === email)) {
        alert("User already exists");
        return;
      }

      const newUser = {
        id: Date.now(),
        name,
        email,
        password,
        role,
        isApproved: role === "USER" // inspector needs approval
      };

      users.push(newUser);
      localStorage.setItem("users", JSON.stringify(users));

      alert(
        role === "INSPECTOR"
          ? "Inspector account created. Waiting for admin approval."
          : "Signup successful"
      );

      setAction("Log In");
      return;
    }

    /* ---------------- LOGIN (USER / INSPECTOR) ---------------- */
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      alert("Invalid credentials");
      return;
    }

    if (user.role === "INSPECTOR" && !user.isApproved) {
      alert("Waiting for admin approval");
      return;
    }

    localStorage.setItem("user", JSON.stringify(user));

    if (user.role === "USER") navigate("/home");
    if (user.role === "INSPECTOR") navigate("/inspector");
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
