import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Cookies from "js-cookie";
import styles from "../styles/paymentResult.module.css";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaArrowLeft,
  FaWallet,
  FaClock,
  FaExclamationTriangle,
  FaSync,
  FaUser,
} from "react-icons/fa";
import { useI18n } from "@/i18n/I18nProvider";

/* =========================
GET USER FROM COOKIE
========================= */
function getUserFromCookie() {
  const userCookie = Cookies.get("user");
  if (!userCookie) return null;
  try {
    return JSON.parse(userCookie);
  } catch {
    return null;
  }
}

export default function DepositResult() {
  const { t } = useI18n();

  const router = useRouter();
  const [status, setStatus] = useState("Checking deposit...");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [depositId, setDepositId] = useState(null);
  const [phone, setPhone] = useState(null);
  const [username, setUsername] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [savingMember, setSavingMember] = useState(false);

  // ===== GET USERNAME FROM COOKIE =====
  useEffect(() => {
    const userData = getUserFromCookie();
    if (userData) {
      setUsername(userData.username || "");
    }
  }, []);

  // ===== CHECK DEPOSIT STATUS =====
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const depositIdParam = params.get("depositId");
    const phoneParam = params.get("phone");

    if (!depositIdParam) {
      setStatus(t("Missing depositId."));
      setLoading(false);
      setError(t("Amakuru adahagije."));
      return;
    }

    setDepositId(depositIdParam);
    setPhone(phoneParam || "Unknown");

    const saveToMembers = async (depositId, phone, username) => {
      try {
        setSavingMember(true);
        const response = await fetch("/api/deposit-result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            depositId,
            phone,
            username: username || null,
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          console.error("Error saving member:", result);
          setError(t("Habaye ikibazo mu kubika amakuru yawe."));
        } else {
          console.log("✅ Member saved successfully:", result);
        }
      } catch (error) {
        console.error("Error saving member:", error);
        setError(t("Habaye ikibazo mu kubika amakuru yawe."));
      } finally {
        setSavingMember(false);
      }
    };

    const checkDeposit = async () => {
      try {
        const res = await fetch(`/api/deposit-status?depositId=${depositIdParam}`);
        const json = await res.json();
        setData(json);

        if (json.success) {
          const tranStatus = json.tran_status; // "success", "rejected", "pending"
          const rawStatus = json.status;

          if (tranStatus === "success") {
            setStatus(t("✅ Umusanzu wawe wamaze kwakirwa neza!"));
            setIsMember(true);
            await saveToMembers(depositIdParam, phoneParam || "Unknown", username);
            setLoading(false);
            return;
          } else if (tranStatus === "pending") {
            setStatus(t("⏳ Umusanzu wawe uri gutegereza kwakirwa..."));
            // Continue polling
            setTimeout(checkDeposit, 5000);
            return;
          } else if (tranStatus === "rejected") {
            setStatus(t("❌ Umusanzu wawe yananiye. Gerageza bundi bushize."));
            setLoading(false);
            return;
          } else {
            // Fallback for any unknown tran_status
            setStatus(`⏳ Status: ${rawStatus || "Unknown"}...`);
            setTimeout(checkDeposit, 5000);
            return;
          }
        } else {
          setStatus(t("❌ Ikibazo mu kubona status ya deposit."));
          setError(json.message || t("Unknown error"));
          setLoading(false);
        }
      } catch (err) {
        console.error("Check deposit error:", err);
        setStatus("Network error: " + err.message);
        setError(err.message);
        setLoading(false);
      }
    };

    // Start checking
    checkDeposit();

    // ===== STOP CHECKING AFTER 2 MINUTES =====
    const timeout = setTimeout(() => {
      if (loading) {
        setStatus(t("⏳ Deposit iri gukora... Nyuma y'iminota 2, twandikire kuri WhatsApp."));
        setLoading(false);
      }
    }, 120000);

    return () => clearTimeout(timeout);
  }, []);

  // ===== GO BACK =====
  const goBack = () => router.back();

  // ===== GO HOME =====
  const goHome = () => router.push("/");

  // ===== RETRY =====
  const retry = () => router.push("/join");

  // ===== GET STATUS ICON =====
  const getStatusIcon = () => {
    if (loading) return <FaSpinner className={styles.spinner} />;
    if (isMember) return <FaCheckCircle className={styles.successIcon} />;
    // Use tran_status from API or fallback to raw status
    const tranStatus = data?.tran_status;
    if (tranStatus === "pending") {
      return <FaClock className={styles.pendingIcon} />;
    }
    if (error) return <FaExclamationTriangle className={styles.errorIcon} />;
    return <FaTimesCircle className={styles.errorIcon} />;
  };

  // ===== GET STATUS COLOR =====
  const getStatusColor = () => {
    if (loading) return styles.statusLoading;
    if (isMember) return styles.statusSuccess;
    const tranStatus = data?.tran_status;
    if (tranStatus === "pending") return styles.statusPending;
    return styles.statusError;
  };

  // ===== GET STATUS TEXT =====
  const getStatusText = () => {
    if (loading) return "⏳ Ibihe...";
    if (isMember) return "✅ Deposit Successful!";
    const tranStatus = data?.tran_status;
    if (tranStatus === "pending") return "⏳ Deposit Pending";
    return "❌ Deposit Failed";
  };

  return (
    <>
      <Head>
        <title>{t("Deposit Result | NewTalentsG")}</title>
      </Head>

      <div className={styles.container}>
        <div className={styles.card}>
          {/* HEADER */}
          <div className={styles.header}>
            <button onClick={goBack} className={styles.backBtn}>
              <FaArrowLeft />{" "}{t("Subira")}</button>
            <div className={styles.headerTitle}>
              <FaWallet className={styles.headerIcon} />
              <h1 className={styles.title}>{t("Deposit Result")}</h1>
            </div>
          </div>

          {/* USER INFO */}
          {username && (
            <div className={styles.userInfo}>
              <FaUser className={styles.userIcon} />
              <span>{username}</span>
            </div>
          )}

          {/* STATUS ICON */}
          <div className={styles.statusIconWrapper}>{getStatusIcon()}</div>

          {/* STATUS TEXT */}
          <div className={`${styles.statusWrapper} ${getStatusColor()}`}>
            <h2 className={styles.statusTitle}>{getStatusText()}</h2>
            <p className={styles.statusMessage}>{status}</p>
          </div>

          {/* SAVING MEMBER */}
          {savingMember && (
            <div className={styles.savingWrapper}>
              <FaSpinner className={styles.savingSpinner} />
              <span>{t("Ibihe...")}</span>
            </div>
          )}

          {/* DATA */}
          {data && (
            <div className={styles.dataWrapper}>
              <h3 className={styles.dataTitle}>{t("📋 Transaction Details")}</h3>
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>{t("Deposit ID:")}</span>
                <span className={styles.dataValue}>{depositId}</span>
              </div>
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>{t("Phone:")}</span>
                <span className={styles.dataValue}>{phone}</span>
              </div>
              {username && (
                <div className={styles.dataRow}>
                  <span className={styles.dataLabel}>{t("Username:")}</span>
                  <span className={styles.dataValue}>{username}</span>
                </div>
              )}
              {data.amount && (
                <div className={styles.dataRow}>
                  <span className={styles.dataLabel}>{t("Amount:")}</span>
                  <span className={styles.dataValue}>{t("{amount} RWF", { amount: data.amount })}</span>
                </div>
              )}
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>{t("Status:")}</span>
                <span
                  className={
                    isMember
                      ? styles.dataValueSuccess
                      : data?.tran_status === "pending"
                      ? styles.dataValuePending
                      : styles.dataValueError
                  }
                >
                  {isMember
                    ? t("✅ Success")
                    : data?.tran_status === "pending"
                    ? t("⏳ Pending")
                    : t("❌ Failed")}
                </span>
              </div>
            </div>
          )}

          {/* WHATSAPP HELP */}
          {!loading && !isMember && data?.tran_status !== "pending" && (
            <div className={styles.helpBox}>
              <p>
                <strong>{t("⚠️ Ukibona ikibazo?")}</strong>
                <br />{t("Twandikire kuri WhatsApp:")}{" "}<br />
                <a
                  href="https://wa.me/250722319367"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.whatsappLink}
                >
                  📱 +250 722 319 367
                </a>
              </p>
            </div>
          )}

          {/* ACTIONS */}
          <div className={styles.actions}>
            <button onClick={goHome} className={styles.homeBtn}>{t("🏠 Subira ku rugo")}</button>
            {isMember && (
              <button
                onClick={() => router.push("/dashboard")}
                className={styles.balanceBtn}
              >
                <FaWallet />{" "}{t("Jya ku Dashboard")}</button>
            )}
            {!isMember && !loading && data?.tran_status !== "pending" && (
              <button onClick={retry} className={styles.retryBtn}>
                <FaSync />{" "}{t("Gerageza bundi bushize")}</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
