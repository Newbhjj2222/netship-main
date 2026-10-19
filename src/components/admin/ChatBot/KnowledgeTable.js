import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/components/firebase";
import styles from "./Knowledge.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function KnowledgeTable({ refresh }) {
  const { t } = useI18n();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function loadKnowledge() {
    try {
      setLoading(true);
      const q = query(collection(db, "knowledge"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));
      setItems(data);
    } catch (error) {
      console.error("Loading knowledge error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function removeKnowledge(id) {
    if (!window.confirm(t("Urashaka gusiba iki gisubizo?"))) return;
    try {
      await deleteDoc(doc(db, "knowledge", id));
      loadKnowledge();
    } catch (error) {
      console.error("Delete error:", error);
    }
  }

  useEffect(() => {
    loadKnowledge();
  }, [refresh]);

  if (loading) {
    return <div className={styles.loadingState}>{t("Loading knowledge...")}</div>;
  }

  if (!items.length) {
    return <div className={styles.emptyState}>{t("Nta knowledge irimo.")}</div>;
  }

  return (
    <div>
      {/* TABLE VIEW (Desktop) */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("Ikibazo")}</th>
              <th>{t("Igisubizo")}</th>
              <th>{t("Keywords")}</th>
              <th style={{ textAlign: "right" }}>{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.question}</td>
                <td style={{ maxWidth: "300px", wordBreak: "break-word" }}>
                  {item.answer}
                </td>
                <td>
                  <div className={styles.keywords}>
                    {item.keywords?.map((kw, idx) => (
                      <span key={idx} className={styles.keywordTag}>
                        #{kw}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <div className={styles.actions} style={{ justifyContent: "flex-end" }}>
                    <button
                      className={styles.btnEdit}
                      onClick={() => router.push(`/admin/edit/${item.id}`)}
                    >{t("✏️ Edit")}</button>
                    <button
                      className={styles.btnDelete}
                      onClick={() => removeKnowledge(item.id)}
                    >{t("🗑️ Delete")}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CARD VIEW (Mobile) */}
      {items.map((item) => (
        <div key={item.id} className={styles.card}>
          <h4>{item.question}</h4>
          <p>{item.answer}</p>
          <div className={styles.keywords}>
            {item.keywords?.map((kw, idx) => (
              <span key={idx} className={styles.keywordTag}>
                #{kw}
              </span>
            ))}
          </div>
          <div className={styles.actions}>
            <button
              className={styles.btnEdit}
              onClick={() => router.push(`/admin/edit/${item.id}`)}
            >{t("✏️ Edit")}</button>
            <button
              className={styles.btnDelete}
              onClick={() => removeKnowledge(item.id)}
            >{t("🗑️ Delete")}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
