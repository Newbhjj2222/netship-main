import { db } from "../../components/firebase";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  where,
  updateDoc,
  increment,
  addDoc,
  setDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";

import cookie from "cookie";
import Cookies from "js-cookie";

import Head from "next/head";
import Link from "next/link";

import { useEffect, useState } from "react";

import {
  FaWhatsapp,
  FaFacebook,
  FaCopy,
} from "react-icons/fa";

import styles from "../../styles/read.module.css";

import ReportForm from "../../components/ReportForm";
import AdsBanner from "@/components/AdsBanner";

import localforage from "localforage";
import { useRouter } from "next/router";
import { useI18n } from "../../i18n/I18nProvider";


// ============================================================
// CLEAN STORY
// ============================================================

function cleanStory(html = "") {
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


// ============================================================
// STORY TITLE NORMALIZER
// ============================================================

function normalizeStoryTitle(title = "") {
  return String(title)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\/\-_:.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}


// ============================================================
// EXTRACT STORY INFO
// ============================================================

function extractStoryInfo(head = "") {
  let original = String(head || "")
    .replace(/[\/\-_:.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let title = original;

  let season = 1;
  let episode = null;
  let part = null;
  let isFinal = false;


  // ----------------------------------------------------------
  // SEASON
  // S01
  // S1
  // SEASON 01
  // ----------------------------------------------------------

  const seasonMatch = original.match(
    /\b(?:SEASON|S)\s*0*(\d+)\b/i
  );

  if (seasonMatch) {
    season = Number(seasonMatch[1]);
  }


  // ----------------------------------------------------------
  // S01 EP01
  // S01 EP 01
  // SEASON 1 EPISODE 1
  // ----------------------------------------------------------

  const seasonEpisodeMatch = original.match(
    /\b(?:S|SEASON)\s*0*(\d+)\s*(?:EP|EPISODE|E)\s*0*(\d+)\b/i
  );

  if (seasonEpisodeMatch) {
    season = Number(seasonEpisodeMatch[1]);
    episode = Number(seasonEpisodeMatch[2]);
  }


  // ----------------------------------------------------------
  // EP 1
  // EP01
  // EPISODE 1
  // E1
  // ----------------------------------------------------------

  if (episode === null) {
    const episodeMatch = original.match(
      /\b(?:EP|EPISODE|E)\s*0*(\d+)\b/i
    );

    if (episodeMatch) {
      episode = Number(episodeMatch[1]);
    }
  }


  // ----------------------------------------------------------
  // PART 1
  // PART01
  // IGICE 1
  // ----------------------------------------------------------

  const partMatch = original.match(
    /\b(?:PART|IGICE)\s*0*(\d+)\b/i
  );

  if (partMatch) {
    part = Number(partMatch[1]);
  }


  // ----------------------------------------------------------
  // NUMBER ONLY
  //
  // INKURU 1
  // INKURU 2
  // INKURU 03
  //
  // Ariko ntibifatwe niba ari S01
  // ----------------------------------------------------------

  if (
    episode === null &&
    part === null &&
    !seasonMatch
  ) {
    const numberMatch = original.match(
      /\s+0*(\d+)\s*$/
    );

    if (numberMatch) {
      episode = Number(numberMatch[1]);
    }
  }


  // ----------------------------------------------------------
  // FINAL
  // ----------------------------------------------------------

  isFinal =
    /\b(?:FINAL|LAST)\b/i.test(original);


  // ----------------------------------------------------------
  // CLEAN TITLE
  // ----------------------------------------------------------

  title = title
    .replace(
      /\b(?:S|SEASON)\s*0*\d+\s*(?:EP|EPISODE|E)\s*0*\d+\b/gi,
      ""
    )
    .replace(
      /\b(?:S|SEASON)\s*0*\d+\b/gi,
      ""
    )
    .replace(
      /\b(?:EP|EPISODE|E)\s*0*\d+\b/gi,
      ""
    )
    .replace(
      /\b(?:PART|IGICE)\s*0*\d+\b/gi,
      ""
    )
    .replace(
      /\b(?:THE\s+)?(?:FINAL|LAST)\s+(?:EPISODE|EP|PART|IGICE)\b/gi,
      ""
    )
    .replace(
      /\b(?:EPISODE|EP|PART|IGICE)\s+(?:THE\s+)?(?:FINAL|LAST)\b/gi,
      ""
    )
    .replace(
      /\b(?:FINAL|LAST)\b/gi,
      ""
    )
    .replace(/\s+\d+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    title: normalizeStoryTitle(title),
    season,
    episode,
    part,
    isFinal,
  };
}


// ============================================================
// SAFE COOKIE USER
// ============================================================

function getUserFromCookie(req) {
  try {
    const cookies = cookie.parse(
      req.headers.cookie || ""
    );

    if (!cookies.user) {
      return null;
    }

    return JSON.parse(cookies.user);
  } catch (error) {
    console.log("Invalid user cookie:", error);
    return null;
  }
}


// ============================================================
// FIREBASE TIMESTAMP -> ISO
// ============================================================

function timestampToISO(value) {
  try {
    if (!value) return "";

    if (
      typeof value.toDate === "function"
    ) {
      return value.toDate().toISOString();
    }

    if (
      value instanceof Date
    ) {
      return value.toISOString();
    }

    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return "";
    }

    return date.toISOString();
  } catch (error) {
    return "";
  }
}


// ============================================================
// SSR
// ============================================================

export async function getServerSideProps({
  req,
  params,
}) {
  const { id } = params;

  // ----------------------------------------------------------
  // USER COOKIE
  // ----------------------------------------------------------

  const userCookie = getUserFromCookie(req);

  const username =
    userCookie?.username || null;


  // ----------------------------------------------------------
  // FETCH POST
  // ----------------------------------------------------------

  const postSnap = await getDoc(
    doc(db, "posts", id)
  );

  if (!postSnap.exists()) {
    return {
      notFound: true,
    };
  }

  const post = {
    id,
    ...postSnap.data(),
  };


  // ----------------------------------------------------------
  // ACCESS TYPE
  // ----------------------------------------------------------

  const storyStatus =
    post.accessType || "free";


  // ----------------------------------------------------------
  // AUTHOR
  // ----------------------------------------------------------

  const isAuthor =
    !!username &&
    String(post.author || "").toLowerCase() ===
      String(username || "").toLowerCase();


  // ----------------------------------------------------------
  // ADMIN
  // ----------------------------------------------------------

  const isAdmin =
    String(username || "").toLowerCase() ===
    "newtalentsg";


  // ----------------------------------------------------------
  // DEFAULT VALUES
  // ----------------------------------------------------------

  let isMember = false;
  let hasLicense = false;
  let nesBalance = 0;


  // ----------------------------------------------------------
  // USER-BASED ACCESS
  // ----------------------------------------------------------

  if (username) {

    // ========================================================
    // MEMBERSHIP
    // ========================================================

    try {
      const memberSnap = await getDocs(
        query(
          collection(db, "members"),
          where(
            "username",
            "==",
            username
          )
        )
      );

      memberSnap.forEach((d) => {
        const data = d.data();

        const exp =
          data.subscriptionExpiresAt?.toDate?.() ||
          new Date(0);

        if (
          data.isMember &&
          exp > new Date()
        ) {
          isMember = true;
        }
      });
    } catch (error) {
      console.log(
        "Membership check error:",
        error
      );
    }


    // ========================================================
    // LICENSE
    // ========================================================

    try {
      const licenseSnap = await getDocs(
        query(
          collection(db, "contracts"),
          where(
            "username",
            "==",
            username
          )
        )
      );

      hasLicense =
        licenseSnap.docs.some(
          (d) =>
            d.data().approved === true
        );
    } catch (error) {
      console.log(
        "License check error:",
        error
      );
    }


    // ========================================================
    // NES BALANCE
    // ========================================================

    try {
      const nesSnap = await getDoc(
        doc(
          db,
          "depositers",
          username
        )
      );

      if (nesSnap.exists()) {
        const value =
          Number(
            nesSnap.data()?.nes || 0
          );

        nesBalance =
          Number.isFinite(value)
            ? value
            : 0;
      }
    } catch (error) {
      console.log(
        "NES balance error:",
        error
      );
    }
  }


  // ==========================================================
  // ACCESS BOOLEANS
  // ==========================================================

  const isPrivileged =
    isAuthor ||
    isAdmin ||
    isMember ||
    hasLicense;

  const hasNES =
    nesBalance >= 1;

  const isFree =
    storyStatus === "free";

  const canRead =
    isFree ||
    isPrivileged ||
    hasNES;

  const canCopyFull =
    isAuthor ||
    isAdmin ||
    hasLicense;


  // ==========================================================
  // COMMENTS
  // ==========================================================

  let comments = [];

  try {
    const commentsSnap = await getDocs(
      query(
        collection(
          db,
          "posts",
          id,
          "comments"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      )
    );

    comments =
      commentsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
  } catch (error) {
    console.log(
      "Comments error:",
      error
    );
  }


  // ==========================================================
  // SERIES / EPISODE / PART LOGIC
  // ==========================================================

  let allPosts = [];

  try {
    const allPostsSnap =
      await getDocs(
        collection(db, "posts")
      );

    allPosts =
      allPostsSnap.docs.map(
        (d) => ({
          id: d.id,
          ...d.data(),
        })
      );
  } catch (error) {
    console.log(
      "All posts error:",
      error
    );
  }


  const currentInfo =
    extractStoryInfo(
      post.head
    );


  // ==========================================================
  // FIND POSTS BELONGING TO STORY
  // ==========================================================

  const postsWithInfo =
    allPosts
      .map((p) => ({
        ...p,
        storyInfo:
          extractStoryInfo(
            p.head
          ),
      }))
      .filter((p) => {

        // ----------------------------------------------------
        // STORY ID
        // ----------------------------------------------------

        if (
          post.storyId &&
          p.storyId &&
          post.storyId ===
            p.storyId
        ) {
          return true;
        }


        // ----------------------------------------------------
        // SUMMARY ID
        // ----------------------------------------------------

        if (
          post.summaryId &&
          p.summaryId &&
          post.summaryId ===
            p.summaryId
        ) {
          return true;
        }


        // ----------------------------------------------------
        // TITLE FALLBACK
        // ----------------------------------------------------

        return (
          p.storyInfo.title ===
          currentInfo.title
        );
      });


  // ==========================================================
  // REMOVE DUPLICATES
  // ==========================================================

  const uniquePosts =
    Array.from(
      new Map(
        postsWithInfo.map(
          (p) => [
            p.id,
            p,
          ]
        )
      ).values()
    );


  // ==========================================================
  // SORT STORY
  // ==========================================================

  uniquePosts.sort(
    (a, b) => {

      const A =
        a.storyInfo;

      const B =
        b.storyInfo;


      // ------------------------------------------------------
      // SEASON
      // ------------------------------------------------------

      if (
        A.season !==
        B.season
      ) {
        return (
          A.season -
          B.season
        );
      }


      // ------------------------------------------------------
      // EPISODE
      // ------------------------------------------------------

      const episodeA =
        A.episode !== null
          ? A.episode
          : A.part !== null
          ? A.part
          : A.isFinal
          ? Infinity
          : Infinity;

      const episodeB =
        B.episode !== null
          ? B.episode
          : B.part !== null
          ? B.part
          : B.isFinal
          ? Infinity
          : Infinity;

      if (
        episodeA !==
        episodeB
      ) {
        return (
          episodeA -
          episodeB
        );
      }


      // ------------------------------------------------------
      // PART
      // ------------------------------------------------------

      const partA =
        A.part !== null
          ? A.part
          : 0;

      const partB =
        B.part !== null
          ? B.part
          : 0;

      if (
        partA !==
        partB
      ) {
        return (
          partA -
          partB
        );
      }


      // ------------------------------------------------------
      // FINAL
      // ------------------------------------------------------

      if (
        A.isFinal !==
        B.isFinal
      ) {
        return A.isFinal
          ? 1
          : -1;
      }


      // ------------------------------------------------------
      // CREATED AT FALLBACK
      // ------------------------------------------------------

      const dateA =
        a.createdAt?.toDate
          ? a.createdAt
              .toDate()
              .getTime()
          : new Date(
              a.createdAt || 0
            ).getTime();

      const dateB =
        b.createdAt?.toDate
          ? b.createdAt
              .toDate()
              .getTime()
          : new Date(
              b.createdAt || 0
            ).getTime();

      return (
        dateA -
        dateB
      );
    }
  );


  // ==========================================================
  // PREVIOUS / NEXT
  // ==========================================================

  const currentIndex =
    uniquePosts.findIndex(
      (p) =>
        p.id === id
    );

  const prevEpisode =
    currentIndex > 0
      ? uniquePosts[
          currentIndex - 1
        ]
      : null;

  const nextEpisode =
    currentIndex >= 0 &&
    currentIndex <
      uniquePosts.length - 1
      ? uniquePosts[
          currentIndex + 1
        ]
      : null;


  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    props: {
      post,
      username,
      isLoggedIn:
        !!userCookie,

      canRead,
      isPrivileged,

      comments,

      prevEpisode,
      nextEpisode,

      storyStatus,
      canCopyFull,
    },
  };
}


// ============================================================
// COMPONENT
// ============================================================

export default function ReadPage({
  post,
  username,
  isLoggedIn,
  canRead,
  isPrivileged,
  comments: initialComments,
  storyStatus,
  prevEpisode,
  nextEpisode,
  canCopyFull,
}) {

  const { t, l } = useI18n();

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    viewsDone,
    setViewsDone,
  ] = useState(false);

  const [
    nesUsed,
    setNesUsed,
  ] = useState(false);

  const [
    comments,
    setComments,
  ] = useState(
    initialComments || []
  );

  const [
    commentText,
    setCommentText,
  ] = useState("");

  const [
    showReport,
    setShowReport,
  ] = useState(false);

  const [
    countdown,
    setCountdown,
  ] = useState(40);


  const router =
    useRouter();


  // ==========================================================
  // STORY TEXT
  // ==========================================================

  const summary =
    cleanStory(
      post.story
    ).slice(0, 900);

  const fullText =
    cleanStory(
      post.story
    );

  const link =
    `https://www.newtalentsg.co.rw/post/${post.id}`;


  // ==========================================================
  // VIEWS
  // ==========================================================

  useEffect(() => {

    if (viewsDone) {
      return;
    }

    const timer =
      setTimeout(
        async () => {

          try {

            await updateDoc(
              doc(
                db,
                "posts",
                post.id
              ),
              {
                views:
                  increment(1),
              }
            );

            setViewsDone(true);

          } catch (error) {

            console.log(
              "View update error:",
              error
            );
          }

        },
        60000
      );

    return () =>
      clearTimeout(timer);

  }, [
    viewsDone,
    post.id,
  ]);


  // ==========================================================
  // SAVE CONTINUE READING
  // ==========================================================

  useEffect(() => {

    if (
      !username ||
      !canRead
    ) {
      return;
    }

    const saveReading =
      async () => {

        try {

          const storyInfo =
            extractStoryInfo(
              post.head
            );

          const storyHead =
            storyInfo.title;

          const season =
            storyInfo.season;

          const episode =
            storyInfo.episode ||
            storyInfo.part ||
            1;

          const part =
            storyInfo.part ||
            0;


          await setDoc(
            doc(
              db,
              "reading",
              username,
              "history",
              post.id
            ),
            {
              postId:
                post.id,

              storyHead,

              fullHead:
                post.head,

              imageUrl:
                post.imageUrl ||
                "",

              author:
                post.author,

              season,

              episode,

              part,

              isFinal:
                storyInfo.isFinal,

              storyId:
                post.storyId ||
                post.summaryId ||
                null,

              updatedAt:
                serverTimestamp(),
            }
          );

        } catch (error) {

          console.log(
            "Save reading error:",
            error
          );
        }
      };


    saveReading();

  }, [
    username,
    canRead,
    post,
  ]);


  // ==========================================================
  // NES DEDUCTION
  // ==========================================================

  useEffect(() => {

    if (
      storyStatus === "free" ||
      isPrivileged ||
      nesUsed ||
      !username
    ) {
      return;
    }


    // --------------------------------------------------------
    // LOCAL PAGE SESSION PROTECTION
    // --------------------------------------------------------

    const localKey =
      `nes-read-${username}-${post.id}`;

    if (
      typeof window !==
        "undefined" &&
      sessionStorage.getItem(
        localKey
      ) === "used"
    ) {
      setNesUsed(true);
      return;
    }


    const run =
      async () => {

        try {

          const depRef =
            doc(
              db,
              "depositers",
              username
            );

          const authorRef =
            post.author
              ? doc(
                  db,
                  "authors",
                  post.author
                )
              : null;


          // --------------------------------------------------
          // TRANSACTION
          // --------------------------------------------------

          await runTransaction(
            db,
            async (transaction) => {

              const depSnap =
                await transaction.get(
                  depRef
                );


              // ----------------------------------------------
              // NO NES ACCOUNT
              // ----------------------------------------------

              if (
                !depSnap.exists()
              ) {
                throw new Error(
                  "NO_NES_ACCOUNT"
                );
              }


              const currentNes =
                Number(
                  depSnap.data()?.nes ||
                    0
                );


              // ----------------------------------------------
              // NO NES
              // ----------------------------------------------

              if (
                currentNes < 1
              ) {
                throw new Error(
                  "NO_NES"
                );
              }


              // ----------------------------------------------
              // CHECK READING PAYMENT
              // ----------------------------------------------

              const paymentRef =
                doc(
                  db,
                  "nesReads",
                  username,
                  "posts",
                  post.id
                );

              const paymentSnap =
                await transaction.get(
                  paymentRef
                );


              // ----------------------------------------------
              // ALREADY PAID
              // ----------------------------------------------

              if (
                paymentSnap.exists()
              ) {
                return;
              }


              // ----------------------------------------------
              // DEDUCT READER
              // ----------------------------------------------

              transaction.update(
                depRef,
                {
                  nes:
                    increment(-1),
                }
              );


              // ----------------------------------------------
              // AUTHOR REWARD
              // ----------------------------------------------

              if (authorRef) {

                const authorSnap =
                  await transaction.get(
                    authorRef
                  );

                if (
                  authorSnap.exists()
                ) {

                  transaction.update(
                    authorRef,
                    {
                      nes:
                        increment(1),
                    }
                  );

                } else {

                  transaction.set(
                    authorRef,
                    {
                      nes: 1,
                      bonus: 0,
                    },
                    {
                      merge: true,
                    }
                  );

                }
              }


              // ----------------------------------------------
              // PAYMENT RECORD
              // ----------------------------------------------

              transaction.set(
                paymentRef,
                {
                  username,
                  postId:
                    post.id,
                  author:
                    post.author ||
                    null,
                  amount: 1,
                  type:
                    "story_read",
                  createdAt:
                    serverTimestamp(),
                }
              );
            }
          );


          // --------------------------------------------------
          // MARK LOCAL SESSION
          // --------------------------------------------------

          if (
            typeof window !==
            "undefined"
          ) {
            sessionStorage.setItem(
              localKey,
              "used"
            );
          }

          setNesUsed(true);

        } catch (error) {

          console.log(
            "NES deduction error:",
            error
          );


          // --------------------------------------------------
          // NO NES ACCOUNT
          // --------------------------------------------------

          if (
            error?.message ===
            "NO_NES_ACCOUNT"
          ) {

            alert(
              t("Nta konti ya NES yabonetse.")
            );

            router.push(
              "/profile"
            );

            return;
          }


          // --------------------------------------------------
          // NO NES
          // --------------------------------------------------

          if (
            error?.message ===
            "NO_NES"
          ) {

            alert(
              t("Nta NES Point zihagije ufite zikwemerera gusoma iyi nkuru. Gura NES Point cyangwa ugure membership. Kubindi bisobanuro twandikire kuri WhatsApp.")
            );

            router.push(
              "/profile"
            );

            return;
          }


          // --------------------------------------------------
          // OTHER ERROR
          // --------------------------------------------------

          console.log(
            "NES payment failed:",
            error
          );
        }
      };


    run();

  }, [
    storyStatus,
    isPrivileged,
    nesUsed,
    username,
    post.id,
    post.author,
    router,
  ]);


  // ==========================================================
  // REDIRECT IF NOT LOGGED IN
  // ==========================================================

  useEffect(() => {

    if (isLoggedIn) {
      return;
    }

    const interval =
      setInterval(
        () => {

          setCountdown(
            (prev) => {

              if (
                prev <= 1
              ) {

                clearInterval(
                  interval
                );


                // --------------------------------------------
                // SAVE CURRENT PAGE
                // --------------------------------------------

                const returnTo =
                  router.asPath;


                router.push(
                  `/login?returnTo=${encodeURIComponent(
                    returnTo
                  )}`
                );


                return 0;
              }


              return (
                prev - 1
              );
            }
          );

        },
        1000
      );


    return () =>
      clearInterval(
        interval
      );

  }, [
    isLoggedIn,
    router,
  ]);


  // ==========================================================
  // NES MINE REF TRACKING
  // ==========================================================

  
// ==========================================================
// NES MINE REF TRACKING
// ==========================================================

useEffect(() => {
  if (typeof window === "undefined") {
    return;
  }

  const taskId = router.query.nesTask;

  console.log("🔥 NES MINE TRACKING");
  console.log("URL:", window.location.href);
  console.log("TASK ID:", taskId);

  if (!taskId) {
    console.log("❌ nesTask ntabwo iri muri URL");
    return;
  }

  let cancelled = false;

  const trackNESShareClick = async () => {
    try {
      const taskIdString = String(taskId);

      // ---------------------------------------------
      // VISITOR ID
      // ---------------------------------------------

      let visitorId = localStorage.getItem(
        "nesMineVisitorId"
      );

      if (!visitorId) {
        visitorId =
          "visitor_" +
          Date.now().toString(36) +
          "_" +
          Math.random().toString(36).slice(2, 12);

        localStorage.setItem(
          "nesMineVisitorId",
          visitorId
        );

        console.log(
          "🆕 NEW VISITOR:",
          visitorId
        );
      } else {
        console.log(
          "👤 EXISTING VISITOR:",
          visitorId
        );
      }

      // ---------------------------------------------
      // GET TASK
      // ---------------------------------------------

      const taskRef = doc(
        db,
        "nesGameTasks",
        taskIdString
      );

      const taskSnap = await getDoc(taskRef);

      if (!taskSnap.exists()) {
        console.log(
          "❌ TASK NOT FOUND:",
          taskIdString
        );
        return;
      }

      const task = taskSnap.data();

      console.log(
        "✅ TASK FOUND:",
        task
      );

      // ---------------------------------------------
      // CHECK TASK TYPE
      // ---------------------------------------------

      if (task.type !== "share") {
        console.log(
          "❌ WRONG TASK TYPE:",
          task.type
        );
        return;
      }

      // ---------------------------------------------
      // CHECK TASK STATUS
      // ---------------------------------------------

      if (task.status !== "active") {
        console.log(
          "❌ TASK NOT ACTIVE:",
          task.status
        );
        return;
      }

      // ---------------------------------------------
      // CHECK EXPIRATION
      // ---------------------------------------------

      let expiresAt = null;

      if (
        task.expiresAt &&
        typeof task.expiresAt.toMillis === "function"
      ) {
        expiresAt = task.expiresAt.toMillis();
      } else if (
        task.expiresAt &&
        task.expiresAt.seconds
      ) {
        expiresAt =
          task.expiresAt.seconds * 1000;
      } else if (
        typeof task.expiresAt === "number"
      ) {
        expiresAt = task.expiresAt;
      }

      if (
        expiresAt &&
        Date.now() > expiresAt
      ) {
        console.log(
          "❌ TASK EXPIRED"
        );
        return;
      }

      // ---------------------------------------------
      // CURRENT USER FROM COOKIE
      // ---------------------------------------------

      let currentUsername = null;

      try {
        const userCookie =
          Cookies.get("user");

        if (userCookie) {
          const parsedUser =
            JSON.parse(userCookie);

          currentUsername =
            parsedUser?.username || null;
        }
      } catch (error) {
        console.log(
          "⚠️ COOKIE ERROR:",
          error
        );
      }

      console.log(
        "👤 CURRENT USER:",
        currentUsername
      );

      console.log(
        "👑 TASK OWNER:",
        task.username || null
      );

      // ---------------------------------------------
      // OWNER CHECK
      // ---------------------------------------------
      // Owner ntiyibarwa.
      //
      // Niba username iri muri cookie itandukanye
      // na task.username => visitor arabarwa.
      //
      // Niba nta username iri muri cookie => nayo
      // ifatwa nk'visitor kandi irabarwa.
      // ---------------------------------------------

      const isTaskOwner =
        currentUsername &&
        task.username &&
        String(currentUsername).trim().toLowerCase() ===
          String(task.username).trim().toLowerCase();

      if (isTaskOwner) {
        console.log(
          "ℹ️ TASK OWNER. NOT COUNTED."
        );
        return;
      }

      console.log(
        "✅ NOT TASK OWNER. CLICK WILL BE COUNTED."
      );

      // ---------------------------------------------
      // CLICK ID
      // ---------------------------------------------

      const clickId =
        `${taskIdString}_${visitorId}`;

      console.log(
        "🆔 CLICK ID:",
        clickId
      );

      const clickRef = doc(
        db,
        "nesShareClicks",
        clickId
      );

      // ---------------------------------------------
      // CHECK EXISTING CLICK
      // ---------------------------------------------

      const existingClick =
        await getDoc(clickRef);

      if (existingClick.exists()) {
        console.log(
          "ℹ️ VISITOR ALREADY RECORDED"
        );
        return;
      }

      // ---------------------------------------------
      // COMPONENT CANCELLED
      // ---------------------------------------------

      if (cancelled) {
        console.log(
          "❌ TRACKING CANCELLED"
        );
        return;
      }

      // ---------------------------------------------
      // SAVE VISITOR CLICK
      // ---------------------------------------------

      await setDoc(
        clickRef,
        {
          taskId:
            taskIdString,

          visitorId:
            visitorId,

          username:
            currentUsername || null,

          taskOwner:
            task.username || null,

          postId:
            task.postId ||
            router.query.id ||
            null,

          storyId:
            task.storyId ||
            null,

          storyTitle:
            task.storyTitle ||
            null,

          createdAt:
            serverTimestamp(),

          source:
            "nesMineShare",

          userAgent:
            navigator.userAgent ||
            null,
        }
      );

      console.log(
        "✅ VISITOR YABITSWE:",
        clickId
      );

    } catch (error) {
      console.error(
        "❌ NES MINE TRACKING ERROR:",
        error
      );
    }
  };

  trackNESShareClick();

  return () => {
    cancelled = true;
  };

}, [
  router.query.nesTask,
  router.query.id,
]);



  
        const handleCopyFull = async () => {
  if (!canCopyFull) {
    alert(t("Ntaburenganzira ufite bukwemerera gukoresha iyi nkuru ahandi twandikire tugufashe."));
    return;
  }

  const watermarkText =
    "Niba ushaka gusoma iyi nkuru yose ndetse n'izindi nyinshi zitandukanye, kanda aha ujye kuri website yacu aho usanga inkuru zitandukanye:";

  const websiteUrl = "https://www.newtalentsg.co.rw";

  const storyTitle = cleanStory(post.head || "");
  const storyContent = cleanStory(post.story || "");

  // Inyandiko isanzwe ikoreshwa na apps zidakira HTML.
  
const textToCopy = `${storyTitle}

${storyContent}



${watermarkText}

Soma izindi nkuru kuri:
${websiteUrl}`;

  // Gukuramo inyuguti zishobora kwangiza HTML.
  const escapeHTML = (text = "") =>
    String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  // HTML version: link iba iri muri <a href="...">.
  const htmlToCopy = `
    <div>
      <h2>${escapeHTML(storyTitle)}</h2>

      <div style="white-space: pre-wrap;">${escapeHTML(
        storyContent
      )}</div>

      <hr>

      <p>${escapeHTML(watermarkText)}</p>

      <p>
        <a href="${websiteUrl}">
          www.newtalentsg.co.rw
        </a>
      </p>
    </div>
  `;

  try {
    // Uburyo bwiza: gukopa HTML na plain text icyarimwe.
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.write === "function" &&
      typeof window.ClipboardItem !== "undefined" &&
      window.isSecureContext
    ) {
      const clipboardItem = new ClipboardItem({
        "text/plain": new Blob([textToCopy], {
          type: "text/plain",
        }),

        "text/html": new Blob([htmlToCopy], {
          type: "text/html",
        }),
      });

      await navigator.clipboard.write([clipboardItem]);
    } else {
      // Fallback ku bikoresho bidashyigikira HTML clipboard.
      const textarea = document.createElement("textarea");

      textarea.value = textToCopy;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      textarea.setAttribute("readonly", "");

      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();

      const copied = document.execCommand("copy");

      textarea.remove();

      if (!copied) {
        throw new Error("COPY_FAILED");
      }
    }

    alert(
      t("Inkuru yose yakozwe copy neza.")
    );
  } catch (error) {
    console.error("Copy error:", error);

    alert(
      t("Gukopa byanze. Gerageza kongera gukanda kuri buto yo gukopa.")
    );
  }
};
  // ==========================================================
  // SAVE OFFLINE
  // ==========================================================

  const handleSaveOffline =
    async () => {

      if (!canRead) {

        alert(
          t("Ntushobora kubika iyi nkuru.")
        );

        return;
      }


      try {

        await localforage.setItem(
          `story-${post.id}`,
          {
            id:
              post.id,

            head:
              post.head,

            story:
              post.story,

            imageUrl:
              post.imageUrl ||
              "",

            author:
              post.author,

            savedAt:
              Date.now(),
          }
        );


        alert(
          t("Inkuru yabitswe offline.")
        );

      } catch (error) {

        console.log(
          "Offline save error:",
          error
        );

        alert(
          t("Kubika offline byanze.")
        );
      }
    };


  // ==========================================================
  // SHARE SUMMARY
  // ==========================================================

  const handleCopySummary =
    async () => {

      const shareText =
        `${post.head}

${summary}

Soma inkuru yose ukanze hano:
${link}`;


      // ------------------------------------------------------
      // NATIVE SHARE
      // ------------------------------------------------------

      if (
        typeof navigator !==
          "undefined" &&
        navigator.share
      ) {

        try {

          await navigator.share({
            title:
              post.head,

            text:
              `${post.head}\n\n${summary}\n\n${t("post.shareText")}`,

            url:
              link,
          });

        } catch (error) {

          // User may have cancelled share.
          console.log(
            "Share cancelled/error:",
            error
          );
        }

        return;
      }


      // ------------------------------------------------------
      // CLIPBOARD FALLBACK
      // ------------------------------------------------------

      try {

        if (
          navigator.clipboard
        ) {

          await navigator.clipboard.writeText(
            shareText
          );

        } else {

          const textarea =
            document.createElement(
              "textarea"
            );

          textarea.value =
            shareText;

          document.body.appendChild(
            textarea
          );

          textarea.select();

          document.execCommand(
            "copy"
          );

          textarea.remove();
        }


        alert(
          t("Summary copied")
        );

      } catch (error) {

        console.log(
          "Summary copy error:",
          error
        );

        alert(
          t("Copying summary failed.")
        );
      }
    };


  // ==========================================================
  // ADD COMMENT
  // ==========================================================

  const handleAddComment =
    async () => {

      const text =
        commentText.trim();


      if (!text) {
        return;
      }


      if (!username) {

        alert(
          t("Banza winjire muri konti yawe.")
        );

        return;
      }


      const newComment = {
        text,
        author:
          username,

        createdAt:
          new Date(),
      };


      try {

        await addDoc(
          collection(
            db,
            "posts",
            post.id,
            "comments"
          ),
          newComment
        );


        setComments(
          (prev) => [
            newComment,
            ...prev,
          ]
        );


        setCommentText("");

      } catch (error) {

        console.log(
          "Add comment error:",
          error
        );

        alert(
          t("Comment ntiyoherejwe.")
        );
      }
    };


  // ==========================================================
  // SEO DATES
  // ==========================================================

  const publishedDate =
    timestampToISO(
      post.createdAt
    );

  const modifiedDate =
    timestampToISO(
      post.updatedAt ||
        post.createdAt
    );


  // ==========================================================
  // IMAGE URL
  // ==========================================================

  const imageUrl =
    post.imageUrl
      ? post.imageUrl.startsWith(
          "http"
        )
        ? post.imageUrl
        : `https://www.newtalentsg.co.rw${post.imageUrl}`
      : "https://www.newtalentsg.co.rw/logo.png";


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <Head>

        {/* ==================================================
            BASIC SEO
        ================================================== */}

        <title>{t("{head} | New Talents Stories Group", { head: post.head })}</title>

        <meta
          name="description"
          content={cleanStory(post.story).slice(
            0,
            160
          )}
        />

        <meta
          name="keywords"
          content={`${post.head}, inkuru nyarwanda, stories Rwanda, New Talents Stories Group, novels, romance`}
        />

        <meta
          name="author"
          content={
            post.author ||
            "New Talents Stories Group"
          }
        />

        <meta
          name="robots"
          content="index, follow"
        />

        <link
          rel="canonical"
          href={`https://www.newtalentsg.co.rw/post/${post.id}`}
        />


        {/* ==================================================
            OPEN GRAPH
        ================================================== */}

        <meta
          property="og:site_name"
          content="New Talents Stories Group"
        />

        <meta
          property="og:type"
          content="article"
        />

        <meta
          property="og:title"
          content={post.head}
        />

        <meta
          property="og:description"
          content={cleanStory(post.story).slice(
            0,
            200
          )}
        />

        <meta
          property="og:url"
          content={`https://www.newtalentsg.co.rw/post/${post.id}`}
        />

        <meta
          property="og:image"
          content={imageUrl}
        />

        <meta
          property="og:image:secure_url"
          content={imageUrl}
        />

        <meta
          property="og:image:width"
          content="1200"
        />

        <meta
          property="og:image:height"
          content="630"
        />


        {/* ==================================================
            TWITTER
        ================================================== */}

        <meta
          name="twitter:card"
          content="summary_large_image"
        />

        <meta
          name="twitter:title"
          content={post.head}
        />

        <meta
          name="twitter:description"
          content={cleanStory(post.story).slice(
            0,
            200
          )}
        />

        <meta
          name="twitter:image"
          content={imageUrl}
        />


        {/* ==================================================
            ARTICLE STRUCTURED DATA
        ================================================== */}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html:
              JSON.stringify({
                "@context":
                  "https://schema.org",

                "@type":
                  "Article",

                headline:
                  post.head,

                description:
                  cleanStory(
                    post.story
                  ).slice(
                    0,
                    200
                  ),

                articleBody:
                  cleanStory(
                    post.story
                  ),

                author: {
                  "@type":
                    "Person",

                  name:
                    post.author ||
                    "New Talents Stories Group",
                },

                publisher: {
                  "@type":
                    "Organization",

                  name:
                    "New Talents Stories Group",

                  logo: {
                    "@type":
                      "ImageObject",

                    url:
                      "https://www.newtalentsg.co.rw/logo.png",
                  },
                },

                image: [
                  imageUrl,
                ],

                mainEntityOfPage:
                  `https://www.newtalentsg.co.rw/post/${post.id}`,

                ...(publishedDate
                  ? {
                      datePublished:
                        publishedDate,
                    }
                  : {}),

                ...(modifiedDate
                  ? {
                      dateModified:
                        modifiedDate,
                    }
                  : {}),
              }),
          }}
        />

      </Head>


      {/* ====================================================
          PAGE
      ==================================================== */}

      <div
        className={
          styles.container
        }
      >

        {/* ==================================================
            TITLE
        ================================================== */}

        <h1
          className={
            styles.title
          }
        >
          {l(post, "head")}
        </h1>


        {/* ==================================================
            GUEST MESSAGE
        ================================================== */}

        {!isLoggedIn && (
          <div
            style={{
              background:
                "#fff3cd",

              color:
                "#000",

              padding:
                "12px",

              borderRadius:
                "8px",

              marginBottom:
                "20px",

              textAlign:
                "center",

              fontWeight:
                "bold",
            }}
          >
            {t("post.guestBefore")}{" "}
            <b>
              {countdown}
            </b>
            {t("post.guestAfter")}
          </div>
        )}


        {/* ==================================================
            IMAGE
        ================================================== */}

        {post.imageUrl && (
          <img
            className={
              styles.image
            }
            src={
              post.imageUrl
            }
            alt={
              post.head
            }
          />
        )}


        {/* ==================================================
            STORY
        ================================================== */}

        {canRead ||
        !isLoggedIn ? (
          <div
            className={
              styles.story
            }
            dangerouslySetInnerHTML={{
              __html:
                l(post, "story"),
            }}
          />
        ) : (
          <p
            className={
              styles.locked
            }
          >
            {t("post.locked")}
          </p>
        )}


        {/* ==================================================
            REPORT FORM
        ================================================== */}

        {showReport && (
          <ReportForm
            post={post}
            username={
              username
            }
            onClose={() =>
              setShowReport(
                false
              )
            }
          />
        )}


        {/* ==================================================
            ACTIONS / NAVIGATION
        ================================================== */}

        {canRead && (
          <>

            <div
              className={
                styles.navButtons
              }
            >

              {prevEpisode && (
                <Link
                  href={`/post/${prevEpisode.id}`}
                >
                  <button
                    className={
                      styles.prevBtn
                    }
                  >
                    {t("post.prev")}
                  </button>
                </Link>
              )}


              <AdsBanner />


              {nextEpisode && (
                <Link
                  href={`/post/${nextEpisode.id}`}
                >
                  <button
                    className={
                      styles.nextBtn
                    }
                  >
                    {t("post.next")}
                  </button>
                </Link>
              )}

            </div>


            {/* ==================================================
                ACTION BUTTONS
            ================================================== */}

            <div
              className={
                styles.actions
              }
            >

              <button
                onClick={
                  handleCopyFull
                }
                className={
                  styles.copyFull
                }
              >
                <FaCopy />
                {t("post.copyFull")}
              </button>


              <button
                onClick={
                  handleCopySummary
                }
                className={
                  styles.copySummary
                }
              >
                {t("post.shareSummary")}
              </button>


              <button
                onClick={
                  handleSaveOffline
                }
                className={
                  styles.copySummary
                }
              >
                {t("post.saveOffline")}
              </button>


              <button
                className={
                  styles.whatsapp
                }
                onClick={() => {

                  const whatsappText =
                    `${post.head}\n\n${summary}\n\n${t("post.shareText")}\n${link}`;

                  const whatsappUrl =
                    `https://wa.me/?text=${encodeURIComponent(
                      whatsappText
                    )}`;

                  window.open(
                    whatsappUrl,
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
              >
                <FaWhatsapp />
              </button>


              <button
                className={
                  styles.facebook
                }
                onClick={() => {

                  const facebookUrl =
                    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                      link
                    )}`;

                  window.open(
                    facebookUrl,
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
              >
                <FaFacebook />
              </button>


              <button
                onClick={() =>
                  setShowReport(
                    true
                  )
                }
              >
                {t("post.report")}
              </button>

            </div>

          </>
        )}


        {/* ==================================================
            COMMENTS
        ================================================== */}

        <div
          className={
            styles.comments
          }
        >

          <h3>
            {t("post.comments")}
          </h3>


          {canRead && (
            <div
              className={
                styles.commentForm
              }
            >

              <input
                value={
                  commentText
                }
                onChange={(e) =>
                  setCommentText(
                    e.target.value
                  )
                }
                placeholder={t("post.commentPlaceholder")}
              />

              <button
                onClick={
                  handleAddComment
                }
              >
                {t("post.postComment")}
              </button>

            </div>
          )}


          {comments.map(
            (c, i) => (
              <div
                key={
                  c.id ||
                  i
                }
                className={
                  styles.commentItem
                }
              >
                <b>
                  {c.author}
                </b>
                : {c.text}
              </div>
            )
          )}

        </div>

      </div>
    </>
  );
}
