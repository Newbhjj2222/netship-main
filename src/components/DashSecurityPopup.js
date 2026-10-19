import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import {
doc,
getDoc,
updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";
import styles from "./DashSecurityPopup.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function DashSecurityPopup() {
  const { t } = useI18n();

const [username, setUsername] = useState("");
const [visible, setVisible] = useState(false);
const [pin, setPin] = useState("");
const [confirmPin, setConfirmPin] = useState("");
const [showPin, setShowPin] = useState(false);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

useEffect(() => {
let cancelled = false;

async function checkWalletSecurity() {
  const userCookie = Cookies.get("user");

  if (!userCookie) return;

  try {
    const userData = JSON.parse(userCookie);
    const currentUsername = userData?.username;

    if (!currentUsername) return;

    const authorRef = doc(
      db,
      "authors",
      String(currentUsername)
    );

    const authorSnap = await getDoc(authorRef);

    if (cancelled || !authorSnap.exists()) return;

    const data = authorSnap.data();

    setUsername(String(currentUsername));

    if (!data.walletPinHash) {
      setVisible(true);
    }
  } catch (err) {
    console.error("Wallet security check failed:", err);
  }
}

checkWalletSecurity();

return () => {
  cancelled = true;
};

}, []);

async function hashPin(value) {
const encoder = new TextEncoder();
const bytes = encoder.encode(value);
const hashBuffer = await crypto.subtle.digest(
"SHA-256",
bytes
);

return Array.from(new Uint8Array(hashBuffer))
  .map((byte) => byte.toString(16).padStart(2, "0"))
  .join("");

}

async function handleSubmit(event) {
event.preventDefault();
setError("");

if (!username) {
  setError(t("Konti yawe ntiyabonetse. Ongera winjire."));
  return;
}

if (!/^\d{6}$/.test(pin)) {
  setError(t("PIN igomba kuba igizwe n'imibare 6."));
  return;
}

if (pin !== confirmPin) {
  setError(t("PIN wanditse ntihuye n'iyo wasubiyemo."));
  return;
}

setLoading(true);

try {
  const authorRef = doc(db, "authors", username);

  // Re-check before saving, to avoid overwriting an existing PIN.
  const authorSnap = await getDoc(authorRef);

  if (!authorSnap.exists()) {
    throw new Error("Konti yawe ntiyabonetse.");
  }

  if (authorSnap.data().walletPinHash) {
    setVisible(false);
    return;
  }

  const walletPinHash = await hashPin(pin);

  await updateDoc(authorRef, {
    walletPinHash,
    walletPinCreatedAt: new Date().toISOString(),
  });

  setPin("");
  setConfirmPin("");
  setVisible(false);
} catch (err) {
  console.error("PIN setup failed:", err);
  setError(
    t("Kubika PIN byanze. Reba internet yawe cyangwa uburenganzira bwa konti.")
  );
} finally {
  setLoading(false);
}

}

if (!visible) return null;

return (
<div className={styles.overlay}>
<section
className={styles.modal}
role="dialog"
aria-modal="true"
aria-labelledby="dash-security-title"
>
<div className={styles.icon}>🔐</div>

    <div className={styles.badge}>{t("DASH SECURITY")}</div>

    <h2 id="dash-security-title">{t("Rinda Wallet Yawe")}</h2>

    <p className={styles.description}>{t("Shyiraho PIN yawe izagufasha kurinda wallet yawe. Yibuke kandi ntuyisangize abandi.")}</p>

    <form onSubmit={handleSubmit}>
      <label htmlFor="wallet-pin">{t("PIN nshya")}</label>

      <input
        id="wallet-pin"
        type={showPin ? "text" : "password"}
        inputMode="numeric"
        autoComplete="new-password"
        pattern="[0-9]{6}"
        maxLength={6}
        placeholder="••••••"
        value={pin}
        onChange={(event) =>
          setPin(event.target.value.replace(/\D/g, "").slice(0, 6))
        }
        required
        disabled={loading}
      />

      <label htmlFor="wallet-pin-confirm">{t("Subiramo PIN")}</label>

      <input
        id="wallet-pin-confirm"
        type={showPin ? "text" : "password"}
        inputMode="numeric"
        autoComplete="new-password"
        pattern="[0-9]{6}"
        maxLength={6}
        placeholder="••••••"
        value={confirmPin}
        onChange={(event) =>
          setConfirmPin(
            event.target.value.replace(/\D/g, "").slice(0, 6)
          )
        }
        required
        disabled={loading}
      />

      <label className={styles.showPin}>
        <input
          type="checkbox"
          checked={showPin}
          onChange={(event) => setShowPin(event.target.checked)}
          disabled={loading}
        />{t("Erekana PIN")}</label>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button
        className={styles.submit}
        type="submit"
        disabled={loading}
      >
        {loading ? t("Birabikwa...") : t("🔒 Bika PIN")}
      </button>
    </form>

    <div className={styles.footer}>
      <span>🛡️</span>
      <span>{t("Dash Security · Wallet Protection")}</span>
    </div>
  </section>
</div>

);
}
