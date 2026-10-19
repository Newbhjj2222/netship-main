import styles from "./ChatBot.module.css";

export default function TypingIndicator() {
  return (
    <div className={`${styles.message} ${styles.botMessage}`}>
      <div className={styles.bubble}>
        <div className={styles.typing}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
}
