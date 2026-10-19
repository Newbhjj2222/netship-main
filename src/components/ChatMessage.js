import styles from "./ChatBot.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function ChatMessage({ 
  sender, 
  text, 
  time, 
  username,
  type,
  url,
  title,
  summary,
  matches 
}) {
  const { t } = useI18n();

  const isUser = sender === "user";

  return (
    <div
      className={`${styles.message} ${
        isUser ? styles.userMessage : styles.botMessage
      }`}
    >
      <div className={styles.bubble}>
        <div className={styles.senderInfo}>
          <span className={styles.senderAvatar}>
            {isUser 
              ? (username ? username.charAt(0).toUpperCase() : t("U"))
              : "🤖"
            }
          </span>
          <span className={styles.senderName}>
            {isUser ? (username || t("You")) : t("Net AI Assistant")}
          </span>
        </div>
        
        {/* Post badge if it's a post */}
        {type === "post" && (
          <div className={styles.postBadge}>
            <span className={styles.postIcon}>📰</span>
            <span className={styles.postLabel}>{t("Inkuru yabonetse")}</span>
          </div>
        )}
        
        {/* Multiple badge */}
        {type === "multiple" && (
          <div className={styles.postBadge}>
            <span className={styles.postIcon}>📚</span>
            <span className={styles.postLabel}>{t("Inkuru ifite episode nyinshi")}</span>
          </div>
        )}
        
        <div className={styles.messageText}>
          {renderMessageText(text)}
        </div>
        
        {/* Multiple results */}
        {matches && matches.length > 0 && (
          <div className={styles.matchesContainer}>
            {matches.map((match, index) => (
              <div key={index} className={styles.matchItem}>
                <span className={styles.matchNumber}>{index + 1}.</span>
                <a 
                  href={match.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.matchLink}
                >
                  {match.head || match.title || t("Inkuru")}
                </a>
              </div>
            ))}
          </div>
        )}
        
        {/* Single link button if it's a post */}
        {type === "post" && url && !matches && (
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.postLink}
          >
            <span className={styles.postLinkIcon}>🔗</span>{t("Soma inkuru yose")}<span className={styles.postLinkArrow}>→</span>
          </a>
        )}
        
        <span className={styles.time}>{time}</span>
      </div>
    </div>
  );
}

// Helper function to render message with links
function renderMessageText(text) {
  if (!text) return null;
  
  // Split by newlines
  const lines = text.split('\n');
  
  return lines.map((line, index) => {
    // Check if line contains a link pattern [text](url)
    const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
    
    if (linkMatch) {
      const before = line.substring(0, linkMatch.index);
      const after = line.substring(linkMatch.index + linkMatch[0].length);
      const linkText = linkMatch[1];
      const linkUrl = linkMatch[2];
      
      return (
        <span key={index}>
          {before}
          <a href={linkUrl} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
            {linkText}
          </a>
          {after}
          {index < lines.length - 1 && <br />}
        </span>
      );
    }
    
    // Check if line is a heading (starts with **)
    if (line.startsWith('**') && line.endsWith('**')) {
      return (
        <span key={index} className={styles.messageHeading}>
          {line.replace(/\*\*/g, '')}
          {index < lines.length - 1 && <br />}
        </span>
      );
    }
    
    return (
      <span key={index}>
        {line}
        {index < lines.length - 1 && <br />}
      </span>
    );
  });
}
