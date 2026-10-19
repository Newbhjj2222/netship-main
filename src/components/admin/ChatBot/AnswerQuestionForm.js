import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/components/firebase";
import styles from "./Knowledge.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function AnswerQuestionForm({ id }) {
  const { t } = useI18n();

  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "unanswered", id));
      if (snap.exists()) {
        setQuestion(snap.data().question);
      }
    }
    if (id) load();
  }, [id]);

  async function save(e) {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, "knowledge"), {
        question,
        answer,
        keywords: keywords.split(",").map(k => k.trim().toLowerCase()),
        createdAt: serverTimestamp(),
      });

      await deleteDoc(doc(db, "unanswered", id));
      router.push("/admin/unanswered");
    } catch (error) {
      console.error("Error saving answer:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className={styles.form}>
      <h2 style={{ color: "#25d366", marginBottom: "8px" }}>{t("📝 Subiza Ikibazo")}</h2>
      <input value={question} readOnly />
      <textarea
        placeholder={t("Andika igisubizo...")}
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
        <span>{loading ? t("⏳ Kubika...") : t("✅ Bika igisubizo")}</span>
      </button>
    </form>
  );
}
