// lib/similarity.js

function normalizeText(text) {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getWords(text) {
  return normalizeText(text)
    .split(/\s+/)
    .filter(Boolean);
}

function createNGrams(words, size = 3) {
  const result = [];

  for (let i = 0; i <= words.length - size; i++) {
    result.push(
      words.slice(i, i + size).join(" ")
    );
  }

  return result;
}

function splitSentences(text) {
  return (
    text.match(/[^.!?…]+[.!?…]+/g) || []
  )
    .map((sentence) =>
      sentence.replace(/\s+/g, " ").trim()
    )
    .filter(Boolean);
}

export function calculateSimilarity(
  originalText,
  sourceText
) {
  if (
    !originalText ||
    !sourceText ||
    typeof originalText !== "string" ||
    typeof sourceText !== "string"
  ) {
    return 0;
  }

  const originalWords = getWords(originalText);
  const sourceWords = getWords(sourceText);

  if (
    !originalWords.length ||
    !sourceWords.length
  ) {
    return 0;
  }

  const originalSet = new Set(originalWords);
  const sourceSet = new Set(sourceWords);

  let commonWords = 0;

  for (const word of originalSet) {
    if (sourceSet.has(word)) {
      commonWords++;
    }
  }

  const vocabularySimilarity =
    commonWords /
    Math.max(
      originalSet.size,
      sourceSet.size
    );

  const originalPhrases = createNGrams(
    originalWords,
    3
  );

  const sourcePhrases = createNGrams(
    sourceWords,
    3
  );

  const sourcePhraseSet = new Set(
    sourcePhrases
  );

  let matchingPhrases = 0;

  for (const phrase of originalPhrases) {
    if (sourcePhraseSet.has(phrase)) {
      matchingPhrases++;
    }
  }

  const phraseSimilarity =
    originalPhrases.length > 0
      ? matchingPhrases / originalPhrases.length
      : 0;

  // Exact phrase matching is given more weight
  const score =
    vocabularySimilarity * 0.35 +
    phraseSimilarity * 0.65;

  return Math.min(
    100,
    Math.max(0, score * 100)
  );
}

export function findMatchingPassages(
  originalText,
  sourceText
) {
  if (!originalText || !sourceText) {
    return [];
  }

  const originalSentences =
    splitSentences(originalText);

  const sourceSentences =
    splitSentences(sourceText);

  const matches = [];

  for (const originalSentence of originalSentences) {
    const words =
      getWords(originalSentence);

    if (words.length < 5) {
      continue;
    }

    let bestMatch = "";
    let bestScore = 0;

    for (const sourceSentence of sourceSentences) {
      const score =
        calculateSimilarity(
          originalSentence,
          sourceSentence
        );

      if (score > bestScore) {
        bestScore = score;
        bestMatch = sourceSentence;
      }
    }

    if (
      bestMatch &&
      bestScore >= 45
    ) {
      matches.push({
        original: originalSentence,
        source: bestMatch,
        similarity: Number(
          bestScore.toFixed(1)
        ),
      });
    }
  }

  return matches
    .sort(
      (a, b) =>
        b.similarity - a.similarity
    )
    .slice(0, 10);
}
