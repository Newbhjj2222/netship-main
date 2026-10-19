import React, { useEffect, useState } from "react";
import styles from "../../styles/share.module.css";
import { db } from "../../components/firebase";

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  increment,
  setDoc,
  getDoc,
} from "firebase/firestore";

import Cookies from "js-cookie";
import { useRouter } from "next/router";

import {
  FaShare,
  FaCopy,
  FaBook,
  FaTv,
  FaFilm,
  FaUsers,
  FaSpinner,
  FaLink,
} from "react-icons/fa";

import LinkComponent from "../../components/Link";
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

  if (!userCookie) {
    return null;
  }

  try {
    const cookieValue =
      userCookie.split("=")[1];

    const userData = JSON.parse(
      decodeURIComponent(cookieValue)
    );

    return userData;
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

  /*
   * Remove:
   * S01 EP01
   * S1 EP 1
   * Season 1 Episode 1
   * EP01
   * Episode 1
   */
  title = title.replace(
    /\s*(?:S\d+|Season\s*\d+)?\s*(?:EP|Episode)?\s*\d+$/i,
    ""
  );

  /*
   * Remove:
   * EP Final
   * Episode Finale
   * EP Finally
   */
  title = title.replace(
    /\s*(?:EP|Episode)\s*(?:Final|Finale|Finally)$/i,
    ""
  );

  /*
   * Remove:
   * Final
   * Finale
   * Finally
   */
  title = title.replace(
    /\s*(?:Final|Finale|Finally)$/i,
    ""
  );

  /*
   * Remove ending parentheses
   */
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
   REMOVE HTML TAGS
========================================================= */
function stripHtml(html = "") {
  let text = String(html);

  /*
   * Remove script/style and their contents
   */
  text = text.replace(
    /<(script|style)[^>]*>[\s\S]*?<\/\1>/gi,
    " "
  );

  /*
   * Convert line-break tags into spaces
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
   * Remove all remaining HTML tags
   */
  text = text.replace(
    /<[^>]*>/g,
    " "
  );

  /*
   * Decode HTML entities
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
   * Normalize spaces
   */
  text = text
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

/* =========================================================
   EPISODE 1 FALLBACK
   MAXIMUM 1400 CHARACTERS
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
   GET REAL SHARE TEXT
=========================================================

   PRIORITY:

   1. Existing summary:
      posts/{episode1Id}/summaries

      => SEND WHOLE SUMMARY

   2. No summary:

      => USE EPISODE 1 STORY
      => MAX 1400 CHARACTERS
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
   * Find actual Episode 1.
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
   * =======================================================
   * TRY SUMMARY FIRST
   * =======================================================
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
      const summaryData =
        summarySnap.docs[0].data();

      const summary =
        summaryData?.summary || "";

      const cleanSummary =
        stripHtml(summary);

      /*
       * SUMMARY IHARI
       *
       * Do NOT slice.
       * Do NOT limit to 1400.
       * Use the whole summary.
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
      "Error loading summary:",
      error
    );
  }

  /*
   * =======================================================
   * FALLBACK TO EPISODE 1
   * =======================================================
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
  initialSharesCounts = {},
  initialTotalShares = 0,
}) {
  const { t } = useI18n();

  const router = useRouter();

  const [sharesCount, setSharesCount] =
    useState(
      initialSharesCounts
    );

  const [totalShares, setTotalShares] =
    useState(
      initialTotalShares
    );

  const [message, setMessage] =
    useState("");

  const [
    messageVisible,
    setMessageVisible,
  ] = useState(false);

  const [loading, setLoading] =
    useState(null);

  const [
    isClient,
    setIsClient,
  ] = useState(false);

  /* =======================================================
     CHECK SESSION
  ======================================================= */
  useEffect(() => {
    setIsClient(true);

    const userCookie =
      Cookies.get("user");

    if (!userCookie) {
      router.replace("/login");
    }
  }, [router]);

  /* =======================================================
     TEMP MESSAGE
  ======================================================= */
  const showTempMessage = (
    msg,
    duration = 4000
  ) => {
    setMessage(msg);
    setMessageVisible(true);

    setTimeout(() => {
      setMessageVisible(false);
    }, duration);
  };

  /* =======================================================
     GET FIRST STORY ID
  ======================================================= */
  const getFirstStoryId = (
    story
  ) => {
    if (
      story?.episodes &&
      story.episodes.length > 0
    ) {
      /*
       * episodes ziba zimaze gutondekwa.
       * Shaka Episode 1 mbere.
       */
      const episode1 =
        story.episodes.find(
          (ep) =>
            Number(ep.season) === 1 &&
            Number(ep.episode) === 1
        );

      return (
        episode1?.id ||
        story.episodes[0]?.id ||
        null
      );
    }

    return story?.id || null;
  };

  /* =======================================================
     GET PREVIEW SHOWN ON PAGE
  ======================================================= */
  const getStoryPreview = (
    story
  ) => {
    if (
      story?.episodes &&
      story.episodes.length > 0
    ) {
      const firstEp =
        story.episodes.find(
          (ep) =>
            Number(ep.season) === 1 &&
            Number(ep.episode) === 1
        ) ||
        story.episodes[0];

      /*
       * This is ONLY preview.
       * Actual share text is loaded when
       * Copy Link is clicked.
       */
      const preview =
        firstEp?.storySummary ||
        firstEp?.summary ||
        "";

      const cleanPreview =
        stripHtml(preview);

      if (
        cleanPreview.length > 150
      ) {
        return (
          cleanPreview.slice(
            0,
            150
          ) + "..."
        );
      }

      return (
        cleanPreview ||
        "Soma iyi nkuru yose"
      );
    }

    return (
      story?.summary ||
      "Soma iyi nkuru yose"
    );
  };

  /* =======================================================
     SHARE / COPY HANDLER
  ======================================================= */
  const handleShare = async (
    storyId,
    story
  ) => {
    if (!username) {
      showTempMessage(
        "❌ Nta username iboneka. Winjira mbere."
      );

      return;
    }

    if (!story?.title) {
      showTempMessage(
        "❌ Inkuru ntiyabonetse."
      );

      return;
    }

    setLoading(storyId);

    try {
      /* ===================================================
         GET SUMMARY OR EPISODE 1
      =================================================== */
      const {
        text: shareText,
      } =
        await getStoryShareText(
          story
        );

      /* ===================================================
         STORY LINK
      =================================================== */
      const shareLink =
        `https://www.newtalentsg.co.rw/story/` +
        `${encodeURIComponent(
          story.title
        )}`;

      /* ===================================================
         FINAL SHARE TEXT
      =================================================== */
      const textToCopy =
        `${story.title}\n\n` +
        `📖 ${
          shareText ||
          "Soma iyi nkuru yose"
        }\n\n` +
        `🔗 Soma iyi nkuru yose: ${shareLink}`;

      let copied = false;

      /* ===================================================
         NATIVE SHARE ON MOBILE
      =================================================== */
      if (
        isClient &&
        typeof navigator !==
          "undefined" &&
        navigator.share
      ) {
        try {
          await navigator.share({
            title: story.title,
            text: textToCopy,
            url: shareLink,
          });

          copied = true;
        } catch (shareError) {
          /*
           * User can close/cancel native share.
           * In that case, fallback to copy.
           */
          if (
            shareError?.name !==
            "AbortError"
          ) {
            console.error(
              "Native share error:",
              shareError
            );
          }
        }
      }

      /* ===================================================
         CLIPBOARD FALLBACK
      =================================================== */
      if (!copied) {
        try {
          if (
            navigator.clipboard &&
            window.isSecureContext
          ) {
            await navigator.clipboard.writeText(
              textToCopy
            );

            copied = true;
          }
        } catch {
          copied = false;
        }
      }

      /* ===================================================
         OLD BROWSER FALLBACK
      =================================================== */
      if (!copied) {
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

          textarea.style.top =
            "0";

          document.body.appendChild(
            textarea
          );

          textarea.focus();
          textarea.select();

          const result =
            document.execCommand(
              "copy"
            );

          textarea.remove();

          copied = result;
        } catch {
          copied = false;
        }
      }

      /* ===================================================
         MESSAGE
      =================================================== */
      if (copied) {
        showTempMessage(
          `✅ Inkuru yateguwe neza!\n\n${textToCopy}`,
          6000
        );
      } else {
        showTempMessage(
          `❌ Ntibyashobotse gusangiza inkuru.\n\n${textToCopy}`,
          6000
        );
      }

      /* ===================================================
         FIRESTORE SHARE COUNTER
      =================================================== */
      const shareDocRef =
        doc(
          db,
          "shares",
          username
        );

      try {
        await updateDoc(
          shareDocRef,
          {
            [storyId]:
              increment(1),
          }
        );
      } catch {
        await setDoc(
          shareDocRef,
          {
            [storyId]: 1,
          },
          {
            merge: true,
          }
        );
      }

      /* ===================================================
         LOCAL STATE
      =================================================== */
      setSharesCount(
        (prev) => ({
          ...prev,
          [storyId]:
            (Number(
              prev[storyId]
            ) || 0) + 1,
        })
      );

      setTotalShares(
        (prev) =>
          Number(prev) + 1
      );
    } catch (error) {
      console.error(
        "Share error:",
        error
      );

      showTempMessage(
        "❌ Habaye ikibazo mu gutegura inkuru yo gusangiza.",
        5000
      );
    } finally {
      setLoading(null);
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */
  return (
    <>
      <LinkComponent />

      <div
        className={
          styles.pageWrap
        }
      >
        {/* =================================================
            MESSAGE POPUP
        ================================================= */}
        {messageVisible && (
          <div
            className={
              styles.topMessage
            }
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
          className={
            styles.container
          }
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
              <FaShare
                className={
                  styles.headerIcon
                }
              />

              <div>
                <h1
                  className={
                    styles.title
                  }
                >{t("Share Your Stories")}</h1>

                <p
                  className={
                    styles.subtitle
                  }
                >
                  <FaUsers
                    className={
                      styles.subtitleIcon
                    }
                  />

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
              >{t("Total Shares")}</div>

              <div
                className={
                  styles.totalNumber
                }
              >
                {totalShares}
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

              <p>{t("Nta nkuru wanditse.")}<br />

                <span
                  className={
                    styles.emptyHint
                  }
                >{t("Andika inkuru zawe mbere yo kuzasangiza.")}</span>
              </p>
            </div>
          ) : (
            /* =================================================
               STORIES LIST
            ================================================= */
            <ul
              className={
                styles.list
              }
            >
              {groupedStories.map(
                (story) => {
                  const storyId =
                    getFirstStoryId(
                      story
                    );

                  const preview =
                    getStoryPreview(
                      story
                    );

                  const shareCount =
                    sharesCount[
                      storyId
                    ] || 0;

                  return (
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
                          {
                            story.title
                          }
                        </h3>

                        {/* =========================
                            META
                        ========================= */}
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

                          <span
                            className={
                              styles.metaBadge
                            }
                          >
                            <FaShare />{" "}{t("Shares:")}{" "}
                            {
                              shareCount
                            }
                          </span>
                        </div>

                        {/* =========================
                            PREVIEW
                        ========================= */}
                        <p
                          className={
                            styles.postSummary
                          }
                        >
                          {
                            preview
                          }
                        </p>
                      </div>

                      {/* =========================
                          ACTION
                      ========================= */}
                      <div
                        className={
                          styles.actions
                        }
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleShare(
                              storyId,
                              story
                            )
                          }
                          disabled={
                            loading ===
                            storyId
                          }
                          className={
                            styles.shareBtn
                          }
                          aria-label={t("Share {title}", { title: story.title })}
                        >
                          {loading ===
                          storyId ? (
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
                  );
                }
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

            <p>{t("🔗 Share your stories with friends and earn rewards!")}</p>
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
     1. GET USER
  ======================================================= */
  const userData =
    getUserFromCookie(
      req.headers.cookie || ""
    );

  if (!userData) {
    return {
      redirect: {
        destination:
          "/login",
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
        destination:
          "/login",
        permanent: false,
      },
    };
  }

  try {
    /* =====================================================
       2. FETCH ONLY THIS AUTHOR'S POSTS
    ===================================================== */
    const postsRef =
      collection(
        db,
        "posts"
      );

    const postsQuery =
      query(
        postsRef,
        where(
          "author",
          "==",
          username
        )
      );

    const snap =
      await getDocs(
        postsQuery
      );

    /* =====================================================
       3. GROUP STORIES
    ===================================================== */
    const grouped = {};

    snap.docs.forEach(
      (docu) => {
        const d =
          docu.data();

        const head =
          d.head ||
          d.title ||
          "Untitled";

        const title =
          getStoryTitle(
            head
          );

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

          /*
           * Story is kept here because
           * it is needed as the fallback
           * when summary does not exist.
           */
          story:
            d.story || "",

          season,

          episode,

          createdAt:
            d.createdAt ||
            d.date ||
            null,
        });

        grouped[
          title
        ].seasons.add(
          season
        );
      }
    );

    /* =====================================================
       4. BUILD STORIES
    ===================================================== */
    const groupedStories =
      Object.values(
        grouped
      ).map((story) => {
        /*
         * Sort episodes
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
         * Find Episode 1
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
         * Preview on page only.
         *
         * IMPORTANT:
         * This is NOT the actual share text.
         *
         * Actual sharing searches the
         * summaries subcollection when
         * the user clicks Share.
         */
        const storySummary =
          getEpisodePreview(
            episode1?.story ||
              "",
            1400
          );

        return {
          title:
            story.title,

          episodes:
            story.episodes,

          /*
           * Only preview.
           */
          storySummary,

          totalEpisodes:
            story.episodes.length,

          totalSeasons:
            story.seasons.size,

          head:
            story.head,
        };
      });

    /* =====================================================
       5. SORT STORIES BY DATE
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

    /* =====================================================
       6. GET SHARE COUNTS
    ===================================================== */
    const sharesRef =
      doc(
        db,
        "shares",
        username
      );

    let initialSharesCounts =
      {};

    let initialTotalShares =
      0;

    const sharesSnap =
      await getDoc(
        sharesRef
      );

    if (
      sharesSnap.exists()
    ) {
      const data =
        sharesSnap.data();

      /*
       * Only numeric share fields.
       */
      initialSharesCounts =
        Object.fromEntries(
          Object.entries(
            data
          ).filter(
            ([, value]) =>
              typeof value ===
              "number"
          )
        );

      initialTotalShares =
        Object.values(
          initialSharesCounts
        ).reduce(
          (total, value) =>
            total +
            (Number(value) ||
              0),
          0
        );
    }

    /* =====================================================
       7. RETURN PROPS
    ===================================================== */
    return {
      props: {
        username,

        groupedStories,

        initialSharesCounts,

        initialTotalShares,
      },
    };
  } catch (error) {
    console.error(
      "Error fetching share page data:",
      error
    );

    return {
      props: {
        username,

        groupedStories: [],

        initialSharesCounts: {},

        initialTotalShares: 0,
      },
    };
  }
}
