// src/lib/aiAnalysis.js

/**
 * KINYARWANDA AI WRITING ANALYZER
 *
 * PURPOSE
 * -------
 * Iyi analyzer ireba writing patterns zishobora gusa n'iza AI.
 *
 * IMPORTANT
 * ---------
 * AI-like score ntabwo ari gihamya ko AI ari yo yanditse text.
 *
 * Iyi system ishingira kuri:
 *
 * 1. Sentence uniformity
 * 2. Sentence burstiness
 * 3. Vocabulary diversity
 * 4. Repeated words
 * 5. Repeated phrases
 * 6. Sentence opening repetition
 * 7. Paragraph consistency
 * 8. Transition-word density
 * 9. Formulaic storytelling
 * 10. Direct emotion explanation
 * 11. Punctuation consistency
 * 12. Special phrase patterns
 * 13. Dialogue structure
 *
 * SOURCE / WATERMARK
 * ------------------
 * Watermark/source detection ntabwo ibarwa nka AI evidence.
 * Igaragara mu gice cyayo cyihariye.
 */

const MIN_WORDS = 30;

/*
|--------------------------------------------------------------------------
| MAIN ANALYZER
|--------------------------------------------------------------------------
*/

export function analyzeAIWriting(text) {
  if (
    typeof text !== "string" ||
    !text.trim()
  ) {
    throw new Error(
      "Invalid or empty text input"
    );
  }

  const originalText = text;

  const normalizedText =
    normalizeText(text);

  const words =
    getWords(normalizedText);

  const sentences =
    getSentences(normalizedText);

  const paragraphs =
    getParagraphs(normalizedText);

  const wordCount =
    words.length;

  const sentenceCount =
    sentences.length;

  const paragraphCount =
    paragraphs.length;

  /*
  |--------------------------------------------------------------------------
  | TEXT TOO SHORT
  |--------------------------------------------------------------------------
  */

  if (wordCount < MIN_WORDS) {
    return createShortTextResult(
      originalText,
      wordCount,
      sentenceCount,
      paragraphCount
    );
  }

  /*
  |--------------------------------------------------------------------------
  | INDICATORS
  |--------------------------------------------------------------------------
  */

  const indicators = [];

  /*
  |--------------------------------------------------------------------------
  | 1. SENTENCE UNIFORMITY
  |--------------------------------------------------------------------------
  */

  const sentenceUniformity =
    analyzeSentenceUniformity(
      sentences
    );

  if (
    sentenceUniformity.available
  ) {
    indicators.push(
      createIndicator({
        id:
          "sentence_uniformity",

        name:
          "Sentence uniformity",

        category:
          "Sentence structure",

        detected:
          sentenceUniformity.detected,

        score:
          sentenceUniformity.score,

        contribution:
          sentenceUniformity.contribution,

        maxContribution:
          15,

        weight:
          sentenceUniformity.weight,

        explanation:
          sentenceUniformity.explanation,

        evidence:
          sentenceUniformity.evidence,
      })
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 2. BURSTINESS
  |--------------------------------------------------------------------------
  */

  const burstiness =
    analyzeBurstiness(
      sentences
    );

  if (burstiness.available) {
    indicators.push(
      createIndicator({
        id:
          "sentence_burstiness",

        name:
          "Sentence variation",

        category:
          "Sentence structure",

        detected:
          burstiness.detected,

        score:
          burstiness.score,

        contribution:
          burstiness.contribution,

        maxContribution:
          12,

        weight:
          burstiness.weight,

        explanation:
          burstiness.explanation,

        evidence:
          burstiness.evidence,
      })
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 3. VOCABULARY DIVERSITY
  |--------------------------------------------------------------------------
  */

  const vocabulary =
    analyzeVocabulary(
      words
    );

  indicators.push(
    createIndicator({
      id:
        "vocabulary_diversity",

      name:
        "Vocabulary diversity",

      category:
        "Vocabulary",

      detected:
        vocabulary.detected,

      score:
        vocabulary.score,

      contribution:
        vocabulary.contribution,

      maxContribution:
        12,

      weight:
        vocabulary.weight,

      explanation:
        vocabulary.explanation,

      evidence:
        vocabulary.evidence,
    })
  );

  /*
  |--------------------------------------------------------------------------
  | 4. WORD REPETITION
  |--------------------------------------------------------------------------
  */

  const wordRepetition =
    analyzeWordRepetition(
      words
    );

  indicators.push(
    createIndicator({
      id:
        "word_repetition",

      name:
        "Word repetition",

      category:
        "Vocabulary",

      detected:
        wordRepetition.detected,

      score:
        wordRepetition.score,

      contribution:
        wordRepetition.contribution,

      maxContribution:
        10,

      weight:
        wordRepetition.weight,

      explanation:
        wordRepetition.explanation,

      evidence:
        wordRepetition.evidence,
    })
  );

  /*
  |--------------------------------------------------------------------------
  | 5. PHRASE REPETITION
  |--------------------------------------------------------------------------
  */

  const phraseRepetition =
    analyzePhraseRepetition(
      words
    );

  indicators.push(
    createIndicator({
      id:
        "phrase_repetition",

      name:
        "Repeated phrases",

      category:
        "Phrase patterns",

      detected:
        phraseRepetition.detected,

      score:
        phraseRepetition.score,

      contribution:
        phraseRepetition.contribution,

      maxContribution:
        14,

      weight:
        phraseRepetition.weight,

      explanation:
        phraseRepetition.explanation,

      evidence:
        phraseRepetition.evidence,
    })
  );

  /*
  |--------------------------------------------------------------------------
  | 6. SENTENCE OPENINGS
  |--------------------------------------------------------------------------
  */

  const openingRepetition =
    analyzeSentenceOpenings(
      sentences
    );

  indicators.push(
    createIndicator({
      id:
        "sentence_opening_repetition",

      name:
        "Sentence opening repetition",

      category:
        "Sentence structure",

      detected:
        openingRepetition.detected,

      score:
        openingRepetition.score,

      contribution:
        openingRepetition.contribution,

      maxContribution:
        9,

      weight:
        openingRepetition.weight,

      explanation:
        openingRepetition.explanation,

      evidence:
        openingRepetition.evidence,
    })
  );

  /*
  |--------------------------------------------------------------------------
  | 7. PARAGRAPH CONSISTENCY
  |--------------------------------------------------------------------------
  */

  const paragraphAnalysis =
    analyzeParagraphs(
      paragraphs
    );

  indicators.push(
    createIndicator({
      id:
        "paragraph_consistency",

      name:
        "Paragraph consistency",

      category:
        "Paragraph structure",

      detected:
        paragraphAnalysis.detected,

      score:
        paragraphAnalysis.score,

      contribution:
        paragraphAnalysis.contribution,

      maxContribution:
        8,

      weight:
        paragraphAnalysis.weight,

      explanation:
        paragraphAnalysis.explanation,

      evidence:
        paragraphAnalysis.evidence,
    })
  );

  /*
  |--------------------------------------------------------------------------
  | 8. TRANSITION DENSITY
  |--------------------------------------------------------------------------
  */

  const transitions =
    analyzeTransitions(
      normalizedText,
      sentenceCount
    );

  indicators.push(
    createIndicator({
      id:
        "transition_density",

      name:
        "Transition-word density",

      category:
        "Writing style",

      detected:
        transitions.detected,

      score:
        transitions.score,

      contribution:
        transitions.contribution,

      maxContribution:
        8,

      weight:
        transitions.weight,

      explanation:
        transitions.explanation,

      evidence:
        transitions.evidence,
    })
  );

  /*
  |--------------------------------------------------------------------------
  | 9. FORMULAIC STORYTELLING
  |--------------------------------------------------------------------------
  */

  const formulaic =
    analyzeFormulaicPatterns(
      normalizedText,
      sentenceCount
    );

  indicators.push(
    createIndicator({
      id:
        "formulaic_storytelling",

      name:
        "Formulaic storytelling patterns",

      category:
        "Story structure",

      detected:
        formulaic.detected,

      score:
        formulaic.score,

      contribution:
        formulaic.contribution,

      maxContribution:
        10,

      weight:
        formulaic.weight,

      explanation:
        formulaic.explanation,

      evidence:
        formulaic.evidence,
    })
  );

  /*
  |--------------------------------------------------------------------------
  | 10. DIRECT EMOTION EXPLANATION
  |--------------------------------------------------------------------------
  */

  const emotions =
    analyzeEmotionPatterns(
      normalizedText,
      sentenceCount
    );

  indicators.push(
    createIndicator({
      id:
        "direct_emotion_explanation",

      name:
        "Direct emotion explanation",

      category:
        "Writing style",

      detected:
        emotions.detected,

      score:
        emotions.score,

      contribution:
        emotions.contribution,

      maxContribution:
        7,

      weight:
        emotions.weight,

      explanation:
        emotions.explanation,

      evidence:
        emotions.evidence,
    })
  );

  /*
  |--------------------------------------------------------------------------
  | 11. SPECIAL KINYARWANDA PHRASES
  |--------------------------------------------------------------------------
  */

  const specialPatterns =
    analyzeSpecialKinyarwandaPatterns(
      normalizedText
    );

  indicators.push(
    createIndicator({
      id:
        "kinyarwanda_phrase_patterns",

      name:
        "Repeated Kinyarwanda phrase patterns",

      category:
        "Language patterns",

      detected:
        specialPatterns.detected,

      score:
        specialPatterns.score,

      contribution:
        specialPatterns.contribution,

      maxContribution:
        10,

      weight:
        specialPatterns.weight,

      explanation:
        specialPatterns.explanation,

      evidence:
        specialPatterns.evidence,
    })
  );

  /*
  |--------------------------------------------------------------------------
  | 12. DIALOGUE STRUCTURE
  |--------------------------------------------------------------------------
  */

  const dialogue =
    analyzeDialogue(
      originalText
    );

  indicators.push(
    createIndicator({
      id:
        "dialogue_structure",

      name:
        "Dialogue structure",

      category:
        "Dialogue",

      detected:
        dialogue.detected,

      score:
        dialogue.score,

      contribution:
        dialogue.contribution,

      maxContribution:
        5,

      weight:
        dialogue.weight,

      explanation:
        dialogue.explanation,

      evidence:
        dialogue.evidence,
    })
  );

  /*
  |--------------------------------------------------------------------------
  | 13. PUNCTUATION
  |--------------------------------------------------------------------------
  */

  const punctuation =
    analyzePunctuation(
      originalText
    );

  indicators.push(
    createIndicator({
      id:
        "punctuation_consistency",

      name:
        "Punctuation consistency",

      category:
        "Formatting",

      detected:
        punctuation.detected,

      score:
        punctuation.score,

      contribution:
        punctuation.contribution,

      maxContribution:
        5,

      weight:
        punctuation.weight,

      explanation:
        punctuation.explanation,

      evidence:
        punctuation.evidence,
    })
  );

  /*
  |--------------------------------------------------------------------------
  | CALCULATE FINAL SCORE
  |--------------------------------------------------------------------------
  */

  const positiveIndicators =
    indicators.filter(
      (indicator) =>
        indicator.detected
    );

  const totalContribution =
    positiveIndicators.reduce(
      (
        total,
        indicator
      ) =>
        total +
        indicator.contribution,
      0
    );

  const totalPossible =
    indicators.reduce(
      (
        total,
        indicator
      ) =>
        total +
        indicator.maxContribution,
      0
    );

  /*
   Normalize to 0-100.
  */

  let aiScore =
    totalPossible > 0
      ? (
          totalContribution /
          totalPossible
        ) * 100
      : 0;

  /*
   Minimum and maximum.
  */

  aiScore =
    Math.min(
      99,
      Math.max(
        0,
        aiScore
      )
    );

  /*
   Sample-size adjustment.
   Shorter text gets lower confidence.
  */

  const sampleAdjustment =
    calculateSampleAdjustment(
      wordCount
    );

  aiScore *=
    sampleAdjustment;

  aiScore =
    Math.round(
      aiScore
    );

  /*
  |--------------------------------------------------------------------------
  | CONFIDENCE
  |--------------------------------------------------------------------------
  */

  const confidence =
    calculateConfidence({
      wordCount,
      detectedCount:
        positiveIndicators.length,
      score:
        aiScore,
    });

  /*
  |--------------------------------------------------------------------------
  | ASSESSMENT
  |--------------------------------------------------------------------------
  */

  const assessment =
    getAssessment(
      aiScore
    );

  /*
  |--------------------------------------------------------------------------
  | SUMMARY
  |--------------------------------------------------------------------------
  */

  const summary =
    createSummary({
      score:
        aiScore,

      confidence,

      detectedCount:
        positiveIndicators.length,

      wordCount,
    });

  /*
  |--------------------------------------------------------------------------
  | SORT INDICATORS
  |--------------------------------------------------------------------------
  |
  | Strongest indicators first.
  |
  */

  const sortedIndicators =
    [...indicators].sort(
      (a, b) => {
        if (
          a.detected !==
          b.detected
        ) {
          return a.detected
            ? -1
            : 1;
        }

        return (
          b.contribution -
          a.contribution
        );
      }
    );

  /*
  |--------------------------------------------------------------------------
  | SOURCE / WATERMARK
  |--------------------------------------------------------------------------
  */

  const watermark =
    analyzeWatermark(
      originalText
    );

  /*
  |--------------------------------------------------------------------------
  | STATISTICS
  |--------------------------------------------------------------------------
  */

  const sentenceLengths =
    sentences.map(
      (sentence) =>
        getWords(sentence)
          .length
    );

  const vocabularySize =
    new Set(words)
      .size;

  /*
  |--------------------------------------------------------------------------
  | FINAL RESULT
  |--------------------------------------------------------------------------
  */

  return {
    score:
      aiScore,

    assessment,

    confidence,

    summary,

    indicators:
      sortedIndicators,

    detectedIndicators:
      positiveIndicators,

    indicatorCount:
      indicators.length,

    detectedIndicatorCount:
      positiveIndicators.length,

    scoreBreakdown: {
      totalContribution:
        Number(
          totalContribution.toFixed(
            2
          )
        ),

      totalPossible:
        Number(
          totalPossible.toFixed(
            2
          )
        ),

      sampleAdjustment:
        Number(
          sampleAdjustment.toFixed(
            3
          )
        ),
    },

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

      uniqueWords:
        vocabularySize,

      vocabularyDiversity:
        wordCount > 0
          ? Number(
              (
                vocabularySize /
                wordCount
              ).toFixed(3)
            )
          : 0,

      sentences:
        sentenceCount,

      paragraphs:
        paragraphCount,

      averageSentenceLength:
        sentenceCount > 0
          ? Number(
              (
                wordCount /
                sentenceCount
              ).toFixed(2)
            )
          : 0,

      sentenceStandardDeviation:
        sentenceLengths.length > 1
          ? Number(
              standardDeviation(
                sentenceLengths
              ).toFixed(2)
            )
          : 0,

      averageParagraphLength:
        paragraphCount > 0
          ? Number(
              (
                wordCount /
                paragraphCount
              ).toFixed(2)
            )
          : 0,
    },

    watermark,
  };
}

/*
|--------------------------------------------------------------------------
| CREATE INDICATOR
|--------------------------------------------------------------------------
*/

function createIndicator({
  id,
  name,
  category,
  detected,
  score,
  contribution,
  maxContribution,
  weight,
  explanation,
  evidence,
}) {
  return {
    id,

    name,

    category,

    detected:

      Boolean(
        detected
      ),

    /*
     0-100 strength of this particular indicator.
    */

    score:
      Math.round(
        Math.min(
          100,
          Math.max(
            0,
            score || 0
          )
        )
      ),

    /*
     Actual effect on final score.
    */

    contribution:
      Number(
        Math.max(
          0,
          contribution || 0
        ).toFixed(2)
      ),

    maxContribution,

    weight,

    explanation,

    evidence:
      evidence || {},
  };
}

/*
|--------------------------------------------------------------------------
| SENTENCE UNIFORMITY
|--------------------------------------------------------------------------
*/

function analyzeSentenceUniformity(
  sentences
) {
  if (
    sentences.length < 5
  ) {
    return {
      available: false,
    };
  }

  const lengths =
    sentences.map(
      (sentence) =>
        getWords(sentence)
          .length
    );

  const averageLength =
    average(lengths);

  const standardDev =
    standardDeviation(
      lengths
    );

  if (
    averageLength === 0
  ) {
    return {
      available: true,
      detected: false,
      score: 0,
      contribution: 0,
      weight: "low",
      explanation:
        "Nta data ihagije.",
      evidence: {},
    };
  }

  /*
   Lower standard deviation =
   more uniform.
  */

  const variation =
    standardDev /
    averageLength;

  let score = 0;
  let contribution = 0;
  let weight = "low";
  let detected = false;

  if (
    variation <= 0.12
  ) {
    score = 92;
    contribution = 15;
    weight = "high";
    detected = true;
  } else if (
    variation <= 0.20
  ) {
    score = 70;
    contribution = 10;
    weight = "medium";
    detected = true;
  } else if (
    variation <= 0.28
  ) {
    score = 45;
    contribution = 5;
    weight = "low";
    detected = true;
  } else {
    score = 15;
    contribution = 0;
  }

  return {
    available: true,

    detected,

    score,

    contribution,

    weight,

    explanation:
      detected
        ? "Uburebure bw'interuro bufite variation nke ugereranyije n'ibisanzwe."
        : "Uburebure bw'interuro buratandukanye ku rugero rusanzwe.",

    evidence: {
      sentenceCount:
        sentences.length,

      averageSentenceLength:
        Number(
          averageLength.toFixed(
            2
          )
        ),

      standardDeviation:
        Number(
          standardDev.toFixed(
            2
          )
        ),

      variation:
        Number(
          variation.toFixed(
            3
          )
        ),
    },
  };
}

/*
|--------------------------------------------------------------------------
| BURSTINESS
|--------------------------------------------------------------------------
*/

function analyzeBurstiness(
  sentences
) {
  if (
    sentences.length < 6
  ) {
    return {
      available: false,
    };
  }

  const lengths =
    sentences.map(
      (sentence) =>
        getWords(sentence)
          .length
    );

  const avg =
    average(lengths);

  const std =
    standardDeviation(
      lengths
    );

  const burstiness =
    avg > 0
      ? std / avg
      : 0;

  let score = 0;
  let contribution = 0;
  let detected = false;
  let weight = "low";

  if (
    burstiness < 0.15
  ) {
    score = 90;
    contribution = 12;
    detected = true;
    weight = "high";
  } else if (
    burstiness < 0.25
  ) {
    score = 65;
    contribution = 7;
    detected = true;
    weight = "medium";
  } else if (
    burstiness < 0.35
  ) {
    score = 40;
    contribution = 3;
    detected = true;
    weight = "low";
  } else {
    score = 10;
  }

  return {
    available: true,

    detected,

    score,

    contribution,

    weight,

    explanation:
      detected
        ? "Hari variation nke hagati y'interuro ngufi n'izirebire."
        : "Interuro zifite variation ihagije.",

    evidence: {
      averageSentenceLength:
        Number(
          avg.toFixed(2)
        ),

      standardDeviation:
        Number(
          std.toFixed(2)
        ),

      burstiness:
        Number(
          burstiness.toFixed(
            3
          )
        ),
    },
  };
}

/*
|--------------------------------------------------------------------------
| VOCABULARY
|--------------------------------------------------------------------------
*/

function analyzeVocabulary(
  words
) {
  if (
    words.length < 40
  ) {
    return {
      detected: false,
      score: 0,
      contribution: 0,
      weight: "low",
      explanation:
        "Text ni ngufi ku buryo vocabulary diversity yashingirwaho cyane.",
      evidence: {
        wordCount:
          words.length,
      },
    };
  }

  const unique =
    new Set(words)
      .size;

  const diversity =
    unique /
    words.length;

  let score = 0;
  let contribution = 0;
  let detected = false;
  let weight = "low";

  /*
   Low diversity may be repetitive,
   but very high diversity is not automatically AI.
  */

  if (
    diversity < 0.30
  ) {
    score = 88;
    contribution = 12;
    detected = true;
    weight = "high";
  } else if (
    diversity < 0.42
  ) {
    score = 62;
    contribution = 7;
    detected = true;
    weight = "medium";
  } else if (
    diversity < 0.52
  ) {
    score = 38;
    contribution = 3;
    detected = true;
    weight = "low";
  } else {
    score = 15;
  }

  return {
    detected,

    score,

    contribution,

    weight,

    explanation:
      detected
        ? "Vocabulary diversity iri hasi ugereranyije n'umubare w'amagambo."
        : "Vocabulary diversity ntabwo itanga signal ikomeye ya AI.",

    evidence: {
      totalWords:
        words.length,

      uniqueWords:
        unique,

      vocabularyDiversity:
        Number(
          diversity.toFixed(
            3
          )
        ),
    },
  };
}

/*
|--------------------------------------------------------------------------
| WORD REPETITION
|--------------------------------------------------------------------------
*/

function analyzeWordRepetition(
  words
) {
  if (
    words.length < 50
  ) {
    return {
      detected: false,
      score: 0,
      contribution: 0,
      weight: "low",
      explanation:
        "Text ni ngufi ku buryo repetition analysis iba ifite confidence nke.",
      evidence: {},
    };
  }

  const frequency =
    getFrequency(words);

  const repeated =
    Object.entries(
      frequency
    )
      .filter(
        ([word, count]) =>
          count >= 5 &&
          word.length >= 4 &&
          !COMMON_WORDS.has(
            word
          )
      )
      .sort(
        (a, b) =>
          b[1] - a[1]
      );

  const repeatedCount =
    repeated.length;

  let score = 0;
  let contribution = 0;
  let detected = false;
  let weight = "low";

  if (
    repeatedCount >= 10
  ) {
    score = 85;
    contribution = 10;
    detected = true;
    weight = "high";
  } else if (
    repeatedCount >= 6
  ) {
    score = 65;
    contribution = 7;
    detected = true;
    weight = "medium";
  } else if (
    repeatedCount >= 3
  ) {
    score = 40;
    contribution = 3;
    detected = true;
    weight = "low";
  }

  return {
    detected,

    score,

    contribution,

    weight,

    explanation:
      detected
        ? "Hari amagambo asubirwamo kenshi kurusha uko byari bitegerejwe."
        : "Nta word repetition ikomeye yagaragaye.",

    evidence: {
      repeatedWordCount:
        repeatedCount,

      topRepeatedWords:
        repeated
          .slice(0, 10)
          .map(
            ([word, count]) => ({
              word,
              count,
            })
          ),
    },
  };
}

/*
|--------------------------------------------------------------------------
| PHRASE REPETITION
|--------------------------------------------------------------------------
*/

function analyzePhraseRepetition(
  words
) {
  if (
    words.length < 60
  ) {
    return {
      detected: false,
      score: 0,
      contribution: 0,
      weight: "low",
      explanation:
        "Text ni ngufi ku buryo phrase repetition idatanga evidence ihagije.",
      evidence: {},
    };
  }

  const trigrams =
    createNGrams(
      words,
      3
    );

  const frequency =
    getFrequency(
      trigrams
    );

  const repeated =
    Object.entries(
      frequency
    )
      .filter(
        ([phrase, count]) =>
          count >= 3 &&
          phrase
            .split(" ")
            .some(
              (word) =>
                !COMMON_WORDS.has(
                  word
                )
            )
      )
      .sort(
        (a, b) =>
          b[1] - a[1]
      );

  let score = 0;
  let contribution = 0;
  let detected = false;
  let weight = "low";

  if (
    repeated.length >= 8
  ) {
    score = 90;
    contribution = 14;
    detected = true;
    weight = "high";
  } else if (
    repeated.length >= 4
  ) {
    score = 68;
    contribution = 9;
    detected = true;
    weight = "medium";
  } else if (
    repeated.length >= 2
  ) {
    score = 42;
    contribution = 4;
    detected = true;
    weight = "low";
  }

  return {
    detected,

    score,

    contribution,

    weight,

    explanation:
      detected
        ? "Hari 3-word phrases zisubirwamo inshuro nyinshi."
        : "Nta phrase repetition ikomeye yagaragaye.",

    evidence: {
      repeatedPhraseCount:
        repeated.length,

      topRepeatedPhrases:
        repeated
          .slice(0, 10)
          .map(
            ([phrase, count]) => ({
              phrase,
              count,
            })
          ),
    },
  };
}

/*
|--------------------------------------------------------------------------
| SENTENCE OPENINGS
|--------------------------------------------------------------------------
*/

function analyzeSentenceOpenings(
  sentences
) {
  if (
    sentences.length < 8
  ) {
    return {
      detected: false,
      score: 0,
      contribution: 0,
      weight: "low",
      explanation:
        "Interuro ni nke ku buryo opening repetition idatanga evidence ihagije.",
      evidence: {},
    };
  }

  const openings =
    sentences
      .map(
        (sentence) =>
          getWords(sentence)[0]
      )
      .filter(Boolean);

  const frequency =
    getFrequency(
      openings
    );

  const repeated =
    Object.entries(
      frequency
    )
      .filter(
        ([word, count]) =>
          count >= 4 &&
          !COMMON_WORDS.has(
            word
          )
      )
      .sort(
        (a, b) =>
          b[1] - a[1]
      );

  let score = 0;
  let contribution = 0;
  let detected = false;
  let weight = "low";

  if (
    repeated.length >= 4
  ) {
    score = 85;
    contribution = 9;
    detected = true;
    weight = "high";
  } else if (
    repeated.length >= 2
  ) {
    score = 62;
    contribution = 6;
    detected = true;
    weight = "medium";
  } else if (
    repeated.length >= 1
  ) {
    score = 35;
    contribution = 2;
    detected = true;
    weight = "low";
  }

  return {
    detected,

    score,

    contribution,

    weight,

    explanation:
      detected
        ? "Hari amagambo amwe agaruka kenshi mu ntangiriro z'interuro."
        : "Sentence openings zirahindagurika.",

    evidence: {
      sentenceCount:
        sentences.length,

      repeatedOpenings:
        repeated.map(
          ([word, count]) => ({
            word,
            count,
          })
        ),
    },
  };
}

/*
|--------------------------------------------------------------------------
| PARAGRAPHS
|--------------------------------------------------------------------------
*/

function analyzeParagraphs(
  paragraphs
) {
  if (
    paragraphs.length < 4
  ) {
    return {
      detected: false,
      score: 0,
      contribution: 0,
      weight: "low",
      explanation:
        "Paragraphs ni nke ku buryo consistency analysis iba nto.",
      evidence: {},
    };
  }

  const lengths =
    paragraphs.map(
      (paragraph) =>
        getWords(paragraph)
          .length
    );

  const avg =
    average(lengths);

  const std =
    standardDeviation(
      lengths
    );

  const variation =
    avg > 0
      ? std / avg
      : 0;

  let score = 0;
  let contribution = 0;
  let detected = false;
  let weight = "low";

  if (
    variation < 0.15 &&
    avg > 35
  ) {
    score = 82;
    contribution = 8;
    detected = true;
    weight = "high";
  } else if (
    variation < 0.25
  ) {
    score = 60;
    contribution = 5;
    detected = true;
    weight = "medium";
  } else if (
    variation < 0.35
  ) {
    score = 35;
    contribution = 2;
    detected = true;
    weight = "low";
  }

  return {
    detected,

    score,

    contribution,

    weight,

    explanation:
      detected
        ? "Paragraphs zifite uburebure busa ku rugero runaka."
        : "Paragraph lengths ziratandukanye.",

    evidence: {
      paragraphCount:
        paragraphs.length,

      averageParagraphLength:
        Number(
          avg.toFixed(2)
        ),

      standardDeviation:
        Number(
          std.toFixed(2)
        ),

      variation:
        Number(
          variation.toFixed(3)
        ),
    },
  };
}

/*
|--------------------------------------------------------------------------
| TRANSITIONS
|--------------------------------------------------------------------------
*/

function analyzeTransitions(
  text,
  sentenceCount
) {
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

  let count = 0;

  const matched =
    [];

  for (
    const phrase of transitionWords
  ) {
    const occurrences =
      countPhraseOccurrences(
        text,
        phrase
      );

    if (
      occurrences > 0
    ) {
      count +=
        occurrences;

      matched.push({
        phrase,
        count:
          occurrences,
      });
    }
  }

  const ratio =
    sentenceCount > 0
      ? count /
        sentenceCount
      : 0;

  let score = 0;
  let contribution = 0;
  let detected = false;
  let weight = "low";

  if (
    ratio > 0.9
  ) {
    score = 82;
    contribution = 8;
    detected = true;
    weight = "high";
  } else if (
    ratio > 0.6
  ) {
    score = 62;
    contribution = 5;
    detected = true;
    weight = "medium";
  } else if (
    ratio > 0.4
  ) {
    score = 38;
    contribution = 2;
    detected = true;
    weight = "low";
  }

  return {
    detected,

    score,

    contribution,

    weight,

    explanation:
      detected
        ? "Transition phrases zikoreshwa kenshi ugereranyije n'umubare w'interuro."
        : "Transition-word density iri mu rugero rusanzwe.",

    evidence: {
      transitionCount:
        count,

      sentenceCount,

      transitionRatio:
        Number(
          ratio.toFixed(
            3
          )
        ),

      matched,
    },
  };
}

/*
|--------------------------------------------------------------------------
| FORMULAIC STORYTELLING
|--------------------------------------------------------------------------
*/

function analyzeFormulaicPatterns(
  text,
  sentenceCount
) {
  const patterns = [
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
    "mu kanya gato",
    "muri ako kanya",
    "muri uwo mwanya",
  ];

  const matches =
    [];

  let count = 0;

  for (
    const phrase of patterns
  ) {
    const occurrences =
      countPhraseOccurrences(
        text,
        phrase
      );

    if (
      occurrences > 0
    ) {
      count +=
        occurrences;

      matches.push({
        phrase,
        count:
          occurrences,
      });
    }
  }

  const ratio =
    sentenceCount > 0
      ? count /
        sentenceCount
      : 0;

  let score = 0;
  let contribution = 0;
  let detected = false;
  let weight = "low";

  if (
    count >= 8 ||
    ratio >= 0.45
  ) {
    score = 88;
    contribution = 10;
    detected = true;
    weight = "high";
  } else if (
    count >= 4 ||
    ratio >= 0.30
  ) {
    score = 64;
    contribution = 6;
    detected = true;
    weight = "medium";
  } else if (
    count >= 2
  ) {
    score = 38;
    contribution = 2;
    detected = true;
    weight = "low";
  }

  return {
    detected,

    score,

    contribution,

    weight,

    explanation:
      detected
        ? "Story ikoresha storytelling phrases zisubirwamo kandi zifite structure isa."
        : "Nta formulaic storytelling pattern nyinshi zagaragaye.",

    evidence: {
      totalMatches:
        count,

      sentenceCount,

      ratio:
        Number(
          ratio.toFixed(3)
        ),

      matchedPatterns:
        matches,
    },
  };
}

/*
|--------------------------------------------------------------------------
| EMOTION PATTERNS
|--------------------------------------------------------------------------
*/

function analyzeEmotionPatterns(
  text,
  sentenceCount
) {
  const patterns = [
    "yumvise",
    "yumvaga",
    "yagize ubwoba",
    "yatunguwe",
    "yababajwe",
    "yarishimye",
    "umutima we",
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

  const matches =
    [];

  let count = 0;

  for (
    const phrase of patterns
  ) {
    const occurrences =
      countPhraseOccurrences(
        text,
        phrase
      );

    if (
      occurrences > 0
    ) {
      count +=
        occurrences;

      matches.push({
        phrase,
        count:
          occurrences,
      });
    }
  }

  const ratio =
    sentenceCount > 0
      ? count /
        sentenceCount
      : 0;

  let score = 0;
  let contribution = 0;
  let detected = false;
  let weight = "low";

  if (
    ratio > 0.55
  ) {
    score = 82;
    contribution = 7;
    detected = true;
    weight = "medium";
  } else if (
    ratio > 0.35
  ) {
    score = 60;
    contribution = 4;
    detected = true;
    weight = "low";
  } else if (
    ratio > 0.20
  ) {
    score = 35;
    contribution = 2;
    detected = true;
    weight = "low";
  }

  return {
    detected,

    score,

    contribution,

    weight,

    explanation:
      detected
        ? "Amarangamutima asobanurwa mu buryo butaziguye kenshi."
        : "Nta direct-emotion pattern nyinshi zagaragaye.",

    evidence: {
      emotionMatches:
        count,

      sentenceCount,

      emotionRatio:
        Number(
          ratio.toFixed(
            3
          )
        ),

      matchedPatterns:
        matches,
    },
  };
}

/*
|--------------------------------------------------------------------------
| SPECIAL KINYARWANDA PATTERNS
|--------------------------------------------------------------------------
*/

function analyzeSpecialKinyarwandaPatterns(
  text
) {
  const patterns = [
    {
      phrase:
        "bari baseka",

      weight:
        8,
    },

    {
      phrase:
        "arabasekera",

      weight:
        7,
    },

    {
      phrase:
        "akamwenyu",

      weight:
        6,
    },

    {
      phrase:
        "akamwenyu ke",

      weight:
        6,
    },

    {
      phrase:
        "mu kanya gato",

      weight:
        4,
    },

    {
      phrase:
        "muri ako kanya",

      weight:
        4,
    },

    {
      phrase:
        "muri uwo mwanya",

      weight:
        4,
    },

    {
      phrase:
        "ntiyari azi ko",

      weight:
        6,
    },

    {
      phrase:
        "ntiyigeze atekereza ko",

      weight:
        6,
    },

    {
      phrase:
        "yumvise umutima we",

      weight:
        5,
    },

    {
      phrase:
        "yagize akamwenyu",

      weight:
        6,
    },

    {
      phrase:
        "yaramwenyuye",

      weight:
        5,
    },

    {
      phrase:
        "mu buryo butunguranye",

      weight:
        4,
    },

    {
      phrase:
        "mu buryo butari busanzwe",

      weight:
        5,
    },

    {
      phrase:
        "ubuzima bwe bwari",

      weight:
        4,
    },

    {
      phrase:
        "ibyo atari azi",

      weight:
        5,
    },

    {
      phrase:
        "icyo atari azi",

      weight:
        5,
    },

    {
      phrase:
        "byahinduye ubuzima bwe",

      weight:
        5,
    },

    {
      phrase:
        "nta muntu wari uzi",

      weight:
        5,
    },

    {
      phrase:
        "ntiyashoboraga kwizera",

      weight:
        4,
    },

    {
      phrase:
        "ari bwo bwa mbere",

      weight:
        3,
    },

    {
      phrase:
        "kuva uwo munsi",

      weight:
        3,
    },
  ];

  const matches =
    [];

  let rawScore = 0;

  for (
    const pattern of patterns
  ) {
    const count =
      countPhraseOccurrences(
        text,
        pattern.phrase
      );

    if (
      count > 0
    ) {
      matches.push({
        phrase:
          pattern.phrase,

        count,

        patternWeight:
          pattern.weight,
      });

      /*
       Single occurrence has limited effect.
       */

      rawScore +=
        Math.min(
          count,
          3
        ) *
        pattern.weight;
    }
  }

  /*
   Don't allow this category
   to dominate the complete result.
  */

  const contribution =
    Math.min(
      10,
      rawScore *
        0.18
    );

  const score =
    Math.min(
      100,
      contribution *
        10
    );

  const detected =
    matches.length >= 2;

  return {
    detected,

    score,

    contribution:
      detected
        ? Number(
            contribution.toFixed(
              2
            )
          )
        : 0,

    weight:
      matches.length >= 5
        ? "medium"
        : "low",

    explanation:
      detected
        ? "Hari Kinyarwanda phrases zigaragara inshuro nyinshi. Izi phrases ubwazo ntabwo zihamya AI."
        : "Nta special phrase pattern ihagije yagaragaye.",

    evidence: {
      matchedPhraseCount:
        matches.length,

      rawPatternScore:
        rawScore,

      matches:
        matches.slice(
          0,
          20
        ),
    },
  };
}

/*
|--------------------------------------------------------------------------
| DIALOGUE
|--------------------------------------------------------------------------
*/

function analyzeDialogue(
  text
) {
  const dialogues = [
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

  if (
    dialogues.length < 3
  ) {
    return {
      detected: false,
      score: 0,
      contribution: 0,
      weight: "low",
      explanation:
        "Dialogue nke cyane cyangwa nta dialogue ihagije yabonetse.",
      evidence: {
        dialogueCount:
          dialogues.length,
      },
    };
  }

  const lengths =
    dialogues.map(
      (dialogue) =>
        getWords(dialogue)
          .length
    );

  const avg =
    average(lengths);

  const std =
    standardDeviation(
      lengths
    );

  const variation =
    avg > 0
      ? std / avg
      : 0;

  let score = 0;
  let contribution = 0;
  let detected = false;
  let weight = "low";

  if (
    variation < 0.15
  ) {
    score = 78;
    contribution = 5;
    detected = true;
    weight = "medium";
  } else if (
    variation < 0.25
  ) {
    score = 48;
    contribution = 2;
    detected = true;
    weight = "low";
  }

  return {
    detected,

    score,

    contribution,

    weight,

    explanation:
      detected
        ? "Dialogue zifite uburebure n'imiterere isa cyane."
        : "Dialogue ziratandukanye ku rugero rusanzwe.",

    evidence: {
      dialogueCount:
        dialogues.length,

      averageDialogueLength:
        Number(
          avg.toFixed(2)
        ),

      standardDeviation:
        Number(
          std.toFixed(2)
        ),

      variation:
        Number(
          variation.toFixed(3)
        ),
    },
  };
}

/*
|--------------------------------------------------------------------------
| PUNCTUATION
|--------------------------------------------------------------------------
*/

function analyzePunctuation(
  text
) {
  const periods =
    (
      text.match(
        /\./g
      ) || []
    ).length;

  const questions =
    (
      text.match(
        /\?/g
      ) || []
    ).length;

  const exclamations =
    (
      text.match(
        /!/g
      ) || []
    ).length;

  const total =
    periods +
    questions +
    exclamations;

  if (
    total < 5
  ) {
    return {
      detected: false,
      score: 0,
      contribution: 0,
      weight: "low",
      explanation:
        "Punctuation data ni nke.",
      evidence: {
        periods,
        questions,
        exclamations,
      },
    };
  }

  const dominant =
    Math.max(
      periods,
      questions,
      exclamations
    );

  const consistency =
    dominant / total;

  let score = 0;
  let contribution = 0;
  let detected = false;
  let weight = "low";

  /*
   Very high punctuation consistency
   is only a weak signal.
  */

  if (
    consistency > 0.96 &&
    total >= 20
  ) {
    score = 55;
    contribution = 5;
    detected = true;
    weight = "low";
  } else if (
    consistency > 0.92 &&
    total >= 20
  ) {
    score = 35;
    contribution = 2;
    detected = true;
    weight = "low";
  }

  return {
    detected,

    score,

    contribution,

    weight,

    explanation:
      detected
        ? "Punctuation pattern irahoraho cyane."
        : "Punctuation pattern ntabwo itanga signal ikomeye.",

    evidence: {
      periods,

      questions,

      exclamations,

      total,

      consistency:
        Number(
          consistency.toFixed(
            3
          )
        ),
    },
  };
}

/*
|--------------------------------------------------------------------------
| WATERMARK / SOURCE
|--------------------------------------------------------------------------
|
| IMPORTANT:
| Ibi ntibyongerwa kuri AI score.
|
*/

export function analyzeWatermark(
  text
) {
  const matches = [];

  const sources = [];

  /*
  |--------------------------------------------------------------------------
  | WEBSITE
  |--------------------------------------------------------------------------
  */

  const websites =
    text.match(
      /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi
    ) || [];

  for (
    const website of websites
  ) {
    addUniqueSource(
      matches,
      sources,
      {
        type:
          "website",

        value:
          website,
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | EMAIL
  |--------------------------------------------------------------------------
  */

  const emails =
    text.match(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
    ) || [];

  for (
    const email of emails
  ) {
    addUniqueSource(
      matches,
      sources,
      {
        type:
          "email",

        value:
          email,
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | @USERNAME
  |--------------------------------------------------------------------------
  */

  const usernames =
    text.match(
      /(^|\s)@[a-zA-Z0-9._-]{2,50}\b/g
    ) || [];

  for (
    const username of usernames
  ) {
    const clean =
      username.trim();

    addUniqueSource(
      matches,
      sources,
      {
        type:
          "social_username",

        value:
          clean,
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SOURCE / AUTHOR / COPYRIGHT
  |--------------------------------------------------------------------------
  */

  const sourcePatterns =
    [
      {
        type:
          "source",

        regex:
          /\bsource\s*[:\-]\s*[^\n]+/gi,
      },

      {
        type:
          "source",

        regex:
          /\bsource\s+ya\s*[:\-]\s*[^\n]+/gi,
      },

      {
        type:
          "source",

        regex:
          /\binkomoko\s*[:\-]\s*[^\n]+/gi,
      },

      {
        type:
          "author",

        regex:
          /\bwanditswe\s+na\s*[:\-]\s*[^\n]+/gi,
      },

      {
        type:
          "author",

        regex:
          /\byanditswe\s+na\s*[:\-]\s*[^\n]+/gi,
      },

      {
        type:
          "author",

        regex:
          /\bumwanditsi\s*[:\-]\s*[^\n]+/gi,
      },

      {
        type:
          "author",

        regex:
          /\bauthor\s*[:\-]\s*[^\n]+/gi,
      },

      {
        type:
          "copyright",

        regex:
          /\bcopyright\s*[©:]?\s*[^\n]+/gi,
      },

      {
        type:
          "copyright",

        regex:
          /©[^\n]*/gi,
      },
    ];

  for (
    const pattern of sourcePatterns
  ) {
    const found =
      text.match(
        pattern.regex
      ) || [];

    for (
      const value of found
    ) {
      addUniqueSource(
        matches,
        sources,
        {
          type:
            pattern.type,

          value:
            value.trim(),
        }
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | KNOWN WATERMARK
  |--------------------------------------------------------------------------
  */

  const watermarkWords = [
    "newtalentsg",
  ];

  for (
    const word of watermarkWords
  ) {
    if (
      new RegExp(
        `\\b${escapeRegex(
          word
        )}\\b`,
        "i"
      ).test(text)
    ) {
      addUniqueSource(
        matches,
        sources,
        {
          type:
            "watermark",

          value:
            word,
        }
      );
    }
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
        ? "Source cyangwa watermark byabonetse."
        : "Nta source cyangwa watermark izwi yabonetse.",
  };
}

/*
|--------------------------------------------------------------------------
| SHORT TEXT RESULT
|--------------------------------------------------------------------------
*/

function createShortTextResult(
  originalText,
  wordCount,
  sentenceCount,
  paragraphCount
) {
  return {
    score: 0,

    assessment:
      "Inyandiko ni ngufi cyane",

    confidence:
      "Low",

    summary:
      "Inyandiko ifite amagambo make cyane ku buryo AI-like writing analysis yakorwa mu buryo bwizewe.",

    indicators: [
      {
        id:
          "insufficient_text",

        name:
          "Insufficient text",

        category:
          "Data quality",

        detected:
          true,

        score: 0,

        contribution: 0,

        maxContribution: 0,

        weight:
          "high",

        explanation:
          `Inyandiko ifite amagambo ${wordCount}. Hakenewe nibura ${MIN_WORDS}.`,

        evidence: {
          words:
            wordCount,

          minimumRequired:
            MIN_WORDS,

          sentences:
            sentenceCount,

          paragraphs:
            paragraphCount,
        },
      },
    ],

    detectedIndicators: [],

    indicatorCount: 1,

    detectedIndicatorCount: 1,

    scoreBreakdown: {
      totalContribution: 0,

      totalPossible: 0,

      sampleAdjustment: 0,
    },

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

      sentences:
        sentenceCount,

      paragraphs:
        paragraphCount,
    },

    watermark:
      analyzeWatermark(
        originalText
      ),
  };
}

/*
|--------------------------------------------------------------------------
| SAMPLE ADJUSTMENT
|--------------------------------------------------------------------------
*/

function calculateSampleAdjustment(
  wordCount
) {
  if (
    wordCount < 50
  ) {
    return 0.65;
  }

  if (
    wordCount < 100
  ) {
    return 0.78;
  }

  if (
    wordCount < 200
  ) {
    return 0.88;
  }

  if (
    wordCount < 400
  ) {
    return 0.95;
  }

  return 1;
}

/*
|--------------------------------------------------------------------------
| CONFIDENCE
|--------------------------------------------------------------------------
*/

function calculateConfidence({
  wordCount,
  detectedCount,
  score,
}) {
  if (
    wordCount >= 500 &&
    detectedCount >= 6
  ) {
    return "High";
  }

  if (
    wordCount >= 200 &&
    detectedCount >= 4
  ) {
    return "Medium";
  }

  if (
    wordCount >= 100 &&
    detectedCount >= 3
  ) {
    return "Medium-Low";
  }

  return "Low";
}

/*
|--------------------------------------------------------------------------
| ASSESSMENT
|--------------------------------------------------------------------------
*/

function getAssessment(
  score
) {
  if (
    score >= 75
  ) {
    return "Ibimenyetso byinshi by'imyandikire isa n'iya AI";
  }

  if (
    score >= 50
  ) {
    return "Ibimenyetso biciriritse by'imyandikire isa n'iya AI";
  }

  if (
    score >= 30
  ) {
    return "Hari ibimenyetso bike by'imyandikire isa n'iya AI";
  }

  return "Ibimenyetso bya AI biri hasi";
}

/*
|--------------------------------------------------------------------------
| SUMMARY
|--------------------------------------------------------------------------
*/

function createSummary({
  score,
  confidence,
  detectedCount,
  wordCount,
}) {
  if (
    score >= 75
  ) {
    return (
      `Inyandiko ifite AI-like writing score ya ${score}%. ` +
      `Hagaragaye indicators ${detectedCount} zifatika mu isesengura. ` +
      `Confidence ni ${confidence}. ` +
      `Iyi score ntabwo ari gihamya ya 100% ko AI ari yo yanditse inyandiko.`
    );
  }

  if (
    score >= 50
  ) {
    return (
      `Inyandiko ifite AI-like writing score ya ${score}%. ` +
      `Hari patterns zimwe zisa n'izishobora kuboneka mu nyandiko yakozwe cyangwa yafashijwe na AI. ` +
      `Confidence ni ${confidence}.`
    );
  }

  if (
    score >= 30
  ) {
    return (
      `Inyandiko ifite AI-like writing score ya ${score}%. ` +
      `Hari indicators nke, ariko ntabwo zihagije kuvuga ko AI ari yo yanditse text.`
    );
  }

  return (
    `Inyandiko ifite AI-like writing score ya ${score}%. ` +
    `Nta bimenyetso byinshi by'imyandikire isa n'iya AI byabonetse.`
  );
}

/*
|--------------------------------------------------------------------------
| COMMON WORDS
|--------------------------------------------------------------------------
*/

const COMMON_WORDS =
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
    "byose",
    "byinshi",
    "gato",
    "rwose",
    "bwo",
    "mo",
    "yo",
    "ho",
    "bo",
    "twe",
    "mwe",
    "aba",
    "aya",
    "ibi",
    "iki",
    "izi",
    "izo",
    "iyi",
  ]);

/*
|--------------------------------------------------------------------------
| NORMALIZE TEXT
|--------------------------------------------------------------------------
*/

function normalizeText(
  text
) {
  return text
    .normalize("NFC")
    .replace(
      /\r\n/g,
      "\n"
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
      /\n{3,}/g,
      "\n\n"
    )
    .trim()
    .toLowerCase();
}

/*
|--------------------------------------------------------------------------
| GET WORDS
|--------------------------------------------------------------------------
*/

function getWords(
  text
) {
  return text
    .replace(
      /[“”"'‘’«»()[\]{}]/g,
      " "
    )
    .replace(
      /[,:;!?]+/g,
      " "
    )
    .split(
      /\s+/
    )
    .map(
      (word) =>
        word
          .replace(
            /^[^\p{L}\p{N}'-]+/u,
            ""
          )
          .replace(
            /[^\p{L}\p{N}'-]+$/u,
            ""
          )
    )
    .filter(Boolean);
}

/*
|--------------------------------------------------------------------------
| SENTENCES
|--------------------------------------------------------------------------
*/

function getSentences(
  text
) {
  return text
    .split(
      /(?<=[.!?…])\s+/
    )
    .map(
      (sentence) =>
        sentence.trim()
    )
    .filter(
      (sentence) =>
        getWords(
          sentence
        ).length > 0
    );
}

/*
|--------------------------------------------------------------------------
| PARAGRAPHS
|--------------------------------------------------------------------------
*/

function getParagraphs(
  text
) {
  return text
    .split(
      /\n\s*\n/
    )
    .map(
      (paragraph) =>
        paragraph.trim()
    )
    .filter(Boolean);
}

/*
|--------------------------------------------------------------------------
| AVERAGE
|--------------------------------------------------------------------------
*/

function average(
  numbers
) {
  if (
    !numbers.length
  ) {
    return 0;
  }

  return (
    numbers.reduce(
      (
        total,
        number
      ) =>
        total + number,
      0
    ) /
    numbers.length
  );
}

/*
|--------------------------------------------------------------------------
| STANDARD DEVIATION
|--------------------------------------------------------------------------
*/

function standardDeviation(
  numbers
) {
  if (
    numbers.length < 2
  ) {
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

/*
|--------------------------------------------------------------------------
| FREQUENCY
|--------------------------------------------------------------------------
*/

function getFrequency(
  items
) {
  const frequency =
    Object.create(
      null
    );

  for (
    const item of items
  ) {
    frequency[item] =
      (frequency[item] ||
        0) +
      1;
  }

  return frequency;
}

/*
|--------------------------------------------------------------------------
| N-GRAMS
|--------------------------------------------------------------------------
*/

function createNGrams(
  words,
  size = 3
) {
  const result = [];

  for (
    let i = 0;
    i <=
    words.length -
      size;
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

/*
|--------------------------------------------------------------------------
| PHRASE OCCURRENCES
|--------------------------------------------------------------------------
*/

function countPhraseOccurrences(
  text,
  phrase
) {
  if (
    !phrase ||
    !text
  ) {
    return 0;
  }

  const escaped =
    escapeRegex(
      phrase
    );

  const regex =
    new RegExp(
      `(?<!\\p{L})${escaped}(?!\\p{L})`,
      "giu"
    );

  return (
    text.match(
      regex
    )?.length || 0
  );
}

/*
|--------------------------------------------------------------------------
| ESCAPE REGEX
|--------------------------------------------------------------------------
*/

function escapeRegex(
  value
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

/*
|--------------------------------------------------------------------------
| ADD UNIQUE SOURCE
|--------------------------------------------------------------------------
*/

function addUniqueSource(
  matches,
  sources,
  source
) {
  if (
    !matches.includes(
      source.value
    )
  ) {
    matches.push(
      source.value
    );

    sources.push(
      source
    );
  }
}

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
  analyzeAIWriting,
  analyzeWatermark,
};
