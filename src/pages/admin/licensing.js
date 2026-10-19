import Head from "next/head";
import { useRouter } from "next/router";
import { db } from "@/components/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { useState } from "react";
import styles from "@/styles/contractsList.module.css";
import {
  FaFileContract,
  FaUser,
  FaEnvelope,
  FaBook,
  FaCheckCircle,
  FaTimesCircle,
  FaSearch,
  FaArrowLeft,
  FaEye,
  FaClock,
  FaShieldAlt,
  FaLock,
  FaUnlock
} from "react-icons/fa";
import LinkComponent from "../../components/Links";
import { useI18n } from "@/i18n/I18nProvider";

// ============================================
// SSR - getServerSideProps
// ============================================
export async function getServerSideProps() {
  try {
    const snap = await getDocs(collection(db, "contracts"));
    const contracts = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    return {
      props: {
        contracts: JSON.parse(JSON.stringify(contracts)),
      },
    };
  } catch (err) {
    console.error(err);
    return {
      props: {
        contracts: [],
        error: "Habaye ikibazo mu kubona contracts.",
      },
    };
  }
}

// ============================================
// COMPONENT
// ============================================
export default function ContractsList({
  contracts: initialContracts,
  error: serverError,
}) {
  const { t } = useI18n();

  const [contracts, setContracts] = useState(initialContracts);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error] = useState(serverError || "");

  // ===== FILTER CONTRACTS =====
  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.story || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.licenseType || "").toLowerCase().includes(search.toLowerCase());

    const isApproved = c.approved === true;
    const matchesFilter =
      filter === "all" ||
      (filter === "approved" && isApproved) ||
      (filter === "pending" && !isApproved);

    return matchesSearch && matchesFilter;
  });

  // ===== HANDLE APPROVED =====
  const handleApproved = (id) => {
    router.push(`/admin/contracts/${id}`);
  };
const handleApprove = async (id) => {
  try {
    await updateDoc(doc(db, "contracts", id), {
      approved: true,
      approvedAt: new Date(),
    });

    setContracts((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              approved: true,
              approvedAt: new Date().toISOString(),
            }
          : c
      )
    );

    alert(t("Contract approved successfully."));
  } catch (err) {
    console.error(err);
    alert(t("Approval failed."));
  }
};
  // ===== GO BACK =====
  const goBack = () => {
    router.back();
  };

  // ===== STATS =====
  const total = contracts.length;
  const approvedCount = contracts.filter((c) => c.approved === true).length;
  const pendingCount = total - approvedCount;

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

  // ===== GET LICENSE BADGE =====
  const getLicenseBadge = (type) => {
    if (type === "exclusive") {
      return (
        <span className={styles.licenseExclusive}>
          <FaLock />{" "}{t("Exclusive")}</span>
      );
    }
    return (
      <span className={styles.licenseNonExclusive}>
        <FaUnlock />{" "}{t("Non-Exclusive")}</span>
    );
  };

  // ===== RENDER =====
  return (
    <>
      <Head>
        <title>{t("Contracts List")}</title>
        <meta name="description" content="Manage all contract requests" />
      </Head>
    <LinkComponent />

      <div className={styles.container}>
        <div className={styles.card}>
          {/* HEADER */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <button onClick={goBack} className={styles.backBtn}>
                <FaArrowLeft />{" "}{t("Subira")}</button>
              <div>
                <h1 className={styles.title}>
                  <FaFileContract className={styles.titleIcon} />{" "}{t("Contracts Requests")}</h1>
                <p className={styles.subtitle}>{t("Hitamo contract wishyura approval kugirango ubone badge")}</p>
              </div>
            </div>
          </div>

          {/* STATS */}
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <FaFileContract className={styles.statIcon} />
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
                placeholder={t("Shaka mu izina, email, story, cyangwa license...")}
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
              <FaTimesCircle className={styles.errorIcon} />
              <p>{error}</p>
            </div>
          )}

          {/* CONTRACTS GRID */}
          {filteredContracts.length === 0 ? (
            <div className={styles.emptyState}>
              <FaFileContract className={styles.emptyIcon} />
              <h3>{t("📭 Nta Contract")}</h3>
              <p>{t("Nta contract iboneka cyangwa nta ihuje ibyo ushakisha.")}</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {filteredContracts.map((c) => (
                <div
                  key={c.id}
                  className={`${styles.contractCard} ${c.approved ? styles.approvedCard : styles.pendingCard}`}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardAvatar}>
                      <span>{c.name?.charAt(0)?.toUpperCase() || "?"}</span>
                    </div>
                    <div className={styles.cardTitle}>
                      <h3>{c.name || t("Unknown")}</h3>
                      <span className={styles.cardEmail}>
                        <FaEnvelope className={styles.iconSmall} /> {c.email || "N/A"}
                      </span>
                    </div>
                    <span className={`${styles.statusBadge} ${c.approved ? styles.statusApproved : styles.statusPending}`}>
                      {c.approved ? <FaCheckCircle /> : <FaClock />}
                      {c.approved ? t("Approved") : t("Pending")}
                    </span>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardRow}>
                      <FaUser className={styles.rowIcon} />
                      <span>{c.name || "N/A"}</span>
                    </div>
                    <div className={styles.cardRow}>
                      <FaEnvelope className={styles.rowIcon} />
                      <span>{c.email || "N/A"}</span>
                    </div>
                    <div className={styles.cardRow}>
                      <FaBook className={styles.rowIcon} />
                      <span className={styles.storyTitle}>{c.story || "N/A"}</span>
                    </div>
                    <div className={styles.cardRow}>
                      <FaShieldAlt className={styles.rowIcon} />
                      {getLicenseBadge(c.licenseType)}
                    </div>
                    <div className={styles.cardRow}>
                      <FaFileContract className={styles.rowIcon} />
                      <span>{c.usage || "N/A"}</span>
                    </div>
                    {c.createdAt && (
                      <div className={styles.cardRow}>
                        <FaClock className={styles.rowIcon} />
                        <span>{formatDate(c.createdAt)}</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.cardActions}>
  <button
    className={styles.viewBtn}
    onClick={() => handleApproved(c.id)}
  >
    <FaEye />{" "}{t("View Contract")}</button>

  {!c.approved && (
    <button
      className={styles.approveBtn}
      onClick={() => handleApprove(c.id)}
    >
      <FaCheckCircle />{" "}{t("Approve")}</button>
  )}
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
