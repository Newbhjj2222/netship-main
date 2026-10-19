import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import styles from "../styles/Deposit.module.css";

import Cookies from "js-cookie";
import { db } from "../components/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useI18n } from "@/i18n/I18nProvider";

const countries = [
  { name: "Rwanda", code: "RWA" },
  { name: "Uganda", code: "UGA" },
  { name: "Kenya", code: "KEN" },
  { name: "Burundi", code: "BDI" },
  { name: "DR Congo", code: "COD" },
  { name: "Congo", code: "COG" },
  { name: "Zambia", code: "ZMB" },
];

const operatorsData = {
  RWA: [{ value: "AIRTEL_RWA", label: "Airtel Rwanda" }, { value: "MTN_MOMO_RWA", label: "MTN Rwanda" }],
  UGA: [{ value: "AIRTEL_OAPI_UGA", label: "Airtel Uganda" }, { value: "MTN_MOMO_UGA", label: "MTN Uganda" }],
  KEN: [{ value: "MPESA_KEN", label: "M-Pesa Kenya" }],
  BDI: [{ value: "LUMICASH_BDI", label: "Lumicash Burundi" }],
  COD: [
    { value: "VODACOM_MPESA_COD", label: "Vodacom Mpesa" },
    { value: "AIRTEL_COD", label: "Airtel DRC" },
    { value: "ORANGE_COD", label: "Orange DRC" },
  ],
  COG: [
    { value: "AIRTEL_COG", label: "Airtel Congo" },
    { value: "MTN_MOMO_COG", label: "MTN Congo" },
  ],
  ZMB: [
    { value: "AIRTEL_OAPI_ZMB", label: "Airtel Zambia" },
    { value: "MTN_MOMO_ZMB", label: "MTN Zambia" },
    { value: "ZAMTEL_ZMB", label: "Zamtel Zambia" },
  ],
};

const planPrices = {
  RWA: { currency: "RWF", nes1: 20, daily: 200, weekly: 350, bestreader: 600 },
  UGA: { currency: "UGX", nes1: 60, daily: 600, weekly: 1050, bestreader: 1800 },
  KEN: { currency: "KES", nes1: 2, daily: 20, weekly: 35, bestreader: 60 },
  BDI: { currency: "BIF", nes1: 40, daily: 400, weekly: 700, bestreader: 1200 },
  COD: { currency: "CDF", nes1: 50, daily: 500, weekly: 900, bestreader: 1500 },
  COG: { currency: "XAF", nes1: 20, daily: 200, weekly: 350, bestreader: 600 },
  ZMB: { currency: "ZMW", nes1: 0.5, daily: 5, weekly: 8, bestreader: 14 },
};

export default function Deposit() {
  const { t } = useI18n();

  const router = useRouter();

  const [username, setUsername] = useState("");
  const [nesBalance, setNesBalance] = useState(null);

  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("RWA");
  const [currency, setCurrency] = useState("RWF");
  const [operator, setOperator] = useState("");
  const [phone, setPhone] = useState("");

  const [nesPlan, setNesPlan] = useState("");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [nesPoints, setNesPoints] = useState(0);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ✅ GET USERNAME FROM COOKIE
  useEffect(() => {
    const cookie = Cookies.get("user");

    if (cookie) {
      try {
        const user = JSON.parse(cookie);
        setUsername(user.username || "User");
      } catch (err) {
        console.log("Cookie error:", err);
      }
    }
  }, []);

  // realtime balance
  useEffect(() => {
    if (!username) return;

    const unsub = onSnapshot(doc(db, "depositers", username), (snap) => {
      if (snap.exists()) {
        setNesBalance(snap.data().nes || 0);
      } else {
        setNesBalance(0);
      }
    });

    return () => unsub();
  }, [username]);

  // country detect
  useEffect(() => {
    const detect = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();

        const map = {
          RW: "RWA",
          UG: "UGA",
          KE: "KEN",
          BI: "BDI",
          CD: "COD",
          CG: "COG",
          ZM: "ZMB",
        };

        const code = map[data.country_code];
        if (code) {
          setCountry(code);
          setCurrency(planPrices[code].currency);
        }
      } catch (err) {
        console.log(err);
      }
    };

    detect();
  }, []);

  // plan logic
  useEffect(() => {
    if (!country || !nesPlan) return;

    const pointsMap = {
      nes1: { points: 1, text: "NeS1" },
      daily: { points: 10, text: "Daily" },
      weekly: { points: 20, text: "Weekly" },
      bestreader: { points: 60, text: "BestReader" },
    };

    setAmount(planPrices[country][nesPlan] || 0);
    setNesPoints(pointsMap[nesPlan]?.points || 0);
    setDescription(pointsMap[nesPlan]?.text || "");
  }, [country, nesPlan]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/pawapay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          country,
          currency,
          correspondent: operator,
          phone,
          amount,
          description,
          nesPoints,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || t("Habaye ikibazo."));
      } else {
        router.push({
          pathname: "/verified",
          query: {
            depositId: data.depositId,
            username,
            nesPoints,
          },
        });
      }
    } catch (err) {
      setMessage(err.message);
    }

    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>{t("Gura NeS Points")}</title>
      </Head>

      <main className={styles.container}>
        <div className={styles.balanceCard}>
          <h3>{username}</h3>
          <p>{t("NeS Balance:")}{" "}{nesBalance === null ? t("Loading...") : nesBalance}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.formCard}>
          <input value={username} disabled className={styles.input} />

          <input
            placeholder={t("Email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
          />

          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setCurrency(planPrices[e.target.value].currency);
            }}
            className={styles.input}
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>

          <input value={currency} readOnly className={styles.input} />

          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            className={styles.input}
          >
            <option value="">{t("Operator")}</option>
            {operatorsData[country]?.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>

          <input
            placeholder={t("Phone number ex 257xxxxxxx")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={styles.input}
          />

          <select
            value={nesPlan}
            onChange={(e) => setNesPlan(e.target.value)}
            className={styles.input}
          >
            <option value="">{t("Plan")}</option>
            <option value="nes1">{t("1 NES")}</option>
            <option value="daily">{t("Daily")}</option>
            <option value="weekly">{t("Weekly")}</option>
            <option value="bestreader">{t("BestReader")}</option>
          </select>

          <input value={`${amount} ${currency}`} readOnly className={styles.input} />

          <textarea value={description} readOnly className={styles.input} />

          <button disabled={loading} className={styles.button}>
            {loading ? t("Tegereza...") : t("Kwishyura")}
          </button>

          {message && <p>{message}</p>}
        </form>
      </main>
    </>
  );
}
