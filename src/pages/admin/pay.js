import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export default function Pay() {
  const { t } = useI18n();

  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePay = async (e) => {
    e.preventDefault();
    setError("");

    if (!amount || !country) {
      setError(t("Hitamo igihugu n’amafaranga"));
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseInt(amount, 10),
          country,
        }),
      });

      const data = await res.json();

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (data.message) {
        setError(t("Payment error: {message}", { message: data.message }));
        console.error(
          "Payment error details:",
          data.error || data.data
        );
      } else {
        setError(t("Ntibyashobotse gutangiza payment"));
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(t("Habaye ikibazo, ongera ugerageze"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.container}>
      <form onSubmit={handlePay} style={styles.card}>
        <div style={styles.header}>
          <div style={styles.icon}>💳</div>

          <h1 style={styles.title}>{t("Pay with PawaPay")}</h1>

          <p style={styles.subtitle}>{t("Hitamo igihugu n’amafaranga ushaka kwishyura.")}</p>
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="country" style={styles.label}>{t("Igihugu")}</label>

          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={styles.select}
            disabled={loading}
          >
            <option value="">{t("-- Hitamo igihugu --")}</option>
            <option value="RWA">{t("🇷🇼 Rwanda")}</option>
            <option value="KEN">{t("🇰🇪 Kenya")}</option>
            <option value="UGA">{t("🇺🇬 Uganda")}</option>
            <option value="COD">{t("🇨🇩 RDC (DR Congo)")}</option>
            <option value="COG">{t("🇨🇬 Congo Brazzaville")}</option>
            <option value="ZMB">{t("🇿🇲 Zambia")}</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="amount" style={styles.label}>{t("Amafaranga")}</label>

          <select
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={styles.select}
            disabled={loading}
          >
            <option value="">{t("-- Hitamo amafaranga --")}</option>
            <option value="250">{t("250 RWF")}</option>
            <option value="350">{t("350 RWF")}</option>
            <option value="600">{t("600 RWF")}</option>
            <option value="1000">{t("1,000 RWF")}</option>
            <option value="1500">{t("1,500 RWF")}</option>
            <option value="2000">{t("2,000 RWF")}</option>
            <option value="3000">{t("3,000 RWF")}</option>
            <option value="5000">{t("5,000 RWF")}</option>
            <option value="8000">{t("8,000 RWF")}</option>
            <option value="10000">{t("10,000 RWF")}</option>
            <option value="20000">{t("20,000 RWF")}</option>
            <option value="50000">{t("50,000 RWF")}</option>
          </select>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorIcon}>!</span>
            <p style={styles.error}>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            ...styles.button,
            ...(loading ? styles.buttonLoading : {}),
          }}
        >
          {loading ? (
            <>
              <span style={styles.spinner}></span>{t("Tegereza...")}</>
          ) : (
            <>{t("Komeza")}<span style={styles.arrow}>→</span>
            </>
          )}
        </button>

        <p style={styles.secureText}>{t("🔒 Payment yawe ikorerwa kuri PawaPay mu buryo bwizewe.")}</p>
      </form>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        select {
          appearance: auto;
          -webkit-appearance: auto;
        }

        select option {
          background: #161b22;
          color: #ffffff;
        }

        button:not(:disabled):hover {
          transform: translateY(-1px);
          filter: brightness(1.08);
        }

        button:not(:disabled):active {
          transform: translateY(0);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 480px) {
          .pay-card {
            padding: 22px 18px !important;
            border-radius: 14px !important;
          }
        }
      `}</style>
    </main>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    background:
      "radial-gradient(circle at top, #1b2430 0%, #0b0f14 45%, #07090c 100%)",
    color: "#ffffff",
    overflowX: "hidden",
  },

  card: {
    width: "100%",
    maxWidth: "440px",
    padding: "32px",
    background: "rgba(18, 23, 30, 0.97)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "18px",
    boxShadow:
      "0 20px 60px rgba(0, 0, 0, 0.45)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  },

  header: {
    textAlign: "center",
    marginBottom: "28px",
  },

  icon: {
    width: "58px",
    height: "58px",
    margin: "0 auto 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "16px",
    background: "#202938",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    fontSize: "27px",
  },

  title: {
    margin: "0",
    fontSize: "24px",
    fontWeight: "700",
    color: "#ffffff",
    lineHeight: "1.3",
  },

  subtitle: {
    margin: "9px 0 0",
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#9ca7b5",
  },

  formGroup: {
    width: "100%",
    marginBottom: "18px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#dce2ea",
  },

  select: {
    width: "100%",
    minHeight: "50px",
    padding: "0 14px",
    border: "1px solid #303946",
    borderRadius: "10px",
    outline: "none",
    background: "#0f141b",
    color: "#ffffff",
    fontSize: "15px",
    cursor: "pointer",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },

  errorBox: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
    padding: "11px 13px",
    borderRadius: "10px",
    background: "rgba(220, 38, 38, 0.10)",
    border: "1px solid rgba(239, 68, 68, 0.25)",
  },

  errorIcon: {
    flexShrink: 0,
    width: "22px",
    height: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "#dc2626",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "700",
  },

  error: {
    margin: "0",
    color: "#f87171",
    fontSize: "13px",
    lineHeight: "1.4",
  },

  button: {
    width: "100%",
    minHeight: "50px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    padding: "0 18px",
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    transition:
      "transform 0.2s ease, filter 0.2s ease, opacity 0.2s ease",
  },

  buttonLoading: {
    opacity: 0.75,
    cursor: "wait",
  },

  arrow: {
    fontSize: "20px",
    lineHeight: "1",
  },

  spinner: {
    width: "17px",
    height: "17px",
    border: "2px solid rgba(255, 255, 255, 0.35)",
    borderTopColor: "#ffffff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },

  secureText: {
    margin: "18px 0 0",
    textAlign: "center",
    color: "#727d8b",
    fontSize: "12px",
    lineHeight: "1.5",
  },
};
