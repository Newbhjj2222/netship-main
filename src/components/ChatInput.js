import { useState } from "react";
import { FaPaperPlane, FaUser } from "react-icons/fa";
import styles from "./ChatBot.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function ChatInput({
  placeholder = "Andika ubutumwa...",
  onSend,
  username = "Guest",
}) {
  const { t } = useI18n();

  const [message, setMessage] = useState("");

  const send = () => {
    const text = message.trim();
    if (!text) return;
    onSend(text);
    setMessage("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className={styles.inputWrapper}>
      <div className={styles.inputUserInfo}>
        <FaUser size={12} className={styles.inputUserIcon} />
        <span className={styles.inputUserName}>
          {username !== "Guest" ? username : t("Guest")}
        </span>
      </div>
      <div className={styles.inputContainer}>
        <textarea
          className={styles.input}
          placeholder={placeholder}
          value={message}
          rows={2}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className={styles.sendButton}
          onClick={send}
          disabled={!message.trim()}
        >
          <FaPaperPlane size={18} />
        </button>
      </div>
    </div>
  );
}
