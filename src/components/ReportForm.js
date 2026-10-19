import { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";
import styles from "../styles/reportForm.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function ReportForm({ post, username, onClose }) {
  const { t } = useI18n();

  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const reasons = [
    "Sexual content (excessive / inappropriate)",
    "Copyright violation",
    "Violence or abuse",
    "Hate speech",
    "Fake or misleading content",
    "Poor writing / unreadable",
    "Spam",
    "Other issue",
  ];

  const handleSubmit = async () => {
    if (!reason) return alert(t("Hitamo ikibazo cya report"));

    try {
      setLoading(true);

      await addDoc(collection(db, "reports"), {
        storyId: post.id,
        storyTitle: post.head,
        storyAuthor: post.author, 
        reason,
        message,
        reportedBy: username || "anonymous",
        createdAt: new Date(),
      });

      alert(t("Report yoherejwe neza"));
      setReason("");
      setMessage("");
      onClose?.();
    } catch (err) {
      console.log(err);
      alert(t("Habaye ikibazo mu kohereza report"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.box}>
        <h2>{t("Report this story")}</h2>

        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option value="">{t("-- Hitamo ikibazo --")}</option>
          {reasons.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <textarea
          placeholder={t("Sobanura ikibazo niba gihari...")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <div className={styles.actions}>
          <button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? t("Sending...") : t("Send Report")}
          </button>

          <button
            className={styles.cancel}
            onClick={onClose}
          >{t("Cancel")}</button>
        </div>
      </div>
    </div>
  );
}
