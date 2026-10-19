// pages/sell.js
import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiUser, FiPhone, FiMail, FiBookOpen, FiHash, FiCheck,
  FiUploadCloud, FiLoader, FiAlertCircle, FiCheckCircle,
  FiEdit3, FiPlus, FiMinus, FiSave, FiTrash2, FiEye,
  FiX, FiClock, FiFileText,
} from "react-icons/fi";
import {
  FaWhatsapp, FaMobileAlt, FaMoneyBillWave,
} from "react-icons/fa";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../components/firebase";
import styles from "../styles/sell.module.css";
import { useI18n } from "@/i18n/I18nProvider";

const MAX_EPISODES = 80;
const MIN_CHARS = 400;
const DRAFT_KEY = "newtalents_sell_draft_v1";
const SAVE_DEBOUNCE = 800;

const defaultForm = {
  authorName: "",
  whatsappNumber: "",
  phoneNumber: "",
  momoNumber: "",
  email: "",
  storyName: "",
  episodeCount: 1,
};

const emptyEpisodes = () => Array.from({ length: MAX_EPISODES }, () => "");

const slugify = (str) =>
  String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "inkuru";

const countWords = (str) =>
  str.trim() ? str.trim().split(/\s+/).filter(Boolean).length : 0;

const readingTime = (words) => Math.max(1, Math.ceil(words / 200));

/* ---------- localStorage helpers ---------- */
function loadDraft() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

function saveDraft(payload) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...payload, savedAt: Date.now() })
    );
  } catch {
    /* quota / private mode — ignore */
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

function formatRelative(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return "ubu ngaho";
  if (diff < 60) return `${diff}s hashize`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min hashize`;
  return new Date(ts).toLocaleString();
}

/* ---------- Auto-resize textarea ---------- */
function AutoTextarea({ value, onChange, placeholder }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 640) + "px";
  }, [value]);

  return (
    <textarea
      ref={ref}
      className={styles.epTextarea}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function SellPage() {
  const { tr } = useI18n();

  const [form, setForm] = useState(defaultForm);
  const [episodes, setEpisodes] = useState(emptyEpisodes);
  const [agreePrice, setAgreePrice] = useState(false);
  const [agreeRules, setAgreeRules] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const [filter, setFilter] = useState("all");
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  /* ---------- Toast auto dismiss ---------- */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------- Restore draft on mount ---------- */
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setForm({ ...defaultForm, ...(draft.form || {}) });
      setEpisodes(
        Array.isArray(draft.episodes) && draft.episodes.length === MAX_EPISODES
          ? draft.episodes
          : emptyEpisodes()
      );
      setAgreePrice(Boolean(draft.agreePrice));
      setAgreeRules(Boolean(draft.agreeRules));
      setLastSaved(draft.savedAt || Date.now());
      setToast({
        type: "ok",
        text: "Twagarutse ibyo wari waranditse. Komeza aho wari ugeze!",
      });
    }
    setHydrated(true);
  }, []);

  /* ---------- Derived values ---------- */
  const count = useMemo(() => {
    const n = Number(form.episodeCount) || 1;
    return Math.min(Math.max(n, 1), MAX_EPISODES);
  }, [form.episodeCount]);

  const stats = useMemo(() => {
    const visible = episodes.slice(0, count);
    const filled = visible.filter((t) => t.trim().length > 0).length;
    const valid = visible.filter((t) => t.trim().length >= MIN_CHARS).length;
    const totalChars = visible.reduce((s, t) => s + t.trim().length, 0);
    const totalWords = visible.reduce((s, t) => s + countWords(t), 0);
    return { filled, valid, totalChars, totalWords };
  }, [episodes, count]);

  const progress = Math.round((stats.valid / count) * 100) || 0;

  const hasContent =
    form.storyName.trim().length > 0 ||
    form.authorName.trim().length > 0 ||
    episodes.some((t) => t.trim().length > 0);

  const filteredIndexes = useMemo(() => {
    const idx = [];
    for (let i = 0; i < count; i++) {
      const len = (episodes[i] || "").trim().length;
      if (filter === "all") idx.push(i);
      else if (filter === "empty" && len === 0) idx.push(i);
      else if (filter === "valid" && len >= MIN_CHARS) idx.push(i);
      else if (filter === "invalid" && len > 0 && len < MIN_CHARS) idx.push(i);
    }
    return idx;
  }, [episodes, count, filter]);

  /* ---------- Auto-save (debounced) ---------- */
  useEffect(() => {
    if (!hydrated) return;
    if (!hasContent) return;
    const t = setTimeout(() => {
      saveDraft({ form, episodes, agreePrice, agreeRules });
      setLastSaved(Date.now());
    }, SAVE_DEBOUNCE);
    return () => clearTimeout(t);
  }, [form, episodes, agreePrice, agreeRules, hydrated, hasContent]);

  /* ---------- Warn before unload ---------- */
  useEffect(() => {
    const handler = (e) => {
      if (!hasContent || submitted) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasContent, submitted]);

  /* ---------- Handlers ---------- */
  const update = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const setEpisode = (index, value) =>
    setEpisodes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

  const changeCount = (delta) =>
    setForm((prev) => ({
      ...prev,
      episodeCount: Math.min(
        Math.max(Number(prev.episodeCount) + delta, 1),
        MAX_EPISODES
      ),
    }));

  const handleManualSave = () => {
    saveDraft({ form, episodes, agreePrice, agreeRules });
    setLastSaved(Date.now());
    setToast({ type: "ok", text: "Draft yabitswe neza." });
  };

  const handleClearDraft = () => {
    if (!window.confirm(tr("Ufite icyizere ko ushaka gusiba draft yawe yose?"))) return;
    clearDraft();
    setForm(defaultForm);
    setEpisodes(emptyEpisodes());
    setAgreePrice(false);
    setAgreeRules(false);
    setLastSaved(null);
    setToast({ type: "ok", text: "Draft yasibwe." });
  };

  /* ---------- Validation ---------- */
  const validate = () => {
    if (!form.authorName.trim()) return "Uzuza amazina yawe (Author name).";
    if (!form.storyName.trim()) return "Uzuza izina ry'inkuru yawe.";
    if (!form.phoneNumber.trim()) return "Uzuza nimero ya telefone.";
    if (!form.momoNumber.trim()) return "Uzuza nimero ya MoMo.";
    if (!form.email.trim()) return "Uzuza email yawe.";
    if (!agreePrice) return "Emera igenwa ry'ibiciro byacu.";
    if (!agreeRules) return "Emera amategeko n'amabwiriza ya NewTalentsG.";
    if (stats.valid === 0)
      return `Ongeraho nibura episode imwe ifite inyuguti ${MIN_CHARS} cyangwa zirenze.`;
    return null;
  };

  const handlePreview = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setToast({ type: "err", text: err });
      return;
    }
    setShowPreview(true);
  };

  const handleConfirmSubmit = async () => {
    const err = validate();
    if (err) {
      setToast({ type: "err", text: err });
      setShowPreview(false);
      return;
    }

    setLoading(true);
    try {
      const validEpisodes = episodes
        .slice(0, count)
        .map((t) => t.trim())
        .filter((t) => t.length >= MIN_CHARS);

      const storyId = `${slugify(form.storyName)}-${Date.now()}`;
      await setDoc(doc(db, "stories", storyId), {
        authorName: form.authorName.trim(),
        whatsappNumber: form.whatsappNumber.trim(),
        phoneNumber: form.phoneNumber.trim(),
        momoNumber: form.momoNumber.trim(),
        email: form.email.trim(),
        storyName: form.storyName.trim(),
        numberOfEpisodes: count,
        episodesSubmitted: validEpisodes.length,
        totalWords: stats.totalWords,
        totalChars: stats.totalChars,
        episodes: validEpisodes,
        agreePrice,
        agreeRules,
        status: "pending",
        dateSubmitted: serverTimestamp(),
      });

      clearDraft();
      setSubmitted(true);
      setShowPreview(false);
      setToast({
        type: "ok",
        text: "Inkuru yawe yoherejwe neza! Tugiye kuyisuzuma, vuba turakwandikira kuri WhatsApp.",
      });

      // Reset
      setForm(defaultForm);
      setEpisodes(emptyEpisodes());
      setAgreePrice(false);
      setAgreeRules(false);
      setLastSaved(null);
    } catch (error) {
      console.error("Ikosa mu kohereza inkuru:", error);
      setToast({ type: "err", text: "Habaye ikibazo, ongera ugerageze." });
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Render ---------- */
  return (
    <>
      <Head>
        <title>{tr("Gurisha Inkuru — NewTalentsG")}</title>
        <meta name="description" content="Ohereza inkuru yawe kuri NewTalentsG" />
      </Head>

      <div className={styles.page}>
        <div className={styles.shell}>
          {/* ===== HERO ===== */}
          <header className={styles.hero}>
            <div className={styles.brand}>
              <img src="/logo.png" alt={tr("NewTalentsG")} className={styles.logo} />
              <div className={styles.brandText}>
                <h1>{tr("GURISHA")}{" "}<span>{tr("INKURU")}</span>
                </h1>
                <p>{tr("New Talents Stories Group")}</p>
              </div>
            </div>

            <div className={styles.heroRight}>
              {lastSaved && !submitted && (
                <span className={styles.savedPill} title={new Date(lastSaved).toLocaleString()}>
                  <FiClock />{" "}{tr("Yabitswe {Relative}", { Relative: formatRelative(lastSaved) })}</span>
              )}
              <span className={styles.badge}>
                <FiUploadCloud />{" "}{tr("Shyira inkuru yawe")}</span>
            </div>
          </header>

          {/* ===== DRAFT TOOLBAR ===== */}
          {hydrated && hasContent && !submitted && (
            <div className={styles.draftBar}>
              <span className={styles.draftInfo}>
                <FiSave />{" "}{tr("Draft yawe ibikwa mu buryo bwikora")}</span>
              <div className={styles.draftActions}>
                <button type="button" onClick={handleManualSave} className={styles.ghostBtn}>
                  <FiSave />{" "}{tr("Bika ubu")}</button>
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className={`${styles.ghostBtn} ${styles.danger}`}
                >
                  <FiTrash2 />{" "}{tr("Siba draft")}</button>
              </div>
            </div>
          )}

          <form className={styles.form} onSubmit={handlePreview}>
            {/* ===== AMAKURU YAWE ===== */}
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.cardIcon}>
                  <FiUser />
                </span>
                <div>
                  <h2>{tr("Amakuru yawe")}</h2>
                  <p>{tr("Tuzakwandikira nyuma yo kubona inkuru yawe kuri iyi adresse waduhaye")}</p>
                </div>
              </div>

              <div className={styles.grid}>
                <div className={styles.field}>
                  <FiUser className={styles.fieldIcon} />
                  <input
                    type="text"
                    placeholder={tr("Author name...")}
                    value={form.authorName}
                    onChange={update("authorName")}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <FaWhatsapp className={styles.fieldIcon} />
                  <input
                    type="tel"
                    placeholder={tr("WhatsApp number...")}
                    value={form.whatsappNumber}
                    onChange={update("whatsappNumber")}
                  />
                </div>

                <div className={styles.field}>
                  <FiPhone className={styles.fieldIcon} />
                  <input
                    type="tel"
                    placeholder={tr("Phone number...")}
                    value={form.phoneNumber}
                    onChange={update("phoneNumber")}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <FaMobileAlt className={styles.fieldIcon} />
                  <input
                    type="tel"
                    placeholder={tr("MoMo number...")}
                    value={form.momoNumber}
                    onChange={update("momoNumber")}
                    required
                  />
                </div>

                <div className={`${styles.field} ${styles.full}`}>
                  <FiMail className={styles.fieldIcon} />
                  <input
                    type="email"
                    placeholder={tr("Email...")}
                    value={form.email}
                    onChange={update("email")}
                    required
                  />
                </div>
              </div>
            </section>

            {/* ===== AMAKURU Y'INKURU ===== */}
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <span className={`${styles.cardIcon} ${styles.cyan}`}>
                  <FiBookOpen />
                </span>
                <div>
                  <h2>{tr("Amakuru y'inkuru")}</h2>
                  <p>{tr("Izina ry'inkuru n'umubare w'ibice (episodes) ifite")}</p>
                </div>
              </div>

              <div className={styles.grid}>
                <div className={styles.field}>
                  <FiEdit3 className={styles.fieldIcon} />
                  <input
                    type="text"
                    placeholder={tr("Name of your story...")}
                    value={form.storyName}
                    onChange={update("storyName")}
                    required
                  />
                </div>

                <div className={styles.counterField}>
                  <FiHash className={styles.fieldIcon} />
                  <input
                    type="number"
                    min="1"
                    max={MAX_EPISODES}
                    placeholder={tr("Number of episodes...")}
                    value={form.episodeCount}
                    onChange={update("episodeCount")}
                    required
                  />
                  <div className={styles.stepper}>
                    <button type="button" onClick={() => changeCount(-1)} aria-label={tr("Gabanya")}>
                      <FiMinus />
                    </button>
                    <button type="button" onClick={() => changeCount(1)} aria-label={tr("Ongeraho")}>
                      <FiPlus />
                    </button>
                  </div>
                </div>
              </div>

              <p className={styles.note}>
                <FiAlertCircle />{" "}{tr("Niba inkuru yawe irenze episode {MAX_EPISODES}, wemerewe kohereza form inshuro ebyiri.", { MAX_EPISODES })}</p>
            </section>

            {/* ===== EPISODES ===== */}
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <span className={`${styles.cardIcon} ${styles.pink}`}>
                  <FiUploadCloud />
                </span>
                <div>
                  <h2>{tr("Shyira mo inkuru yawe")}</h2>
                  <p>{tr("Buri episode igomba kuba ifite nibura inyuguti")}{" "}
                    <strong>{MIN_CHARS}</strong>
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className={styles.statsRow}>
                <span className={styles.statPill}>
                  <FiFileText />{" "}{tr("{filled}/{count} imyanya wujuje", { filled: stats.filled, count })}</span>
                <span className={`${styles.statPill} ${styles.statOk}`}>
                  <FiCheckCircle />{" "}{tr("{valid} Ahujujwe", { valid: stats.valid })}</span>
                <span className={styles.statPill}>
                  <FiEdit3 />{" "}{tr("{LocaleString} words", { LocaleString: stats.totalWords.toLocaleString() })}</span>
                <span className={styles.statPill}>
                  <FiClock />{" "}{tr("~{readingTime} min", { readingTime: readingTime(stats.totalWords) })}</span>
              </div>

              {/* Progress */}
              <div className={styles.progressWrap}>
                <div className={styles.progressBar}>
                  <span style={{ width: `${progress}%` }} />
                </div>
                <span className={styles.progressText}>{progress}%</span>
              </div>

              {/* Filters */}
              <div className={styles.filters}>
                {[
                  { key: "all", label: "imyanya yose" },
                  { key: "empty", label: "ahatanditse" },
                  { key: "invalid", label: "ahatujujwe" },
                  { key: "valid", label: "ahujuje" },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={`${styles.filterBtn} ${filter === f.key ? styles.filterOn : ""}`}
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Episodes list */}
              <div className={styles.episodes}>
                {filteredIndexes.length === 0 && (
                  <div className={styles.emptyState}>
                    <FiAlertCircle />{" "}{tr("Nta episode ihuye n'iyi filter.")}</div>
                )}

                {filteredIndexes.map((i) => {
                  const text = episodes[i] || "";
                  const len = text.trim().length;
                  const ok = len >= MIN_CHARS;
                  const words = countWords(text);
                  return (
                    <article key={i} className={`${styles.episode} ${ok ? styles.epOk : ""}`}>
                      <div className={styles.epHead}>
                        <span className={styles.epNum}>{tr("Episode")}{" "}{i + 1}</span>
                        <span className={`${styles.epMeta} ${ok ? styles.metaOk : ""}`}>
                          {ok ? <FiCheckCircle /> : <FiEdit3 />} {len}/{MIN_CHARS}
                          <em className={styles.epWords}>{tr("· {words}w", { words })}</em>
                        </span>
                      </div>
                      <AutoTextarea
                        value={text}
                        onChange={(v) => setEpisode(i, v)}
                        placeholder={`Andika Episode ${i + 1} hano...`}
                      />
                    </article>
                  );
                })}
              </div>
            </section>

            {/* ===== AMASEZERANO ===== */}
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <span className={`${styles.cardIcon} ${styles.green}`}>
                  <FiCheck />
                </span>
                <div>
                  <h2>{tr("Amasezerano")}</h2>
                  <p>{tr("Ugomba kwemera ibi byose mbere yo kohereza")}</p>
                </div>
              </div>

              <div className={styles.checks}>
                <label className={`${styles.check} ${agreePrice ? styles.checkOn : ""}`}>
                  <input
                    type="checkbox"
                    checked={agreePrice}
                    onChange={(e) => setAgreePrice(e.target.checked)}
                  />
                  <span className={styles.box}>{agreePrice && <FiCheck />}</span>
                  <span className={styles.checkText}>
                    <FaMoneyBillWave />{" "}{tr("Uremera igenwa ry'ibiciro byacu?")}</span>
                </label>

                <label className={`${styles.check} ${agreeRules ? styles.checkOn : ""}`}>
                  <input
                    type="checkbox"
                    checked={agreeRules}
                    onChange={(e) => setAgreeRules(e.target.checked)}
                  />
                  <span className={styles.box}>{agreeRules && <FiCheck />}</span>
                  <span className={styles.checkText}>
                    <FiCheckCircle />{" "}{tr("Uremera amategeko n'amabwiriza ya NewTalentsG?")}</span>
                </label>

                <div className={styles.infoPill}>
                  <FiAlertCircle />{tr("Inkuru yawe mbere yo kwishyurwa irabanza isuzumwe.")}</div>
              </div>
            </section>

            {/* ===== SUBMIT ===== */}
            <button type="submit" className={styles.submit} disabled={loading}>
              <FiEye />{" "}{tr("Reba mbere yo kohereza")}</button>
          </form>
        </div>

        {/* ===== PREVIEW MODAL ===== */}
        {showPreview && (
          <div className={styles.modalOverlay} onClick={() => !loading && setShowPreview(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHead}>
                <h3>
                  <FiEye />{" "}{tr("Reba mbere yo kohereza")}</h3>
                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={() => setShowPreview(false)}
                  disabled={loading}
                >
                  <FiX />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.previewGrid}>
                  <div className={styles.previewItem}>
                    <span>{tr("Umwanditsi")}</span>
                    <strong>{form.authorName || "—"}</strong>
                  </div>
                  <div className={styles.previewItem}>
                    <span>{tr("Izina ry'inkuru")}</span>
                    <strong>{form.storyName || "—"}</strong>
                  </div>
                  <div className={styles.previewItem}>
                    <span>{tr("Episodes")}</span>
                    <strong>
                      {stats.valid} / {count}
                    </strong>
                  </div>
                  <div className={styles.previewItem}>
                    <span>{tr("Amagambo")}</span>
                    <strong>{stats.totalWords.toLocaleString()}</strong>
                  </div>
                  <div className={styles.previewItem}>
                    <span>{tr("Igihe cyo gusoma")}</span>
                    <strong>{tr("~{readingTime} min", { readingTime: readingTime(stats.totalWords) })}</strong>
                  </div>
                  <div className={styles.previewItem}>
                    <span>{tr("Telefone")}</span>
                    <strong>{form.phoneNumber || "—"}</strong>
                  </div>
                </div>

                <p className={styles.previewNote}>
                  <FiAlertCircle />{" "}{tr("Nyuma yo kohereza, inkuru yawe izasuzumwa mbere yo kwishyurwa.")}</p>
              </div>

              <div className={styles.modalFoot}>
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={() => setShowPreview(false)}
                  disabled={loading}
                >{tr("Subira inyuma")}</button>
                <button
                  type="button"
                  className={styles.submit}
                  onClick={handleConfirmSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <FiLoader className={styles.spin} />{" "}{tr("Turayohereza...")}</>
                  ) : (
                    <>
                      <FiUploadCloud />{" "}{tr("Emeza & ohereza")}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== TOAST ===== */}
        {toast && (
          <div
            className={`${styles.toast} ${
              toast.type === "ok" ? styles.toastOk : styles.toastErr
            }`}
          >
            {toast.type === "ok" ? <FiCheckCircle /> : <FiAlertCircle />}
            <span>{toast.text}</span>
          </div>
        )}
      </div>
    </>
  );
}
