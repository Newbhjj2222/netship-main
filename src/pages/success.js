import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { db } from "../components/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import styles from "../styles/posit.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function Success() {
  const { t } = useI18n();

  const router = useRouter();

  const { username, nesPoints } = router.query;

  const [message, setMessage] = useState("Turimo kongeraho NES...");
  const [done, setDone] = useState(false);

  const getPlan = (points) => {
    switch (Number(points)) {
      case 1:
        return "single";
      case 10:
        return "daily";
      case 20:
        return "weekly";
      case 60:
        return "bestreader";
      default:
        return "custom";
    }
  };

  useEffect(() => {
    console.log("ROUTER READY:", router.isReady);
    console.log("QUERY:", router.query);

    if (!router.isReady) return;

    if (!username || !nesPoints) {
      setMessage(t("Missing data (username or nesPoints)"));
      return;
    }

    if (done) return;

    const addNes = async () => {
      try {
        console.log("ADDING NES...");

        const ref = doc(db, "depositers", username);
        const snap = await getDoc(ref);

        let current = 0;

        if (snap.exists()) {
          current = snap.data().nes || 0;
        }

        const plan = getPlan(nesPoints);

        await setDoc(
          ref,
          {
            nes: current + Number(nesPoints),
            plan,
            lastUpdate: serverTimestamp(),
          },
          { merge: true }
        );

        console.log("SUCCESS SAVED");

        setMessage(t("NES zageze kuri konti yawe 🎉"));
        setDone(true);

        setTimeout(() => {
          router.push("/profile");
        }, 2000);

      } catch (err) {
        console.error("ERROR:", err);
        setMessage(t("Habaye ikibazo mu kubika NES"));
        setDone(true);
      }
    };

    addNes();
  }, [router.isReady, username, nesPoints, done]);

  return (
    <div className={styles.container}>
      <div className={styles["success-card"]}>
        {!done && <div className={styles.spinner}></div>}

        <h2>{message}</h2>
      </div>
    </div>
  );
}
