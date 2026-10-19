import { processText } from "./TextProcessor";

export function calculateSimilarity(text1, text2) {
  const words1 = processText(text1);
  const words2 = processText(text2);

  if (!words1.length || !words2.length) {
    return 0;
  }

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  let matches = 0;

  set1.forEach(word => {
    if (set2.has(word)) {
      matches++;
    }
  });

  const totalWords = new Set([
    ...words1,
    ...words2
  ]).size;

  return matches / totalWords;
}

export function keywordScore(userText, keywords = []) {
  const userWords = processText(userText);

  let score = 0;

  keywords.forEach(keyword => {
    if (userWords.includes(keyword.toLowerCase())) {
      score += 1;
    }
  });

  if (!keywords.length) {
    return 0;
  }

  return score / keywords.length;
}

export function finalScore(userText, knowledgeItem) {
  const questionScore = calculateSimilarity(
    userText,
    knowledgeItem.question
  );

  const keyScore = keywordScore(
    userText,
    knowledgeItem.keywords || []
  );

  return (
    questionScore * 0.6 +
    keyScore * 0.4
  );
}
