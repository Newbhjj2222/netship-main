import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import * as cookie from "cookie";

import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  deleteDoc,
} from "firebase/firestore";

import { db } from "@/components/firebase";
import styles from "@/styles/storyManage.module.css";

import {
  FaEdit,
  FaTrash,
  FaArrowLeft,
  FaEye,
  FaComments,
} from "react-icons/fa";
import { useI18n } from "@/i18n/I18nProvider";

/* =========================================================
   STRIP HTML
========================================================= */

const stripHTML = (html = "") =>
  String(html)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

/* =========================================================
   NORMALIZE STORY TITLE
=========================================================

   Iyi function ihindura titles zitandukanye zikaba
   story imwe.

   Examples:

   INKURU S01E01
   INKURU S01 EP01
   INKURU S1E1
   INKURU S01 E01
   INKURU SEASON 1 EPISODE 1
   INKURU EP01
   INKURU EP 1
   INKURU EPISODE 1
   INKURU PART 1
   INKURU IGICE 1
   INKURU S01 PART 1
   INKURU FINAL

   byose => INKURU
========================================================= */

const normalizeStoryHead = (head = "") => {
  let title = String(head).trim();

  if (!title) {
    return "Untitled Story";
  }

  /* ---------------------------------------------
     Remove text inside parentheses

     INKURU S01E01 (Action Story)
     => INKURU S01E01
  --------------------------------------------- */

  title = title.replace(/\([^)]*\)/g, " ");

  /* ---------------------------------------------
     Remove S + Season + Episode combinations

     S01E01
     S1E1
     S01 E01
     S01EP01
     S1 EP 1
  --------------------------------------------- */

  title = title.replace(
    /\bS\s*0*\d+\s*(?:E|EP|EPISODE)\s*0*\d+\b/gi,
    " "
  );

  /* ---------------------------------------------
     Remove Season + Episode

     SEASON 01 EPISODE 01
     SEASON 1 EP 1
     S01 EP01
     S01 EP 1
  --------------------------------------------- */

  title = title.replace(
    /\b(?:SEASON|S)\s*0*\d+\s*(?:EPISODE|EP)\s*0*\d+\b/gi,
    " "
  );

  /* ---------------------------------------------
     Remove Season only

     S01
     S1
     SEASON 01
     SEASON 1
  --------------------------------------------- */

  title = title.replace(
    /\b(?:SEASON|S)\s*0*\d+\b/gi,
    " "
  );

  /* ---------------------------------------------
     Remove Episode only

     EP01
     EP 01
     EPISODE 01
     E01
     E 01
  --------------------------------------------- */

  title = title.replace(
    /\b(?:EPISODE|EP|E)\s*0*\d+\b/gi,
    " "
  );

  /* ---------------------------------------------
     Remove PART

     PART 1
     PART01
     PART 01
  --------------------------------------------- */

  title = title.replace(
    /\bPART\s*0*\d+\b/gi,
    " "
  );

  /* ---------------------------------------------
     Remove IGICE

     IGICE 1
     IGICE01
  --------------------------------------------- */

  title = title.replace(
    /\bIGICE\s*0*\d+\b/gi,
    " "
  );

  /* ---------------------------------------------
     Remove FINAL variations

     FINAL
     FINALL
     FINALLY
     GINAL
     LAST
  --------------------------------------------- */

  title = title.replace(
    /\b(?:FINAL|FINALL|FINALLY|GINAL|LAST)\b/gi,
    " "
  );

  /* ---------------------------------------------
     Remove separators
  --------------------------------------------- */

  title = title.replace(
    /[-_:|/]+/g,
    " "
  );

  /* ---------------------------------------------
     Normalize spaces
  --------------------------------------------- */

  title = title
    .replace(/\s+/g, " ")
    .trim();

  return title || "Untitled Story";
};

/* =========================================================
   EXTRACT EPISODE INFORMATION
========================================================= */

const extractEpisodeInfo = (head = "") => {
  const value = String(head).trim();

  let season = 1;
  let episode = 0;
  let part = 0;

  /* =======================================================
     SEASON + EPISODE

     S01E01
     S1E1
     S01 E01
     S01EP01
     S01 EP01
     SEASON 01 EPISODE 01
  ======================================================= */

  let match = value.match(
    /\bS\s*0*(\d+)\s*(?:E|EP|EPISODE)\s*0*(\d+)\b/i
  );

  if (!match) {
    match = value.match(
      /\bSEASON\s*0*(\d+)\s*(?:EP|EPISODE)\s*0*(\d+)\b/i
    );
  }

  if (match) {
    season = Number(match[1]) || 1;
    episode = Number(match[2]) || 0;
  }

  /* =======================================================
     SEASON ONLY

     S01
     S1
     SEASON 01
  ======================================================= */

  if (season === 1) {
    const seasonMatch = value.match(
      /\b(?:S|SEASON)\s*0*(\d+)\b/i
    );

    if (seasonMatch) {
      season = Number(seasonMatch[1]) || 1;
    }
  }

  /* =======================================================
     EPISODE ONLY

     EP01
     EP 01
     EPISODE 01
     E01
  ======================================================= */

  if (episode === 0) {
    const episodeMatch = value.match(
      /\b(?:EPISODE|EP|E)\s*0*(\d+)\b/i
    );

    if (episodeMatch) {
      episode = Number(episodeMatch[1]) || 0;
    }
  }

  /* =======================================================
     PART

     PART 1
     PART01
     IGICE 1
     IGICE01
  ======================================================= */

  const partMatch = value.match(
    /\b(?:PART|IGICE)\s*0*(\d+)\b/i
  );

  if (partMatch) {
    part = Number(partMatch[1]) || 0;
  }

  /* =======================================================
     FINAL
  ======================================================= */

  const isFinal =
    /\b(?:FINAL|FINALL|FINALLY|GINAL|LAST)\b/i.test(
      value
    );

  return {
    season,
    episode,
    part,
    isFinal,
  };
};

/* =========================================================
   GET EPISODE LABEL
========================================================= */

const getEpisodeLabel = (
  head = "",
  index = 0
) => {
  const {
    season,
    episode,
    part,
    isFinal,
  } = extractEpisodeInfo(head);

  if (isFinal) {
    if (season > 1) {
      return `S${String(season).padStart(2, "0")} Final`;
    }

    return "Final";
  }

  if (episode > 0) {
    const seasonLabel =
      `S${String(season).padStart(2, "0")}`;

    const episodeLabel =
      `EP${String(episode).padStart(2, "0")}`;

    if (part > 0) {
      return `${seasonLabel} ${episodeLabel} Part ${part}`;
    }

    return `${seasonLabel} ${episodeLabel}`;
  }

  if (part > 0) {
    if (season > 1) {
      return `S${String(season).padStart(2, "0")} Part ${part}`;
    }

    return `Part ${part}`;
  }

  return `Episode ${index + 1}`;
};

/* =========================================================
   SERIALIZE FIRESTORE DATE
========================================================= */

const serializeDate = (value) => {
  if (!value) return null;

  if (
    typeof value.toDate === "function"
  ) {
    return value
      .toDate()
      .toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number"
  ) {
    return new Date(value).toISOString();
  }

  return null;
};

/* =========================================================
   SORT EPISODES
========================================================= */

const sortEpisodes = (episodes = []) => {
  return [...episodes].sort((a, b) => {
    const aInfo = extractEpisodeInfo(a.head);
    const bInfo = extractEpisodeInfo(b.head);

    /* ---------------------------------------------
       SEASON
    --------------------------------------------- */

    if (aInfo.season !== bInfo.season) {
      return aInfo.season - bInfo.season;
    }

    /* ---------------------------------------------
       FINAL

       Final always comes after normal episodes.
    --------------------------------------------- */

    if (aInfo.isFinal && !bInfo.isFinal) {
      return 1;
    }

    if (!aInfo.isFinal && bInfo.isFinal) {
      return -1;
    }

    /* ---------------------------------------------
       EPISODE
    --------------------------------------------- */

    if (aInfo.episode !== bInfo.episode) {
      /*
        Episodes with numbers first.
      */

      if (
        aInfo.episode === 0 &&
        bInfo.episode > 0
      ) {
        return 1;
      }

      if (
        aInfo.episode > 0 &&
        bInfo.episode === 0
      ) {
        return -1;
      }

      return aInfo.episode - bInfo.episode;
    }

    /* ---------------------------------------------
       PART
    --------------------------------------------- */

    if (aInfo.part !== bInfo.part) {
      if (
        aInfo.part === 0 &&
        bInfo.part > 0
      ) {
        return -1;
      }

      if (
        aInfo.part > 0 &&
        bInfo.part === 0
      ) {
        return 1;
      }

      return aInfo.part - bInfo.part;
    }

    /* ---------------------------------------------
       CREATED DATE
    --------------------------------------------- */

    const aDate =
      a.createdAt
        ? new Date(a.createdAt).getTime()
        : 0;

    const bDate =
      b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;

    return aDate - bDate;
  });
};

/* =========================================================
   PAGE
========================================================= */

export default function StoryPage({
  storyTitle,
  episodes: initialEpisodes,
}) {
  const { t } = useI18n();

  const router = useRouter();

  const [episodes, setEpisodes] =
    React.useState(
      sortEpisodes(initialEpisodes)
    );

  const [deletingId, setDeletingId] =
    React.useState(null);

  const [deletingAll, setDeletingAll] =
    React.useState(false);

  /* =======================================================
     EDIT
  ======================================================= */

  const handleEdit = (id) => {
    router.push(
      `/admin/Editor?id=${encodeURIComponent(id)}`
    );
  };

  /* =======================================================
     DELETE ONE EPISODE
  ======================================================= */

  const handleDelete = async (
    episode
  ) => {
    const label =
      getEpisodeLabel(
        episode.head,
        0
      );

    const confirmed =
      window.confirm(
        t("Urashaka gusiba \"{head}\" ({label})? Iki gikorwa ntigishobora gusubizwa.", { head: episode.head, label })
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        episode.id
      );

      /* ---------------------------------------------
         DELETE COMMENTS
      --------------------------------------------- */

      const commentsRef =
        collection(
          db,
          "posts",
          episode.id,
          "comments"
        );

      const commentsSnap =
        await getDocs(
          commentsRef
        );

      for (
        const comment of commentsSnap.docs
      ) {
        await deleteDoc(
          doc(
            db,
            "posts",
            episode.id,
            "comments",
            comment.id
          )
        );
      }

      /* ---------------------------------------------
         DELETE EPISODE
      --------------------------------------------- */

      await deleteDoc(
        doc(
          db,
          "posts",
          episode.id
        )
      );

      /* ---------------------------------------------
         UPDATE UI
      --------------------------------------------- */

      setEpisodes((prev) =>
        prev.filter(
          (item) =>
            item.id !== episode.id
        )
      );

      alert(
        t("Episode yasibwe neza.")
      );
    } catch (error) {
      console.error(
        "Delete episode error:",
        error
      );

      alert(
        t("Habaye ikibazo mu gusiba episode.")
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* =======================================================
     DELETE ALL EPISODES
  ======================================================= */

  const handleDeleteAll = async () => {
    if (!episodes.length) {
      alert(
        t("Nta episodes zihari zo gusiba.")
      );
      return;
    }

    const confirmed =
      window.confirm(
        t("URABYIZEYE? Ugiye gusiba episodes zose {length} za \"{storyTitle}\". Iki gikorwa ntigishobora gusubizwa.", { length: episodes.length, storyTitle })
      );

    if (!confirmed) {
      return;
    }

    const secondConfirmation =
      window.confirm(
        t("CONFIRM DELETE ALL Siba episodes zose za \"{storyTitle}\"?", { storyTitle })
      );

    if (!secondConfirmation) {
      return;
    }

    try {
      setDeletingAll(true);

      for (
        const episode of episodes
      ) {
        /* -------------------------------------------
           DELETE COMMENTS
        ------------------------------------------- */

        const commentsRef =
          collection(
            db,
            "posts",
            episode.id,
            "comments"
          );

        const commentsSnap =
          await getDocs(
            commentsRef
          );

        for (
          const comment of commentsSnap.docs
        ) {
          await deleteDoc(
            doc(
              db,
              "posts",
              episode.id,
              "comments",
              comment.id
            )
          );
        }

        /* -------------------------------------------
           DELETE POST
        ------------------------------------------- */

        await deleteDoc(
          doc(
            db,
            "posts",
            episode.id
          )
        );
      }

      setEpisodes([]);

      alert(
        t("Episodes zose za \"{storyTitle}\" zasibwe neza.", { storyTitle })
      );
    } catch (error) {
      console.error(
        "Delete all episodes error:",
        error
      );

      alert(
        t("Habaye ikibazo mu gusiba episodes zose.")
      );
    } finally {
      setDeletingAll(false);
    }
  };

  /* =======================================================
     BACK
  ======================================================= */

  const handleBack = () => {
    router.push("/admin");
  };

  /* =======================================================
     TOTAL VIEWS
  ======================================================= */

  const totalViews =
    episodes.reduce(
      (total, episode) =>
        total +
        Number(
          episode.views || 0
        ),
      0
    );

  /* =======================================================
     TOTAL COMMENTS
  ======================================================= */

  const totalComments =
    episodes.reduce(
      (total, episode) =>
        total +
        Number(
          episode.totalComments || 0
        ),
      0
    );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <Head>
        <title>{t("{storyTitle} | Story Manager", { storyTitle })}</title>

        <meta
          name="robots"
          content="noindex,nofollow"
        />
      </Head>

      <div
        className={
          styles.container
        }
      >

        {/* =================================================
            BACK BUTTON
        ================================================= */}

        <button
          type="button"
          className={
            styles.backButton
          }
          onClick={
            handleBack
          }
        >
          <FaArrowLeft />{t("Subira kuri dashboard")}</button>

        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className={
            styles.header
          }
        >
          <div>
            <span
              className={
                styles.badge
              }
            >{t("STORY")}</span>

            <h1>
              {storyTitle}
            </h1>

            <p>
              {episodes.length}{" "}
              {episodes.length === 1
                ? t("Episode")
                : t("Episodes")}
            </p>
          </div>

          {/* ---------------------------------------------
              STORY TOTALS
          --------------------------------------------- */}

          <div
            className={
              styles.meta
            }
          >
            <span>
              <FaEye />

              {totalViews}
            </span>

            <span>
              <FaComments />

              {totalComments}
            </span>
          </div>

          {/* ---------------------------------------------
              DELETE ALL
          --------------------------------------------- */}

          <div
            className={
              styles.headerActions
            }
          >
            <button
              type="button"
              className={
                styles.deleteAll
              }
              onClick={
                handleDeleteAll
              }
              disabled={
                deletingAll ||
                episodes.length === 0
              }
            >
              <FaTrash />

              {deletingAll
                ? t("Deleting All...")
                : t("Delete All Episodes ({length})", { length: episodes.length })}
            </button>
          </div>
        </div>

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {episodes.length === 0 ? (
          <div
            className={
              styles.empty
            }
          >
            <h2>{t("Nta episode zisigaye.")}</h2>

            <p>{t("Iyi story nta episode igifite.")}</p>
          </div>
        ) : (
          /* =================================================
             EPISODES
          ================================================= */

          <div
            className={
              styles.episodes
            }
          >
            {episodes.map(
              (
                episode,
                index
              ) => {
                const preview =
                  stripHTML(
                    episode.story ||
                      ""
                  );

                const episodeLabel =
                  getEpisodeLabel(
                    episode.head,
                    index
                  );

                const isDeleting =
                  deletingId ===
                  episode.id;

                const episodeInfo =
                  extractEpisodeInfo(
                    episode.head
                  );

                return (
                  <div
                    key={
                      episode.id
                    }
                    className={
                      styles.episodeCard
                    }
                  >

                    {/* -----------------------------------
                        EPISODE NUMBER
                    ----------------------------------- */}

                    <div
                      className={
                        styles.episodeNumber
                      }
                    >
                      {episodeLabel}
                    </div>

                    {/* -----------------------------------
                        EPISODE CONTENT
                    ----------------------------------- */}

                    <div
                      className={
                        styles.episodeBody
                      }
                    >
                      <h2>
                        {
                          episode.head
                        }
                      </h2>

                      <p>
                        {preview.slice(
                          0,
                          300
                        )}

                        {preview.length >
                        300
                          ? "..."
                          : ""}
                      </p>

                      {/* ---------------------------------
                          META
                      --------------------------------- */}

                      <div
                        className={
                          styles.meta
                        }
                      >
                        <span>
                          <FaEye />

                          {
                            episode.views ||
                            0
                          }
                        </span>

                        <span>
                          <FaComments />

                          {
                            episode.totalComments ||
                            0
                          }
                        </span>

                        {/* Season */}

                        {episodeInfo.season >
                          1 && (
                          <span>{t("S{season}", { season: episodeInfo.season })}</span>
                        )}

                        {/* Episode */}

                        {episodeInfo.episode >
                          0 && (
                          <span>{t("EP{episode}", { episode: episodeInfo.episode })}</span>
                        )}

                        {/* Part */}

                        {episodeInfo.part >
                          0 && (
                          <span>{t("Part")}{" "}
                            {
                              episodeInfo.part
                            }
                          </span>
                        )}

                        {/* Category */}

                        {episode.category && (
                          <span>
                            {
                              Array.isArray(
                                episode.category
                              )
                                ? episode.category.join(
                                    ", "
                                  )
                                : episode.category
                            }
                          </span>
                        )}
                      </div>
                    </div>

                    {/* -----------------------------------
                        ACTIONS
                    ----------------------------------- */}

                    <div
                      className={
                        styles.actions
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleEdit(
                            episode.id
                          )
                        }
                        disabled={
                          isDeleting ||
                          deletingAll
                        }
                      >
                        <FaEdit />{t("Edit")}</button>

                      <button
                        type="button"
                        className={
                          styles.delete
                        }
                        onClick={() =>
                          handleDelete(
                            episode
                          )
                        }
                        disabled={
                          isDeleting ||
                          deletingAll
                        }
                      >
                        <FaTrash />

                        {isDeleting
                          ? t("Deleting...")
                          : t("Delete")}
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* =========================================================
   SERVER-SIDE RENDERING
========================================================= */

export async function getServerSideProps(
  context
) {
  /* =======================================================
     READ COOKIE
  ======================================================= */

  const cookies =
    cookie.parse(
      context.req.headers.cookie ||
        ""
    );

  const userCookie =
    cookies.user;

  /* =======================================================
     REQUIRE LOGIN
  ======================================================= */

  if (!userCookie) {
    return {
      redirect: {
        destination:
          "/login",
        permanent: false,
      },
    };
  }

  /* =======================================================
     PARSE USER
  ======================================================= */

  let username = null;

  try {
    const user =
      JSON.parse(
        userCookie
      );

    username =
      user.username?.trim();
  } catch (error) {
    console.error(
      "Cookie parse error:",
      error
    );

    return {
      redirect: {
        destination:
          "/login",
        permanent: false,
      },
    };
  }

  /* =======================================================
     ADMIN CHECK
  ======================================================= */

  if (
    username?.toLowerCase() !==
    "newtalentsg"
  ) {
    return {
      redirect: {
        destination:
          "/login",
        permanent: false,
      },
    };
  }

  /* =======================================================
     GET STORY TITLE
  ======================================================= */

  const rawTitle =
    context.query.title;

  if (
    !rawTitle ||
    typeof rawTitle !==
      "string"
  ) {
    return {
      redirect: {
        destination:
          "/admin",
        permanent: false,
      },
    };
  }

  const storyTitle =
    decodeURIComponent(
      rawTitle
    )
      .trim();

  /* =======================================================
     NORMALIZE THE REQUESTED STORY TITLE

     Ibi ni ingenzi cyane.

     Niba URL ifite:
     INKURU

     cyangwa:
     INKURU S01E01

     cyangwa:
     INKURU S01 EP01

     system ihita ibona base title:
     INKURU
  ======================================================= */

  const normalizedRequestedTitle =
    normalizeStoryHead(
      storyTitle
    );

  /* =======================================================
     GET ALL POSTS
  ======================================================= */

  const postsQuery =
    query(
      collection(
        db,
        "posts"
      ),
      orderBy(
        "createdAt",
        "desc"
      )
    );

  const snap =
    await getDocs(
      postsQuery
    );

  /* =======================================================
     BUILD EPISODES
  ======================================================= */

  const episodes =
    snap.docs
      .map((d) => {
        const data =
          d.data();

        return {
          id: d.id,

          head:
            data.head ||
            "",

          story:
            data.story ||
            "",

          category:
            data.categories ||
            data.category ||
            "",

          image:
            data.imageUrl ||
            null,

          views:
            Number(
              data.views || 0
            ),

          totalComments:
            Number(
              data.totalComments ||
                0
            ),

          author:
            data.author ||
            "",

          accessType:
            data.accessType ||
            "free",

          createdAt:
            serializeDate(
              data.createdAt
            ),

          updatedAt:
            serializeDate(
              data.updatedAt
            ),
        };
      })

      /* ===================================================
         IMPORTANT:

         INKURU S01E01
         INKURU S01 EP01
         INKURU S1E1
         INKURU Episode 1

         byose bigomba kugira
         normalize title imwe.
      =================================================== */

      .filter(
        (post) =>
          normalizeStoryHead(
            post.head
          ) ===
          normalizedRequestedTitle
      );

  /* =======================================================
     SORT

     S01 EP01
     S01 EP02
     S01 EP03
     S01 FINAL

     S02 EP01
     S02 EP02
     ...
  ======================================================= */

  const sortedEpisodes =
    sortEpisodes(
      episodes
    );

  /* =======================================================
     RETURN SSR
  ======================================================= */

  return {
    props: {
      storyTitle:
        normalizedRequestedTitle,

      episodes:
        sortedEpisodes,
    },
  };
}
