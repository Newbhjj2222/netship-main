import { useState } from 'react';
import { formatReportForSharing, generateHTMLReport } from '../../lib/reportFormatter';
import styles from './ShareReport.module.css';
import { useI18n } from "@/i18n/I18nProvider";

export default function ShareReport({ report, text, reportId }) {
  const { t } = useI18n();

  const [isOpen, setIsOpen] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState('');
  
  const shareText = formatReportForSharing(report);
  
  const handleWhatsAppShare = () => {
    const encodedText = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank', 'noopener,noreferrer');
  };
  
  const handleEmailShare = () => {
    const subject = encodeURIComponent('Post Analysis Report');
    const body = encodeURIComponent(shareText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };
  
  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedMessage('Report copied successfully');
      setTimeout(() => setCopiedMessage(''), 2000);
    } catch (error) {
      setCopiedMessage('Failed to copy report');
      setTimeout(() => setCopiedMessage(''), 2000);
    }
  };
  
  const handleCopyLink = async () => {
    if (!reportId) return;
    
    try {
      const link = `${window.location.origin}/post-analyzer/report/${reportId}`;
      await navigator.clipboard.writeText(link);
      setCopiedMessage('Report link copied successfully');
      setTimeout(() => setCopiedMessage(''), 2000);
    } catch (error) {
      setCopiedMessage('Failed to copy link');
      setTimeout(() => setCopiedMessage(''), 2000);
    }
  };
  
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Post Analysis Report',
          text: shareText,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    }
  };
  
  const handleDownload = () => {
    const htmlReport = generateHTMLReport(report, text);
    const blob = new Blob([htmlReport], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'post-analysis-report.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className={styles.container}>
      <button 
        className={styles.shareButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t("Share report")}
      >{t("📤 Share Report")}</button>
      
      {isOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{t("Share Report")}</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className={styles.closeButton}
                aria-label={t("Close share modal")}
              >
                ✕
              </button>
            </div>
            
            <div className={styles.shareOptions}>
              <button onClick={handleWhatsAppShare} className={styles.shareOption}>
                <span className={styles.shareIcon}>💬</span>
                <span>{t("WhatsApp")}</span>
              </button>
              
              <button onClick={handleEmailShare} className={styles.shareOption}>
                <span className={styles.shareIcon}>📧</span>
                <span>{t("Email")}</span>
              </button>
              
              <button onClick={handleCopyReport} className={styles.shareOption}>
                <span className={styles.shareIcon}>📋</span>
                <span>{t("Copy Report")}</span>
              </button>
              
              {reportId && (
                <button onClick={handleCopyLink} className={styles.shareOption}>
                  <span className={styles.shareIcon}>🔗</span>
                  <span>{t("Copy Report Link")}</span>
                </button>
              )}
              
              {typeof navigator !== 'undefined' && navigator.share && (
                <button onClick={handleNativeShare} className={styles.shareOption}>
                  <span className={styles.shareIcon}>📱</span>
                  <span>{t("Native Share")}</span>
                </button>
              )}
              
              <button onClick={handleDownload} className={styles.shareOption}>
                <span className={styles.shareIcon}>💾</span>
                <span>{t("Download Report")}</span>
              </button>
            </div>
            
            {copiedMessage && (
              <div className={styles.copiedMessage}>
                {copiedMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
