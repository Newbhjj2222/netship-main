// pages/succes.js

import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import styles from "../styles/succes.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function Success() {
  const { t } = useI18n();

  const router = useRouter();

  const { payoutId } = router.query;

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  const [error, setError] = useState("");

  const checkingRef = useRef(false);
  const finishedRef = useRef(false);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const CHECK_INTERVAL = 3000;
  const MAX_ATTEMPTS = 100;

  const attemptsRef = useRef(0);

  // ============================================================
  // CLEANUP
  // ============================================================

  useEffect(() => {
    return () => {
      mountedRef.current = false;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // ============================================================
  // STOP POLLING
  // ============================================================

  const stopChecking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // ============================================================
  // CHECK PAYOUT
  // ============================================================

  useEffect(() => {
    if (!router.isReady || !payoutId) {
      return;
    }

    attemptsRef.current = 0;
    finishedRef.current = false;

    const checkPayout = async () => {
      if (
        !mountedRef.current ||
        finishedRef.current ||
        checkingRef.current
      ) {
        return;
      }

      checkingRef.current = true;
      attemptsRef.current += 1;

      try {
        const response = await fetch(
          `/api/check-payout?payoutId=${encodeURIComponent(
            payoutId
          )}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        let result = null;

        try {
          result = await response.json();
        } catch {
          result = null;
        }

        // ======================================================
        // API ERROR
        // ======================================================

        if (!response.ok) {
          throw new Error(
            result?.error ||
              result?.message ||
              "Unable to check payout."
          );
        }

        if (!result) {
          throw new Error(
            "Invalid payout response."
          );
        }

        console.log(
          "CHECK PAYOUT:",
          result
        );

        // ======================================================
        // IMPORTANT
        //
        // SUCCESS IS BASED ON NES DEDUCTION.
        //
        // Not merely ACCEPTED.
        // Not merely PROCESSING.
        // Not merely COMPLETED.
        //
        // The page waits until the server says:
        //
        // nesDeducted === true
        // ======================================================

        const nesDeducted =
          result.nesDeducted === true;

        // ======================================================
        // NES DEDUCTED
        // ======================================================

        if (nesDeducted) {
          if (!mountedRef.current) {
            return;
          }

          finishedRef.current = true;

          stopChecking();

          setLoading(false);
          setSuccess(true);
          setError("");

          return;
        }

        // ======================================================
        // NES NOT YET DEDUCTED
        //
        // KEEP SHOWING LOADING.
        // ======================================================

        if (mountedRef.current) {
          setLoading(true);
          setSuccess(false);
          setError("");
        }

        // ======================================================
        // MAX ATTEMPTS
        //
        // We still do not display "success" because
        // NES have not been confirmed as deducted.
        // ======================================================

        if (
          attemptsRef.current >=
          MAX_ATTEMPTS
        ) {
          if (mountedRef.current) {
            setLoading(false);

            setError(
              t("Ntabwo turabona confirmation ko NES zagabanyijwe. Turacyategereje igisubizo cya server.")
            );
          }

          stopChecking();
        }
      } catch (err) {
        console.error(
          "Payout checking error:",
          err
        );

        if (!mountedRef.current) {
          return;
        }

        /*
         * IMPORTANT:
         *
         * Error yo kugenzura status ntabwo bivuze
         * ko payout yanze.
         *
         * Niyo mpamvu tuterekana FAILED hano.
         */

        setLoading(true);

        setSuccess(false);

        /*
         * Keep polling unless maximum attempts
         * have been reached.
         */

        if (
          attemptsRef.current >=
          MAX_ATTEMPTS
        ) {
          setLoading(false);

          setError(
            t("Hari ikibazo mu kubona confirmation ya payout. Niba ikibazo gikomeje, twandikire kuri WhatsApp.")
          );

          stopChecking();
        }
      } finally {
        checkingRef.current = false;
      }
    };

    // ==========================================================
    // FIRST CHECK IMMEDIATELY
    // ==========================================================

    checkPayout();

    // ==========================================================
    // CHECK EVERY 3 SECONDS
    // ==========================================================

    intervalRef.current = setInterval(
      checkPayout,
      CHECK_INTERVAL
    );

    // ==========================================================
    // CLEANUP
    // ==========================================================

    return () => {
      stopChecking();
    };
  }, [
    router.isReady,
    payoutId,
  ]);

  // ============================================================
  // LOADING SCREEN
  // ============================================================

  if (!success) {
    return (
      <div
        className={
          styles.loadingContainer
        }
      >
        <div
          className={
            styles.spinner
          }
        />

        <h2
          className={
            styles.loadingText
          }
        >{t("Gutunganya kubikura...")}</h2>

        <p>{t("Turimo kwemeza ko NES zagabanyijwe neza.")}</p>

        {error && (
          <p
            className={
              styles.statusText
            }
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  // ============================================================
  // SUCCESS
  // ============================================================

  return (
    <div
      className={
        styles.container
      }
    >
      <div
        className={
          styles.card
        }
      >
        <div
          className={
            styles.statusBox
          }
        >
          <div
            className={
              styles.statusIcon
            }
          >
            ✅
          </div>

          <h1
            className={
              styles.statusTitle
            }
          >{t("Kubikura byagenze neza")}</h1>

          <p
            className={
              styles.statusText
            }
          >{t("Kubikura byagenze neza kandi NES zagabanyijwe kuri konti yawe.")}</p>

          <p
            className={
              styles.statusText
            }
          >{t("Niba mwagize ikibazo, mutwandikire kuri WhatsApp tubafashe.")}</p>
        </div>
      </div>
    </div>
  );
}
