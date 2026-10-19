// lib/sourceSearch.js

import {
  calculateSimilarity,
  findMatchingPassages,
} from "./similarity";

/*
 * PUT YOUR SERPAPI KEY HERE.
 *
 * IMPORTANT:
 * This file must ONLY be imported server-side.
 */
const SERPAPI_KEY =
  "8beb5aba8b6e2857d802f89f0f4458df24e50c709756ba86e7fe02ce6a180902";

/*
 * Common Kinyarwanda words.
 * These words are less useful when selecting
 * unique sentences for source searching.
 */
const COMMON_WORDS = new Set([
  "ari",
  "aba",
  "abo",
  "abantu",
  "uyu",
  "uwo",
  "ubwo",
  "uko",
  "kandi",
  "ariko",
  "cyangwa",
  "nuko",
  "maze",
  "muri",
  "kuva",
  "kuba",
  "kuri",
  "hamwe",
  "hano",
  "hari",
  "buri",
  "cyane",
  "nubwo",
  "kuko",
  "kubera",
  "ntabwo",
  "nta",
  "we",
  "bo",
  "twe",
  "njye",
  "wowe",
  "ibyo",
  "iki",
  "ni",
  "mu",
  "ku",
  "no",
  "na",
  "yari",
  "bari",
  "gusa",
  "none",
  "nyuma",
  "hanyuma",
  "igihe",
  "aho",
  "umwe",
  "undi",
  "bose",
  "byose",
]);

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(
      /[^\p{L}\p{N}\s'-]/gu,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function extractSentences(text) {
  return (
    text.match(
      /[^.!?…]+[.!?…]+/g
    ) || []
  )
    .map((sentence) =>
      sentence
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}

/*
 * Select the most unique sentences.
 */
export function extractSearchPhrases(
  text,
  maxPhrases = 6
) {
  if (
    !text ||
    typeof text !== "string"
  ) {
    return [];
  }

  const sentences =
    extractSentences(text);

  if (!sentences.length) {
    return [];
  }

  const allWords =
    normalizeText(text)
      .split(/\s+/)
      .filter(Boolean);

  const frequency = {};

  for (const word of allWords) {
    frequency[word] =
      (frequency[word] || 0) + 1;
  }

  const scored =
    sentences.map(
      (sentence) => {
        const words =
          normalizeText(sentence)
            .split(/\s+/)
            .filter(Boolean);

        if (words.length < 5) {
          return {
            sentence,
            score: -100,
          };
        }

        let uniqueness = 0;

        for (const word of words) {
          if (COMMON_WORDS.has(word)) {
            continue;
          }

          uniqueness +=
            1 / (frequency[word] || 1);
        }

        const averageUniqueness =
          uniqueness /
          words.length;

        let lengthBonus = 0;

        if (
          words.length >= 8 &&
          words.length <= 25
        ) {
          lengthBonus = 1;
        }

        if (words.length > 35) {
          lengthBonus = -1;
        }

        return {
          sentence,
          score:
            averageUniqueness +
            lengthBonus,
        };
      }
    );

  const selected = [];
  const seen = new Set();

  for (
    const item of scored.sort(
      (a, b) =>
        b.score - a.score
    )
  ) {
    const phrase =
      item.sentence.trim();

    const key =
      normalizeText(phrase);

    if (
      key.length < 20 ||
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);
    selected.push(phrase);

    if (
      selected.length >=
      maxPhrases
    ) {
      break;
    }
  }

  return selected;
}

/*
 * Search SerpApi Google Search API.
 *
 * Documentation:
 * https://serpapi.com/search-api
 */
async function searchSerpApi(
  query,
  options = {}
) {
  if (
    !SERPAPI_KEY ||
    SERPAPI_KEY ===
      "YOUR_SERPAPI_KEY"
  ) {
    throw new Error(
      "Shyiramo SerpApi API key muri lib/sourceSearch.js"
    );
  }

  const {
    start = 0,
    num = 10,
  } = options;

  const params =
    new URLSearchParams();

  params.set(
    "engine",
    "google"
  );

  params.set(
    "q",
    query
  );

  params.set(
    "api_key",
    SERPAPI_KEY
  );

  /*
   * Rwanda search localization.
   */
  params.set(
    "gl",
    "rw"
  );

  /*
   * Google interface language.
   * Kinyarwanda is not guaranteed as a
   * Google search language, so English is
   * safer for broad indexing.
   */
  params.set(
    "hl",
    "en"
  );

  params.set(
    "safe",
    "active"
  );

  params.set(
    "num",
    String(
      Math.min(
        Math.max(num, 1),
        10
      )
    )
  );

  params.set(
    "start",
    String(start)
  );

  /*
   * Let SerpApi use its cache when available.
   * Cached searches are free according to
   * SerpApi documentation.
   */
  params.set(
    "no_cache",
    "false"
  );

  const url =
    `https://serpapi.com/search?${params.toString()}`;

  const response =
    await fetch(url);

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      "SerpApi HTTP error:",
      response.status,
      errorText
    );

    return [];
  }

  const data =
    await response.json();

  /*
   * SerpApi can return an explicit
   * error property.
   */
  if (data.error) {
    console.error(
      "SerpApi returned error:",
      data.error
    );

    return [];
  }

  if (
    !Array.isArray(
      data.organic_results
    )
  ) {
    return [];
  }

  return data.organic_results.map(
    (item) => ({
      title:
        item.title ||
        "Unknown Source",

      url:
        item.link ||
        "",

      snippet:
        item.snippet ||
        "",

      position:
        item.position ??
        null,

      source:
        "google",
    })
  );
}

/*
 * General Google search.
 */
async function searchGoogle(
  phrase
) {
  return searchSerpApi(
    `"${phrase}"`,
    {
      start: 0,
      num: 10,
    }
  );
}

/*
 * Search Facebook public/indexed
 * pages through Google.
 *
 * This does NOT mean Facebook gives us
 * its private database. It searches pages
 * Google can return for site:facebook.com.
 */
async function searchFacebook(
  phrase
) {
  return searchSerpApi(
    `site:facebook.com "${phrase}"`,
    {
      start: 0,
      num: 10,
    }
  );
}

/*
 * Search several source categories.
 */
async function searchEverywhere(
  phrase
) {
  const [
    googleResults,
    facebookResults,
  ] = await Promise.all([
    searchGoogle(phrase),
    searchFacebook(phrase),
  ]);

  return [
    ...googleResults,

    ...facebookResults.map(
      (item) => ({
        ...item,
        source:
          "facebook",
      })
    ),
  ];
}

/*
 * Normalize URL to remove tracking
 * parameters and duplicate URLs.
 */
function normalizeUrl(url) {
  try {
    const parsed =
      new URL(url);

    parsed.hash = "";

    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
    ];

    for (
      const parameter of
        trackingParams
    ) {
      parsed.searchParams.delete(
        parameter
      );
    }

    return parsed
      .toString()
      .replace(/\/$/, "");
  } catch {
    return url;
  }
}

/*
 * Deduplicate search results.
 */
function deduplicateResults(
  results
) {
  const map = new Map();

  for (
    const result of results
  ) {
    if (!result.url) {
      continue;
    }

    const url =
      normalizeUrl(
        result.url
      );

    if (!map.has(url)) {
      map.set(
        url,
        result
      );
    }
  }

  return Array.from(
    map.values()
  );
}

/*
 * Extract domain.
 */
function extractDomain(url) {
  try {
    return new URL(url)
      .hostname
      .replace(/^www\./, "")
      .toLowerCase();
  } catch {
    return url;
  }
}

/*
 * Main source search.
 */
export async function searchSources(
  text
) {
  if (
    !text ||
    typeof text !== "string"
  ) {
    return [];
  }

  /*
   * Select six strong phrases instead
   * of searching every sentence.
   *
   * This saves SerpApi searches.
   */
  const phrases =
    extractSearchPhrases(
      text,
      6
    );

  if (!phrases.length) {
    return [];
  }

  const allResults = [];

  /*
   * Search each phrase.
   */
  for (
    const phrase of phrases
  ) {
    try {
      const results =
        await searchEverywhere(
          phrase
        );

      allResults.push(
        ...results
      );
    } catch (error) {
      console.error(
        "Phrase search error:",
        error
      );
    }
  }

  /*
   * Remove duplicate URLs.
   */
  const uniqueResults =
    deduplicateResults(
      allResults
    );

  /*
   * Compare search results with
   * the submitted story.
   */
  const analyzed =
    uniqueResults.map(
      (source) => {
        const searchableText =
          [
            source.title,
            source.snippet,
          ]
            .filter(Boolean)
            .join(" ");

        const similarity =
          calculateSimilarity(
            text,
            searchableText
          );

        const matchedPassages =
          findMatchingPassages(
            text,
            searchableText
          );

        return {
          title:
            source.title,

          url:
            source.url,

          domain:
            extractDomain(
              source.url
            ),

          snippet:
            source.snippet,

          source:
            source.source,

          position:
            source.position,

          similarity:
            Number(
              similarity.toFixed(1)
            ),

          matchedPassages,
        };
      }
    );

  /*
   * Keep meaningful matches.
   */
  return analyzed
    .filter(
      (result) =>
        result.similarity >= 10 ||
        result.matchedPassages
          .length > 0
    )
    .sort(
      (a, b) =>
        b.similarity -
        a.similarity
    )
    .slice(0, 10);
}
