import { useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";

import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import { db, auth } from "./firebase";
import styles from "../styles/CommunityChat.module.css";
import { useI18n } from "@/i18n/I18nProvider";

const MAX_MESSAGES = 100;
const MAX_TEXT_LENGTH = 500;

const EMOJIS = [
  "😀",
  "😂",
  "😍",
  "❤️",
  "🔥",
  "👏",
  "🙏",
  "😢",
  "😮",
  "😎",
  "🤣",
  "🥰",
];

export default function CommunityChat() {
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const [username, setUsername] = useState("");
  const [uid, setUid] = useState("");
  const [photoURL, setPhotoURL] = useState("");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sending, setSending] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);

  // Online users
  const [onlineUsers, setOnlineUsers] = useState([]);

  const onlineCount = onlineUsers.length;

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const openRef = useRef(false);
  const lastReadAtRef = useRef(0);

  // --------------------------------------------------
  // Keep openRef synchronized
  // --------------------------------------------------

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // --------------------------------------------------
  // Display username
  // --------------------------------------------------

  const displayUsername =
    username ||
    auth.currentUser?.displayName ||
    auth.currentUser?.email?.split("@")[0] ||
    "User";

  // --------------------------------------------------
  // 1. Load user from cookie + last read
  // --------------------------------------------------

  useEffect(() => {
    try {
      const savedUser = Cookies.get("user");

      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);

        setUsername(
          parsedUser?.username ||
            parsedUser?.fName ||
            parsedUser?.displayName ||
            "User"
        );

        setUid(parsedUser?.uid || "");
        setPhotoURL(parsedUser?.photoURL || "");
      }
    } catch (error) {
      console.error("Error reading user cookie:", error);
    }

    try {
      const savedReadTime = localStorage.getItem(
        "community_last_read"
      );

      if (savedReadTime) {
        const time = Number(savedReadTime);

        if (Number.isFinite(time)) {
          lastReadAtRef.current = time;
        }
      }
    } catch (error) {
      console.error(
        "Error reading community read state:",
        error
      );
    }
  }, []);

  // --------------------------------------------------
  // 2. Firebase authentication
  // --------------------------------------------------

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          setIsAuthenticated(true);

          setUid(user.uid);

          if (user.photoURL) {
            setPhotoURL(user.photoURL);
          }

          setUsername((current) => {
            if (current) return current;

            return (
              user.displayName ||
              user.email?.split("@")[0] ||
              "User"
            );
          });
        } else {
          setIsAuthenticated(false);
          setUid("");
          setPhotoURL("");
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // --------------------------------------------------
  // 3. Presence / Online users
  // --------------------------------------------------

  useEffect(() => {
    if (!isAuthenticated || !uid) {
      return;
    }

    const presenceRef = doc(db, "presence", uid);

    const presenceData = {
      uid,
      username: displayUsername,
      photoURL: photoURL || "",
      online: true,
      lastSeen: serverTimestamp(),
    };

    // Create/update current user's presence
    setDoc(presenceRef, presenceData, {
      merge: true,
    }).catch((error) => {
      console.error(
        "Error creating presence:",
        error
      );
    });

    // Update lastSeen every 30 seconds
    const interval = setInterval(() => {
      updateDoc(presenceRef, {
        online: true,
        lastSeen: serverTimestamp(),
      }).catch(() => {});
    }, 30000);

    return () => {
      clearInterval(interval);

      // Mark offline when leaving component
      updateDoc(presenceRef, {
        online: false,
        lastSeen: serverTimestamp(),
      }).catch(() => {});
    };
  }, [
    isAuthenticated,
    uid,
    displayUsername,
    photoURL,
  ]);

  // --------------------------------------------------
  // Listen to presence collection
  // --------------------------------------------------

  useEffect(() => {
    const presenceRef = collection(
      db,
      "presence"
    );

    const unsubscribe = onSnapshot(
      presenceRef,
      (snapshot) => {
        const now = Date.now();

        const users = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();

          if (!data.online) {
            return;
          }

          let recent = true;

          if (data.lastSeen) {
            try {
              const lastSeen =
                data.lastSeen.toDate().getTime();

              recent =
                now - lastSeen <
                5 * 60 * 1000;
            } catch {
              recent = true;
            }
          }

          if (recent) {
            users.push({
              uid: data.uid || docSnap.id,
              username:
                data.username || "User",
              photoURL:
                data.photoURL || "",
            });
          }
        });

        setOnlineUsers(users);
      },
      (error) => {
        console.error(
          "Presence listener error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, []);

  // --------------------------------------------------
  // 4. Realtime messages
  // --------------------------------------------------

  useEffect(() => {
    const messagesRef = collection(
      db,
      "communityMessages"
    );

    const messagesQuery = query(
      messagesRef,
      orderBy("createdAt", "desc"),
      limit(MAX_MESSAGES)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const data = snapshot.docs.map(
          (docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })
        );

        // Firestore returns newest first.
        // Reverse for normal chat order.
        const orderedMessages =
          data.reverse();

        setMessages(orderedMessages);

        // ------------------------------------------
        // Unread count
        // ------------------------------------------

        if (!openRef.current) {
          const unread =
            orderedMessages.filter((message) => {
              if (!message.createdAt) {
                return false;
              }

              try {
                const messageTime =
                  message.createdAt
                    .toDate()
                    .getTime();

                return (
                  messageTime >
                  lastReadAtRef.current
                );
              } catch {
                return false;
              }
            }).length;

          setUnreadCount(unread);
        }

        // ------------------------------------------
        // Read receipts while chat is open
        // ------------------------------------------

        if (
          openRef.current &&
          isAuthenticated &&
          uid
        ) {
          const unreadMessages =
            orderedMessages.filter((message) => {
              if (!message.id) {
                return false;
              }

              if (!message.createdAt) {
                return false;
              }

              const readBy =
                Array.isArray(message.readBy)
                  ? message.readBy
                  : [];

              return !readBy.some(
                (reader) =>
                  reader?.uid === uid
              );
            });

          if (unreadMessages.length > 0) {
            const batch = writeBatch(db);

            unreadMessages.forEach(
              (message) => {
                const messageRef = doc(
                  db,
                  "communityMessages",
                  message.id
                );

                batch.update(messageRef, {
                  readBy: arrayUnion({
                    uid,
                    username:
                      displayUsername,
                  }),
                });
              }
            );

            batch.commit().catch((error) => {
              console.error(
                "Read receipt error:",
                error
              );
            });
          }
        }
      },
      (error) => {
        console.error(
          "Community messages error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, [
    isAuthenticated,
    uid,
    displayUsername,
  ]);

  // --------------------------------------------------
  // 5. Scroll to bottom
  // --------------------------------------------------

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 80);

    return () => clearTimeout(timer);
  }, [open, messages.length]);

  // --------------------------------------------------
  // 6. Open chat
  // --------------------------------------------------

  const openChat = () => {
    setOpen(true);

    const now = Date.now();

    lastReadAtRef.current = now;

    setUnreadCount(0);

    try {
      localStorage.setItem(
        "community_last_read",
        String(now)
      );
    } catch (error) {
      console.error(
        "Error saving read state:",
        error
      );
    }

    // Mark currently loaded messages as read
    if (
      isAuthenticated &&
      uid &&
      messages.length > 0
    ) {
      const batch = writeBatch(db);

      let updated = 0;

      messages.forEach((message) => {
        const readBy = Array.isArray(
          message.readBy
        )
          ? message.readBy
          : [];

        const alreadyRead = readBy.some(
          (reader) => reader?.uid === uid
        );

        if (
          message.id &&
          !alreadyRead
        ) {
          const messageRef = doc(
            db,
            "communityMessages",
            message.id
          );

          batch.update(messageRef, {
            readBy: arrayUnion({
              uid,
              username: displayUsername,
            }),
          });

          updated++;
        }
      });

      if (updated > 0) {
        batch.commit().catch((error) => {
          console.error(
            "Mark messages read error:",
            error
          );
        });
      }
    }

    setTimeout(() => {
      inputRef.current?.focus();
    }, 250);
  };

  // --------------------------------------------------
  // Close chat
  // --------------------------------------------------

  const closeChat = () => {
    setOpen(false);
  };

  // --------------------------------------------------
  // 7. Emoji
  // --------------------------------------------------

  const addEmoji = (emoji) => {
    setText((previous) => {
      const next = previous + emoji;

      if (next.length > MAX_TEXT_LENGTH) {
        return next.slice(
          0,
          MAX_TEXT_LENGTH
        );
      }

      return next;
    });

    inputRef.current?.focus();
  };

  // --------------------------------------------------
  // 8. Send message
  // --------------------------------------------------

  const sendMessage = async () => {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    if (sending) {
      return;
    }

    if (
      !isAuthenticated ||
      !auth.currentUser
    ) {
      alert(
        t("Ugomba kubanza kwinjira muri konti yawe.")
      );
      return;
    }

    if (
      cleanText.length >
      MAX_TEXT_LENGTH
    ) {
      alert(
        t("Ubutumwa ntibugomba kurenza {MAX_TEXT_LENGTH} characters.", { MAX_TEXT_LENGTH })
      );
      return;
    }

    const currentUser =
      auth.currentUser;

    setSending(true);

    try {
      await addDoc(
        collection(
          db,
          "communityMessages"
        ),
        {
          uid: currentUser.uid,

          username:
            displayUsername,

          text: cleanText,

          photoURL:
            photoURL ||
            currentUser.photoURL ||
            "",

          type: "text",

          createdAt:
            serverTimestamp(),

          // Sender has already read own message
          readBy: [
            {
              uid: currentUser.uid,
              username:
                displayUsername,
            },
          ],
        }
      );

      setText("");

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView(
          {
            behavior: "smooth",
            block: "end",
          }
        );
      }, 100);
    } catch (error) {
      console.error(
        "Send message error:",
        error
      );

      alert(
        t("Ubutumwa ntibwashoboye koherezwa. Ongera ugerageze.")
      );
    } finally {
      setSending(false);
    }
  };

  // --------------------------------------------------
  // Enter / Shift + Enter
  // --------------------------------------------------

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  };

  // --------------------------------------------------
  // 9. Delete message
  // --------------------------------------------------

  const deleteMessage = async (
    message
  ) => {
    if (!auth.currentUser) {
      return;
    }

    if (
      message.uid !==
      auth.currentUser.uid
    ) {
      return;
    }

    const confirmed = window.confirm(
      t("Urashaka gusiba ubu butumwa?")
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          "communityMessages",
          message.id
        )
      );
    } catch (error) {
      console.error(
        "Delete message error:",
        error
      );

      alert(
        t("Ubutumwa ntibwashoboye gusibwa.")
      );
    }
  };

  // --------------------------------------------------
  // 10. Format time
  // --------------------------------------------------

  const formatTime = (timestamp) => {
    if (!timestamp) {
      return "";
    }

    try {
      return timestamp
        .toDate()
        .toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
    } catch {
      return "";
    }
  };

  // --------------------------------------------------
  // 11. Render URLs safely
  // --------------------------------------------------

  const renderMessageText = (
    messageText
  ) => {
    const urlRegex =
      /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

    const parts =
      messageText.split(urlRegex);

    return parts.map(
      (part, index) => {
        if (
          urlRegex.test(part)
        ) {
          const href =
            part.startsWith("http")
              ? part
              : `https://${part}`;

          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={
                styles.messageLink
              }
            >
              {part}
            </a>
          );
        }

        return (
          <span key={index}>
            {part}
          </span>
        );
      }
    );
  };

  // --------------------------------------------------
  // 12. Render
  // --------------------------------------------------

  return (
    <>
      {/* =========================================
          FLOATING BUTTON
          ========================================= */}

      {!open && (
        <button
          type="button"
          className={
            styles.floatingButton
          }
          onClick={openChat}
          aria-label={
            unreadCount > 0
              ? t("Community chat, {unreadCount} unread messages", { unreadCount })
              : t("Open community chat")
          }
        >
          <span
            className={
              styles.floatingIcon
            }
          >
            💬
          </span>

          <span
            className={
              styles.floatingText
            }
          >{t("Community")}</span>

          {unreadCount > 0 && (
            <span
              className={
                styles.unreadBadge
              }
              aria-label={t("{unreadCount} unread messages", { unreadCount })}
            >
              {unreadCount > 99
                ? "99+"
                : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* =========================================
          CHAT WINDOW
          ========================================= */}

      {open && (
        <section
          className={
            styles.chatWindow
          }
          aria-label={t("Community chat")}
        >
          {/* HEADER */}

          <header
            className={styles.header}
          >
            <div
              className={
                styles.headerInfo
              }
            >
              <div
                className={
                  styles.communityIcon
                }
              >
                💬
              </div>

              <div>
                <h2>{t("Community")}</h2>

                <span
                  className={
                    styles.onlineStatus
                  }
                >
                  <span
                    className={
                      styles.onlineDot
                    }
                  />

                  {onlineCount}{" "}
                  {onlineCount === 1
                    ? t("muri online")
                    : t("bari online")}
                </span>
              </div>
            </div>

            <button
              type="button"
              className={
                styles.closeButton
              }
              onClick={closeChat}
              aria-label={t("Close community")}
            >
              ×
            </button>
          </header>

          {/* USER BAR */}

          <div
            className={
              styles.userBar
            }
          >
            <div
              className={
                styles.userAvatar
              }
            >
              {photoURL ? (
                <img
                  src={photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : (
                displayUsername
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>

            <div
              className={
                styles.userInfo
              }
            >
              <span
                className={
                  styles.userLabel
                }
              >{t("Uri kuganira nka")}</span>

              <strong>
                {displayUsername}
              </strong>
            </div>

            {!isAuthenticated && (
              <span
                className={
                  styles.loginWarning
                }
              >{t("Login required")}</span>
            )}
          </div>

          {/* MESSAGES */}

          <div
            className={
              styles.messages
            }
          >
            {messages.length === 0 ? (
              <div
                className={
                  styles.emptyState
                }
              >
                <div
                  className={
                    styles.emptyIcon
                  }
                >
                  💬
                </div>

                <h3>{t("Nta butumwa burahari")}</h3>

                <p>{t("Tangiza ikiganiro n’abandi basomyi.")}</p>
              </div>
            ) : (
              messages.map(
                (message) => {
                  const isMine =
                    message.uid ===
                    auth.currentUser?.uid;

                  const readBy =
                    Array.isArray(
                      message.readBy
                    )
                      ? message.readBy
                      : [];

                  const readCount =
                    readBy.length;

                  return (
                    <div
                      key={message.id}
                      className={`${styles.messageRow} ${
                        isMine
                          ? styles.myMessageRow
                          : ""
                      }`}
                    >
                      {!isMine && (
                        <div
                          className={
                            styles.messageAvatar
                          }
                        >
                          {message.photoURL ? (
                            <img
                              src={
                                message.photoURL
                              }
                              alt=""
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            (
                              message.username ||
                              "U"
                            )
                              .charAt(0)
                              .toUpperCase()
                          )}
                        </div>
                      )}

                      <div
                        className={`${styles.messageContent} ${
                          isMine
                            ? styles.myMessageContent
                            : ""
                        }`}
                      >
                        <div
                          className={`${styles.messageBubble} ${
                            isMine
                              ? styles.myMessageBubble
                              : ""
                          }`}
                        >
                          {!isMine && (
                            <div
                              className={
                                styles.messageUsername
                              }
                            >
                              {message.username ||
                                t("User")}
                            </div>
                          )}

                          <div
                            className={
                              styles.messageText
                            }
                          >
                            {renderMessageText(
                              message.text ||
                                ""
                            )}
                          </div>

                          <div
                            className={
                              styles.messageMeta
                            }
                          >
                            <span>
                              {formatTime(
                                message.createdAt
                              )}
                            </span>

                            {isMine &&
                              readCount >
                                0 && (
                                <span
                                  className={
                                    styles.readReceipt
                                  }
                                  title={`Basomye: ${readBy
                                    .map(
                                      (reader) =>
                                        reader.username ||
                                        "User"
                                    )
                                    .join(
                                      ", "
                                    )}`}
                                >
                                  {readCount ===
                                  1
                                    ? "✓"
                                    : t("{readCount} basomye", { readCount })}
                                </span>
                              )}

                            {isMine && (
                              <button
                                type="button"
                                className={
                                  styles.deleteButton
                                }
                                onClick={() =>
                                  deleteMessage(
                                    message
                                  )
                                }
                                aria-label={t("Delete message")}
                                title={t("Siba ubutumwa")}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              )
            )}

            <div
              ref={
                messagesEndRef
              }
            />
          </div>

          {/* EMOJIS */}

          <div
            className={
              styles.emojiBar
            }
          >
            {EMOJIS.map(
              (emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={
                    styles.emojiButton
                  }
                  onClick={() =>
                    addEmoji(emoji)
                  }
                  aria-label={t("Add {emoji}", { emoji })}
                >
                  {emoji}
                </button>
              )
            )}
          </div>

          {/* INPUT */}

          <div
            className={
              styles.inputArea
            }
          >
            <div
              className={
                styles.inputWrapper
              }
            >
              <textarea
                ref={inputRef}
                value={text}
                onChange={(event) =>
                  setText(
                    event.target.value.slice(
                      0,
                      MAX_TEXT_LENGTH
                    )
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder={
                  isAuthenticated
                    ? t("Andika ubutumwa...")
                    : t("Injira muri konti kugira ngo wandike...")
                }
                maxLength={
                  MAX_TEXT_LENGTH
                }
                disabled={
                  !isAuthenticated ||
                  sending
                }
                rows={1}
              />

              <span
                className={
                  styles.characterCount
                }
              >
                {text.length}/
                {MAX_TEXT_LENGTH}
              </span>
            </div>

            <button
              type="button"
              className={
                styles.sendButton
              }
              onClick={
                sendMessage
              }
              disabled={
                !text.trim() ||
                sending ||
                !isAuthenticated
              }
              aria-label={t("Send message")}
            >
              {sending
                ? "…"
                : "➤"}
            </button>
          </div>

          {/* FOOTER */}

          <div
            className={
              styles.footerHint
            }
          >{t("Enter = kohereza • Shift + Enter = umurongo mushya")}</div>
        </section>
      )}
    </>
  );
}
