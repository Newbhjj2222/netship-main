import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { db } from "../components/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  getDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import Cookies from "js-cookie";
import styles from "../styles/polls.module.css";
import {
  FaTrophy,
  FaUser,
  FaCalendar,
  FaCheckCircle,
  FaVoteYea,
  FaCrown,
  FaMedal,
  FaStar,
  FaFire,
  FaArrowLeft,
  FaSpinner,
} from "react-icons/fa";
import { useI18n } from "@/i18n/I18nProvider";

// ================= SSR - Fetches poll from Firestore =================
export async function getServerSideProps(context) {
  try {
    const pollsRef = collection(db, "polls");
    let currentPoll = null;

    // ===== SHAKA POLL IKIRI ACTIVE =====
    const activeQuery = query(pollsRef, where("status", "==", "active"));
    const activeSnapshot = await getDocs(activeQuery);

    if (!activeSnapshot.empty) {
      const activePolls = activeSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAtDate: data.createdAt?.toDate?.() || new Date(0),
        };
      });

      activePolls.sort((a, b) => b.createdAtDate - a.createdAtDate);
      const latestPollData = activePolls[0];

      const candidates = latestPollData.candidates || [];

      const createdAt = latestPollData.createdAt?.toDate?.()?.toISOString() || null;
      const updatedAt = latestPollData.updatedAt?.toDate?.()?.toISOString() || null;

      currentPoll = {
        id: latestPollData.id,
        title: latestPollData.title || "Poll",
        description: latestPollData.description || "",
        month: latestPollData.month || "",
        startDate: latestPollData.startDate || null,
        endDate: latestPollData.endDate || null,
        candidates: candidates,
        totalVotes: latestPollData.totalVotes || 0,
        status: latestPollData.status || "active",
        winner: latestPollData.winner || null,
        createdBy: latestPollData.createdBy || "",
        createdAt: createdAt,
        updatedAt: updatedAt,
      };

      // ===== KUGIRA NGO POLL IRANGIRE NIYO YARENZE ITARIKI =====
      if (currentPoll.endDate) {
        const endDate = new Date(currentPoll.endDate);
        const now = new Date();
        if (endDate < now && currentPoll.status === "active") {
          const pollRef = doc(db, "polls", currentPoll.id);

          // Hitamo uwatsinze
          const sortedCandidates = [...candidates].sort((a, b) => {
            const votesA = a.votes || 0;
            const votesB = b.votes || 0;

            if (votesB !== votesA) {
              return votesB - votesA;
            }

            return (a.name || "").localeCompare(b.name || "", undefined, {
              sensitivity: "base",
            });
          });

          const winner = sortedCandidates[0] || null;

          await updateDoc(pollRef, {
            status: "ended",
            winner: winner ? winner.id : null,
            updatedAt: serverTimestamp(),
          });

          currentPoll.status = "ended";
          currentPoll.winner = winner ? winner.id : null;
        }
      }
    }

    // ===== SHAKA POLL ZARANGIYE =====
    let pastWinners = [];
    try {
      const endedQuery = query(pollsRef, where("status", "==", "ended"));
      const endedSnapshot = await getDocs(endedQuery);

      const endedPolls = endedSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAtDate: data.createdAt?.toDate?.() || new Date(0),
        };
      });

      // ===== GERERANYA N'IBYAVUYE =====
      endedPolls.sort((a, b) => b.createdAtDate - a.createdAtDate);
      const sortedEnded = endedPolls.slice(0, 10);

      pastWinners = sortedEnded.map((poll) => {
        const createdAt = poll.createdAt?.toDate?.()?.toISOString() || null;
        const candidates = poll.candidates || [];
        
        // ===== ✅ SHAKA UWATSINZE UKORESHEJE AMAVOTI =====
        // Gereranya abanditsi bakurikije amavoti (menshi abe imbere)
        const sortedCandidates = [...candidates].sort((a, b) => {
          const votesA = a.votes || 0;
          const votesB = b.votes || 0;
          
          if (votesB !== votesA) {
            return votesB - votesA;
          }
          
          return (a.name || "").localeCompare(b.name || "", undefined, {
            sensitivity: "base",
          });
        });
        
        // Ufite amavoti menshi ni we watsinze
        const winnerCandidate = sortedCandidates[0] || null;
        
        return {
          id: poll.id,
          title: poll.title || "Poll",
          description: poll.description || "",
          month: poll.month || "",
          candidates: candidates,
          totalVotes: poll.totalVotes || 0,
          winner: poll.winner || null,
          // ✅ Ibi ni byo bizagaragaza uwatsinze
          winnerName: winnerCandidate?.name || null,
          winnerVotes: winnerCandidate?.votes || 0,
          winnerPhoto: winnerCandidate?.photo || null,
          winnerId: winnerCandidate?.id || null,
          createdAt: createdAt,
        };
      });
    } catch (error) {
      console.error("Error fetching past winners:", error);
    }

    return {
      props: {
        initialPoll: currentPoll,
        initialWinners: pastWinners,
        error: null,
      },
    };
  } catch (error) {
    console.error("Error in getServerSideProps:", error);
    return {
      props: {
        initialPoll: null,
        initialWinners: [],
        error: "Habaye ikibazo mu kubona amakuru ya matora. Ongera ugerageze.",
      },
    };
  }
}

// ================= MAIN PAGE COMPONENT =================
export default function PollsPage({ initialPoll, initialWinners, error }) {
  const { t } = useI18n();

  const router = useRouter();
  const [currentPoll, setCurrentPoll] = useState(initialPoll);
  const [pastWinners, setPastWinners] = useState(initialWinners || []);
  const [loading, setLoading] = useState(false);
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [activeTab, setActiveTab] = useState("current");
  const [message, setMessage] = useState(null);
  const [userVoteData, setUserVoteData] = useState(null);

  // ===== USER IDENTIFICATION =====
  const getUserId = () => {
    let userId = Cookies.get("userId");
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      Cookies.set("userId", userId, { expires: 365 });
    }
    return userId;
  };

  const userId = getUserId();

  // ===== CHECK IF USER ALREADY VOTED =====
  useEffect(() => {
    const checkVoteStatus = async () => {
      if (!currentPoll) return;

      try {
        const votesRef = collection(db, "votes");
        const q = query(
          votesRef,
          where("pollId", "==", currentPoll.id),
          where("userId", "==", userId)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const voteData = querySnapshot.docs[0].data();
          setHasVoted(true);
          setUserVoteData(voteData);

          const votedCandidate = currentPoll.candidates?.find(
            (candidate) => candidate.id === voteData.candidateId
          );
          if (votedCandidate) {
            setSelectedCandidate(votedCandidate);
          }
        } else {
          setHasVoted(false);
          setUserVoteData(null);
        }
      } catch (error) {
        console.error("Error checking vote status:", error);
      }
    };

    checkVoteStatus();
  }, [currentPoll, userId]);

  // ===== REFRESH POLL DATA =====
  const refreshPoll = async () => {
    setLoading(true);
    try {
      const pollRef = doc(db, "polls", currentPoll.id);
      const pollSnapshot = await getDoc(pollRef);
      
      if (pollSnapshot.exists()) {
        const pollData = pollSnapshot.data();
        const candidates = pollData.candidates || [];

        setCurrentPoll({
          id: pollSnapshot.id,
          title: pollData.title || "Poll",
          description: pollData.description || "",
          month: pollData.month || "",
          startDate: pollData.startDate || null,
          endDate: pollData.endDate || null,
          candidates: candidates,
          totalVotes: pollData.totalVotes || 0,
          status: pollData.status || "active",
          winner: pollData.winner || null,
          createdBy: pollData.createdBy || "",
          createdAt: pollData.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: pollData.updatedAt?.toDate?.()?.toISOString() || null,
        });
      }
    } catch (error) {
      console.error("Error refreshing poll:", error);
    } finally {
      setLoading(false);
    }
  };

  // ===== HANDLE VOTE - Uses addDoc + updateDoc =====
  const handleVote = async () => {
    // Validate vote conditions
    if (!selectedCandidate || hasVoted || !currentPoll) {
      setMessage({
        type: "error",
        text: "Nta mwanditsi watoye cyangwa wamaze gutora.",
      });
      return;
    }

    if (currentPoll.status === "ended") {
      setMessage({
        type: "error",
        text: "Iya matora yararangiye! Ntushobora gutora.",
      });
      return;
    }

    setVoting(true);
    setMessage(null);

    try {
      const pollId = currentPoll.id;
      const candidateId = selectedCandidate.id;

      // 1. Check if user already voted
      const votesRef = collection(db, "votes");
      const q = query(
        votesRef,
        where("pollId", "==", pollId),
        where("userId", "==", userId)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setMessage({
          type: "error",
          text: "Wamaze gutora! Ntushobora kongera gutora.",
        });
        setHasVoted(true);
        setVoting(false);
        return;
      }

      // 2. Create vote document using addDoc
      const voteData = {
        pollId: pollId,
        userId: userId,
        candidateId: candidateId,
        candidateName: selectedCandidate.name,
        votedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "votes"), voteData);

      // 3. Update poll document
      const pollRef = doc(db, "polls", pollId);
      const pollSnapshot = await getDoc(pollRef);
      
      if (!pollSnapshot.exists()) {
        throw new Error("Poll ntiboneka!");
      }

      const pollData = pollSnapshot.data();
      const candidates = pollData.candidates || [];
      
      const candidateIndex = candidates.findIndex(c => c.id === candidateId);
      if (candidateIndex === -1) {
        throw new Error("Uyu mwanditsi ntaboneka!");
      }

      const updatedCandidates = [...candidates];
      updatedCandidates[candidateIndex] = {
        ...updatedCandidates[candidateIndex],
        votes: (updatedCandidates[candidateIndex].votes || 0) + 1
      };

      await updateDoc(pollRef, {
        candidates: updatedCandidates,
        totalVotes: increment(1),
        updatedAt: serverTimestamp(),
      });

      // 4. Update local state
      setCurrentPoll((prev) => {
        const updatedCandidates = prev.candidates.map((candidate) => {
          if (candidate.id === candidateId) {
            return { ...candidate, votes: (candidate.votes || 0) + 1 };
          }
          return candidate;
        });

        return {
          ...prev,
          candidates: updatedCandidates,
          totalVotes: (prev.totalVotes || 0) + 1,
        };
      });

      setHasVoted(true);
      setUserVoteData({
        candidateId: candidateId,
        candidateName: selectedCandidate.name,
      });

      setMessage({
        type: "success",
        text: `✅ Ijwi ryawe ryatanzwe neza! Watoye ${selectedCandidate.name}`,
      });

      await refreshPoll();

    } catch (error) {
      console.error("Voting error:", error);
      
      let errorMessage = "Habaye ikibazo mu gutora. Ongera ugerageze.";
      
      if (error.message === "Poll ntiboneka!" || error.message === "Iyi poll yarangije!") {
        errorMessage = error.message;
      } else if (error.message === "Uyu mwanditsi ntaboneka!") {
        errorMessage = "Uyu mwanditsi ntaboneka. Ongera ugerageze.";
      }

      setMessage({
        type: "error",
        text: errorMessage,
      });
    } finally {
      setVoting(false);
    }
  };

  // ================= UI COMPONENTS =================
  const PollCard = ({ poll }) => {
    const isEnded = poll?.status === "ended";
    
    // ✅ Hitamo uwatsinze ukoresheje amavoti (nta gukoresha poll.winner)
    const sortedCandidates = [...(poll?.candidates || [])].sort((a, b) => {
      const votesA = a.votes || 0;
      const votesB = b.votes || 0;
      
      if (votesB !== votesA) {
        return votesB - votesA;
      }
      
      return (a.name || "").localeCompare(b.name || "", undefined, {
        sensitivity: "base",
      });
    });
    
    const pollWinner = sortedCandidates[0] || null;
    
    const totalVotes = poll?.totalVotes || 0;

    if (!poll) return null;

    return (
      <div className={styles.pollCard}>
        <div className={styles.pollHeader}>
          <div className={styles.pollBadge}>
            {isEnded ? (
              <span className={styles.badgeEnded}>
                <FaCheckCircle />{" "}{t("Yararangiye")}</span>
            ) : (
              <span className={styles.badgeActive}>
                <FaFire />{" "}{t("Active")}</span>
            )}
          </div>
          <span className={styles.pollDate}>
            <FaCalendar /> {poll.month || t("Ukwezi")}
          </span>
        </div>

        <h2 className={styles.pollTitle}>{poll.title}</h2>
        <p className={styles.pollDesc}>{poll.description}</p>

        {totalVotes > 0 && (
          <div className={styles.totalVotes}>
            <FaVoteYea />{" "}{t("{totalVotes} votes zose", { totalVotes })}</div>
        )}

        <div className={styles.candidatesGrid}>
          {poll.candidates?.map((candidate) => {
            // ✅ Uwatsinze ni ufite amavoti menshi
            const isWinner = isEnded && pollWinner && candidate.id === pollWinner.id;
            const isSelected = selectedCandidate?.id === candidate.id;
            const votePercent =
              totalVotes > 0
                ? Math.round(((candidate.votes || 0) / totalVotes) * 100)
                : 0;
            const userVotedForThis = hasVoted && isSelected;

            return (
              <div
                key={candidate.id}
                className={`${styles.candidateCard} ${
                  isSelected ? styles.candidateSelected : ""
                } ${isWinner ? styles.candidateWinner : ""} ${
                  hasVoted || isEnded ? styles.candidateResult : ""
                } ${userVotedForThis ? styles.candidateVoted : ""}`}
                onClick={() => {
                  if (!hasVoted && !isEnded && !isWinner) {
                    setSelectedCandidate(
                      selectedCandidate?.id === candidate.id ? null : candidate
                    );
                  }
                }}
              >
                <div className={styles.candidateAvatar}>
                  {candidate.photo ? (
                    <img
                      src={candidate.photo}
                      alt={candidate.name}
                      className={styles.candidateImage}
                    />
                  ) : (
                    <div className={styles.candidateIcon}>
                      <FaUser />
                    </div>
                  )}
                  {isWinner && (
                    <div className={styles.winnerCrown}>
                      <FaCrown />
                    </div>
                  )}
                  {userVotedForThis && !isEnded && (
                    <div className={styles.votedBadge}>
                      <FaCheckCircle />
                    </div>
                  )}
                </div>

                <div className={styles.candidateInfo}>
                  <h4 className={styles.candidateName}>
                    {candidate.name}
                    {isWinner && <span className={styles.winnerBadge}>🏆</span>}
                    {userVotedForThis && !isEnded && (
                      <span className={styles.yourVoteBadge}>{" "}{t("(Watoye)")}</span>
                    )}
                  </h4>
                  <span className={styles.candidateVotes}>
                    <FaVoteYea /> {candidate.votes || 0}{" "}{t("votes")}</span>
                </div>

                {(hasVoted || isEnded) && (
                  <div className={styles.voteProgress}>
                    <div
                      className={styles.voteBar}
                      style={{ width: `${votePercent}%` }}
                    />
                    <span className={styles.votePercent}>{votePercent}%</span>
                  </div>
                )}

                {isSelected && !hasVoted && !isEnded && (
                  <div className={styles.selectedCheck}>
                    <FaCheckCircle />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!hasVoted && !isEnded && (
          <button
            className={`${styles.voteBtn} ${
              !selectedCandidate ? styles.voteBtnDisabled : ""
            }`}
            onClick={handleVote}
            disabled={!selectedCandidate || voting}
          >
            {voting ? (
              <>
                <FaSpinner className={styles.spinner} />{" "}{t("voting...")}</>
            ) : (
              <>
                <FaCheckCircle />{t("Tora")}{" "}{selectedCandidate?.name || ""}
              </>
            )}
          </button>
        )}

        {hasVoted && !isEnded && (
          <div className={styles.votedMessage}>
            <FaCheckCircle className={styles.votedIcon} />
            <span>{t("Wamaze gutora! Murakoze 🙏")}{userVoteData?.candidateName && (
                <span className={styles.votedCandidate}>
                  {" "}{t("Watoye")}{" "}<strong>{userVoteData.candidateName}</strong>
                </span>
              )}
            </span>
          </div>
        )}

        {isEnded && pollWinner && (
          <div className={styles.winnerAnnounce}>
            <div className={styles.winnerDisplay}>
              <div className={styles.winnerIcon}>🏆</div>
              <div>
                <p className={styles.winnerLabel}>{t("Umutsinzi w'ukwezi")}</p>
                <h3 className={styles.winnerName}>{pollWinner.name}</h3>
                <p className={styles.winnerVotes}>
                  <FaVoteYea /> {pollWinner.votes || 0}{" "}{t("votes (")}{totalVotes > 0
                    ? Math.round(((pollWinner.votes || 0) / totalVotes) * 100)
                    : 0}
                  %)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ================= RENDER =================
  return (
    <>
      <Head>
        <title>{t("Amarushanwa y'abanditsi - New Talents")}</title>
        <meta
          name="description"
          content="Tora umwanditsi w'ukwezi kuri New Talents. Itora rya buri kwezi rishyira abanditsi bakomeye kumyanya."
        />
        <link rel="icon" href="/logo.png" />
        <meta property="og:title" content="Amatora y'abanditsi - New Talents" />
        <meta
          property="og:description"
          content="Tora umwanditsi w'ukwezi kuri New Talents."
        />
        <meta property="og:image" content="/logo.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Polly y'abanditsi - New Talents" />
        <meta
          name="twitter:description"
          content="Tora umwanditsi w'ukwezi kuri New Talents."
        />
        <meta name="twitter:image" content="/logo.png" />
      </Head>

      <div className={styles.page}>
        <div className={styles.container}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => router.push("/")}
          >
            <FaArrowLeft />{" "}{t("back")}</button>

          <div className={styles.header}>
            <div className={styles.titleWrapper}>
              <FaTrophy className={styles.titleIcon} />
              <h1 className={styles.mainTitle}>{t("Amatora y'abanditsi. tora umwanditsi ukunda wagushimishije muri uku kwezi.")}</h1>
            </div>
            <div className={styles.headerBadge}>
              <FaFire className={styles.badgeIcon} />
              <span>
                {currentPoll && currentPoll.status !== "ended"
                  ? t("Active")
                  : currentPoll?.status === "ended"
                  ? t("Yararangiye")
                  : t("Nta amatora ahari")}
              </span>
            </div>
          </div>

          {error && (
            <div className={styles.errorBox}>
              <p>{error}</p>
            </div>
          )}

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
                ×
              </button>
            </div>
          )}

          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${
                activeTab === "current" ? styles.tabActive : ""
              }`}
              onClick={() => setActiveTab("current")}
            >{t("Amatora ahari")}</button>
            <button
              type="button"
              className={`${styles.tab} ${
                activeTab === "winners" ? styles.tabActive : ""
              }`}
              onClick={() => setActiveTab("winners")}
            >{t("Abatsinze (")}{pastWinners?.length || 0})
            </button>
            {currentPoll && (
              <button
                type="button"
                className={styles.refreshBtn}
                onClick={refreshPoll}
                disabled={loading}
                title={t("Vugurura amakuru")}
              >
                {loading ? <FaSpinner className={styles.spinner} /> : "🔄"}
              </button>
            )}
          </div>

          <div className={styles.content}>
            {activeTab === "current" && (
              <>
                {currentPoll ? (
                  <PollCard poll={currentPoll} />
                ) : (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📢</div>
                    <h3>{t("Ntamatora ahari")}</h3>
                    <p>{t("Vuba aha tuzatangiza amatora mashya y'abanditsi. Komeza uge usura iyi page nawe utore.")}</p>
                    <Link href="/" className={styles.homeLink}>
                      <button type="button" className={styles.homeBtn}>{t("Subira ahabanza")}</button>
                    </Link>
                  </div>
                )}
              </>
            )}

            {activeTab === "winners" && (
              <div className={styles.winnersGrid}>
                {pastWinners?.length > 0 ? (
                  pastWinners.map((poll) => {
                    return (
                      <div key={poll.id} className={styles.winnerCard}>
                        <div className={styles.winnerRank}>
                          <FaMedal />
                          <span>{poll.month || t("Ukwezi")}</span>
                        </div>
                        <div className={styles.winnerAvatar}>
                          {poll.winnerPhoto ? (
  <img
    src={poll.winnerPhoto}
    alt={poll.winnerName || t("Umwanditsi w'ukwezi")}
    className={styles.winnerImage}
  />
) : (
  <div className={styles.winnerIcon}>
    {(poll.winnerName || "?").trim().charAt(0).toUpperCase()}
  </div>
)}
                          <div className={styles.winnerCrown}>👑</div>
                        </div>
                        <h4 className={styles.winnerName}>
                          {poll.winnerName || "N/A"}
                        </h4>
                        <p className={styles.winnerVotes}>
                          <FaStar /> {poll.winnerVotes || 0}{" "}{t("votes")}</p>
                        <div className={styles.winnerBadge}>
                          <FaCheckCircle />{" "}{t("Uwatsinze")}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🏆</div>
                    <h3>{t("Nta watsinze")}</h3>
                    <p>{t("Ntamatora arakorwa. Vuba aha tuzamenya uwatsinze!")}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
