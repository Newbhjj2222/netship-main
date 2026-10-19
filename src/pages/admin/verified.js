import { useState } from "react";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../../components/firebase";
import { useRouter } from "next/router";
import styles from "../../styles/author.module.css";
import {
  FaUser,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaTrash,
  FaSpinner,
  FaUsers,
  FaShieldAlt,
  FaSearch,
  FaUserCheck,
  FaUserTimes,
  FaPlus,
  FaArrowLeft,
  FaCoins,
  FaGift,
  FaMoneyBillWave,
  FaShield,
  FaCheck,
  FaBan
} from "react-icons/fa";
import LinkComponent from "../../components/Links";
import { useI18n } from "@/i18n/I18nProvider";

export async function getServerSideProps() {
  try {
    const snapshot = await getDocs(collection(db, "authors"));
    const authors = snapshot.docs.map((doc) => ({
      username: doc.id,
      ...doc.data(),
    }));
    return { props: { authors } };
  } catch (error) {
    console.error("Error fetching authors:", error);
    return { props: { authors: [] } };
  }
}

export default function AdminAuthors({ authors: initialAuthors }) {
  const { t } = useI18n();

  const router = useRouter();
  const [authors, setAuthors] = useState(initialAuthors || []);
  const [loadingId, setLoadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [monetizingId, setMonetizingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonetize, setFilterMonetize] = useState("all");

  // ===== FILTER AUTHORS =====
  const filteredAuthors = authors.filter((author) => {
    const matchesSearch = author.username
      .toLowerCase()
      .includes(search.toLowerCase());
    
    const verificationStatus = author.badge || "unverified";
    const matchesStatus = filterStatus === "all" || verificationStatus === filterStatus;
    
    const monetizeStatus = author.status || "Non-Monetized";
    const matchesMonetize = filterMonetize === "all" || monetizeStatus === filterMonetize;
    
    return matchesSearch && matchesStatus && matchesMonetize;
  });

  // ===== TOGGLE BADGE (verified/unverified) =====
  const toggleBadge = async (username, currentStatus) => {
    if (loadingId) return;
    setLoadingId(username);

    try {
      const res = await fetch("/api/toggle-badge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          badge: currentStatus === "verified" ? "unverified" : "verified",
        }),
      });

      if (res.ok) {
        setAuthors((prev) =>
          prev.map((a) =>
            a.username === username
              ? { ...a, badge: currentStatus === "verified" ? "unverified" : "verified" }
              : a
          )
        );
      } else {
        alert(t("Habaye ikosa mu guhindura status."));
      }
    } catch (error) {
      console.error(error);
      alert(t("Habaye ikosa mu guhindura status."));
    } finally {
      setLoadingId(null);
    }
  };

  // ===== TOGGLE MONETIZATION STATUS =====
  const toggleMonetization = async (username, currentStatus) => {
    if (monetizingId) return;
    setMonetizingId(username);

    const newStatus = currentStatus === "Monitized" ? "Non-Monetized" : "Monitized";

    try {
      await updateDoc(doc(db, "authors", username), {
        status: newStatus,
      });

      setAuthors((prev) =>
        prev.map((a) =>
          a.username === username
            ? { ...a, status: newStatus }
            : a
        )
      );
    } catch (error) {
      console.error("Error updating monetization status:", error);
      alert(t("❌ Habaye ikosa mu guhindura status ya monetization."));
    } finally {
      setMonetizingId(null);
    }
  };

  // ===== DELETE AUTHOR =====
  const deleteAuthor = async (username) => {
    if (!confirm(t("Ushaka koko gusiba umwanditsi \"{username}\" burundu?", { username }))) return;

    setDeletingId(username);
    try {
      await deleteDoc(doc(db, "authors", username));
      setAuthors((prev) => prev.filter((a) => a.username !== username));
      alert(t("✅ Umwanditsi \"{username}\" yasibwe neza!", { username }));
    } catch (error) {
      console.error("Error deleting author:", error);
      alert(t("❌ Habaye ikosa mu gusiba umwanditsi."));
    } finally {
      setDeletingId(null);
    }
  };

  // ===== GET VERIFICATION BADGE =====
  const getVerificationBadge = (status) => {
    if (status === "verified") {
      return (
        <span className={styles.badgeVerified}>
          <FaCheckCircle />{" "}{t("Verified")}</span>
      );
    }
    return (
      <span className={styles.badgeUnverified}>
        <FaTimesCircle />{" "}{t("Unverified")}</span>
    );
  };

  // ===== GET MONETIZATION BADGE =====
  const getMonetizationBadge = (status) => {
    if (status === "Monitized") {
      return (
        <span className={styles.monetizedBadge}>
          <FaShieldAlt />{" "}{t("Monitized")}</span>
      );
    }
    return (
      <span className={styles.nonMonetizedBadge}>
        <FaBan />{" "}{t("Non-Monetized")}</span>
    );
  };

  // ===== STATS =====
  const totalAuthors = authors.length;
  const verifiedCount = authors.filter((a) => a.badge === "verified").length;
  const unverifiedCount = totalAuthors - verifiedCount;
  const monetizedCount = authors.filter((a) => a.status === "Monitized").length;
  const nonMonetizedCount = totalAuthors - monetizedCount;

  // ===== RENDER =====
  return (
    <>
    <LinkComponent />
    <div className={styles.container}>
      <div className={styles.card}>
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <FaUsers className={styles.headerIcon} />
            <div>
              <h1 className={styles.title}>{t("👥 Authors Management")}</h1>
              <p className={styles.subtitle}>{t("Manage all authors on the platform")}</p>
            </div>
          </div>
          <button onClick={() => router.push("/admin")} className={styles.backBtn}>
            <FaArrowLeft />{" "}{t("Subira")}</button>
        </div>

        {/* STATS */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <FaUsers className={styles.statIcon} />
            <div>
              <span className={styles.statLabel}>{t("Total")}</span>
              <strong className={styles.statValue}>{totalAuthors}</strong>
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.statVerified}`}>
            <FaUserCheck className={styles.statIcon} />
            <div>
              <span className={styles.statLabel}>{t("Verified")}</span>
              <strong className={styles.statValue}>{verifiedCount}</strong>
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.statUnverified}`}>
            <FaUserTimes className={styles.statIcon} />
            <div>
              <span className={styles.statLabel}>{t("Unverified")}</span>
              <strong className={styles.statValue}>{unverifiedCount}</strong>
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.statMonetized}`}>
            <FaShieldAlt className={styles.statIcon} />
            <div>
              <span className={styles.statLabel}>{t("Monitized")}</span>
              <strong className={styles.statValue}>{monetizedCount}</strong>
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.statNonMonetized}`}>
            <FaBan className={styles.statIcon} />
            <div>
              <span className={styles.statLabel}>{t("Non-Monetized")}</span>
              <strong className={styles.statValue}>{nonMonetizedCount}</strong>
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div className={styles.filters}>
          <div className={styles.searchWrapper}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder={t("Shaka username...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">{t("📋 All Verification")}</option>
            <option value="verified">{t("✅ Verified")}</option>
            <option value="unverified">{t("❌ Unverified")}</option>
          </select>

          <select
            value={filterMonetize}
            onChange={(e) => setFilterMonetize(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">{t("💰 All Monetization")}</option>
            <option value="Monitized">{t("🟢 Monitized")}</option>
            <option value="Non-Monetized">{t("🔴 Non-Monetized")}</option>
          </select>
        </div>

        {/* AUTHORS GRID */}
        <div className={styles.grid}>
          {filteredAuthors.length === 0 ? (
            <div className={styles.emptyState}>
              <FaUser className={styles.emptyIcon} />
              <h3>{t("Nta Mwanditsi")}</h3>
              <p>{t("Nta mwanditsi iboneka cyangwa nta uhuje ibyo ushakisha.")}</p>
            </div>
          ) : (
            filteredAuthors.map((author) => (
              <div key={author.username} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.avatar}>
                    <span>{author.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className={styles.cardUserInfo}>
                    <h3 className={styles.username}>{author.username}</h3>
                    <div className={styles.badgeRow}>
                      {getVerificationBadge(author.badge || "unverified")}
                      {getMonetizationBadge(author.status || "Non-Monetized")}
                    </div>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}>{t("📅 Joined:")}</span>
                    <span className={styles.cardValue}>
                      {author.createdAt
                        ? new Date(author.createdAt).toLocaleDateString("rw-RW", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "N/A"}
                    </span>
                  </div>
                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}><FaCoins />{" "}{t("NES:")}</span>
                    <span className={styles.cardValue}>{author.nes || 0}</span>
                  </div>
                  {author.bonus !== undefined && (
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}><FaGift />{" "}{t("Bonus:")}</span>
                      <span className={styles.cardValue}>{author.bonus || 0}</span>
                    </div>
                  )}
                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}><FaShieldAlt />{" "}{t("Monetization:")}</span>
                    <span className={`${styles.cardValue} ${
                      author.status === "Monitized" 
                        ? styles.monetizedText 
                        : styles.nonMonetizedText
                    }`}>
                      {author.status || t("Non-Monetized")}
                    </span>
                  </div>
                </div>

                <div className={styles.cardActions}>
                  {/* Verification Button */}
                  <button
                    onClick={() => toggleBadge(author.username, author.badge)}
                    disabled={loadingId === author.username}
                    className={`${styles.actionBtn} ${
                      author.badge === "verified" ? styles.unverifyBtn : styles.verifyBtn
                    }`}
                  >
                    {loadingId === author.username ? (
                      <FaSpinner className={styles.spinner} />
                    ) : author.badge === "verified" ? (
                      <FaUserTimes />
                    ) : (
                      <FaUserCheck />
                    )}
                    <span>
                      {author.badge === "verified" ? t("Unverify") : t("Verify")}
                    </span>
                  </button>

                  {/* Monetization Button */}
                  <button
                    onClick={() => toggleMonetization(author.username, author.status)}
                    disabled={monetizingId === author.username}
                    className={`${styles.actionBtn} ${
                      author.status === "Monitized" 
                        ? styles.disallowBtn 
                        : styles.allowBtn
                    }`}
                  >
                    {monetizingId === author.username ? (
                      <FaSpinner className={styles.spinner} />
                    ) : author.status === "Monitized" ? (
                      <FaBan />
                    ) : (
                      <FaShieldAlt />
                    )}
                    <span>
                      {author.status === "Monitized" ? t("Disallow") : t("Allow")}
                    </span>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteAuthor(author.username)}
                    disabled={deletingId === author.username}
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  >
                    {deletingId === author.username ? (
                      <FaSpinner className={styles.spinner} />
                    ) : (
                      <FaTrash />
                    )}
                    <span>{t("Delete")}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div className={styles.footer}>
          <p>{t("Showing {length} / {totalAuthors} authors", { length: filteredAuthors.length, totalAuthors })}</p>
        </div>
      </div>
    </div>
          </>
  );
}
