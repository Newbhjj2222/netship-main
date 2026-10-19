import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import Head from "next/head";

import { db } from "../../components/firebase";
import styles from "../../styles/visitor-manager.module.css";
import { useI18n } from "@/i18n/I18nProvider";

// ============================================================
// VISITOR MANAGER
// ============================================================

export default function VisitorManager() {
  const { t } = useI18n();

  const [tasks, setTasks] = useState([]);
  const [clicks, setClicks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const [search, setSearch] = useState("");

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    try {
      // ------------------------------------------------------
      // LOAD NES TASKS
      // ------------------------------------------------------

      const tasksSnap = await getDocs(
        query(
          collection(db, "nesGameTasks"),
          orderBy("createdAt", "desc")
        )
      );

      const taskList = tasksSnap.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      // ------------------------------------------------------
      // LOAD VISITOR CLICKS
      // ------------------------------------------------------

      const clicksSnap = await getDocs(
        collection(db, "nesShareClicks")
      );

      const clickList = clicksSnap.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setTasks(taskList);
      setClicks(clickList);
    } catch (error) {
      console.error("Visitor Manager load error:", error);

      alert(t("Kubona visitor data byanze."));
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // CREATE TASK STATISTICS
  // ==========================================================

  const taskStats = useMemo(() => {
    return tasks.map((task) => {
      // ------------------------------------------------------
      // CLICKS FOR THIS TASK
      // ------------------------------------------------------

      const taskClicks = clicks.filter(
        (click) =>
          String(click.taskId) === String(task.id)
      );

      // ------------------------------------------------------
      // UNIQUE VISITORS
      // ------------------------------------------------------

      const uniqueVisitorIds = Array.from(
        new Set(
          taskClicks
            .map((click) => click.visitorId)
            .filter(Boolean)
        )
      );

      // ------------------------------------------------------
      // TOTAL UNIQUE VISITORS
      // ------------------------------------------------------

      const totalVisitors = uniqueVisitorIds.length;

      // ------------------------------------------------------
      // TOTAL CLICK RECORDS
      // ------------------------------------------------------

      const totalClicks = taskClicks.length;

      // ------------------------------------------------------
      // NES REWARD PER VISITOR
      // ------------------------------------------------------

      const rewardPerVisitor = Number(
        task.reward ??
          task.nesReward ??
          1
      );

      // ------------------------------------------------------
      // TOTAL NES
      // ------------------------------------------------------

      const nesGiven =
        totalVisitors * rewardPerVisitor;

      // ------------------------------------------------------
      // VISITOR DETAILS
      // ------------------------------------------------------

      const visitorList = uniqueVisitorIds.map(
        (visitorId) => {
          const visitorClick = taskClicks.find(
            (click) =>
              click.visitorId === visitorId
          );

          return {
            visitorId,
            click: visitorClick,
          };
        }
      );

      return {
        ...task,
        totalVisitors,
        totalClicks,
        nesGiven,
        visitorList,
      };
    });
  }, [tasks, clicks]);

  // ==========================================================
  // SEARCH
  // ==========================================================

  const filteredTasks = taskStats.filter((task) => {
    const searchText = search
      .toLowerCase()
      .trim();

    if (!searchText) {
      return true;
    }

    return (
      String(task.id)
        .toLowerCase()
        .includes(searchText) ||

      String(task.username || "")
        .toLowerCase()
        .includes(searchText) ||

      String(task.storyTitle || "")
        .toLowerCase()
        .includes(searchText) ||

      String(task.postId || "")
        .toLowerCase()
        .includes(searchText) ||

      String(task.storyId || "")
        .toLowerCase()
        .includes(searchText)
    );
  });

  // ==========================================================
  // GLOBAL TOTALS
  // ==========================================================

  const totalTasks = taskStats.length;

  const totalVisitors = taskStats.reduce(
    (sum, task) =>
      sum + task.totalVisitors,
    0
  );

  const totalClicks = taskStats.reduce(
    (sum, task) =>
      sum + task.totalClicks,
    0
  );

  const totalNES = taskStats.reduce(
    (sum, task) =>
      sum + task.nesGiven,
    0
  );

  // ==========================================================
  // DATE FORMAT
  // ==========================================================

  const formatDate = (value) => {
    try {
      if (value?.toDate) {
        return value
          .toDate()
          .toLocaleString();
      }

      if (!value) {
        return "-";
      }

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "-";
      }

      return date.toLocaleString();
    } catch {
      return "-";
    }
  };

  // ==========================================================
  // DELETE TASK
  // ==========================================================

  const handleDeleteTask = async (task) => {
    if (deleting) {
      return;
    }

    const confirmed = window.confirm(
      t("Urashaka gusiba task \"{id}\" hamwe na visitor records zayo {totalClicks}?", { id: task.id, totalClicks: task.totalClicks })
    );

    if (!confirmed) {
      return;
    }

    setDeleting(task.id);

    try {
      // ------------------------------------------------------
      // FIND CLICKS BELONGING TO THIS TASK
      // ------------------------------------------------------

      const taskClicks = clicks.filter(
        (click) =>
          String(click.taskId) ===
          String(task.id)
      );

      // ------------------------------------------------------
      // DELETE VISITOR RECORDS
      // ------------------------------------------------------

      await Promise.all(
        taskClicks.map((click) =>
          deleteDoc(
            doc(
              db,
              "nesShareClicks",
              click.id
            )
          )
        )
      );

      // ------------------------------------------------------
      // DELETE TASK
      // ------------------------------------------------------

      await deleteDoc(
        doc(
          db,
          "nesGameTasks",
          task.id
        )
      );

      // ------------------------------------------------------
      // UPDATE UI
      // ------------------------------------------------------

      setTasks((prev) =>
        prev.filter(
          (item) => item.id !== task.id
        )
      );

      setClicks((prev) =>
        prev.filter(
          (click) =>
            String(click.taskId) !==
            String(task.id)
        )
      );

      alert(
        t("Task na visitor records zayo byasibwe.")
      );
    } catch (error) {
      console.error(
        "Delete task error:",
        error
      );

      alert(t("Gusiba task byanze."));
    } finally {
      setDeleting(null);
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <Head>
        <title>{t("Visitor Manager | New Talents Stories Group")}</title>
      </Head>

      <main className={styles.container}>

        {/* ==================================================
            HEADER
        ================================================== */}

        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>{t("Visitor Manager")}</h1>

            <p className={styles.subtitle}>{t("Reba abakanze kuri links za NES Mine.")}</p>
          </div>

          <button
            type="button"
            className={styles.refresh}
            onClick={loadData}
            disabled={loading}
          >
            {loading
              ? t("Loading...")
              : t("🔄 Refresh")}
          </button>
        </header>

        {/* ==================================================
            SEARCH
        ================================================== */}

        <div className={styles.searchBox}>
          <input
            type="text"
            className={styles.searchInput}
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder={t("Shakisha task, username, story cyangwa post ID...")}
          />
        </div>

        {/* ==================================================
            SUMMARY
        ================================================== */}

        <section className={styles.stats}>

          <div className={styles.card}>
            <span className={styles.cardLabel}>{t("Tasks")}</span>

            <strong className={styles.cardValue}>
              {totalTasks}
            </strong>
          </div>

          <div className={styles.card}>
            <span className={styles.cardLabel}>{t("Unique Visitors")}</span>

            <strong className={styles.cardValue}>
              {totalVisitors}
            </strong>
          </div>

          <div className={styles.card}>
            <span className={styles.cardLabel}>{t("Total Clicks")}</span>

            <strong className={styles.cardValue}>
              {totalClicks}
            </strong>
          </div>

          <div className={styles.card}>
            <span className={styles.cardLabel}>{t("NES Given")}</span>

            <strong className={styles.cardValue}>
              {totalNES}
            </strong>
          </div>

        </section>

        {/* ==================================================
            LOADING
        ================================================== */}

        {loading && (
          <div className={styles.loading}>{t("Loading visitors...")}</div>
        )}

        {/* ==================================================
            MAIN TABLE
        ================================================== */}

        {!loading && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>

              <thead className={styles.tableHeader}>
                <tr>
                  <th className={styles.tableHeaderCell}>
                    #
                  </th>

                  <th className={styles.tableHeaderCell}>{t("Task")}</th>

                  <th className={styles.tableHeaderCell}>{t("Story")}</th>

                  <th className={styles.tableHeaderCell}>{t("Owner")}</th>

                  <th className={styles.tableHeaderCell}>{t("Visitors")}</th>

                  <th className={styles.tableHeaderCell}>{t("Clicks")}</th>

                  <th className={styles.tableHeaderCell}>{t("NES Given")}</th>

                  <th className={styles.tableHeaderCell}>{t("Created")}</th>

                  <th className={styles.tableHeaderCell}>{t("Action")}</th>
                </tr>
              </thead>

              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className={styles.empty}
                    >{t("Nta tasks cyangwa visitors bibonetse.")}</td>
                  </tr>
                ) : (
                  filteredTasks.map(
                    (task, index) => (
                      <tr
                        key={task.id}
                        className={styles.tableRow}
                      >

                        <td className={styles.tableCell}>
                          {index + 1}
                        </td>

                        <td className={styles.tableCell}>
                          <code
                            className={styles.tableCode}
                          >
                            {task.id}
                          </code>
                        </td>

                        <td className={styles.tableCell}>
                          <span
                            className={
                              styles.tableCellStrong
                            }
                          >
                            {task.storyTitle ||
                              task.postId ||
                              "-"}
                          </span>
                        </td>

                        <td className={styles.tableCell}>
                          <span
                            className={
                              styles.tableCellMuted
                            }
                          >
                            {task.username || "-"}
                          </span>
                        </td>

                        <td className={styles.tableCell}>
                          <span
                            className={styles.badge}
                          >
                            {task.totalVisitors}
                          </span>
                        </td>

                        <td className={styles.tableCell}>
                          {task.totalClicks}
                        </td>

                        <td className={styles.tableCell}>
                          <span
                            className={styles.badge}
                          >
                            {task.nesGiven}
                          </span>
                        </td>

                        <td className={styles.tableCell}>
                          {formatDate(
                            task.createdAt
                          )}
                        </td>

                        <td className={styles.tableCell}>
                          <button
                            type="button"
                            className={
                              styles.deleteButton
                            }
                            disabled={
                              deleting === task.id
                            }
                            onClick={() =>
                              handleDeleteTask(task)
                            }
                          >
                            {deleting === task.id
                              ? t("Deleting...")
                              : t("🗑 Delete")}
                          </button>
                        </td>

                      </tr>
                    )
                  )
                )}
              </tbody>

            </table>
          </div>
        )}

        {/* ==================================================
            VISITOR DETAILS
        ================================================== */}

        {!loading &&
          filteredTasks.map((task) => (
            <details
              key={`details-${task.id}`}
              className={styles.details}
            >
              <summary
                className={styles.detailsSummary}
              >
                <span>{t("Visitors ba task")}{" "}
                  <strong>
                    {task.id}
                  </strong>{" "}
                  ({task.totalVisitors})
                </span>
              </summary>

              <div className={styles.detailsContent}>
                <div className={styles.visitorList}>

                  {task.visitorList.length === 0 ? (
                    <p className={styles.visitorEmpty}>{t("Nta visitor uraboneka.")}</p>
                  ) : (
                    <table
                      className={styles.visitorTable}
                    >

                      <thead
                        className={
                          styles.visitorHeader
                        }
                      >
                        <tr>
                          <th
                            className={
                              styles.visitorHeaderCell
                            }
                          >{t("Visitor ID")}</th>

                          <th
                            className={
                              styles.visitorHeaderCell
                            }
                          >{t("Post")}</th>

                          <th
                            className={
                              styles.visitorHeaderCell
                            }
                          >{t("Story")}</th>

                          <th
                            className={
                              styles.visitorHeaderCell
                            }
                          >{t("Clicked At")}</th>

                          <th
                            className={
                              styles.visitorHeaderCell
                            }
                          >{t("Source")}</th>
                        </tr>
                      </thead>

                      <tbody>
                        {task.visitorList.map(
                          (visitor) => {
                            const click =
                              visitor.click;

                            return (
                              <tr
                                key={
                                  visitor.visitorId
                                }
                                className={
                                  styles.visitorRow
                                }
                              >

                                <td
                                  className={
                                    styles.visitorCell
                                  }
                                >
                                  <code
                                    className={
                                      styles.visitorCode
                                    }
                                  >
                                    {
                                      visitor.visitorId
                                    }
                                  </code>
                                </td>

                                <td
                                  className={
                                    styles.visitorCell
                                  }
                                >
                                  {click?.postId ||
                                    "-"}
                                </td>

                                <td
                                  className={
                                    styles.visitorCell
                                  }
                                >
                                  {click?.storyTitle ||
                                    "-"}
                                </td>

                                <td
                                  className={
                                    styles.visitorCell
                                  }
                                >
                                  {formatDate(
                                    click?.createdAt
                                  )}
                                </td>

                                <td
                                  className={
                                    styles.visitorCell
                                  }
                                >
                                  {click?.source ||
                                    "-"}
                                </td>

                              </tr>
                            );
                          }
                        )}
                      </tbody>

                    </table>
                  )}

                </div>
              </div>
            </details>
          ))}

      </main>
    </>
  );
}
