import styles from './StatisticsCards.module.css';

export default function StatisticsCards({ statistics }) {
  const cards = [
    { label: 'Words', value: statistics.words, icon: '📝' },
    { label: 'Characters', value: statistics.characters, icon: '✏️' },
    { label: 'Sentences', value: statistics.sentences, icon: '📄' },
    { label: 'Paragraphs', value: statistics.paragraphs, icon: '📑' },
    { label: 'Reading Time', value: `${statistics.readingTime} min`, icon: '⏱️' },
    { label: 'Unique Words', value: statistics.uniqueWords, icon: '🔤' },
    { label: 'Word Diversity', value: `${statistics.vocabularyDiversity}%`, icon: '📊' },
    { label: 'Avg Words/Sentence', value: statistics.averageWordsPerSentence, icon: '📏' },
  ];
  
  return (
    <div className={styles.grid}>
      {cards.map((card, index) => (
        <div key={index} className={styles.card}>
          <span className={styles.icon}>{card.icon}</span>
          <div className={styles.value}>{card.value}</div>
          <div className={styles.label}>{card.label}</div>
        </div>
      ))}
    </div>
  );
}
