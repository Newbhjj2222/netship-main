// pages/report.js

import { useState } from "react";
import { db } from "../../components/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import styles from "../../styles/reportManager.module.css";
import LinkComponent from "../../components/Links";
import { useI18n } from "@/i18n/I18nProvider";

export default function ReportPage({ reports: initialReports }) {
  const { t } = useI18n();

  const [reports, setReports] = useState(initialReports);
  const [loadingId, setLoadingId] = useState("");

  const handleDelete = async (id) => {
    const ok = confirm(t("Urashaka gusiba iyi report?"));
    if (!ok) return;

    try {
      setLoadingId(id);

      await deleteDoc(doc(db, "reports", id));

      setReports((prev) => prev.filter((item) => item.id !== id));

      alert(t("Report yasibwe neza."));
    } catch (err) {
      console.log(err);
      alert(t("Habaye ikibazo."));
    } finally {
      setLoadingId("");
    }
  };
  return (
    <>
    <LinkComponent />
    <div className={styles.container}>
      <h1>{t("Reports ({length})", { length: reports.length })}</h1>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("Story")}</th>
              <th>{t("Author")}</th>
              <th>{t("Reason")}</th>
              <th>{t("Message")}</th>
              <th>{t("Reported By")}</th>
              <th>{t("Date")}</th>
              <th>{t("Action")}</th>
            </tr>
          </thead>

          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.empty}>{t("Nta report ziraboneka.")}</td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.storyTitle}</td>
                  <td>{report.storyAuthor}</td>
                  <td>{report.reason}</td>
                  <td>{report.message || "-"}</td>
                  <td>{report.reportedBy}</td>
                  <td>{report.createdAt}</td>

                  <td>
                    <button
                      onClick={() => handleDelete(report.id)}
                      disabled={loadingId === report.id}
                      className={styles.deleteBtn}
                    >
                      {loadingId === report.id
                        ? t("Deleting...")
                        : t("Delete")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
            </>
  );
}

export async function getServerSideProps() {
  const snapshot = await getDocs(collection(db, "reports"));

  const reports = snapshot.docs.map((docu) => {
    const data = docu.data();

    return {
      id: docu.id,
      ...data,
      createdAt: data.createdAt
        ? new Date(
            data.createdAt.seconds * 1000
          ).toLocaleString()
        : "",
    };
  });

  reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    props: {
      reports,
    },
  };
}
