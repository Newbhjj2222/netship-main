// src/pages/api/ana.js

import {
  countWords,
  countCharacters,
  countSentences,
  countParagraphs,
  calculateReadingTime,
  calculateAverageWordsPerSentence,
  calculateUniqueWords,
  calculateVocabularyDiversity,
} from "../../lib/analysis";

import { analyzeAIWriting } from "../../lib/aiAna";

import { searchSources } from "../../lib/sourceSearch";

import {
  calculateSimilarity,
  findMatchingPassages,
} from "../../lib/similarity";

/*
|--------------------------------------------------------------------------
| CONFIGURATION
|--------------------------------------------------------------------------
*/

const MAX_TEXT_LENGTH = 100000;
const MIN_TEXT_LENGTH = 20;

const MAX_SOURCES = 15;
const MAX_MATCHES_PER_SOURCE = 10;

/*
|--------------------------------------------------------------------------
| MAIN API HANDLER
|--------------------------------------------------------------------------
*/

export default async function handler(req, res) {
  /*
  |--------------------------------------------------------------------------
  | METHOD CHECK
  |--------------------------------------------------------------------------
  */

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);

    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST.",
    });
  }

  try {
    /*
    |--------------------------------------------------------------------------
    | GET TEXT
    |--------------------------------------------------------------------------
    */

    const rawText = req.body?.text;

    if (
      typeof rawText !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "Post text is required.",
      });
    }

    const text = cleanText(rawText);

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!text) {
      return res.status(400).json({
        success: false,
        error: "Shyiramo post mbere yo gukora analysis.",
      });
    }

    if (
      text.length < MIN_TEXT_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        error:
          `Post ni ngufi cyane. ` +
          `Shyiramo nibura characters ${MIN_TEXT_LENGTH}.`,
      });
    }

    if (
      text.length > MAX_TEXT_LENGTH
    ) {
      return res.status(413).json({
        success: false,
        error:
          `Post ni ndende cyane. ` +
          `Maximum ni characters ${MAX_TEXT_LENGTH}.`,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | TEXT STATISTICS
    |--------------------------------------------------------------------------
    */

    const statistics = buildStatistics(text);

    /*
    |--------------------------------------------------------------------------
    | AI ANALYSIS
    |--------------------------------------------------------------------------
    */

    let aiAnalysis;

    try {
      aiAnalysis =
        analyzeAIWriting(text);
    } catch (error) {
      console.error(
        "AI ANALYSIS ERROR:",
        error
      );

      aiAnalysis = {
        score: 0,
        assessment:
          "Unable to determine",
        confidence: "Low",
        indicators: [],
        error:
          "AI analysis could not be completed.",
      };
    }

    aiAnalysis =
      normalizeAIAnalysis(
        aiAnalysis,
        statistics.words
      );

    /*
    |--------------------------------------------------------------------------
    | SOURCE SEARCH
    |--------------------------------------------------------------------------
    */

    let sources = [];

    let sourceSearchStatus =
      "completed";

    let sourceSearchMessage = null;

    try {
      const searchResult =
        await searchSources(text);

      /*
       * Support either:
       *
       * searchSources() => []
       *
       * OR
       *
       * searchSources() => {
       *   sources: []
       * }
       */

      if (
        Array.isArray(searchResult)
      ) {
        sources = searchResult;
      } else if (
        Array.isArray(
          searchResult?.sources
        )
      ) {
        sources =
          searchResult.sources;
      }
    } catch (error) {
      console.error(
        "SOURCE SEARCH ERROR:",
        error
      );

      sourceSearchStatus =
        "failed";

      sourceSearchMessage =
        "Source search failed, but text analysis was completed.";
    }

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE AND ANALYZE SOURCES
    |--------------------------------------------------------------------------
    */

    const processedSources =
      [];

    for (
      const rawSource of sources
    ) {
      if (!rawSource) {
        continue;
      }

      const url =
        typeof rawSource.url ===
        "string"
          ? rawSource.url.trim()
          : "";

      /*
       * Never return an invalid source.
       */

      if (
        !isValidHttpUrl(url)
      ) {
        continue;
      }

      const title =
        typeof rawSource.title ===
        "string" &&
        rawSource.title.trim()
          ? rawSource.title.trim()
          : "Unknown Source";

      const snippet =
        typeof rawSource.snippet ===
        "string"
          ? rawSource.snippet.trim()
          : "";

      const domain =
        typeof rawSource.domain ===
        "string" &&
        rawSource.domain.trim()
          ? rawSource.domain.trim()
          : getDomain(url);

      /*
      |--------------------------------------------------------------------------
      | CALCULATE SIMILARITY
      |--------------------------------------------------------------------------
      *
      * Prefer actual source text if sourceSearch.js provides it.
      *
      * Otherwise use snippet.
      */

      const sourceText =
        getSourceText(
          rawSource
        );

      let similarity = 0;

      let matchedPassages =
        [];

      if (sourceText) {
        /*
         * Calculate overall similarity
         * between submitted post and source.
         */

        similarity =
          safeSimilarity(
            text,
            sourceText
          );

        /*
         * Find actual matching passages.
         */

        try {
          matchedPassages =
            findMatchingPassages(
              text,
              sourceText
            );
        } catch (error) {
          console.error(
            "MATCHING PASSAGES ERROR:",
            error
          );

          matchedPassages = [];
        }
      } else if (
        typeof rawSource.similarity ===
        "number"
      ) {
        /*
         * Fallback if sourceSearch.js
         * already calculated similarity.
         */

        similarity =
          normalizePercentage(
            rawSource.similarity
          );
      }

      /*
       * If the source-search module already
       * supplied matching passages, preserve them.
       */

      if (
        Array.isArray(
          rawSource.matchedPassages
        ) &&
        rawSource.matchedPassages.length
      ) {
        matchedPassages =
          normalizeMatches(
            rawSource.matchedPassages
          );
      }

      if (
        Array.isArray(
          rawSource.matches
        ) &&
        rawSource.matches.length
      ) {
        matchedPassages =
          normalizeMatches(
            rawSource.matches
          );
      }

      /*
      |--------------------------------------------------------------------------
      | LIMIT MATCHES
      |--------------------------------------------------------------------------
      */

      matchedPassages =
        matchedPassages
          .filter(Boolean)
          .sort(
            (a, b) =>
              Number(
                b.similarity || 0
              ) -
              Number(
                a.similarity || 0
              )
          )
          .slice(
            0,
            MAX_MATCHES_PER_SOURCE
          );

      /*
      |--------------------------------------------------------------------------
      | USE BEST MATCH AS FALLBACK
      |--------------------------------------------------------------------------
      */

      if (
        similarity === 0 &&
        matchedPassages.length
      ) {
        similarity =
          Math.max(
            ...matchedPassages.map(
              (match) =>
                normalizePercentage(
                  match.similarity
                )
            )
          );
      }

      /*
      |--------------------------------------------------------------------------
      | SOURCE RESULT
      |--------------------------------------------------------------------------
      */

      processedSources.push({
        title,

        url,

        domain,

        snippet,

        similarity:
          Number(
            similarity.toFixed(1)
          ),

        matchedPassages,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | REMOVE DUPLICATE SOURCES
    |--------------------------------------------------------------------------
    */

    sources =
      removeDuplicateSources(
        processedSources
      );

    /*
    |--------------------------------------------------------------------------
    | SORT SOURCES
    |--------------------------------------------------------------------------
    */

    sources.sort(
      (a, b) =>
        b.similarity -
        a.similarity
    );

    /*
    |--------------------------------------------------------------------------
    | LIMIT SOURCES
    |--------------------------------------------------------------------------
    */

    sources =
      sources.slice(
        0,
        MAX_SOURCES
      );

    /*
    |--------------------------------------------------------------------------
    | SOURCE STATISTICS
    |--------------------------------------------------------------------------
    */

    const sourceStatistics =
      calculateSourceStatistics(
        sources
      );

    /*
    |--------------------------------------------------------------------------
    | FINAL REPORT
    |--------------------------------------------------------------------------
    */

    const report = {
      success: true,

      statistics,

      aiAnalysis,

      sourceAnalysis: {
        status:
          sourceSearchStatus,

        message:
          sourceSearchMessage,

        sourceCount:
          sources.length,

        highestSimilarity:
          sourceStatistics.highestSimilarity,

        averageSimilarity:
          sourceStatistics.averageSimilarity,

        totalMatchedPassages:
          sourceStatistics.totalMatchedPassages,

        assessment:
          getSourceAssessment(
            sourceStatistics.highestSimilarity
          ),
      },

      sources,

      summary: {
        words:
          statistics.words,

        characters:
          statistics.characters,

        sentences:
          statistics.sentences,

        paragraphs:
          statistics.paragraphs,

        readingTime:
          statistics.readingTime,

        aiLikelihood:
          aiAnalysis.score,

        aiAssessment:
          aiAnalysis.assessment,

        aiConfidence:
          aiAnalysis.confidence,

        possibleSources:
          sources.length,

        highestSourceSimilarity:
          sourceStatistics.highestSimilarity,
      },

      disclaimer: {
        ai:
          "AI-writing detection is probabilistic and can produce false positives and false negatives. The score is not definitive proof that AI was used.",

        source:
          "Source similarity indicates possible textual overlap and does not by itself prove plagiarism.",
      },

      generatedAt:
        new Date().toISOString(),
    };

    /*
    |--------------------------------------------------------------------------
    | RESPONSE HEADERS
    |--------------------------------------------------------------------------
    */

    res.setHeader(
      "Cache-Control",
      "no-store, max-age=0"
    );

    res.setHeader(
      "Content-Type",
      "application/json"
    );

    /*
    |--------------------------------------------------------------------------
    | RETURN
    |--------------------------------------------------------------------------
    */

    return res.status(200).json(
      report
    );
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | GLOBAL ERROR HANDLER
    |--------------------------------------------------------------------------
    */

    console.error(
      "POST ANALYZER API ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      error:
        error?.message ||
        "Failed to analyze post.",

      generatedAt:
        new Date().toISOString(),
    });
  }
}

/*
|--------------------------------------------------------------------------
| TEXT CLEANING
|--------------------------------------------------------------------------
*/

function cleanText(value) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

/*
|--------------------------------------------------------------------------
| TEXT STATISTICS
|--------------------------------------------------------------------------
*/

function buildStatistics(text) {
  let words = 0;
  let characters = text.length;
  let charactersNoSpaces = 0;
  let sentences = 0;
  let paragraphs = 0;
  let readingTime = 0;
  let averageWordsPerSentence = 0;
  let uniqueWords = 0;
  let vocabularyDiversity = 0;

  try {
    words =
      Number(
        countWords(text)
      ) || 0;
  } catch {
    words =
      fallbackWordCount(text);
  }

  try {
    characters =
      Number(
        countCharacters(text)
      ) || text.length;
  } catch {
    characters =
      text.length;
  }

  charactersNoSpaces =
    text.replace(
      /\s/g,
      ""
    ).length;

  try {
    sentences =
      Number(
        countSentences(text)
      ) || 0;
  } catch {
    sentences =
      fallbackSentenceCount(text);
  }

  try {
    paragraphs =
      Number(
        countParagraphs(text)
      ) || 0;
  } catch {
    paragraphs =
      text
        .split(/\n\s*\n/)
        .filter(Boolean)
        .length;
  }

  try {
    readingTime =
      Number(
        calculateReadingTime(text)
      ) || 0;
  } catch {
    readingTime =
      Math.max(
        1,
        Math.ceil(
          words / 225
        )
      );
  }

  try {
    averageWordsPerSentence =
      Number(
        calculateAverageWordsPerSentence(
          text
        )
      ) || 0;
  } catch {
    averageWordsPerSentence =
      sentences > 0
        ? words / sentences
        : 0;
  }

  try {
    uniqueWords =
      Number(
        calculateUniqueWords(
          text
        )
      ) || 0;
  } catch {
    uniqueWords =
      new Set(
        text
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
      ).size;
  }

  try {
    vocabularyDiversity =
      Number(
        calculateVocabularyDiversity(
          text
        )
      ) || 0;
  } catch {
    vocabularyDiversity =
      words > 0
        ? uniqueWords / words
        : 0;
  }

  return {
    words,

    characters,

    charactersNoSpaces,

    sentences,

    paragraphs,

    readingTime,

    averageWordsPerSentence:
      Number(
        averageWordsPerSentence.toFixed(
          2
        )
      ),

    uniqueWords,

    vocabularyDiversity:
      Number(
        vocabularyDiversity.toFixed(
          3
        )
      ),
  };
}

/*
|--------------------------------------------------------------------------
| AI ANALYSIS NORMALIZATION
|--------------------------------------------------------------------------
*/

function normalizeAIAnalysis(
  analysis,
  wordCount
) {
  const score =
    normalizePercentage(
      analysis?.score
    );

  let confidence =
    analysis?.confidence;

  if (
    confidence !== "Low" &&
    confidence !== "Medium" &&
    confidence !== "High"
  ) {
    if (wordCount < 100) {
      confidence = "Low";
    } else if (
      wordCount < 500
    ) {
      confidence = "Medium";
    } else {
      confidence = "High";
    }
  }

  const indicators =
    Array.isArray(
      analysis?.indicators
    )
      ? analysis.indicators
          .filter(
            (item) =>
              typeof item ===
              "string"
          )
          .slice(0, 20)
      : [];

  return {
    score,

    assessment:
      analysis?.assessment ||
      getAIAssessment(score),

    confidence,

    indicators,

    disclaimer:
      "This AI score is an estimate based on writing characteristics. It is not definitive proof of AI usage.",
  };
}

/*
|--------------------------------------------------------------------------
| AI ASSESSMENT
|--------------------------------------------------------------------------
*/

function getAIAssessment(
  score
) {
  const value =
    normalizePercentage(
      score
    );

  if (value >= 75) {
    return "High AI-like writing signals";
  }

  if (value >= 55) {
    return "Moderate AI-like writing signals";
  }

  if (value >= 30) {
    return "Some AI-like writing signals";
  }

  return "Low AI-like writing signals";
}

/*
|--------------------------------------------------------------------------
| SOURCE ASSESSMENT
|--------------------------------------------------------------------------
*/

function getSourceAssessment(
  similarity
) {
  const score =
    normalizePercentage(
      similarity
    );

  if (score >= 80) {
    return "Very strong textual overlap detected.";
  }

  if (score >= 60) {
    return "Strong textual overlap detected.";
  }

  if (score >= 40) {
    return "Moderate textual overlap detected.";
  }

  if (score >= 20) {
    return "Some textual overlap detected.";
  }

  return "No strong textual overlap detected.";
}

/*
|--------------------------------------------------------------------------
| SOURCE STATISTICS
|--------------------------------------------------------------------------
*/

function calculateSourceStatistics(
  sources
) {
  if (
    !Array.isArray(sources) ||
    sources.length === 0
  ) {
    return {
      highestSimilarity: 0,

      averageSimilarity: 0,

      totalMatchedPassages: 0,
    };
  }

  const similarities =
    sources.map(
      (source) =>
        normalizePercentage(
          source.similarity
        )
    );

  const highestSimilarity =
    Math.max(
      ...similarities
    );

  const averageSimilarity =
    similarities.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / similarities.length;

  const totalMatchedPassages =
    sources.reduce(
      (total, source) =>
        total +
        (
          Array.isArray(
            source.matchedPassages
          )
            ? source
                .matchedPassages
                .length
            : 0
        ),
      0
    );

  return {
    highestSimilarity:
      Number(
        highestSimilarity.toFixed(
          1
        )
      ),

    averageSimilarity:
      Number(
        averageSimilarity.toFixed(
          1
        )
      ),

    totalMatchedPassages,
  };
}

/*
|--------------------------------------------------------------------------
| SOURCE TEXT EXTRACTION
|--------------------------------------------------------------------------
*/

function getSourceText(
  source
) {
  if (!source) {
    return "";
  }

  /*
   * Prefer complete fetched page text.
   */

  const possibleFields = [
    source.text,
    source.content,
    source.pageText,
    source.body,
    source.sourceText,
  ];

  for (
    const value of possibleFields
  ) {
    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  /*
   * Fallback to snippet.
   */

  if (
    typeof source.snippet ===
      "string" &&
    source.snippet.trim()
  ) {
    return source.snippet.trim();
  }

  return "";
}

/*
|--------------------------------------------------------------------------
| MATCH NORMALIZATION
|--------------------------------------------------------------------------
*/

function normalizeMatches(
  matches
) {
  if (
    !Array.isArray(matches)
  ) {
    return [];
  }

  return matches
    .map((match) => {
      if (
        !match ||
        typeof match !==
          "object"
      ) {
        return null;
      }

      return {
        original:
          typeof match.original ===
          "string"
            ? match.original
            : typeof match.text ===
              "string"
            ? match.text
            : "",

        source:
          typeof match.source ===
          "string"
            ? match.source
            : typeof match.sourceText ===
              "string"
            ? match.sourceText
            : "",

        similarity:
          Number(
            normalizePercentage(
              match.similarity
            ).toFixed(1)
          ),
      };
    })
    .filter(
      (match) =>
        match &&
        match.original
    );
}

/*
|--------------------------------------------------------------------------
| SIMILARITY WRAPPER
|--------------------------------------------------------------------------
*/

function safeSimilarity(
  originalText,
  sourceText
) {
  try {
    const value =
      calculateSimilarity(
        originalText,
        sourceText
      );

    return normalizePercentage(
      value
    );
  } catch (error) {
    console.error(
      "SIMILARITY ERROR:",
      error
    );

    return 0;
  }
}

/*
|--------------------------------------------------------------------------
| PERCENTAGE NORMALIZATION
|--------------------------------------------------------------------------
*/

function normalizePercentage(
  value
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Number(
        number.toFixed(2)
      )
    )
  );
}

/*
|--------------------------------------------------------------------------
| URL VALIDATION
|--------------------------------------------------------------------------
*/

function isValidHttpUrl(
  url
) {
  if (
    typeof url !==
      "string" ||
    !url.trim()
  ) {
    return false;
  }

  try {
    const parsed =
      new URL(url);

    return (
      parsed.protocol ===
        "http:" ||
      parsed.protocol ===
        "https:"
    );
  } catch {
    return false;
  }
}

/*
|--------------------------------------------------------------------------
| DOMAIN
|--------------------------------------------------------------------------
*/

function getDomain(url) {
  try {
    return new URL(url)
      .hostname
      .replace(
        /^www\./,
        ""
      );
  } catch {
    return "";
  }
}

/*
|--------------------------------------------------------------------------
| DUPLICATE SOURCES
|--------------------------------------------------------------------------
*/

function removeDuplicateSources(
  sources
) {
  const unique = [];
  const seen = new Set();

  for (
    const source of sources
  ) {
    if (!source?.url) {
      continue;
    }

    let key = source.url;

    try {
      const parsed =
        new URL(
          source.url
        );

      parsed.hash = "";

      key =
        parsed
          .toString()
          .replace(
            /\/$/,
            ""
          );
    } catch {
      key =
        source.url
          .trim()
          .toLowerCase();
    }

    if (
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    unique.push(
      source
    );
  }

  return unique;
}

/*
|--------------------------------------------------------------------------
| FALLBACK TEXT FUNCTIONS
|--------------------------------------------------------------------------
*/

function fallbackWordCount(
  text
) {
  if (
    !text ||
    typeof text !==
      "string"
  ) {
    return 0;
  }

  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function fallbackSentenceCount(
  text
) {
  if (
    !text ||
    typeof text !==
      "string"
  ) {
    return 0;
  }

  return text
    .split(
      /(?<=[.!?…])\s+/
    )
    .map(
      (item) =>
        item.trim()
    )
    .filter(Boolean)
    .length;
}
