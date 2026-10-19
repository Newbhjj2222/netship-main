import { useState } from "react";
import { useRouter } from "next/router";
import { db } from "@/components/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import styles from "@/styles/contractsList.module.css";
import {
  FaFileContract,
  FaTrash,
  FaCheckCircle,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaSearch,
  FaSpinner,
  FaEye,
  FaExclamationTriangle,
  FaCheck,
  FaTimes,
  FaFileAlt,
  FaUserCheck,
  FaClock
} from "react-icons/fa";
import LinkComponent from "../../components/Links";
import { useI18n } from "@/i18n/I18nProvider";
export async function getServerSideProps() {
  try {
    const snapshot = await getDocs(collection(db, "contracts"));
    const data = snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
      createdAt: docItem.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    return { props: { initialContracts: data } };
  } catch (error) {
    console.error("Error fetching contracts:", error);
    return { props: { initialContracts: [], error: "Habaye ikibazo mu kubona contracts." } };
  }
}

export default function ContractsList({ initialContracts, error: serverError }) {
  const { t } = useI18n();

  const router = useRouter();
  const [contracts, setContracts] = useState(initialContracts || []);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState(serverError || "");

  // ===== FILTER CONTRACTS =====
  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      (c.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").includes(search);

    const isApproved = c.approved === true;
    const matchesFilter =
      filter === "all" ||
      (filter === "approved" && isApproved) ||
      (filter === "pending" && !isApproved);

    return matchesSearch && matchesFilter;
  });

  // ===== DELETE CONTRACT =====
  const handleDelete = async (id) => {
    if (!confirm(t("Urahara ushaka gusiba iyi contract?"))) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "contracts", id));
      setContracts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
      setError(t("Habaye ikosa mu gusiba contract."));
    } finally {
      setLoading(false);
    }
  };

  // ===== APPROVE CONTRACT =====
  const handleApprove = async (id) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, "contracts", id), {
        approved: true,
        approvedAt: new Date().toISOString(),
      });
      setContracts((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, approved: true, approvedAt: new Date().toISOString() } : c
        )
      );
    } catch (err) {
      console.error(err);
      setError(t("Habaye ikosa mu kwemeza contract."));
    } finally {
      setLoading(false);
    }
  };

  // ===== VIEW CONTRACT DETAILS =====
  const handleView = (id) => {
    router.push(`/admin/contract/${id}`);
  };

  // ===== FORMAT DATE =====
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("rw-RW", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // ===== STATS =====
  const total = contracts.length;
  const approvedCount = contracts.filter((c) => c.approved === true).length;
  const pendingCount = total - approvedCount;

  return (
    <>
    <LinkComponent />
    <div className={styles.container}>
      <div className={styles.card}>
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <FaFileContract className={styles.headerIcon} />
            <div>
              <h1 className={styles.title}>{t("📋 All Contracts")}</h1>
              <p className={styles.subtitle}>{t("Manage all contract applications")}</p>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <FaFileAlt className={styles.statIcon} />
            <div>
              <span className={styles.statLabel}>{t("Total")}</span>
              <strong className={styles.statValue}>{total}</strong>
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.statApproved}`}>
            <FaCheckCircle className={styles.statIcon} />
            <div>
              <span className={styles.statLabel}>{t("Approved")}</span>
              <strong className={styles.statValue}>{approvedCount}</strong>
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.statPending}`}>
            <FaClock className={styles.statIcon} />
            <div>
              <span className={styles.statLabel}>{t("Pending")}</span>
              <strong className={styles.statValue}>{pendingCount}</strong>
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div className={styles.filters}>
          <div className={styles.searchWrapper}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder={t("Shaka mu izina, email, cyangwa telefone...")}
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
            <option value="approved">{t("✅ Approved")}</option>
            <option value="pending">{t("⏳ Pending")}</option>
          </select>
        </div>

        {/* ERROR */}
        {error && (
          <div className={styles.errorCard}>
            <FaExclamationTriangle className={styles.errorIcon} />
            <p>{error}</p>
          </div>
        )}

        {/* CONTRACTS LIST */}
        {filteredContracts.length === 0 ? (
          <div className={styles.emptyState}>
            <FaFileContract className={styles.emptyIcon} />
            <h3>{t("📭 Nta Contract")}</h3>
            <p>{t("Nta contract iboneka cyangwa nta ihuje ibyo ushakisha.")}</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredContracts.map((c) => (
              <div key={c.id} className={`${styles.contractCard} ${c.approved ? styles.approvedCard : styles.pendingCard}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardAvatar}>
                    <span>{c.fullName?.charAt(0)?.toUpperCase() || "?"}</span>
                  </div>
                  <div className={styles.cardTitle}>
                    <h3>{c.fullName || t("Unknown")}</h3>
                    <span className={styles.cardEmail}>
                      <FaEnvelope className={styles.iconSmall} /> {c.email || "N/A"}
                    </span>
                  </div>
                  <span className={`${styles.statusBadge} ${c.approved ? styles.statusApproved : styles.statusPending}`}>
                    {c.approved ? <FaCheck /> : <FaClock />}
                    {c.approved ? t("Approved") : t("Pending")}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardRow}>
                    <FaUser className={styles.rowIcon} />
                    <span>{c.fullName || "N/A"}</span>
                  </div>
                  <div className={styles.cardRow}>
                    <FaEnvelope className={styles.rowIcon} />
                    <span>{c.email || "N/A"}</span>
                  </div>
                  {c.phone && (
                    <div className={styles.cardRow}>
                      <FaPhone className={styles.rowIcon} />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  <div className={styles.cardRow}>
                    <FaFileContract className={styles.rowIcon} />
                    <span className={c.contractType === "exclusive" ? styles.exclusive : styles.nonExclusive}>
                      {c.contractType === "exclusive" ? t("Exclusive") : t("Non-Exclusive")}
                    </span>
                  </div>
                  <div className={styles.cardRow}>
                    <FaCalendarAlt className={styles.rowIcon} />
                    <span>{formatDate(c.createdAt)}</span>
                  </div>
                  {c.approved && c.approvedAt && (
                    <div className={styles.cardRow}>
                      <FaCheckCircle className={styles.rowIcon} style={{ color: "#34d399" }} />
                      <span style={{ color: "#34d399" }}>{t("Approved: {Date}", { Date: formatDate(c.approvedAt) })}</span>
                    </div>
                  )}
                </div>

                <div className={styles.cardActions}>
                  <button
                    className={styles.viewBtn}
                    onClick={() => handleView(c.id)}
                    title={t("Reba contract")}
                  >
                    <FaEye />{" "}{t("View")}</button>
                  {!c.approved && (
                    <button
                      className={styles.approveBtn}
                      onClick={() => handleApprove(c.id)}
                      disabled={loading}
                    >
                      {loading ? <FaSpinner className={styles.spinner} /> : <FaCheck />}{t("Approve")}</button>
                  )}
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(c.id)}
                    disabled={loading}
                  >
                    {loading ? <FaSpinner className={styles.spinner} /> : <FaTrash />}{t("Delete")}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FOOTER */}
        <div className={styles.footer}>
          <p>{t("Showing {length} / {total} contracts", { length: filteredContracts.length, total })}</p>
        </div>
      </div>
    </div>
          </>
  );
}
