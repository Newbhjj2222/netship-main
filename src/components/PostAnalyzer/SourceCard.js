import styles from './SourceCard.module.css';
import { useI18n } from "@/i18n/I18nProvider";

export default function SourceCard({ source }) {
  const { t } = useI18n();

  const getSimilarityColor = (similarity) => {
    const value = parseFloat(similarity);
    if (value >= 70) return '#ef4444';
    if (value >= 40) return '#f59e0b';
    return '#10b981';
  };
  
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{source.title}</h3>
        <span className={styles.domain}>{source.domain}</span>
      </div>
      
      <div className={styles.similarityContainer}>
        <div className={styles.similarityBar}>
          <div 
            className={styles.similarityFill}
            style={{ 
              width: `${source.similarity}%`,
              backgroundColor: getSimilarityColor(source.similarity)
            }}
          />
        </div>
        <span 
          className={styles.similarityValue}
          style={{ color: getSimilarityColor(source.similarity) }}
        >
          {source.similarity}%
        </span>
      </div>
      
      {source.snippet && (
        <p className={styles.snippet}>{source.snippet}</p>
      )}
      
      {source.matchedPassages && source.matchedPassages.length > 0 && (
        <div className={styles.matches}>
          <h4 className={styles.matchesTitle}>{t("Matched Passages:")}</h4>
          {source.matchedPassages.map((passage, index) => (
            <div key={index} className={styles.matchItem}>
              <div className={styles.matchSimilarity} style={{ 
                backgroundColor: getSimilarityColor(passage.similarity) 
              }}>
                {passage.similarity}%
              </div>
              <blockquote className={styles.matchText}>
                "{passage.source}"
              </blockquote>
            </div>
          ))}
        </div>
      )}
      
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.openButton}
        aria-label={t("Open source: {title}", { title: source.title })}
      >{t("Open Source ↗")}</a>
    </div>
  );
}
