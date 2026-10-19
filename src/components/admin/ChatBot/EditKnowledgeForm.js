import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/components/firebase";
import { useRouter } from "next/router";
import styles from "./Knowledge.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function EditKnowledgeForm({ id }) {
  const { t } = useI18n();

  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const ref = doc(db, "knowledge", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setQuestion(data.question || "");
        setAnswer(data.answer || "");
        setKeywords(data.keywords?.join(", ") || "");
      }
      setLoading(false);
    }
    if (id) loadData();
  }, [id]);

  async function updateKnowledge(e) {
    e.preventDefault();
    setLoading(true);

    try {
      await updateDoc(doc(db, "knowledge", id), {
        question,
        answer,
        keywords: keywords.split(",").map(k => k.trim().toLowerCase()),
      });
      router.push("/admin/edit");
    } catch (error) {
      console.error("Error updating:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className={styles.loadingState}>{t("Loading...")}</div>;
  }

  return (
    <form onSubmit={updateKnowledge} className={styles.form}>
      <h2 style={{ color: "#25d366", marginBottom: "8px" }}>{t("✏️ Hindura Knowledge")}</h2>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={t("Ikibazo")}
        required
      />
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder={t("Igisubizo")}
        required
      />
      <input
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        placeholder={t("Keywords: amakuru, inama, ubumenyi")}
      />
      <button type="submit" disabled={loading}>
        <span>{loading ? t("⏳ Kubika...") : t("💾 Hindura")}</span>
      </button>
    </form>
  );
}
