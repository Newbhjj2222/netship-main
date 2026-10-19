// lib/storyParser.js

/**
 * Normalize text for reliable grouping.
 */
export function normalizeText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Parse story head.
 *
 * Supported:
 *
 * INKURU S01EP01
 * INKURU S01E01
 * INKURU S1E1
 * INKURU S01 EP01
 * INKURU S01 E01
 * INKURU SEASON 1 EPISODE 1
 * INKURU EP01
 * INKURU EPISODE 1
 * INKURU PART 1
 * INKURU PART01
 * INKURU IGICE 1
 * INKURU S01
 */
export function parseStoryHead(head = "") {
  const original = String(head || "")
    .replace(/\s+/g, " ")
    .trim();

  let title = original;
  let season = null;
  let episode = null;
  let part = null;

  // --------------------------------------------------
  // SEASON + EPISODE
  //
  // S01EP01
  // S01E01
  // S1E1
  // S01 EP01
  // S01 E01
  // --------------------------------------------------

  let match = original.match(
    /(?:^|\s)S(?:EASON)?\s*0*(\d+)\s*E(?:P(?:ISODE)?)?\.?\s*0*(\d+)\s*$/i
  );

  if (match) {
    season = Number(match[1]);
    episode = Number(match[2]);

    title = original
      .slice(0, match.index)
      .trim();
  }

  // --------------------------------------------------
  // SEASON + EP
  //
  // SEASON 1 EPISODE 1
  // SEASON 1 EP 1
  // --------------------------------------------------

  if (season === null && episode === null) {
    match = original.match(
      /(?:^|\s)SEASON\s*0*(\d+)\s+EP(?:ISODE)?\.?\s*0*(\d+)\s*$/i
    );

    if (match) {
      season = Number(match[1]);
      episode = Number(match[2]);

      title = original
        .slice(0, match.index)
        .trim();
    }
  }

  // --------------------------------------------------
  // EPISODE ONLY
  //
  // INKURU EP01
  // INKURU EP 01
  // INKURU EPISODE 01
  // --------------------------------------------------

  if (episode === null) {
    match = original.match(
      /(?:^|\s)EP(?:ISODE)?\.?\s*0*(\d+)\s*$/i
    );

    if (match) {
      episode = Number(match[1]);

      title = original
        .slice(0, match.index)
        .trim();
    }
  }

  // --------------------------------------------------
  // PART
  //
  // INKURU PART 1
  // INKURU PART01
  // INKURU IGICE 1
  // --------------------------------------------------

  match = original.match(
    /(?:^|\s)(?:PART|IGICE)\s*0*(\d+)\s*$/i
  );

  if (match) {
    part = Number(match[1]);

    title = original
      .slice(0, match.index)
      .trim();
  }

  // --------------------------------------------------
  // FINAL EPISODE
  // --------------------------------------------------

  title = title.replace(
    /\s+(?:THE\s+)?(?:FINAL|LAST)\s+(?:EPISODE|EP)\s*$/i,
    ""
  );

  title = title.replace(
    /\s+(?:EPISODE|EP)\s+(?:THE\s+)?(?:FINAL|LAST)\s*$/i,
    ""
  );

  // --------------------------------------------------
  // FINAL PART
  // --------------------------------------------------

  title = title.replace(
    /\s+(?:THE\s+)?(?:FINAL|LAST)\s+(?:PART|IGICE)\s*$/i,
    ""
  );

  title = title.replace(
    /\s+(?:PART|IGICE)\s+(?:THE\s+)?(?:FINAL|LAST)\s*$/i,
    ""
  );

  // --------------------------------------------------
  // SEASON ONLY
  //
  // INKURU S01
  // INKURU S1
  // INKURU SEASON 1
  // --------------------------------------------------

  if (season === null) {
    match = title.match(
      /(?:^|\s)S(?:EASON)?\s*0*(\d+)\s*$/i
    );

    if (match) {
      season = Number(match[1]);

      title = title
        .slice(0, match.index)
        .trim();
    }
  }

  // --------------------------------------------------
  // CLEANUP
  // --------------------------------------------------

  title = title
    .replace(/[\-_]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!title) {
    title = "Untitled Story";
  }

  const normalizedTitle = normalizeText(title);

  let storyType = "standalone";

  if (episode !== null || season !== null) {
    storyType = "series";
  }

  if (part !== null) {
    storyType = "parts";
  }

  return {
    original,
    title,
    normalizedTitle,
    season,
    episode,
    part,
    storyType,
  };
}

/**
 * Create a grouping key.
 *
 * Author is included so two authors can have
 * stories with the same title without being merged.
 */
export function createStoryGroupKey(post = {}) {
  const parsed = parseStoryHead(post.head || "");

  const author = normalizeText(
    post.author ||
      post.username ||
      "unknown"
  );

  return `${parsed.normalizedTitle}::${author}`;
}

/**
 * Parse numeric values safely.
 */
export function toNumber(value, fallback = 0) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

/**
 * Count words.
 */
export function countWords(text = "") {
  const clean = String(text || "").trim();

  if (!clean) {
    return 0;
  }

  return clean.split(/\s+/).filter(Boolean).length;
}

/**
 * Count characters.
 */
export function countCharacters(text = "") {
  return String(text || "").length;
}

/**
 * Extract post text.
 *
 * Different versions of the editor may store
 * content under different fields.
 */
export function getPostText(post = {}) {
  const possibleFields = [
    "content",
    "text",
    "body",
    "description",
    "article",
    "post",
    "html",
  ];

  for (const field of possibleFields) {
    if (
      typeof post[field] === "string" &&
      post[field].trim()
    ) {
      return post[field];
    }
  }

  return "";
}

/**
 * Convert Firestore timestamps / dates into
 * serializable values.
 */
export function serializeDate(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value === "object" &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === "object" &&
    typeof value.seconds === "number"
  ) {
    return new Date(
      value.seconds * 1000
    ).toISOString();
  }

  return value;
}
