// pages/api/analyze-post.js

import { analyzeText } from "../../lib/textAnalysis";
import { analyzeAIWriting } from "../../lib/aiAnlysis";
import { searchSources } from "../../lib/sourceSearch";

// ============================================================
// HELPERS
// ============================================================

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value, decimals = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Number(n.toFixed(decimals));
}

function normalizeWhitespace(text = "") {
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ============================================================
// HTML -> TEXT
// ============================================================

function htmlToText(value = "") {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    return String(value);
  }

  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<\/blockquote>/gi, "\n")
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

// ============================================================
// TEXT STATISTICS
// ============================================================

function calculateStatistics(text = "") {
  const clean = normalizeWhitespace(
    htmlToText(text)
  );

  if (!clean) {
    return {
      totalWords: 0,
      totalCharacters: 0,
      totalCharactersNoSpaces: 0,
      totalSentences: 0,
      totalParagraphs: 0,
      totalLines: 0,
      averageWordsPerSentence: 0,
      averageCharactersPerWord: 0,
      averageSentencesPerParagraph: 0,
      averageWordsPerParagraph: 0,
      wordsPer1000Characters: 0,
      sentencesPer1000Words: 0,
      longestWord: "",
      longestSentenceWords: 0,
      shortestSentenceWords: 0,
    };
  }

  const words = clean
    .split(/\s+/)
    .filter(Boolean);

  const totalWords = words.length;

  const totalCharacters = clean.length;

  const totalCharactersNoSpaces = clean.replace(
    /\s/g,
    ""
  ).length;

  const sentences =
    clean.match(
      /[^.!?…]+(?:[.!?…]+|$)/g
    ) || [];

  const cleanSentences = sentences
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const totalSentences =
    cleanSentences.length;

  const paragraphs = clean
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const totalParagraphs =
    paragraphs.length;

  const totalLines = clean
    .split("\n")
    .filter((line) => line.trim())
    .length;

  const averageWordsPerSentence =
    totalSentences > 0
      ? totalWords / totalSentences
      : 0;

  const averageCharactersPerWord =
    totalWords > 0
      ? totalCharactersNoSpaces / totalWords
      : 0;

  const averageSentencesPerParagraph =
    totalParagraphs > 0
      ? totalSentences / totalParagraphs
      : 0;

  const averageWordsPerParagraph =
    totalParagraphs > 0
      ? totalWords / totalParagraphs
      : 0;

  const wordsPer1000Characters =
    totalCharacters > 0
      ? (totalWords / totalCharacters) * 1000
      : 0;

  const sentencesPer1000Words =
    totalWords > 0
      ? (totalSentences / totalWords) * 1000
      : 0;

  const longestWord =
    [...words].sort(
      (a, b) => b.length - a.length
    )[0] || "";

  const sentenceWordCounts =
    cleanSentences.map(
      (sentence) =>
        sentence
          .split(/\s+/)
          .filter(Boolean).length
    );

  const longestSentenceWords =
    sentenceWordCounts.length
      ? Math.max(...sentenceWordCounts)
      : 0;

  const shortestSentenceWords =
    sentenceWordCounts.length
      ? Math.min(...sentenceWordCounts)
      : 0;

  return {
    totalWords,
    totalCharacters,
    totalCharactersNoSpaces,
    totalSentences,
    totalParagraphs,
    totalLines,
    averageWordsPerSentence: round(averageWordsPerSentence),
    averageCharactersPerWord: round(averageCharactersPerWord),
    averageSentencesPerParagraph: round(averageSentencesPerParagraph),
    averageWordsPerParagraph: round(averageWordsPerParagraph),
    wordsPer1000Characters: round(wordsPer1000Characters),
    sentencesPer1000Words: round(sentencesPer1000Words),
    longestWord,
    longestSentenceWords,
    shortestSentenceWords,
  };
}

// ============================================================
// EPISODE STATISTICS
// ============================================================

function analyzeEpisodes(episodes = []) {
  return episodes.map((episode, index) => {
    const text = normalizeWhitespace(
      htmlToText(
        episode?.content || ""
      )
    );

    const statistics =
      calculateStatistics(text);

    return {
      id: episode?.id || null,
      head: episode?.head || `Episode ${index + 1}`,
      season: episode?.season ?? null,
      episode: episode?.episode ?? null,
      part: episode?.part ?? null,
      statistics,
    };
  });
}

// ============================================================
// SOURCE NORMALIZER
// ============================================================

function normalizeSources(result) {
  let sources = [];

  if (Array.isArray(result)) {
    sources = result;
  } else if (
    result &&
    Array.isArray(result.sources)
  ) {
    sources = result.sources;
  } else if (
    result &&
    Array.isArray(result.results)
  ) {
    sources = result.results;
  }

  return sources
    .filter(Boolean)
    .map((source) => {
      if (typeof source === "string") {
        return {
          title: source,
          url: "",
          description: "",
        };
      }

      return {
        title: source.title || source.name || source.heading || "Source",
        url: source.url || source.link || source.href || "",
        description: source.description || source.snippet || source.summary || "",
        source: source.source || source.domain || "",
      };
    });
}

// ============================================================
// REMOVE DUPLICATE SOURCES
// ============================================================

function uniqueSources(sources = []) {
  const seen = new Set();

  return sources.filter((source) => {
    const key =
      source.url ||
      `${source.title}|${source.description}`;

    const normalized = key
      .toLowerCase()
      .trim();

    if (!normalized) {
      return true;
    }

    if (seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);

    return true;
  });
}

// ============================================================
// API
// ============================================================

export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    res.setHeader(
      "Allow",
      ["POST"]
    );

    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST.",
    });
  }

  try {
    const body =
      req.body || {};

    const rawText =
      typeof body.text === "string"
        ? body.text
        : "";

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const author =
      typeof body.author === "string"
        ? body.author.trim()
        : "";

    const episodes =
      Array.isArray(body.episodes)
        ? body.episodes
        : [];

    const totalSeasons =
      safeNumber(
        body.totalSeasons
      );

    const totalEpisodes =
      safeNumber(
        body.totalEpisodes
      );

    const totalParts =
      safeNumber(
        body.totalParts
      );

    const episodeCount =
      safeNumber(
        body.episodeCount
      );

    // ========================================================
    // TEXT
    // ========================================================

    const cleanText =
      normalizeWhitespace(
        htmlToText(rawText)
      );

    if (!cleanText) {
      return res.status(400).json({
        success: false,
        error: "Nta text yabonetse muri iyi nkuru. Reba ko posts za Firestore zibitse inkuru muri field 'story'.",
      });
    }

    // ========================================================
    // BASIC STATISTICS
    // ========================================================

    const statistics =
      calculateStatistics(
        cleanText
      );

    // ========================================================
    // EPISODE STATISTICS
    // ========================================================

    const episodeStatistics =
      analyzeEpisodes(
        episodes
      );

    // ========================================================
    // AI ANALYSIS - WITH SAFE ERROR HANDLING
    // ========================================================

    let aiAnalysis = null;
    let aiAnalysisSuccess = false;
    let aiAnalysisError = null;

    try {
      const result = analyzeAIWriting(cleanText);
      
      // Check if result is valid
      if (result && typeof result === 'object') {
        // If success is explicitly false, treat as error
        if (result.success === false) {
          aiAnalysisError = result.error || "AI analysis returned error";
          aiAnalysis = {
            success: false,
            aiLikelihood: null,
            humanLikelihood: null,
            confidence: null,
            writingStyle: null,
            summary: "AI writing analysis nti yabashije gukorwa.",
            error: aiAnalysisError,
          };
        } else {
          // Success case
          aiAnalysis = {
            success: true,
            aiLikelihood: result.aiLikelihood !== undefined && result.aiLikelihood !== null ? result.aiLikelihood : null,
            humanLikelihood: result.humanLikelihood !== undefined && result.humanLikelihood !== null ? result.humanLikelihood : null,
            confidence: result.confidence || null,
            writingStyle: result.writingStyle || null,
            summary: result.summary || null,
            assessment: result.assessment || null,
            indicators: result.indicators || [],
            watermark: result.watermark || null,
            readability: result.readability || null,
          };
          aiAnalysisSuccess = true;
        }
      } else {
        aiAnalysisError = "AI analysis returned invalid result";
        aiAnalysis = {
          success: false,
          aiLikelihood: null,
          humanLikelihood: null,
          confidence: null,
          writingStyle: null,
          summary: "AI writing analysis nti yabashije gukorwa.",
          error: aiAnalysisError,
        };
      }
    } catch (error) {
      console.error("AI writing analysis error:", error);
      aiAnalysisError = error?.message || "AI writing analysis failed.";
      aiAnalysis = {
        success: false,
        aiLikelihood: null,
        humanLikelihood: null,
        confidence: null,
        writingStyle: null,
        summary: "AI writing analysis nti yabashije gukorwa.",
        error: aiAnalysisError,
      };
    }

    // Calculate AI likelihood percentages
    let aiLikelihood = null;
    let humanLikelihood = null;
    
    if (aiAnalysis && aiAnalysis.success === true) {
      aiLikelihood = aiAnalysis.aiLikelihood !== null && aiAnalysis.aiLikelihood !== undefined 
        ? aiAnalysis.aiLikelihood 
        : null;
      humanLikelihood = aiAnalysis.humanLikelihood !== null && aiAnalysis.humanLikelihood !== undefined
        ? aiAnalysis.humanLikelihood
        : aiLikelihood !== null ? 100 - aiLikelihood : null;
    }

    // ========================================================
    // SOURCE SEARCH
    // ========================================================

    let sources = [];
    let sourceSearchSuccess = false;
    let sourceSearchError = null;

    try {
      const result =
        await searchSources(
          cleanText
        );

      sources =
        uniqueSources(
          normalizeSources(
            result
          )
        );

      sourceSearchSuccess = true;
    } catch (error) {
      console.error("Source search error:", error);
      sourceSearchError = error?.message || "Source search failed.";
      sources = [];
    }

    // ========================================================
    // REPORT
    // ========================================================

    return res.status(200).json({
      success: true,

      story: {
        title,
        author,
        totalSeasons,
        totalEpisodes,
        totalParts,
        episodeCount,
      },

      input: {
        totalWords: statistics.totalWords,
        totalCharacters: statistics.totalCharacters,
        unlimited: true,
      },

      statistics,

      averages: {
        wordsPerSentence: statistics.averageWordsPerSentence,
        charactersPerWord: statistics.averageCharactersPerWord,
        sentencesPerParagraph: statistics.averageSentencesPerParagraph,
        wordsPerParagraph: statistics.averageWordsPerParagraph,
        wordsPer1000Characters: statistics.wordsPer1000Characters,
        sentencesPer1000Words: statistics.sentencesPer1000Words,
      },

      episodeStatistics,

      aiAnalysis: {
        success: aiAnalysisSuccess,
        aiLikelihood: aiLikelihood,
        humanLikelihood: humanLikelihood,
        confidence: aiAnalysis?.confidence || null,
        writingStyle: aiAnalysis?.writingStyle || null,
        summary: aiAnalysis?.summary || null,
        assessment: aiAnalysis?.assessment || null,
        indicators: aiAnalysis?.indicators || [],
        watermark: aiAnalysis?.watermark || null,
        readability: aiAnalysis?.readability || null,
        error: aiAnalysisError,
      },

      aiAnalysisStatus: {
        success: aiAnalysisSuccess,
        error: aiAnalysisError,
      },

      sources,

      sourceCount: sources.length,

      sourceSearch: {
        success: sourceSearchSuccess,
        count: sources.length,
        error: sourceSearchError,
      },

      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "POST /api/analyze-post ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error?.message || "Analysis failed.",
    });
  }
}
