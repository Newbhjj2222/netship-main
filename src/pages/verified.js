import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import styles from "../styles/Verified.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function Verified() {
  const { t } = useI18n();

  const router = useRouter();
  const { depositId, username, nesPoints } = router.query;

  const [status, setStatus] = useState("⏳ Verifying your payment...");
  const [attempts, setAttempts] = useState(0);
  const [progress, setProgress] = useState(0);
  const [webhookReceived, setWebhookReceived] = useState(false);
  
  const maxAttempts = 60; // 60 * 3s = 3 minutes max
  const checkTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const eventSourceRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Main verification logic
  useEffect(() => {
    if (!depositId) {
      setStatus(t("❌ Missing payment reference"));
      return;
    }

    console.log(`🔍 Starting verification for ${depositId}`);
    let currentAttempt = 0;
    let isCompleted = false;

    // Try to use Server-Sent Events for real-time updates
    const setupSSE = () => {
      try {
        const eventSource = new EventSource(`/api/payment-stream?depositId=${depositId}`);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
          console.log("📨 SSE message:", event.data);
          try {
            const data = JSON.parse(event.data);
            if (data.status === "success") {
              isCompleted = true;
              setWebhookReceived(true);
              setStatus(t("✅ Payment confirmed!"));
              setTimeout(() => {
                router.push({
                  pathname: "/success",
                  query: { username: username || "User", nesPoints: nesPoints || "0" }
                });
              }, 1000);
            } else if (data.status === "failed") {
              isCompleted = true;
              setStatus(t("❌ Payment failed"));
            }
          } catch (e) {
            console.error("SSE parse error:", e);
          }
        };

        eventSource.onerror = (error) => {
          console.log("SSE error, falling back to polling");
          eventSource.close();
          // Fallback to polling
          startPolling();
        };

        // Set timeout for SSE connection
        setTimeout(() => {
          if (eventSource.readyState !== 2) { // 2 = CLOSED
            console.log("SSE timeout, falling back to polling");
            eventSource.close();
            startPolling();
          }
        }, 10000);

      } catch (e) {
        console.log("SSE not supported, using polling");
        startPolling();
      }
    };

    // Polling as fallback
    const startPolling = () => {
      console.log("🔄 Starting polling fallback");
      checkPayment();
    };

    const checkPayment = async () => {
      if (!isMountedRef.current || isCompleted) return;

      currentAttempt++;
      setAttempts(currentAttempt);
      
      // Update progress
      const progressPercent = Math.min((currentAttempt / maxAttempts) * 100, 95);
      setProgress(progressPercent);

      console.log(`🔄 Attempt ${currentAttempt}/${maxAttempts} for ${depositId}`);

      try {
        const res = await fetch(`/api/pawapay?depositId=${depositId}`);
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log(`📊 Status response:`, data);

        const tranStatus = data.tran_status || "pending";
        const source = data.source || "api";

        // ✅ SUCCESS
        if (tranStatus === "success") {
          isCompleted = true;
          console.log(`✅ Payment confirmed via ${source}!`);
          setStatus(t("✅ Payment confirmed!"));
          
          setTimeout(() => {
            router.push({
              pathname: "/success",
              query: { 
                username: username || "User", 
                nesPoints: nesPoints || "0" 
              }
            });
          }, 1500);
          return;
        } 
        
        // ❌ FAILED
        if (tranStatus === "failed" || tranStatus === "rejected") {
          isCompleted = true;
          setStatus(t("❌ Payment failed"));
          setProgress(100);
          return;
        } 
        
        // ⏳ PENDING - Continue
        if (currentAttempt < maxAttempts) {
          // Different messages based on attempts
          let statusMessage = "⏳ Verifying your payment...";
          if (currentAttempt > 5) {
            statusMessage = `⏳ Your payment is being processed... (${Math.round(progressPercent)}%)`;
          }
          if (currentAttempt > 15) {
            statusMessage = `⏳ Still processing... This may take up to 3 minutes (${Math.round(progressPercent)}%)`;
          }
          if (currentAttempt > 30) {
            statusMessage = `⏳ Taking longer than expected... Please wait (${Math.round(progressPercent)}%)`;
          }
          
          setStatus(statusMessage);
          
          checkTimeoutRef.current = setTimeout(checkPayment, 3000);
        } else {
          // Timeout after max attempts
          isCompleted = true;
          setStatus(t("⏰ Payment verification timeout"));
          setProgress(100);
        }

      } catch (error) {
        console.error("❌ Verification error:", error);
        if (currentAttempt < maxAttempts) {
          setStatus(t("⚠️ Connection issue, retrying... ({currentAttempt}/{maxAttempts})", { currentAttempt, maxAttempts }));
          checkTimeoutRef.current = setTimeout(checkPayment, 3000);
        } else {
          isCompleted = true;
          setStatus(t("⚠️ Unable to verify payment"));
          setProgress(100);
        }
      }
    };

    // Start with SSE then fallback to polling
    setupSSE();

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [depositId, username, nesPoints, router]);

  // Handle retry
  const handleRetry = () => {
    setStatus(t("⏳ Verifying your payment..."));
    setAttempts(0);
    setProgress(0);
    setWebhookReceived(false);
    router.reload();
  };

  // Handle go back
  const handleGoBack = () => {
    router.push("/deposit");
  };

  // Handle contact support
  const handleContactSupport = () => {
    router.push("/support");
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Loading state */}
        {(status.includes("Verifying") || 
          status.includes("processing") || 
          status.includes("retrying") || 
          status.includes("Taking longer") ||
          status.includes("Still processing")) && (
          <>
            <div className={styles.spinner}></div>
            <h2>{status}</h2>
            
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className={styles.progressText}>{Math.round(progress)}%</p>
            </div>

            <p className={styles.attemptInfo}>
              {webhookReceived ? (
                t("✅ Payment confirmed via webhook!")
              ) : (
                t("Checking... ({attempts}/{maxAttempts})", { attempts, maxAttempts })
              )}
            </p>

            <div className={styles.statusMessages}>
              {attempts > 3 && attempts <= 10 && (
                <p className={styles.hint}>{t("⏳ Waiting for payment confirmation...")}</p>
              )}
              {attempts > 10 && attempts <= 20 && (
                <p className={styles.hint}>{t("🔄 Payment is being processed by PawaPay...")}</p>
              )}
              {attempts > 20 && (
                <p className={styles.hint}>{t("⏱️ Please be patient, this may take a few minutes...")}</p>
              )}
            </div>

            <div className={styles.depositInfo}>
              <p className={styles.infoText}>
                <strong>{t("Reference:")}</strong> {depositId}
              </p>
              {username && (
                <p className={styles.infoText}>
                  <strong>{t("User:")}</strong> {username}
                </p>
              )}
              {nesPoints && (
                <p className={styles.infoText}>
                  <strong>{t("Points:")}</strong>{" "}{t("{nesPoints} NES", { nesPoints })}</p>
              )}
            </div>
          </>
        )}

        {/* Error states */}
        {!status.includes("Verifying") && 
         !status.includes("processing") && 
         !status.includes("retrying") && 
         !status.includes("Taking longer") &&
         !status.includes("Still processing") && (
          <>
            <h2 className={status.includes("✅") ? styles.successTitle : styles.errorTitle}>
              {status}
            </h2>
            
            {status.includes("Payment failed") && (
              <div className={styles.errorBox}>
                <p className={styles.errorText}>{t("Your payment was not successful. Please try again or use a different payment method.")}</p>
              </div>
            )}

            {status.includes("timeout") && (
              <div className={styles.warningBox}>
                <p className={styles.warningText}>{t("Your payment is taking longer than expected to process. This could be due to network delays or bank processing time.")}</p>
                <p className={styles.warningText}>{t("Please check your account balance and try again, or contact support.")}</p>
              </div>
            )}

            {status.includes("Unable to verify") && (
              <div className={styles.errorBox}>
                <p className={styles.errorText}>{t("We're having trouble connecting to the payment service.")}</p>
              </div>
            )}

            <div className={styles.buttonGroup}>
              {status.includes("Payment failed") || 
               status.includes("timeout") || 
               status.includes("Unable to verify") ? (
                <>
                  <button onClick={handleRetry} className={styles.retryButton}>{t("🔄 Try Again")}</button>
                  <button onClick={handleContactSupport} className={styles.supportButton}>{t("💬 Contact Support")}</button>
                </>
              ) : (
                <button onClick={handleGoBack} className={styles.backButton}>{t("← Go Back")}</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
