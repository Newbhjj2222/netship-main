import React, { useEffect, useState } from "react";
import styles from "../../styles/inf.module.css";
import LinkComponent from "../../components/Link";

import {
  FaUser,
  FaUsers,
  FaEye,
  FaShare,
  FaCheckCircle,
  FaRocket,
  FaShieldAlt,
  FaCalendarAlt,
  FaBookOpen,
  FaStar,
} from "react-icons/fa";

import { db } from "../../components/firebase";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  runTransaction,
} from "firebase/firestore";

import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { useI18n } from "@/i18n/I18nProvider";


/* =========================================================
   USERNAME SANITIZER
========================================================= */

const sanitizeUsername = (value = "") => {
  try {
    let name = decodeURIComponent(String(value));

    name = name
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return name;
  } catch {
    return String(value)
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
};


/* =========================================================
   GET USER FROM SERVER COOKIE
========================================================= */

function getUserFromCookie(cookieString = "") {
  const cookies = cookieString.split(";");

  const userCookie = cookies.find((cookie) =>
    cookie.trim().startsWith("user=")
  );

  if (!userCookie) {
    return null;
  }

  try {
    const cookieValue = userCookie.substring(
      userCookie.indexOf("=") + 1
    );

    const decoded = decodeURIComponent(cookieValue);

    return JSON.parse(decoded);
  } catch (error) {
    console.error("Unable to read user cookie:", error);
    return null;
  }
}


/* =========================================================
   PARSE FIRESTORE DATE
========================================================= */

const parseFirestoreDate = (value) => {
  if (!value) {
    return null;
  }

  try {
    /* -----------------------------------------
       Firestore Timestamp
    ----------------------------------------- */

    if (typeof value.toDate === "function") {
      const date = value.toDate();

      if (!isNaN(date.getTime())) {
        return date;
      }
    }


    /* -----------------------------------------
       Firestore Timestamp-like object
    ----------------------------------------- */

    if (
      typeof value === "object" &&
      typeof value.seconds === "number"
    ) {
      const milliseconds =
        value.seconds * 1000 +
        Math.floor((value.nanoseconds || 0) / 1000000);

      const date = new Date(milliseconds);

      if (!isNaN(date.getTime())) {
        return date;
      }
    }


    /* -----------------------------------------
       JavaScript Date
    ----------------------------------------- */

    if (value instanceof Date) {
      if (!isNaN(value.getTime())) {
        return value;
      }
    }


    /* -----------------------------------------
       Number timestamp
    ----------------------------------------- */

    if (typeof value === "number") {
      const date = new Date(
        value < 10000000000
          ? value * 1000
          : value
      );

      if (!isNaN(date.getTime())) {
        return date;
      }
    }


    /* -----------------------------------------
       String date
    ----------------------------------------- */

    if (typeof value === "string") {
      const date = new Date(value);

      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  } catch (error) {
    console.error("Error parsing date:", error);
    return null;
  }
};


/* =========================================================
   GET NUMBER SAFELY
========================================================= */

const toNumber = (value) => {
  const number = Number(value);

  if (Number.isFinite(number)) {
    return number;
  }

  return 0;
};


/* =========================================================
   COMPONENT
========================================================= */

export default function NetInf({
  username,
  stats,
  score,
  isMonitized,
  hasReports,
  lastStoryDate,
  totalStories,
  canApplyMonitization,
  applyMessage,
  isPending,
}) {
  const { t } = useI18n();

  const router = useRouter();

  const [level, setLevel] = useState("low");
  const [progress, setProgress] = useState(0);
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);


  /* =======================================================
     SAFE STATS
  ======================================================= */

  const views = toNumber(stats?.views);
  const referrals = toNumber(stats?.referrals);
  const shares = toNumber(stats?.shares);
  const stories = toNumber(totalStories);

  const numericScore = Math.min(
    100,
    Math.max(0, toNumber(score))
  );


  /* =======================================================
     LEVEL
  ======================================================= */

  useEffect(() => {
    let newLevel = "low";

    if (numericScore >= 87) {
      newLevel = "high";
    } else if (numericScore >= 34) {
      newLevel = "middle";
    }

    setLevel(newLevel);

    setProgress(0);

    const interval = setInterval(() => {
      setProgress((previous) => {
        if (previous >= numericScore) {
          clearInterval(interval);
          return numericScore;
        }

        return previous + 1;
      });
    }, 20);

    return () => {
      clearInterval(interval);
    };
  }, [numericScore]);


  /* =======================================================
     REQUIREMENTS
  ======================================================= */

  const checklist = [
    {
      text: "Inkuru zawe zifite abasomyi barenga 10000",
      done: views >= 10000,
      icon: <FaEye />,
    },

    {
      text: "Nta nkuru n'imwe yabaye reported",
      done: !hasReports,
      icon: <FaShieldAlt />,
    },

    {
      text: "Usohora byibura inkuru nshya buri minsi 30",
      done: lastStoryDate !== null,
      icon: <FaCalendarAlt />,
    },

    {
      text: "Ufite shares nibura 500",
      done: shares >= 500,
      icon: <FaShare />,
    },
  ];


  /* =======================================================
     BADGE STYLE
  ======================================================= */

  const getBadgeStyle = () => {
    if (level === "low") {
      return {
        backgroundColor: "#f87171",
        color: "#fff",
      };
    }

    if (level === "middle") {
      return {
        backgroundColor: "#facc15",
        color: "#000",
      };
    }

    if (level === "high") {
      return {
        backgroundColor: "#34d399",
        color: "#000",
      };
    }

    return {};
  };


  /* =======================================================
     LEVEL EMOJI
  ======================================================= */

  const getLevelEmoji = () => {
    if (level === "low") {
      return "📉";
    }

    if (level === "middle") {
      return "📈";
    }

    if (level === "high") {
      return "🚀";
    }

    return "⭐";
  };


  /* =======================================================
     APPLY FOR MONETIZATION
  ======================================================= */

  const handleApplyMonitization = async () => {
    if (isPending) {
      alert(
        t("Ubusabe bwawe bwa monetization buracyategereje kwemezwa.")
      );
      return;
    }

    if (isMonitized) {
      alert(
        t("Account yawe isanzwe iri monetized.")
      );
      return;
    }

    if (!canApplyMonitization) {
      alert(
        applyMessage ||
        t("Ntabwo wujuje ibisabwa byose bya monetization.")
      );
      return;
    }

    const confirmed = window.confirm(
      t("Urahara ushaka gusaba monetization? Ibi bizoherezwa ku buyobozi kugira ngo busuzume account yawe.")
    );

    if (!confirmed) {
      return;
    }

    try {
      setApplying(true);

      await runTransaction(db, async (transaction) => {
        const authorRef = doc(
          db,
          "authors",
          username
        );

        const authorSnap =
          await transaction.get(authorRef);

        if (!authorSnap.exists()) {
          throw new Error(
            "Account y'umwanditsi ntiboneka."
          );
        }

        const authorData = authorSnap.data();

        const currentStatus =
          String(authorData.status || "")
            .toLowerCase()
            .trim();

        if (currentStatus === "monitized") {
          throw new Error(
            "Account yawe isanzwe iri monetized."
          );
        }

        if (currentStatus === "pending") {
          throw new Error(
            "Ubusabe bwawe bumaze koherezwa kandi buracyategereje kwemezwa."
          );
        }

        transaction.update(authorRef, {
          status: "pending",

          monitizationAppliedAt:
            new Date().toISOString(),

          monitizationScore:
            numericScore,

          monitizationStats: {
            views,
            shares,
            referrals,
            totalStories: stories,
          },
        });
      });

      setApplySuccess(true);

      alert(
        t("✅ Ubusabe bwa monetization bwoherejwe neza. Tegereza ko ubuyobozi bubusuzuma.")
      );

      setTimeout(() => {
        router.reload();
      }, 1500);

    } catch (error) {
      console.error(
        "Error applying monetization:",
        error
      );

      alert(
        `❌ Habaye ikibazo: ${
          error?.message ||
          "Ntibyashobotse kohereza ubusabe."
        }`
      );
    } finally {
      setApplying(false);
    }
  };


  /* =======================================================
     STATUS LABEL
  ======================================================= */

  const getStatusLabel = () => {
    if (isMonitized) {
      return (
        <span className={styles.statusMonitized}>{t("✅ Monitized")}</span>
      );
    }

    if (isPending || applySuccess) {
      return (
        <span className={styles.statusPending}>{t("⏳ Pending Approval")}</span>
      );
    }

    if (canApplyMonitization) {
      return (
        <span className={styles.statusEligible}>{t("🎯 Eligible")}</span>
      );
    }

    return (
      <span className={styles.statusNotEligible}>{t("🔒 Not Eligible")}</span>
    );
  };


  /* =======================================================
     CHECK LOGIN CLIENT SIDE
  ======================================================= */

  useEffect(() => {
    const userCookie = Cookies.get("user");

    if (!userCookie) {
      router.replace("/login");
    }
  }, [router]);


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <LinkComponent />

      <div className={styles.container}>

        {/* =================================================
            HEADER
        ================================================= */}

        <div className={styles.header}>

          <div className={styles.headerLeft}>

            <FaUser
              className={styles.headerIcon}
            />

            <h1 className={styles.title}>{t("Net Influencer Level")}</h1>

          </div>

          <div className={styles.statusBadge}>
            {getStatusLabel()}
          </div>

        </div>


        {/* =================================================
            USER CARD
        ================================================= */}

        <div className={styles.card}>

          {/* USER INFO */}

          <div className={styles.userInfo}>

            <div className={styles.avatar}>
              {username
                ? username.charAt(0).toUpperCase()
                : t("U")}
            </div>

            <div className={styles.userDetails}>

              <h2 className={styles.username}>
                {username}
              </h2>

              <p className={styles.userStats}>{t("📚 {stories} stories", { stories })}{" • "}{t("⭐ Score: {numericScore}%", { numericScore })}</p>

            </div>

          </div>


          {/* =================================================
              LEVEL
          ================================================= */}

          <div className={styles.levelSection}>

            <div className={styles.levelBadge}>

              <span className={styles.levelEmoji}>
                {getLevelEmoji()}
              </span>

              <span
                className={styles.badge}
                style={getBadgeStyle()}
              >
                {level.toUpperCase()}
              </span>

            </div>


            <div className={styles.progressBar}>

              <div
                className={styles.progress}
                style={{
                  width: `${progress}%`,
                  background:
                    "linear-gradient(90deg, #f87171, #facc15, #34d399)",
                }}
              >

                <span className={styles.progressText}>
                  {progress}%
                </span>

              </div>

            </div>

          </div>


          {/* =================================================
              STATS
          ================================================= */}

          <div className={styles.stats}>

            {/* VIEWS */}

            <div className={styles.statItem}>

              <FaEye
                className={styles.statIcon}
              />

              <div>

                <span className={styles.statLabel}>{t("Views")}</span>

                <strong className={styles.statValue}>
                  {views.toLocaleString()}
                </strong>

              </div>

            </div>


            {/* REFERRALS */}

            <div className={styles.statItem}>

              <FaUsers
                className={styles.statIcon}
              />

              <div>

                <span className={styles.statLabel}>{t("Referrals")}</span>

                <strong className={styles.statValue}>
                  {referrals.toLocaleString()}
                </strong>

              </div>

            </div>


            {/* SHARES */}

            <div className={styles.statItem}>

              <FaShare
                className={styles.statIcon}
              />

              <div>

                <span className={styles.statLabel}>{t("Shares")}</span>

                <strong className={styles.statValue}>
                  {shares.toLocaleString()}
                </strong>

              </div>

            </div>


            {/* STORIES */}

            <div className={styles.statItem}>

              <FaBookOpen
                className={styles.statIcon}
              />

              <div>

                <span className={styles.statLabel}>{t("Stories")}</span>

                <strong className={styles.statValue}>
                  {stories.toLocaleString()}
                </strong>

              </div>

            </div>

          </div>


          {/* =================================================
              CHECKLIST
          ================================================= */}

          <div className={styles.checklistSection}>

            <h3 className={styles.checklistTitle}>

              <FaCheckCircle />{t("Requirements for Monetization")}</h3>


            <ul className={styles.checklist}>

              {checklist.map((item, index) => (

                <li
                  key={index}
                  className={styles.checkItem}
                >

                  <span
                    className={
                      item.done
                        ? styles.checkDone
                        : styles.checkPending
                    }
                  >
                    {item.done
                      ? "✅"
                      : "❌"}
                  </span>


                  <span className={styles.checkText}>

                    {item.icon}

                    {" "}

                    {item.text}

                  </span>

                </li>

              ))}

            </ul>

          </div>


          {/* =================================================
              APPLY SECTION
          ================================================= */}

          {!isMonitized &&
            !isPending &&
            !applySuccess && (

              <div
                className={styles.applySection}
              >

                <button
                  type="button"
                  onClick={
                    handleApplyMonitization
                  }
                  disabled={
                    applying ||
                    !canApplyMonitization
                  }
                  className={
                    styles.applyBtn
                  }
                >

                  {applying ? (
                    <>{t("⏳ Sending...")}</>
                  ) : (
                    <>
                      <FaRocket />
                      {" "}{t("Apply for Monetization")}</>
                  )}

                </button>


                {!canApplyMonitization &&
                  applyMessage && (

                    <p
                      className={
                        styles.applyMessage
                      }
                    >
                      {applyMessage}
                    </p>

                  )}

              </div>

            )}


          {/* =================================================
              PENDING
          ================================================= */}

          {(isPending || applySuccess) &&
            !isMonitized && (

              <div
                className={
                  styles.successMessage
                }
              >

                <FaCheckCircle />

                {" "}{t("Monetization application submitted successfully.")}<span
                  className={
                    styles.successSub
                  }
                >{t("Waiting for approval...")}</span>

              </div>

            )}


          {/* =================================================
              MONITIZED
          ================================================= */}

          {isMonitized && (

            <div
              className={
                styles.monitizedBadge
              }
            >

              <FaStar
                className={
                  styles.monitizedIcon
                }
              />

              <div>

                <h4>{t("🎉 Congratulations!")}</h4>

                <p>{t("Your account is now monetized. You can now earn from your stories.")}</p>

              </div>

            </div>

          )}

        </div>

      </div>
    </>
  );
}


/* =========================================================
   SERVER SIDE PROPS
========================================================= */

export async function getServerSideProps(
  context
) {
  const { req } = context;


  /* =======================================================
     1. READ USER COOKIE
  ======================================================= */

  const userData = getUserFromCookie(
    req.headers.cookie || ""
  );

  if (!userData) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }


  const username = sanitizeUsername(
    userData.username
  );

  if (!username) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }


  /* =======================================================
     DEFAULT VALUES
  ======================================================= */

  let score = 0;

  let totalViews = 0;

  let referrals = 0;

  let sharesCount = 0;

  let totalStories = 0;

  let hasReports = false;

  let lastStoryDate = null;

  let hasRecentStory = false;

  let isMonitized = false;

  let isPending = false;

  let canApplyMonitization = false;

  let applyMessage = "";


  try {

    /* =====================================================
       2. GET AUTHOR
    ===================================================== */

    const authorRef = doc(
      db,
      "authors",
      username
    );

    const authorSnap =
      await getDoc(authorRef);


    if (authorSnap.exists()) {

      const authorData =
        authorSnap.data();

      const status =
        String(
          authorData.status || ""
        )
          .toLowerCase()
          .trim();


      isMonitized =
        status === "monitized";


      isPending =
        status === "pending";


      if (isPending) {
        applyMessage =
          "Monitization yawe iri gutegereza gukemurwa n'ubuyobozi.";
      }

    }


    /* =====================================================
       3. GET POSTS
    ===================================================== */

    const postsQuery = query(
      collection(db, "posts"),
      where(
        "author",
        "==",
        username
      )
    );

    const postsSnap =
      await getDocs(postsQuery);


    totalStories =
      postsSnap.size;


    /* =====================================================
       DATE 30 DAYS AGO
    ===================================================== */

    const now = new Date();

    const thirtyDaysAgo =
      new Date(now);

    thirtyDaysAgo.setDate(
      thirtyDaysAgo.getDate() - 30
    );


    /* =====================================================
       LOOP THROUGH STORIES
    ===================================================== */

    postsSnap.forEach((postDoc) => {

      const data =
        postDoc.data();


      /* -----------------------------------------------
         VIEWS
      ----------------------------------------------- */

      totalViews += toNumber(
        data.views
      );


      /* -----------------------------------------------
         CREATED DATE
      ----------------------------------------------- */

      const storyDate =
        parseFirestoreDate(
          data.createdAt
        );


      if (!storyDate) {
        return;
      }


      /* -----------------------------------------------
         LAST STORY
      ----------------------------------------------- */

      if (
        !lastStoryDate ||
        storyDate.getTime() >
          lastStoryDate.getTime()
      ) {

        lastStoryDate =
          storyDate;

      }


      /* -----------------------------------------------
         RECENT STORY
      ----------------------------------------------- */

      if (
        storyDate.getTime() >=
        thirtyDaysAgo.getTime()
      ) {

        hasRecentStory = true;

      }

    });


    /* =====================================================
       4. CHECK REPORTS
    ===================================================== */

    const reportsQuery = query(
      collection(db, "reports"),
      where(
        "storyAuthor",
        "==",
        username
      )
    );

    const reportsSnap =
      await getDocs(
        reportsQuery
      );


    hasReports =
      !reportsSnap.empty;


    /* =====================================================
       5. GET REFERRALS
    ===================================================== */

    const userDataDoc =
      await getDoc(
        doc(
          db,
          "userdate",
          "data"
        )
      );


    if (userDataDoc.exists()) {

      const data =
        userDataDoc.data();


      let myKey = null;


      for (
        const key in data
      ) {

        const item =
          data[key];


        if (
          item &&
          sanitizeUsername(
            item.fName
          ) === username
        ) {

          myKey = key;

          break;

        }

      }


      if (myKey) {

        const code =
          data[myKey]?.referralCode;


        if (code) {

          for (
            const key in data
          ) {

            const item =
              data[key];


            if (
              item &&
              item.referredBy ===
                code
            ) {

              referrals++;

            }

          }

        }

      }

    }


    /* =====================================================
       6. GET SHARES
    ===================================================== */

    const sharesSnap =
      await getDocs(
        collection(
          db,
          "shares"
        )
      );


    sharesSnap.forEach(
      (shareDoc) => {

        const documentUsername =
          sanitizeUsername(
            shareDoc.id
          );


        if (
          documentUsername ===
          username
        ) {

          const shareData =
            shareDoc.data();


          Object.values(
            shareData || {}
          ).forEach((value) => {

            /*
             * Count only numeric values.
             * This prevents strings, dates,
             * objects etc. from being
             * accidentally added.
             */

            if (
              typeof value ===
                "number" &&
              Number.isFinite(value)
            ) {

              sharesCount += value;

            }

          });

        }

      }
    );


    /* =====================================================
       7. CALCULATE SCORE
    ===================================================== */

    /*
       Views       = 40 points
       No reports  = 20 points
       Recent story= 20 points
       Shares      = 20 points

       TOTAL       = 100
    */


    if (totalViews >= 10000) {
      score += 40;
    }


    if (!hasReports) {
      score += 20;
    }


    if (hasRecentStory) {
      score += 20;
    }


    if (sharesCount >= 500) {
      score += 20;
    }


    /* =====================================================
       8. CAN APPLY
    ===================================================== */

    canApplyMonitization =
      totalViews >= 10000 &&
      !hasReports &&
      hasRecentStory &&
      sharesCount >= 500 &&
      !isMonitized &&
      !isPending;


    /* =====================================================
       9. APPLICATION MESSAGE
    ===================================================== */

    if (
      !canApplyMonitization &&
      !isPending &&
      !isMonitized
    ) {

      if (
        totalViews < 10000
      ) {

        applyMessage =
          `Ufite views ${totalViews.toLocaleString()}/10,000. Ugomba kugera kuri views 10,000.`;

      } else if (
        hasReports
      ) {

        applyMessage =
          "Ugomba gukemura ibibazo bya report z'inkuru zawe.";

      } else if (
        !hasRecentStory
      ) {

        if (lastStoryDate) {

          const daysSince =
            Math.floor(
              (
                Date.now() -
                lastStoryDate.getTime()
              ) /
              (
                1000 *
                60 *
                60 *
                24
              )
            );

          applyMessage =
            `Inkuru yawe ya nyuma imaze iminsi ${daysSince}. Ugomba gusohora inkuru nshya mu minsi 30 ishize.`;

        } else {

          applyMessage =
            "Ugomba gusohora nibura inkuru imwe mu minsi 30 ishize.";

        }

      } else if (
        sharesCount < 500
      ) {

        applyMessage =
          `Ufite shares ${sharesCount.toLocaleString()}/500. Ugomba kugera kuri shares 500.`;

      }

    }


    /* =====================================================
       10. RETURN PROPS
    ===================================================== */

    return {

      props: {

        username,

        stats: {

          views:
            totalViews,

          referrals:
            referrals,

          shares:
            sharesCount,

        },

        score,

        isMonitized,

        isPending,

        hasReports,

        lastStoryDate:
          lastStoryDate
            ? lastStoryDate.toISOString()
            : null,

        totalStories,

        canApplyMonitization,

        applyMessage:
          applyMessage || null,

      },

    };

  } catch (error) {

    console.error(
      "Error fetching Net Influencer data:",
      error
    );


    /* =====================================================
       FALLBACK
    ===================================================== */

    return {

      props: {

        username,

        stats: {

          views: 0,

          referrals: 0,

          shares: 0,

        },

        score: 0,

        isMonitized: false,

        isPending: false,

        hasReports: false,

        lastStoryDate: null,

        totalStories: 0,

        canApplyMonitization: false,

        applyMessage:
          "Habaye ikibazo mu kubona amakuru yawe.",

      },

    };

  }

}
