import {
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";

import Head from "next/head";

import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

import { db } from "../components/firebase";
import styles from "@/styles/analysis-post.module.css";
import { useI18n } from "@/i18n/I18nProvider";

// ============================================================
// TEXT
// ============================================================

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// ============================================================
// HTML
// ============================================================

function htmlToText(value = "") {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value !== "string"
  ) {
    return richValueToText(value);
  }

  return value
    .replace(
      /<br\s*\/?>/gi,
      "\n"
    )
    .replace(
      /<\/p>/gi,
      "\n"
    )
    .replace(
      /<\/div>/gi,
      "\n"
    )
    .replace(
      /<\/li>/gi,
      "\n"
    )
    .replace(
      /<\/h[1-6]>/gi,
      "\n"
    )
    .replace(
      /<[^>]*>/g,
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
      /&#39;/gi,
      "'"
    )
    .replace(
      /&#x27;/gi,
      "'"
    )
    .replace(
      /&#8217;/gi,
      "’"
    )
    .replace(
      /&#8220;/gi,
      "“"
    )
    .replace(
      /&#8221;/gi,
      "”"
    )
    .replace(
      /&#8211;/gi,
      "–"
    )
    .replace(
      /&#8212;/gi,
      "—"
    )
    .replace(
      /\r/g,
      "\n"
    )
    .replace(
      /[ \t]+/g,
      " "
    )
    .replace(
      /\n\s+/g,
      "\n"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}

// ============================================================
// RICH TEXT
// ============================================================

function richValueToText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value === "string"
  ) {
    return htmlToText(value);
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (
    Array.isArray(value)
  ) {
    return value
      .map(
        (item) =>
          richValueToText(item)
      )
      .filter(Boolean)
      .join("\n");
  }

  if (
    typeof value === "object"
  ) {
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

    for (
      const key of preferredKeys
    ) {
      if (
        Object.prototype.hasOwnProperty.call(
          value,
          key
        )
      ) {
        const result =
          richValueToText(
            value[key]
          );

        if (result) {
          parts.push(result);
        }
      }
    }

    if (
      parts.length
    ) {
      return parts.join(
        "\n"
      );
    }

    return Object.values(
      value
    )
      .map(
        (item) =>
          richValueToText(item)
      )
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

// ============================================================
// GET STORY CONTENT
// ============================================================

function getPostContent(
  post = {}
) {
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

  for (
    const field of fields
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        post,
        field
      )
    ) {
      const result =
        richValueToText(
          post[field]
        );

      if (
        result &&
        result.trim()
      ) {
        return result.trim();
      }
    }
  }

  for (
    const [key, value] of Object.entries(
      post
    )
  ) {
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

    const result =
      richValueToText(
        value
      );

    if (
      result &&
      result.trim().length > 20
    ) {
      return result.trim();
    }
  }

  return "";
}

// ============================================================
// NUMBER
// ============================================================

function toNumberOrNull(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

// ============================================================
// EPISODE
// ============================================================

function extractEpisodeInfo(
  head = ""
) {
  const value =
    String(head)
      .trim();

  const seasonEpisode =
    value.match(
      /\b(?:S|SEASON)\s*0*(\d+)\s*(?:EP|EPISODE|E)\s*0*(\d+)\b/i
    );

  if (
    seasonEpisode
  ) {
    return {
      season:
        Number(
          seasonEpisode[1]
        ),

      episode:
        Number(
          seasonEpisode[2]
        ),

      part: null,

      type: "series",

      final: false,
    };
  }

  const episode =
    value.match(
      /\b(?:EP|EPISODE|E)\.?\s*0*(\d+)\b/i
    );

  if (
    episode
  ) {
    return {
      season: null,

      episode:
        Number(
          episode[1]
        ),

      part: null,

      type: "series",

      final: false,
    };
  }

  const part =
    value.match(
      /\b(?:PART|IGICE)\.?\s*0*(\d+)\b/i
    );

  if (
    part
  ) {
    return {
      season: null,

      episode: null,

      part:
        Number(
          part[1]
        ),

      type: "parts",

      final: false,
    };
  }

  if (
    /\b(?:FINAL|LAST)\b/i.test(
      value
    )
  ) {
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

// ============================================================
// RESOLVE EPISODE
// ============================================================

function resolveEpisodeInfo(
  post = {}
) {
  const head =
    post.head ||
    post.storyHead ||
    post.storyTitle ||
    "";

  const detected =
    extractEpisodeInfo(
      head
    );

  const season =
    detected.season ??
    toNumberOrNull(
      post.season ??
        post.seasonNumber ??
        post.seasonNo
    );

  const episode =
    detected.episode ??
    toNumberOrNull(
      post.episode ??
        post.episodeNumber ??
        post.episodeNo
    );

  const part =
    detected.part ??
    toNumberOrNull(
      post.part ??
        post.partNumber ??
        post.partNo
    );

  let type =
    detected.type;

  if (
    episode !== null
  ) {
    type = "series";
  } else if (
    part !== null
  ) {
    type = "parts";
  }

  return {
    season,
    episode,
    part,
    type,
    final:
      detected.final,
  };
}

// ============================================================
// CLEAN TITLE
// ============================================================

function cleanStoryTitle(
  head = ""
) {
  let title =
    String(head)
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  title =
    title.replace(
      /\b(?:S|SEASON)\s*0*\d+\s*(?:EP|EPISODE|E)\s*0*\d+\b/gi,
      ""
    );

  title =
    title.replace(
      /\b(?:EP|EPISODE|E)\s*0*\d+\b/gi,
      ""
    );

  title =
    title.replace(
      /\b(?:PART|IGICE)\s*0*\d+\b/gi,
      ""
    );

  title =
    title.replace(
      /\b(?:FINAL|LAST)\b/gi,
      ""
    );

  title =
    title.replace(
      /\b(?:S|SEASON)\s*0*\d+\b/gi,
      ""
    );

  return title
    .replace(
      /[\-_:.]+$/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

// ============================================================
// DATE
// ============================================================

function getTimestampValue(
  value
) {
  if (!value) {
    return 0;
  }

  if (
    typeof value ===
      "object" &&
    typeof value.toMillis ===
      "function"
  ) {
    return value.toMillis();
  }

  if (
    typeof value ===
      "object" &&
    value.seconds !==
      undefined
  ) {
    return (
      Number(
        value.seconds
      ) * 1000
    );
  }

  const date =
    new Date(
      value
    ).getTime();

  return Number.isNaN(
    date
  )
    ? 0
    : date;
}

// ============================================================
// GROUP STORIES
// ============================================================

function buildStoryGroups(
  posts = []
) {
  const grouped =
    {};

  for (
    const post of posts
  ) {
    const head =
      String(
        post.head ||
          post.storyHead ||
          post.storyTitle ||
          "Untitled Story"
      ).trim();

    const info =
      resolveEpisodeInfo(
        post
      );

    let groupKey;

    if (
      post.storyId
    ) {
      groupKey =
        `story:${post.storyId}`;
    } else if (
      post.summaryId
    ) {
      groupKey =
        `summary:${post.summaryId}`;
    } else {
      groupKey =
        `title:${normalizeText(
          cleanStoryTitle(
            head
          )
        )}`;
    }

    if (
      !grouped[groupKey]
    ) {
      grouped[groupKey] = {
        key: groupKey,

        title:
          post.storyHead ||
          post.storyTitle ||
          cleanStoryTitle(
            head
          ) ||
          "Untitled Story",

        author:
          post.author ||
          "Unknown",

        posts: [],

        seasons:
          new Set(),

        totalViews: 0,
      };
    }

    if (
      info.season !== null
    ) {
      grouped[
        groupKey
      ].seasons.add(
        info.season
      );
    }

    grouped[
      groupKey
    ].posts.push({
      ...post,

      __episodeInfo:
        info,
    });

    grouped[
      groupKey
    ].totalViews +=
      Number(
        post.views || 0
      );
  }

  return Object.values(
    grouped
  ).map(
    (group) => {
      const sortedPosts =
        [
          ...group.posts,
        ].sort(
          (a, b) => {
            const A =
              a.__episodeInfo ||
              {};

            const B =
              b.__episodeInfo ||
              {};

            const seasonA =
              A.season ?? 0;

            const seasonB =
              B.season ?? 0;

            const numberA =
              A.episode ??
              A.part ??
              0;

            const numberB =
              B.episode ??
              B.part ??
              0;

            if (
              seasonA !==
              seasonB
            ) {
              return (
                seasonA -
                seasonB
              );
            }

            if (
              numberA !==
              numberB
            ) {
              return (
                numberA -
                numberB
              );
            }

            return (
              getTimestampValue(
                a.createdAt
              ) -
              getTimestampValue(
                b.createdAt
              )
            );
          }
        );

      const totalEpisodes =
        sortedPosts.filter(
          (post) =>
            post
              .__episodeInfo
              ?.episode !==
            null
        ).length;

      const totalParts =
        sortedPosts.filter(
          (post) =>
            post
              .__episodeInfo
              ?.part !==
            null
        ).length;

      const storyType =
        totalEpisodes >
        0
          ? "series"
          : totalParts >
            0
          ? "parts"
          : "standalone";

      return {
        key:
          group.key,

        title:
          cleanStoryTitle(
            group.title
          ),

        author:
          group.author,

        posts:
          sortedPosts,

        seasons:
          [
            ...group.seasons,
          ].sort(
            (a, b) =>
              a - b
          ),

        totalSeasons:
          group.seasons
            .size,

        totalEpisodes,

        totalParts,

        contentCount:
          storyType ===
          "series"
            ? totalEpisodes
            : storyType ===
              "parts"
            ? totalParts
            : sortedPosts.length,

        storyType,

        totalViews:
          group.totalViews,
      };
    }
  );
}

// ============================================================
// SSR
// ============================================================

export async function getServerSideProps() {
  try {
    const postsQuery =
      query(
        collection(
          db,
          "posts"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );

    const snapshot =
      await getDocs(
        postsQuery
      );

    const posts =
      snapshot.docs.map(
        (doc) => ({
          id: doc.id,

          ...doc.data(),
        })
      );

    const groups =
      buildStoryGroups(
        posts
      );

    const stories =
      groups.map(
        (group) => ({
          key:
            group.key,

          title:
            group.title,

          author:
            group.author,

          totalSeasons:
            group.totalSeasons,

          totalEpisodes:
            group.totalEpisodes,

          totalParts:
            group.totalParts,

          contentCount:
            group.contentCount,

          storyType:
            group.storyType,

          seasons:
            group.seasons,

          episodes:
            group.posts.map(
              (post) => ({
                id:
                  post.id,

                head:
                  post.head ||
                  post.storyHead ||
                  post.storyTitle ||
                  group.title,

                season:
                  post
                    .__episodeInfo
                    ?.season ??
                  null,

                episode:
                  post
                    .__episodeInfo
                    ?.episode ??
                  null,

                part:
                  post
                    .__episodeInfo
                    ?.part ??
                  null,

                content:
                  getPostContent(
                    post
                  ),

                createdAt:
                  getTimestampValue(
                    post.createdAt
                  ),
              })
            ),
        })
      );

    return {
      props: {
        stories,
        serverError: "",
      },
    };
  } catch (error) {
    console.error(
      "POST ANALYZER ERROR:",
      error
    );

    return {
      props: {
        stories: [],

        serverError:
          "Unable to load stories.",
      },
    };
  }
}

// ============================================================
// PAGE
// ============================================================

const BATCH_SIZE = 20;
const MAX_EPISODES_TO_ANALYZE = 50;

export default function AnalysisPost({
  stories = [],
  serverError = "",
}) {
  const { t } = useI18n();

  const [
    selectedKey,
    setSelectedKey,
  ] = useState("");

  const [
    isAnalyzing,
    setIsAnalyzing,
  ] = useState(false);

  const [
    report,
    setReport,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    steps,
    setSteps,
  ] = useState([]);

  // Episode batching state
  const [
    analyzedEpisodes,
    setAnalyzedEpisodes,
  ] = useState([]);

  const [
    pendingEpisodes,
    setPendingEpisodes,
  ] = useState([]);

  const [
    currentBatchIndex,
    setCurrentBatchIndex,
  ] = useState(0);

  const [
    isBatchAnalyzing,
    setIsBatchAnalyzing,
  ] = useState(false);

  const [
    batchProgress,
    setBatchProgress,
  ] = useState(0);

  const [
    totalBatches,
    setTotalBatches,
  ] = useState(0);

  const [
    showFinalReport,
    setShowFinalReport,
  ] = useState(false);

  const [
    finalReport,
    setFinalReport,
  ] = useState(null);

  const [
    isGeneratingFinalReport,
    setIsGeneratingFinalReport,
  ] = useState(false);

  const [
    maxEpisodesReached,
    setMaxEpisodesReached,
  ] = useState(false);

  const [
    totalAvailableEpisodes,
    setTotalAvailableEpisodes,
  ] = useState(0);

  const selectedStory =
    useMemo(
      () =>
        stories.find(
          (story) =>
            story.key ===
            selectedKey
        ) || null,
      [
        stories,
        selectedKey,
      ]
    );

  // Reset state when story changes
  useEffect(() => {
    setReport(null);
    setError("");
    setSteps([]);
    setAnalyzedEpisodes([]);
    setPendingEpisodes([]);
    setCurrentBatchIndex(0);
    setBatchProgress(0);
    setTotalBatches(0);
    setShowFinalReport(false);
    setFinalReport(null);
    setIsBatchAnalyzing(false);
    setMaxEpisodesReached(false);
    setTotalAvailableEpisodes(0);
  }, [selectedKey]);

  // ==========================================================
  // STEPS
  // ==========================================================

  function setActiveStep(
    index
  ) {
    setSteps(
      (current) =>
        current.map(
          (step, i) => ({
            ...step,

            status:
              i < index
                ? "completed"
                : i === index
                ? "active"
                : "pending",
          })
        )
    );
  }

  // ==========================================================
  // ANALYZE BATCH
  // ==========================================================

  async function analyzeBatch(episodes, batchIndex, totalBatches) {
    const batchResults = [];

    for (let i = 0; i < episodes.length; i++) {
      const episode = episodes[i];
      
      try {
        const cleanText = htmlToText(episode.content || "");
        
        if (!cleanText.trim()) {
          batchResults.push({
            ...episode,
            error: "No text content found",
            statistics: null,
          });
          continue;
        }

        // Analyze individual episode
        const response = await fetch(
          "/api/analyze-episode",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              episode: {
                ...episode,
                content: cleanText,
              },
              storyTitle: selectedStory.title,
              storyAuthor: selectedStory.author,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          batchResults.push({
            ...episode,
            error: data.error || "Analysis failed",
            statistics: null,
          });
        } else {
          batchResults.push({
            ...episode,
            ...data.analysis,
            error: null,
          });
        }
      } catch (error) {
        console.error("Episode analysis error:", error);
        batchResults.push({
          ...episode,
          error: error?.message || "Analysis failed",
          statistics: null,
        });
      }

      // Update progress
      setBatchProgress((prev) => prev + 1);
    }

    return batchResults;
  }

  // ==========================================================
  // START BATCHED ANALYSIS
  // ==========================================================

  async function handleAnalyze() {
    setError("");
    setReport(null);
    setFinalReport(null);
    setShowFinalReport(false);
    setAnalyzedEpisodes([]);
    setCurrentBatchIndex(0);
    setMaxEpisodesReached(false);

    if (!selectedStory) {
      setError(
        t("Banza uhitemo inkuru ushaka gusesengura.")
      );
      return;
    }

    const episodes = selectedStory.episodes || [];

    if (!episodes.length) {
      setError(
        t("Iyi nkuru nta episodes cyangwa parts ifite.")
      );
      return;
    }

    // Check which episodes have content
    const validEpisodes = episodes.filter(
      (ep) => ep.content && ep.content.trim().length > 0
    );

    if (!validEpisodes.length) {
      setError(
        t("Nta text yabonetse muri episodes. Reba ko field ari 'story'.")
      );
      return;
    }

    // Store total available for display
    setTotalAvailableEpisodes(validEpisodes.length);

    // Check if we need to limit to MAX_EPISODES_TO_ANALYZE
    let episodesToAnalyze = validEpisodes;
    let limited = false;

    if (validEpisodes.length > MAX_EPISODES_TO_ANALYZE) {
      episodesToAnalyze = validEpisodes.slice(0, MAX_EPISODES_TO_ANALYZE);
      limited = true;
      setMaxEpisodesReached(true);
    }

    // Determine if batching is needed
    const totalEpisodes = episodesToAnalyze.length;
    const needsBatching = totalEpisodes > BATCH_SIZE;

    if (needsBatching) {
      // Start batched analysis
      const total = Math.ceil(totalEpisodes / BATCH_SIZE);
      setTotalBatches(total);
      setBatchProgress(0);
      setPendingEpisodes(episodesToAnalyze);
      setCurrentBatchIndex(0);
      setIsBatchAnalyzing(true);
      setAnalyzedEpisodes([]);

      // Analyze first batch
      await analyzeNextBatch(episodesToAnalyze, 0, total, limited);
    } else {
      // Single batch analysis (all episodes at once)
      await analyzeAllAtOnce(episodesToAnalyze, limited);
    }
  }

  // ==========================================================
  // ANALYZE NEXT BATCH
  // ==========================================================

  async function analyzeNextBatch(allEpisodes, batchIndex, totalBatches, limited = false) {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, allEpisodes.length);
    const batchEpisodes = allEpisodes.slice(start, end);

    setSteps([
      {
        text: `Gusesengura batch ${batchIndex + 1}/${totalBatches} (episodes ${start + 1}-${end})`,
        status: "active",
      },
      {
        text: "Gukusanya results",
        status: "pending",
      },
      {
        text: "Kubika analysis",
        status: "pending",
      },
    ]);

    try {
      const results = await analyzeBatch(batchEpisodes, batchIndex, totalBatches);

      // Update analyzed episodes
      setAnalyzedEpisodes((prev) => [...prev, ...results]);

      // Update steps
      setSteps([
        {
          text: `Batch ${batchIndex + 1}/${totalBatches} yarangije`,
          status: "completed",
        },
        {
          text: `Episodes ${start + 1}-${end} byasesenguwe`,
          status: "completed",
        },
        {
          text: `Episodes ${end + 1}-${allEpisodes.length > end ? allEpisodes.length - end : 0} zisigaye`,
          status: "pending",
        },
      ]);

      setCurrentBatchIndex(batchIndex + 1);

      // Check if all batches are done
      if (batchIndex + 1 < totalBatches) {
        // Not done - show button to analyze next batch
        setIsBatchAnalyzing(false);
      } else {
        // All done
        setIsBatchAnalyzing(false);
        setShowFinalReport(true);
        setSteps([
          {
            text: "Byose byarangije!",
            status: "completed",
          },
          {
            text: "Kanda 'View Final Report' kugira ubone report ya zose",
            status: "completed",
          },
        ]);

        // If limited, show warning
        if (limited) {
          setSteps((prev) => [
            ...prev,
            {
              text: `⚠️ Episodes zirenze ${MAX_EPISODES_TO_ANALYZE}. Gusa ${MAX_EPISODES_TO_ANALYZE} za mbere zasesenguwe.`,
              status: "completed",
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Batch analysis error:", error);
      setError(error?.message || t("Batch analysis failed."));
      setIsBatchAnalyzing(false);
    }
  }

  // ==========================================================
  // ANALYZE REMAINING BATCHES
  // ==========================================================

  async function handleAnalyzeRemaining() {
    const allEpisodes = pendingEpisodes.length > 0 ? pendingEpisodes : selectedStory.episodes || [];
    const total = Math.ceil(allEpisodes.length / BATCH_SIZE);
    
    // Resume from current batch index
    const nextBatchIndex = currentBatchIndex;
    
    if (nextBatchIndex >= total) {
      setShowFinalReport(true);
      return;
    }

    setIsBatchAnalyzing(true);
    await analyzeNextBatch(allEpisodes, nextBatchIndex, total, maxEpisodesReached);
  }

  // ==========================================================
  // ANALYZE ALL AT ONCE (for <= 20 episodes)
  // ==========================================================

  async function analyzeAllAtOnce(episodes, limited = false) {
    setSteps([
      {
        text: "Gusoma episodes zose",
        status: "active",
      },
      {
        text: "Gukusanya text yose",
        status: "pending",
      },
      {
        text: "Kubara words na characters",
        status: "pending",
      },
      {
        text: "Kubara sentences na averages",
        status: "pending",
      },
      {
        text: "Gukora AI writing analysis",
        status: "pending",
      },
      {
        text: "Gushakisha possible sources",
        status: "pending",
      },
      {
        text: "Gutegura final report",
        status: "pending",
      },
    ]);

    setIsAnalyzing(true);

    try {
      // Clean episodes
      setActiveStep(0);

      const episodeTexts = episodes.map((episode, index) => {
        const cleanText = htmlToText(episode.content || "");
        return {
          ...episode,
          episodeIndex: index + 1,
          cleanText,
        };
      });

      const validEpisodes = episodeTexts.filter(
        (ep) => ep.cleanText && ep.cleanText.trim().length > 0
      );

      if (!validEpisodes.length) {
        throw new Error("Nta text yabonetse muri episodes.");
      }

      // Combine all text
      setActiveStep(1);

      const combinedText = validEpisodes
        .map((episode) => {
          return [`=== ${episode.head} ===`, "", episode.cleanText].join("\n");
        })
        .join("\n\n");

      if (!combinedText.trim()) {
        throw new Error("Text yose yakusanyijwe irimo ubusa.");
      }

      // Send to API
      setActiveStep(2);

      const response = await fetch("/api/analyze-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: combinedText,
          title: selectedStory.title,
          author: selectedStory.author,
          totalSeasons: selectedStory.totalSeasons,
          totalEpisodes: selectedStory.totalEpisodes,
          totalParts: selectedStory.totalParts,
          episodeCount: validEpisodes.length,
          episodes: validEpisodes.map((episode) => ({
            id: episode.id,
            head: episode.head,
            season: episode.season,
            episode: episode.episode,
            part: episode.part,
            content: episode.cleanText,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Analysis failed.");
      }

      setActiveStep(3);
      await new Promise((resolve) => setTimeout(resolve, 150));
      setActiveStep(4);
      await new Promise((resolve) => setTimeout(resolve, 150));
      setActiveStep(5);
      await new Promise((resolve) => setTimeout(resolve, 150));
      setActiveStep(6);

      // Add AI likelihood percentages to report
      if (data.aiAnalysis) {
        // Calculate human likelihood if not provided
        if (data.aiAnalysis.aiLikelihood !== undefined && data.aiAnalysis.aiLikelihood !== null) {
          data.aiAnalysis.humanLikelihood = 100 - data.aiAnalysis.aiLikelihood;
        }
      }

      setReport({
        ...data,
        clientInfo: {
          totalEpisodesRead: validEpisodes.length,
          totalCharactersSent: combinedText.length,
          totalWordsSent: combinedText.split(/\s+/).filter(Boolean).length,
        },
      });

      // Also set as final report
      setFinalReport(data);

      // If limited, show warning
      if (limited) {
        setSteps((prev) => [
          ...prev,
          {
            text: `⚠️ Episodes zirenze ${MAX_EPISODES_TO_ANALYZE}. Gusa ${MAX_EPISODES_TO_ANALYZE} za mbere zasesenguwe.`,
            status: "completed",
          },
        ]);
      }
    } catch (error) {
      console.error("Analysis error:", error);
      setError(error?.message || t("Analysis failed."));
    } finally {
      setIsAnalyzing(false);
    }
  }

  // ==========================================================
  // GENERATE FINAL REPORT
  // ==========================================================

  async function handleGenerateFinalReport() {
  if (!analyzedEpisodes.length) {
    setError(t("Nta episodes zasesenguwe."));
    return;
  }

  // Always reset loading state
  try {
    const successfulEpisodes = analyzedEpisodes.filter(
      (ep) => !ep.error
    );

    if (!successfulEpisodes.length) {
      throw new Error(
        "Nta episode yabashije gusesengurwa neza."
      );
    }

    // Combine statistics from all episodes
    const statistics = successfulEpisodes.reduce(
      (acc, ep) => {
        const s = ep.statistics || {};

        acc.totalWords += Number(s.totalWords) || 0;
        acc.totalCharacters += Number(s.totalCharacters) || 0;
        acc.totalCharactersNoSpaces += Number(s.totalCharactersNoSpaces) || 0;
        acc.totalSentences += Number(s.totalSentences) || 0;
        acc.totalParagraphs += Number(s.totalParagraphs) || 0;
        acc.totalLines += Number(s.totalLines) || 0;

        return acc;
      },
      {
        totalWords: 0,
        totalCharacters: 0,
        totalCharactersNoSpaces: 0,
        totalSentences: 0,
        totalParagraphs: 0,
        totalLines: 0,
      }
    );

    const totalWords = statistics.totalWords || 1;
    const totalCharacters = statistics.totalCharacters || 1;
    const totalSentences = statistics.totalSentences || 1;
    const totalParagraphs = statistics.totalParagraphs || 1;

    // Calculate full averages
    const averages = {
      wordsPerSentence: totalWords / totalSentences,
      charactersPerWord: statistics.totalCharactersNoSpaces / totalWords,
      wordsPerParagraph: totalWords / totalParagraphs,
      sentencesPerParagraph: totalSentences / totalParagraphs,
      wordsPer1000Characters: (totalWords / totalCharacters) * 1000,
      sentencesPer1000Words: (totalSentences / totalWords) * 1000,
    };

    const finalData = {
      success: true,

      story: {
        title: selectedStory?.title || "-",
        author: selectedStory?.author || "-",
        totalSeasons: selectedStory?.totalSeasons || 0,
        totalEpisodes: selectedStory?.totalEpisodes || 0,
        totalParts: selectedStory?.totalParts || 0,
        episodeCount: successfulEpisodes.length,
      },

      statistics,

      averages,

      aiAnalysis: {
        aiLikelihood: null,
        humanLikelihood: null,
        confidence: "-",
        writingStyle: "-",
        summary:
          "Final report yako ikoresheje results za episodes zimaze gusesengurwa.",
      },

      sources: [],
      sourceCount: 0,

      episodes: successfulEpisodes,
    };

    setFinalReport(finalData);
    setShowFinalReport(true);
    setError("");
  } catch (err) {
    console.error("FINAL REPORT BUILD ERROR:", err);
    setError(err?.message || t("Failed to build final report."));
  } finally {
    // Always reset the loading state
    setIsGeneratingFinalReport(false);
  }
}
  // ==========================================================
  // REPORT TEXT
  // ==========================================================

  function createReportText() {
    const reportData = finalReport || report;
    
    if (!reportData) {
      return "";
    }

    const story = reportData.story || {};
    const stats = reportData.statistics || {};
    const averages = reportData.averages || {};
    const ai = reportData.aiAnalysis || {};
    const sources = reportData.sources || [];

    const aiLikelihood = ai.aiLikelihood !== undefined && ai.aiLikelihood !== null 
      ? `${ai.aiLikelihood}%` 
      : "-";
    const humanLikelihood = ai.humanLikelihood !== undefined && ai.humanLikelihood !== null 
      ? `${ai.humanLikelihood}%` 
      : "-";

    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const lines = [
      "═══════════════════════════════════════",
      "   NEW TALENTS STORIES GROUP",
      "   STORY ANALYSIS REPORT",
      "═══════════════════════════════════════",
      "",
      `📖 Title: ${story.title || "-"}`,
      `✍️ Author: ${story.author || "-"}`,
      "",
      "📊 CONTENT STATISTICS",
      "───────────────────────────────",
      `Words: ${stats.totalWords || 0}`,
      `Characters: ${stats.totalCharacters || 0}`,
      `Characters without spaces: ${stats.totalCharactersNoSpaces || 0}`,
      `Sentences: ${stats.totalSentences || 0}`,
      `Paragraphs: ${stats.totalParagraphs || 0}`,
      "",
      "📈 AVERAGES",
      "───────────────────────────────",
      `Words per sentence: ${averages.wordsPerSentence || 0}`,
      `Characters per word: ${averages.charactersPerWord || 0}`,
      `Words per paragraph: ${averages.wordsPerParagraph || 0}`,
      `Sentences per paragraph: ${averages.sentencesPerParagraph || 0}`,
      `Words per 1000 characters: ${averages.wordsPer1000Characters || 0}`,
      `Sentences per 1000 words: ${averages.sentencesPer1000Words || 0}`,
      "",
      "🤖 AI WRITING ANALYSIS",
      "───────────────────────────────",
      `AI Likelihood: ${aiLikelihood}`,
      `Human Likelihood: ${humanLikelihood}`,
      `Confidence: ${ai.confidence ?? "-"}`,
      `Writing style: ${ai.writingStyle ?? "-"}`,
      `Summary: ${ai.summary || "-"}`,
      "",
      `🔍 SOURCES FOUND: ${sources.length}`,
    ];

    sources.forEach((source, index) => {
      lines.push(`${index + 1}. ${source.title || "Source"}`);
      if (source.url) {
        lines.push(`   URL: ${source.url}`);
      }
      if (source.description) {
        lines.push(`   ${source.description}`);
      }
    });

    // Add episode breakdown if available
    if (analyzedEpisodes.length > 0) {
      lines.push("");
      lines.push("📋 EPISODE BREAKDOWN");
      lines.push("───────────────────────────────");
      analyzedEpisodes.forEach((ep, idx) => {
        lines.push(`${idx + 1}. ${ep.head || "Untitled"}`);
        if (ep.statistics) {
          lines.push(`   Words: ${ep.statistics.totalWords || 0}`);
          lines.push(`   Characters: ${ep.statistics.totalCharacters || 0}`);
          lines.push(`   Sentences: ${ep.statistics.totalSentences || 0}`);
        }
        if (ep.error) {
          lines.push(`   ❌ Error: ${ep.error}`);
        }
        lines.push("");
      });
    }

    if (maxEpisodesReached) {
      lines.push("");
      lines.push(`⚠️ NOTE: Episodes zirenze ${MAX_EPISODES_TO_ANALYZE}. Gusa ${MAX_EPISODES_TO_ANALYZE} za mbere zasesenguwe.`);
    }

    lines.push(
      "───────────────────────────────",
      `Generated by Net AI Assistant on ${generatedDate}`,
      "═══════════════════════════════════════"
    );

    return lines.join("\n");
  }

  // ==========================================================
  // COPY
  // ==========================================================

  async function handleCopyReport() {
    const text = createReportText();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      const btn = document.activeElement;
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = "✅ Copied!";
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      }
    } catch (error) {
      console.error(error);
      alert(t("Copy byanze."));
    }
  }

  // ==========================================================
  // DOWNLOAD
  // ==========================================================

  function handleDownloadReport() {
    const text = createReportText();
    if (!text) return;

    const blob = new Blob([text], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(selectedStory?.title || "story-analysis")
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()}.txt`;

    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ==========================================================
  // SHARE
  // ==========================================================

  async function handleShareReport() {
    const text = createReportText();
    if (!text) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Story Analysis Report",
          text,
        });
        return;
      } catch (error) {
        console.log(error);
      }
    }

    await handleCopyReport();
  }

  // ==========================================================
  // WHATSAPP
  // ==========================================================

  function handleWhatsApp() {
    const text = createReportText();
    if (!text) return;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ==========================================================
  // EMAIL
  // ==========================================================

  function handleEmail() {
    const text = createReportText();
    if (!text) return;

    const subject = `Story Analysis Report - ${selectedStory?.title || ""}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  const totalValidEpisodes = selectedStory?.episodes?.filter(
    (ep) => ep.content && ep.content.trim().length > 0
  ).length || 0;

  const episodesToAnalyze = Math.min(totalValidEpisodes, MAX_EPISODES_TO_ANALYZE);
  const needsBatching = episodesToAnalyze > BATCH_SIZE;
  const hasAnalyzedEpisodes = analyzedEpisodes.length > 0;
  const hasPendingEpisodes = needsBatching && currentBatchIndex * BATCH_SIZE < episodesToAnalyze;
  const allBatchesDone = !hasPendingEpisodes && hasAnalyzedEpisodes && needsBatching;

  // Get AI likelihood values for display
  const getAILikelihood = (aiData) => {
    if (aiData?.aiLikelihood !== undefined && aiData?.aiLikelihood !== null) {
      return aiData.aiLikelihood;
    }
    return null;
  };

  const getHumanLikelihood = (aiData) => {
    if (aiData?.humanLikelihood !== undefined && aiData?.humanLikelihood !== null) {
      return aiData.humanLikelihood;
    }
    // Calculate if only AI likelihood is available
    if (aiData?.aiLikelihood !== undefined && aiData?.aiLikelihood !== null) {
      return 100 - aiData.aiLikelihood;
    }
    return null;
  };

  const aiData = finalReport?.aiAnalysis || report?.aiAnalysis;
  const aiLikelihood = getAILikelihood(aiData);
  const humanLikelihood = getHumanLikelihood(aiData);

  return (
    <>
      <Head>
        <title>{t("Post Analyzer | New Talents Stories Group")}</title>

        <meta
          name="description"
          content="Analyze stories, episodes, writing statistics, AI writing patterns and possible sources."
        />
      </Head>

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>{t("📊 Story Analyzer")}</h1>
            <p className={styles.subtitle}>{t("Sesengura inkuru, episodes, writing style na possible sources")}</p>
          </div>

          {serverError && (
            <div className={styles.errorBanner}>
              {serverError}
            </div>
          )}

          {/* ==================================================
              STORY SELECT
          ================================================== */}

          <div className={styles.selectSection}>
            <label className={styles.label}>{t("Hitamo inkuru")}</label>

            <select
              value={selectedKey}
              onChange={(e) =>
                setSelectedKey(e.target.value)
              }
              className={styles.select}
            >
              <option value="">{t("-- Hitamo inkuru --")}</option>

              {stories.map((story) => (
                <option
                  key={story.key}
                  value={story.key}
                >
                  {story.title} - {story.contentCount}{" "}
                  {story.storyType === "series"
                    ? t("episodes")
                    : story.storyType === "parts"
                    ? t("parts")
                    : t("post")}
                </option>
              ))}
            </select>
          </div>

          {/* ==================================================
              SELECTED STORY INFO
          ================================================== */}

          {selectedStory && (
            <div className={styles.storyCard}>
              <h2 className={styles.storyTitle}>{selectedStory.title}</h2>

              <div className={styles.storyGrid}>
                <div className={styles.storyInfoItem}>
                  <span className={styles.storyInfoLabel}>{t("Umwanditsi")}</span>
                  <span className={styles.storyInfoValue}>{selectedStory.author}</span>
                </div>
                <div className={styles.storyInfoItem}>
                  <span className={styles.storyInfoLabel}>{t("Episodes")}</span>
                  <span className={styles.storyInfoValue}>{selectedStory.totalEpisodes}</span>
                </div>
                <div className={styles.storyInfoItem}>
                  <span className={styles.storyInfoLabel}>{t("Parts")}</span>
                  <span className={styles.storyInfoValue}>{selectedStory.totalParts}</span>
                </div>
                <div className={styles.storyInfoItem}>
                  <span className={styles.storyInfoLabel}>{t("Seasons")}</span>
                  <span className={styles.storyInfoValue}>{selectedStory.totalSeasons}</span>
                </div>
                <div className={styles.storyInfoItem}>
                  <span className={styles.storyInfoLabel}>{t("Texts zibonetse")}</span>
                  <span className={styles.storyInfoValue}>
                    {selectedStory.episodes.filter(
                      (e) => e.content && e.content.trim().length > 0
                    ).length}
                    /{selectedStory.episodes.length}
                  </span>
                </div>
              </div>

              {totalValidEpisodes > MAX_EPISODES_TO_ANALYZE && (
                <div className={styles.limitWarning}>{t("⚠️ Iyi nkuru ifite {totalValidEpisodes} episodes. Gusa {MAX_EPISODES_TO_ANALYZE} za mbere zizasesengurwa.", { totalValidEpisodes, MAX_EPISODES_TO_ANALYZE })}</div>
              )}

              {needsBatching && (
                <div className={styles.batchWarning}>{t("⚠️ Iyi nkuru ifite episodes zirenze {BATCH_SIZE}. Zizasesengurwa mu batches za {BATCH_SIZE2}.", { BATCH_SIZE, BATCH_SIZE2: BATCH_SIZE })}</div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || isBatchAnalyzing || isGeneratingFinalReport}
                className={`${styles.primaryButton} ${
                  isAnalyzing || isBatchAnalyzing || isGeneratingFinalReport ? styles.buttonDisabled : ""
                }`}
              >
                {isAnalyzing
                  ? t("⏳ Birimo gusesengura...")
                  : isBatchAnalyzing
                  ? `⏳ Birimo gusesengura batch ${currentBatchIndex + 1}/${totalBatches}...`
                  : isGeneratingFinalReport
                  ? t("⏳ Birimo gutegura final report...")
                  : totalValidEpisodes > MAX_EPISODES_TO_ANALYZE
                  ? t("🚀 Sesengura {MAX_EPISODES_TO_ANALYZE} za mbere (kuri {totalValidEpisodes})", { MAX_EPISODES_TO_ANALYZE, totalValidEpisodes })
                  : t("🚀 Tangira Analysis")}
              </button>
            </div>
          )}

          {/* ==================================================
              BATCH PROGRESS
          ================================================== */}

          {isBatchAnalyzing && totalBatches > 0 && (
            <div className={styles.progressCard}>
              <h3 className={styles.progressTitle}>{t("Analysis progress")}</h3>
              
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${(batchProgress / (episodesToAnalyze || 1)) * 100}%`,
                  }}
                />
              </div>

              <p className={styles.progressText}>{t("Batch")}{" "}{currentBatchIndex + 1}/{totalBatches} -{" "}
                {Math.round((batchProgress / (episodesToAnalyze || 1)) * 100)}%
                {maxEpisodesReached && t("({MAX_EPISODES_TO_ANALYZE}/{totalValidEpisodes} episodes)", { MAX_EPISODES_TO_ANALYZE, totalValidEpisodes })}
              </p>
            </div>
          )}

          {/* ==================================================
              ANALYZE REMAINING BUTTON
          ================================================== */}

          {hasPendingEpisodes && !isBatchAnalyzing && (
            <div className={styles.remainingCard}>
              <p>{t("✅ {length} episodes zasesenguwe.", { length: analyzedEpisodes.length })}{episodesToAnalyze - analyzedEpisodes.length}{" "}{t("zisigaye.")}{maxEpisodesReached && t("({MAX_EPISODES_TO_ANALYZE}/{totalValidEpisodes} total)", { MAX_EPISODES_TO_ANALYZE, totalValidEpisodes })}
              </p>

              <button
                onClick={handleAnalyzeRemaining}
                disabled={isBatchAnalyzing}
                className={styles.secondaryButton}
              >{t("Sesengura episodes zisigaye (")}{episodesToAnalyze - analyzedEpisodes.length})
              </button>
            </div>
          )}

          {/* ==================================================
              VIEW FINAL REPORT BUTTON
          ================================================== */}

          {allBatchesDone && !isBatchAnalyzing && (
            <div className={styles.finalReportCard}>
              <p>{t("✅ Byose byarangije! {length} episodes zasesenguwe zose.", { length: analyzedEpisodes.length })}{maxEpisodesReached && t("({MAX_EPISODES_TO_ANALYZE}/{totalValidEpisodes} total)", { MAX_EPISODES_TO_ANALYZE, totalValidEpisodes })}
              </p>

              <button
                onClick={handleGenerateFinalReport}
                disabled={isGeneratingFinalReport}
                className={styles.successButton}
              >
                {isGeneratingFinalReport ? t("⏳ Birimo gutegura...") : t("📊 View Final Report")}
              </button>
            </div>
          )}

          {/* ==================================================
              STEPS
          ================================================== */}

          {steps.length > 0 && !showFinalReport && (
            <div className={styles.stepsContainer}>
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`${styles.stepItem} ${
                    step.status === "completed" ? styles.stepCompleted :
                    step.status === "active" ? styles.stepActive :
                    styles.stepPending
                  }`}
                >
                  <span className={styles.stepIcon}>
                    {step.status === "completed"
                      ? "✅"
                      : step.status === "active"
                      ? "⏳"
                      : "○"}
                  </span>
                  <span>{step.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (
            <pre className={styles.errorMessage}>
              {error}
            </pre>
          )}

          {/* ==================================================
              FINAL REPORT VIEW
          ================================================== */}

          {(showFinalReport || report) && (finalReport || report) && (
            <section className={styles.reportSection}>
              <div className={styles.actionButtons}>
                <button onClick={handleCopyReport} className={`${styles.actionButton} ${styles.copyButton}`}>{t("📋 Copy")}</button>
                <button onClick={handleDownloadReport} className={`${styles.actionButton} ${styles.downloadButton}`}>{t("📥 Download")}</button>
                <button onClick={handleShareReport} className={`${styles.actionButton} ${styles.shareButton}`}>{t("📤 Share")}</button>
                <button onClick={handleWhatsApp} className={`${styles.actionButton} ${styles.whatsappButton}`}>{t("💬 WhatsApp")}</button>
                <button onClick={handleEmail} className={`${styles.actionButton} ${styles.emailButton}`}>{t("📧 Email")}</button>
              </div>

              {/* STORY */}
              <div className={styles.reportCard}>
                <h2 className={styles.cardTitle}>{t("📖 Story")}</h2>
                <div className={styles.cardContent}>
                  <p><span className={styles.cardLabel}>{t("Title:")}</span> {finalReport?.story?.title || report?.story?.title}</p>
                  <p><span className={styles.cardLabel}>{t("Author:")}</span> {finalReport?.story?.author || report?.story?.author}</p>
                  <p><span className={styles.cardLabel}>{t("Seasons:")}</span> {finalReport?.story?.totalSeasons || report?.story?.totalSeasons}</p>
                  <p><span className={styles.cardLabel}>{t("Episodes:")}</span> {finalReport?.story?.totalEpisodes || report?.story?.totalEpisodes}</p>
                  <p><span className={styles.cardLabel}>{t("Parts:")}</span> {finalReport?.story?.totalParts || report?.story?.totalParts}</p>
                  <p><span className={styles.cardLabel}>{t("Episodes analyzed:")}</span> {analyzedEpisodes.length || finalReport?.story?.episodeCount || report?.story?.episodeCount}</p>
                  {maxEpisodesReached && (
                    <p className={styles.limitNote}>{t("⚠️ Gusa {MAX_EPISODES_TO_ANALYZE} za mbere zasesenguwe kuri {totalValidEpisodes}", { MAX_EPISODES_TO_ANALYZE, totalValidEpisodes })}</p>
                  )}
                </div>
              </div>

              {/* STATISTICS */}
              <div className={styles.reportCard}>
                <h2 className={styles.cardTitle}>{t("📊 Statistics")}</h2>
                <div className={styles.statsGrid}>
                  <Stat label={t("Words")} value={finalReport?.statistics?.totalWords || report?.statistics?.totalWords} />
                  <Stat label={t("Characters")} value={finalReport?.statistics?.totalCharacters || report?.statistics?.totalCharacters} />
                  <Stat label={t("Characters (no spaces)")} value={finalReport?.statistics?.totalCharactersNoSpaces || report?.statistics?.totalCharactersNoSpaces} />
                  <Stat label={t("Sentences")} value={finalReport?.statistics?.totalSentences || report?.statistics?.totalSentences} />
                  <Stat label={t("Paragraphs")} value={finalReport?.statistics?.totalParagraphs || report?.statistics?.totalParagraphs} />
                  <Stat label={t("Lines")} value={finalReport?.statistics?.totalLines || report?.statistics?.totalLines} />
                </div>
              </div>

              {/* AVERAGES */}
              <div className={styles.reportCard}>
                <h2 className={styles.cardTitle}>{t("📈 Averages")}</h2>
                <div className={styles.statsGrid}>
                  <Stat label={t("Words per sentence")} value={finalReport?.averages?.wordsPerSentence || report?.averages?.wordsPerSentence} />
                  <Stat label={t("Characters per word")} value={finalReport?.averages?.charactersPerWord || report?.averages?.charactersPerWord} />
                  <Stat label={t("Words per paragraph")} value={finalReport?.averages?.wordsPerParagraph || report?.averages?.wordsPerParagraph} />
                  <Stat label={t("Sentences per paragraph")} value={finalReport?.averages?.sentencesPerParagraph || report?.averages?.sentencesPerParagraph} />
                  <Stat label={t("Words / 1000 chars")} value={finalReport?.averages?.wordsPer1000Characters || report?.averages?.wordsPer1000Characters} />
                  <Stat label={t("Sentences / 1000 words")} value={finalReport?.averages?.sentencesPer1000Words || report?.averages?.sentencesPer1000Words} />
                </div>
              </div>

              {/* AI - Enhanced with percentage bars */}
              <div className={styles.reportCard}>
                <h2 className={styles.cardTitle}>{t("🤖 AI Writing Analysis")}</h2>
                
                {/* AI Likelihood Bar */}
                {aiLikelihood !== null && (
                  <div className={styles.aiBarContainer}>
                    <div className={styles.aiBarLabel}>
                      <span>{t("🤖 AI Likelihood")}</span>
                      <span className={styles.aiBarPercentage}>{aiLikelihood}%</span>
                    </div>
                    <div className={styles.aiBarTrack}>
                      <div 
                        className={`${styles.aiBarFill} ${styles.aiFill}`}
                        style={{ width: `${Math.min(aiLikelihood, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Human Likelihood Bar */}
                {humanLikelihood !== null && (
                  <div className={styles.aiBarContainer}>
                    <div className={styles.aiBarLabel}>
                      <span>{t("👤 Human Likelihood")}</span>
                      <span className={styles.aiBarPercentage}>{humanLikelihood}%</span>
                    </div>
                    <div className={styles.aiBarTrack}>
                      <div 
                        className={`${styles.aiBarFill} ${styles.humanFill}`}
                        style={{ width: `${Math.min(humanLikelihood, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className={styles.cardContent}>
                  <p><span className={styles.cardLabel}>{t("Confidence:")}</span> {finalReport?.aiAnalysis?.confidence || report?.aiAnalysis?.confidence || "-"}</p>
                  <p><span className={styles.cardLabel}>{t("Writing style:")}</span> {finalReport?.aiAnalysis?.writingStyle || report?.aiAnalysis?.writingStyle || "-"}</p>
                  <p><span className={styles.cardLabel}>{t("Summary:")}</span></p>
                  <p className={styles.aiSummary}>{finalReport?.aiAnalysis?.summary || report?.aiAnalysis?.summary || t("No summary.")}</p>

                  {!finalReport?.aiAnalysisStatus?.success && !report?.aiAnalysisStatus?.success && (
                    <p className={styles.warningText}>{t("⚠️ AI analysis nti yabashije gukorwa:")}{" "}
                      {finalReport?.aiAnalysisStatus?.error || report?.aiAnalysisStatus?.error || t("Unknown error")}
                    </p>
                  )}
                </div>
              </div>

              {/* SOURCES */}
              <div className={styles.reportCard}>
                <h2 className={styles.cardTitle}>{t("🔍 Possible Sources (")}{finalReport?.sourceCount || report?.sourceCount || 0})
                </h2>
                {(finalReport?.sources || report?.sources)?.length ? (
                  (finalReport?.sources || report?.sources).map((source, index) => (
                    <div key={`${source.url}-${index}`} className={styles.sourceItem}>
                      <h3 className={styles.sourceTitle}>
                        {index + 1}. {source.title}
                      </h3>
                      {source.description && <p className={styles.sourceDescription}>{source.description}</p>}
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.sourceLink}
                        >
                          🔗 {source.url}
                        </a>
                      )}
                    </div>
                  ))
                ) : (
                  <p className={styles.noSources}>{t("Nta possible sources zabonetse.")}</p>
                )}
              </div>

              {/* EPISODE BREAKDOWN */}
              {analyzedEpisodes.length > 0 && (
                <div className={styles.reportCard}>
                  <h2 className={styles.cardTitle}>{t("📋 Episode Breakdown ({length})", { length: analyzedEpisodes.length })}</h2>
                  {analyzedEpisodes.map((episode, index) => (
                    <div key={episode.id || index} className={styles.episodeItem}>
                      <h3 className={styles.episodeTitle}>
                        {index + 1}. {episode.head || `Episode ${index + 1}`}
                        {episode.season && t("(Season {season})", { season: episode.season })}
                        {episode.episode && t("- Episode {episode}", { episode: episode.episode })}
                        {episode.part && t("- Part {part}", { part: episode.part })}
                      </h3>

                      {episode.error ? (
                        <p className={styles.episodeError}>{t("❌ Error: {error}", { error: episode.error })}</p>
                      ) : (
                        <div className={styles.episodeStats}>
                          <span>{t("Words:")}{" "}{episode.statistics?.totalWords || 0}</span>
                          <span>{t("Characters:")}{" "}{episode.statistics?.totalCharacters || 0}</span>
                          <span>{t("Sentences:")}{" "}{episode.statistics?.totalSentences || 0}</span>
                          <span>{t("Avg words/sentence:")}{" "}{episode.statistics?.averageWordsPerSentence || 0}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {maxEpisodesReached && (
                    <p className={styles.limitNote}>{t("⚠️ Gusa {MAX_EPISODES_TO_ANALYZE} za mbere zasesenguwe. Episodes 51-{totalValidEpisodes} ntizasesenguwe.", { MAX_EPISODES_TO_ANALYZE, totalValidEpisodes })}</p>
                  )}
                </div>
              )}

              {/* Generated by footer */}
              <div className={styles.footerNote}>{t("Generated by Net AI Assistant on")}{' '}
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

// ============================================================
// STAT
// ============================================================

function Stat({ label, value }) {
  return (
    <div className={styles.statItem}>
      <span className={styles.statLabel}>{label}</span>
      <strong className={styles.statValue}>{value ?? 0}</strong>
    </div>
  );
}
