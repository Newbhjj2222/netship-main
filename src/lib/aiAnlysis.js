/**
 * KINYARWANDA AI WRITING ANALYZER
 *
 * IMPORTANT:
 * Iyi analyzer ntitanga gihamya ya 100% ko AI ari yo yanditse.
 * Irapima "AI-like writing signals" gusa.
 *
 * Sources:
 * - analyzeWatermark() ireba sources/URLs biri muri text.
 * - Internet source search igomba gukorwa na API endpoint.
 */

export function analyzeAIWriting(text) {
  if (typeof text !== "string") {
    throw new Error("Invalid text input");
  }

  const originalText = cleanInput(text);

  if (!originalText.trim()) {
    throw new Error("Text is empty");
  }

  const normalizedText =
    normalizeText(originalText);

  const words =
    getWords(normalizedText);

  const sentences =
    getSentences(originalText);

  const paragraphs =
    getParagraphs(originalText);

  const wordCount =
    words.length;

  const sentenceCount =
    sentences.length;

  const paragraphCount =
    paragraphs.length;

  const indicators = [];

  if (wordCount < 30) {
    return buildShortTextReport({
      originalText,
      words,
      sentences,
      paragraphs,
    });
  }

  let rawScore = 0;

  // =========================================================
  // BASIC STATISTICS
  // =========================================================

  const sentenceLengths =
    sentences.map(
      (sentence) =>
        getWords(sentence).length
    );

  const paragraphLengths =
    paragraphs.map(
      (paragraph) =>
        getWords(paragraph).length
    );

  const uniqueWords =
    new Set(words).size;

  const vocabularyDiversity =
    wordCount > 0
      ? uniqueWords / wordCount
      : 0;

  const averageSentenceLength =
    average(sentenceLengths);

  const medianSentenceLength =
    median(sentenceLengths);

  const sentenceStdDev =
    standardDeviation(
      sentenceLengths
    );

  const burstiness =
    calculateBurstiness(
      sentenceLengths
    );

  const averageParagraphLength =
    average(paragraphLengths);

  const paragraphStdDev =
    standardDeviation(
      paragraphLengths
    );

  // =========================================================
  // 1. SPECIAL KINYARWANDA PHRASES
  // =========================================================

  const specialPatterns = [
    ["bari baseka", 8],
    ["arabasekera", 7],
    ["akamwenyu", 6],
    ["akamwenyu ke", 7],
    ["mu kanya gato", 4],
    ["muri ako kanya", 4],
    ["muri uwo mwanya", 4],
    ["ntiyari azi ko", 6],
    ["ntiyigeze atekereza ko", 6],
    ["umutima we", 3],
    ["yumvise umutima we", 5],
    ["yagize akamwenyu", 6],
    ["yaramwenyuye", 5],
    ["mu buryo butunguranye", 4],
    ["mu buryo butari busanzwe", 5],
    ["ubuzima bwe bwari", 4],
    ["ibyo atari azi", 5],
    ["icyo atari azi", 5],
    ["byahinduye ubuzima bwe", 5],
    ["nta muntu wari uzi", 5],
    ["ntiyashoboraga kwizera", 4],
    ["ari bwo bwa mbere", 3],
    ["kuva uwo munsi", 3],
  ];

  let specialPatternCount = 0;

  for (
    const [phrase, weight] of specialPatterns
  ) {
    const count =
      countPhraseOccurrences(
        normalizedText,
        phrase
      );

    if (count > 0) {
      specialPatternCount += count;

      const contribution =
        Math.min(
          weight * Math.min(count, 3),
          weight * 3
        );

      rawScore += contribution;

      indicators.push({
        type: "formulaic_phrase",
        label: phrase,
        count,
        score: contribution,
        detected: true,
        weight: getWeightLabel(weight),
      });
    }
  }

  // =========================================================
  // 2. IZUBA OPENING
  // =========================================================

  if (
    /^izuba\b/i.test(
      normalizedText
    )
  ) {
    rawScore += 8;

    indicators.push({
      type: "opening_pattern",
      label:
        "Inyandiko itangirana na 'izuba'.",
      count: 1,
      score: 8,
      detected: true,
      weight: "medium",
    });
  }

  // =========================================================
  // 3. HASHTAGS
  // =========================================================

  const hashtags =
    originalText.match(
      /#[^\s#]+/g
    ) || [];

  if (hashtags.length > 0) {
    const contribution =
      Math.min(
        hashtags.length * 2,
        8
      );

    rawScore += contribution;

    indicators.push({
      type: "hashtag",
      label:
        "Hashtags zagaragaye.",
      count:
        hashtags.length,
      score:
        contribution,
      detected: true,
      weight: "low",
    });
  }

  // =========================================================
  // 4. SHORT SENTENCES
  // =========================================================

  const shortSentences =
    sentenceLengths.filter(
      (length) =>
        length > 0 &&
        length < 5
    );

  const shortSentenceRatio =
    sentenceCount > 0
      ? shortSentences.length /
        sentenceCount
      : 0;

  if (
    shortSentences.length >= 3
  ) {
    const contribution =
      Math.min(
        shortSentences.length * 1.5,
        10
      );

    rawScore += contribution;

    indicators.push({
      type: "short_sentences",
      label:
        "Interuro ngufi cyane.",
      count:
        shortSentences.length,
      score:
        contribution,
      detected: true,
      weight:
        shortSentenceRatio >= 0.35
          ? "high"
          : "medium",
    });
  }

  if (
    shortSentenceRatio >= 0.35 &&
    sentenceCount >= 8
  ) {
    rawScore += 5;

    indicators.push({
      type: "short_sentence_ratio",
      label:
        "Igice kinini cy'interuro ni kigufi.",
      count:
        shortSentences.length,
      score: 5,
      detected: true,
      weight: "medium",
    });
  }

  // =========================================================
  // 5. SENTENCE UNIFORMITY
  // =========================================================

  if (sentenceCount >= 5) {
    if (
      sentenceStdDev < 2.5 &&
      averageSentenceLength > 7
    ) {
      rawScore += 9;

      indicators.push({
        type: "sentence_uniformity",
        label:
          "Uburebure bw'interuro burasa cyane.",
        score: 9,
        detected: true,
        weight: "high",
      });
    } else if (
      sentenceStdDev < 4
    ) {
      rawScore += 4;

      indicators.push({
        type: "sentence_uniformity",
        label:
          "Hari consistency iri hagati mu burebure bw'interuro.",
        score: 4,
        detected: true,
        weight: "low",
      });
    }
  }

  // =========================================================
  // 6. BURSTINESS
  // =========================================================

  if (sentenceCount >= 6) {
    if (burstiness < 0.22) {
      rawScore += 6;

      indicators.push({
        type: "burstiness",
        label:
          "Variation y'uburebure bw'interuro ni nke.",
        score: 6,
        detected: true,
        weight: "medium",
      });
    }
  }

  // =========================================================
  // 7. VOCABULARY DIVERSITY
  // =========================================================

  if (wordCount >= 50) {
    if (
      vocabularyDiversity < 0.30
    ) {
      rawScore += 8;

      indicators.push({
        type: "vocabulary",
        label:
          "Vocabulary diversity iri hasi cyane.",
        score: 8,
        detected: true,
        weight: "high",
      });
    } else if (
      vocabularyDiversity < 0.40
    ) {
      rawScore += 4;

      indicators.push({
        type: "vocabulary",
        label:
          "Vocabulary diversity iri hasi.",
        score: 4,
        detected: true,
        weight: "medium",
      });
    }
  }

  // =========================================================
  // 8. WORD REPETITION
  // =========================================================

  const frequencies =
    getFrequency(words);

  const repeatedWords =
    Object.entries(
      frequencies
    )
      .filter(
        ([word, count]) =>
          count >= 5 &&
          word.length >= 4 &&
          !KINYARWANDA_COMMON_WORDS.has(
            word
          )
      )
      .sort(
        (a, b) =>
          b[1] - a[1]
      );

  if (
    repeatedWords.length >= 5
  ) {
    const contribution =
      Math.min(
        repeatedWords.length,
        8
      );

    rawScore += contribution;

    indicators.push({
      type: "word_repetition",
      label:
        "Amagambo amwe asubirwamo kenshi.",
      count:
        repeatedWords.length,
      score:
        contribution,
      detected: true,
      weight: "medium",
    });
  }

  // =========================================================
  // 9. REPEATED PHRASES
  // =========================================================

  const trigrams =
    createNGrams(words, 3);

  const trigramFrequency =
    getFrequency(trigrams);

  const repeatedPhrases =
    Object.entries(
      trigramFrequency
    )
      .filter(
        ([phrase, count]) => {
          if (count < 3) {
            return false;
          }

          const phraseWords =
            phrase.split(" ");

          return !phraseWords.every(
            (word) =>
              KINYARWANDA_COMMON_WORDS.has(
                word
              )
          );
        }
      )
      .sort(
        (a, b) =>
          b[1] - a[1]
      );

  if (
    repeatedPhrases.length >= 3
  ) {
    rawScore += 8;

    indicators.push({
      type: "repeated_phrases",
      label:
        "Phrases z'amagambo atatu zisubirwamo.",
      count:
        repeatedPhrases.length,
      score: 8,
      detected: true,
      weight: "medium",
    });
  }

  // =========================================================
  // 10. TRANSITIONS
  // =========================================================

  const transitionWords = [
    "ariko",
    "nyamara",
    "nubwo",
    "icyakora",
    "hanyuma",
    "nyuma",
    "maze",
    "nuko",
    "bityo",
    "byongeye",
    "hagati aho",
    "amaherezo",
    "muri make",
    "mu byukuri",
    "ni yo mpamvu",
    "kubera iyo mpamvu",
    "ku bw'ibyo",
    "ku rundi ruhande",
    "muri icyo gihe",
  ];

  const transitionCount =
    countTransitionWords(
      normalizedText,
      transitionWords
    );

  const transitionRatio =
    sentenceCount > 0
      ? transitionCount /
        sentenceCount
      : 0;

  if (
    transitionRatio > 0.8
  ) {
    rawScore += 7;

    indicators.push({
      type: "transitions",
      label:
        "Transitions zikoreshwa cyane.",
      count:
        transitionCount,
      score: 7,
      detected: true,
      weight: "medium",
    });
  } else if (
    transitionRatio > 0.5
  ) {
    rawScore += 3;

    indicators.push({
      type: "transitions",
      label:
        "Transitions zikoreshwa kenshi.",
      count:
        transitionCount,
      score: 3,
      detected: true,
      weight: "low",
    });
  }

  // =========================================================
  // 11. FORMULAIC STORYTELLING
  // =========================================================

  const formulaicPhrases = [
    "ntiyari azi ko",
    "ntiyigeze atekereza ko",
    "icyo atari azi",
    "ibyo atari azi",
    "nta muntu wari uzi",
    "byahinduye ubuzima bwe",
    "kuva uwo munsi",
    "ari bwo bwa mbere",
    "ntiyashoboraga kwizera",
    "mu buryo butunguranye",
    "ubuzima bwe bwari",
    "umunsi umwe",
  ];

  let formulaicCount = 0;

  for (
    const phrase of formulaicPhrases
  ) {
    formulaicCount +=
      countPhraseOccurrences(
        normalizedText,
        phrase
      );
  }

  if (
    sentenceCount >= 10 &&
    formulaicCount >= 4
  ) {
    rawScore += 7;

    indicators.push({
      type: "formulaic_storytelling",
      label:
        "Storytelling phrases zigaruka kenshi.",
      count:
        formulaicCount,
      score: 7,
      detected: true,
      weight: "medium",
    });
  }

  // =========================================================
  // 12. EMOTION EXPLANATION
  // =========================================================

  const emotionPatterns = [
    "yumvise",
    "yagize ubwoba",
    "yatunguwe",
    "yababajwe",
    "yarishimye",
    "umutima we",
    "yumvaga",
    "yatekereje",
    "yari afite ubwoba",
    "yari ababaye",
    "yari yishimye",
    "amarangamutima",
    "umujinya",
    "urukundo rwinshi",
    "umubabaro mwinshi",
    "akamwenyu",
  ];

  let emotionCount = 0;

  for (
    const phrase of emotionPatterns
  ) {
    emotionCount +=
      countPhraseOccurrences(
        normalizedText,
        phrase
      );
  }

  const emotionRatio =
    sentenceCount > 0
      ? emotionCount /
        sentenceCount
      : 0;

  if (
    sentenceCount >= 10 &&
    emotionRatio > 0.35
  ) {
    rawScore += 5;

    indicators.push({
      type: "emotion_explanation",
      label:
        "Amarangamutima asobanurwa mu buryo butaziguye kenshi.",
      count:
        emotionCount,
      score: 5,
      detected: true,
      weight: "low",
    });
  }

  // =========================================================
  // 13. PARAGRAPH UNIFORMITY
  // =========================================================

  if (
    paragraphCount >= 4 &&
    averageParagraphLength > 40 &&
    paragraphStdDev < 12
  ) {
    rawScore += 5;

    indicators.push({
      type: "paragraph_uniformity",
      label:
        "Paragraphs zifite uburebure busa cyane.",
      score: 5,
      detected: true,
      weight: "medium",
    });
  }

  // =========================================================
  // 14. SENTENCE OPENINGS
  // =========================================================

  const sentenceOpenings =
    sentences
      .map(
        (sentence) =>
          getWords(
            sentence
          )[0] || ""
      )
      .filter(Boolean);

  const openingFrequency =
    getFrequency(
      sentenceOpenings
    );

  const repeatedOpenings =
    Object.entries(
      openingFrequency
    ).filter(
      ([_, count]) =>
        count >= 4
    );

  if (
    repeatedOpenings.length >= 3
  ) {
    rawScore += 5;

    indicators.push({
      type: "opening_repetition",
      label:
        "Interuro nyinshi zitangirana n'amagambo amwe.",
      count:
        repeatedOpenings.length,
      score: 5,
      detected: true,
      weight: "medium",
    });
  }

  // =========================================================
  // 15. DIALOGUE
  // =========================================================

  const dialogue =
    analyzeDialogue(
      originalText
    );

  if (
    dialogue.dialogueRatio > 0 &&
    dialogue.variation < 0.25 &&
    dialogue.count >= 4
  ) {
    rawScore += 4;

    indicators.push({
      type: "dialogue_structure",
      label:
        "Dialogue zifite structure isa cyane.",
      score: 4,
      detected: true,
      weight: "low",
    });
  }

  // =========================================================
  // 16. WATERMARK / ATTRIBUTION
  // =========================================================

  const watermark =
    analyzeWatermark(
      originalText
    );

  // Watermark ntabwo igomba kongera AI score.
  // Ni evidence/source metadata.

  // =========================================================
  // FINAL SCORE
  // =========================================================

  const aiScore =
    Math.round(
      Math.min(
        Math.max(
          rawScore,
          0
        ),
        99
      )
    );

  // =========================================================
  // ASSESSMENT
  // =========================================================

  let assessment =
    "Ibimenyetso bya AI biri hasi";

  if (aiScore >= 70) {
    assessment =
      "Ibimenyetso bya AI biri hejuru";
  } else if (aiScore >= 40) {
    assessment =
      "Ibimenyetso bya AI biri hagati";
  }

  // =========================================================
  // CONFIDENCE
  // =========================================================

  const detectedIndicators =
    indicators.filter(
      (item) =>
        item.detected
    ).length;

  let confidence = "Low";

  if (
    wordCount >= 500 &&
    detectedIndicators >= 7
  ) {
    confidence = "High";
  } else if (
    wordCount >= 200 &&
    detectedIndicators >= 4
  ) {
    confidence = "Medium";
  }

  // =========================================================
  // READABILITY
  // =========================================================

  const readability =
    calculateReadability(
      words,
      sentences
    );

  // =========================================================
  // REPORT
  // =========================================================

  return {
    score: aiScore,

    assessment,

    confidence,

    summary:
      buildSummary(
        aiScore
      ),

    disclaimer:
      "Iyi score ntabwo ari gihamya ya 100% ko AI ari yo yanditse inyandiko. Ni isesengura ry'ibimenyetso by'imyandikire isa n'iya AI.",

    watermark,

    indicators,

    statistics: {
      characters:
        originalText.length,

      charactersNoSpaces:
        originalText.replace(
          /\s/g,
          ""
        ).length,

      words:
        wordCount,

      uniqueWords,

      sentences:
        sentenceCount,

      paragraphs:
        paragraphCount,

      shortSentences:
        shortSentences.length,

      shortSentenceRatio:
        round(
          shortSentenceRatio
        ),

      specialKinyarwandaPatterns:
        specialPatternCount,

      hashtags:
        hashtags.length,

      vocabularyDiversity:
        round(
          vocabularyDiversity
        ),

      averageSentenceLength:
        round(
          averageSentenceLength,
          2
        ),

      medianSentenceLength:
        round(
          medianSentenceLength,
          2
        ),

      sentenceStandardDeviation:
        round(
          sentenceStdDev,
          2
        ),

      burstiness:
        round(
          burstiness,
          3
        ),

      averageParagraphLength:
        round(
          averageParagraphLength,
          2
        ),

      paragraphStandardDeviation:
        round(
          paragraphStdDev,
          2
        ),

      repeatedWords:
        repeatedWords
          .slice(0, 15)
          .map(
            ([word, count]) => ({
              word,
              count,
            })
          ),

      repeatedPhrases:
        repeatedPhrases
          .slice(0, 15)
          .map(
            ([phrase, count]) => ({
              phrase,
              count,
            })
          ),

      transitionCount,

      transitionRatio:
        round(
          transitionRatio,
          3
        ),

      emotionCount,

      emotionRatio:
        round(
          emotionRatio,
          3
        ),

      dialogueCount:
        dialogue.count,

      dialogueRatio:
        dialogue.dialogueRatio,

      dialogueVariation:
        dialogue.variation,

      readability,
    },
  };
}

/* ============================================================
   SHORT TEXT REPORT
============================================================ */

function buildShortTextReport({
  originalText,
  words,
  sentences,
  paragraphs,
}) {
  return {
    score: 0,

    assessment:
      "Inyandiko ni ngufi cyane",

    confidence: "Low",

    summary:
      "Inyandiko ni ngufi cyane ku buryo AI-like writing analysis itizewe.",

    disclaimer:
      "Iyi score ntabwo ari gihamya ya 100% ko AI ari yo yanditse.",

    watermark:
      analyzeWatermark(
        originalText
      ),

    indicators: [
      {
        type: "short_text",
        label:
          "Inyandiko ifite amagambo make cyane.",
        detected: true,
        weight: "high",
        score: 0,
      },
    ],

    statistics: {
      characters:
        originalText.length,

      charactersNoSpaces:
        originalText.replace(
          /\s/g,
          ""
        ).length,

      words:
        words.length,

      uniqueWords:
        new Set(words).size,

      sentences:
        sentences.length,

      paragraphs:
        paragraphs.length,

      averageSentenceLength:
        average(
          sentences.map(
            (s) =>
              getWords(s).length
          )
        ),

      averageParagraphLength:
        average(
          paragraphs.map(
            (p) =>
              getWords(p).length
          )
        ),
    },
  };
}

/* ============================================================
   SUMMARY
============================================================ */

function buildSummary(score) {
  if (score >= 70) {
    return (
      "Inyandiko ifite ibimenyetso byinshi by'imyandikire isa n'iya AI. Ibi ntibihagije kuvuga ko AI ari yo yanditse inyandiko."
    );
  }

  if (score >= 40) {
    return (
      "Inyandiko ifite ibimenyetso bimwe na bimwe bishobora gusa n'imyandikire ya AI, ariko ibimenyetso ntabwo ari gihamya y'inkomoko y'inyandiko."
    );
  }

  return (
    "Inyandiko ifite ibimenyetso bike by'imyandikire isa n'iya AI."
  );
}

/* ============================================================
   NORMALIZE
============================================================ */

function normalizeText(text) {
  return String(text)
    .normalize("NFC")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .toLowerCase();
}

/* ============================================================
   CLEAN INPUT
============================================================ */

function cleanInput(text) {
  return String(text)
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ============================================================
   WORDS
============================================================ */

function getWords(text) {
  return String(text)
    .replace(
      /[“”"'‘’«»()[\]{}]/g,
      " "
    )
    .replace(
      /[,:;!?]+/g,
      " "
    )
    .split(/\s+/)
    .map(
      (word) =>
        word
          .replace(
            /^[^a-zA-ZÀ-ÿ0-9'-]+/,
            ""
          )
          .replace(
            /[^a-zA-ZÀ-ÿ0-9'-]+$/,
            ""
          )
    )
    .filter(Boolean);
}

/* ============================================================
   SENTENCES
============================================================ */

function getSentences(text) {
  return String(text)
    .replace(/\n+/g, " ")
    .split(
      /(?<=[.!?…])\s+/
    )
    .map(
      (sentence) =>
        sentence.trim()
    )
    .filter(
      (sentence) =>
        getWords(sentence)
          .length > 0
    );
}

/* ============================================================
   PARAGRAPHS
============================================================ */

function getParagraphs(text) {
  return String(text)
    .split(
      /\n\s*\n/
    )
    .map(
      (paragraph) =>
        paragraph.trim()
    )
    .filter(Boolean);
}

/* ============================================================
   AVERAGE
============================================================ */

function average(numbers) {
  if (
    !Array.isArray(numbers) ||
    numbers.length === 0
  ) {
    return 0;
  }

  return (
    numbers.reduce(
      (sum, value) =>
        sum + Number(value || 0),
      0
    ) /
    numbers.length
  );
}

/* ============================================================
   MEDIAN
============================================================ */

function median(numbers) {
  if (!numbers.length) {
    return 0;
  }

  const sorted =
    [...numbers].sort(
      (a, b) => a - b
    );

  const middle =
    Math.floor(
      sorted.length / 2
    );

  if (
    sorted.length % 2 === 0
  ) {
    return (
      (sorted[middle - 1] +
        sorted[middle]) /
      2
    );
  }

  return sorted[middle];
}

/* ============================================================
   STANDARD DEVIATION
============================================================ */

function standardDeviation(
  numbers
) {
  if (!numbers.length) {
    return 0;
  }

  const avg =
    average(numbers);

  const variance =
    average(
      numbers.map(
        (number) =>
          Math.pow(
            number - avg,
            2
          )
      )
    );

  return Math.sqrt(
    variance
  );
}

/* ============================================================
   BURSTINESS
============================================================ */

function calculateBurstiness(
  numbers
) {
  if (
    numbers.length < 2
  ) {
    return 0;
  }

  const avg =
    average(numbers);

  if (avg === 0) {
    return 0;
  }

  return (
    standardDeviation(
      numbers
    ) / avg
  );
}

/* ============================================================
   FREQUENCY
============================================================ */

function getFrequency(items) {
  const frequency =
    Object.create(null);

  for (
    const item of items
  ) {
    frequency[item] =
      (frequency[item] || 0) +
      1;
  }

  return frequency;
}

/* ============================================================
   NGRAMS
============================================================ */

function createNGrams(
  words,
  size
) {
  const result = [];

  for (
    let i = 0;
    i <= words.length - size;
    i++
  ) {
    result.push(
      words
        .slice(
          i,
          i + size
        )
        .join(" ")
    );
  }

  return result;
}

/* ============================================================
   PHRASE COUNT
============================================================ */

function countPhraseOccurrences(
  text,
  phrase
) {
  if (!phrase) {
    return 0;
  }

  const escaped =
    phrase.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const regex =
    new RegExp(
      `(?:^|\\s)${escaped}(?=\\s|$)`,
      "giu"
    );

  return (
    text.match(regex)
      ?.length || 0
  );
}

/* ============================================================
   TRANSITIONS
============================================================ */

function countTransitionWords(
  text,
  transitionWords
) {
  return transitionWords.reduce(
    (total, phrase) =>
      total +
      countPhraseOccurrences(
        text,
        phrase
      ),
    0
  );
}

/* ============================================================
   DIALOGUE
============================================================ */

function analyzeDialogue(text) {
  const matches = [
    ...(text.match(
      /"[^"]+"/g
    ) || []),

    ...(text.match(
      /“[^”]+”/g
    ) || []),

    ...(text.match(
      /«[^»]+»/g
    ) || []),

    ...(text.match(
      /(^|\n)\s*-\s+.+/g
    ) || []),
  ];

  const totalWords =
    getWords(text).length;

  const dialogueWords =
    matches.reduce(
      (sum, dialogue) =>
        sum +
        getWords(
          dialogue
        ).length,
      0
    );

  const lengths =
    matches.map(
      (dialogue) =>
        getWords(
          dialogue
        ).length
    );

  const avg =
    average(lengths);

  const variation =
    avg > 0
      ? standardDeviation(
          lengths
        ) / avg
      : 0;

  return {
    count:
      matches.length,

    dialogueWords,

    dialogueRatio:
      totalWords > 0
        ? round(
            dialogueWords /
              totalWords,
            3
          )
        : 0,

    variation:
      round(
        variation,
        3
      ),
  };
}

/* ============================================================
   READABILITY
============================================================ */

function calculateReadability(
  words,
  sentences
) {
  const wordCount =
    words.length;

  const sentenceCount =
    sentences.length;

  if (
    wordCount === 0 ||
    sentenceCount === 0
  ) {
    return {
      averageWordsPerSentence: 0,
      longWords: 0,
      longWordRatio: 0,
      level:
        "Ntabwo bihagije",
    };
  }

  const longWords =
    words.filter(
      (word) =>
        word.length >= 8
    ).length;

  const longWordRatio =
    longWords / wordCount;

  let level =
    "Byoroshye";

  if (
    longWordRatio > 0.25 ||
    wordCount /
      sentenceCount >
      25
  ) {
    level =
      "Biragoye";
  } else if (
    longWordRatio > 0.15 ||
    wordCount /
      sentenceCount >
      18
  ) {
    level =
      "Hagati";
  }

  return {
    averageWordsPerSentence:
      round(
        wordCount /
          sentenceCount,
        2
      ),

    longWords,

    longWordRatio:
      round(
        longWordRatio,
        3
      ),

    level,
  };
}

/* ============================================================
   PUNCTUATION
============================================================ */

export function analyzePunctuation(
  text
) {
  const periods =
    (
      text.match(/\./g) || []
    ).length;

  const questions =
    (
      text.match(/\?/g) || []
    ).length;

  const exclamations =
    (
      text.match(/!/g) || []
    ).length;

  const total =
    periods +
    questions +
    exclamations;

  if (!total) {
    return {
      consistency: 0,
      periods,
      questions,
      exclamations,
    };
  }

  return {
    consistency:
      Math.max(
        periods,
        questions,
        exclamations
      ) / total,

    periods,
    questions,
    exclamations,
  };
}

/* ============================================================
   WATERMARK / SOURCES IN TEXT
============================================================ */

export function analyzeWatermark(
  text
) {
  const matches = [];
  const sources = [];

  function add(type, value) {
    const clean =
      String(value)
        .trim();

    if (
      clean &&
      !matches.includes(clean)
    ) {
      matches.push(clean);

      sources.push({
        type,
        value: clean,
      });
    }
  }

  const websites =
    text.match(
      /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi
    ) || [];

  websites.forEach(
    (url) =>
      add("website", url)
  );

  const emails =
    text.match(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
    ) || [];

  emails.forEach(
    (email) =>
      add("email", email)
  );

  const usernames =
    text.match(
      /(^|\s)@[a-zA-Z0-9._-]{2,50}\b/g
    ) || [];

  usernames.forEach(
    (username) =>
      add(
        "social_username",
        username
      )
  );

  const patterns = [
    {
      type: "source",
      regex:
        /\bsource\s*[:\-]\s*[^\n]+/gi,
    },
    {
      type: "inkomoko",
      regex:
        /\binkomoko\s*[:\-]\s*[^\n]+/gi,
    },
    {
      type: "wanditswe_na",
      regex:
        /\bwanditswe\s+na\s*[:\-]?\s*[^\n]+/gi,
    },
    {
      type: "yanditswe_na",
      regex:
        /\byanditswe\s+na\s*[:\-]?\s*[^\n]+/gi,
    },
    {
      type: "author",
      regex:
        /\bauthor\s*[:\-]\s*[^\n]+/gi,
    },
    {
      type: "copyright",
      regex:
        /\bcopyright\s*[©:]?\s*[^\n]+/gi,
    },
    {
      type: "newtalentsg",
      regex:
        /\bnewtalentsg\b/gi,
    },
  ];

  for (
    const pattern of patterns
  ) {
    const found =
      text.match(
        pattern.regex
      ) || [];

    found.forEach(
      (value) =>
        add(
          pattern.type,
          value
        )
    );
  }

  return {
    detected:
      matches.length > 0,

    count:
      matches.length,

    matches,

    sources,

    assessment:
      matches.length > 0
        ? "Source cyangwa watermark yabonetse muri text."
        : "Nta source cyangwa watermark izwi yabonetse muri text.",
  };
}

/* ============================================================
   WEIGHT
============================================================ */

function getWeightLabel(weight) {
  if (weight >= 7) {
    return "high";
  }

  if (weight >= 4) {
    return "medium";
  }

  return "low";
}

/* ============================================================
   ROUND
============================================================ */

function round(
  value,
  decimals = 3
) {
  const factor =
    Math.pow(
      10,
      decimals
    );

  return (
    Math.round(
      value * factor
    ) / factor
  );
}

/* ============================================================
   COMMON KINYARWANDA WORDS
============================================================ */

const KINYARWANDA_COMMON_WORDS =
  new Set([
    "ari",
    "aba",
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
    "nawe",
    "nanjye",
    "we",
    "bo",
    "twe",
    "njye",
    "wowe",
    "abo",
    "ibyo",
    "iki",
    "ko",
    "ni",
    "mu",
    "ku",
    "no",
    "na",
    "yaba",
    "baba",
    "yari",
    "bari",
    "gusa",
    "none",
    "nyuma",
    "hanyuma",
    "aho",
    "igihe",
    "umuntu",
    "abantu",
    "inkuru",
    "munsi",
    "hejuru",
    "mbere",
    "inyuma",
    "bwo",
    "nk'uko",
    "nkuko",
    "nyamara",
    "bityo",
    "byose",
    "byinshi",
    "gato",
    "rwose",
  ]);
