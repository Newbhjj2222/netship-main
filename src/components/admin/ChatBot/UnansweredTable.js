import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/components/firebase";
import styles from "./Knowledge.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function UnansweredTable({ refresh }) {
  const { t } = useI18n();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function loadQuestions() {
    try {
      setLoading(true);
      const q = query(collection(db, "unanswered"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setQuestions(snap.docs.map(item => ({
        id: item.id,
        ...item.data()
      })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function removeQuestion(id) {
    if (!window.confirm(t("Gusiba iki kibazo?"))) return;
    await deleteDoc(doc(db, "unanswered", id));
    loadQuestions();
  }

  useEffect(() => {
    loadQuestions();
  }, [refresh]);

  if (loading) {
    return <div className={styles.loadingState}>{t("Loading questions...")}</div>;
  }

  if (!questions.length) {
    return <div className={styles.emptyState}>{t("Nta bibazo bitarasubizwa.")}</div>;
  }

  return (
    <div>
      {/* TABLE VIEW (Desktop) */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("Ikibazo")}</th>
              <th>{t("User")}</th>
              <th style={{ textAlign: "right" }}>{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((item) => (
              <tr key={item.id}>
                <td>{item.question}</td>
                <td>👤 {item.username || t("Anonymous")}</td>
                <td>
                  <div className={styles.actions} style={{ justifyContent: "flex-end" }}>
                    <button
                      className={styles.btnAnswer}
                      onClick={() => router.push(`/admin/unanswered/${item.id}`)}
                    >{t("📝 Answer")}</button>
                    <button
                      className={styles.btnDelete}
                      onClick={() => removeQuestion(item.id)}
                    >{t("🗑️ Delete")}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CARD VIEW (Mobile) */}
      {questions.map((item) => (
        <div key={item.id} className={styles.card}>
          <h4>{item.question}</h4>
          <p>👤 {item.username || t("Anonymous")}</p>
          <div className={styles.actions}>
            <button
              className={styles.btnAnswer}
              onClick={() => router.push(`/admin/unanswered/${item.id}`)}
            >{t("📝 Answer")}</button>
            <button
              className={styles.btnDelete}
              onClick={() => removeQuestion(item.id)}
            >{t("🗑️ Delete")}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
