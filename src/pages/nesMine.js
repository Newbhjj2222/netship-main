// pages/nesMine.js

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Cookies from "js-cookie";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../components/firebase";

import {
  FiArrowLeft,
  FiCheck,
  FiClock,
  FiCopy,
  FiExternalLink,
  FiGift,
  FiHome,
  FiPlay,
  FiRefreshCw,
  FiShare2,
  FiStar,
  FiUsers,
  FiVideo,
  FiZap,
} from "react-icons/fi";

import styles from "../styles/nesMine.module.css";
import { useI18n } from "@/i18n/I18nProvider";


// ============================================================
// CONSTANTS
// ============================================================

const SHARE_REWARD = 2;
const SHARE_REQUIRED_CLICKS = 5;

// Share task remains valid for 3 hours.
const SHARE_TASK_EXPIRY_SECONDS = 3 * 60 * 60;

// Ad reward is paid after 3 completed ads.
const AD_REWARD = 1;
const ADS_REQUIRED_FOR_REWARD = 3;

// Each ad must be watched for at least 15 seconds.
const AD_REQUIRED_SECONDS = 15;

// Each individual ad task remains valid for 30 minutes.
const AD_TASK_EXPIRY_SECONDS = 30 * 60;


// ============================================================
// STORY HELPERS
// ============================================================

function normalizeStoryTitle(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}


/*
|--------------------------------------------------------------------------
| CLEAN STORY TITLE
|--------------------------------------------------------------------------
*/

function cleanStoryTitle(head = "") {
  let title = String(head || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!title) {
    return "";
  }

  title = title.replace(
    /\s*(?:S(?:EASON)?\s*\d+\s*[-_.:]?\s*EP(?:ISODE)?\.?\s*\d+)\b/gi,
    ""
  );

  title = title.replace(
    /\s*S\d+\s*EP(?:ISODE)?\.?\s*\d+\b/gi,
    ""
  );

  title = title.replace(
    /\s*\b(?:EP|EPISODE)\.?\s*\d+\b/gi,
    ""
  );

  title = title.replace(
    /\s*\b\d+\s+(?:EP|EPISODE)\b/gi,
    ""
  );

  title = title.replace(
    /\s*\b(?:PART|IGICE)\.?\s*\d+\b/gi,
    ""
  );

  title = title.replace(
    /\s*\b\d+\s+(?:PART|IGICE)\b/gi,
    ""
  );

  title = title.replace(
    /\s+\b(?:THE\s+)?(?:FINAL|LAST)\s+(?:EPISODE|EP)\b/gi,
    ""
  );

  title = title.replace(
    /\s+\b(?:EPISODE|EP)\s+(?:THE\s+)?(?:FINAL|LAST)\b/gi,
    ""
  );

  title = title.replace(
    /\s+\b(?:THE\s+)?(?:FINAL|LAST)\s+(?:PART|IGICE)\b/gi,
    ""
  );

  title = title.replace(
    /\s+\b(?:PART|IGICE)\s+(?:THE\s+)?(?:FINAL|LAST)\b/gi,
    ""
  );

  title = title.replace(
    /\s+\b(?:THE\s+)?(?:FINAL|LAST)\b/gi,
    ""
  );

  title = title.replace(
    /\s+\bS(?:EASON)?\s*\d+\b/gi,
    ""
  );

  return title
    .replace(/\s*[-_:|/]+$/g, "")
    .replace(/^[-_:|/]+\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}


function getPostTitle(post = {}) {
  return cleanStoryTitle(
    post.head ||
      post.storyHead ||
      post.storyTitle ||
      "Untitled Story"
  );
}


function stripHtml(value = "") {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}


function truncateText(value = "", maxLength = 300) {
  const text = stripHtml(value);

  if (text.length <= maxLength) {
    return text;
  }

  const safeLength = Math.max(0, maxLength - 3);

  return `${text.slice(0, safeLength).trim()}...`;
}


function getPostSummary(post = {}) {
  const summary = stripHtml(post.summary || "");
  if (summary) return summary;

  const description = stripHtml(post.description || "");
  if (description) return description;

  const synopsis = stripHtml(post.synopsis || "");
  if (synopsis) return synopsis;

  return "";
}


function getStoryPreview(post = {}) {
  const story = stripHtml(post.story || "");
  if (!story) return "";
  return truncateText(story, 300);
}


function getStorySummary(storyPosts = []) {
  const postWithSummary = storyPosts.find((post) => {
    return Boolean(getPostSummary(post));
  });

  if (postWithSummary) {
    return getPostSummary(postWithSummary);
  }

  const postWithStory = storyPosts.find((post) => {
    return Boolean(stripHtml(post.story || ""));
  });

  if (postWithStory) {
    return getStoryPreview(postWithStory);
  }

  return "";
}


function getPostsForStory(allPosts = [], selectedPost = {}) {
  let storyPosts = [];

  if (selectedPost.storyId) {
    storyPosts = allPosts.filter(
      (post) => post.storyId === selectedPost.storyId
    );
  }

  if (storyPosts.length === 0 && selectedPost.summaryId) {
    storyPosts = allPosts.filter(
      (post) => post.summaryId === selectedPost.summaryId
    );
  }

  if (storyPosts.length === 0) {
    const selectedTitle = getPostTitle(selectedPost);

    storyPosts = allPosts.filter(
      (post) =>
        normalizeStoryTitle(getPostTitle(post)) ===
        normalizeStoryTitle(selectedTitle)
    );
  }

  if (storyPosts.length === 0) {
    storyPosts = [selectedPost];
  }

  storyPosts.sort((a, b) => {
    const dateA = getTimestampDate(a.createdAt)?.getTime() || 0;
    const dateB = getTimestampDate(b.createdAt)?.getTime() || 0;
    return dateA - dateB;
  });

  return storyPosts;
}


// ============================================================
// GENERAL HELPERS
// ============================================================

function createSessionId() {
  if (typeof window === "undefined") return "";

  try {
    const storageKey = "nesMineSession";

    let existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;

    const generated =
      "nes_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 12);

    window.localStorage.setItem(storageKey, generated);

    Cookies.set(storageKey, generated, {
      expires: 30,
      sameSite: "lax",
    });

    return generated;
  } catch {
    return (
      "nes_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 12)
    );
  }
}


function getUserFromCookie() {
  try {
    const raw = Cookies.get("user");
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.username) return null;

    return parsed;
  } catch {
    return null;
  }
}


function getTimestampDate(value) {
  if (!value) return null;

  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;

  if (typeof value === "object" && typeof value.toDate === "function") {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }

  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  if (typeof value === "number") return new Date(value);

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}


function formatNumber(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("en-US").format(number);
}


function formatCountdown(seconds) {
  const safeSeconds = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}


function getTodayStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}


function getPostImage(post = {}) {
  return (
    post.imageUrl ||
    post.coverUrl ||
    post.thumbnail ||
    post.image ||
    ""
  );
}


/*
|--------------------------------------------------------------------------
| YOUTUBE VIDEO ID EXTRACTOR
|
| Supports:
|
| https://youtu.be/KdR1AaVoqgg?si=...
| https://www.youtube.com/watch?v=KdR1AaVoqgg
| https://www.youtube.com/embed/KdR1AaVoqgg
| https://www.youtube.com/shorts/KdR1AaVoqgg
| https://www.youtube.com/v/KdR1AaVoqgg
| https://m.youtube.com/watch?v=KdR1AaVoqgg
|
| Returns:
|   "" when the URL is not a valid YouTube URL.
|--------------------------------------------------------------------------
*/

function getYouTubeVideoId(url = "") {
  const str = String(url || "").trim();

  if (!str) return "";

  /*
   * Already an embed link.
   */
  const embedMatch = str.match(
    /youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{6,})/i
  );

  if (embedMatch) return embedMatch[1];

  /*
   * Short link: youtu.be/ID
   */
  const shortMatch = str.match(
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/i
  );

  if (shortMatch) return shortMatch[1];

  /*
   * /shorts/ID
   */
  const shortsMatch = str.match(
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/i
  );

  if (shortsMatch) return shortsMatch[1];

  /*
   * /v/ID
   */
  const vMatch = str.match(
    /youtube\.com\/v\/([a-zA-Z0-9_-]{6,})/i
  );

  if (vMatch) return vMatch[1];

  /*
   * watch?v=ID or &v=ID
   */
  const watchMatch = str.match(/[?&]v=([a-zA-Z0-9_-]{6,})/i);
  if (watchMatch) return watchMatch[1];

  /*
   * Bare 11-char YouTube video ID
   */
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  return "";
}


/*
|--------------------------------------------------------------------------
| GET AD MEDIA TYPE
|
| Priority:
|   1. YouTube URL detected → "youtube"
|   2. ad.mediaType (video / image / youtube)
|   3. URL extension
|--------------------------------------------------------------------------
*/

function getAdMediaType(ad = {}) {
  const url = String(ad.mediaUrl || "").trim();

  if (url && getYouTubeVideoId(url)) {
    return "youtube";
  }

  if (ad.mediaType) {
    const type = String(ad.mediaType).toLowerCase().trim();

    if (type === "video" || type === "image" || type === "youtube") {
      return type;
    }
  }

  const lower = url.toLowerCase();

  if (
    lower.includes(".mp4") ||
    lower.includes(".webm") ||
    lower.includes(".ogg") ||
    lower.includes(".mov")
  ) {
    return "video";
  }

  return "image";
}


// ============================================================
// YOUTUBE AD PLAYER COMPONENT
//
// Uses the official YouTube IFrame Player API.
// Reports playing state to parent via onStateChange.
// ============================================================

function YouTubeAdPlayer({ videoId, onStateChange }) {
  const containerIdRef = useRef(
    `yt_ad_${Math.random().toString(36).slice(2, 11)}`
  );

  const playerRef = useRef(null);
  const destroyedRef = useRef(false);
  const onStateChangeRef = useRef(onStateChange);

  /*
   * Keep the latest callback in a ref so we don't
   * have to recreate the player when it changes.
   */
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    if (typeof window === "undefined" || !videoId) return;

    destroyedRef.current = false;
    playerRef.current = null;

    const createPlayer = () => {
      if (destroyedRef.current) return;
      if (playerRef.current) return;

      const el = document.getElementById(
        containerIdRef.current
      );

      if (!el) return;

      playerRef.current = new window.YT.Player(el, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,
          fs: 1,
        },
        events: {
          onReady: (event) => {
            try {
              event.target.playVideo();
            } catch {
              /* silent */
            }
          },
          onStateChange: (event) => {
            try {
              onStateChangeRef.current?.(
                event?.data
              );
            } catch {
              /* silent */
            }
          },
        },
      });
    };

    const loadApi = () => {
      if (window.YT && window.YT.Player) {
        createPlayer();
        return;
      }

      const previous =
        window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        try {
          if (typeof previous === "function") {
            previous();
          }
        } catch {
          /* silent */
        }

        createPlayer();
      };

      const existing = document.querySelector(
        'script[src*="youtube.com/iframe_api"]'
      );

      if (!existing) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        tag.async = true;
        document.head.appendChild(tag);
      }
    };

    loadApi();

    return () => {
      destroyedRef.current = true;

      try {
        playerRef.current?.destroy?.();
      } catch {
        /* silent */
      }

      playerRef.current = null;
    };
  }, [videoId]);

  return (
    <div className={styles.youtubeWrapper}>
      <div
        id={containerIdRef.current}
        className={styles.youtubePlayer}
      />
    </div>
  );
}


// ============================================================
// PAGE
// ============================================================

export default function NesMine() {
  const { t } = useI18n();

  const router = useRouter();

  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);

  const [stats, setStats] = useState({
    todayEarned: 0,
    completedShares: 0,
    completedAds: 0,
    totalEarned: 0,
  });

  const [activeTab, setActiveTab] = useState("share");
  const [shareTask, setShareTask] = useState(null);
  const [adTask, setAdTask] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingTask, setLoadingTask] = useState(false);

  const [creatingShare, setCreatingShare] = useState(false);
  const [startingAd, setStartingAd] = useState(false);
  const [checkingShare, setCheckingShare] = useState(false);
  const [claimingAd, setClaimingAd] = useState(false);

  const [shareCountdown, setShareCountdown] = useState(0);
  const [adCountdown, setAdCountdown] = useState(0);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [adWatchCount, setAdWatchCount] = useState(0);

  /*
   * YouTube-ad-only state.
   */
  const [ytWatchedSeconds, setYtWatchedSeconds] = useState(0);
  const [ytPlaying, setYtPlaying] = useState(false);

  /*
   * Tracks which ad task the local YT watch counter
   * belongs to, so we can reset it on a new task.
   */
  const ytTaskIdRef = useRef(null);

  const sessionId = useMemo(() => createSessionId(), []);


  // ==========================================================
  // USER / LOGIN
  // ==========================================================

  useEffect(() => {
    const currentUser = getUserFromCookie();

    if (!currentUser?.username) {
      router.replace(
        `/login?redirect=${encodeURIComponent("/nesMine")}`
      );
      return;
    }

    setUser(currentUser);
  }, [router]);


  // ==========================================================
  // FIRESTORE: BALANCE + AD PROGRESS
  // ==========================================================

  const loadBalance = useCallback(async () => {
    if (!user?.username) return;

    try {
      const depositerRef = doc(
        db,
        "depositers",
        user.username
      );

      const snapshot = await getDoc(depositerRef);

      if (!snapshot.exists()) {
        setBalance(0);
        setAdWatchCount(0);
        return;
      }

      const data = snapshot.data();

      setBalance(Number(data.nes || 0));
      setAdWatchCount(
        Number(data.adWatchCount || 0)
      );
    } catch (err) {
      console.error("loadBalance error:", err);
      setError(t("Ntibyashobotse kubona NES balance yawe."));
    }
  }, [user]);


  // ==========================================================
  // FIRESTORE: STATS
  // ==========================================================

  const loadStats = useCallback(async () => {
    if (!user?.username) return;

    try {
      const rewardsRef = collection(
        db,
        "nesGameRewards"
      );

      const rewardsQuery = query(
        rewardsRef,
        where("username", "==", user.username)
      );

      const snapshot = await getDocs(rewardsQuery);

      let todayEarned = 0;
      let completedShares = 0;
      let completedAds = 0;
      let totalEarned = 0;

      const todayStart = getTodayStart();

      snapshot.forEach((rewardDoc) => {
        const reward = rewardDoc.data();
        const amount = Number(reward.amount || 0);

        totalEarned += amount;

        if (reward.type === "share") completedShares += 1;
        if (reward.type === "ad") completedAds += 1;

        const createdDate = getTimestampDate(
          reward.createdAt
        );

        if (
          createdDate &&
          createdDate.getTime() >= todayStart.getTime()
        ) {
          todayEarned += amount;
        }
      });

      setStats({
        todayEarned,
        completedShares,
        completedAds,
        totalEarned,
      });
    } catch (err) {
      console.error("loadStats error:", err);
      setError(t("Ntibyashobotse kubona statistics zawe."));
    }
  }, [user]);


  // ==========================================================
  // FIND ACTIVE TASK
  // ==========================================================

  const findActiveTask = useCallback(async () => {
    if (!user?.username) return null;

    try {
      const tasksRef = collection(db, "nesGameTasks");

      const tasksQuery = query(
        tasksRef,
        where("username", "==", user.username)
      );

      const snapshot = await getDocs(tasksQuery);
      const now = Date.now();
      const activeTasks = [];

      snapshot.forEach((taskDoc) => {
        const data = taskDoc.data();

        if (data.status !== "active") return;

        const expiresAt = getTimestampDate(
          data.expiresAt
        );

        if (expiresAt && expiresAt.getTime() <= now) {
          return;
        }

        activeTasks.push({
          id: taskDoc.id,
          ...data,
        });
      });

      activeTasks.sort((a, b) => {
        const dateA =
          getTimestampDate(a.createdAt)?.getTime() || 0;
        const dateB =
          getTimestampDate(b.createdAt)?.getTime() || 0;
        return dateB - dateA;
      });

      return activeTasks[0] || null;
    } catch (err) {
      console.error("findActiveTask error:", err);
      return null;
    }
  }, [user]);


  // ==========================================================
  // LOAD ACTIVE TASK
  // ==========================================================

  const loadActiveTask = useCallback(async () => {
    if (!user?.username) return;

    setLoadingTask(true);

    try {
      const task = await findActiveTask();

      if (!task) {
        setShareTask(null);
        setAdTask(null);
        return;
      }

      if (task.sessionId !== sessionId) {
        if (task.type === "share") {
          setShareTask(task);
          setAdTask(null);
        } else if (task.type === "ad") {
          setAdTask(task);
          setShareTask(null);
        }
        return;
      }

      if (task.type === "share") {
        setShareTask(task);
        setAdTask(null);
      }

      if (task.type === "ad") {
        setAdTask(task);
        setShareTask(null);
      }
    } catch (err) {
      console.error("loadActiveTask error:", err);
      setError(t("Ntibyashobotse kubona task uri gukora."));
    } finally {
      setLoadingTask(false);
    }
  }, [user, sessionId, findActiveTask]);


  // ==========================================================
  // LOAD EVERYTHING
  // ==========================================================

  const loadEverything = useCallback(async () => {
    if (!user?.username) return;

    setLoading(true);
    setError("");

    await Promise.all([
      loadBalance(),
      loadStats(),
      loadActiveTask(),
    ]);

    setLoading(false);
  }, [user, loadBalance, loadStats, loadActiveTask]);


  useEffect(() => {
    if (!user?.username) return;
    loadEverything();
  }, [user, loadEverything]);


  // ==========================================================
  // VISIBILITY CHANGE
  // ==========================================================

  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        user?.username
      ) {
        loadBalance();
        loadStats();
        loadActiveTask();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [user, loadBalance, loadStats, loadActiveTask]);


  // ==========================================================
  // SHARE COUNTDOWN
  // ==========================================================

  useEffect(() => {
    if (!shareTask?.expiresAt) {
      setShareCountdown(0);
      return;
    }

    const update = () => {
      const expiresAt = getTimestampDate(
        shareTask.expiresAt
      );

      if (!expiresAt) {
        setShareCountdown(0);
        return;
      }

      const remaining = Math.max(
        0,
        Math.ceil(
          (expiresAt.getTime() - Date.now()) / 1000
        )
      );

      setShareCountdown(remaining);

      if (remaining <= 0) {
        setShareTask(null);
        setMessage(
          t("Share task yarangiye. Ushobora gufata indi story kugirango ubashe gukorera NES.")
        );
      }
    };

    update();

    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [shareTask]);


  // ==========================================================
  // AD COUNTDOWN
  //
  // For YouTube ads, countdown derives from
  // real playback time (ytWatchedSeconds).
  //
  // For video/image ads, countdown derives from
  // wall-clock time since startedAt (existing behaviour).
  // ==========================================================

  useEffect(() => {
    if (!adTask) {
      setAdCountdown(0);
      return;
    }

    /*
     * YouTube ad: watched time only counts
     * while the video is actually playing.
     */
    if (adTask.mediaType === "youtube") {
      setAdCountdown(
        Math.max(
          0,
          AD_REQUIRED_SECONDS - ytWatchedSeconds
        )
      );
      return;
    }

    if (!adTask.startedAt) {
      setAdCountdown(0);
      return;
    }

    const update = () => {
      const startedAt = getTimestampDate(
        adTask.startedAt
      );

      if (!startedAt) {
        setAdCountdown(0);
        return;
      }

      const elapsed = Math.floor(
        (Date.now() - startedAt.getTime()) / 1000
      );

      setAdCountdown(
        Math.max(0, AD_REQUIRED_SECONDS - elapsed)
      );
    };

    update();

    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [adTask, ytWatchedSeconds]);


  // ==========================================================
  // RESET YOUTUBE STATE WHEN TASK CHANGES
  // ==========================================================

  useEffect(() => {
    if (!adTask) {
      ytTaskIdRef.current = null;
      setYtWatchedSeconds(0);
      setYtPlaying(false);
      return;
    }

    if (ytTaskIdRef.current !== adTask.id) {
      ytTaskIdRef.current = adTask.id;
      setYtWatchedSeconds(0);
      setYtPlaying(false);
    }
  }, [adTask]);


  // ==========================================================
  // INCREMENT YT WATCHED SECONDS WHILE PLAYING
  // ==========================================================

  useEffect(() => {
    if (!adTask || adTask.mediaType !== "youtube") {
      return;
    }

    if (!ytPlaying) return;

    const interval = setInterval(() => {
      setYtWatchedSeconds((seconds) =>
        Math.min(AD_REQUIRED_SECONDS, seconds + 1)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [adTask, ytPlaying]);


  // ==========================================================
  // YOUTUBE STATE CHANGE HANDLER
  //
  // YT.PlayerState:
  //   -1 unstarted
  //    0 ended
  //    1 playing
  //    2 paused
  //    3 buffering
  //    5 cued
  // ==========================================================

  const handleYouTubeStateChange = useCallback(
    (state) => {
      /*
       * Playing → count time.
       */
      if (state === 1) {
        setYtPlaying(true);
        return;
      }

      /*
       * Paused / ended / buffering / cued → stop counting.
       */
      if (
        state === 0 ||
        state === 2 ||
        state === 3 ||
        state === 5 ||
        state === -1
      ) {
        setYtPlaying(false);
      }
    },
    []
  );


  // ==========================================================
  // CREATE SHARE TASK
  // ==========================================================

  const createShareTask = useCallback(async () => {
    if (!user?.username) return;
    if (creatingShare) return;

    setCreatingShare(true);
    setError("");
    setMessage("");
    setSummaryOpen(false);

    try {
      const existingTask = await findActiveTask();

      if (existingTask) {
        if (existingTask.sessionId !== sessionId) {
          setError(
            t("Ufite task uri gukora. Yanze gufungurwa muri iyi session.")
          );
          return;
        }

        if (existingTask.type === "share") {
          setShareTask(existingTask);
          setAdTask(null);
          return;
        }

        setError(
          t("Banza urangize task uri gukora mbere yo gufata indi.")
        );
        return;
      }

      const postsSnapshot = await getDocs(
        query(
          collection(db, "posts"),
          orderBy("createdAt", "asc"),
          limit(100)
        )
      );

      const posts = [];

      postsSnapshot.forEach((postDoc) => {
        const post = {
          id: postDoc.id,
          ...postDoc.data(),
        };

        if (post.deleted === true || post.hidden === true) {
          return;
        }

        const title = getPostTitle(post);
        if (!title) return;

        posts.push(post);
      });

      if (!posts.length) {
        setError(
          t("Nta nkuru yabonetse. Ushobora gukora refresh ukongera ukareba.")
        );
        return;
      }

      const randomIndex = Math.floor(
        Math.random() * posts.length
      );

      const selectedPost = posts[randomIndex];

      const storyPosts = getPostsForStory(
        posts,
        selectedPost
      );

      const storyTitle = getPostTitle(selectedPost);

      const storySummary = getStorySummary(storyPosts);

      const storyImage = getPostImage(
        storyPosts.find((post) => getPostImage(post)) ||
          selectedPost
      );

      const taskRef = doc(
        collection(db, "nesGameTasks")
      );

      const taskId = taskRef.id;
      const now = Timestamp.now();

      const expiresAt = Timestamp.fromMillis(
        Date.now() + SHARE_TASK_EXPIRY_SECONDS * 1000
      );

      const postUrl =
        typeof window !== "undefined"
          ? `${
              window.location.origin
            }/story/${encodeURIComponent(storyTitle)}`
          : `/story/${encodeURIComponent(storyTitle)}`;

      const shareUrl = `${postUrl}?nesTask=${encodeURIComponent(
        taskId
      )}`;

      const taskData = {
        id: taskId,
        username: user.username,
        type: "share",
        status: "active",
        sessionId,

        postId: selectedPost.id,

        storyId:
          selectedPost.storyId ||
          selectedPost.summaryId ||
          "",

        storyTitle,
        title: storyTitle,
        summary: storySummary,
        imageUrl: storyImage,
        postUrl,
        shareUrl,

        clicks: 0,
        requiredClicks: SHARE_REQUIRED_CLICKS,
        reward: SHARE_REWARD,

        createdAt: serverTimestamp(),
        startedAt: now,
        expiresAt,
        updatedAt: serverTimestamp(),
      };

      await setDoc(taskRef, taskData);

      setShareTask({
        ...taskData,
        id: taskId,
        createdAt: now,
        updatedAt: now,
      });

      setAdTask(null);
      setActiveTab("share");
      setMessage(
        t("Story yabonetse. Yisangize abantu 5 kugira ngo ubone NES.")
      );
    } catch (err) {
      console.error("createShareTask error:", err);
      setError(t("Ntibyashobotse gukora share task."));
    } finally {
      setCreatingShare(false);
    }
  }, [
    user,
    sessionId,
    creatingShare,
    findActiveTask,
  ]);


  // ==========================================================
  // COPY SHARE URL
  // ==========================================================

  const copyShareUrl = useCallback(async () => {
    if (!shareTask?.shareUrl) return;

    try {
      await navigator.clipboard.writeText(
        shareTask.shareUrl
      );

      setCopied(true);
      setMessage(t("Share link yagiye muri clipboard."));

      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const textarea =
          document.createElement("textarea");

        textarea.value = shareTask.shareUrl;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";

        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();

        setCopied(true);
        setMessage(t("Share link yagiye muri clipboard."));

        setTimeout(() => setCopied(false), 2000);
      } catch {
        setError(t("Copy link byanze kuri device yawe."));
      }
    }
  }, [shareTask]);


  // ==========================================================
  // NATIVE SHARE
  // ==========================================================

  const nativeShare = useCallback(async () => {
    if (!shareTask?.shareUrl) return;

    setError("");
    setMessage("");

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.share
      ) {
        await navigator.share({
          title:
            shareTask.storyTitle ||
            shareTask.title ||
            "New Talents Stories",

          text:
            shareTask.summary ||
            "Soma iyi nkuru kuri New Talents Stories.",

          url: shareTask.shareUrl,
        });

        setMessage(t("Story yasangiwe neza."));
        return;
      }

      await copyShareUrl();
    } catch (err) {
      if (err?.name === "AbortError") return;

      console.error("nativeShare error:", err);
      await copyShareUrl();
    }
  }, [shareTask, copyShareUrl]);


  // ==========================================================
  // GET VERIFIED SHARE CLICKS
  // ==========================================================

  const getVerifiedClicks = useCallback(async (taskId) => {
    if (!taskId) return 0;

    try {
      const clicksQuery = query(
        collection(db, "nesShareClicks"),
        where("taskId", "==", taskId)
      );

      const snapshot = await getDocs(clicksQuery);

      if (!snapshot.empty) {
        const uniqueVisitors = new Set();

        snapshot.forEach((clickDoc) => {
          const click = clickDoc.data();

          const visitorId =
            click.visitorId ||
            click.sessionId ||
            click.uid ||
            click.userId ||
            click.username ||
            click.ipHash ||
            clickDoc.id;

          uniqueVisitors.add(String(visitorId));
        });

        return uniqueVisitors.size;
      }
    } catch (err) {
      console.warn("nesShareClicks read failed:", err);
    }

    try {
      const taskRef = doc(
        db,
        "nesGameTasks",
        taskId
      );

      const taskSnapshot = await getDoc(taskRef);

      if (taskSnapshot.exists()) {
        const data = taskSnapshot.data();
        return Number(data.clicks || 0);
      }
    } catch (err) {
      console.warn("Task clicks read failed:", err);
    }

    return 0;
  }, []);


  // ==========================================================
  // CHECK SHARE REWARD
  // ==========================================================

  const checkShare = useCallback(async () => {
    if (!user?.username) return;

    if (!shareTask?.id) {
      setError(t("Nta share task iri gukora."));
      return;
    }

    if (checkingShare) return;

    setCheckingShare(true);
    setError("");
    setMessage("");

    try {
      const taskId = shareTask.id;

      const taskRef = doc(
        db,
        "nesGameTasks",
        taskId
      );

      const depositerRef = doc(
        db,
        "depositers",
        user.username
      );

      const rewardRef = doc(
        db,
        "nesGameRewards",
        taskId
      );

      const taskSnapshot = await getDoc(taskRef);

      if (!taskSnapshot.exists()) {
        throw new Error("TASK_NOT_FOUND");
      }

      const task = taskSnapshot.data();

      if (task.username !== user.username) {
        throw new Error("TASK_USER_MISMATCH");
      }

      if (task.type !== "share") {
        throw new Error("INVALID_TASK_TYPE");
      }

      if (task.sessionId !== sessionId) {
        throw new Error("SESSION_MISMATCH");
      }

      if (task.status === "completed") {
        throw new Error("TASK_COMPLETED");
      }

      const expiresAt = getTimestampDate(
        task.expiresAt
      );

      if (
        expiresAt &&
        expiresAt.getTime() <= Date.now()
      ) {
        throw new Error("TASK_EXPIRED");
      }

      const verifiedClicks = await getVerifiedClicks(
        taskId
      );

      setShareTask((previous) =>
        previous
          ? { ...previous, clicks: verifiedClicks }
          : previous
      );

      if (verifiedClicks < SHARE_REQUIRED_CLICKS) {
        setError(
          `Uracyakeneye ${Math.max(
            0,
            SHARE_REQUIRED_CLICKS - verifiedClicks
          )} click(s) kugira ngo ubone reward.`
        );
        return;
      }

      const rewardSnapshot = await getDoc(rewardRef);

      if (rewardSnapshot.exists()) {
        throw new Error("REWARD_ALREADY_EXISTS");
      }

      const depositerSnapshot = await getDoc(
        depositerRef
      );

      const currentNES = depositerSnapshot.exists()
        ? Number(depositerSnapshot.data().nes || 0)
        : 0;

      const newNES = currentNES + SHARE_REWARD;

      await setDoc(
        depositerRef,
        {
          nes: newNES,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await updateDoc(taskRef, {
        status: "completed",
        clicks: verifiedClicks,
        reward: SHARE_REWARD,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(rewardRef, {
        username: user.username,
        taskId,
        type: "share",
        amount: SHARE_REWARD,
        clicks: verifiedClicks,
        createdAt: serverTimestamp(),
      });

      setBalance(Number(newNES || 0));
      setShareTask(null);

      setMessage(
        t("Congratulations! Wabonye +{SHARE_REWARD} NES.", { SHARE_REWARD })
      );

      await loadStats();
    } catch (err) {
      console.error("checkShare error:", err);

      const code = err?.message || "";

      if (code === "TASK_NOT_FOUND") {
        setError(t("Share task ntiyabonetse."));
      } else if (code === "TASK_USER_MISMATCH") {
        setError(t("Iyi task ntabwo ari iyawe."));
      } else if (code === "INVALID_TASK_TYPE") {
        setError(t("Task ntabwo ari share task."));
      } else if (code === "SESSION_MISMATCH") {
        setError(
          t("Iyi task yatangijwe muri indi session.")
        );
      } else if (
        code === "TASK_COMPLETED" ||
        code === "REWARD_ALREADY_EXISTS"
      ) {
        setError(t("Iyi task yamaze guhembwa."));
      } else if (code === "TASK_EXPIRED") {
        setShareTask(null);
        setError(t("Share task yarangiye."));
      } else if (code === "NOT_ENOUGH_CLICKS") {
        setError(
          t("Ntabwo click 5 zisabwa ziragerwaho.")
        );
      } else {
        setError(
          t("Ntibyashobotse kwemeza share reward.")
        );
      }
    } finally {
      setCheckingShare(false);
    }
  }, [
    user,
    shareTask,
    checkingShare,
    sessionId,
    getVerifiedClicks,
    loadStats,
  ]);


  // ==========================================================
  // START AD TASK
  // ==========================================================

  const startAd = useCallback(async () => {
    if (!user?.username) return;
    if (startingAd) return;

    setStartingAd(true);
    setError("");
    setMessage("");

    try {
      const existingTask = await findActiveTask();

      if (existingTask) {
        if (existingTask.sessionId !== sessionId) {
          setError(
            t("Ufite task iri gukora muri indi session.")
          );
          return;
        }

        if (existingTask.type === "ad") {
          setAdTask(existingTask);
          setShareTask(null);
          return;
        }

        setError(
          t("Banza urangize share task iri gukora.")
        );
        return;
      }

      const adsSnapshot = await getDocs(
        query(collection(db, "ads"), limit(100))
      );

      const ads = [];

      adsSnapshot.forEach((adDoc) => {
        const ad = {
          id: adDoc.id,
          ...adDoc.data(),
        };

        if (ad.active === false) return;

        const status = String(
          ad.status || ""
        ).toLowerCase();

        if (status === "inactive" || status === "disabled") {
          return;
        }

        if (!ad.mediaUrl) return;

        ads.push(ad);
      });

      if (!ads.length) {
        setError(
          t("Nta advertisement iri active yabonetse.")
        );
        return;
      }

      const randomIndex = Math.floor(
        Math.random() * ads.length
      );

      const selectedAd = ads[randomIndex];

      const taskRef = doc(
        collection(db, "nesGameTasks")
      );

      const taskId = taskRef.id;
      const now = Timestamp.now();

      const expiresAt = Timestamp.fromMillis(
        Date.now() + AD_TASK_EXPIRY_SECONDS * 1000
      );

      const mediaType = getAdMediaType(selectedAd);

      const taskData = {
        id: taskId,
        username: user.username,
        type: "ad",
        status: "active",
        sessionId,

        adId: selectedAd.id,
        mediaType,
        mediaUrl: selectedAd.mediaUrl,

        title:
          selectedAd.title || "Advertisement",

        description: stripHtml(
          selectedAd.description || ""
        ),

        link: selectedAd.link || "",

        reward: AD_REWARD,
        requiredSeconds: AD_REQUIRED_SECONDS,
        adsRequired: ADS_REQUIRED_FOR_REWARD,

        createdAt: serverTimestamp(),
        startedAt: now,
        expiresAt,
        updatedAt: serverTimestamp(),
      };

      await setDoc(taskRef, taskData);

      setAdTask({
        ...taskData,
        id: taskId,
        createdAt: now,
        updatedAt: now,
      });

      setShareTask(null);
      setActiveTab("ad");

      setMessage(
        t("Reba ad nibura {AD_REQUIRED_SECONDS} seconds kugira ngo ubare iyi ad muri {ADS_REQUIRED_FOR_REWARD} zisabwa kuri +{AD_REWARD} NES.", { AD_REQUIRED_SECONDS, ADS_REQUIRED_FOR_REWARD, AD_REWARD })
      );
    } catch (err) {
      console.error("startAd error:", err);
      setError(
        t("Ntibyashobotse gutangiza advertisement.")
      );
    } finally {
      setStartingAd(false);
    }
  }, [
    user,
    startingAd,
    sessionId,
    findActiveTask,
  ]);


  // ==========================================================
  // COMPLETE AD
  // ==========================================================

  const completeAd = useCallback(async () => {
    if (!user?.username) return;
    if (!adTask?.id) return;
    if (claimingAd) return;

    if (adCountdown > 0) {
      setError(
        t("Ugomba gutegereza {adCountdown} seconds.", { adCountdown })
      );
      return;
    }

    setClaimingAd(true);
    setError("");
    setMessage("");

    try {
      const taskId = adTask.id;

      const taskRef = doc(
        db,
        "nesGameTasks",
        taskId
      );

      const depositerRef = doc(
        db,
        "depositers",
        user.username
      );

      const taskSnapshot = await getDoc(taskRef);

      if (!taskSnapshot.exists()) {
        throw new Error("TASK_NOT_FOUND");
      }

      const task = taskSnapshot.data();

      if (task.username !== user.username) {
        throw new Error("TASK_USER_MISMATCH");
      }

      if (task.type !== "ad") {
        throw new Error("INVALID_TASK_TYPE");
      }

      if (task.sessionId !== sessionId) {
        throw new Error("SESSION_MISMATCH");
      }

      if (task.status === "completed") {
        throw new Error("TASK_COMPLETED");
      }

      const expiresAt = getTimestampDate(
        task.expiresAt
      );

      if (
        expiresAt &&
        expiresAt.getTime() <= Date.now()
      ) {
        throw new Error("TASK_EXPIRED");
      }

      const startedAt = getTimestampDate(
        task.startedAt
      );

      if (!startedAt) {
        throw new Error("START_TIME_MISSING");
      }

      const elapsedSeconds = Math.floor(
        (Date.now() - startedAt.getTime()) / 1000
      );

      /*
       * For YouTube ads, "effective" watched seconds is
       * the real playback time tracked client-side.
       *
       * For other ads, use the wall-clock elapsed time.
       */
      const effectiveWatchedSeconds =
        task.mediaType === "youtube"
          ? ytWatchedSeconds
          : elapsedSeconds;

      if (effectiveWatchedSeconds < AD_REQUIRED_SECONDS) {
        throw new Error("NOT_ENOUGH_TIME");
      }

      const depositerSnapshot = await getDoc(
        depositerRef
      );

      const currentNES = depositerSnapshot.exists()
        ? Number(depositerSnapshot.data().nes || 0)
        : 0;

      const currentAdWatchCount = depositerSnapshot.exists()
        ? Number(
            depositerSnapshot.data().adWatchCount || 0
          )
        : 0;

      const newAdWatchCount = currentAdWatchCount + 1;

      const shouldReward =
        newAdWatchCount >= ADS_REQUIRED_FOR_REWARD;

      const rewardAmount = shouldReward
        ? AD_REWARD
        : 0;

      const finalAdWatchCount = shouldReward
        ? 0
        : newAdWatchCount;

      const newNES = currentNES + rewardAmount;

      await setDoc(
        depositerRef,
        {
          nes: newNES,
          adWatchCount: finalAdWatchCount,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await updateDoc(taskRef, {
        status: "completed",
        reward: rewardAmount,
        watchedSeconds: effectiveWatchedSeconds,
        adNumberInCycle: newAdWatchCount,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (shouldReward) {
        const rewardRef = doc(
          collection(db, "nesGameRewards")
        );

        await setDoc(rewardRef, {
          username: user.username,
          taskId,
          type: "ad",
          amount: AD_REWARD,
          adsCompleted: ADS_REQUIRED_FOR_REWARD,
          watchedSeconds: effectiveWatchedSeconds,
          createdAt: serverTimestamp(),
        });
      }

      setBalance(Number(newNES || 0));
      setAdWatchCount(
        Number(finalAdWatchCount || 0)
      );
      setAdTask(null);

      if (rewardAmount > 0) {
        setMessage(
          t("Wabonye +{AD_REWARD} NES! Warangije ads {ADS_REQUIRED_FOR_REWARD}.", { AD_REWARD, ADS_REQUIRED_FOR_REWARD })
        );
      } else {
        const remaining = Math.max(
          0,
          ADS_REQUIRED_FOR_REWARD -
            Number(finalAdWatchCount || 0)
        );

        setMessage(
          t("Ad yarangiye neza. Ufite {newAdWatchCount}/{ADS_REQUIRED_FOR_REWARD} ads. Hasigaye {remaining} kugira ngo ubone +{AD_REWARD} NES.", { newAdWatchCount, ADS_REQUIRED_FOR_REWARD, remaining, AD_REWARD })
        );
      }

      await loadStats();
    } catch (err) {
      console.error("completeAd error:", err);

      const code = err?.message || "";

      if (code === "TASK_NOT_FOUND") {
        setError(t("Ad task ntiyabonetse."));
      } else if (code === "TASK_USER_MISMATCH") {
        setError(t("Iyi task ntabwo ari iyawe."));
      } else if (code === "INVALID_TASK_TYPE") {
        setError(
          t("Iyi task ntabwo ari advertisement.")
        );
      } else if (code === "SESSION_MISMATCH") {
        setError(
          t("Iyi task yatangijwe muri indi session.")
        );
      } else if (code === "TASK_COMPLETED") {
        setError(
          t("Iyi advertisement yamaze guhembwa.")
        );
      } else if (code === "TASK_EXPIRED") {
        setAdTask(null);
        setError(t("Ad task yarangiye."));
      } else if (code === "START_TIME_MISSING") {
        setError(
          t("Start time ya advertisement ntiyabonetse.")
        );
      } else if (code === "NOT_ENOUGH_TIME") {
        setError(
          t("Ugomba kubanza kureba advertisement nibura amasegonda 15.")
        );
      } else {
        setError(
          t("Ntibyashobotse guhemba advertisement.")
        );
      }
    } finally {
      setClaimingAd(false);
    }
  }, [
    user,
    adTask,
    claimingAd,
    adCountdown,
    sessionId,
    ytWatchedSeconds,
    loadStats,
  ]);


  // ==========================================================
  // REFRESH
  // ==========================================================

  const refresh = useCallback(async () => {
    setError("");
    setMessage("");

    await loadEverything();

    setMessage(t("Amakuru yavuguruwe."));
  }, [loadEverything]);


  // ==========================================================
  // ACTIVE TASK
  // ==========================================================

  const currentShareClicks = Number(
    shareTask?.clicks || 0
  );

  const shareRequired = Number(
    shareTask?.requiredClicks ||
      SHARE_REQUIRED_CLICKS
  );

  const shareProgress = Math.min(
    100,
    Math.round(
      (currentShareClicks / shareRequired) * 100
    )
  );

  const adReady =
    Boolean(adTask) && adCountdown <= 0;

  const isYouTubeAd =
    adTask?.mediaType === "youtube";

  const youtubeVideoId = isYouTubeAd
    ? getYouTubeVideoId(adTask.mediaUrl)
    : "";


  // ==========================================================
  // LOADING
  // ==========================================================

  if (!user || loading) {
    return (
      <>
        <Head>
          <title>{t("NES Mine | New Talents Stories")}</title>

          <meta
            name="description"
            content="Earn NES by sharing stories and watching advertisements on New Talents Stories."
          />

          <meta name="robots" content="noindex" />
        </Head>

        <main className={styles.page}>
          <div className={styles.loading}>
            <FiRefreshCw className={styles.spinner} />
            <p>{t("Loading NES Mine...")}</p>
          </div>
        </main>
      </>
    );
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <Head>
        <title>{t("NES Mine | New Talents Stories")}</title>

        <meta
          name="description"
          content="Earn NES by sharing stories and watching advertisements on New Talents Stories."
        />

        <meta name="robots" content="noindex" />
        <meta name="theme-color" content="#070b1a" />
      </Head>


      <main className={styles.page}>

        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Link
              href="/"
              className={styles.homeButton}
            >
              <FiArrowLeft />
              <span>{t("Home")}</span>
            </Link>

            <div className={styles.brand}>
              <FiZap />
              <span>{t("NES Mine")}</span>
            </div>

            <button
              type="button"
              onClick={refresh}
              className={styles.refreshButton}
              disabled={loading}
              aria-label={t("Refresh")}
            >
              <FiRefreshCw
                className={
                  loading ? styles.spinner : ""
                }
              />
            </button>
          </div>
        </header>


        {/* =====================================================
            CONTENT
        ====================================================== */}

        <section className={styles.container}>

          {/* BALANCE */}

          <div className={styles.balanceCard}>
            <div className={styles.balanceIcon}>
              <FiZap />
            </div>

            <div className={styles.balanceInfo}>
              <span className={styles.balanceLabel}>{t("Your NES Balance")}</span>

              <strong className={styles.balanceValue}>{t("{Number} NES", { Number: formatNumber(balance) })}</strong>

              <small>{t("1 NES = 20 RWF")}</small>
            </div>
          </div>


          {/* STATS */}

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <FiZap />
              </div>

              <span>{t("Today")}</span>
              <strong>
                +{formatNumber(stats.todayEarned)}
              </strong>
              <small>{t("NES")}</small>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <FiShare2 />
              </div>

              <span>{t("Shares")}</span>
              <strong>
                {formatNumber(stats.completedShares)}
              </strong>
              <small>{t("completed")}</small>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <FiVideo />
              </div>

              <span>{t("Ads")}</span>
              <strong>
                {formatNumber(stats.completedAds)}
              </strong>
              <small>{t("completed")}</small>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <FiGift />
              </div>

              <span>{t("Total Earned")}</span>
              <strong>
                {formatNumber(stats.totalEarned)}
              </strong>
              <small>{t("NES")}</small>
            </div>
          </div>


          {/* MESSAGES */}

          {message && (
            <div className={styles.successMessage}>
              <FiCheck />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className={styles.errorMessage}>
              <span>{error}</span>
            </div>
          )}


          {/* TABS */}

          <div className={styles.tabs}>
            <button
              type="button"
              className={
                activeTab === "share"
                  ? styles.activeTab
                  : styles.tab
              }
              onClick={() => {
                setActiveTab("share");
                setError("");
                setMessage("");
              }}
            >
              <FiShare2 />
              <span>{t("Share & Earn")}</span>
              <b>+{SHARE_REWARD}</b>
            </button>

            <button
              type="button"
              className={
                activeTab === "ad"
                  ? styles.activeTab
                  : styles.tab
              }
              onClick={() => {
                setActiveTab("ad");
                setError("");
                setMessage("");
              }}
            >
              <FiVideo />
              <span>{t("Watch & Earn")}</span>
              <b>+{AD_REWARD}</b>
            </button>
          </div>


          {/* ===================================================
              SHARE TAB
          ==================================================== */}

          {activeTab === "share" && (
            <section className={styles.taskSection}>
              {!shareTask ? (
                <div className={styles.emptyCard}>
                  <div className={styles.emptyIcon}>
                    <FiShare2 />
                  </div>

                  <h2>{t("Share Stories & Earn NES")}</h2>

                  <p>{t("Fata inkuru, uyisangize abantu, hanyuma iyo abantu 5 bayifunguye neza ubone")}{" "}
                    <strong>{t("+{SHARE_REWARD} NES", { SHARE_REWARD })}</strong>
                    .
                  </p>

                  <button
                    type="button"
                    onClick={createShareTask}
                    disabled={creatingShare || loadingTask}
                    className={styles.primaryButton}
                  >
                    {creatingShare ? (
                      <>
                        <FiRefreshCw
                          className={styles.spinner}
                        />{t("Getting Story...")}</>
                    ) : (
                      <>
                        <FiGift />{t("Get Story")}</>
                    )}
                  </button>
                </div>
              ) : (
                <div className={styles.taskCard}>
                  {shareTask.imageUrl ? (
                    <div className={styles.storyImageWrapper}>
                      <img
                        src={shareTask.imageUrl}
                        alt={
                          shareTask.storyTitle ||
                          shareTask.title ||
                          t("Story")
                        }
                        className={styles.storyImage}
                      />

                      <div className={styles.expiryBadge}>
                        <FiClock />
                        {formatCountdown(shareCountdown)}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.storyImageFallback}>
                      <FiStar />
                    </div>
                  )}

                  <div className={styles.taskContent}>
                    <span className={styles.taskLabel}>{t("SHARE & EARN")}</span>

                    <h2>
                      {shareTask.storyTitle ||
                        shareTask.title ||
                        t("New Talents Story")}
                    </h2>

                    {shareTask.summary && (
                      <div>
                        <p
                          className={
                            summaryOpen
                              ? styles.fullSummary
                              : styles.summary
                          }
                        >
                          {shareTask.summary}
                        </p>

                        {shareTask.summary.length > 180 && (
                          <button
                            type="button"
                            className={styles.moreButton}
                            onClick={() =>
                              setSummaryOpen(
                                (value) => !value
                              )
                            }
                          >
                            {summaryOpen
                              ? t("Show less")
                              : t("Read more")}
                          </button>
                        )}
                      </div>
                    )}

                    <div className={styles.progressArea}>
                      <div className={styles.progressHeader}>
                        <span>{t("Verified clicks")}</span>
                        <strong>
                          {currentShareClicks}/
                          {shareRequired}
                        </strong>
                      </div>

                      <div className={styles.progressTrack}>
                        <div
                          className={styles.progressBar}
                          style={{
                            width: `${shareProgress}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className={styles.actionGrid}>
                      <button
                        type="button"
                        onClick={nativeShare}
                        className={styles.primaryButton}
                      >
                        <FiShare2 />{t("Share")}</button>

                      <button
                        type="button"
                        onClick={copyShareUrl}
                        className={styles.secondaryButton}
                      >
                        {copied ? <FiCheck /> : <FiCopy />}
                        {copied ? t("Copied") : t("Copy Link")}
                      </button>
                    </div>

                    {shareTask.postUrl && (
                      <a
                        href={shareTask.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.openStoryButton}
                      >
                        <FiExternalLink />{t("Open Story")}</a>
                    )}

                    <button
                      type="button"
                      onClick={checkShare}
                      disabled={
                        checkingShare ||
                        shareCountdown <= 0
                      }
                      className={styles.claimButton}
                    >
                      {checkingShare ? (
                        <>
                          <FiRefreshCw
                            className={styles.spinner}
                          />{t("Checking...")}</>
                      ) : (
                        <>
                          <FiCheck />{t("Check Reward")}</>
                      )}
                    </button>

                    <div className={styles.taskHint}>
                      <FiUsers />
                      <span>{t("Share with people and wait for")}{" "}{t("{SHARE_REQUIRED_CLICKS} verified opens.", { SHARE_REQUIRED_CLICKS })}</span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}


          {/* ===================================================
              AD TAB
          ==================================================== */}

          {activeTab === "ad" && (
            <section className={styles.taskSection}>
              {!adTask ? (
                <div className={styles.emptyCard}>
                  <div className={styles.emptyIcon}>
                    <FiVideo />
                  </div>

                  <h2>{t("Watch Ads & Earn NES")}</h2>

                  <p>{t("Reba advertisement nibura")}{" "}
                    <strong>{t("{AD_REQUIRED_SECONDS} seconds", { AD_REQUIRED_SECONDS })}</strong>{" "}{t("maze uyibare muri ads")}{" "}
                    <strong>
                      {ADS_REQUIRED_FOR_REWARD}
                    </strong>{" "}{t("zisabwa kugira ngo ubone")}{" "}
                    <strong>{t("+{AD_REWARD} NES", { AD_REWARD })}</strong>.
                  </p>

                  <button
                    type="button"
                    onClick={startAd}
                    disabled={startingAd || loadingTask}
                    className={styles.primaryButton}
                  >
                    {startingAd ? (
                      <>
                        <FiRefreshCw
                          className={styles.spinner}
                        />{t("Loading Ad...")}</>
                    ) : (
                      <>
                        <FiPlay />{t("Start Ad")}</>
                    )}
                  </button>
                </div>
              ) : (
                <div className={styles.taskCard}>

                  {/* AD MEDIA */}

                  <div className={styles.adMedia}>
                    {adTask.mediaType === "youtube" &&
                    youtubeVideoId ? (
                      <YouTubeAdPlayer
                        videoId={youtubeVideoId}
                        onStateChange={
                          handleYouTubeStateChange
                        }
                      />
                    ) : adTask.mediaType === "video" ? (
                      <video
                        src={adTask.mediaUrl}
                        controls
                        playsInline
                        className={styles.adVideo}
                      />
                    ) : (
                      <img
                        src={adTask.mediaUrl}
                        alt={
                          adTask.title || t("Advertisement")
                        }
                        className={styles.adImage}
                      />
                    )}

                    <div className={styles.adTimer}>
                      <FiClock />
                      {adCountdown > 0
                        ? t("{adCountdown}s", { adCountdown })
                        : t("Ready")}
                    </div>
                  </div>


                  {/* AD CONTENT */}

                  <div className={styles.taskContent}>
                    <span className={styles.taskLabel}>{t("WATCH & EARN")}</span>

                    <h2>
                      {adTask.title || t("Advertisement")}
                    </h2>

                    {adTask.description && (
                      <p className={styles.adDescription}>
                        {adTask.description}
                      </p>
                    )}

                    <div className={styles.progressArea}>
                      <div className={styles.progressHeader}>
                        <span>{t("Watch time")}</span>
                        <strong>
                          {Math.max(
                            0,
                            AD_REQUIRED_SECONDS -
                              adCountdown
                          )}{t("/{AD_REQUIRED_SECONDS} sec", { AD_REQUIRED_SECONDS })}</strong>
                      </div>

                      <div className={styles.progressTrack}>
                        <div
                          className={styles.progressBar}
                          style={{
                            width: `${Math.min(
                              100,
                              ((AD_REQUIRED_SECONDS -
                                adCountdown) /
                                AD_REQUIRED_SECONDS) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {adTask.link && (
                      <a
                        href={adTask.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.openStoryButton}
                      >
                        <FiExternalLink />{t("Open Advertiser")}</a>
                    )}

                    <button
                      type="button"
                      onClick={completeAd}
                      disabled={!adReady || claimingAd}
                      className={styles.claimButton}
                    >
                      {claimingAd ? (
                        <>
                          <FiRefreshCw
                            className={styles.spinner}
                          />{t("Claiming...")}</>
                      ) : adReady ? (
                        <>
                          <FiGift />{t("Claim +{AD_REWARD} NES", { AD_REWARD })}</>
                      ) : (
                        <>
                          <FiClock />{t("Wait {adCountdown}s", { adCountdown })}</>
                      )}
                    </button>

                    <div className={styles.taskHint}>
                      <FiZap />
                      <span>
                        {isYouTubeAd
                          ? t("The timer only counts while the YouTube video is playing.")
                          : t("Once the timer reaches zero, you can claim your NES.")}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}


          {/* ===================================================
              RULES
          ==================================================== */}

          <section className={styles.rulesCard}>
            <div className={styles.rulesHeader}>
              <FiStar />
              <h2>{t("How NES Mine Works")}</h2>
            </div>

            <div className={styles.rulesList}>
              <div className={styles.rule}>
                <span>1</span>
                <p>
                  <strong>{t("Share a story")}</strong>
                  <br />{t("Get a story and share its link with other people.")}</p>
              </div>

              <div className={styles.rule}>
                <span>2</span>
                <p>
                  <strong>{t("Get 5 verified clicks")}</strong>
                  <br />{t("The system checks verified share opens before rewarding you.")}</p>
              </div>

              <div className={styles.rule}>
                <span>3</span>
                <p>
                  <strong>{t("Earn +{SHARE_REWARD} NES", { SHARE_REWARD })}</strong>
                  <br />{t("Once the required clicks are reached, claim your reward.")}</p>
              </div>

              <div className={styles.rule}>
                <span>4</span>
                <p>
                  <strong>{t("Watch advertisements")}</strong>
                  <br />{t("Watch {ADS_REQUIRED_FOR_REWARD} ads for at least {AD_REQUIRED_SECONDS} seconds each to earn +{AD_REWARD} NES.", { ADS_REQUIRED_FOR_REWARD, AD_REQUIRED_SECONDS, AD_REWARD })}</p>
              </div>
            </div>

            <div className={styles.rulesNote}>
              <FiClock />
              <span>{t("Share tasks expire after")}{" "}
                {SHARE_TASK_EXPIRY_SECONDS / 3600}{" "}{t("hours. Ad tasks expire after")}{" "}
                {AD_TASK_EXPIRY_SECONDS / 60}{" "}{t("minutes.")}</span>
            </div>
          </section>


          {/* ===================================================
              FOOTER
          ==================================================== */}

          <footer className={styles.footer}>
            <Link href="/">
              <FiHome />{t("Home")}</Link>

            <span>•</span>
            <span>{t("New Talents Stories group")}</span>
          </footer>
        </section>
      </main>
    </>
  );
}
