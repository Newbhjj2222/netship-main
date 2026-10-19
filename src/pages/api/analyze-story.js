import { analyzeText } from "../../lib/textAnalysis";
import { analyzeAIWriting } from "../../lib/aiAnlysis";
import { searchSources } from "../../lib/sourceSearch";

// ============================================================
// HTML -> PLAIN TEXT
// ============================================================

function htmlToText(html = "") {
  if (!html || typeof html !== "string") {
    return "";
  }

  return html
    // BR -> newline
    .replace(/<br\s*\/?>/gi, "\n")

    // Paragraph/block endings -> newline
    .replace(
      /<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote)>/gi,
      "\n"
    )

    // Remove scripts/styles completely
    .replace(
      /<(script|style)[^>]*>[\s\S]*?<\/\1>/gi,
      ""
    )

    // Remove remaining HTML tags
    .replace(/<[^>]+>/g, "")

    // Decode common HTML entities
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")

    // Normalize whitespace
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


// ============================================================
// API HANDLER
// ============================================================

export default async function handler(req, res) {
  // ==========================================================
  // ONLY POST
  // ==========================================================

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);

    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST.",
    });
  }

  try {
    // ========================================================
    // REQUEST BODY
    // ========================================================

    const body = req.body || {};

    /*
     * API ishobora kwakira:
     *
     * text
     *
     * cyangwa:
     *
     * story
     *
     * Ibi bituma idakomeza kuvuga ngo
     * "No text provided" kandi frontend yohereje story.
     */

    let rawText = "";

    if (
      typeof body.text === "string" &&
      body.text.trim()
    ) {
      rawText = body.text;
    } else if (
      typeof body.story === "string" &&
      body.story.trim()
    ) {
      rawText = body.story;
    }

    // ========================================================
    // STORY INFORMATION
    // ========================================================

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const author =
      typeof body.author === "string"
        ? body.author.trim()
        : "";

    const totalSeasons =
      Number.isFinite(Number(body.totalSeasons))
        ? Number(body.totalSeasons)
        : 0;

    const totalEpisodes =
      Number.isFinite(Number(body.totalEpisodes))
        ? Number(body.totalEpisodes)
        : 0;

    const totalParts =
      Number.isFinite(Number(body.totalParts))
        ? Number(body.totalParts)
        : 0;

    const episodeCount =
      Number.isFinite(Number(body.episodeCount))
        ? Number(body.episodeCount)
        : 0;


    // ========================================================
    // CHECK IF TEXT EXISTS
    // ========================================================

    if (!rawText) {
      return res.status(400).json({
        success: false,
        error:
          "No story text was provided. Send either 'text' or 'story'.",
      });
    }


    // ========================================================
    // CONVERT HTML TO PLAIN TEXT
    // ========================================================

    const cleanText = htmlToText(rawText);


    // ========================================================
    // EMPTY TEXT CHECK
    // ========================================================

    if (!cleanText) {
      return res.status(400).json({
        success: false,
        error:
          "The story does not contain readable text.",
      });
    }


    // ========================================================
    // BASIC INFORMATION
    // ========================================================

    const receivedCharacters =
      cleanText.length;

    const receivedWords =
      cleanText
        .split(/\s+/)
        .filter(Boolean)
        .length;


    // ========================================================
    // STEP 1
    // TEXT STATISTICS
    // ========================================================

    let statistics = {};

    try {
      statistics = analyzeText(cleanText) || {};
    } catch (statisticsError) {
      console.error(
        "Text statistics error:",
        statisticsError
      );

      // ------------------------------------------------------
      // FALLBACK STATISTICS
      // ------------------------------------------------------

      const words =
        cleanText
          .split(/\s+/)
          .filter(Boolean);

      const totalWords =
        words.length;

      const totalCharacters =
        cleanText.length;

      const totalCharactersNoSpaces =
        cleanText.replace(/\s/g, "").length;

      const sentences =
        cleanText.match(
          /[^.!?…]+(?:[.!?…]+|$)/g
        ) || [];

      const totalSentences =
        sentences
          .map((sentence) =>
            sentence.trim()
          )
          .filter(Boolean)
          .length;

      const averageWordsPerSentence =
        totalSentences > 0
          ? totalWords / totalSentences
          : 0;

      const averageCharactersPerWord =
        totalWords > 0
          ? totalCharactersNoSpaces /
            totalWords
          : 0;

      statistics = {
        totalWords,

        totalCharacters,

        totalCharactersNoSpaces,

        totalSentences,

        averageWordsPerSentence:
          Number(
            averageWordsPerSentence.toFixed(2)
          ),

        averageCharactersPerWord:
          Number(
            averageCharactersPerWord.toFixed(2)
          ),
      };
    }


    // ========================================================
    // STEP 2
    // AI WRITING ANALYSIS
    // ========================================================

    let aiAnalysis = null;

    try {
      aiAnalysis =
        await Promise.resolve(
          analyzeAIWriting(cleanText)
        );
    } catch (aiError) {
      console.error(
        "AI writing analysis error:",
        aiError
      );

      aiAnalysis = {
        success: false,

        error:
          "AI writing analysis could not be completed.",

        aiLikelihood: null,

        humanLikelihood: null,

        writingStyle: null,

        confidence: null,

        summary:
          "AI analysis was unavailable for this story.",
      };
    }


    // ========================================================
    // STEP 3
    // SOURCE SEARCH
    // ========================================================

    let sources = [];

    let sourceSearchSuccess = true;

    let sourceSearchError = null;

    try {
      const sourceResult =
        await searchSources(cleanText);

      if (Array.isArray(sourceResult)) {
        sources = sourceResult;
      } else if (
        sourceResult &&
        Array.isArray(sourceResult.results)
      ) {
        sources = sourceResult.results;
      } else if (
        sourceResult &&
        Array.isArray(sourceResult.sources)
      ) {
        sources = sourceResult.sources;
      } else {
        sources = [];
      }
    } catch (searchError) {
      console.error(
        "Source search error:",
        searchError
      );

      sourceSearchSuccess = false;

      sourceSearchError =
        searchError?.message ||
        "Source search failed.";

      sources = [];
    }


    // ========================================================
    // SOURCE COUNT
    // ========================================================

    const sourceCount =
      Array.isArray(sources)
        ? sources.length
        : 0;


    // ========================================================
    // FINAL REPORT
    // ========================================================

    return res.status(200).json({
      success: true,

      // ------------------------------------------------------
      // STORY
      // ------------------------------------------------------

      story: {
        title,

        author,

        totalSeasons,

        totalEpisodes,

        totalParts,

        episodeCount,
      },

      // ------------------------------------------------------
      // INPUT
      // ------------------------------------------------------

      input: {
        totalCharacters:
          receivedCharacters,

        totalWords:
          receivedWords,

        unlimited: true,

        source:
          typeof body.text === "string" &&
          body.text.trim()
            ? "text"
            : "story",
      },

      // ------------------------------------------------------
      // STATISTICS
      // ------------------------------------------------------

      statistics,

      // ------------------------------------------------------
      // AI ANALYSIS
      // ------------------------------------------------------

      aiAnalysis,

      // ------------------------------------------------------
      // SOURCES
      // ------------------------------------------------------

      sources,

      sourceCount,

      sourceSearch: {
        success:
          sourceSearchSuccess,

        count:
          sourceCount,

        error:
          sourceSearchError,
      },

      // ------------------------------------------------------
      // TIMESTAMP
      // ------------------------------------------------------

      generatedAt:
        new Date().toISOString(),
    });

  } catch (error) {
    console.error(
      "POST /api/analyze-post error:",
      error
    );

    return res.status(500).json({
      success: false,

      error:
        error?.message ||
        "Analysis failed. Please try again.",
    });
  }
}
