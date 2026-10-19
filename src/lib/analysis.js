// src/lib/textAnalysis.js

/*
|--------------------------------------------------------------------------
| TEXT NORMALIZATION
|--------------------------------------------------------------------------
*/

/**
 * Cleans text while preserving the original language characters.
 */
export function normalizeText(text) {
  if (
    typeof text !== "string" ||
    !text.trim()
  ) {
    return "";
  }

  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Normalizes text for word/statistical comparison.
 */
function normalizeForAnalysis(text) {
  if (
    typeof text !== "string" ||
    !text.trim()
  ) {
    return "";
  }

  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^\p{L}\p{N}\s'-]/gu,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

/*
|--------------------------------------------------------------------------
| WORDS
|--------------------------------------------------------------------------
*/

/**
 * Returns an array of words.
 *
 * Unicode-aware, so Kinyarwanda characters
 * and other international languages are supported.
 */
export function getWords(text) {
  const normalized =
    normalizeForAnalysis(text);

  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\s+/)
    .map((word) =>
      word
        .replace(
          /^[-']+|[-']+$/g,
          ""
        )
        .trim()
    )
    .filter(Boolean);
}

/**
 * Counts words in the supplied text.
 */
export function countWords(text) {
  return getWords(text).length;
}

/*
|--------------------------------------------------------------------------
| CHARACTERS
|--------------------------------------------------------------------------
*/

/**
 * Counts all characters including spaces,
 * punctuation and line breaks.
 */
export function countCharacters(text) {
  if (
    typeof text !== "string"
  ) {
    return 0;
  }

  return text.length;
}

/**
 * Counts characters without whitespace.
 */
export function countCharactersNoSpaces(
  text
) {
  if (
    typeof text !== "string"
  ) {
    return 0;
  }

  return text.replace(
    /\s/g,
    ""
  ).length;
}

/*
|--------------------------------------------------------------------------
| SENTENCES
|--------------------------------------------------------------------------
*/

/**
 * Splits text into sentences.
 *
 * Supports:
 * .
 * !
 * ?
 * …
 *
 * Also handles new paragraphs.
 */
export function splitSentences(
  text
) {
  if (
    typeof text !== "string" ||
    !text.trim()
  ) {
    return [];
  }

  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(
      /(?<=[.!?…])\s+|\n+/
    )
    .map((sentence) =>
      sentence
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}

/**
 * Counts sentences.
 */
export function countSentences(
  text
) {
  return splitSentences(text)
    .length;
}

/*
|--------------------------------------------------------------------------
| PARAGRAPHS
|--------------------------------------------------------------------------
*/

/**
 * Splits text into paragraphs.
 *
 * A paragraph is separated by one or more
 * blank lines.
 */
export function splitParagraphs(
  text
) {
  if (
    typeof text !== "string" ||
    !text.trim()
  ) {
    return [];
  }

  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n\s*\n+/)
    .map((paragraph) =>
      paragraph.trim()
    )
    .filter(Boolean);
}

/**
 * Counts paragraphs.
 */
export function countParagraphs(
  text
) {
  return splitParagraphs(text)
    .length;
}

/*
|--------------------------------------------------------------------------
| READING TIME
|--------------------------------------------------------------------------
*/

/**
 * Average reading speed.
 *
 * 225 words/minute is a reasonable general estimate.
 */
export const DEFAULT_WORDS_PER_MINUTE = 225;

/**
 * Calculates estimated reading time in minutes.
 *
 * Example:
 *
 * 450 words / 225 WPM = 2 minutes
 */
export function calculateReadingTime(
  text,
  wordsPerMinute =
    DEFAULT_WORDS_PER_MINUTE
) {
  const words =
    countWords(text);

  const wpm =
    Number(wordsPerMinute);

  if (
    words === 0 ||
    !Number.isFinite(wpm) ||
    wpm <= 0
  ) {
    return 0;
  }

  return Math.max(
    1,
    Math.ceil(
      words / wpm
    )
  );
}

/**
 * Returns a human-readable reading time.
 */
export function getReadingTimeLabel(
  text,
  wordsPerMinute =
    DEFAULT_WORDS_PER_MINUTE
) {
  const minutes =
    calculateReadingTime(
      text,
      wordsPerMinute
    );

  if (minutes <= 0) {
    return "0 min";
  }

  if (minutes === 1) {
    return "1 min";
  }

  return `${minutes} min`;
}

/*
|--------------------------------------------------------------------------
| AVERAGE WORDS PER SENTENCE
|--------------------------------------------------------------------------
*/

/**
 * Calculates average number of words per sentence.
 */
export function calculateAverageWordsPerSentence(
  text
) {
  const words =
    countWords(text);

  const sentences =
    countSentences(text);

  if (
    words === 0 ||
    sentences === 0
  ) {
    return 0;
  }

  return Number(
    (
      words / sentences
    ).toFixed(2)
  );
}

/*
|--------------------------------------------------------------------------
| UNIQUE WORDS
|--------------------------------------------------------------------------
*/

/**
 * Returns unique words.
 */
export function getUniqueWords(
  text
) {
  const words =
    getWords(text);

  return [
    ...new Set(words),
  ];
}

/**
 * Counts unique words.
 */
export function calculateUniqueWords(
  text
) {
  return getUniqueWords(text)
    .length;
}

/*
|--------------------------------------------------------------------------
| VOCABULARY DIVERSITY
|--------------------------------------------------------------------------
*/

/**
 * Calculates Type-Token Ratio:
 *
 * unique words / total words
 *
 * Example:
 *
 * 100 total words
 * 60 unique words
 *
 * diversity = 0.60
 */
export function calculateVocabularyDiversity(
  text
) {
  const totalWords =
    countWords(text);

  const uniqueWords =
    calculateUniqueWords(
      text
    );

  if (
    totalWords === 0
  ) {
    return 0;
  }

  return Number(
    (
      uniqueWords /
      totalWords
    ).toFixed(3)
  );
}

/*
|--------------------------------------------------------------------------
| WORD FREQUENCY
|--------------------------------------------------------------------------
*/

/**
 * Creates a frequency map of words.
 */
export function getWordFrequency(
  text
) {
  const words =
    getWords(text);

  const frequency = {};

  for (
    const word of words
  ) {
    frequency[word] =
      (frequency[word] || 0) + 1;
  }

  return frequency;
}

/**
 * Returns repeated words.
 */
export function getRepeatedWords(
  text,
  minimumOccurrences = 3
) {
  const frequency =
    getWordFrequency(text);

  return Object.entries(
    frequency
  )
    .filter(
      ([, count]) =>
        count >=
        minimumOccurrences
    )
    .sort(
      (a, b) =>
        b[1] - a[1]
    )
    .map(
      ([word, count]) => ({
        word,
        count,
      })
    );
}

/*
|--------------------------------------------------------------------------
| SENTENCE LENGTH ANALYSIS
|--------------------------------------------------------------------------
*/

/**
 * Returns the number of words in each sentence.
 */
export function getSentenceLengths(
  text
) {
  return splitSentences(text)
    .map(
      (sentence) =>
        countWords(sentence)
    );
}

/**
 * Calculates sentence-length statistics.
 */
export function getSentenceLengthStatistics(
  text
) {
  const lengths =
    getSentenceLengths(text);

  if (!lengths.length) {
    return {
      minimum: 0,
      maximum: 0,
      average: 0,
      standardDeviation: 0,
    };
  }

  const minimum =
    Math.min(...lengths);

  const maximum =
    Math.max(...lengths);

  const average =
    lengths.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / lengths.length;

  const variance =
    lengths.reduce(
      (sum, value) =>
        sum +
        Math.pow(
          value - average,
          2
        ),
      0
    ) / lengths.length;

  const standardDeviation =
    Math.sqrt(variance);

  return {
    minimum,

    maximum,

    average:
      Number(
        average.toFixed(2)
      ),

    standardDeviation:
      Number(
        standardDeviation.toFixed(
          2
        )
      ),
  };
}

/*
|--------------------------------------------------------------------------
| PARAGRAPH STATISTICS
|--------------------------------------------------------------------------
*/

export function getParagraphWordCounts(
  text
) {
  return splitParagraphs(
    text
  ).map(
    (paragraph) =>
      countWords(paragraph)
  );
}

export function getParagraphStatistics(
  text
) {
  const counts =
    getParagraphWordCounts(
      text
    );

  if (!counts.length) {
    return {
      minimum: 0,
      maximum: 0,
      average: 0,
    };
  }

  const minimum =
    Math.min(...counts);

  const maximum =
    Math.max(...counts);

  const average =
    counts.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / counts.length;

  return {
    minimum,

    maximum,

    average:
      Number(
        average.toFixed(2)
      ),
  };
}

/*
|--------------------------------------------------------------------------
| TEXT COMPLEXITY
|--------------------------------------------------------------------------
*/

/**
 * Estimates lexical complexity.
 *
 * This is not a linguistic diagnosis.
 * It is simply a statistical indicator.
 */
export function calculateLexicalComplexity(
  text
) {
  const words =
    getWords(text);

  if (!words.length) {
    return 0;
  }

  const longWords =
    words.filter(
      (word) =>
        word.length >= 7
    ).length;

  return Number(
    (
      longWords /
      words.length
    ).toFixed(3)
  );
}

/*
|--------------------------------------------------------------------------
| BASIC PUNCTUATION ANALYSIS
|--------------------------------------------------------------------------
*/

export function countPunctuation(
  text
) {
  if (
    typeof text !== "string"
  ) {
    return {
      periods: 0,
      commas: 0,
      questionMarks: 0,
      exclamationMarks: 0,
      colons: 0,
      semicolons: 0,
      quotationMarks: 0,
      parentheses: 0,
      dashes: 0,
    };
  }

  return {
    periods:
      (
        text.match(/\./g) ||
        []
      ).length,

    commas:
      (
        text.match(/,/g) ||
        []
      ).length,

    questionMarks:
      (
        text.match(/\?/g) ||
        []
      ).length,

    exclamationMarks:
      (
        text.match(/!/g) ||
        []
      ).length,

    colons:
      (
        text.match(/:/g) ||
        []
      ).length,

    semicolons:
      (
        text.match(/;/g) ||
        []
      ).length,

    quotationMarks:
      (
        text.match(
          /["“”‘’]/g
        ) || []
      ).length,

    parentheses:
      (
        text.match(
          /[()]/g
        ) || []
      ).length,

    dashes:
      (
        text.match(
          /[-–—]/g
        ) || []
      ).length,
  };
}

/*
|--------------------------------------------------------------------------
| BASIC TEXT QUALITY
|--------------------------------------------------------------------------
*/

/**
 * Detects whether text contains enough content
 * for statistical analysis.
 */
export function getAnalysisQuality(
  text
) {
  const words =
    countWords(text);

  if (words < 40) {
    return {
      level: "Low",
      message:
        "Text ni ngufi cyane ku buryo analysis iba yizewe cyane.",
    };
  }

  if (words < 100) {
    return {
      level: "Medium-Low",
      message:
        "Text iracyari ngufi, analysis igomba gufatwa nk'igereranyo.",
    };
  }

  if (words < 500) {
    return {
      level: "Medium",
      message:
        "Text ifite uburebure buhagije ku analysis rusange.",
    };
  }

  return {
    level: "High",
    message:
      "Text ifite data ihagije ku statistical analysis.",
  };
}

/*
|--------------------------------------------------------------------------
| COMPLETE TEXT ANALYSIS
|--------------------------------------------------------------------------
*/

/**
 * Returns one complete analysis object.
 *
 * This is useful if another page/component wants
 * all statistics at once.
 */
export function analyzeText(
  text
) {
  const normalized =
    normalizeText(text);

  const words =
    countWords(normalized);

  const characters =
    countCharacters(
      normalized
    );

  const charactersNoSpaces =
    countCharactersNoSpaces(
      normalized
    );

  const sentences =
    countSentences(
      normalized
    );

  const paragraphs =
    countParagraphs(
      normalized
    );

  const readingTime =
    calculateReadingTime(
      normalized
    );

  const averageWordsPerSentence =
    calculateAverageWordsPerSentence(
      normalized
    );

  const uniqueWords =
    calculateUniqueWords(
      normalized
    );

  const vocabularyDiversity =
    calculateVocabularyDiversity(
      normalized
    );

  return {
    words,

    characters,

    charactersNoSpaces,

    sentences,

    paragraphs,

    readingTime,

    readingTimeLabel:
      getReadingTimeLabel(
        normalized
      ),

    averageWordsPerSentence,

    uniqueWords,

    vocabularyDiversity,

    lexicalComplexity:
      calculateLexicalComplexity(
        normalized
      ),

    sentenceStatistics:
      getSentenceLengthStatistics(
        normalized
      ),

    paragraphStatistics:
      getParagraphStatistics(
        normalized
      ),

    punctuation:
      countPunctuation(
        normalized
      ),

    analysisQuality:
      getAnalysisQuality(
        normalized
      ),
  };
}

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
  normalizeText,

  getWords,
  countWords,

  countCharacters,
  countCharactersNoSpaces,

  splitSentences,
  countSentences,

  splitParagraphs,
  countParagraphs,

  calculateReadingTime,
  getReadingTimeLabel,

  calculateAverageWordsPerSentence,

  getUniqueWords,
  calculateUniqueWords,

  calculateVocabularyDiversity,

  getWordFrequency,
  getRepeatedWords,

  getSentenceLengths,
  getSentenceLengthStatistics,

  getParagraphWordCounts,
  getParagraphStatistics,

  calculateLexicalComplexity,

  countPunctuation,

  getAnalysisQuality,

  analyzeText,
};
