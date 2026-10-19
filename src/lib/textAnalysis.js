export function analyzeText(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text input');
  }

  // Character counts
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;
  
  // Word count
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  
  // Sentence count
  const sentences = text.trim() ? (text.match(/[.!?]+/g) || []).length : 0;
  
  // Paragraph count
  const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter(p => p.trim()).length : 0;
  
  // Reading time (200-250 words per minute)
  const readingTimeMinutes = Math.ceil(words / 225);
  
  // Average words per sentence
  const averageWordsPerSentence = sentences > 0 ? (words / sentences).toFixed(1) : 0;
  
  // Unique words and vocabulary diversity
  const wordArray = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
  const uniqueWords = new Set(wordArray).size;
  const vocabularyDiversity = words > 0 ? ((uniqueWords / words) * 100).toFixed(1) : 0;
  
  return {
    words,
    characters,
    charactersNoSpaces,
    sentences,
    paragraphs,
    readingTime: readingTimeMinutes,
    averageWordsPerSentence: parseFloat(averageWordsPerSentence),
    uniqueWords,
    vocabularyDiversity: parseFloat(vocabularyDiversity)
  };
}
