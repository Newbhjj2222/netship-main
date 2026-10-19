import React, { useState } from "react";
import { db } from "@/components/firebase";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import styles from "@/styles/reward.module.css";
import {
  FaSearch,
  FaUser,
  FaCoins,
  FaGift,
  FaEdit,
  FaSave,
  FaSpinner,
  FaPlus,
  FaMinus,
  FaSync
} from "react-icons/fa";
import LinkComponent from "../../components/Links";
import { useI18n } from "@/i18n/I18nProvider";

export default function RewardsPage({ authorsServer }) {
  const { t } = useI18n();

  const [authors, setAuthors] = useState(authorsServer || []);
  const [selectedId, setSelectedId] = useState("");
  const [selectedData, setSelectedData] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(null); // 'nes' or 'bonus'

  const filteredAuthors = authors.filter((a) =>
    a.id.toLowerCase().includes(search.toLowerCase())
  );

  // ===== LOAD DOCUMENT =====
  const loadDocument = async () => {
    if (!selectedId) return alert(t("Hitamo User."));

    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "authors", selectedId));
      if (snap.exists()) {
        setSelectedData(snap.data());
      } else {
        alert(t("Document not found!"));
        setSelectedData(null);
      }
    } catch (err) {
      console.error(err);
      alert(t("Error fetching document."));
    } finally {
      setLoading(false);
    }
  };

  // ===== UPDATE NES =====
  const updateNES = async () => {
    if (!selectedId) return alert(t("Hitamo user mbere yo kuvugurura NES."));
    
    const newNES = prompt(t("Shyiramo agaciro gashya ka NES:"), selectedData?.nes || 0);
    if (newNES === null) return;
    if (isNaN(newNES) || newNES < 0) {
      alert(t("Andika umubare mwiza."));
      return;
    }

    setUpdating('nes');
    try {
      await updateDoc(doc(db, "authors", selectedId), { nes: parseInt(newNES) });
      setSelectedData((prev) => ({ ...prev, nes: parseInt(newNES) }));
      alert(t("✅ NES yavuguruwe neza!"));
      
      // Update authors list
      setAuthors(prev => prev.map(a => 
        a.id === selectedId ? { ...a, nes: parseInt(newNES) } : a
      ));
    } catch (err) {
      console.error(err);
      alert(t("❌ Habaye ikosa mu kuvugurura NES."));
    } finally {
      setUpdating(null);
    }
  };

  // ===== UPDATE BONUS =====
  const updateBonus = async () => {
    if (!selectedId) return alert(t("Hitamo user mbere yo kuvugurura Bonus."));

    const newBonus = prompt(t("Shyiramo agaciro gashya ka Bonus:"), selectedData?.bonus || 0);
    if (newBonus === null) return;
    if (isNaN(newBonus) || newBonus < 0) {
      alert(t("Andika umubare mwiza."));
      return;
    }

    setUpdating('bonus');
    try {
      await updateDoc(doc(db, "authors", selectedId), { bonus: parseInt(newBonus) });
      setSelectedData((prev) => ({ ...prev, bonus: parseInt(newBonus) }));
      alert(t("✅ Bonus yavuguruwe neza!"));
      
      // Update authors list
      setAuthors(prev => prev.map(a => 
        a.id === selectedId ? { ...a, bonus: parseInt(newBonus) } : a
      ));
    } catch (err) {
      console.error(err);
      alert(t("❌ Habaye ikosa mu kuvugurura Bonus."));
    } finally {
      setUpdating(null);
    }
  };

  // ===== UPDATE BOTH (Add fixed amounts) =====
  const addToNES = async (amount) => {
    if (!selectedId) return alert(t("Hitamo user."));
    const current = selectedData?.nes || 0;
    const newValue = current + amount;
    if (newValue < 0) {
      alert(t("NES ntishobora kuba munsi ya 0."));
      return;
    }

    setUpdating('nes');
    try {
      await updateDoc(doc(db, "authors", selectedId), { nes: newValue });
      setSelectedData((prev) => ({ ...prev, nes: newValue }));
      setAuthors(prev => prev.map(a => 
        a.id === selectedId ? { ...a, nes: newValue } : a
      ));
    } catch (err) {
      console.error(err);
      alert(t("❌ Habaye ikosa mu kuvugurura NES."));
    } finally {
      setUpdating(null);
    }
  };

  const addToBonus = async (amount) => {
    if (!selectedId) return alert(t("Hitamo user."));
    const current = selectedData?.bonus || 0;
    const newValue = current + amount;
    if (newValue < 0) {
      alert(t("Bonus ntishobora kuba munsi ya 0."));
      return;
    }

    setUpdating('bonus');
    try {
      await updateDoc(doc(db, "authors", selectedId), { bonus: newValue });
      setSelectedData((prev) => ({ ...prev, bonus: newValue }));
      setAuthors(prev => prev.map(a => 
        a.id === selectedId ? { ...a, bonus: newValue } : a
      ));
    } catch (err) {
      console.error(err);
      alert(t("❌ Habaye ikosa mu kuvugurura Bonus."));
    } finally {
      setUpdating(null);
    }
  };

  // ===== FORMAT DATE =====
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("rw-RW", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "N/A";
    }
  };

  // ===== RENDER =====
  return (
    <>
    <LinkComponent />
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("🎯 Management of NES & Bonus")}</h1>
          <p className={styles.subtitle}>{t("Rewards Management System")}</p>
        </div>

        {/* SEARCH & SELECT */}
        <div className={styles.controls}>
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

          <div className={styles.selectWrapper}>
            <FaUser className={styles.selectIcon} />
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className={styles.documentSelect}
            >
              <option value="">{t("Hitamo User")}</option>
              {filteredAuthors.map((a) => (
                <option key={a.id} value={a.id}>{t("{id} (NES:", { id: a.id })}{" "}{a.nes || 0}{" "}{t("| Bonus:")}{" "}{a.bonus || 0})
                </option>
              ))}
            </select>
          </div>

          <button
            className={styles.primaryBtn}
            onClick={loadDocument}
            disabled={loading}
          >
            {loading ? <FaSpinner className={styles.spinner} /> : <FaUser />}
            {loading ? t("Loading...") : t("Show")}
          </button>
        </div>

        {/* SELECTED USER INFO */}
        {selectedData && (
          <div className={styles.selectedInfo}>
            <div className={styles.userBadge}>
              <FaUser className={styles.userBadgeIcon} />
              <span className={styles.userBadgeName}>{selectedId}</span>
            </div>
          </div>
        )}

        {/* TABLE */}
        {selectedData && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("NES")}</th>
                  <th>{t("Bonus")}</th>
                  <th>{t("Total")}</th>
                  <th>{t("Last Updated")}</th>
                  <th>{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.indexCell}>1</td>
                  <td className={styles.valueCell}>
                    <span className={styles.nesValue}>
                      <FaCoins className={styles.valueIcon} />
                      {selectedData.nes || 0}
                    </span>
                    <div className={styles.quickActions}>
                      <button 
                        onClick={() => addToNES(10)} 
                        className={styles.quickBtn}
                        title={t("Add 10 NES")}
                      >
                        <FaPlus /> 10
                      </button>
                      <button 
                        onClick={() => addToNES(-10)} 
                        className={`${styles.quickBtn} ${styles.quickBtnDanger}`}
                        title={t("Remove 10 NES")}
                      >
                        <FaMinus /> 10
                      </button>
                    </div>
                  </td>
                  <td className={styles.valueCell}>
                    <span className={styles.bonusValue}>
                      <FaGift className={styles.valueIcon} />
                      {selectedData.bonus || 0}
                    </span>
                    <div className={styles.quickActions}>
                      <button 
                        onClick={() => addToBonus(5)} 
                        className={styles.quickBtn}
                        title={t("Add 5 Bonus")}
                      >
                        <FaPlus /> 5
                      </button>
                      <button 
                        onClick={() => addToBonus(-5)} 
                        className={`${styles.quickBtn} ${styles.quickBtnDanger}`}
                        title={t("Remove 5 Bonus")}
                      >
                        <FaMinus /> 5
                      </button>
                    </div>
                  </td>
                  <td className={styles.totalCell}>
                    <span className={styles.totalValue}>
                      {(selectedData.nes || 0) + (selectedData.bonus || 0)}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {formatDate(selectedData.timestamp || selectedData.updatedAt)}
                  </td>
                  <td className={styles.actionCell}>
                    <div className={styles.actionGroup}>
                      <button
                        className={`${styles.actionBtn} ${styles.updateNesBtn}`}
                        onClick={updateNES}
                        disabled={updating === 'nes'}
                      >
                        {updating === 'nes' ? (
                          <FaSpinner className={styles.spinner} />
                        ) : (
                          <FaEdit />
                        )}
                        <span>{t("NES")}</span>
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.updateBonusBtn}`}
                        onClick={updateBonus}
                        disabled={updating === 'bonus'}
                      >
                        {updating === 'bonus' ? (
                          <FaSpinner className={styles.spinner} />
                        ) : (
                          <FaGift />
                        )}
                        <span>{t("Bonus")}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* EMPTY STATE */}
        {!selectedData && !loading && (
          <div className={styles.emptyState}>
            <FaUser className={styles.emptyIcon} />
            <h3>{t("Nta User Ihitamo")}</h3>
            <p>{t("Hitamo umukoresha mubone amakuru ye.")}</p>
          </div>
        )}
      </div>
    </div>
        </>
  );
}

// ================= SSR =================
export async function getServerSideProps() {
  try {
    const snap = await getDocs(collection(db, "authors"));
    const authorsServer = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return { props: { authorsServer } };
  } catch (err) {
    console.error("Error fetching authors:", err);
    return { props: { authorsServer: [] } };
  }
}
