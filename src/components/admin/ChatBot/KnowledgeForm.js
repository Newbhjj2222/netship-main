import { useState } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/components/firebase";
import styles from "./Knowledge.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function KnowledgeForm({ onAdded }) {
  const { t } = useI18n();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);

  async function saveKnowledge(e) {
    e.preventDefault();
    if (!question || !answer) return;
    setLoading(true);

    try {
      await addDoc(collection(db, "knowledge"), {
        question,
        answer,
        keywords: keywords.split(",").map(k => k.trim().toLowerCase()),
        createdAt: serverTimestamp(),
      });

      setQuestion("");
      setAnswer("");
      setKeywords("");
      if (onAdded) onAdded();
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={saveKnowledge} className={styles.form}>
      <h2 style={{ color: "#25d366", marginBottom: "8px" }}>{t("➕ Ongera Knowledge")}</h2>
      <input
        placeholder={t("Ikibazo")}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        required
      />
      <textarea
        placeholder={t("Igisubizo")}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        required
      />
      <input
        placeholder={t("Keywords: amakuru, inama, ubumenyi")}
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
      />
      <button type="submit" disabled={loading}>
        <span>{loading ? t("⏳ Kubika...") : t("📥 Bika")}</span>
      </button>
    </form>
  );
}
