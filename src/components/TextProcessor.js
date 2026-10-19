export function cleanText(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, "")
    .trim();
}

export function tokenize(text = "") {
  return cleanText(text)
    .split(/\s+/)
    .filter(Boolean);
}

export function removeStopWords(words = []) {
  const stopWords = [
    "na",
    "ni",
    "iki",
    "ese",
    "ko",
    "kuri",
    "mu",
    "muri",
    "ku",
    "ya",
    "byo",
    "the",
    "is",
    "a",
    "an",
    "and",
    "to",
    "of"
  ];

  return words.filter(
    word => !stopWords.includes(word)
  );
}

export function processText(text) {
  const words = tokenize(text);
  return removeStopWords(words);
}

export function getKeywords(text) {
  return processText(text);
}
