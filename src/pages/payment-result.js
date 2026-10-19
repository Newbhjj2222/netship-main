import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import styles from "@/styles/paymentResults.module.css";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaArrowLeft,
  FaWallet,
  FaClock,
  FaExclamationTriangle
} from "react-icons/fa";
import { useI18n } from "@/i18n/I18nProvider";

export default function PaymentResult() {
  const { t } = useI18n();

  const router = useRouter();
  const [status, setStatus] = useState("Checking payment...");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const depositId = params.get("depositId");
    const phone = params.get("phone");
    const username = localStorage.getItem("username");

    if (!depositId || !phone) {
      setStatus(t("Missing depositId or phone."));
      setLoading(false);
      setError(t("Amakuru adahagije."));
      return;
    }

    const checkPayment = async () => {
      try {
        const res = await fetch("/api/pawapay-webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ depositId, phone, username }),
        });

        const json = await res.json();
        setData(json);

        if (json.success) {
          setStatus(
            `✅ Umusanzu wawe wamaze kwakirwa, vuba uragirwa umunyamuryango wuzuye.${username ? ` Username: ${username}` : ""}`
          );
        } else {
          setStatus(t("❌ Payment failed or pending. Please try again."));
        }
      } catch (err) {
        setStatus("Network error: " + err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkPayment();
  }, []);

  // ===== GO BACK =====
  const goBack = () => {
    router.back();
  };

  // ===== GO HOME =====
  const goHome = () => {
    router.push("/");
  };

  // ===== GET STATUS ICON =====
  const getStatusIcon = () => {
    if (loading) return <FaSpinner className={styles.spinner} />;
    if (data?.success) return <FaCheckCircle className={styles.successIcon} />;
    if (error) return <FaExclamationTriangle className={styles.errorIcon} />;
    return <FaTimesCircle className={styles.errorIcon} />;
  };

  // ===== GET STATUS COLOR =====
  const getStatusColor = () => {
    if (loading) return styles.statusLoading;
    if (data?.success) return styles.statusSuccess;
    return styles.statusError;
  };

  // ===== GET STATUS TEXT =====
  const getStatusText = () => {
    if (loading) return "⏳ Ibihe...";
    if (data?.success) return "✅ Payment Successful!";
    return "❌ Payment Failed";
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* HEADER */}
        <div className={styles.header}>
          <button onClick={goBack} className={styles.backBtn}>
            <FaArrowLeft />{" "}{t("Subira")}</button>
          <div className={styles.headerTitle}>
            <FaWallet className={styles.headerIcon} />
            <h1 className={styles.title}>{t("Payment Result")}</h1>
          </div>
        </div>

        {/* STATUS ICON */}
        <div className={styles.statusIconWrapper}>
          {getStatusIcon()}
        </div>

        {/* STATUS TEXT */}
        <div className={`${styles.statusWrapper} ${getStatusColor()}`}>
          <h2 className={styles.statusTitle}>{getStatusText()}</h2>
          <p className={styles.statusMessage}>{status}</p>
        </div>

        {/* DATA */}
        {data && (
          <div className={styles.dataWrapper}>
            <h3 className={styles.dataTitle}>{t("📋 Transaction Details")}</h3>
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>{t("Status:")}</span>
              <span className={data.success ? styles.dataValueSuccess : styles.dataValueError}>
                {data.success ? t("✅ Success") : t("❌ Failed")}
              </span>
            </div>
            {data.depositId && (
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>{t("Deposit ID:")}</span>
                <span className={styles.dataValue}>{data.depositId}</span>
              </div>
            )}
            {data.phone && (
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>{t("Phone:")}</span>
                <span className={styles.dataValue}>{data.phone}</span>
              </div>
            )}
            {data.amount && (
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>{t("Amount:")}</span>
                <span className={styles.dataValue}>{t("{amount} RWF", { amount: data.amount })}</span>
              </div>
            )}
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>{t("Time:")}</span>
              <span className={styles.dataValue}>{new Date().toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* ACTIONS */}
        <div className={styles.actions}>
          <button onClick={goHome} className={styles.homeBtn}>{t("🏠 Subira ku rugo")}</button>
          {data?.success && (
            <button onClick={() => router.push("/dashboard/balance")} className={styles.balanceBtn}>
              <FaWallet />{" "}{t("Reba balance")}</button>
          )}
          {!data?.success && !loading && (
            <button onClick={() => router.push("/deposit")} className={styles.retryBtn}>
              <FaClock />{" "}{t("Gerageza bundi bushize")}</button>
          )}
        </div>

        {/* RAW DATA (for debugging) */}
        {data && (
          <details className={styles.debug}>
            <summary className={styles.debugSummary}>{t("🔍 Debug Info")}</summary>
            <pre className={styles.debugPre}>{JSON.stringify(data, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
