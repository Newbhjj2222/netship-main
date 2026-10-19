// pages/api/story-content.js

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../../components/firebase";

// ============================================================
// RICH TEXT HELPERS
// ============================================================

function htmlToText(value = "") {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return richValueToText(value);

  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#8217;/gi, "’")
    .replace(/&#8220;/gi, "“")
    .replace(/&#8221;/gi, "”")
    .replace(/&#8211;/gi, "–")
    .replace(/&#8212;/gi, "—")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function richValueToText(value) {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") return htmlToText(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value
      .map((item) => richValueToText(item))
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value === "object") {
    const preferredKeys = [
      "text",
      "content",
      "html",
      "value",
      "body",
      "story",
      "article",
      "paragraph",
      "children",
      "blocks",
      "nodes",
      "data",
    ];

    const parts = [];

    for (const key of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const result = richValueToText(value[key]);
        if (result) {
          parts.push(result);
        }
      }
    }

    if (parts.length) return parts.join("\n");

    return Object.values(value)
      .map((item) => richValueToText(item))
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function getPostContent(post = {}) {
  const fields = [
    "story",
    "content",
    "text",
    "body",
    "article",
    "description",
    "storyContent",
    "postContent",
    "contentHtml",
    "html",
    "storyText",
    "episodeContent",
    "paragraphs",
    "blocks",
    "children",
    "data",
  ];

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(post, field)) {
      const result = richValueToText(post[field]);
      if (result && result.trim()) {
        return result.trim();
      }
    }
  }

  for (const [key, value] of Object.entries(post)) {
    if (
      [
        "id",
        "head",
        "storyHead",
        "storyTitle",
        "storyId",
        "summaryId",
        "author",
        "views",
        "createdAt",
        "updatedAt",
        "season",
        "episode",
        "episodeNumber",
        "part",
        "partNumber",
      ].includes(key)
    ) {
      continue;
    }

    const result = richValueToText(value);
    if (result && result.trim().length > 20) {
      return result.trim();
    }
  }

  return "";
}

// ============================================================
// OTHER HELPERS
// ============================================================

function cleanStoryTitle(head = "") {
  let title = String(head).replace(/\s+/g, " ").trim();

  title = title.replace(
    /\b(?:S|SEASON)\s*0*\d+\s*(?:EP|EPISODE|E)\s*0*\d+\b/gi,
    ""
  );
  title = title.replace(/\b(?:EP|EPISODE|E)\s*0*\d+\b/gi, "");
  title = title.replace(/\b(?:PART|IGICE)\s*0*\d+\b/gi, "");
  title = title.replace(/\b(?:FINAL|LAST)\b/gi, "");
  title = title.replace(/\b(?:S|SEASON)\s*0*\d+\b/gi, "");

  return title.replace(/[\-_:.]+$/g, "").replace(/\s+/g, " ").trim();
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function extractEpisodeInfo(head = "") {
  const value = String(head).trim();

  const seasonEpisode = value.match(
    /\b(?:S|SEASON)\s*0*(\d+)\s*(?:EP|EPISODE|E)\s*0*(\d+)\b/i
  );

  if (seasonEpisode) {
    return {
      season: Number(seasonEpisode[1]),
      episode: Number(seasonEpisode[2]),
      part: null,
      type: "series",
      final: false,
    };
  }

  const episode = value.match(/\b(?:EP|EPISODE|E)\.?\s*0*(\d+)\b/i);

  if (episode) {
    return {
      season: null,
      episode: Number(episode[1]),
      part: null,
      type: "series",
      final: false,
    };
  }

  const part = value.match(/\b(?:PART|IGICE)\.?\s*0*(\d+)\b/i);

  if (part) {
    return {
      season: null,
      episode: null,
      part: Number(part[1]),
      type: "parts",
      final: false,
    };
  }

  if (/\b(?:FINAL|LAST)\b/i.test(value)) {
    return {
      season: null,
      episode: null,
      part: null,
      type: "series",
      final: true,
    };
  }

  return {
    season: null,
    episode: null,
    part: null,
    type: "standalone",
    final: false,
  };
}

function resolveEpisodeInfo(post = {}) {
  const head = post.head || post.storyHead || post.storyTitle || "";

  const detected = extractEpisodeInfo(head);

  const season =
    detected.season ??
    toNumberOrNull(post.season ?? post.seasonNumber ?? post.seasonNo);

  const episode =
    detected.episode ??
    toNumberOrNull(post.episode ?? post.episodeNumber ?? post.episodeNo);

  const part =
    detected.part ??
    toNumberOrNull(post.part ?? post.partNumber ?? post.partNo);

  let type = detected.type;

  if (episode !== null) {
    type = "series";
  } else if (part !== null) {
    type = "parts";
  }

  return {
    season,
    episode,
    part,
    type,
    final: detected.final,
  };
}

function getTimestampValue(value) {
  if (!value) return 0;

  if (typeof value === "object" && typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value === "object" && value.seconds !== undefined) {
    return Number(value.seconds) * 1000;
  }

  const date = new Date(value).getTime();
  return Number.isNaN(date) ? 0 : date;
}

// ============================================================
// API HANDLER
// ============================================================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST.",
    });
  }

  try {
    const { storyKey, postIds } = req.body;

    if (!storyKey && (!postIds || !Array.isArray(postIds) || postIds.length === 0)) {
      return res.status(400).json({
        success: false,
        error: "storyKey or postIds is required.",
      });
    }

    let posts = [];

    // 1. Try loading by postIds (most reliable)
    if (postIds && Array.isArray(postIds) && postIds.length > 0) {
      const postsRef = collection(db, "posts");
      const chunkSize = 30;

      for (let i = 0; i < postIds.length; i += chunkSize) {
        const chunk = postIds.slice(i, i + chunkSize);
        try {
          const q = query(postsRef, where("__name__", "in", chunk));
          const snapshot = await getDocs(q);
          const chunkPosts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          posts = [...posts, ...chunkPosts];
        } catch (err) {
          console.warn("Error fetching postIds chunk:", err);
        }
      }
    }

    // 2. If no posts found by postIds, fallback to storyKey search
    if (posts.length === 0 && storyKey) {
      const searchTitle = cleanStoryTitle(storyKey);
      try {
        const q = query(
          collection(db, "posts"),
          where("storyTitle", "==", searchTitle)
        );
        const snapshot = await getDocs(q);
        posts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (err) {
        console.warn("Error searching by storyTitle:", err);
      }

      // 3. Final fallback: search by head (starts with)
      if (posts.length === 0) {
        try {
          const q = query(
            collection(db, "posts"),
            where("head", ">=", searchTitle),
            where("head", "<=", searchTitle + "\uf8ff")
          );
          const snapshot = await getDocs(q);
          posts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        } catch (err) {
          console.warn("Error searching by head:", err);
        }
      }
    }

    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No posts found for this story. Check postIds or storyKey.",
      });
    }

    // Sort by episode order
    const sortedPosts = posts.sort((a, b) => {
      const infoA = resolveEpisodeInfo(a);
      const infoB = resolveEpisodeInfo(b);
      const seasonA = infoA.season ?? 0;
      const seasonB = infoB.season ?? 0;
      const numberA = infoA.episode ?? infoA.part ?? 0;
      const numberB = infoB.episode ?? infoB.part ?? 0;

      if (seasonA !== seasonB) return seasonA - seasonB;
      if (numberA !== numberB) return numberA - numberB;
      return getTimestampValue(a.createdAt) - getTimestampValue(b.createdAt);
    });

    const episodes = sortedPosts.map((post) => ({
      id: post.id,
      head: post.head || post.storyHead || post.storyTitle || "Untitled",
      season: post.season ?? resolveEpisodeInfo(post).season ?? null,
      episode: post.episode ?? resolveEpisodeInfo(post).episode ?? null,
      part: post.part ?? resolveEpisodeInfo(post).part ?? null,
      content: getPostContent(post),
      createdAt: getTimestampValue(post.createdAt),
    }));

    const firstPost = sortedPosts[0];

    return res.status(200).json({
      success: true,
      story: {
        key: storyKey,
        title: firstPost.storyTitle || cleanStoryTitle(firstPost.head || ""),
        author: firstPost.author || "Unknown",
        totalEpisodes: sortedPosts.length,
        episodes,
      },
    });
  } catch (error) {
    console.error("Story content API error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to load story content.",
    });
  }
}
