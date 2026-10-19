import styles from './AIAnalysisCard.module.css';
import { useI18n } from "@/i18n/I18nProvider";

export default function AIAnalysisCard({ aiAnalysis }) {
  const { t } = useI18n();

  const getScoreColor = (score) => {
    if (score >= 70) return '#ef4444';
    if (score >= 40) return '#f59e0b';
    return '#10b981';
  };
  
  const getAssessmentColor = (assessment) => {
    if (assessment.includes('High')) return '#ef4444';
    if (assessment.includes('Moderate')) return '#f59e0b';
    return '#10b981';
  };
  
  const getConfidenceColor = (confidence) => {
    if (confidence === 'High') return '#ef4444';
    if (confidence === 'Medium') return '#f59e0b';
    return '#94a3b8';
  };
  
  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (aiAnalysis.score / 100) * circumference;
  
  return (
    <div className={styles.card}>
      <h2 className={styles.title}>{t("🤖 AI Writing Analysis")}</h2>
      
      <div className={styles.scoreContainer}>
        <svg className={styles.progressRing} width="150" height="150">
          <circle
            className={styles.ringBackground}
            stroke="#1e293b"
            strokeWidth="8"
            fill="transparent"
            r="60"
            cx="75"
            cy="75"
          />
          <circle
            className={styles.ringProgress}
            stroke={getScoreColor(aiAnalysis.score)}
            strokeWidth="8"
            fill="transparent"
            r="60"
            cx="75"
            cy="75"
            style={{
              strokeDasharray: `${circumference} ${circumference}`,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        <div className={styles.scoreText}>
          <span className={styles.scoreValue} style={{ color: getScoreColor(aiAnalysis.score) }}>
            {aiAnalysis.score}%
          </span>
          <span className={styles.scoreLabel}>{t("Estimated AI Likelihood")}</span>
        </div>
      </div>
      
      <div className={styles.details}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>{t("Assessment:")}</span>
          <span 
            className={styles.detailValue}
            style={{ color: getAssessmentColor(aiAnalysis.assessment) }}
          >
            {aiAnalysis.assessment}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>{t("Confidence:")}</span>
          <span 
            className={styles.detailValue}
            style={{ color: getConfidenceColor(aiAnalysis.confidence) }}
          >
            {aiAnalysis.confidence}
          </span>
        </div>
      </div>
      
      <div className={styles.indicators}>
        <h3 className={styles.indicatorsTitle}>{t("Analysis Indicators")}</h3>
        {aiAnalysis.indicators.map((indicator, index) => (
          <div key={index} className={styles.indicator}>
            <span className={styles.checkmark}>
              {indicator.detected ? '✓' : '○'}
            </span>
            <span className={styles.indicatorText}>{indicator.text}</span>
          </div>
        ))}
      </div>
      
      <div className={styles.disclaimer}>{t("This analysis is probabilistic and should not be treated as definitive proof that AI was used.")}</div>
    </div>
  );
}
