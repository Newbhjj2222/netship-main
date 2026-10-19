import { useState, useRef, useEffect } from "react";
import { FaRobot, FaTimes } from "react-icons/fa";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";
import { getUsername } from "../utils/getUserFromCookie";
import {
  getChatStorageKey,
  loadChatMessages,
  saveChatMessages,
  clearChatHistory,
  hasChatHistory,
} from "../utils/chatStorage";
import styles from "./ChatBot.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export default function ChatBot({
  title = "Net AI",
  placeholder = "Andika ikibazo...",
  className = "",
  maxHeight = "500px",
}) {
  const { t } = useI18n();

  const [isOpen, setIsOpen] = useState(false);
  const username = getUsername();
  const storageKey = getChatStorageKey();

  const loadMessages = () => {
    const saved = loadChatMessages();
    
    if (saved && saved.length > 0) {
      return saved;
    }
    
    const welcomeMessage = username !== "Guest" 
      ? `Murakaza neza ${username}! Ni iki nagufasha? niba ushaka ko nkushakira inkuru, andika #inkuru izina ryinkuru wifuza urugero: #inkuru natasha, #inkuru ubwenge bw'umupfapfa.` 
      : "Murakaza neza! Ni iki nagufasha?";
    
    return [
      {
        sender: "bot",
        text: welcomeMessage,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ];
  };

  const [messages, setMessages] = useState(loadMessages);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    saveChatMessages(messages);
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    setMessages(loadMessages());
  }, [username]);

  async function sendMessage(text) {
    if (!text.trim()) return;

    const userMessage = {
      sender: "user",
      text,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      // ===== CHECK IF IT'S A STORY COMMAND (#inkuru) =====
      const storyMatch = text.match(/^#inkuru\s+(.+)/i);
      
      let endpoint = "/api/chat";
      let body = {
        message: text,
        username: username,
      };

      // If it's a story command, use the story endpoint
      if (storyMatch) {
        const storyName = storyMatch[1].trim();
        endpoint = "/api/story";
        body = {
          storyName: storyName,
          username: username,
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      
      // Check if response contains post data
      if (data.type === "post") {
        const postMessage = {
          sender: "bot",
          text: data.reply,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "post",
          url: data.url,
          title: data.title,
          summary: data.summary,
          matches: data.matches || null
        };
        
        setMessages((prev) => [...prev, postMessage]);
      } else if (data.type === "multiple") {
        // Multiple results
        const postMessage = {
          sender: "bot",
          text: data.reply,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "multiple",
          matches: data.matches || []
        };
        
        setMessages((prev) => [...prev, postMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: data.reply || "Ubutumwa bwakiriwe!",
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Habaye ikibazo kuri server. Ongera ugerageze.",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }

    setLoading(false);
  }

  const handleClearChat = () => {
    if (window.confirm(t("Urashaka gukuraho amateka ya chat yawe yose?"))) {
      clearChatHistory();
      
      const welcomeMessage = username !== "Guest" 
        ? `Murakaza neza ${username}! Ni iki nagufasha? niba ushaka ko nkushakira inkuru, andika #inkuru izina ryinkuru wifuza. urugero: #inkuru Natasha, #inkuru ubwenge bw'umupfapfa` 
        : "Murakaza neza! Ni iki nagufasha?";
      
      setMessages([
        {
          sender: "bot",
          text: welcomeMessage,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }
  };

  const handleExportChat = () => {
    const data = loadChatMessages();
    if (!data || data.length === 0) {
      alert(t("Nta mateka ya chat yo gukoporora."));
      return;
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: "application/json" 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat_history_${username}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportChat = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (Array.isArray(data) && data.length > 0) {
            setMessages(data);
            saveChatMessages(data);
            alert(t("Amateka ya chat yinjijwe neza!"));
          } else {
            alert(t("Dosiye itari nziza cyangwa nta mateka."));
          }
        } catch (error) {
          console.error("Import error:", error);
          alert(t("Habaye ikibazo mu kwinjiza dosiye."));
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  };

  return (
    <>
      <button
        className={`${styles.floatingButton} ${isOpen ? styles.hidden : ""}`}
        onClick={() => setIsOpen(true)}
        aria-label={t("Open Chat")}
      >
        <FaRobot size={28} />
        {username !== "Guest" && (
          <span className={styles.buttonBadge}>
            {username.charAt(0).toUpperCase()}
          </span>
        )}
        {hasChatHistory() && (
          <span className={styles.historyBadge}>●</span>
        )}
      </button>

      {isOpen && (
        <div className={`${styles.chatbot} ${className}`}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <FaRobot size={20} className={styles.headerIcon} />
              <h3>{title}</h3>
            </div>
            <div className={styles.headerRight}>
              <span className={styles.userBadge}>
                <span className={styles.userAvatar}>
                  {username !== "Guest" ? username.charAt(0).toUpperCase() : "👤"}
                </span>
                {username !== "Guest" ? username : t("Guest")}
              </span>
              
              <button
                className={styles.actionButton}
                onClick={handleImportChat}
                aria-label={t("Import Chat History")}
                title={t("Kwinjiza amateka ya chat")}
              >
                📥
              </button>
              
              <button
                className={styles.actionButton}
                onClick={handleExportChat}
                aria-label={t("Export Chat History")}
                title={t("Gukoporora amateka ya chat")}
              >
                📤
              </button>
              
              <button
                className={styles.clearButton}
                onClick={handleClearChat}
                aria-label={t("Clear Chat History")}
                title={t("Kuraho amateka ya chat")}
              >
                🗑️
              </button>
              
              <button
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
                aria-label={t("Close Chat")}
              >
                <FaTimes size={20} />
              </button>
            </div>
          </div>

          <div className={styles.messages} style={{ maxHeight }}>
            {messages.map((msg, index) => (
              <ChatMessage
                key={index}
                sender={msg.sender}
                text={msg.text}
                time={msg.time}
                username={username}
                type={msg.type}
                url={msg.url}
                title={msg.title}
                summary={msg.summary}
                matches={msg.matches}
              />
            ))}

            {loading && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            placeholder={placeholder}
            onSend={sendMessage}
            username={username}
          />
        </div>
      )}
    </>
  );
}
