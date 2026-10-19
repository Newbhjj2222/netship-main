import { useState } from 'react';
import styles from './AnalyzerInput.module.css';
import { useI18n } from "@/i18n/I18nProvider";

export default function AnalyzerInput({ onAnalyze, isAnalyzing }) {
  const { t } = useI18n();

  const [text, setText] = useState('');
  const [error, setError] = useState('');
  
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  
  const handleAnalyze = () => {
    if (!text.trim()) {
      setError(t("Please enter some text to analyze"));
      return;
    }
    
    if (text.length < 10) {
      setError(t("Text is too short. Minimum 10 characters required."));
      return;
    }
    
    setError('');
    onAnalyze(text);
  };
  
  const handleClear = () => {
    setText('');
    setError('');
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.inputWrapper}>
        <label htmlFor="postInput" className={styles.label}>{t("Paste your post, story or article here...")}</label>
        <textarea
          id="postInput"
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("Paste your post, story or article here...")}
          rows={8}
          disabled={isAnalyzing}
          aria-label={t("Post content input")}
        />
        
        <div className={styles.counter}>
          <span>{t("Words: {wordCount}", { wordCount })}</span>
          <span>{t("Characters: {charCount}", { charCount })}</span>
        </div>
        
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
        
        <div className={styles.actions}>
          <button
            className={styles.clearButton}
            onClick={handleClear}
            disabled={isAnalyzing || !text}
            aria-label={t("Clear text")}
          >{t("Clear")}</button>
          <button
            className={styles.analyzeButton}
            onClick={handleAnalyze}
            disabled={isAnalyzing || !text.trim()}
            aria-label={t("Analyze post")}
          >
            {isAnalyzing ? t("Analyzing...") : t("Analyze Post")}
          </button>
        </div>
      </div>
    </div>
  );
}
