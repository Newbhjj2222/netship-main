import { useEffect, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import Cookies from "js-cookie";

import { db } from "../../components/firebase";

import {
  collection,
  getDocs,
  getDoc,
  query,
  orderBy,
  doc,
  updateDoc,
  increment,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import AdsBanner from "@/components/AdsBanner";
import ContinueRead from "@/components/ContinueRead";
import styles from "@/styles/stor.module.css";
import { useI18n } from "../../i18n/I18nProvider";

/*
|--------------------------------------------------------------------------
| FIRESTORE COLLECTIONS
|--------------------------------------------------------------------------
|
| posts
| posts/{postId}/summaries
| posts/{postId}/views/{viewId}
| depositers/{username}
| members/{username}
| contentLicensing/{username}
| storyPurchases/{username_storyId}
| authors/{author}
| reading/{username}/history
| nesGameTasks/{taskId}
| nesShareClicks/{taskId_visitorId}
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function normalizeStoryTitle(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stripHtml(value = "") {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/div>/gi, " ")
    .replace(/<div[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanStoryTitle(head = "") {
  let title = String(head || "")
    .replace(/\s+/g, " ")
    .trim();

  const patterns = [
    /\s+\bS(?:EASON)?\s*\d+\s*(?:EP(?:ISODE)?|E)\s*\.?\s*\d+\b/gi,
    /\s+\bEP(?:ISODE)?\s*\.?\s*\d+\b/gi,
    /\s+\bE\s*\.?\s*\d+\b/gi,
    /\s+\b\d+\s+(?:EP(?:ISODE)?|E)\b/gi,
    /\s+\b(?:PART|IGICE)\s*\.?\s*\d+\b/gi,
    /\s+\b\d+\s+(?:PART|IGICE)\b/gi,
    /\s+\b(?:THE\s+)?(?:FINAL|LAST)\s+(?:EPISODE|EP|PART|IGICE)\b/gi,
    /\s+\b(?:EPISODE|EP|PART|IGICE)\s+(?:THE\s+)?(?:FINAL|LAST)\b/gi,
    /\s+\b(?:THE\s+)?(?:FINAL|LAST)\b/gi,
    /\s+\bS(?:EASON)?\s*\d+\b/gi,
  ];

  for (const pattern of patterns) {
    title = title.replace(pattern, "");
  }

  return title
    .replace(/\s*[-_:|/]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getStoryTitle(post = {}) {
  return cleanStoryTitle(
    post.head || post.storyHead || post.storyTitle || "Untitled Story"
  );
}

function firestoreDateToISO(value) {
  if (!value) return null;
  try {
    if (typeof value.toDate === "function") return value.toDate().toISOString();
    if (typeof value.toMillis === "function")
      return new Date(value.toMillis()).toISOString();
    if (value.seconds !== undefined)
      return new Date(Number(value.seconds) * 1000).toISOString();
    if (typeof value === "string") {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
    if (typeof value === "number") {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
  } catch (error) {
    console.error("Date conversion error:", error);
  }
  return null;
}

function getPostTime(value) {
  if (!value) return 0;
  try {
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.toDate === "function") return value.toDate().getTime();
    if (value.seconds !== undefined) return Number(value.seconds) * 1000;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  } catch {
    return 0;
  }
}

function parseEpisodeInfo(post = {}, index = 0) {
  const head = String(post.head || "").trim();

  let season = Number(post.season || 1);
  let episode = Number(post.episodeNumber || post.episode || 0);
  let part = Number(post.partNumber || post.part || 0);

  const seasonEpisodeMatch = head.match(
    /\bS(?:EASON)?\s*(\d+)\s*(?:EP(?:ISODE)?|E)\s*\.?\s*(\d+)\b/i
  );

  if (seasonEpisodeMatch) {
    season = Number(seasonEpisodeMatch[1]);
    episode = Number(seasonEpisodeMatch[2]);
  }

  const episodeMatch = head.match(/\b(?:EP(?:ISODE)?|E)\s*\.?\s*(\d+)\b/i);
  if (episodeMatch && !seasonEpisodeMatch) {
    episode = Number(episodeMatch[1]);
  }

  const partMatch = head.match(/\b(?:PART|IGICE)\s*\.?\s*(\d+)\b/i);
  if (partMatch) {
    part = Number(partMatch[1]);
  }

  const isFinal =
    /\b(?:FINAL|LAST)\s+(?:EPISODE|EP|PART|IGICE)\b/i.test(head) ||
    /\b(?:EPISODE|EP|PART|IGICE)\s+(?:FINAL|LAST)\b/i.test(head) ||
    /\b(?:FINAL|LAST)\b/i.test(head);

  let orderNumber = 0;
  if (episode > 0) orderNumber = episode;
  else if (part > 0) orderNumber = part;
  else if (isFinal) orderNumber = 999999;
  else orderNumber = index + 1;

  return {
    id: post.id,
    title: post.head || "Untitled",
    image: post.imageUrl || post.image || "",
    season,
    episode,
    part,
    isFinal,
    orderNumber,
    story: post.story || "",
    content: post.content || post.story || "",
    author: post.author || "",
    accessType: post.accessType || "free",
    createdAt: firestoreDateToISO(post.createdAt),
    categories: Array.isArray(post.categories) ? post.categories : [],
    audioUrl: post.audioUrl || "",
    videoUrl: post.videoUrl || "",
  };
}

/*
|--------------------------------------------------------------------------
| USER COOKIE
|--------------------------------------------------------------------------
*/

function getCurrentUserFromCookie() {
  try {
    const rawCookie = Cookies.get("user");
    if (!rawCookie) return null;

    try {
      const parsed = JSON.parse(rawCookie);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      return { username: String(rawCookie).trim() };
    }

    return null;
  } catch (error) {
    console.error("User cookie error:", error);
    return null;
  }
}

/*
|--------------------------------------------------------------------------
| INDEXEDDB
|--------------------------------------------------------------------------
*/

const OFFLINE_DB_NAME = "newTalentsOfflineStories";
const OFFLINE_DB_VERSION = 1;
const OFFLINE_STORY_STORE = "stories";
const OFFLINE_EPISODE_STORE = "episodes";

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB ntabwo iboneka kuri browser."));
      return;
    }

    const request = window.indexedDB.open(
      OFFLINE_DB_NAME,
      OFFLINE_DB_VERSION
    );

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(OFFLINE_STORY_STORE)) {
        database.createObjectStore(OFFLINE_STORY_STORE, {
          keyPath: "storyKey",
        });
      }

      if (!database.objectStoreNames.contains(OFFLINE_EPISODE_STORE)) {
        const episodeStore = database.createObjectStore(
          OFFLINE_EPISODE_STORE,
          { keyPath: "episodeKey" }
        );

        episodeStore.createIndex("storyKey", "storyKey", {
          unique: false,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveWholeStoryOffline({
  storyId,
  title,
  image,
  author,
  episodes,
}) {
  const database = await openOfflineDB();
  const storyKey = String(storyId || normalizeStoryTitle(title));

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      [OFFLINE_STORY_STORE, OFFLINE_EPISODE_STORE],
      "readwrite"
    );

    const storyStore = transaction.objectStore(OFFLINE_STORY_STORE);
    const episodeStore = transaction.objectStore(OFFLINE_EPISODE_STORE);

    storyStore.put({
      storyKey,
      storyId: storyId || null,
      title: title || "Untitled",
      image: image || "",
      author: author || "",
      episodeCount: episodes.length,
      purchasedAt: new Date().toISOString(),
      offline: true,
    });

    episodes.forEach((episode) => {
      episodeStore.put({
        episodeKey: `${storyKey}_${episode.id}`,
        storyKey,
        storyId: storyId || null,
        episodeId: episode.id,
        title: episode.title,
        image: episode.image || "",
        season: episode.season,
        episode: episode.episode,
        part: episode.part,
        isFinal: episode.isFinal,
        orderNumber: episode.orderNumber,
        story: episode.story || "",
        content: episode.content || episode.story || "",
        audioUrl: episode.audioUrl || "",
        videoUrl: episode.videoUrl || "",
        author: episode.author || author || "",
        createdAt: episode.createdAt || null,
        savedAt: new Date().toISOString(),
      });
    });

    transaction.oncomplete = () => {
      database.close();
      resolve(true);
    };

    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };

    transaction.onabort = () => {
      database.close();
      reject(
        transaction.error || new Error("Offline transaction aborted.")
      );
    };
  });
}

async function isStoryOffline(storyId, title) {
  try {
    const database = await openOfflineDB();
    const storyKey = String(storyId || normalizeStoryTitle(title));

    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(
        OFFLINE_STORY_STORE,
        "readonly"
      );

      const store = transaction.objectStore(OFFLINE_STORY_STORE);
      const request = store.get(storyKey);

      request.onsuccess = () => {
        database.close();
        resolve(Boolean(request.result));
      };

      request.onerror = () => {
        database.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Offline check error:", error);
    return false;
  }
}

/*
|--------------------------------------------------------------------------
| VIEW TRACKING (WITH DUPLICATE PREVENTION)
|--------------------------------------------------------------------------
|
| Deterministic view ID:
|   ${username || visitorId}_${storyId}_${episode.id}
|
|  - Ibanza getDoc() kureba niba view isanzweho
|  - Niba isanzweho: skip (nta increment)
|  - Niba ntarabaho: setDoc() + updateDoc(post.views: increment(1))
|
|--------------------------------------------------------------------------
*/

async function trackStoryViews({
  episodes,
  storyId,
  title,
  author,
  username,
  visitorId,
  source,
}) {
  const ownerKey = username || visitorId;
  if (!ownerKey) return;

  const safeStoryId = String(storyId || normalizeStoryTitle(title));

  for (const episode of episodes) {
    try {
      if (!episode?.id) continue;

      const viewId = `${ownerKey}_${safeStoryId}_${episode.id}`;
      const viewRef = doc(db, "posts", episode.id, "views", viewId);

      const existingView = await getDoc(viewRef);

      if (existingView.exists()) {
        // Duplicate view — skip increment
        continue;
      }

      await setDoc(viewRef, {
        postId: episode.id,
        storyId: safeStoryId,
        storyTitle: title,
        episodeTitle: episode.title || null,
        season: episode.season || null,
        episodeNumber: episode.episode || null,
        part: episode.part || null,
        username: username || null,
        author,
        visitorId: visitorId || null,
        source,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "posts", episode.id), {
        views: increment(1),
      });
    } catch (viewError) {
      console.error(
        `View tracking error kuri post ${episode?.id}:`,
        viewError
      );
    }
  }
}

/*
|--------------------------------------------------------------------------
| SERVER SIDE PROPS
|--------------------------------------------------------------------------
*/

export async function getServerSideProps(context) {
  const rawTitle = context.params?.title;

  const requestedTitle = decodeURIComponent(
    Array.isArray(rawTitle) ? rawTitle[0] : rawTitle || ""
  );

  try {
    const postsSnapshot = await getDocs(
      query(collection(db, "posts"), orderBy("createdAt", "asc"))
    );

    const posts = postsSnapshot.docs.map((snapshot) => ({
      id: snapshot.id,
      ...snapshot.data(),
    }));

    let storyPosts = posts.filter((post) => {
      return (
        normalizeStoryTitle(getStoryTitle(post)) ===
        normalizeStoryTitle(requestedTitle)
      );
    });

    if (storyPosts.length === 0) {
      storyPosts = posts.filter((post) => {
        return (
          String(post.head || "")
            .trim()
            .toLowerCase() === requestedTitle.trim().toLowerCase()
        );
      });
    }

    if (storyPosts.length === 0) {
      return { notFound: true };
    }

    const firstStory = storyPosts[0];

    if (firstStory.storyId) {
      const sameStory = posts.filter(
        (post) => post.storyId === firstStory.storyId
      );
      if (sameStory.length > 0) storyPosts = sameStory;
    } else if (firstStory.summaryId) {
      const sameSummary = posts.filter(
        (post) => post.summaryId === firstStory.summaryId
      );
      if (sameSummary.length > 0) storyPosts = sameSummary;
    }

    storyPosts.sort(
      (a, b) => getPostTime(a.createdAt) - getPostTime(b.createdAt)
    );

    const mainStory = storyPosts[0];

    const resolvedStoryId =
      mainStory.storyId || mainStory.summaryId || mainStory.id;

    let summaryText = "";
    let summaryData = null;

    try {
      const summarySnapshot = await getDocs(
        collection(db, "posts", mainStory.id, "summaries")
      );

      if (!summarySnapshot.empty) {
        summaryData = summarySnapshot.docs[0].data();
        summaryText =
          summaryData.summary ||
          summaryData.text ||
          summaryData.content ||
          "";
      }
    } catch (error) {
      console.error("Summary lookup error:", error);
    }

    if (!summaryText.trim()) {
      summaryText = mainStory.story || mainStory.content || "";
    }

    let cleanSummary = stripHtml(summaryText);
    if (cleanSummary.length > 4000) {
      cleanSummary = cleanSummary.slice(0, 3997).trim() + "...";
    }

    const episodes = storyPosts.map((post, index) =>
      parseEpisodeInfo(post, index)
    );

    episodes.sort((a, b) => {
      if (a.season !== b.season) return a.season - b.season;
      if (a.orderNumber !== b.orderNumber)
        return a.orderNumber - b.orderNumber;
      return getPostTime(a.createdAt) - getPostTime(b.createdAt);
    });

    const isPremium = episodes.some(
      (episode) => episode.accessType === "paid"
    );

    const totalRating = storyPosts.reduce(
      (total, post) => total + Number(post.rating || 0),
      0
    );

    const ratingCount = storyPosts.reduce(
      (total, post) => total + Number(post.ratingCount || 0),
      0
    );

    const averageRating =
      ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : "0";

    const storyImage =
      episodes.find((episode) => episode.image)?.image ||
      mainStory.imageUrl ||
      mainStory.image ||
      "";

    const seasons = [
      ...new Set(episodes.map((episode) => episode.season)),
    ].sort((a, b) => a - b);

    const totalEpisodes = episodes.length;

    const numberedEpisodes = episodes
      .map((episode) => {
        if (episode.episode > 0) return episode.episode;
        if (episode.part > 0) return episode.part;
        return null;
      })
      .filter((number) => number !== null);

    const fromEpisode =
      numberedEpisodes.length > 0 ? Math.min(...numberedEpisodes) : 1;

    const toEpisode =
      numberedEpisodes.length > 0
        ? Math.max(...numberedEpisodes)
        : totalEpisodes;

    const seasonLabel =
      seasons.length === 1
        ? `S${String(seasons[0]).padStart(2, "0")}`
        : seasons.length > 1
        ? `${seasons.length} Seasons`
        : "S01";

    const author = mainStory.author || "Unknown";

    return {
      props: {
        title: getStoryTitle(mainStory) || requestedTitle,
        image: storyImage,
        episodes,
        averageRating,
        isPremium,
        summary: cleanSummary,
        author,
        publishedAt: firestoreDateToISO(mainStory.createdAt),
        hasSummary: summaryData !== null,
        totalEpisodes,
        season: seasonLabel,
        seasons,
        fromEpisode,
        toEpisode,
        categories: Array.isArray(mainStory.categories)
          ? mainStory.categories
          : [],
        folderId: mainStory.folderId || "",
        storyId: resolvedStoryId,
      },
    };
  } catch (error) {
    console.error("Story page error:", error);
    return { notFound: true };
  }
}

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function StoryPage({
  title,
  image,
  episodes,
  averageRating,
  isPremium,
  summary,
  author,
  publishedAt,
  hasSummary,
  totalEpisodes,
  season,
  seasons,
  fromEpisode,
  toEpisode,
  categories,
  storyId,
}) {
  const router = useRouter();
  const { t } = useI18n();

  const [activeEpisode, setActiveEpisode] = useState(null);
  const [loadingRating, setLoadingRating] = useState(false);
  const [readEpisodes, setReadEpisodes] = useState(new Set());
  const [isExpanded, setIsExpanded] = useState(false);
  const [user, setUser] = useState(null);
  const [userNES, setUserNES] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [hasContentLicense, setHasContentLicense] = useState(false);
  const [wholeStoryOwned, setWholeStoryOwned] = useState(false);
  const [buyingStory, setBuyingStory] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | PRICE
  |--------------------------------------------------------------------------
  */

  const wholeStoryPrice = Math.max(0, Number(totalEpisodes || 0));

  /*
  |--------------------------------------------------------------------------
  | ACCESS DERIVED STATE
  |--------------------------------------------------------------------------
  */

  const hasMemberAccess = isMember === true;
  const hasLicensingAccess = hasContentLicense === true;

  // Content licensing has highest priority (online only)
  const licensingOnlineOnly = hasLicensingAccess;

  // Buy allowed: premium + not member + not licensing + not already owned
  const canBuyWholeStory =
    !licensingOnlineOnly &&
    isPremium &&
    !hasMemberAccess &&
    !wholeStoryOwned;

  // Save offline allowed: not licensing + (member OR free)
  const canSaveOffline =
    !licensingOnlineOnly && (hasMemberAccess || !isPremium);

  // Re-save allowed when already owned but IndexedDB yasibwe
  const canReSaveOffline =
    !licensingOnlineOnly && wholeStoryOwned && !offlineReady;

  // Show action section
  const showActionSection =
    !licensingOnlineOnly &&
    (canBuyWholeStory || canSaveOffline || canReSaveOffline) &&
    !(wholeStoryOwned && offlineReady);

  /*
  |--------------------------------------------------------------------------
  | CURRENT USER
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (typeof window === "undefined") return;
    setUser(getCurrentUserFromCookie());
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOAD ACCESS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!user?.username) return;

    let cancelled = false;

    async function loadAccess() {
      try {
        const username = String(user.username).trim();

        // DEPOSITERS
        const depositerRef = doc(db, "depositers", username);
        const depositerSnap = await getDoc(depositerRef);

        if (depositerSnap.exists()) {
          const data = depositerSnap.data();
          const nes = Number(
            data.nes ?? data.NES ?? data.balance ?? 0
          );

          const memberFromUser = Boolean(
            data.isMember || data.member || data.membership
          );
          const licenseFromUser = Boolean(
            data.contentLicensing ||
              data.hasContentLicense ||
              data.contentLicense
          );

          if (!cancelled) {
            setUserNES(nes);
            setIsMember(memberFromUser);
            setHasContentLicense(licenseFromUser);
          }
        }

        // MEMBERS collection
        try {
          const memberRef = doc(db, "members", username);
          const memberSnap = await getDoc(memberRef);

          if (memberSnap.exists() && !cancelled) {
            const data = memberSnap.data();
            if (data.active === true || data.status === "active") {
              setIsMember(true);
            }
          }
        } catch (error) {
          console.warn("Member lookup skipped:", error);
        }

        // CONTENT LICENSING collection
        try {
          const licenseRef = doc(db, "contentLicensing", username);
          const licenseSnap = await getDoc(licenseRef);

          if (licenseSnap.exists() && !cancelled) {
            const data = licenseSnap.data();
            if (data.active === true || data.status === "active") {
              setHasContentLicense(true);
            }
          }
        } catch (error) {
          console.warn("Content license lookup skipped:", error);
        }

        // PURCHASE RECORD
        const purchaseId = `${username}_${storyId}`;
        const purchaseRef = doc(db, "storyPurchases", purchaseId);
        const purchaseSnap = await getDoc(purchaseRef);

        if (purchaseSnap.exists() && !cancelled) {
          const purchase = purchaseSnap.data();
          if (
            purchase.completed === true ||
            purchase.status === "completed"
          ) {
            setWholeStoryOwned(true);
          }
        }

        // OFFLINE STATE
        const offline = await isStoryOffline(storyId, title);
        if (!cancelled) setOfflineReady(offline);
      } catch (error) {
        console.error("Access loading error:", error);
      }
    }

    loadAccess();

    return () => {
      cancelled = true;
    };
  }, [user?.username, storyId, title]);

  /*
  |--------------------------------------------------------------------------
  | ACTIVE EPISODE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("activeEpisode");
      if (saved) setActiveEpisode(saved);
    } catch (error) {
      console.error("Active episode error:", error);
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | READING HISTORY
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (typeof window === "undefined") return;

    async function loadReadingHistory() {
      try {
        const currentUser = getCurrentUserFromCookie();
        const username = currentUser?.username;
        if (!username) return;

        const historySnapshot = await getDocs(
          collection(db, "reading", username, "history")
        );

        const ids = new Set();
        historySnapshot.forEach((snapshot) => {
          const data = snapshot.data();
          if (data.postId) ids.add(data.postId);
        });

        setReadEpisodes(ids);
      } catch (error) {
        console.error("Reading history error:", error);
      }
    }

    loadReadingHistory();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | NES SHARE TRACKING
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (typeof window === "undefined" || !router.isReady) return;

    const rawTaskId = router.query.nesTask;
    const taskId = Array.isArray(rawTaskId) ? rawTaskId[0] : rawTaskId;

    if (!taskId) return;

    let cancelled = false;

    async function trackShareClick() {
      try {
        const taskIdString = String(taskId).trim();
        if (!taskIdString) return;

        let visitorId = localStorage.getItem("nesMineVisitorId");
        if (!visitorId) {
          visitorId = `visitor_${Date.now().toString(36)}_${Math.random()
            .toString(36)
            .slice(2, 12)}`;
          localStorage.setItem("nesMineVisitorId", visitorId);
        }

        const taskRef = doc(db, "nesGameTasks", taskIdString);
        const taskSnap = await getDoc(taskRef);
        if (!taskSnap.exists()) return;

        const task = taskSnap.data();
        if (task.type !== "share" || task.status !== "active") return;

        let expiresAt = null;
        if (task.expiresAt && typeof task.expiresAt.toMillis === "function") {
          expiresAt = task.expiresAt.toMillis();
        } else if (task.expiresAt?.seconds !== undefined) {
          expiresAt = Number(task.expiresAt.seconds) * 1000;
        } else if (typeof task.expiresAt === "number") {
          expiresAt = task.expiresAt;
        }

        if (expiresAt && Date.now() > expiresAt) return;

        const currentUser = getCurrentUserFromCookie();
        const username = currentUser?.username || null;

        const normalizedUser = username
          ? String(username).trim().toLowerCase()
          : "";
        const normalizedOwner = task.username
          ? String(task.username).trim().toLowerCase()
          : "";

        if (
          normalizedUser &&
          normalizedOwner &&
          normalizedUser === normalizedOwner
        ) {
          return;
        }

        const clickId = `${taskIdString}_${visitorId}`;
        const clickRef = doc(db, "nesShareClicks", clickId);
        const existingClick = await getDoc(clickRef);

        if (existingClick.exists() || cancelled) return;

        await setDoc(clickRef, {
          taskId: taskIdString,
          visitorId,
          username,
          taskOwner: task.username || null,
          postId: task.postId || router.query.id || null,
          storyId: task.storyId || storyId || null,
          storyTitle: task.storyTitle || title || null,
          createdAt: serverTimestamp(),
          source: "nesMineShare",
          userAgent: navigator.userAgent || null,
        });
      } catch (error) {
        console.error("NES share tracking error:", error);
      }
    }

    trackShareClick();

    return () => {
      cancelled = true;
    };
  }, [
    router.isReady,
    router.query.nesTask,
    router.query.id,
    storyId,
    title,
  ]);

  /*
  |--------------------------------------------------------------------------
  | WHOLE STORY ACTION
  |--------------------------------------------------------------------------
  |
  | This single handler covers:
  |
  |  1. FREE story (normal user or member)  → save offline only
  |  2. PREMIUM story + MEMBER              → save offline + author paid
  |  3. PREMIUM story + NORMAL USER         → buy (NES user - / NES author +)
  |  4. Already owned but offline lost      → re-save offline (no payment)
  |
  | Content licensing users NEVER reach this handler.
  |
  |--------------------------------------------------------------------------
  */

  const handleWholeStoryAction = async () => {
    if (buyingStory) return;

    if (!user?.username) {
      alert(t("Ugomba kubanza kwinjira muri konti yawe."));
      return;
    }

    if (hasLicensingAccess) {
      alert(
        t("Content licensing access ni ya online gusa. Ntushobora kubika story offline.")
      );
      return;
    }

    if (offlineReady) {
      alert(t("Iyi nkuru isanzwe ibitswe kuri offline."));
      return;
    }

    const isMemberUser = hasMemberAccess;
    const needsPayment = isPremium && !isMemberUser;
    const shouldSaveOnly = isMemberUser || !isPremium;

    // Price sanity check
    if (needsPayment && wholeStoryPrice <= 0) {
      alert(t("Iyi nkuru nta episodes ifite."));
      return;
    }

    // Local NES check (fast fail)
    if (needsPayment && userNES < wholeStoryPrice) {
      alert(
        t("Nta NES zihagije. Ukeneye {wholeStoryPrice} NES. Ufite {userNES} NES.", { wholeStoryPrice, userNES })
      );
      return;
    }

    // Confirmation
    let confirmMsg;
    if (needsPayment) {
      confirmMsg = `Iyi nkuru ifite ${totalEpisodes} episodes/parts. Igiciro ni ${wholeStoryPrice} NES. Ushaka gukomeza?`;
    } else if (isPremium && isMemberUser) {
      confirmMsg = `Ufite membership. Ushaka kubika episodes ${totalEpisodes} zose kuri offline?`;
    } else {
      confirmMsg = `Iyi nkuru ni free. Ushaka kubika episodes ${totalEpisodes} zose kuri offline?`;
    }

    if (!window.confirm(confirmMsg)) return;

    setBuyingStory(true);

    try {
      const username = String(user.username).trim();
      const depositerRef = doc(db, "depositers", username);
      const purchaseId = `${username}_${storyId}`;
      const purchaseRef = doc(db, "storyPurchases", purchaseId);
      const authorId = String(author || "").trim();
      const authorRef = authorId ? doc(db, "authors", authorId) : null;

      // ------------------------------------------------------------
      // Check existing purchase record (duplicate prevention)
      // ------------------------------------------------------------
      const purchaseSnap = await getDoc(purchaseRef);
      const alreadyRecorded =
        purchaseSnap.exists() &&
        (purchaseSnap.data().completed === true ||
          purchaseSnap.data().status === "completed");

      // ------------------------------------------------------------
      // CASE 1: PREMIUM + NORMAL USER → BUY (NES user → author)
      // ------------------------------------------------------------
      if (needsPayment && !alreadyRecorded) {
        const depositerSnap = await getDoc(depositerRef);
        if (!depositerSnap.exists()) {
          throw new Error("DEPOSITER_NOT_FOUND");
        }

        const currentNES = Number(
          depositerSnap.data().nes ??
            depositerSnap.data().NES ??
            depositerSnap.data().balance ??
            0
        );

        if (currentNES < wholeStoryPrice) {
          throw new Error("INSUFFICIENT_NES");
        }

        // Deduct from user
        await updateDoc(depositerRef, {
          nes: increment(-wholeStoryPrice),
          updatedAt: serverTimestamp(),
        });

        // Pay author
        if (authorRef) {
          await setDoc(
            authorRef,
            {
              nes: increment(wholeStoryPrice),
              totalViews: increment(totalEpisodes),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        // Purchase record
        await setDoc(purchaseRef, {
          username,
          storyId: storyId || null,
          storyTitle: title,
          author,
          price: wholeStoryPrice,
          originalPrice: wholeStoryPrice,
          episodeCount: totalEpisodes,
          status: "completed",
          completed: true,
          accessMethod: "nes",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setUserNES((prev) => Math.max(0, prev - wholeStoryPrice));
      }

      // ------------------------------------------------------------
      // CASE 2: PREMIUM + MEMBER → SAVE OFFLINE, AUTHOR STILL PAID
      // ------------------------------------------------------------
      else if (isPremium && isMemberUser && !alreadyRecorded) {
        if (authorRef) {
          await setDoc(
            authorRef,
            {
              nes: increment(wholeStoryPrice),
              totalViews: increment(totalEpisodes),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        await setDoc(purchaseRef, {
          username,
          storyId: storyId || null,
          storyTitle: title,
          author,
          price: 0,
          originalPrice: wholeStoryPrice,
          episodeCount: totalEpisodes,
          status: "completed",
          completed: true,
          accessMethod: "member",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // ------------------------------------------------------------
      // CASE 3: FREE STORY → SAVE OFFLINE, NO PAYMENT
      // (Optional save record for UI state; no NES flow)
      // ------------------------------------------------------------
      else if (!isPremium && !alreadyRecorded) {
        // Free story: nta payment. Ntitwiga purchase record
        // keretse niba ushaka — hano turabika record yoroshye
        // kugira ngo UI ibone ko yabitswe.
        await setDoc(purchaseRef, {
          username,
          storyId: storyId || null,
          storyTitle: title,
          author,
          price: 0,
          originalPrice: 0,
          episodeCount: totalEpisodes,
          status: "completed",
          completed: true,
          accessMethod: "free",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // ------------------------------------------------------------
      // Save to IndexedDB (all cases)
      // ------------------------------------------------------------
      await saveWholeStoryOffline({
        storyId,
        title,
        image,
        author,
        episodes,
      });

      setWholeStoryOwned(true);
      setOfflineReady(true);

      // ------------------------------------------------------------
      // Track views (with duplicate prevention)
      // ------------------------------------------------------------
      const visitorId =
        (typeof window !== "undefined" &&
          localStorage.getItem("nesMineVisitorId")) ||
        null;

      const viewSource = needsPayment
        ? "storyPurchase"
        : isPremium && isMemberUser
        ? "memberSave"
        : "freeSave";

      await trackStoryViews({
        episodes,
        storyId,
        title,
        author,
        username,
        visitorId,
        source: viewSource,
      });

      // ------------------------------------------------------------
      // Success alert
      // ------------------------------------------------------------
      if (needsPayment) {
        alert(
          t("Byarangiye neza. {totalEpisodes} episodes zabitswe kuri offline. {wholeStoryPrice} NES zakuwe kuri konti yawe, zijya kuri author.", { totalEpisodes, wholeStoryPrice })
        );
      } else if (isPremium && isMemberUser) {
        alert(
          t("Byarangiye neza. {totalEpisodes} episodes zabitswe kuri offline. Nk'umunyamuryango, nta NES zakuwe kuri konti yawe. Author yahawe {wholeStoryPrice} NES.", { totalEpisodes, wholeStoryPrice })
        );
      } else {
        alert(
          t("Byarangiye neza. {totalEpisodes} episodes zabitswe kuri offline.", { totalEpisodes })
        );
      }
    } catch (error) {
      console.error("Whole story action error:", error);

      switch (error?.message) {
        case "ALREADY_PURCHASED":
          setWholeStoryOwned(true);
          alert(t("Iyi nkuru warayiguze mbere."));
          break;
        case "DEPOSITER_NOT_FOUND":
          alert(t("Konti yawe ntiyabonetse muri depositers collection."));
          break;
        case "INSUFFICIENT_NES":
          alert(t("Nta NES zihagije. Ukeneye {wholeStoryPrice} NES.", { wholeStoryPrice }));
          break;
        case "OFFLINE_SAVE_FAILED":
          alert(t("Ntibyashobotse kubika inkuru kuri offline."));
          break;
        default:
          alert(
            t("Igikorwa cyanze. Reba internet yawe cyangwa wongere ugerageze.")
          );
      }
    } finally {
      setBuyingStory(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | RATING
  |--------------------------------------------------------------------------
  */

  const rateStory = async (stars) => {
    if (loadingRating) return;

    const storyRateKey = `rated_${normalizeStoryTitle(title)}`;

    try {
      const alreadyRated = localStorage.getItem(storyRateKey);
      if (alreadyRated) {
        alert(t("Wamaze gutanga rating kuri iyi nkuru."));
        return;
      }

      const firstEpisode = episodes[0];
      if (!firstEpisode?.id) return;

      setLoadingRating(true);

      await updateDoc(doc(db, "posts", firstEpisode.id), {
        rating: increment(Number(stars)),
        ratingCount: increment(1),
      });

      localStorage.setItem(storyRateKey, "true");

      alert(t("Murakoze ku rating!"));
      window.location.reload();
    } catch (error) {
      console.error("Rating error:", error);
      alert(t("Rating ntiyabashije kubikwa."));
    } finally {
      setLoadingRating(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | SUMMARY
  |--------------------------------------------------------------------------
  */

  const toggleSummary = () => {
    setIsExpanded((previous) => !previous);
  };

  /*
  |--------------------------------------------------------------------------
  | SEO
  |--------------------------------------------------------------------------
  */

  const metaDescription = summary?.slice(0, 160) || `Soma ${title}`;
  const ogDescription =
    summary?.slice(0, 200) ||
    `Episodes: ${totalEpisodes} | Rating: ${averageRating}`;
  const storyUrl = `https://www.newtalentsg.co.rw/story/${encodeURIComponent(
    title
  )}`;

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <>
    
      <Head>
  {/* =========================================================
      BASIC SEO
  ========================================================== */}

  <title>{t("{title} | New Talents Stories", { title })}</title>

  <meta
    name="description"
    content={
      metaDescription ||
      `Soma ${title} kuri New Talents Stories.`
    }
  />

  <meta
    name="author"
    content={author || "New Talents Stories Group"}
  />

  <meta
    name="robots"
    content="index, follow, max-image-preview:large"
  />

  <meta
    name="googlebot"
    content="index, follow, max-image-preview:large"
  />

  <meta
    name="bingbot"
    content="index, follow, max-image-preview:large"
  />

  <meta
    name="keywords"
    content={categories?.length ? categories.join(", ") : title}
  />

  <meta name="language" content="rw" />
  <meta name="content-language" content="rw" />

  <link rel="canonical" href={storyUrl} />

  {/* =========================================================
      FAVICON / BRAND
  ========================================================== */}

  <link
    rel="icon"
    href="/favicon.ico"
  />

  <link
    rel="apple-touch-icon"
    href="/logo.png"
  />

  <meta
    name="application-name"
    content="New Talents Stories"
  />

  <meta
    name="theme-color"
    content="#070b14"
  />

  {/* =========================================================
      OPEN GRAPH
  ========================================================== */}

  <meta property="og:type" content="article" />

  <meta
    property="og:url"
    content={storyUrl}
  />

  <meta
    property="og:title"
    content={`${title} | New Talents Stories`}
  />

  <meta
    property="og:description"
    content={
      ogDescription ||
      `Soma ${title} kuri New Talents Stories.`
    }
  />

  <meta
    property="og:site_name"
    content="New Talents Stories Group"
  />

  <meta
    property="og:locale"
    content="rw_RW"
  />

  {/* IMPORTANT:
      image igomba kuba absolute URL.
  */}

  <meta
    property="og:image"
    content={image}
  />

  <meta
    property="og:image:secure_url"
    content={image}
  />

  <meta
    property="og:image:type"
    content="image/jpeg"
  />

  <meta
    property="og:image:alt"
    content={title}
  />

  <meta
    property="og:image:width"
    content="1200"
  />

  <meta
    property="og:image:height"
    content="630"
  />

  {/* =========================================================
      ARTICLE INFORMATION
  ========================================================== */}

  {publishedAt && (
    <meta
      property="article:published_time"
      content={publishedAt}
    />
  )}

  {publishedAt && (
    <meta
      property="article:modified_time"
      content={publishedAt}
    />
  )}

  <meta
    property="article:author"
    content={author}
  />

  <meta
    property="article:section"
    content={categories?.[0] || "Stories"}
  />

  {categories?.map((category) => (
    <meta
      key={`article-tag-${category}`}
      property="article:tag"
      content={category}
    />
  ))}

  {/* =========================================================
      TWITTER / X
  ========================================================== */}

  <meta
    name="twitter:card"
    content="summary_large_image"
  />

  <meta
    name="twitter:url"
    content={storyUrl}
  />

  <meta
    name="twitter:title"
    content={`${title} | New Talents Stories`}
  />

  <meta
    name="twitter:description"
    content={
      metaDescription ||
      `Soma ${title} kuri New Talents Stories.`
    }
  />

  <meta
    name="twitter:image"
    content={image}
  />

  <meta
    name="twitter:image:alt"
    content={title}
  />

  {/* =========================================================
      JSON-LD: BREADCRUMB
  ========================================================== */}

  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://www.newtalentsg.co.rw",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Stories",
            item: "https://www.newtalentsg.co.rw/stories",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: title,
            item: storyUrl,
          },
        ],
      }),
    }}
  />

  {/* =========================================================
      JSON-LD: WEBPAGE
  ========================================================== */}

  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": storyUrl,
        url: storyUrl,
        name: `${title} | New Talents Stories`,
        description:
          metaDescription ||
          `Soma ${title} kuri New Talents Stories.`,
        inLanguage: "rw",
        isPartOf: {
          "@type": "WebSite",
          "@id": "https://www.newtalentsg.co.rw/#website",
          name: "New Talents Stories",
          url: "https://www.newtalentsg.co.rw",
        },
        primaryImageOfPage: image
          ? {
              "@type": "ImageObject",
              url: image,
            }
          : undefined,
        mainEntity: {
          "@id": `${storyUrl}#article`,
        },
      }),
    }}
  />

  {/* =========================================================
      JSON-LD: ARTICLE
  ========================================================== */}

  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "@id": `${storyUrl}#article`,

        headline: title,

        description:
          metaDescription ||
          `Soma ${title} kuri New Talents Stories.`,

        image: image
          ? [
              {
                "@type": "ImageObject",
                url: image,
                width: 1200,
                height: 630,
              },
            ]
          : [
              {
                "@type": "ImageObject",
                url: "https://www.newtalentsg.co.rw/logo.png",
              },
            ],

        author: {
          "@type": "Person",
          name: author || "Unknown",
        },

        publisher: {
          "@type": "Organization",
          name: "New Talents Stories Group",
          url: "https://www.newtalentsg.co.rw",
          logo: {
            "@type": "ImageObject",
            url: "https://www.newtalentsg.co.rw/logo.png",
          },
        },

        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": storyUrl,
        },

        url: storyUrl,

        ...(publishedAt
          ? {
              datePublished: publishedAt,
              dateModified: publishedAt,
            }
          : {}),

        inLanguage: "rw",

        articleSection:
          categories?.[0] || "Stories",

        keywords:
          categories?.length
            ? categories.join(", ")
            : title,
      }),
    }}
  />

  {/* =========================================================
      JSON-LD: EPISODES LIST
  ========================================================== */}

  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${title} Episodes`,
        numberOfItems: totalEpisodes,
        itemListElement: episodes.map((episode, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: episode.title,
          url: `https://www.newtalentsg.co.rw/post/${episode.id}`,
        })),
      }),
    }}
  />
</Head>

      <div className={styles.storyContainer}>
        {/* =========================================================
            HERO
        ========================================================== */}

        <div className={styles.heroSection}>
          {image && (
            <img src={image} alt={title} className={styles.heroImage} />
          )}

          <div className={styles.heroOverlay}>
            <h1 className={styles.heroTitle}>{title}</h1>

            <div className={styles.badgesContainer}>
              <div
                className={`${styles.badge} ${
                  isPremium ? styles.badgePremium : styles.badgeFree
                }`}
              >
                {isPremium ? t("home.premium") : t("home.free")}
              </div>

              {season && (
                <div className={`${styles.badge} ${styles.badgeSeason}`}>
                  {season}
                </div>
              )}

              {categories.length > 0 && (
                <div
                  className={`${styles.badge} ${styles.badgeCategory}`}
                >
                  {categories.slice(0, 2).join(", ")}
                  {categories.length > 2 && "..."}
                </div>
              )}
            </div>

            <p className={styles.storyInfo}>
              {t("story.totalEpisodes", { count: totalEpisodes })}
            </p>

            <p className={styles.storyInfoSmall}>
              {seasons.length > 1
                ? t("story.seasons", { list: seasons.join(", ") })
                : t("story.episodeRange", { from: fromEpisode, to: toEpisode })}
            </p>

            {/* =====================================================
                CONTENT LICENSING — ONLINE ONLY
            ====================================================== */}

            {hasLicensingAccess && (
              <div
                style={{
                  marginTop: "18px",
                  marginBottom: "18px",
                  padding: "16px",
                  borderRadius: "14px",
                  background:
                    "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(236,72,153,0.12))",
                  border: "1px solid rgba(165,180,252,0.35)",
                }}
              >
                <div
                  style={{
                    fontWeight: "700",
                    fontSize: "18px",
                    marginBottom: "6px",
                  }}
                >{t("🎟️ Content Licensing Access")}</div>
                <div
                  style={{
                    fontSize: "14px",
                    opacity: 0.9,
                    lineHeight: 1.55,
                  }}
                >{t("Ufite content licensing. Tangira usome story online ukoresheje")}{" "}<strong>{t("\"Start Reading\"")}</strong>.
                  <br />{t("Iyi access")}{" "}<strong>{t("ntabwo ibika story offline")}</strong>.
                </div>
              </div>
            )}

            {/* =====================================================
                BUY / SAVE WHOLE STORY (only if NOT licensing)
            ====================================================== */}

            {!hasLicensingAccess && showActionSection && (
              <div
                style={{
                  marginTop: "18px",
                  marginBottom: "18px",
                  padding: "16px",
                  borderRadius: "14px",
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <div
                  style={{
                    fontWeight: "700",
                    fontSize: "18px",
                    marginBottom: "6px",
                  }}
                >
                  {canBuyWholeStory
                    ? t("📚 Buy Whole Story")
                    : t("📥 Save Whole Story Offline")}
                </div>

                <div
                  style={{
                    fontSize: "14px",
                    opacity: 0.85,
                    marginBottom: "12px",
                  }}
                >
                  {canBuyWholeStory ? (
                    <>{t("Iyi nkuru ifite")}{" "}
                      <strong>{totalEpisodes}</strong>{" "}{t("episodes/parts. Igiciro ni")}{" "}
                      <strong>{t("{wholeStoryPrice} NES", { wholeStoryPrice })}</strong>.
                    </>
                  ) : (
                    <>{t("Iyi nkuru ifite")}{" "}
                      <strong>{totalEpisodes}</strong> episodes/parts.{" "}
                      {isPremium && hasMemberAccess
                        ? t("Nk'umunyamuryango, uzayibika offline nta NES gukatwa.")
                        : t("Uzayibika kuri offline kugira ngo uzisome utarayifite internet.")}
                    </>
                  )}
                </div>

                {user?.username && !canReSaveOffline && (
                  <div
                    style={{
                      fontSize: "13px",
                      marginBottom: "12px",
                      opacity: 0.8,
                    }}
                  >{t("NES ufite:")}{" "}<strong>{userNES}</strong>
                  </div>
                )}

                {canReSaveOffline && (
                  <div
                    style={{
                      fontSize: "13px",
                      marginBottom: "12px",
                      opacity: 0.85,
                    }}
                  >{t("ℹ️ IndexedDB yasibwe. Ongera ubike nta kwishyura.")}</div>
                )}

                <button
                  type="button"
                  onClick={handleWholeStoryAction}
                  disabled={buyingStory}
                  style={{
                    width: "100%",
                    border: "none",
                    borderRadius: "10px",
                    padding: "13px 18px",
                    cursor: buyingStory ? "wait" : "pointer",
                    fontWeight: "700",
                    fontSize: "15px",
                    opacity: buyingStory ? 0.6 : 1,
                    background: canBuyWholeStory
                      ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)"
                      : "linear-gradient(135deg, #10b981 0%, #22d3ee 100%)",
                    color: "#ffffff",
                    boxShadow: canBuyWholeStory
                      ? "0 8px 22px rgba(139, 92, 246, 0.5)"
                      : "0 8px 22px rgba(16, 185, 129, 0.45)",
                  }}
                >
                  {buyingStory
                    ? t("⏳ Processing...")
                    : canBuyWholeStory
                    ? t("💰 Buy Whole Story • {wholeStoryPrice} NES", { wholeStoryPrice })
                    : canReSaveOffline
                    ? t("📥 Re-save Offline")
                    : t("📥 Save Whole Story Offline")}
                </button>
              </div>
            )}

            {/* =====================================================
                OWNED / SAVED BANNER
            ====================================================== */}

            {offlineReady && (
              <div
                style={{
                  marginTop: "18px",
                  marginBottom: "18px",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "rgba(0,150,80,0.18)",
                  border: "1px solid rgba(0,200,120,0.3)",
                }}
              >
                <strong>
                  ✅{" "}
                  {isPremium && !hasMemberAccess
                    ? t("Whole Story Owned")
                    : t("Whole Story Saved Offline")}
                </strong>

                <div style={{ fontSize: "13px", marginTop: "5px" }}>{t("📥 Episodes zose zibitswe kuri offline.")}</div>
              </div>
            )}

            {/* =====================================================
                ACTIONS
            ====================================================== */}

            <div className={styles.actionsContainer}>
              {episodes[0] && (
                <Link
                  href={`/post/${episodes[0].id}`}
                  className={styles.startReadingBtn}
                >{t("▶ Start Reading")}</Link>
              )}

              <div className={styles.ratingContainer}>
                ⭐ {averageRating}

                <div className={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => rateStory(star)}
                      disabled={loadingRating}
                      className={styles.ratingStarBtn}
                      aria-label={t("Rate {star} stars", { star })}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
            SUMMARY
        ========================================================== */}

        <div className={styles.summaryLabel}>
          <span className={styles.summaryIcon}>📝</span>
          {hasSummary ? t("Summary") : t("Story Preview")}
        </div>

        {summary && (
          <div
            className={`${styles.summaryContainer} ${
              isExpanded ? styles.expanded : ""
            }`}
          >
            <div className={styles.summaryContent}>
              <p className={styles.summaryText}>{summary}</p>
            </div>

            {summary.length > 700 && (
              <button
                type="button"
                className={styles.summaryToggle}
                onClick={toggleSummary}
              >
                {isExpanded ? t("story.showLess") : t("story.readMore")}
              </button>
            )}
          </div>
        )}

        {/* =========================================================
            EPISODES
        ========================================================== */}

        <h2 className={styles.episodesTitle}>
          {t("story.episodesHeading", { count: totalEpisodes })}
        </h2>

        <ContinueRead />
        <AdsBanner />

        <div className={styles.episodesGrid}>
          {episodes.map((episode) => {
            const displayNumber =
              episode.episode > 0
                ? `EP${String(episode.episode).padStart(2, "0")}`
                : episode.part > 0
                ? `PART ${episode.part}`
                : episode.isFinal
                ? "FINAL"
                : "EP";

            return (
              <Link
                key={episode.id}
                href={`/post/${episode.id}`}
                onClick={() => {
                  try {
                    localStorage.setItem("activeEpisode", episode.id);
                  } catch (error) {
                    console.error("Active episode save error:", error);
                  }
                }}
                className={`${styles.episodeCard} ${
                  activeEpisode === episode.id ? styles.active : ""
                } ${readEpisodes.has(episode.id) ? styles.read : ""}`}
              >
                <div className={styles.episodeIcon}>📖</div>

                <div className={styles.episodeInfo}>
                  <div className={styles.episodeNumber}>
                    {episode.isFinal
                      ? `S${String(episode.season).padStart(
                          2,
                          "0"
                        )} FINAL`
                      : `S${String(episode.season).padStart(
                          2,
                          "0"
                        )} ${displayNumber}`}
                  </div>

                  <div className={styles.episodeTitle}>
                    {episode.title}
                  </div>
                </div>

                <div className={styles.episodeStatus}>
                  {readEpisodes.has(episode.id)
                    ? "✅"
                    : activeEpisode === episode.id
                    ? "▶"
                    : "➜"}
                </div>
              </Link>
            );
          })}
        </div>

        {/* =========================================================
            FOOTER INFO
        ========================================================== */}

        <div className={styles.footerInfo}>
          <p>
            <strong>{t("Story Info:")}</strong> {title} | {season} |{" "}{t("{totalEpisodes} episodes", { totalEpisodes })}{categories.length > 0 &&
              ` | Categories: ${categories.join(", ")}`}
          </p>

          <p>
            <strong>{t("Author:")}</strong> {author} |{" "}
            <strong>{t("Published:")}</strong>{" "}
            {publishedAt
              ? new Date(publishedAt).toLocaleDateString()
              : t("Unknown")}
          </p>

          <p>
            <strong>{t("Rating:")}</strong> {averageRating} ⭐ |{" "}
            <strong>{t("Type:")}</strong> {isPremium ? t("Premium") : t("Free")}
          </p>

          {storyId && (
            <p>
              <strong>{t("Story ID:")}</strong> {storyId}
            </p>
          )}

          {hasLicensingAccess && (
            <p>
              <strong>{t("Access:")}</strong>{" "}{t("🎟️ Content Licensing (Online Only)")}</p>
          )}

          {hasMemberAccess && !hasLicensingAccess && (
            <p>
              <strong>{t("Access:")}</strong>{" "}{t("👤 Member")}</p>
          )}

          {isPremium && !hasLicensingAccess && (
            <p>
              <strong>{t("Whole Story:")}</strong>{" "}
              {wholeStoryOwned
                ? offlineReady
                  ? t("Owned | Offline Ready")
                  : t("Owned | Offline Not Ready")
                : t("{wholeStoryPrice} NES", { wholeStoryPrice })}
            </p>
          )}

          {!isPremium && offlineReady && (
            <p>
              <strong>{t("Offline:")}</strong>{" "}{t("✅ Saved Offline")}</p>
          )}
        </div>
      </div>
    </>
  );
}
