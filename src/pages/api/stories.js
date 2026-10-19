// pages/api/stories.js

import {
  collection,
  getDocs,
  query,
  limit,
  startAfter,
  orderBy,
} from "firebase/firestore";

import { db } from "../../components/firebase";

// ============================================================
// HELPERS
// ============================================================

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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

function buildStoryGroupsFromPosts(posts = []) {
  const grouped = {};

  for (const post of posts) {
    const head = String(
      post.head || post.storyHead || post.storyTitle || "Untitled Story"
    ).trim();

    const info = resolveEpisodeInfo(post);

    let groupKey;

    if (post.storyId) {
      groupKey = `story:${post.storyId}`;
    } else if (post.summaryId) {
      groupKey = `summary:${post.summaryId}`;
    } else {
      groupKey = `title:${normalizeText(cleanStoryTitle(head))}`;
    }

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        key: groupKey,
        title:
          post.storyHead ||
          post.storyTitle ||
          cleanStoryTitle(head) ||
          "Untitled Story",
        author: post.author || "Unknown",
        posts: [],
        seasons: new Set(),
        totalViews: 0,
        latestCreatedAt: 0,
      };
    }

    if (info.season !== null) {
      grouped[groupKey].seasons.add(info.season);
    }

    const timestamp = getTimestampValue(post.createdAt);
    if (timestamp > grouped[groupKey].latestCreatedAt) {
      grouped[groupKey].latestCreatedAt = timestamp;
    }

    grouped[groupKey].posts.push({
      ...post,
      __episodeInfo: info,
    });

    grouped[groupKey].totalViews += Number(post.views || 0);
  }

  return Object.values(grouped).map((group) => {
    const sortedPosts = [...group.posts].sort((a, b) => {
      const A = a.__episodeInfo || {};
      const B = b.__episodeInfo || {};

      const seasonA = A.season ?? 0;
      const seasonB = B.season ?? 0;
      const numberA = A.episode ?? A.part ?? 0;
      const numberB = B.episode ?? B.part ?? 0;

      if (seasonA !== seasonB) return seasonA - seasonB;
      if (numberA !== numberB) return numberA - numberB;
      return getTimestampValue(a.createdAt) - getTimestampValue(b.createdAt);
    });

    const totalEpisodes = sortedPosts.filter(
      (post) => post.__episodeInfo?.episode !== null
    ).length;

    const totalParts = sortedPosts.filter(
      (post) => post.__episodeInfo?.part !== null
    ).length;

    const storyType =
      totalEpisodes > 0 ? "series" : totalParts > 0 ? "parts" : "standalone";

    return {
      key: group.key,
      title: cleanStoryTitle(group.title),
      author: group.author,
      totalSeasons: group.seasons.size,
      totalEpisodes,
      totalParts,
      contentCount:
        storyType === "series"
          ? totalEpisodes
          : storyType === "parts"
          ? totalParts
          : sortedPosts.length,
      storyType,
      seasons: [...group.seasons].sort((a, b) => a - b),
      episodes: sortedPosts.map((post) => ({
        id: post.id,
        head: post.head || post.storyHead || post.storyTitle || group.title,
        season: post.__episodeInfo?.season ?? null,
        episode: post.__episodeInfo?.episode ?? null,
        part: post.__episodeInfo?.part ?? null,
        createdAt: getTimestampValue(post.createdAt),
      })),
      totalViews: group.totalViews,
      latestCreatedAt: group.latestCreatedAt,
      // IMPORTANT: Keep postIds for content loading
      postIds: sortedPosts.map((p) => p.id),
    };
  });
}

// ============================================================
// API HANDLER
// ============================================================

const STORIES_PER_LOAD = 10;
const POSTS_FETCH_MULTIPLIER = 4;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use GET.",
    });
  }

  try {
    const { limit: limitParam = STORIES_PER_LOAD, cursor = null } = req.query;
    const limitValue = Math.min(parseInt(limitParam) || STORIES_PER_LOAD, 50);

    let postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      orderBy("__name__", "desc"),
      limit(limitValue * POSTS_FETCH_MULTIPLIER)
    );

    if (cursor) {
      try {
        const cursorData = JSON.parse(cursor);
        const cursorTimestamp = cursorData.timestamp || 0;
        const cursorId = cursorData.id || "";
        const date = new Date(cursorTimestamp);

        postsQuery = query(
          collection(db, "posts"),
          orderBy("createdAt", "desc"),
          orderBy("__name__", "desc"),
          startAfter(date, cursorId),
          limit(limitValue * POSTS_FETCH_MULTIPLIER)
        );
      } catch (e) {
        console.warn("Cursor parsing failed, using default query:", e);
        postsQuery = query(
          collection(db, "posts"),
          orderBy("createdAt", "desc"),
          orderBy("__name__", "desc"),
          limit(limitValue * POSTS_FETCH_MULTIPLIER)
        );
      }
    }

    const snapshot = await getDocs(postsQuery);

    if (snapshot.empty) {
      return res.status(200).json({
        success: true,
        stories: [],
        hasMore: false,
        nextCursor: null,
        totalLoaded: 0,
      });
    }

    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    let groupedStories = buildStoryGroupsFromPosts(posts);
    groupedStories.sort((a, b) => (b.latestCreatedAt || 0) - (a.latestCreatedAt || 0));

    const limitedStories = groupedStories.slice(0, limitValue);
    const hasMore = groupedStories.length > limitValue;

    let nextCursor = null;
    if (hasMore && limitedStories.length > 0) {
      const lastStory = limitedStories[limitedStories.length - 1];
      const lastPostId =
        lastStory.postIds && lastStory.postIds.length > 0
          ? lastStory.postIds[lastStory.postIds.length - 1]
          : null;

      if (lastPostId) {
        const lastPost = posts.find((p) => p.id === lastPostId);
        if (lastPost) {
          nextCursor = JSON.stringify({
            timestamp: getTimestampValue(lastPost.createdAt),
            id: lastPost.id,
          });
        }
      }
    }

    // Keep postIds for content loading
    const stories = limitedStories.map((story) => ({
      ...story,
      episodes: story.episodes.map((ep) => ({
        id: ep.id,
        head: ep.head,
        season: ep.season,
        episode: ep.episode,
        part: ep.part,
        createdAt: ep.createdAt,
      })),
    }));

    return res.status(200).json({
      success: true,
      stories,
      hasMore,
      nextCursor,
      totalLoaded: stories.length,
    });
  } catch (error) {
    console.error("Stories API error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to load stories.",
      stories: [],
      hasMore: false,
      nextCursor: null,
    });
  }
}
