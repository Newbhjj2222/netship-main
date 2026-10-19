import { useEffect, useState } from "react";
import { db } from "../components/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/router";
import { useI18n } from "@/i18n/I18nProvider";

export default function PayoutStatus() {
  const { t } = useI18n();

  const router = useRouter();
  const { id } = router.query;

  const [payout, setPayout] = useState(null);

  useEffect(() => {
    if (!id) return;

    const ref = doc(db, "payouts", id);

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setPayout(snap.data());
      }
    });

    return () => unsub();
  }, [id]);

  if (!payout) return <p>{t("Loading payout...")}</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>{t("Payout Status")}</h2>

      <p><b>{t("Phone:")}</b> {payout.phone}</p>
      <p><b>{t("Amount:")}</b>{" "}{t("{rwfAmount} RWF", { rwfAmount: payout.rwfAmount })}</p>
      <p><b>{t("Status:")}</b> {payout.status}</p>

      {payout.status === "processing" && (
        <p>{t("Money iri kugenda... reba phone yawe 📲")}</p>
      )}

      {payout.status === "failed" && (
        <p style={{ color: "red" }}>{t("Yanze. NES yasubijwe.")}</p>
      )}

      {payout.status === "success" && (
        <p style={{ color: "green" }}>{t("Amafaranga yagezeho 💰")}</p>
      )}
    </div>
  );
}
