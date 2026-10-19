import StatisticsCards from './StatisticsCards';
import AIAnalysisCard from './AIAnalysisCard';
import SourceCard from './SourceCard';
import ShareReport from './ShareReport';
import styles from './AnalysisReport.module.css';
import { useI18n } from "@/i18n/I18nProvider";

export default function AnalysisReport({ report, text, reportId }) {
  const { t } = useI18n();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("📊 Analysis Report")}</h2>
        <ShareReport report={report} text={text} reportId={reportId} />
      </div>
      
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t("📝 Content Statistics")}</h3>
        <StatisticsCards statistics={report.statistics} />
      </div>
      
      <div className={styles.section}>
        <AIAnalysisCard aiAnalysis={report.aiAnalysis} />
      </div>
      
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t("🔍 Source Analysis")}</h3>
        
        {report.sources && report.sources.length > 0 ? (
          <>
            <p className={styles.sourcesFound}>{t("{length} possible", { length: report.sources.length })}{" "}{report.sources.length === 1 ? t("source") : t("sources")}{" "}{t("found")}</p>
            {report.sources.map((source, index) => (
              <SourceCard key={index} source={source} />
            ))}
          </>
        ) : (
          <div className={styles.noSources}>
            <p>{t("No strong source match was found.")}</p>
            <p className={styles.noSourcesNote}>{t("Unable to verify source. This doesn't necessarily mean the content is original, but no matching sources could be identified through available search methods.")}</p>
          </div>
        )}
      </div>
      
      <div className={styles.disclaimer}>
        <h4 className={styles.disclaimerTitle}>{t("⚠️ Important Disclaimer")}</h4>
        <p>{t("Source similarity indicates possible textual overlap and does not by itself prove plagiarism. AI-writing detection is probabilistic and can produce false positives or false negatives. The AI score should not be treated as definitive proof that a text was written by AI.")}</p>
        <p>{t("This analysis is based on heuristic algorithms and available search methods. Results should be used as investigative indicators rather than conclusive evidence.")}</p>
      </div>
      
      {report.generatedAt && (
        <div className={styles.timestamp}>{t("Report generated at:")}{" "}{new Date(report.generatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
