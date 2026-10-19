import React, {
  useState,
  useEffect,
  useRef,
} from "react";

import styles from "../../styles/balance.module.css";

import {
  doc,
  getDoc,
  updateDoc,
  increment,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../../components/firebase";

import { useRouter } from "next/router";

import Cookies from "js-cookie";

import LinkComponent from "../../components/Link";
import DashSecurityPopup from "../../components/DashSecurityPopup";
import { useI18n } from "@/i18n/I18nProvider";

// =====================================================
// WITHDRAW SETTINGS
// =====================================================

const MIN_WITHDRAW_NES = 90;

// =====================================================
// NORMALIZE RWANDA PHONE NUMBER
// =====================================================

function normalizeRwandaPhone(value) {
  if (!value) {
    return null;
  }

  let phone = String(value)
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "");

  // Remove leading +
  if (phone.startsWith("+")) {
    phone = phone.substring(1);
  }

  // ===================================================
  // LOCAL RWANDA FORMAT
  //
  // 0781234567
  //      ↓
  // 250781234567
  // ===================================================

  if (/^07\d{8}$/.test(phone)) {
    phone =
      `25${phone.substring(1)}`;
  }

  // ===================================================
  // INTERNATIONAL RWANDA FORMAT
  // ===================================================

  if (!/^2507\d{8}$/.test(phone)) {
    return null;
  }

  return phone;
}

// =====================================================
// DISPLAY PHONE
// =====================================================

function formatPhoneForDisplay(phone) {
  if (!phone) {
    return "";
  }

  const normalized =
    normalizeRwandaPhone(phone);

  if (!normalized) {
    return phone;
  }

  return `+${normalized}`;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function Balance({
  initialData,
  error,
}) {
  const { t } = useI18n();

  const router = useRouter();

  // ===================================================
  // USER
  // ===================================================

  const [username, setUsername] =
    useState(
      initialData?.username || ""
    );

  // ===================================================
  // BALANCE
  // ===================================================

  const [currentNES, setCurrentNES] =
    useState(
      Number(
        initialData?.nes || 0
      )
    );

  const [currentBonus, setCurrentBonus] =
    useState(
      Number(
        initialData?.bonus || 0
      )
    );

  // ===================================================
  // AUTHOR STATUS
  // ===================================================

  const [status, setStatus] =
    useState(
      initialData?.status ||
        "Pending"
    );

  // ===================================================
  // RATE
  // ===================================================

  const [rate, setRate] =
    useState(
      Number(
        initialData?.rate || 12
      )
    );

  // ===================================================
  // WITHDRAW FORM
  // ===================================================

  const [phone, setPhone] =
    useState("");

  const [provider, setProvider] =
    useState(
      "MTN_MOMO_RWA"
    );

  const [amount, setAmount] =
    useState("");

  // ===================================================
  // LOADING
  // ===================================================

  const [loading, setLoading] =
    useState(false);

  // ===================================================
  // READY
  // ===================================================

  const [ready, setReady] =
    useState(false);

  // ===================================================
  // BONUS TRANSFER LOCK
  //
  // IMPORTANT:
  //
  // This prevents the transfer from being started
  // twice before the first request finishes.
  //
  // We are NOT using Firestore transaction.
  // ===================================================

  const bonusTransferLock =
    useRef(false);

  // ===================================================
  // WITHDRAW LOCK
  //
  // Prevent double payout requests from the same
  // page while the first request is processing.
  // ===================================================

  const withdrawLock =
    useRef(false);

  // ===================================================
  // CLIENT LOGIN INITIALIZATION
  // ===================================================

  useEffect(() => {
    const userCookie =
      Cookies.get("user");

    if (!userCookie) {
      router.replace("/login");
      return;
    }

    try {
      const userData =
        JSON.parse(userCookie);

      if (
        !userData ||
        !userData.username
      ) {
        router.replace("/login");
        return;
      }

      setUsername(
        String(
          userData.username
        )
      );

      setReady(true);
    } catch (err) {
      console.error(
        "Cookie parsing error:",
        err
      );

      router.replace("/login");
    }
  }, [router]);

  // ===================================================
  // REALTIME AUTHOR BALANCE
  // ===================================================

  useEffect(() => {
    if (
      !ready ||
      !username
    ) {
      return;
    }

    const authorRef =
      doc(
        db,
        "authors",
        username
      );

    const unsubscribe =
      onSnapshot(
        authorRef,

        (docSnap) => {
          if (!docSnap.exists()) {
            console.warn(
              "Author document not found:",
              username
            );

            return;
          }

          const data =
            docSnap.data();

          const nes =
            Number(
              data.nes || 0
            );

          const bonus =
            Number(
              data.bonus || 0
            );

          const userStatus =
            data.status ||
            "Pending";

          setCurrentNES(
            Number.isFinite(nes)
              ? nes
              : 0
          );

          setCurrentBonus(
            Number.isFinite(
              bonus
            )
              ? bonus
              : 0
          );

          setStatus(
            userStatus
          );

          // =================================================
          // MONETIZED AUTHOR
          // =================================================

          if (
            String(
              userStatus
            ).toLowerCase() ===
            "monitized"
          ) {
            setRate(50);
          } else {
            setRate(12);
          }
        },

        (snapshotError) => {
          console.error(
            "Firestore realtime error:",
            snapshotError
          );
        }
      );

    return () =>
      unsubscribe();
  }, [
    username,
    ready,
  ]);

  // ===================================================
  // BONUS -> NES
  //
  // NO FIRESTORE TRANSACTION
  //
  // IMPORTANT:
  // This function can only run once at a time on
  // this page because of bonusTransferLock.
  // ===================================================

  const transferBonusToNES =
    async () => {
      // =================================================
      // USER CHECK
      // =================================================

      if (!username) {
        alert(
          t("Ntabwo uri logged in. Tegereza gato.")
        );

        return;
      }

      // =================================================
      // PREVENT DOUBLE TRANSFER
      // =================================================

      if (
        bonusTransferLock.current
      ) {
        return;
      }

      // =================================================
      // LOCK IMMEDIATELY
      //
      // Do this BEFORE getDoc().
      // =================================================

      bonusTransferLock.current =
        true;

      // =================================================
      // DISABLE UI
      // =================================================

      setLoading(true);

      try {
        // =================================================
        // GET AUTHOR
        // =================================================

        const authorRef =
          doc(
            db,
            "authors",
            username
          );

        const snap =
          await getDoc(
            authorRef
          );

        if (!snap.exists()) {
          alert(
            t("Account ntiboneka.")
          );

          return;
        }

        // =================================================
        // READ BONUS
        // =================================================

        const data =
          snap.data();

        const bonusAmount =
          Number(
            data?.bonus || 0
          );

        // =================================================
        // VALIDATE BONUS
        // =================================================

        if (
          !Number.isFinite(
            bonusAmount
          ) ||
          bonusAmount <= 0
        ) {
          alert(
            t("Nta bonus ufite.")
          );

          return;
        }

        // =================================================
        // TRANSFER
        //
        // IMPORTANT:
        //
        // bonus becomes 0
        //
        // NES increases by bonusAmount
        //
        // This is executed only once because of the
        // lock above.
        // =================================================

        await updateDoc(
          authorRef,
          {
            bonus: 0,

            nes: increment(
              bonusAmount
            ),
          }
        );

        // =================================================
        // UPDATE LOCAL UI
        // =================================================

        setCurrentNES(
          (previous) =>
            Number(previous || 0) +
            bonusAmount
        );

        setCurrentBonus(0);

        // =================================================
        // SUCCESS
        // =================================================

        alert(
          t("✅ {bonusAmount} Bonus zahinduwe NES neza. Ubu ushobora kuzibikuza.", { bonusAmount })
        );
      } catch (err) {
        console.error(
          "Bonus transfer error:",
          err
        );

        alert(
          t("❌ Habaye ikibazo mu guhindura Bonus. Nta NES zahinduwe neza kugeza iki gikorwa kirangiye.")
        );
      } finally {
        // =================================================
        // RELEASE LOCK
        // =================================================

        bonusTransferLock.current =
          false;

        setLoading(false);
      }
    };

  // ===================================================
  // PHONE CHANGE
  // ===================================================

  const handlePhoneChange =
    (e) => {
      let value =
        e.target.value;

      // Remove everything except
      // numbers and +
      value =
        value.replace(
          /[^\d+]/g,
          ""
        );

      // + only at beginning
      if (
        value.includes("+")
      ) {
        value =
          "+" +
          value
            .replace(
              /\+/g,
              ""
            );
      }

      setPhone(value);
    };

  // ===================================================
  // WITHDRAW
  // ===================================================

  const handleWithdraw =
    async (e) => {
      e.preventDefault();

      // =================================================
      // PREVENT DOUBLE SUBMIT
      // =================================================

      if (
        loading ||
        withdrawLock.current
      ) {
        return;
      }

      // =================================================
      // LOCK
      // =================================================

      withdrawLock.current =
        true;

      // =================================================
      // USER CHECK
      // =================================================

      if (!username) {
        withdrawLock.current =
          false;

        alert(
          t("Ntabwo uri logged in.")
        );

        return;
      }

      // =================================================
      // PHONE
      // =================================================

      const cleanInputPhone =
        String(
          phone || ""
        )
          .trim()
          .replace(
            /\s+/g,
            ""
          );

      if (
        !cleanInputPhone
      ) {
        withdrawLock.current =
          false;

        alert(
          t("Andika nimero ya telefoni.")
        );

        return;
      }

      // =================================================
      // NORMALIZE PHONE
      // =================================================

      const normalizedPhone =
        normalizeRwandaPhone(
          cleanInputPhone
        );

      if (
        !normalizedPhone
      ) {
        withdrawLock.current =
          false;

        alert(
          t("Nimero siyo. Andika nimero ya Rwanda nka 0781234567 cyangwa +250781234567.")
        );

        return;
      }

      // =================================================
      // PROVIDER
      // =================================================

      const allowedProviders = [
        "MTN_MOMO_RWA",
        "AIRTEL_RWA",
      ];

      if (
        !allowedProviders.includes(
          provider
        )
      ) {
        withdrawLock.current =
          false;

        alert(
          t("Provider ya Mobile Money siyo.")
        );

        return;
      }

      // =================================================
      // NES REQUESTED
      // =================================================

      const nesRequested =
        Number(amount);

      if (
        !Number.isInteger(
          nesRequested
        )
      ) {
        withdrawLock.current =
          false;

        alert(
          t("NES igomba kuba umubare wuzuye.")
        );

        return;
      }

      // =================================================
      // MINIMUM NES
      // =================================================

      if (
        nesRequested <
        MIN_WITHDRAW_NES
      ) {
        withdrawLock.current =
          false;

        alert(
          t("Minimum yo kubikuza ni {MIN_WITHDRAW_NES} NES.", { MIN_WITHDRAW_NES })
        );

        return;
      }

      // =================================================
      // CURRENT BALANCE
      // =================================================

      const availableNES =
        Number(
          currentNES
        );

      if (
        availableNES <
        MIN_WITHDRAW_NES
      ) {
        withdrawLock.current =
          false;

        alert(
          t("Ufite {availableNES} NES gusa. Ugomba kugira nibura {MIN_WITHDRAW_NES} NES kugira ngo ubashe kubikuza.", { availableNES, MIN_WITHDRAW_NES })
        );

        return;
      }

      // =================================================
      // ENOUGH NES
      // =================================================

      if (
        nesRequested >
        availableNES
      ) {
        withdrawLock.current =
          false;

        alert(
          t("Ntabwo ufite NES zihagije. Ufite: {availableNES} NES Wifuza kubikuza: {nesRequested} NES", { availableNES, nesRequested })
        );

        return;
      }

      // =================================================
      // RATE
      // =================================================

      const currentRate =
        Number(rate);

      if (
        !Number.isFinite(
          currentRate
        ) ||
        currentRate <= 0
      ) {
        withdrawLock.current =
          false;

        alert(
          t("Rate ya NES ntabwo ibonetse neza. Gerageza kongera gufungura page.")
        );

        return;
      }

      // =================================================
      // CALCULATE RWF
      // =================================================

      const rwfAmount =
        nesRequested *
        currentRate;

      // =================================================
      // DISPLAY PHONE
      // =================================================

      const displayPhone =
        formatPhoneForDisplay(
          normalizedPhone
        );

      // =================================================
      // CONFIRM
      // =================================================

      const confirmed =
        window.confirm(
          `Ugiye kubikuza:\n\n` +
          `NES: ${nesRequested}\n` +
          `Amafaranga: ${rwfAmount.toLocaleString()} RWF\n` +
          `Telefoni: ${displayPhone}\n` +
          `Provider: ${
            provider ===
            "MTN_MOMO_RWA"
              ? "MTN"
              : "Airtel"
          }\n\n` +
          `Minimum: ${MIN_WITHDRAW_NES} NES\n\n` +
          `Kanda OK gukomeza.`
        );

      if (!confirmed) {
        withdrawLock.current =
          false;

        return;
      }

      // =================================================
      // START LOADING
      // =================================================

      setLoading(true);

      try {
        // =================================================
        // SEND PAYOUT
        // =================================================

        const response =
          await fetch(
            "/api/payout",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body:
                JSON.stringify({
                  phone:
                    normalizedPhone,

                  provider,

                  nesRequested,

                  rwfAmount,

                  username,
                }),
            }
          );

        // =================================================
        // READ RESPONSE
        // =================================================

        let data = null;

        try {
          data =
            await response.json();
        } catch {
          data = null;
        }

        // =================================================
        // API ERROR
        // =================================================

        if (
          !response.ok
        ) {
          const message =
            data?.message ||
            data?.error ||
            "Kubikuza byanze.";

          alert(
            t("❌ Kubikuza byanze. {message}", { message })
          );

          return;
        }

        // =================================================
        // PAYOUT ID
        // =================================================

        const payoutId =
          data?.payoutId ||
          data?.id ||
          null;

        // =================================================
        // PAYOUT STATUS
        // =================================================

        const payoutStatus =
          data?.status ||
          data?.payoutStatus ||
          "PROCESSING";

        // =================================================
        // RETURNED NES
        // =================================================

        const returnedNES =
          Number(
            data?.nesRequested ||
              nesRequested
          );

        // =================================================
        // SAFETY CHECK
        // =================================================

        if (!payoutId) {
          alert(
            t("❌ Payout yatangiye ariko Payout ID ntiyagarutse. Ntugerageze kongera kubikuza ako kanya.")
          );

          return;
        }

        // =================================================
        // CLEAR FORM
        // =================================================

        setAmount("");

        setPhone("");

        // =================================================
        // REDIRECT
        //
        // We don't show another success alert here.
        // The /succes page will check the payout.
        // =================================================

        router.push(
          `/succes?` +
            `payoutId=${encodeURIComponent(
              payoutId
            )}` +
            `&status=${encodeURIComponent(
              payoutStatus
            )}` +
            `&nes=${encodeURIComponent(
              returnedNES
            )}` +
            `&username=${encodeURIComponent(
              username
            )}`
        );
      } catch (err) {
        // =================================================
        // NETWORK ERROR
        // =================================================

        console.error(
          "Payout request error:",
          err
        );

        alert(
          t("❌ Habaye ikibazo mu kohereza payout. Ongera ugerageze nyuma gato.")
        );
      } finally {
        // =================================================
        // RELEASE WITHDRAW LOCK
        // =================================================

        withdrawLock.current =
          false;

        setLoading(false);
      }
    };

  // =====================================================
  // SERVER ERROR
  // =====================================================

  if (error) {
    return (
      <div
        className={
          styles.container
        }
      >
        <div
          className={
            styles.errorCard
          }
        >
          <h2>{t("⚠️ Habaye ikibazo")}</h2>

          <p>
            {error}
          </p>

          <button
            onClick={() =>
              router.reload()
            }
          >{t("Gerageza bundi bushya")}</button>
        </div>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <>
    <DashSecurityPopup />
      <LinkComponent />

      <div
        className={
          styles.container
        }
      >
        {/* =============================================
            USER
        ============================================== */}

        <div
          className={
            styles.userInfo
          }
        >
          <h3>
            👤 {username}
          </h3>
        </div>

        {/* =============================================
            BALANCE
        ============================================== */}

        <div
          className={
            styles.balanceCard
          }
        >
          <div>
            <p>{t("NES:")}{" "}
              {currentNES}
            </p>

            <p>{t("Bonus:")}{" "}
              {currentBonus}
            </p>

            <p>{t("Status:")}{" "}
              {status}
            </p>

            <p>{t("Rate:")}{" "}{t("{rate} RWF", { rate })}</p>

            <p>{t("Minimum withdraw:")}{" "}{t("{MIN_WITHDRAW_NES} NES", { MIN_WITHDRAW_NES })}</p>
          </div>

          <h2>
            💰{" "}
            {(
              Number(
                currentNES
              ) *
              Number(rate)
            ).toLocaleString()}{" "}{t("RWF")}</h2>

          {/* =========================================
              BONUS TRANSFER BUTTON
          ========================================== */}

          <button
            type="button"
            onClick={
              transferBonusToNES
            }
            disabled={
              !username ||
              currentBonus <=
                0 ||
              loading ||
              bonusTransferLock.current
            }
          >
            {bonusTransferLock.current
              ? t("Transferring...")
              : t("Transfer Bonus to NES")}
          </button>
        </div>

        {/* =============================================
            WITHDRAW FORM
        ============================================== */}

        <form
          onSubmit={
            handleWithdraw
          }
          className={
            styles.form
          }
        >
          {/* USERNAME */}

          <input
            value={username}
            disabled
          />

          {/* PROVIDER */}

          <select
            value={provider}
            onChange={(e) =>
              setProvider(
                e.target.value
              )
            }
            disabled={loading}
          >
            <option value="MTN_MOMO_RWA">{t("MTN")}</option>

            <option value="AIRTEL_RWA">{t("Airtel")}</option>
          </select>

          {/* PHONE */}

          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="0781234567"
            value={phone}
            onChange={
              handlePhoneChange
            }
            disabled={loading}
            maxLength={13}
          />

          {/* PHONE INFO */}

          <small>{t("Andika nimero nka +250781234567")}</small>

          {/* NES */}

          <input
            type="number"
            min={
              MIN_WITHDRAW_NES
            }
            step="1"
            placeholder={t("NES wifuza kubikuza (min {MIN_WITHDRAW_NES})", { MIN_WITHDRAW_NES })}
            value={amount}
            onChange={(e) =>
              setAmount(
                e.target.value
              )
            }
            disabled={loading}
          />

          {/* AMOUNT PREVIEW */}

          {Number(amount) >=
            MIN_WITHDRAW_NES && (
            <p>{t("Uzahabwa:")}{" "}
              <strong>
                {(
                  Number(
                    amount
                  ) *
                  Number(rate)
                ).toLocaleString()}{" "}{t("RWF")}</strong>
            </p>
          )}

          {/* MINIMUM MESSAGE */}

          <p>{t("Minimum yo kubikuza:")}{" "}
            <strong>{t("{MIN_WITHDRAW_NES} NES", { MIN_WITHDRAW_NES })}</strong>
          </p>

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={
              loading ||
              withdrawLock.current ||
              Number(
                currentNES
              ) <
                MIN_WITHDRAW_NES
            }
          >
            {loading
              ? t("Processing...")
              : t("Withdraw")}
          </button>
        </form>
      </div>
    </>
  );
}
