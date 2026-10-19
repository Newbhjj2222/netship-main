import { useEffect, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import { db } from "../../components/firebase";
import Cookies from "js-cookie";

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
import styles from "@/styles/story.module.css";
import { useI18n } from "@/i18n/I18nProvider";

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

/*
|--------------------------------------------------------------------------
| STRIP HTML
|--------------------------------------------------------------------------
|
| Ikuraho:
| <div>
| </div>
| <br>
| <p>
| <strong>
| n'izindi HTML tags.
|
| Dukoresha space aho guhita dukuraho tag,
| kugira ngo amagambo atifatanye.
|--------------------------------------------------------------------------
*/

function stripHtml(value = "") {
  return String(value || "")
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )
    .replace(
      /<br\s*\/?>/gi,
      " "
    )
    .replace(
      /<\/div>/gi,
      " "
    )
    .replace(
      /<div[^>]*>/gi,
      " "
    )
    .replace(
      /<[^>]+>/g,
      " "
    )
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&#39;|&#x27;/gi,
      "'"
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

/*
|--------------------------------------------------------------------------
| CLEAN STORY TITLE
|--------------------------------------------------------------------------
|
| Examples:
|
| INKURU
| INKURU EP 1
| INKURU EP01
| INKURU EPISODE 1
| INKURU S01 EP01
| INKURU S1 EP 1
| INKURU SEASON 1 EPISODE 1
| INKURU S01EP01
| INKURU PART 1
| INKURU PART01
| INKURU IGICE 1
| INKURU FINAL
| INKURU LAST
| INKURU FINAL EPISODE
| INKURU EPISODE FINAL
|--------------------------------------------------------------------------
*/

function cleanStoryTitle(head = "") {
  let title = String(head || "")
    .replace(/\s+/g, " ")
    .trim();

  const patterns = [
    /*
    ------------------------------------------------------------
    SEASON + EPISODE
    ------------------------------------------------------------
    */

    /\s+\bS(?:EASON)?\s*\d+\s*(?:EP(?:ISODE)?|E)\s*\.?\s*\d+\b/gi,

    /*
    ------------------------------------------------------------
    EPISODE NUMBER
    ------------------------------------------------------------
    */

    /\s+\b(?:EP(?:ISODE)?|E)\s*\.?\s*\d+\b/gi,

    /*
    ------------------------------------------------------------
    NUMBER + EPISODE
    ------------------------------------------------------------
    */

    /\s+\b\d+\s+(?:EP(?:ISODE)?|E)\b/gi,

    /*
    ------------------------------------------------------------
    PART NUMBER
    ------------------------------------------------------------
    */

    /\s+\b(?:PART|IGICE)\s*\.?\s*\d+\b/gi,

    /*
    ------------------------------------------------------------
    NUMBER + PART
    ------------------------------------------------------------
    */

    /\s+\b\d+\s+(?:PART|IGICE)\b/gi,

    /*
    ------------------------------------------------------------
    FINAL EPISODE / FINAL PART
    ------------------------------------------------------------
    */

    /\s+\b(?:THE\s+)?(?:FINAL|LAST)\s+(?:EPISODE|EP|PART|IGICE)\b/gi,

    /*
    ------------------------------------------------------------
    EPISODE FINAL / PART FINAL
    ------------------------------------------------------------
    */

    /\s+\b(?:EPISODE|EP|PART|IGICE)\s+(?:THE\s+)?(?:FINAL|LAST)\b/gi,

    /*
    ------------------------------------------------------------
    FINAL / LAST YONYINE
    ------------------------------------------------------------
    */

    /\s+\b(?:THE\s+)?(?:FINAL|LAST)\b/gi,

    /*
    ------------------------------------------------------------
    SEASON YONYINE
    ------------------------------------------------------------
    */

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

/*
|--------------------------------------------------------------------------
| GET STORY TITLE
|--------------------------------------------------------------------------
|
| head ni yo dushyira imbere kuko ari yo title nyamukuru
| iri muri posts.
|--------------------------------------------------------------------------
*/

function getStoryTitle(post = {}) {
  return cleanStoryTitle(
    post.head ||
      post.storyHead ||
      post.storyTitle ||
      "Untitled Story"
  );
}

/*
|--------------------------------------------------------------------------
| PARSE EPISODE INFO
|--------------------------------------------------------------------------
*/

function parseEpisodeInfo(
  post = {},
  index = 0
) {
  const head = String(
    post.head || ""
  ).trim();

  let season = Number(
    post.season || 1
  );

  let episode = Number(
    post.episodeNumber ||
      post.episode ||
      0
  );

  let part = Number(
    post.partNumber ||
      post.part ||
      0
  );

  /*
  ------------------------------------------------------------
  S01 EP01
  S1 EP1
  SEASON 1 EPISODE 1
  S01EP01
  ------------------------------------------------------------
  */

  const seasonEpisodeMatch =
    head.match(
      /\bS(?:EASON)?\s*(\d+)\s*(?:EP(?:ISODE)?|E)\s*\.?\s*(\d+)\b/i
    );

  if (seasonEpisodeMatch) {
    season = Number(
      seasonEpisodeMatch[1]
    );

    episode = Number(
      seasonEpisodeMatch[2]
    );
  }

  /*
  ------------------------------------------------------------
  EP 1
  EP01
  EPISODE 1
  EPISODE01
  ------------------------------------------------------------
  */

  const episodeMatch =
    head.match(
      /\b(?:EP|EPISODE|E)\s*\.?\s*(\d+)\b/i
    );

  if (
    episodeMatch &&
    !seasonEpisodeMatch
  ) {
    episode = Number(
      episodeMatch[1]
    );
  }

  /*
  ------------------------------------------------------------
  PART 1
  PART01
  IGICE 1
  ------------------------------------------------------------
  */

  const partMatch =
    head.match(
      /\b(?:PART|IGICE)\s*\.?\s*(\d+)\b/i
    );

  if (partMatch) {
    part = Number(
      partMatch[1]
    );
  }

  /*
  ------------------------------------------------------------
  FINAL
  ------------------------------------------------------------
  */

  const isFinal =
    /\b(?:FINAL|LAST)\s+(?:EPISODE|EP|PART|IGICE)\b/i.test(
      head
    ) ||
    /\b(?:EPISODE|EP|PART|IGICE)\s+(?:FINAL|LAST)\b/i.test(
      head
    ) ||
    /\b(?:FINAL|LAST)\b/i.test(
      head
    );

  /*
  ------------------------------------------------------------
  ORDER
  ------------------------------------------------------------
  */

  let orderNumber = 0;

  if (episode > 0) {
    orderNumber = episode;
  } else if (part > 0) {
    orderNumber = part;
  } else if (isFinal) {
    orderNumber = 999999;
  } else {
    orderNumber = index + 1;
  }

  return {
    id: post.id,

    title:
      post.head ||
      "Untitled",

    image:
      post.imageUrl ||
      post.image ||
      "",

    season,

    episode,

    part,

    isFinal,

    orderNumber,

    story:
      post.story ||
      "",
  };
}

/*
|--------------------------------------------------------------------------
| FIRESTORE DATE
|--------------------------------------------------------------------------
*/

function firestoreDateToISO(
  value
) {
  if (!value) {
    return null;
  }

  try {
    if (
      typeof value.toDate ===
      "function"
    ) {
      return value
        .toDate()
        .toISOString();
    }

    if (
      typeof value.toMillis ===
      "function"
    ) {
      return new Date(
        value.toMillis()
      ).toISOString();
    }

    if (
      value.seconds !== undefined
    ) {
      return new Date(
        Number(value.seconds) *
          1000
      ).toISOString();
    }

    if (
      typeof value ===
      "string"
    ) {
      const date = new Date(
        value
      );

      if (
        !Number.isNaN(
          date.getTime()
        )
      ) {
        return date.toISOString();
      }
    }

    if (
      typeof value ===
      "number"
    ) {
      const date = new Date(
        value
      );

      if (
        !Number.isNaN(
          date.getTime()
        )
      ) {
        return date.toISOString();
      }
    }
  } catch (error) {
    console.error(
      "Date conversion error:",
      error
    );
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| SSR
|--------------------------------------------------------------------------
*/

export async function getServerSideProps(
  context
) {
  const rawTitle =
    context.params?.title;

  const requestedTitle =
    decodeURIComponent(
      Array.isArray(rawTitle)
        ? rawTitle[0]
        : rawTitle || ""
    );

  try {
    /*
    ------------------------------------------------------------
    GET POSTS
    ------------------------------------------------------------
    */

    const snapshot =
      await getDocs(
        query(
          collection(
            db,
            "posts"
          ),
          orderBy(
            "createdAt",
            "asc"
          )
        )
      );

    const posts =
      snapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      );

    /*
    ------------------------------------------------------------
    FIND BY CLEAN TITLE
    ------------------------------------------------------------
    */

    let storyPosts =
      posts.filter(
        (post) => {
          const postTitle =
            getStoryTitle(post);

          return (
            normalizeStoryTitle(
              postTitle
            ) ===
            normalizeStoryTitle(
              requestedTitle
            )
          );
        }
      );

    /*
    ------------------------------------------------------------
    RAW TITLE FALLBACK
    ------------------------------------------------------------
    */

    if (
      storyPosts.length === 0
    ) {
      storyPosts =
        posts.filter(
          (post) => {
            const rawHead =
              String(
                post.head || ""
              )
                .trim()
                .toLowerCase();

            return (
              rawHead ===
              requestedTitle
                .trim()
                .toLowerCase()
            );
          }
        );
    }

    /*
    ------------------------------------------------------------
    NO STORY
    ------------------------------------------------------------
    */

    if (
      storyPosts.length === 0
    ) {
      return {
        notFound: true,
      };
    }

    /*
    ------------------------------------------------------------
    FIRST STORY
    ------------------------------------------------------------
    */

    const firstStory =
      storyPosts[0];

    /*
    ------------------------------------------------------------
    STORY ID
    ------------------------------------------------------------
    */

    if (firstStory?.storyId) {
      const storyId =
        firstStory.storyId;

      const postsByStoryId =
        posts.filter(
          (post) =>
            post.storyId ===
            storyId
        );

      if (
        postsByStoryId.length >
        0
      ) {
        storyPosts =
          postsByStoryId;
      }
    } else if (
      firstStory?.summaryId
    ) {
      const summaryId =
        firstStory.summaryId;

      const postsBySummaryId =
        posts.filter(
          (post) =>
            post.summaryId ===
            summaryId
        );

      if (
        postsBySummaryId.length >
        0
      ) {
        storyPosts =
          postsBySummaryId;
      }
    }

    /*
    ------------------------------------------------------------
    SORT STORY POSTS
    ------------------------------------------------------------
    */

    storyPosts.sort(
      (a, b) => {
        const dateA =
          a.createdAt?.toMillis
            ? a.createdAt.toMillis()
            : new Date(
                a.createdAt || 0
              ).getTime();

        const dateB =
          b.createdAt?.toMillis
            ? b.createdAt.toMillis()
            : new Date(
                b.createdAt || 0
              ).getTime();

        return (
          dateA - dateB
        );
      }
    );

    const mainStory =
      storyPosts[0] ||
      firstStory;

    /*
    ------------------------------------------------------------
    SUMMARY
    ------------------------------------------------------------
    */

    let summaryText = "";
    let summaryData = null;

    if (mainStory) {
      try {
        const summarySnap =
          await getDocs(
            collection(
              db,
              "posts",
              mainStory.id,
              "summaries"
            )
          );

        if (
          !summarySnap.empty
        ) {
          summaryData =
            summarySnap.docs[0].data();

          summaryText =
            summaryData.summary ||
            "";
        }
      } catch (error) {
        console.error(
          "Error fetching summary:",
          error
        );
      }

      /*
      ----------------------------------------------------------
      FALLBACK TO STORY
      ----------------------------------------------------------
      */

      if (
        !summaryText.trim()
      ) {
        summaryText =
          mainStory.story ||
          "";
      }
    }

    /*
    ------------------------------------------------------------
    CLEAN SUMMARY
    ------------------------------------------------------------
    */

    let cleanSummary =
      stripHtml(
        summaryText
      );

    if (
      cleanSummary.length >
      4000
    ) {
      cleanSummary =
        cleanSummary.slice(
          0,
          3997
        ).trim() + "...";
    }

    /*
    ------------------------------------------------------------
    PREMIUM
    ------------------------------------------------------------
    */

    const isPremium =
      storyPosts.some(
        (post) =>
          post.accessType ===
          "paid"
      );

    /*
    ------------------------------------------------------------
    RATING
    ------------------------------------------------------------
    */

    const totalRating =
      storyPosts.reduce(
        (total, post) =>
          total +
          Number(
            post.rating || 0
          ),
        0
      );

    const ratingCount =
      storyPosts.reduce(
        (total, post) =>
          total +
          Number(
            post.ratingCount || 0
          ),
        0
      );

    const averageRating =
      ratingCount > 0
        ? (
            totalRating /
            ratingCount
          ).toFixed(1)
        : "0";

    /*
    ------------------------------------------------------------
    EPISODES
    ------------------------------------------------------------
    */

    const episodes =
      storyPosts.map(
        (post, index) =>
          parseEpisodeInfo(
            post,
            index
          )
      );

    /*
    ------------------------------------------------------------
    SORT EPISODES
    ------------------------------------------------------------
    */

    episodes.sort(
      (a, b) => {
        if (
          a.season !==
          b.season
        ) {
          return (
            a.season -
            b.season
          );
        }

        if (
          a.orderNumber !==
          b.orderNumber
        ) {
          return (
            a.orderNumber -
            b.orderNumber
          );
        }

        if (
          a.isFinal !==
          b.isFinal
        ) {
          return a.isFinal
            ? 1
            : -1;
        }

        return 0;
      }
    );

    /*
    ------------------------------------------------------------
    FIRST IMAGE
    ------------------------------------------------------------
    */

    const storyImage =
      episodes.find(
        (ep) => ep.image
      )?.image ||
      mainStory?.imageUrl ||
      mainStory?.image ||
      "";

    /*
    ------------------------------------------------------------
    SEASONS
    ------------------------------------------------------------
    */

    const seasons = [
      ...new Set(
        episodes.map(
          (ep) => ep.season
        )
      ),
    ].sort(
      (a, b) => a - b
    );

    /*
    ------------------------------------------------------------
    TOTAL EPISODES
    ------------------------------------------------------------
    */

    const totalEpisodes =
      episodes.length;

    /*
    ------------------------------------------------------------
    FROM / TO
    ------------------------------------------------------------
    */

    const numberedEpisodes =
      episodes
        .map((ep) => {
          if (
            ep.episode > 0
          ) {
            return ep.episode;
          }

          if (
            ep.part > 0
          ) {
            return ep.part;
          }

          return null;
        })
        .filter(
          (number) =>
            number !== null
        );

    const fromEpisode =
      numberedEpisodes.length >
      0
        ? Math.min(
            ...numberedEpisodes
          )
        : 1;

    const toEpisode =
      numberedEpisodes.length >
      0
        ? Math.max(
            ...numberedEpisodes
          )
        : totalEpisodes;

    /*
    ------------------------------------------------------------
    SEASON LABEL
    ------------------------------------------------------------
    */

    const seasonLabel =
      seasons.length === 1
        ? `S${String(
            seasons[0]
          ).padStart(2, "0")}`
        : seasons.length > 1
        ? `${seasons.length} Seasons`
        : "S01";

    /*
    ------------------------------------------------------------
    SUMMARY EXISTS
    ------------------------------------------------------------
    */

    const hasExistingSummary =
      summaryData !== null;

    /*
    ------------------------------------------------------------
    PUBLISHED DATE
    ------------------------------------------------------------
    */

    const publishedAt =
      firestoreDateToISO(
        mainStory?.createdAt
      );

    /*
    ------------------------------------------------------------
    PROPS
    ------------------------------------------------------------
    */

    return {
      props: {
        title:
          getStoryTitle(
            mainStory || {}
          ) ||
          requestedTitle,

        image:
          storyImage,

        episodes,

        averageRating,

        isPremium,

        summary:
          cleanSummary,

        author:
          mainStory?.author ||
          "Unknown",

        publishedAt,

        hasSummary:
          hasExistingSummary,

        totalEpisodes,

        season:
          seasonLabel,

        seasons,

        fromEpisode,

        toEpisode,

        categories:
          Array.isArray(
            mainStory?.categories
          )
            ? mainStory.categories
            : [],

        folderId:
          mainStory?.folderId ||
          "",

        storyId:
          mainStory?.storyId ||
          mainStory?.summaryId ||
          "",
      },
    };
  } catch (error) {
    console.error(
      "Story page error:",
      error
    );

    return {
      notFound: true,
    };
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
  folderId,
  storyId,
}) {
  const { t } = useI18n();

  const router =
    useRouter();

  const [
    activeEpisode,
    setActiveEpisode,
  ] = useState(null);

  const [
    loadingRating,
    setLoadingRating,
  ] = useState(false);

  const [
    readEpisodes,
    setReadEpisodes,
  ] = useState(
    new Set()
  );

  const [
    isExpanded,
    setIsExpanded,
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | ACTIVE EPISODE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    try {
      const saved =
        localStorage.getItem(
          "activeEpisode"
        );

      if (saved) {
        setActiveEpisode(
          saved
        );
      }
    } catch (error) {
      console.error(
        "Active episode error:",
        error
      );
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | NES MINE SHARE CLICK TRACKING
  |--------------------------------------------------------------------------
  |
  | URL example:
  |
  | /story/INKURU?nesTask=TASK_ID
  |
  | Cookie:
  |
  | user = JSON.stringify({
  |   uid: "...",
  |   email: "...",
  |   fName: "...",
  |   username: "..."
  | })
  |
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    if (
      !router.isReady
    ) {
      return;
    }

    const rawTaskId =
      router.query.nesTask;

    const taskId = Array.isArray(
      rawTaskId
    )
      ? rawTaskId[0]
      : rawTaskId;

    console.log(
      "🔥 NES MINE TRACKING START"
    );

    console.log(
      "URL:",
      window.location.href
    );

    console.log(
      "TASK ID:",
      taskId
    );

    if (!taskId) {
      console.log(
        "ℹ️ nesTask ntabwo iri muri URL."
      );

      return;
    }

    let cancelled = false;

    const getCurrentUserFromCookie =
      () => {
        try {
          const rawCookie =
            Cookies.get("user");

          console.log(
            "🍪 RAW USER COOKIE:",
            rawCookie
          );

          if (!rawCookie) {
            console.log(
              "⚠️ USER COOKIE NTIBONETSE."
            );

            return null;
          }

          let parsedUser;

          try {
            parsedUser =
              JSON.parse(
                rawCookie
              );
          } catch (
            jsonError
          ) {
            /*
            Cookie ishobora kuba plain username.
            */

            console.warn(
              "⚠️ Cookie ntabwo ari JSON. Ifatwa nka username."
            );

            const plainUsername =
              String(
                rawCookie
              ).trim();

            return (
              plainUsername ||
              null
            );
          }

          console.log(
            "👤 PARSED USER:",
            parsedUser
          );

          if (
            !parsedUser ||
            typeof parsedUser !==
              "object"
          ) {
            return null;
          }

          const username =
            parsedUser.username ||
            parsedUser.userName ||
            "";

          return username
            ? String(
                username
              ).trim()
            : null;
        } catch (error) {
          console.error(
            "❌ COOKIE READ ERROR:",
            error
          );

          return null;
        }
      };

    const trackNESShareClick =
      async () => {
        try {
          const taskIdString =
            String(
              taskId
            ).trim();

          if (
            !taskIdString
          ) {
            return;
          }

          /*
          ------------------------------------------------------
          VISITOR ID
          ------------------------------------------------------
          */

          let visitorId =
            localStorage.getItem(
              "nesMineVisitorId"
            );

          if (!visitorId) {
            visitorId =
              "visitor_" +
              Date.now().toString(
                36
              ) +
              "_" +
              Math.random()
                .toString(36)
                .slice(
                  2,
                  12
                );

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

          /*
          ------------------------------------------------------
          GET TASK
          ------------------------------------------------------
          */

          const taskRef =
            doc(
              db,
              "nesGameTasks",
              taskIdString
            );

          const taskSnap =
            await getDoc(
              taskRef
            );

          if (
            !taskSnap.exists()
          ) {
            console.log(
              "❌ TASK NOT FOUND:",
              taskIdString
            );

            return;
          }

          const task =
            taskSnap.data();

          console.log(
            "✅ TASK FOUND:",
            task
          );

          /*
          ------------------------------------------------------
          TASK TYPE
          ------------------------------------------------------
          */

          if (
            task.type !==
            "share"
          ) {
            console.log(
              "❌ WRONG TASK TYPE:",
              task.type
            );

            return;
          }

          /*
          ------------------------------------------------------
          TASK STATUS
          ------------------------------------------------------
          */

          if (
            task.status !==
            "active"
          ) {
            console.log(
              "❌ TASK NOT ACTIVE:",
              task.status
            );

            return;
          }

          /*
          ------------------------------------------------------
          EXPIRATION
          ------------------------------------------------------
          */

          let expiresAt =
            null;

          if (
            task.expiresAt &&
            typeof task
              .expiresAt
              .toMillis ===
              "function"
          ) {
            expiresAt =
              task.expiresAt.toMillis();
          } else if (
            task.expiresAt &&
            task.expiresAt
              .seconds !==
              undefined
          ) {
            expiresAt =
              Number(
                task.expiresAt
                  .seconds
              ) * 1000;
          } else if (
            typeof task.expiresAt ===
            "number"
          ) {
            expiresAt =
              task.expiresAt;
          }

          if (
            expiresAt &&
            Date.now() >
              expiresAt
          ) {
            console.log(
              "❌ TASK EXPIRED"
            );

            return;
          }

          /*
          ------------------------------------------------------
          CURRENT USER
          ------------------------------------------------------
          */

          const currentUsername =
            getCurrentUserFromCookie();

          console.log(
            "👤 CURRENT USERNAME:",
            currentUsername
          );

          console.log(
            "👑 TASK OWNER:",
            task.username ||
              null
          );

          /*
          ------------------------------------------------------
          OWNER CHECK
          ------------------------------------------------------
          */

          const normalizedCurrentUsername =
            currentUsername
              ? String(
                  currentUsername
                )
                  .trim()
                  .toLowerCase()
              : "";

          const normalizedTaskOwner =
            task.username
              ? String(
                  task.username
                )
                  .trim()
                  .toLowerCase()
              : "";

          const isTaskOwner =
            Boolean(
              normalizedCurrentUsername &&
                normalizedTaskOwner &&
                normalizedCurrentUsername ===
                  normalizedTaskOwner
            );

          if (
            isTaskOwner
          ) {
            console.log(
              "🚫 TASK OWNER NTIYABARWA:",
              currentUsername
            );

            return;
          }

          console.log(
            "✅ VISITOR SI TASK OWNER. CLICK IRABARWA."
          );

          /*
          ------------------------------------------------------
          CLICK ID
          ------------------------------------------------------
          |
          | visitor umwe kuri task imwe
          | ntabarwa inshuro nyinshi.
          |--------------------------------------------------------------------------
          */

          const clickId =
            `${taskIdString}_${visitorId}`;

          console.log(
            "🆔 CLICK ID:",
            clickId
          );

          const clickRef =
            doc(
              db,
              "nesShareClicks",
              clickId
            );

          /*
          ------------------------------------------------------
          CHECK EXISTING CLICK
          ------------------------------------------------------
          */

          const existingClick =
            await getDoc(
              clickRef
            );

          if (
            existingClick.exists()
          ) {
            console.log(
              "ℹ️ VISITOR ASANZWE YARABARWE:",
              clickId
            );

            return;
          }

          /*
          ------------------------------------------------------
          CANCEL CHECK
          ------------------------------------------------------
          */

          if (
            cancelled
          ) {
            console.log(
              "❌ TRACKING CANCELLED"
            );

            return;
          }

          /*
          ------------------------------------------------------
          SAVE CLICK
          ------------------------------------------------------
          */

          await setDoc(
            clickRef,
            {
              taskId:
                taskIdString,

              visitorId:
                visitorId,

              /*
              Username y'umuntu wakoze click.
              */

              username:
                currentUsername ||
                null,

              /*
              Username ya owner wa task.
              */

              taskOwner:
                task.username ||
                null,

              /*
              Post/story information.
              */

              postId:
                task.postId ||
                router.query.id ||
                null,

              storyId:
                task.storyId ||
                storyId ||
                null,

              storyTitle:
                task.storyTitle ||
                title ||
                null,

              /*
              Time.
              */

              createdAt:
                serverTimestamp(),

              source:
                "nesMineShare",

              /*
              Browser information.
              */

              userAgent:
                navigator.userAgent ||
                null,
            }
          );

          console.log(
            "✅ VISITOR CLICK YABITSWE:",
            clickId
          );

          console.log(
            "👤 USERNAME YABITSWE:",
            currentUsername
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
    router.isReady,
    router.query.nesTask,
    router.query.id,
    storyId,
    title,
  ]);

  /*
  |--------------------------------------------------------------------------
  | READING HISTORY
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    const loadReading =
      async () => {
        try {
          const rawCookie =
            Cookies.get("user");

          if (!rawCookie) {
            return;
          }

          let parsedUser;

          try {
            parsedUser =
              JSON.parse(
                rawCookie
              );
          } catch {
            return;
          }

          const username =
            parsedUser?.username;

          if (!username) {
            return;
          }

          const snap =
            await getDocs(
              collection(
                db,
                "reading",
                username,
                "history"
              )
            );

          const ids =
            new Set();

          snap.forEach(
            (item) => {
              const data =
                item.data();

              if (
                data.postId
              ) {
                ids.add(
                  data.postId
                );
              }
            }
          );

          setReadEpisodes(
            ids
          );
        } catch (error) {
          console.error(
            "Reading load error:",
            error
          );
        }
      };

    loadReading();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | RATING
  |--------------------------------------------------------------------------
  */

  const rateStory =
    async (stars) => {
      if (
        loadingRating
      ) {
        return;
      }

      try {
        const rated =
          localStorage.getItem(
            `rated_${title}`
          );

        if (rated) {
          alert(
            t("Wamaze gutanga rating.")
          );

          return;
        }

        setLoadingRating(
          true
        );

        const storyIdToRate =
          episodes[0]?.id;

        if (
          !storyIdToRate
        ) {
          return;
        }

        await updateDoc(
          doc(
            db,
            "posts",
            storyIdToRate
          ),
          {
            rating:
              increment(
                Number(
                  stars
                )
              ),

            ratingCount:
              increment(1),
          }
        );

        localStorage.setItem(
          `rated_${title}`,
          "true"
        );

        alert(
          t("Murakoze ku rating!")
        );

        window.location.reload();
      } catch (error) {
        console.error(
          "Rating error:",
          error
        );
      } finally {
        setLoadingRating(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | SUMMARY TOGGLE
  |--------------------------------------------------------------------------
  */

  const toggleSummary =
    () => {
      setIsExpanded(
        (previous) =>
          !previous
      );
    };

  /*
  |--------------------------------------------------------------------------
  | META
  |--------------------------------------------------------------------------
  */

  const metaDescription =
    summary?.slice(0, 160) ||
    `Soma ${title}`;

  const ogDescription =
    summary?.slice(0, 200) ||
    `Episodes: ${totalEpisodes} | Rating: ${averageRating}`;

  /*
  |--------------------------------------------------------------------------
  | STORY URL
  |--------------------------------------------------------------------------
  */

  const storyUrl =
    `https://www.newtalentsg.co.rw/story/${encodeURIComponent(
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
        <title>{t("{title} | New Talents Stories", { title })}</title>

        <meta
          name="description"
          content={
            metaDescription
          }
        />

        <meta
          name="keywords"
          content={categories.join(
            ", "
          )}
        />

        <meta
          name="author"
          content={author}
        />

        <meta
          name="robots"
          content="index, follow"
        />

        <meta
          name="googlebot"
          content="index, follow"
        />

        <link
          rel="canonical"
          href={storyUrl}
        />

        {/* OPEN GRAPH */}

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
          content={ogDescription}
        />

        <meta
          property="og:image"
          content={
            image ||
            "https://www.newtalentsg.co.rw/logo.png"
          }
        />

        <meta
          property="og:type"
          content="website"
        />

        <meta
          property="og:site_name"
          content="New Talents Stories Group"
        />

        <meta
          property="og:locale"
          content="rw_RW"
        />

        {publishedAt && (
          <meta
            property="article:published_time"
            content={
              publishedAt
            }
          />
        )}

        <meta
          property="article:author"
          content={author}
        />

        <meta
          property="article:section"
          content={
            categories[0] ||
            "Stories"
          }
        />

        <meta
          property="article:tag"
          content={categories.join(
            ", "
          )}
        />

        {/* TWITTER */}

        <meta
          name="twitter:card"
          content="summary_large_image"
        />

        <meta
          name="twitter:title"
          content={`${title} | New Talents Stories`}
        />

        <meta
          name="twitter:description"
          content={
            metaDescription
          }
        />

        <meta
          name="twitter:image"
          content={
            image ||
            "https://www.newtalentsg.co.rw/logo.png"
          }
        />

        <meta
          name="application-name"
          content="New Talents Stories"
        />

        <meta
          name="theme-color"
          content="#070b14"
        />

        {/* BREADCRUMB */}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html:
              JSON.stringify({
                "@context":
                  "https://schema.org",

                "@type":
                  "BreadcrumbList",

                itemListElement: [
                  {
                    "@type":
                      "ListItem",

                    position: 1,

                    name: "Home",

                    item:
                      "https://www.newtalentsg.co.rw",
                  },

                  {
                    "@type":
                      "ListItem",

                    position: 2,

                    name: "Stories",

                    item:
                      "https://www.newtalentsg.co.rw",
                  },

                  {
                    "@type":
                      "ListItem",

                    position: 3,

                    name: title,

                    item: storyUrl,
                  },
                ],
              }),
          }}
        />

        {/* ARTICLE */}

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
                  title,

                description:
                  summary ||
                  `Soma ${title}`,

                articleBody:
                  summary ||
                  `Soma ${title}`,

                image: image
                  ? [image]
                  : [
                      "https://www.newtalentsg.co.rw/logo.png",
                    ],

                author: {
                  "@type":
                    "Person",

                  name:
                    author,
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

                mainEntityOfPage: {
                  "@type":
                    "WebPage",

                  "@id":
                    storyUrl,
                },

                url: storyUrl,

                datePublished:
                  publishedAt,

                dateModified:
                  publishedAt,

                inLanguage:
                  "rw",

                keywords:
                  categories.join(
                    ", "
                  ),

                articleSection:
                  categories[0] ||
                  "Stories",

                about: {
                  "@type":
                    "Thing",

                  name:
                    title,

                  description:
                    summary ||
                    `Soma ${title}`,
                },
              }),
          }}
        />
      </Head>

      <div
        className={
          styles.storyContainer
        }
      >
        {/* HERO */}

        <div
          className={
            styles.heroSection
          }
        >
          {image && (
            <img
              src={image}
              alt={title}
              className={
                styles.heroImage
              }
            />
          )}

          <div
            className={
              styles.heroOverlay
            }
          >
            <h1
              className={
                styles.heroTitle
              }
            >
              {title}
            </h1>

            <div
              className={
                styles.badgesContainer
              }
            >
              <div
                className={`${styles.badge} ${
                  isPremium
                    ? styles.badgePremium
                    : styles.badgeFree
                }`}
              >
                {isPremium
                  ? t("PREMIUM")
                  : t("FREE")}
              </div>

              {season && (
                <div
                  className={`${styles.badge} ${styles.badgeSeason}`}
                >
                  {season}
                </div>
              )}

              {categories &&
                categories.length >
                  0 && (
                  <div
                    className={`${styles.badge} ${styles.badgeCategory}`}
                  >
                    {categories
                      .slice(
                        0,
                        2
                      )
                      .join(
                        ", "
                      )}

                    {categories.length >
                      2 &&
                      "..."}
                  </div>
                )}
            </div>

            <p
              className={
                styles.storyInfo
              }
            >{t("📖 Total Episodes:")}{" "}
              {totalEpisodes}
            </p>

            <p
              className={
                styles.storyInfoSmall
              }
            >
              {seasons.length >
              1
                ? `Seasons: ${seasons.join(
                    ", "
                  )}`
                : t("Episodes {fromEpisode} - {toEpisode}", { fromEpisode, toEpisode })}
            </p>

            <div
              className={
                styles.actionsContainer
              }
            >
              {episodes[0] && (
                <Link
                  href={`/post/${episodes[0].id}`}
                  className={
                    styles.startReadingBtn
                  }
                >{t("▶ Start Reading")}</Link>
              )}

              <div
                className={
                  styles.ratingContainer
                }
              >
                ⭐ {averageRating}

                <div
                  className={
                    styles.ratingStars
                  }
                >
                  {[1, 2, 3, 4, 5].map(
                    (star) => (
                      <button
                        key={star}
                        onClick={() =>
                          rateStory(
                            star
                          )
                        }
                        disabled={
                          loadingRating
                        }
                        className={
                          styles.ratingStarBtn
                        }
                        aria-label={t("Rate {star} stars", { star })}
                      >
                        ★
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SUMMARY LABEL */}

        <div
          className={
            styles.summaryLabel
          }
        >
          <span
            className={
              styles.summaryIcon
            }
          >
            📝
          </span>

          {hasSummary
            ? t("Summary")
            : t("Story Preview")}
        </div>

        {/* SUMMARY */}

        {summary && (
          <div
            className={`${styles.summaryContainer} ${
              isExpanded
                ? styles.expanded
                : ""
            }`}
          >
            <div
              className={
                styles.summaryContent
              }
            >
              <p
                className={
                  styles.summaryText
                }
              >
                {summary}
              </p>
            </div>

            {summary.length >
              700 && (
              <button
                className={
                  styles.summaryToggle
                }
                onClick={
                  toggleSummary
                }
              >
                {isExpanded
                  ? t("📕 Show Less")
                  : t("📖 Read More")}
              </button>
            )}
          </div>
        )}

        {/* EPISODES */}

        <h2
          className={
            styles.episodesTitle
          }
        >{t("📚 Episodes ({totalEpisodes})", { totalEpisodes })}</h2>

        <ContinueRead />

        <AdsBanner />

        <div
          className={
            styles.episodesGrid
          }
        >
          {episodes.map(
            (ep) => {
              const displayNumber =
                ep.episode > 0
                  ? `EP${String(
                      ep.episode
                    ).padStart(
                      2,
                      "0"
                    )}`
                  : ep.part > 0
                  ? `PART ${ep.part}`
                  : ep.isFinal
                  ? "FINAL"
                  : "EP";

              return (
                <Link
                  key={ep.id}
                  href={`/post/${ep.id}`}
                  onClick={() => {
                    try {
                      localStorage.setItem(
                        "activeEpisode",
                        ep.id
                      );
                    } catch (
                      error
                    ) {
                      console.error(
                        "Active episode save error:",
                        error
                      );
                    }
                  }}
                  className={`${styles.episodeCard} ${
                    activeEpisode ===
                    ep.id
                      ? styles.active
                      : ""
                  } ${
                    readEpisodes.has(
                      ep.id
                    )
                      ? styles.read
                      : ""
                  }`}
                >
                  <div
                    className={
                      styles.episodeIcon
                    }
                  >
                    🎬
                  </div>

                  <div
                    className={
                      styles.episodeInfo
                    }
                  >
                    <div
                      className={
                        styles.episodeNumber
                      }
                    >
                      {ep.isFinal
                        ? `S${String(
                            ep.season
                          ).padStart(
                            2,
                            "0"
                          )} FINAL`
                        : `S${String(
                            ep.season
                          ).padStart(
                            2,
                            "0"
                          )} ${displayNumber}`}
                    </div>

                    <div
                      className={
                        styles.episodeTitle
                      }
                    >
                      {ep.title}
                    </div>
                  </div>

                  <div
                    className={
                      styles.episodeStatus
                    }
                  >
                    {readEpisodes.has(
                      ep.id
                    )
                      ? "✅"
                      : activeEpisode ===
                        ep.id
                      ? "▶"
                      : "➜"}
                  </div>
                </Link>
              );
            }
          )}
        </div>

        {/* FOOTER INFO */}

        <div
          className={
            styles.footerInfo
          }
        >
          <p>
            <strong>{t("Story Info:")}</strong>{" "}
            {title} | {season} |{" "}{t("{totalEpisodes} episodes", { totalEpisodes })}{categories.length >
              0 &&
              ` | Categories: ${categories.join(
                ", "
              )}`}
          </p>

          <p>
            <strong>{t("Author:")}</strong>{" "}
            {author} |

            <strong>
              {" "}{t("Published:")}</strong>{" "}
            {publishedAt
              ? new Date(
                  publishedAt
                ).toLocaleDateString()
              : t("Unknown")}
          </p>

          <p>
            <strong>{t("Rating:")}</strong>{" "}
            {averageRating} ⭐ |

            <strong>
              {" "}{t("Type:")}</strong>{" "}
            {isPremium
              ? t("Premium")
              : t("Free")}
          </p>

          {storyId && (
            <p>
              <strong>{t("Story ID:")}</strong>{" "}
              {storyId}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
