import { useState, useEffect, useRef, Fragment } from "react";
import { useRouter } from "next/router";
import { db } from "../../components/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
  where,
  updateDoc,
  getDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import Cookies from "js-cookie";
import styles from "../../styles/adminPolls.module.css";
import {
  FaTrophy,
  FaUser,
  FaCalendar,
  FaCheckCircle,
  FaVoteYea,
  FaTrash,
  FaEdit,
  FaPlus,
  FaSave,
  FaTimes,
  FaArrowLeft,
  FaUsers,
  FaChartBar,
  FaCrown,
  FaFire,
  FaSearch,
  FaSortUp,
  FaSortDown,
  FaSpinner,
  FaHeading,
  FaQuoteRight,
  FaBold,
  FaItalic,
  FaUnderline,
  FaLink,
  FaListUl,
  FaListOl,
  FaImage,
  FaEraser,
  FaEye,
} from "react-icons/fa";
import LinkComponent from "../../components/Links";
import { useI18n } from "@/i18n/I18nProvider";

export default function AdminPolls() {
  const { t } = useI18n();

  const router = useRouter();
  const [polls, setPolls] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [message, setMessage] = useState(null);
  const [newCandidate, setNewCandidate] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    month: "",
    startDate: "",
    endDate: "",
    candidates: [],
  });

  // ===== CHECK SESSION =====
  useEffect(() => {
    setIsClient(true);
    setCheckingAuth(true);

    const userCookie = Cookies.get("user");

    if (!userCookie) {
      router.replace("/login");
      setCheckingAuth(false);
      return;
    }

    try {
      const userData = JSON.parse(userCookie);
      const userName = userData.username || "";
      setUsername(userName);

      const isAdminUser = userName.toLowerCase() === "newtalentsg";

      if (isAdminUser) {
        setIsAdmin(true);
        fetchPolls();
        fetchAuthors();
      } else {
        setIsAdmin(false);
        router.replace("/");
      }
    } catch (error) {
      console.error("Error parsing cookie:", error);
      router.replace("/login");
    } finally {
      setCheckingAuth(false);
    }
  }, [router]);

  // ===== FETCH POLLS =====
  const fetchPolls = async () => {
    try {
      const q = query(collection(db, "polls"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
      }));
      setPolls(data);
    } catch (error) {
      console.error("Error fetching polls:", error);
      setMessage({
        type: "error",
        text: "Habaye ikibazo mu kubona polls.",
      });
    }
  };

  // ===== FETCH AUTHORS =====
  const fetchAuthors = async () => {
    try {
      const snap = await getDocs(collection(db, "authors"));
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAuthors(data);
    } catch (error) {
      console.error("Error fetching authors:", error);
    }
  };

  // ===== ADD CANDIDATE =====
  const addCandidate = () => {
    if (!newCandidate.trim()) {
      setMessage({
        type: "error",
        text: "Shyiramo izina ry'umwanditsi mbere yo kongeraho.",
      });
      return;
    }

    const exists = formData.candidates.some(
      (c) => c.name.toLowerCase() === newCandidate.trim().toLowerCase()
    );
    if (exists) {
      setMessage({
        type: "error",
        text: "Uyu mwanditsi amaze kongerwa!",
      });
      setNewCandidate("");
      return;
    }

    const existingAuthor = authors.find(
      (a) => a.name?.toLowerCase() === newCandidate.trim().toLowerCase()
    );

    const candidate = {
      id: `candidate_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: newCandidate.trim(),
      photo: existingAuthor?.photo || "",
      votes: 0,
    };

    setFormData((prev) => ({
      ...prev,
      candidates: [...prev.candidates, candidate],
    }));
    setNewCandidate("");
    setMessage(null);
  };

  // ===== REMOVE CANDIDATE =====
  const removeCandidate = (candidateId) => {
    setFormData((prev) => ({
      ...prev,
      candidates: prev.candidates.filter((c) => c.id !== candidateId),
    }));
  };

  // ===== HANDLE FORM SUBMIT =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!formData.title || !formData.month || formData.candidates.length < 2) {
        setMessage({
          type: "error",
          text: "Byibuze ushaka umutwe, ukwezi, n'abanditsi 2.",
        });
        setLoading(false);
        return;
      }

      const pollData = {
        title: formData.title,
        description: formData.description || "",
        month: formData.month,
        startDate: formData.startDate || new Date().toISOString().split("T")[0],
        endDate: formData.endDate || "",
        candidates: formData.candidates,
        totalVotes: 0,
        status: "active",
        winner: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: username,
      };

      if (isEditing && selectedPoll) {
        const pollRef = doc(db, "polls", selectedPoll.id);
        await updateDoc(pollRef, {
          ...pollData,
          updatedAt: serverTimestamp(),
        });

        setMessage({
          type: "success",
          text: "Poll yahinduwe neza! ✅",
        });
      } else {
        await addDoc(collection(db, "polls"), pollData);
        setMessage({
          type: "success",
          text: "Poll yashizweho neza! ✅",
        });
      }

      resetForm();
      setShowForm(false);
      await fetchPolls();
    } catch (error) {
      console.error("Error saving poll:", error);
      setMessage({
        type: "error",
        text: "Habaye ikibazo. Ongera ugerageze.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ===== DELETE POLL =====
  const deletePoll = async (pollId) => {
    if (!confirm(t("Urahatiye ushaka gusiba iyi poll?"))) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, "polls", pollId));

      // Delete related votes
      const votesRef = collection(db, "votes");
      const votesQuery = query(votesRef, where("pollId", "==", pollId));
      const votesSnapshot = await getDocs(votesQuery);
      const deletePromises = votesSnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      await fetchPolls();

      if (selectedPoll?.id === pollId) {
        setSelectedPoll(null);
      }

      setMessage({
        type: "success",
        text: "Poll yasibwe neza! ✅",
      });
    } catch (error) {
      console.error("Error deleting poll:", error);
      setMessage({
        type: "error",
        text: "Habaye ikibazo mu gusiba poll.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ===== EDIT POLL =====
  const editPoll = (poll) => {
    setSelectedPoll(poll);
    setFormData({
      title: poll.title || "",
      description: poll.description || "",
      month: poll.month || "",
      startDate: poll.startDate || "",
      endDate: poll.endDate || "",
      candidates: poll.candidates || [],
    });
    setIsEditing(true);
    setShowForm(true);
  };

  // ===== RESET FORM =====
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      month: "",
      startDate: "",
      endDate: "",
      candidates: [],
    });
    setNewCandidate("");
    setIsEditing(false);
    setSelectedPoll(null);
  };

  // ===== VIEW POLL RESULTS =====
  const viewPoll = (poll) => {
    setSelectedPoll(selectedPoll?.id === poll.id ? null : poll);
  };

  // ===== SORT POLLS =====
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // ===== FILTERED & SORTED POLLS =====
  const filteredPolls = polls.filter((poll) => {
    const search = searchTerm.toLowerCase();
    return (
      poll.title?.toLowerCase().includes(search) ||
      poll.month?.toLowerCase().includes(search) ||
      poll.status?.toLowerCase().includes(search) ||
      poll.candidates?.some((c) => c.name.toLowerCase().includes(search))
    );
  });

  const sortedPolls = [...filteredPolls].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === "candidates") {
      aVal = a.candidates?.length || 0;
      bVal = b.candidates?.length || 0;
    }

    if (sortField === "totalVotes") {
      aVal = a.totalVotes || 0;
      bVal = b.totalVotes || 0;
    }

    if (typeof aVal === "string") {
      return sortDirection === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
  });

  // ===== LOADING STATE =====
  if (checkingAuth) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <FaSpinner className={styles.loadingSpinner} />
          <p>{t("Ibihe...")}</p>
        </div>
      </div>
    );
  }

  // ===== NOT ADMIN =====
  if (!isAdmin && isClient) {
    return (
      <div className={styles.container}>
        <div className={styles.unauthorized}>
          <FaTimes className={styles.unauthorizedIcon} />
          <h2>{t("⛔ Ntabwo ufite uburenganzira")}</h2>
          <p>{t("Gusa abayobozi bashobora kugera kuri iyi page.")}</p>
          <button onClick={() => router.push("/")} className={styles.goHomeBtn}>{t("🏠 Subira ku rupapuro rw'ibanze")}</button>
        </div>
      </div>
    );
  }

  // ================= RENDER =================
  return (
    <>
      <LinkComponent />
      <div className={styles.container}>
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <FaTrophy className={styles.headerIcon} />
            <div>
              <h1 className={styles.title}>{t("🏆 Admin - Polly y'abanditsi")}</h1>
              <p className={styles.subtitle}>
                <FaUser className={styles.subtitleIcon} />{" "}{t("{username} (Admin)", { username })}</p>
            </div>
          </div>
          <div className={styles.headerStats}>
            <span className={styles.statBadge}>
              <FaTrophy />{" "}{t("{length} polls", { length: polls.length })}</span>
            <span className={styles.statBadge}>
              <FaUsers /> {polls.reduce((acc, p) => acc + (p.candidates?.length || 0), 0)}{" "}{t("abanditsi")}</span>
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              <FaPlus />{" "}{t("Gushyira poll")}</button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`${styles.messageBox} ${
              message.type === "success"
                ? styles.messageSuccess
                : styles.messageError
            }`}
          >
            {message.text}
            <button
              type="button"
              className={styles.messageClose}
              onClick={() => setMessage(null)}
            >
              <FaTimes />
            </button>
          </div>
        )}

        {/* FORM */}
        {showForm && (
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2>{isEditing ? t("Hindura Poll") : t("Gushyira Poll Nshya")}</h2>
              <button
                type="button"
                className={styles.closeFormBtn}
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <FaHeading />{" "}{t("Umutwe *")}</label>
                  <input
                    type="text"
                    placeholder={t("Ex: Umwanditsi w'ukwezi - Ukwezi kwa 7")}
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <FaCalendar />{" "}{t("Ukwezi *")}</label>
                  <input
                    type="month"
                    value={formData.month}
                    onChange={(e) =>
                      setFormData({ ...formData, month: e.target.value })
                    }
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <FaQuoteRight />{" "}{t("Ibihindukuri")}</label>
                  <textarea
                    placeholder={t("Description ya poll...")}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className={styles.textarea}
                    rows="3"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <FaCalendar />{" "}{t("Itariki itangira")}</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <FaCalendar />{" "}{t("Itariki irangiye")}</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className={styles.input}
                  />
                </div>
              </div>

              {/* Candidates */}
              <div className={styles.candidatesSection}>
                <label className={styles.label}>
                  <FaUsers />{" "}{t("Abanditsi (byibuze 2) *")}</label>
                <div className={styles.addCandidateRow}>
                  <input
                    type="text"
                    placeholder={t("Shyiramo izina ry'umwanditsi...")}
                    value={newCandidate}
                    onChange={(e) => setNewCandidate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCandidate();
                      }
                    }}
                    list="authorsList"
                    className={styles.input}
                  />
                  <datalist id="authorsList">
                    {authors.map((author) => (
                      <option key={author.id} value={author.name} />
                    ))}
                  </datalist>
                  <button
                    type="button"
                    className={styles.addCandidateBtn}
                    onClick={addCandidate}
                    disabled={!newCandidate.trim()}
                  >
                    <FaPlus />{" "}{t("Ongeraho")}</button>
                </div>

                <div className={styles.candidatesList}>
                  {formData.candidates.length === 0 ? (
                    <p className={styles.candidatesEmpty}>{t("Nta mwanditsi wongeweho")}</p>
                  ) : (
                    formData.candidates.map((candidate) => (
                      <div key={candidate.id} className={styles.candidateChip}>
                        {candidate.photo && (
                          <img
                            src={candidate.photo}
                            alt={candidate.name}
                            className={styles.candidateChipImage}
                          />
                        )}
                        <span>{candidate.name}</span>
                        <button
                          type="button"
                          className={styles.removeCandidateBtn}
                          onClick={() => removeCandidate(candidate.id)}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {formData.candidates.length < 2 && (
                  <p className={styles.candidatesWarning}>{t("⚠️ Ongeraho abanditsi 2 byibuze")}</p>
                )}
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                >
                  <FaTimes />{" "}{t("Reka")}</button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={loading || formData.candidates.length < 2}
                >
                  {loading ? (
                    <>
                      <FaSpinner className={styles.spinner} />{" "}{t("Ibihe...")}</>
                  ) : (
                    <>
                      <FaSave /> {isEditing ? t("Hindura") : t("Shyira")}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SEARCH */}
        <div className={styles.controls}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder={t("Shakisha poll...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            {searchTerm && (
              <button
                type="button"
                className={styles.clearSearch}
                onClick={() => setSearchTerm("")}
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>

        {/* TABLE */}
        <div className={styles.tableSection}>
          <h2 className={styles.sectionTitle}>
            <FaEye />{" "}{t("Polls zose ({length})", { length: sortedPolls.length })}</h2>

          <div className={styles.tableWrapper}>
            {sortedPolls.length === 0 ? (
              <div className={styles.emptyState}>
                <FaTrophy className={styles.emptyIcon} />
                <h3>{t("Nta Poll")}</h3>
                <p>{t("Nta poll wishyizeho. Koresha formu yo hejuru.")}</p>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th onClick={() => handleSort("title")}>
                      <div className={styles.tableHeader}>{t("Poll")}{sortField === "title" &&
                          (sortDirection === "asc" ? (
                            <FaSortUp />
                          ) : (
                            <FaSortDown />
                          ))}
                      </div>
                    </th>
                    <th onClick={() => handleSort("month")}>
                      <div className={styles.tableHeader}>{t("Ukwezi")}{sortField === "month" &&
                          (sortDirection === "asc" ? (
                            <FaSortUp />
                          ) : (
                            <FaSortDown />
                          ))}
                      </div>
                    </th>
                    <th onClick={() => handleSort("candidates")}>
                      <div className={styles.tableHeader}>{t("Abanditsi")}{sortField === "candidates" &&
                          (sortDirection === "asc" ? (
                            <FaSortUp />
                          ) : (
                            <FaSortDown />
                          ))}
                      </div>
                    </th>
                    <th onClick={() => handleSort("totalVotes")}>
                      <div className={styles.tableHeader}>
                        <FaVoteYea />{" "}{t("Votes")}{sortField === "totalVotes" &&
                          (sortDirection === "asc" ? (
                            <FaSortUp />
                          ) : (
                            <FaSortDown />
                          ))}
                      </div>
                    </th>
                    <th>{t("Umutsinzi")}</th>
                    <th onClick={() => handleSort("status")}>
                      <div className={styles.tableHeader}>{t("Status")}{sortField === "status" &&
                          (sortDirection === "asc" ? (
                            <FaSortUp />
                          ) : (
                            <FaSortDown />
                          ))}
                      </div>
                    </th>
                    <th>{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPolls.map((poll) => {
                    const winner = poll.candidates?.find(
                      (c) => c.id === poll.winner
                    );
                    const isExpanded = selectedPoll?.id === poll.id;

                    return (
                      <Fragment key={poll.id}>
                        <tr className={styles.tableRow}>
                          <td className={styles.titleCell}>
                            <span className={styles.titleText}>{poll.title}</span>
                          </td>
                          <td className={styles.monthCell}>{poll.month}</td>
                          <td className={styles.candidateCountCell}>
                            <span className={styles.candidateCount}>
                              {poll.candidates?.length || 0}
                            </span>
                          </td>
                          <td className={styles.voteCell}>
                            <span className={styles.voteCount}>
                              <FaVoteYea /> {poll.totalVotes || 0}
                            </span>
                          </td>
                          <td className={styles.winnerCell}>
                            {winner ? (
                              <div className={styles.winnerDisplay}>
                                <FaCrown className={styles.winnerIcon} />
                                {winner.name}
                              </div>
                            ) : (
                              <span className={styles.noWinner}>-</span>
                            )}
                          </td>
                          <td className={styles.statusCell}>
                            <span
                              className={`${styles.statusBadge} ${
                                poll.status === "active"
                                  ? styles.statusActive
                                  : styles.statusEnded
                              }`}
                            >
                              {poll.status === "active" ? (
                                <>
                                  <FaFire />{" "}{t("Irakora")}</>
                              ) : (
                                <>
                                  <FaCheckCircle />{" "}{t("Yarangije")}</>
                              )}
                            </span>
                          </td>
                          <td className={styles.actionCell}>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => viewPoll(poll)}
                              title={t("Reba ibyangombwa")}
                            >
                              <FaChartBar />
                            </button>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => editPoll(poll)}
                              disabled={poll.status === "ended"}
                              title={t("Hindura poll")}
                            >
                              <FaEdit />
                            </button>
                            <button
                              type="button"
                              className={`${styles.actionBtn} ${styles.deleteBtn}`}
                              onClick={() => deletePoll(poll.id)}
                              disabled={loading}
                              title={t("Siba poll")}
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>

                        {/* Expanded row */}
                        {isExpanded && (
                          <tr className={styles.expandedRow}>
                            <td colSpan="7">
                              <div className={styles.expandedContent}>
                                <h3>{poll.title}</h3>
                                <p>{poll.description}</p>

                                <div className={styles.expandedStats}>
                                  <div className={styles.statBox}>
                                    <span className={styles.statLabel}>{t("Abanditsi")}</span>
                                    <span className={styles.statValue}>
                                      {poll.candidates?.length || 0}
                                    </span>
                                  </div>
                                  <div className={styles.statBox}>
                                    <span className={styles.statLabel}>{t("Votes")}</span>
                                    <span className={styles.statValue}>
                                      {poll.totalVotes || 0}
                                    </span>
                                  </div>
                                  <div className={styles.statBox}>
                                    <span className={styles.statLabel}>{t("Status")}</span>
                                    <span className={styles.statValue}>
                                      {poll.status === "active"
                                        ? t("Irakora")
                                        : t("Yarangije")}
                                    </span>
                                  </div>
                                  <div className={styles.statBox}>
                                    <span className={styles.statLabel}>{t("Ukwezi")}</span>
                                    <span className={styles.statValue}>
                                      {poll.month}
                                    </span>
                                  </div>
                                </div>

                                <div className={styles.candidateBreakdown}>
                                  <h4>{t("Abanditsi & Votes")}</h4>
                                  <div className={styles.candidateTable}>
                                    {poll.candidates?.map((candidate) => {
                                      const votePercent =
                                        poll.totalVotes > 0
                                          ? Math.round(
                                              (candidate.votes /
                                                poll.totalVotes) *
                                                100
                                            )
                                          : 0;
                                      const isWinner =
                                        candidate.id === poll.winner;

                                      return (
                                        <div
                                          key={candidate.id}
                                          className={`${styles.candidateRow} ${
                                            isWinner
                                              ? styles.candidateRowWinner
                                              : ""
                                          }`}
                                        >
                                          <div className={styles.candidateInfo}>
                                            {candidate.photo ? (
                                              <img
                                                src={candidate.photo}
                                                alt={candidate.name}
                                                className={
                                                  styles.expandedCandidateImage
                                                }
                                              />
                                            ) : (
                                              <div
                                                className={
                                                  styles.expandedCandidateIcon
                                                }
                                              >
                                                <FaUser />
                                              </div>
                                            )}
                                            <span>{candidate.name}</span>
                                            {isWinner && (
                                              <span className={styles.winnerBadge}>{t("🏆 Umutsinzi")}</span>
                                            )}
                                          </div>
                                          <div className={styles.voteBarContainer}>
                                            <div className={styles.voteBarWrapper}>
                                              <div
                                                className={styles.voteBarFill}
                                                style={{
                                                  width: `${votePercent}%`,
                                                }}
                                              />
                                            </div>
                                            <span className={styles.voteNumber}>
                                              {candidate.votes || 0} ({votePercent}
                                              %)
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
