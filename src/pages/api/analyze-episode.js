// pages/api/analyze-episode.js

import { analyzeText } from "../../lib/textAnalysis";
import { analyzeAIWriting } from "../../lib/aiAnlysis";
// ============================================================
// HELPERS
// ============================================================

function round(value, decimals = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
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
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return String(value);

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
// CALCULATE STATISTICS
// ============================================================

function calculateStatistics(text = "") {
  const clean = normalizeWhitespace(htmlToText(text));

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
    };
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  const totalCharacters = clean.length;
  const totalCharactersNoSpaces = clean.replace(/\s/g, "").length;

  const sentences = clean.match(/[^.!?…]+(?:[.!?…]+|$)/g) || [];
  const cleanSentences = sentences.map((s) => s.trim()).filter(Boolean);
  const totalSentences = cleanSentences.length;

  const paragraphs = clean.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const totalParagraphs = paragraphs.length;
  const totalLines = clean.split("\n").filter((line) => line.trim()).length;

  const averageWordsPerSentence = totalSentences > 0 ? totalWords / totalSentences : 0;
  const averageCharactersPerWord = totalWords > 0 ? totalCharactersNoSpaces / totalWords : 0;
  const averageSentencesPerParagraph = totalParagraphs > 0 ? totalSentences / totalParagraphs : 0;
  const averageWordsPerParagraph = totalParagraphs > 0 ? totalWords / totalParagraphs : 0;
  const wordsPer1000Characters = totalCharacters > 0 ? (totalWords / totalCharacters) * 1000 : 0;
  const sentencesPer1000Words = totalWords > 0 ? (totalSentences / totalWords) * 1000 : 0;

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
  };
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
    const body = req.body || {};
    const episode = body.episode || {};
    const storyTitle = body.storyTitle || "";
    const storyAuthor = body.storyAuthor || "";
    const totalEpisodes = body.totalEpisodes || 0;

    const rawText = typeof episode.content === "string" ? episode.content : "";
    const cleanText = normalizeWhitespace(htmlToText(rawText));

    if (!cleanText) {
      return res.status(400).json({
        success: false,
        error: "Nta text yabonetse muri iyi episode.",
      });
    }

    const statistics = calculateStatistics(cleanText);
    
    // AI Analysis with safe error handling
    let aiAnalysis = null;
    let aiAnalysisSuccess = false;
    let aiAnalysisError = null;

    try {
      const episodeIndex = typeof episode.episode === 'number' ? episode.episode : 0;
      
      const result = analyzeAIWriting(cleanText, {
        isEpisode: true,
        episodeIndex: episodeIndex,
        totalEpisodes: totalEpisodes,
      });
      
      if (result && typeof result === 'object') {
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
          aiAnalysis = {
            success: true,
            aiLikelihood: result.aiLikelihood !== undefined && result.aiLikelihood !== null ? result.aiLikelihood : null,
            humanLikelihood: result.humanLikelihood !== undefined && result.humanLikelihood !== null ? result.humanLikelihood : null,
            confidence: result.confidence || null,
            writingStyle: result.writingStyle || null,
            summary: result.summary || null,
            assessment: result.assessment || null,
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

    return res.status(200).json({
      success: true,
      analysis: {
        id: episode.id || null,
        head: episode.head || "Untitled",
        season: episode.season ?? null,
        episode: episode.episode ?? null,
        part: episode.part ?? null,
        content: cleanText,
        statistics,
        storyTitle,
        storyAuthor,
        aiAnalysis: {
          success: aiAnalysisSuccess,
          aiLikelihood: aiLikelihood,
          humanLikelihood: humanLikelihood,
          confidence: aiAnalysis?.confidence || null,
          writingStyle: aiAnalysis?.writingStyle || null,
          summary: aiAnalysis?.summary || null,
          assessment: aiAnalysis?.assessment || null,
          error: aiAnalysisError,
        },
      },
    });
  } catch (error) {
    console.error("Episode analysis error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Episode analysis failed.",
    });
  }
}
