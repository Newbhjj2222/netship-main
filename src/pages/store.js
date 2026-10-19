// pages/store.js
import { useState, useMemo } from "react";
import Head from "next/head";
import { db } from "@/components/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  FiBookOpen,
  FiSearch,
  FiCopy,
  FiCheck,
  FiEdit3,
  FiTrash2,
  FiX,
  FiSave,
  FiAlertTriangle,
  FiLoader,
  FiChevronDown,
  FiFileText,
  FiClock,
  FiHash,
} from "react-icons/fi";
import styles from "@/styles/store.module.css";
import { useI18n } from "@/i18n/I18nProvider";

/* ======================
   🧠 Helper: text → HTML
====================== */
function formatEpisode(text = "") {
  let safe = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  safe = safe.replace(/\n\s*\n/g, "</p><p>");
  safe = safe.replace(/\n/g, "<br />");

  return `<p>${safe}</p>`;
}

/* ======================
   🧠 Safe confirm dialog (browser)
====================== */
const confirmAction = (msg) => {
  if (typeof window === "undefined") return false;
  return window.confirm(msg);
};

/* ======================
   🧩 MAIN COMPONENT
====================== */
export default function Store({ stories: initialStories }) {
  const { t } = useI18n();

  const [stories, setStories] = useState(initialStories || []);
  const [selectedStory, setSelectedStory] = useState("");
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  const [search, setSearch] = useState("");
  const [copiedIndex, setCopiedIndex] = useState(null);

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renamingBusy, setRenamingBusy] = useState(false);

  const [deleting, setDeleting] = useState(false);

  /* ---------- Load episodes ---------- */
  const loadEpisodes = async (storyId) => {
    setEpisodes([]);
    if (!storyId) return;

    setLoadingEpisodes(true);
    try {
      const snap = await getDoc(doc(db, "stories", storyId));
      if (snap.exists()) {
        setEpisodes(Array.isArray(snap.data().episodes) ? snap.data().episodes : []);
      }
    } catch (e) {
      console.error("Load episodes error:", e);
      alert(t("Ntibyakunze kuzana episodes."));
    } finally {
      setLoadingEpisodes(false);
    }
  };

  /* ---------- Copy episode ---------- */
  const copyText = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(
        () => setCopiedIndex((cur) => (cur === index ? null : cur)),
        1500
      );
    } catch (e) {
      console.error(e);
      alert(t("Copy yanze. Gerageza ukoreshe Ctrl+C."));
    }
  };

  /* ---------- Rename story ---------- */
  const startRename = () => {
    const current = stories.find((s) => s.id === selectedStory);
    setRenameValue(current?.storyName || "");
    setRenaming(true);
  };

  const cancelRename = () => {
    setRenaming(false);
    setRenameValue("");
  };

  const saveRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      alert(t("Izina ntirishobora kuba ubusa."));
      return;
    }
    if (!selectedStory) return;

    setRenamingBusy(true);
    try {
      await updateDoc(doc(db, "stories", selectedStory), {
        storyName: trimmed,
        lastUpdated: new Date(),
      });

      setStories((prev) =>
        prev.map((s) =>
          s.id === selectedStory ? { ...s, storyName: trimmed } : s
        )
      );
      setRenaming(false);
      setRenameValue("");
      alert(t("Izina ryahinduwe neza!"));
    } catch (e) {
      console.error("Rename error:", e);
      alert(t("Ntibyakunze guhindura izina."));
    } finally {
      setRenamingBusy(false);
    }
  };

  /* ---------- Delete story ---------- */
  const deleteStory = async () => {
    if (!selectedStory) return;
    const current = stories.find((s) => s.id === selectedStory);
    const label = current?.storyName || selectedStory;

    const ok = confirmAction(
      `Uri kwishyira ukizana! GUSIBA inkuru "${label}" burundu? Iki gikorwa ntigisubirwaho.`
    );
    if (!ok) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "stories", selectedStory));
      setStories((prev) => prev.filter((s) => s.id !== selectedStory));
      setSelectedStory("");
      setEpisodes([]);
      alert(t("Inkuru yasibwe burundu."));
    } catch (e) {
      console.error("Delete error:", e);
      alert(t("Ntibyakunze gusiba inkuru."));
    } finally {
      setDeleting(false);
    }
  };

  /* ---------- Filtered stories for search ---------- */
  const filteredStories = useMemo(() => {
    if (!search.trim()) return stories;
    const q = search.trim().toLowerCase();
    return stories.filter(
      (s) =>
        (s.storyName || "").toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [stories, search]);

  const activeStory = stories.find((s) => s.id === selectedStory);

  const totalWords = useMemo(
    () =>
      episodes.reduce(
        (sum, ep) => sum + (String(ep || "").trim().split(/\s+/).filter(Boolean).length),
        0
      ),
    [episodes]
  );

  /* ======================
     RENDER
  ====================== */
  return (
    <>
      <Head>
        <title>{t("Store of Stories — NewTalentsG")}</title>
        <meta name="description" content="Reba, koporora, hindura cyangwa usibe inkuru" />
      </Head>

      <div className={styles.page}>
        <div className={styles.shell}>
          {/* ===== HERO ===== */}
          <header className={styles.hero}>
            <div className={styles.heroLeft}>
              <span className={styles.heroIcon}>
                <FiBookOpen />
              </span>
              <div className={styles.heroText}>
                <h1>{t("Store of")}{" "}<span>{t("Stories")}</span>
                </h1>
                <p>{t("Reba, koporora, hindura cyangwa usibe inkuru")}</p>
              </div>
            </div>

            <span className={styles.badge}>
              <FiFileText />{" "}{t("{length} inkuru", { length: stories.length })}</span>
          </header>

          {/* ===== PICKER ===== */}
          <section className={styles.picker}>
            <div className={styles.pickerTop}>
              <label htmlFor="story-select" className={styles.pickerLabel}>
                <FiBookOpen />{" "}{t("Hitamo inkuru")}</label>

              <div className={styles.searchBox}>
                <FiSearch className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder={t("Shakisha inkuru...")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={styles.searchInput}
                />
                {search && (
                  <button
                    type="button"
                    className={styles.searchClear}
                    onClick={() => setSearch("")}
                    aria-label={t("Siba search")}
                  >
                    <FiX />
                  </button>
                )}
              </div>
            </div>

            <div className={styles.pickerRow}>
              <div className={styles.selectWrap}>
                <select
                  id="story-select"
                  className={styles.select}
                  value={selectedStory}
                  onChange={(e) => {
                    setSelectedStory(e.target.value);
                    setRenaming(false);
                    loadEpisodes(e.target.value);
                  }}
                >
                  <option value="">{t("-- Hitamo Inkuru --")}</option>
                  {filteredStories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.storyName || s.id}
                    </option>
                  ))}
                </select>
                <FiChevronDown className={styles.selectChevron} />
              </div>

              {selectedStory && (
                <div className={styles.toolbar}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnRename}`}
                    onClick={startRename}
                    disabled={renaming || deleting}
                  >
                    <FiEdit3 />{" "}{t("Rename")}</button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDelete}`}
                    onClick={deleteStory}
                    disabled={deleting || renaming}
                  >
                    {deleting ? (
                      <>
                        <FiLoader className={styles.spin} />{" "}{t("Turasiba...")}</>
                    ) : (
                      <>
                        <FiTrash2 />{" "}{t("Delete")}</>
                    )}
                  </button>
                </div>
              )}
            </div>

            {filteredStories.length === 0 && (
              <p className={styles.warn}>
                <FiAlertTriangle />{" "}{t("Nta nkuru ihuye n'ishakisha ryawe.")}</p>
            )}
          </section>

          {/* ===== RENAME PANEL ===== */}
          {renaming && (
            <section className={styles.renamePanel}>
              <div className={styles.renameHead}>
                <FiEdit3 />
                <span>{t("Hindura izina ry'inkuru")}</span>
              </div>
              <div className={styles.renameRow}>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename();
                    if (e.key === "Escape") cancelRename();
                  }}
                  placeholder={t("Izina rishya ry'inkuru...")}
                  className={styles.renameInput}
                  autoFocus
                />
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={cancelRename}
                  disabled={renamingBusy}
                >
                  <FiX />{" "}{t("Hagarika")}</button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={saveRename}
                  disabled={renamingBusy}
                >
                  {renamingBusy ? (
                    <>
                      <FiLoader className={styles.spin} />{" "}{t("Tubika...")}</>
                  ) : (
                    <>
                      <FiSave />{" "}{t("Bika")}</>
                  )}
                </button>
              </div>
            </section>
          )}

          {/* ===== STATS ===== */}
          {selectedStory && !loadingEpisodes && episodes.length > 0 && (
            <div className={styles.statsRow}>
              <span className={styles.statPill}>
                <FiHash />{" "}{t("{length} episodes", { length: episodes.length })}</span>
              <span className={styles.statPill}>
                <FiFileText />{" "}{t("{LocaleString} amagambo", { LocaleString: totalWords.toLocaleString() })}</span>
              <span className={`${styles.statPill} ${styles.statOk}`}>
                <FiCheck /> {activeStory?.storyName || selectedStory}
              </span>
            </div>
          )}

          {/* ===== EPISODES ===== */}
          <div className={styles.posts}>
            {loadingEpisodes && (
              <div className={styles.empty}>
                <FiLoader className={styles.spin} />{" "}{t("Turazana episodes...")}</div>
            )}

            {!loadingEpisodes && selectedStory && episodes.length === 0 && (
              <div className={styles.empty}>
                <FiAlertTriangle />{" "}{t("Nta episodes ziboneka muri iyi nkuru.")}</div>
            )}

            {!loadingEpisodes &&
              episodes.map((ep, index) => (
                <article
                  className={styles.post}
                  key={index}
                  style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
                >
                  <header className={styles.postHead}>
                    <span className={styles.episodeTitle}>
                      <span className={styles.epNum}>{t("Episode")}{" "}{index + 1}</span>
                      <span className={styles.epWords}>
                        {String(ep || "")
                          .trim()
                          .split(/\s+/)
                          .filter(Boolean)
                          .length}{" "}{t("words")}</span>
                    </span>

                    <button
                      type="button"
                      className={`${styles.copyBtn} ${
                        copiedIndex === index ? styles.copyBtnOk : ""
                      }`}
                      onClick={() => copyText(ep, index)}
                    >
                      {copiedIndex === index ? (
                        <>
                          <FiCheck />{" "}{t("Copied!")}</>
                      ) : (
                        <>
                          <FiCopy />{" "}{t("Copy")}</>
                      )}
                    </button>
                  </header>

                  <div
                    className={styles.content}
                    dangerouslySetInnerHTML={{
                      __html: formatEpisode(ep),
                    }}
                  />
                </article>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ======================
   🌍 SSR
====================== */
export async function getServerSideProps() {
  try {
    const snap = await getDocs(collection(db, "stories"));
    const stories = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          storyName: data.storyName || data.title || null,
          dateSubmitted: data.dateSubmitted?.toDate?.()?.getTime?.() || 0,
        };
      })
      .sort((a, b) => b.dateSubmitted - a.dateSubmitted)
      .map(({ id, storyName }) => ({ id, storyName }));

    return { props: { stories } };
  } catch (e) {
    console.error("getServerSideProps error:", e);
    return { props: { stories: [] } };
  }
}
