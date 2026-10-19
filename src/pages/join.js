import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import styles from "../styles/join.module.css";
import {
  FaPhone,
  FaMoneyBillWave,
  FaSpinner,
  FaCheckCircle,
  FaTimesCircle,
  FaGlobe,
  FaUser,
  FaArrowLeft,
  FaInfoCircle,
} from "react-icons/fa";
import { useI18n } from "@/i18n/I18nProvider";

export default function JoinPage() {
  const { t } = useI18n();

  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("Rwanda");
  const [currency, setCurrency] = useState("RWF");
  const [amount, setAmount] = useState(4000);
  const [depositId, setDepositId] = useState(null);
  const [provider, setProvider] = useState("MTN_MOMO_RWA");
  const [pawapayResponse, setPawapayResponse] = useState(null);

  // ===== GET USERNAME FROM COOKIE =====
  useEffect(() => {
    const userCookie = Cookies.get("user");
    if (userCookie) {
      try {
        const userData = JSON.parse(userCookie);
        setUsername(userData.username || "");
      } catch {
        setUsername("");
      }
    }
  }, []);

  // ===== DETECT COUNTRY =====
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        const countryCode = data.country_code;

        const prices = {
          RW: { amount: 4000, currency: "RWF", country: "Rwanda", provider: "MTN_MOMO_RWA" },
          UG: { amount: 10500, currency: "UGX", country: "Uganda", provider: "MTN_MOMO_UGA" },
          KE: { amount: 370, currency: "KES", country: "Kenya", provider: "MPESA_KEN" },
          BI: { amount: 8500, currency: "BIF", country: "Burundi", provider: "MTN_MOMO_BDI" },
          CD: { amount: 11500, currency: "CDF", country: "DR Congo", provider: "ORANGE_MOMO_COD" },
          CG: { amount: 9800, currency: "XAF", country: "Congo", provider: "MTN_MOMO_COG" },
          ZM: { amount: 95, currency: "ZMW", country: "Zambia", provider: "MTN_MOMO_ZMB" },
          MZ: { amount: 165, currency: "MZN", country: "Mozambique", provider: "VODACOM_MOMO_MOZ" },
        };

        if (prices[countryCode]) {
          setAmount(prices[countryCode].amount);
          setCurrency(prices[countryCode].currency);
          setCountry(prices[countryCode].country);
          setProvider(prices[countryCode].provider);
        }
      } catch (error) {
        console.error("Country detect error:", error);
      }
    };

    detectCountry();
  }, []);

  // ===== HANDLE DEPOSIT =====
  const handleDeposit = async () => {
    if (!phone.trim()) {
      setMessage(t("Shyiramo nimero ya telefone. ex 2507xxxxxxx"));
      setSuccess(false);
      return;
    }

    if (phone.trim().length < 10) {
      setMessage(t("Nimero ya telefone igomba kuba ifite byibura imibare 10."));
      setSuccess(false);
      return;
    }

    setLoading(true);
    setMessage("");
    setSuccess(false);
    setDepositId(null);
    setPawapayResponse(null);

    try {
      const response = await fetch("/api/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          country,
          phone: phone.trim(),
          username: username || "anonymous",
          provider: provider,
          currency: currency,
        }),
      });

      const data = await response.json();

      console.log("📥 Deposit response:", data);

      // ===== SAVE PAWAPAY RESPONSE =====
      setPawapayResponse(data.pawapayResponse || data);

      if (!response.ok) {
        setMessage(
          `❌ ${data.message || "Habaye ikibazo mu kwishyura."}\n\n` +
          `📋 Pawapay response:\n${JSON.stringify(data.pawapayResponse || data, null, 2)}`
        );
        setSuccess(false);
        setLoading(false);
        return;
      }

      if (data.success) {
        setSuccess(true);
        setDepositId(data.depositId);

        setMessage(
          `✅ ${data.message}\n\n` +
          `🆔 Deposit ID: ${data.depositId}\n\n` +
          `📱 Kanda kuri PIN uherutse kwakira kuri telefone yawe.\n\n` +
          `⏳ Tugiye gukora verification...`
        );

        // ===== REDIRECT TO RESULT PAGE AFTER 3 SECONDS =====
        setTimeout(() => {
          router.push(`/deposit-result?depositId=${data.depositId}&phone=${phone.trim()}`);
        }, 3000);
      } else {
        setMessage(
          `❌ ${data.message || "Ikibazo mu kwishyura. Gerageza bundi bushize."}\n\n` +
          `📋 Pawapay response:\n${JSON.stringify(data.pawapayResponse || data, null, 2)}`
        );
        setSuccess(false);
      }
    } catch (error) {
      console.error("Deposit error:", error);
      setMessage("Network error: " + error.message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  // ===== GO BACK =====
  const goBack = () => router.back();

  // ===== GET PROVIDER LABEL =====
  const getProviderLabel = (provider) => {
    const providers = {
      "MTN_MOMO_RWA": "MTN Rwanda",
      "AIRTEL_RWA": "Airtel Rwanda",
      "MTN_MOMO_UGA": "MTN Uganda",
      "MPESA_KEN": "M-Pesa Kenya",
      "MTN_MOMO_BDI": "MTN Burundi",
      "ORANGE_MOMO_COD": "Orange DRC",
      "MTN_MOMO_COG": "MTN Congo",
      "MTN_MOMO_ZMB": "MTN Zambia",
      "VODACOM_MOMO_MOZ": "Vodacom Mozambique",
    };
    return providers[provider] || provider || "Mobile Money";
  };

  return (
    <>
      <Head>
  <title>{t("Ba Umunyamuryango | New Talents Stories Group")}</title>

  <meta
    name="description"
    content="Soma inkuru umwaka wose wishyuye amafaranga 4000 RWF usome inkuru zose zica ku rubuga. Ibi kandi birakugira umunyamuryango. Ishyura macye none wiyubakire isomero usoma uko ushatse umwaka wose."
  />

  <meta
    name="keywords"
    content="New Talents Stories, inkuru, membership, abanyamuryango, Rwanda, novels, stories, gusoma inkuru, library, kwishyura"
  />

  <meta name="author" content="New Talents Stories Group" />
  <meta name="robots" content="index, follow" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  {/* Canonical */}
  <link
    rel="canonical"
    href="https://newtalentsg.co.rw/join"
  />

  {/* Favicon */}
  <link rel="icon" href="/logo.png" />

  {/* Open Graph */}
  <meta property="og:type" content="website" />
  <meta
    property="og:title"
    content="Ba Umunyamuryango | New Talents Stories Group"
  />
  <meta
    property="og:description"
    content="Soma inkuru umwaka wose wishyuye amafaranga 4000 RWF usome inkuru zose zica ku rubuga. Ibi kandi birakugira umunyamuryango. Ishyura macye none wiyubakire isomero usoma uko ushatse umwaka wose."
  />
  <meta
    property="og:url"
    content="https://newtalentsg.co.rw/join"
  />
  <meta
    property="og:image"
    content="https://newtalentsg.co.rw/logo.png"
  />
  <meta property="og:site_name" content="New Talents Stories Group" />
  <meta property="og:locale" content="rw_RW" />

  {/* Twitter */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta
    name="twitter:title"
    content="Ba Umunyamuryango | New Talents Stories Group"
  />
  <meta
    name="twitter:description"
    content="Soma inkuru umwaka wose wishyuye amafaranga 4000 RWF usome inkuru zose zica ku rubuga. Ibi kandi birakugira umunyamuryango. Ishyura macye none wiyubakire isomero usoma uko ushatse umwaka wose."
  />
  <meta
    name="twitter:image"
    content="https://newtalentsg.co.rw/logo.png"
  />

  {/* Theme */}
  <meta name="theme-color" content="#0f172a" />
</Head>

      <main className={styles.page}>
        <div className={styles.card}>
          <button onClick={goBack} className={styles.backBtn}>
            <FaArrowLeft />{" "}{t("Subira")}</button>

          <div className={styles.header}>
            <FaUser className={styles.headerIcon} />
            <h1>{t("Membership Application")}</h1>
            {username && (
              <p className={styles.username}>
                <FaUser className={styles.usernameIcon} /> {username}
              </p>
            )}
          </div>

          <p className={styles.country}>
            <FaGlobe />{" "}{t("Igihugu cyawe:")}{" "}<strong>{country}</strong>
          </p>

          <p className={styles.provider}>
            <FaInfoCircle />{" "}{t("Provider:")}{" "}<strong>{getProviderLabel(provider)}</strong>
          </p>

          <div className={styles.priceBox}>
            <span>{t("Umusanzu w'umwaka")}</span>
            <h2>
              {amount.toLocaleString()} {currency}
            </h2>
          </div>

          <p className={styles.description}>{t("Iyo wishyuye uba umunyamuryango wa New Talents Stories Group kandi ugahabwa uburenganzira bwo gusoma inkuru zose, gukoresha services zacu no kubona ibindi byiza by'abanyamuryango.")}</p>

          <div className={styles.inputGroup}>
            <FaPhone className={styles.inputIcon} />
            <input
              type="tel"
              placeholder={t("Ex 2507XXXXXXXX")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={styles.input}
              disabled={loading}
            />
          </div>

          <button
            onClick={handleDeposit}
            disabled={loading || success}
            className={`${styles.button} ${success ? styles.buttonSuccess : ""}`}
          >
            {loading ? (
              <><FaSpinner className={styles.spinner} />{" "}{t("Tegereza...")}</>
            ) : success ? (
              <><FaCheckCircle />{" "}{t("Byakozwe!")}</>
            ) : (
              <><FaMoneyBillWave />{" "}{t("Pay & Join")}</>
            )}
          </button>

          {message && (
            <div className={`${styles.message} ${success ? styles.messageSuccess : styles.messageError}`}>
              {success ? <FaCheckCircle /> : <FaTimesCircle />}
              <pre>{message}</pre>
            </div>
          )}

          {depositId && (
            <div className={styles.transactionId}>{t("🆔 Deposit ID:")}{" "}<strong>{depositId}</strong>
            </div>
          )}

          {pawapayResponse && !success && (
            <details className={styles.debugDetails}>
              <summary className={styles.debugSummary}>{t("🔍 Pawapay Response")}</summary>
              <pre className={styles.debugPre}>
                {JSON.stringify(pawapayResponse, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </main>
    </>
  );
}
