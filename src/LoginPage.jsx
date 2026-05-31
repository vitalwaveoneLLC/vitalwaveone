import { useState } from "react";

export default function LoginPage({ onBack }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");

  const sendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const clean = phone.replace(/\D/g, "");
      if (clean.length < 10) throw new Error("Invalid phone number");
      const to = clean.length === 10 ? "+1" + clean : "+" + clean;
      const otp = String(Math.floor(100000 + Math.random() * 900000));

      // TEST MODE: Show code on screen (no external API needed)
      setCode(otp);
      setError(`🧪 TEST CODE: ${otp}`);
      setSentTo(to);
      setStage("code");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (code.length < 6) throw new Error("Invalid code");

      // TEST MODE: Accept any 6-digit code
      // In production, verify against actual OTP service
      console.log(`[TEST MODE] Code accepted: ${code} for ${sentTo}`);

      const profileRes = await fetch("/api/auth?action=verify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: sentTo }),
      });

      const profileData = await profileRes.json();
      if (!profileRes.ok || !profileData.ok) throw new Error(profileData.error || "Not registered as admin");

      localStorage.setItem(
        "vitalwaveone_admin",
        JSON.stringify({
          phone: sentTo,
          tenant_id: profileData.tenant_id,
          role: profileData.role,
          name: profileData.name,
          expires: Date.now() + 8 * 60 * 60 * 1000,
        })
      );

      window.location.href = "/app";
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const styles = {
    container: {
      minHeight: "100vh",
      background: "#fafafa",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "Inter, sans-serif",
    },
    card: {
      width: "100%",
      maxWidth: 400,
      background: "#fff",
      border: "1px solid #e5e5e5",
      borderRadius: 14,
      padding: 28,
    },
    input: {
      width: "100%",
      border: "1px solid #e5e5e5",
      borderRadius: 8,
      padding: "11px 14px",
      fontSize: 15,
      fontFamily: "inherit",
      outline: "none",
      color: "#111",
      background: "#fff",
      marginBottom: 16,
    },
    button: {
      width: "100%",
      padding: 13,
      background: "#111",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      marginTop: 12,
    },
    error: {
      padding: "10px 14px",
      background: "#fef2f2",
      border: "1px solid #fecaca",
      borderRadius: 8,
      fontSize: 13,
      color: "#dc2626",
      marginBottom: 14,
    },
  };

  return (
    <div style={styles.container}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600');"}</style>

      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 28,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#111",
          padding: 0,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            background: "#111",
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          R
        </div>
        <span style={{ fontWeight: 600, fontSize: 15 }}>VitalWaveOne</span>
      </button>

      <div style={styles.card}>
        {stage === "phone" ? (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6, textAlign: "center" }}>
              Sign in with WhatsApp
            </h2>
            <p style={{ fontSize: 13, color: "#999", marginBottom: 22, textAlign: "center" }}>
              Enter your phone number
            </p>

            <form onSubmit={sendOtp}>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                style={styles.input}
                required
                autoFocus
              />
              {error && <div style={styles.error}>{error}</div>}
              <button type="submit" style={styles.button} disabled={loading}>
                {loading ? "Sending..." : "Send Code"}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6, textAlign: "center" }}>
              Enter Code
            </h2>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 22, textAlign: "center" }}>
              Check WhatsApp: {sentTo}
            </p>

            <form onSubmit={verifyOtp}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                style={{ ...styles.input, textAlign: "center", fontSize: 26, letterSpacing: "0.3em" }}
                required
                autoFocus
              />
              {error && <div style={styles.error}>{error}</div>}
              <button type="submit" style={styles.button} disabled={loading || code.length < 6}>
                {loading ? "Verifying..." : "Verify"}
              </button>
            </form>

            <button
              onClick={() => {
                setStage("phone");
                setCode("");
                setError("");
              }}
              style={{ ...styles.button, background: "transparent", color: "#666", marginTop: 16 }}
            >
              Use different number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
