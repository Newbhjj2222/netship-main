import React, { useState } from "react";
import { db } from "../../components/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Cookies from "js-cookie";
import styles from "../../styles/adminRequests.module.css";
import {
  FaUser,
  FaEnvelope,
  FaWhatsapp,
  FaCalendarAlt,
  FaTrash,
  FaSpinner,
  FaIdCard,
  FaImage,
  FaFileAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaUserCheck,
  FaPhone,
  FaAt,
  FaInfoCircle
} from "react-icons/fa";
import LinkComponent from "../../components/Links";
import { useI18n } from "@/i18n/I18nProvider";
// ============================================
// SSR - getServerSideProps
// ============================================
export async function getServerSideProps(context) {
  // Check session
  const cookies = context.req.headers.cookie || "";
  const userCookie = cookies.split(";").find(c => c.trim().startsWith("user="));
  
  if (!userCookie) {
    return {
      redirect: { destination: "/login", permanent: false }
    };
  }

  try {
    const snap = await getDocs(collection(db, "monetization_requests"));
    const requests = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.().toISOString() || null,
    }));

    return { props: { initialRequests: requests } };
  } catch (error) {
    console.error("Error fetching requests:", error);
    return { props: { initialRequests: [], error: "Habaye ikibazo mu kubona requests." } };
  }
}

// ============================================
// COMPONENT
// ============================================
export default function AdminRequests({ initialRequests, error: serverError }) {
  const { t } = useI18n();

  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests || []);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(serverError || "");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const userCookie = Cookies.get("user");
    if (!userCookie) {
      router.replace("/login");
    }
  }, [router]);

  // ===== FILTER REQUESTS =====
  const filteredRequests = requests.filter((req) => {
    const matchesSearch = 
      (req.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
      (req.username || "").toLowerCase().includes(search.toLowerCase()) ||
      (req.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (req.whatsapp || "").includes(search);

    const hasImages = !!(req.idCardUrl || req.profilePhotoUrl || req.screenshotStoriesUrl || req.screenshotReferUrl);
    const matchesFilter = filter === "all" || (filter === "hasImages" && hasImages) || (filter === "noImages" && !hasImages);

    return matchesSearch && matchesFilter;
  });

  // ===== DELETE REQUEST =====
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(t("Uremeza ko ushaka gusiba iyi request?"));
    if (!confirmDelete) return;

    try {
      setDeleting(id);
      await deleteDoc(doc(db, "monetization_requests", id));
      setRequests((prev) => prev.filter((req) => req.id !== id));
    } catch (err) {
      console.error(err);
      setError(t("Firestore Error: {message}", { message: err.message }));
    } finally {
      setDeleting(null);
    }
  };

  // ===== FORMAT DATE =====
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("rw-RW", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  // ===== STATS =====
  const totalRequests = requests.length;
  const requestsWithImages = requests.filter(r => 
    r.idCardUrl || r.profilePhotoUrl || r.screenshotStoriesUrl || r.screenshotReferUrl
  ).length;

  // ===== RENDER =====
  return (
    <>
    <LinkComponent />
    <div className={styles.container}>
      <div className={styles.card}>
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <FaUserCheck className={styles.headerIcon} />
            <div>
              <h1 className={styles.title}>{t("📋 Monetization Requests")}</h1>
              <p className={styles.subtitle}>{t("Manage all monetization applications")}</p>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <FaFileAlt className={styles.statIcon} />
            <div>
              <span className={styles.statLabel}>{t("Total Requests")}</span>
              <strong className={styles.statValue}>{totalRequests}</strong>
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.statWithImages}`}>
            <FaImage className={styles.statIcon} />
            <div>
              <span className={styles.statLabel}>{t("With Images")}</span>
              <strong className={styles.statValue}>{requestsWithImages}</strong>
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div className={styles.filters}>
          <div className={styles.searchWrapper}>
            <FaUser className={styles.searchIcon} />
            <input
              type="text"
              placeholder={t("Shaka mu izina, username, email, cyangwa whatsapp...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">{t("📋 All")}</option>
            <option value="hasImages">{t("🖼️ With Images")}</option>
            <option value="noImages">{t("📄 No Images")}</option>
          </select>
        </div>

        {/* ERROR */}
        {error && (
          <div className={styles.errorCard}>
            <FaExclamationTriangle className={styles.errorIcon} />
            <p>{error}</p>
          </div>
        )}

        {/* REQUESTS GRID */}
        {filteredRequests.length === 0 ? (
          <div className={styles.emptyState}>
            <FaFileAlt className={styles.emptyIcon} />
            <h3>{t("📭 Nta Requests")}</h3>
            <p>{t("Nta request zirimo muri database cyangwa nta uhuje ibyo ushakisha.")}</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredRequests.map((req) => (
              <div key={req.id} className={styles.requestCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardAvatar}>
                    <span>{req.fullName?.charAt(0)?.toUpperCase() || "?"}</span>
                  </div>
                  <div className={styles.cardTitle}>
                    <h3>{req.fullName || t("Unknown")}</h3>
                    <span className={styles.cardUsername}>@{req.username || "N/A"}</span>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardRow}>
                    <FaWhatsapp className={styles.rowIcon} />
                    <span>{req.whatsapp || "N/A"}</span>
                  </div>
                  <div className={styles.cardRow}>
                    <FaEnvelope className={styles.rowIcon} />
                    <span>{req.email || "N/A"}</span>
                  </div>
                  <div className={styles.cardRow}>
                    <FaInfoCircle className={styles.rowIcon} />
                    <span className={styles.cardReason}>{req.reason || "N/A"}</span>
                  </div>
                  <div className={styles.cardRow}>
                    <FaCalendarAlt className={styles.rowIcon} />
                    <span>{formatDate(req.createdAt)}</span>
                  </div>
                </div>

                {/* IMAGES */}
                {(req.idCardUrl || req.profilePhotoUrl || req.screenshotStoriesUrl || req.screenshotReferUrl) && (
                  <div className={styles.images}>
                    <span className={styles.imagesLabel}>
                      <FaImage />{" "}{t("Attachments:")}</span>
                    <div className={styles.imagesGrid}>
                      {req.idCardUrl && (
                        <a href={req.idCardUrl} target="_blank" rel="noopener noreferrer" className={styles.imageLink}>
                          <img src={req.idCardUrl} alt={t("ID Card")} className={styles.imageThumb} />
                          <span className={styles.imageLabel}>{t("ID")}</span>
                        </a>
                      )}
                      {req.profilePhotoUrl && (
                        <a href={req.profilePhotoUrl} target="_blank" rel="noopener noreferrer" className={styles.imageLink}>
                          <img src={req.profilePhotoUrl} alt={t("Profile")} className={styles.imageThumb} />
                          <span className={styles.imageLabel}>{t("Profile")}</span>
                        </a>
                      )}
                      {req.screenshotStoriesUrl && (
                        <a href={req.screenshotStoriesUrl} target="_blank" rel="noopener noreferrer" className={styles.imageLink}>
                          <img src={req.screenshotStoriesUrl} alt={t("Stories")} className={styles.imageThumb} />
                          <span className={styles.imageLabel}>{t("Certificate")}</span>
                        </a>
                      )}
                      {req.screenshotReferUrl && (
                        <a href={req.screenshotReferUrl} target="_blank" rel="noopener noreferrer" className={styles.imageLink}>
                          <img src={req.screenshotReferUrl} alt={t("Refer")} className={styles.imageThumb} />
                          <span className={styles.imageLabel}>{t("Refer")}</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className={styles.cardActions}>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(req.id)}
                    disabled={deleting === req.id}
                  >
                    {deleting === req.id ? (
                      <><FaSpinner className={styles.spinner} />{" "}{t("Deleting...")}</>
                    ) : (
                      <><FaTrash />{" "}{t("Delete")}</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FOOTER */}
        <div className={styles.footer}>
          <p>{t("Showing {length} / {totalRequests} requests", { length: filteredRequests.length, totalRequests })}</p>
        </div>
      </div>
    </div>
          </>
  );
}
