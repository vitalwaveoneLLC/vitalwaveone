import { useState } from "react";
import OtpLogin from "./OtpLogin";

export default function LoginPage({ onBack, onLoginSuccess }) {
  const [step, setStep] = useState("login"); // login, registered
  const [userRole, setUserRole] = useState("customer"); // customer, driver, admin

  const handleLoginSuccess = (user) => {
    if (onLoginSuccess) {
      onLoginSuccess(user);
    } else {
      // Fallback: redirect based on role
      const role = user?.role || userRole;
      if (role === "admin") {
        window.location.href = "/app";
      } else if (role === "driver") {
        window.location.href = "/driver";
      } else {
        window.location.href = "/";
      }
    }
  };

  return (
    <div>
      <OtpLogin
        onLoginSuccess={handleLoginSuccess}
        role={userRole}
      />
    </div>
  );
}
