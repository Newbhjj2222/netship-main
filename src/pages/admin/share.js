import React, { useEffect, useState } from "react";
import styles from "../../styles/share.module.css";
import { db } from "../../components/firebase";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import Cookies from "js-cookie";
import { useRouter } from "next/router";

import {
  FaCopy,
  FaBook,
  FaTv,
  FaFilm,
  FaUsers,
  FaSpinner,
  FaShareAlt,
} from "react-icons/fa";

import LinkComponent from "../../components/Links";
import { useI18n } from "@/i18n/I18nProvider";

/* =========================================================
   GET USER FROM COOKIE
========================================================= */
function getUserFromCookie(cookieString) {
  const cookies = cookieString || "";

  const userCookie = cookies
    .split(";")
    .find((c) =>
      c.trim().startsWith("user=")
    );

  if (!userCookie) return null;

  try {
    const cookieValue =
      userCookie.split("=")[1];

    return JSON.parse(
      decodeURIComponent(cookieValue)
    );
  } catch {
    return null;
  }
}

/* =========================================================
   USERNAME SANITIZER
========================================================= */
const sanitizeUsername = (value = "") => {
  try {
    let name = decodeURIComponent(value);

    name = name
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return name;
  } catch {
    return String(value)
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
};

/* =========================================================
   STORY TITLE NORMALIZER
========================================================= */
function getStoryTitle(head = "") {
  let title = String(head || "").trim();

  title = title.replace(
    /\s*(?:S\d+|Season\s*\d+)?\s*(?:EP|Episode)?\s*\d+$/i,
    ""
  );

  title = title.replace(
    /\s*(?:EP|Episode)\s*(?:Final|Finale|Finally)$/i,
    ""
  );

  title = title.replace(
    /\s*(?:Final|Finale|Finally)$/i,
    ""
  );

  title = title.replace(
    /\s*\([^)]*\)$/,
    ""
  );

  return title.trim();
}

/* =========================================================
   EXTRACT SEASON & EPISODE
========================================================= */
function extractSeasonEpisode(head = "") {
  if (!head) {
    return {
      season: 1,
      episode: 1,
    };
  }

  const cleanedHead = String(head)
    .replace(/[\/\-_:.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const isFinal =
    /(FINAL(LY)?(\s*EPISODE)?|EPISODE\s*FINAL(LY)?)/i.test(
      cleanedHead
    );

  const seasonMatch =
    cleanedHead.match(
      /SEASON\s*0*(\d+)|S\s*0*(\d+)/i
    );

  let season = seasonMatch
    ? parseInt(
        seasonMatch[1] ||
          seasonMatch[2],
        10
      )
    : 1;

  const episodeMatch =
    cleanedHead.match(
      /EPISODE\s*0*(\d+)|EP\s*0*(\d+)|E\s*0*(\d+)/i
    );

  let episode = episodeMatch
    ? parseInt(
        episodeMatch[1] ||
          episodeMatch[2] ||
          episodeMatch[3],
        10
      )
    : null;

  if (isFinal) {
    episode = 999;
  }

  if (
    episode === null ||
    isNaN(episode)
  ) {
    episode = 1;
  }

  if (
    !season ||
    isNaN(season)
  ) {
    season = 1;
  }

  return {
    season,
    episode,
  };
}

/* =========================================================
   DECODE HTML ENTITIES
========================================================= */
function decodeHtmlEntities(text = "") {
  return String(text)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#47;/gi, "/")
    .replace(/&apos;/gi, "'")
    .replace(/&ldquo;/gi, '"')
    .replace(/&rdquo;/gi, '"')
    .replace(/&lsquo;/gi, "'")
    .replace(/&rsquo;/gi, "'");
}

/* =========================================================
   REMOVE ALL HTML
========================================================= */
function stripHtml(html = "") {
  let text = String(html);

  /*
   * Remove script/style contents
   */
  text = text.replace(
    /<(script|style)[^>]*>[\s\S]*?<\/\1>/gi,
    " "
  );

  /*
   * Convert line-break type tags into spaces
   */
  text = text.replace(
    /<br\s*\/?>/gi,
    " "
  );

  text = text.replace(
    /<\/p>/gi,
    " "
  );

  text = text.replace(
    /<\/div>/gi,
    " "
  );

  text = text.replace(
    /<\/h[1-6]>/gi,
    " "
  );

  text = text.replace(
    /<\/li>/gi,
    " "
  );

  /*
   * Remove every remaining HTML tag
   */
  text = text.replace(
    /<[^>]*>/g,
    " "
  );

  /*
   * Decode entities
   */
  text = decodeHtmlEntities(text);

  /*
   * Remove invisible/control characters
   */
  text = text.replace(
    /[\u0000-\u001F\u007F]/g,
    " "
  );

  /*
   * Normalize whitespace
   */
  text = text
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

/* =========================================================
   EPISODE PREVIEW
   ONLY USED WHEN THERE IS NO SUMMARY
========================================================= */
function getEpisodePreview(
  story = "",
  maxLength = 1400
) {
  const cleanStory =
    stripHtml(story);

  if (
    cleanStory.length <= maxLength
  ) {
    return cleanStory;
  }

  return (
    cleanStory
      .slice(0, maxLength)
      .trim() + "..."
  );
}

/* =========================================================
   GET SUMMARY FOR STORY
=========================================================

   PRIORITY:

   1. Summary from:
      posts/{episode1Id}/summaries

   2. If summary doesn't exist:
      Episode 1 story

   3. Episode 1 fallback is limited
      to 1400 characters.

   IMPORTANT:
   Existing summary is NOT limited to 1400.
========================================================= */
async function getStoryShareText(
  story
) {
  if (
    !story ||
    !story.episodes ||
    story.episodes.length === 0
  ) {
    return {
      text: "",
      hasSummary: false,
    };
  }

  /*
   * Find real Episode 1
   */
  const episode1 =
    story.episodes.find(
      (episode) =>
        Number(episode.season) === 1 &&
        Number(episode.episode) === 1
    ) ||
    story.episodes[0];

  if (!episode1?.id) {
    return {
      text: getEpisodePreview(
        episode1?.story || "",
        1400
      ),
      hasSummary: false,
    };
  }

  /*
   * Try to get existing summary
   */
  try {
    const summaryRef =
      collection(
        db,
        "posts",
        episode1.id,
        "summaries"
      );

    const summarySnap =
      await getDocs(summaryRef);

    if (!summarySnap.empty) {
      /*
       * Use the first summary document
       */
      const summaryData =
        summarySnap.docs[0].data();

      const summary =
        summaryData?.summary || "";

      const cleanSummary =
        stripHtml(summary);

      /*
       * If summary actually contains text,
       * use the WHOLE summary.
       */
      if (
        cleanSummary.trim().length > 0
      ) {
        return {
          text: cleanSummary,
          hasSummary: true,
        };
      }
    }
  } catch (error) {
    console.error(
      "Error loading story summary:",
      error
    );
  }

  /*
   * No summary:
   * use Episode 1, maximum 1400 chars.
   */
  return {
    text: getEpisodePreview(
      episode1.story || "",
      1400
    ),
    hasSummary: false,
  };
}

/* =========================================================
   COMPONENT
========================================================= */
export default function SharePage({
  username,
  groupedStories = [],
}) {
  const { t } = useI18n();

  const router = useRouter();

  const [message, setMessage] =
    useState("");

  const [
    messageVisible,
    setMessageVisible,
  ] = useState(false);

  const [loading, setLoading] =
    useState(null);

  /* =======================================================
     CHECK SESSION
  ======================================================= */
  useEffect(() => {
    const userCookie =
      Cookies.get("user");

    if (!userCookie) {
      router.replace("/login");
    }
  }, [router]);

  /* =======================================================
     COPY STORY LINK
  ======================================================= */
  const handleCopyLink = async (
    story
  ) => {
    if (!story?.title) return;

    setLoading(story.title);

    try {
      /*
       * Get summary or Episode 1 fallback
       */
      const {
        text: shareText,
        hasSummary,
      } =
        await getStoryShareText(
          story
        );

      /*
       * Story URL
       */
      const shareLink =
        `https://www.newtalentsg.co.rw/story/` +
        `${encodeURIComponent(
          story.title
        )}`;

      /*
       * Final share text
       */
      const textToCopy =
        `${story.title}\n\n` +
        `📖 ${shareText || "Soma iyi nkuru yose"}\n\n` +
        `🔗 Soma iyi nkuru yose: ${shareLink}`;

      let copied = false;

      /* =================================================
         TRY CLIPBOARD API
      ================================================= */
      try {
        await navigator.clipboard.writeText(
          textToCopy
        );

        copied = true;
      } catch {
        /* ===============================================
           FALLBACK COPY METHOD
        =============================================== */
        try {
          const textarea =
            document.createElement(
              "textarea"
            );

          textarea.value =
            textToCopy;

          textarea.style.position =
            "fixed";

          textarea.style.left =
            "-9999px";

          document.body.appendChild(
            textarea
          );

          textarea.focus();
          textarea.select();

          document.execCommand(
            "copy"
          );

          textarea.remove();

          copied = true;
        } catch {
          copied = false;
        }
      }

      /* =================================================
         MESSAGE
      ================================================= */
      if (copied) {
        setMessage(
          t("✅ Link copied successfully! {textToCopy}", { textToCopy })
        );
      } else {
        setMessage(
          t("❌ Failed to copy link. {textToCopy}", { textToCopy })
        );
      }

      setMessageVisible(true);

      setTimeout(() => {
        setMessageVisible(false);
      }, 6000);
    } catch (error) {
      console.error(
        "Share error:",
        error
      );

      setMessage(
        t("❌ Habaye ikibazo mu gutegura inkuru yo gusangiza.")
      );

      setMessageVisible(true);

      setTimeout(() => {
        setMessageVisible(false);
      }, 6000);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <LinkComponent />

      <div
        className={styles.pageWrap}
      >
        {/* =================================================
            COPY MESSAGE
        ================================================= */}
        {messageVisible && (
          <div
            className={styles.topMessage}
            role="status"
            aria-live="polite"
          >
            <pre
              className={
                styles.messagePre
              }
            >
              {message}
            </pre>
          </div>
        )}

        <main
          className={styles.container}
        >
          {/* =================================================
              HEADER
          ================================================= */}
          <div
            className={
              styles.headerRow
            }
          >
            <div
              className={
                styles.headerLeft
              }
            >
              <FaShareAlt
                className={
                  styles.headerIcon
                }
              />

              <div>
                <h1
                  className={
                    styles.title
                  }
                >{t("📚 All Stories")}</h1>

                <p
                  className={
                    styles.subtitle
                  }
                >
                  <FaUsers
                    className={
                      styles.subtitleIcon
                    }
                  />{" "}
                  {username}
                </p>
              </div>
            </div>

            <div
              className={
                styles.totalCard
              }
            >
              <div
                className={
                  styles.totalLabel
                }
              >{t("Total Stories")}</div>

              <div
                className={
                  styles.totalNumber
                }
              >
                {groupedStories.length}
              </div>
            </div>
          </div>

          {/* =================================================
              EMPTY STATE
          ================================================= */}
          {groupedStories.length ===
          0 ? (
            <div
              className={
                styles.emptyState
              }
            >
              <FaBook
                className={
                  styles.emptyIcon
                }
              />

              <h3>{t("📭 Nta Nkuru")}</h3>

              <p>{t("Nta nkuru iboneka.")}{" "}
                <span
                  className={
                    styles.emptyHint
                  }
                >{t("Andika inkuru zawe mbere yo kuzasangiza.")}</span>
              </p>
            </div>
          ) : (
            /* =================================================
               STORIES
            ================================================= */
            <ul
              className={
                styles.list
              }
            >
              {groupedStories.map(
                (story) => (
                  <li
                    key={
                      story.title
                    }
                    className={
                      styles.item
                    }
                  >
                    <div
                      className={
                        styles.postInfo
                      }
                    >
                      <h3
                        className={
                          styles.postHead
                        }
                      >
                        {story.title}
                      </h3>

                      <div
                        className={
                          styles.metaRow
                        }
                      >
                        <span
                          className={
                            styles.metaBadge
                          }
                        >
                          <FaTv />{" "}{t("Seasons:")}{" "}
                          {
                            story.totalSeasons
                          }
                        </span>

                        <span
                          className={
                            styles.metaBadge
                          }
                        >
                          <FaFilm />{" "}{t("Episodes:")}{" "}
                          {
                            story.totalEpisodes
                          }
                        </span>
                      </div>

                      {/* =================================================
                          PREVIEW ONLY
                          This is NOT what limits the share.
                          It is only visual preview on this page.
                      ================================================= */}
                      <p
                        className={
                          styles.postSummary
                        }
                      >
                        {story.storySummary
                          ? story
                              .storySummary
                              .length >
                            150
                            ? story.storySummary.slice(
                                0,
                                150
                              ) + "..."
                            : story.storySummary
                          : t("Soma iyi nkuru yose")}
                      </p>
                    </div>

                    <div
                      className={
                        styles.actions
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyLink(
                            story
                          )
                        }
                        disabled={
                          loading ===
                          story.title
                        }
                        className={
                          styles.shareBtn
                        }
                        aria-label={t("Copy share link for {title}", { title: story.title })}
                      >
                        {loading ===
                        story.title ? (
                          <FaSpinner
                            className={
                              styles.spinner
                            }
                          />
                        ) : (
                          <FaCopy />
                        )}

                        <span>{t("Copy Link")}</span>
                      </button>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}

          {/* =================================================
              FOOTER
          ================================================= */}
          <div
            className={
              styles.footer
            }
          >
            <p>{t("📊 Total Stories:")}{" "}
              {
                groupedStories.length
              }
            </p>

            <p>{t("🔗 Kopira link kugira ngo usangize inkuru n'abandi!")}</p>
          </div>
        </main>
      </div>
    </>
  );
}

/* =========================================================
   SERVER SIDE PROPS
========================================================= */
export async function getServerSideProps(
  context
) {
  const { req } = context;

  /* =======================================================
     CHECK USER
  ======================================================= */
  const userData =
    getUserFromCookie(
      req.headers.cookie || ""
    );

  if (!userData) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const username =
    sanitizeUsername(
      userData.username
    );

  if (!username) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  try {
    /* =====================================================
       GET ALL POSTS
    ===================================================== */
    const postsRef =
      collection(db, "posts");

    const snap =
      await getDocs(postsRef);

    const grouped = {};

    /* =====================================================
       GROUP EPISODES BY STORY TITLE
    ===================================================== */
    snap.docs.forEach(
      (docu) => {
        const d =
          docu.data();

        const head =
          d.head ||
          d.title ||
          "Untitled";

        const title =
          getStoryTitle(head);

        const {
          season,
          episode,
        } =
          extractSeasonEpisode(
            head
          );

        if (!grouped[title]) {
          grouped[title] = {
            title,
            episodes: [],
            seasons:
              new Set(),
            totalEpisodes: 0,
            totalSeasons: 0,
            head,
          };
        }

        grouped[
          title
        ].episodes.push({
          id: docu.id,

          head,

          story:
            d.story || "",

          season,

          episode,

          createdAt:
            d.createdAt ||
            d.date ||
            null,

          author:
            d.author ||
            "Unknown",
        });

        grouped[
          title
        ].seasons.add(
          season
        );
      }
    );

    /* =====================================================
       PREPARE STORIES
    ===================================================== */
    const groupedStories =
      Object.values(
        grouped
      ).map((story) => {
        /*
         * Sort episodes.
         */
        story.episodes.sort(
          (a, b) => {
            if (
              a.season !==
              b.season
            ) {
              return (
                a.season -
                b.season
              );
            }

            return (
              a.episode -
              b.episode
            );
          }
        );

        /*
         * Find Episode 1.
         */
        const episode1 =
          story.episodes.find(
            (ep) =>
              Number(
                ep.season
              ) === 1 &&
              Number(
                ep.episode
              ) === 1
          ) ||
          story.episodes[0];

        /*
         * storySummary will be loaded
         * on click from summaries.
         *
         * We don't put the whole summary
         * into page props because summaries
         * can be very long.
         */
        const fallbackPreview =
          getEpisodePreview(
            episode1?.story ||
              "",
            1400
          );

        const author =
          story.episodes[0]
            ?.author ||
          "Unknown";

        return {
          title:
            story.title,

          /*
           * This is only a preview.
           * The actual share text is
           * loaded by handleCopyLink().
           */
          storySummary:
            fallbackPreview,

          episodes:
            story.episodes,

          totalEpisodes:
            story.episodes.length,

          totalSeasons:
            story.seasons.size,

          head:
            story.head,

          author,
        };
      });

    /* =====================================================
       SORT STORIES BY DATE
    ===================================================== */
    groupedStories.sort(
      (a, b) => {
        const aDate =
          a.episodes[0]
            ?.createdAt || 0;

        const bDate =
          b.episodes[0]
            ?.createdAt || 0;

        return (
          new Date(bDate) -
          new Date(aDate)
        );
      }
    );

    return {
      props: {
        username,
        groupedStories,
      },
    };
  } catch (error) {
    console.error(
      "Error fetching stories:",
      error
    );

    return {
      props: {
        username,
        groupedStories: [],
      },
    };
  }
}
