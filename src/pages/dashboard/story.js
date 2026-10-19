// pages/dashboard/story.js

import React, { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import * as cookie from "cookie";

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  deleteDoc,
} from "firebase/firestore";

import { db } from "@/components/firebase";

import styles from "@/styles/storyManager.module.css";

import {
  FaEdit,
  FaTrash,
  FaArrowLeft,
  FaEye,
} from "react-icons/fa";
import { useI18n } from "@/i18n/I18nProvider";


/* =========================================================
   HELPERS
========================================================= */


/*
  Remove HTML from story content.
*/
const stripHTML = (html = "") => {
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};


/*
  Normalize story title.

  ALL of these:

  INKURU S01E01
  INKURU S01E02
  INKURU S1E1
  INKURU S1 E1
  INKURU S01 E01
  INKURU S01 EP01
  INKURU S01 EP 01
  INKURU S01 EPISODE 01
  INKURU SEASON 01 EPISODE 01
  INKURU Episode 1
  INKURU EP 1
  INKURU EP1
  INKURU EP FINAL
  INKURU FINAL

  become:

  INKURU

  IMPORTANT:

  The season and episode may be written
  with or without spaces.

  Therefore:

  S01E01
  S01 E01
  S01EP01
  S01 EP01

  are all recognized.
*/

const normalizeStoryHead = (head = "") => {
  let title = String(head).trim();

  if (!title) {
    return "";
  }


  /* -------------------------------------------------------
     Remove anything inside parentheses

     Example:

     INKURU S01E01 (Action Story)

     becomes:

     INKURU S01E01
  ------------------------------------------------------- */

  title = title.replace(
    /\([^)]*\)/g,
    " "
  );


  /* -------------------------------------------------------
     Remove Season + Episode together

     Examples:

     S01E01
     S1E1
     S01 E01
     S01EP01
     S01 EP01
     S01 EP 01
     SEASON01E01
     SEASON 01 EPISODE 01

     This MUST happen before individual
     season/episode removal.
  ------------------------------------------------------- */

  title = title.replace(
    /\b(?:S|SEASON)\s*\d+\s*(?:EPISODE|EP|E)\s*(?:\d+|FINAL|FINALL|FINALLY|GINAL|FINNALL)\b/gi,
    " "
  );


  /* -------------------------------------------------------
     Remove compact Season + Episode

     Examples:

     S01E01
     S1E1
     SEASON01E01
  ------------------------------------------------------- */

  title = title.replace(
    /\b(?:S|SEASON)\s*\d+\s*E\s*\d+\b/gi,
    " "
  );


  /* -------------------------------------------------------
     Remove Season

     Examples:

     S01
     S1
     S001
     SEASON 01
     SEASON 1
  ------------------------------------------------------- */

  title = title.replace(
    /\b(?:S|SEASON)\s*\d+\b/gi,
    " "
  );


  /* -------------------------------------------------------
     Remove Episode notation

     Examples:

     EP1
     EP 1
     EP01
     EP 01
     EPISODE1
     EPISODE 1
     E1
     E01

     Also final variations.
  ------------------------------------------------------- */

  title = title.replace(
    /\b(?:EPISODE|EP|E)\s*(?:\d+|FINAL|FINALL|FINALLY|GINAL|FINNALL)\b/gi,
    " "
  );


  /* -------------------------------------------------------
     Remove standalone final words
  ------------------------------------------------------- */

  title = title.replace(
    /\b(?:FINAL|FINALL|FINALLY|GINAL|FINNALL)\b/gi,
    " "
  );


  /* -------------------------------------------------------
     Remove common episode separators

     Example:

     INKURU - S01E01
     INKURU: S01E01
     INKURU | S01E01
  ------------------------------------------------------- */

  title = title.replace(
    /[-_:|]+/g,
    " "
  );


  /* -------------------------------------------------------
     Remove leftover numbering patterns

     This catches cases such as:

     INKURU 01
     INKURU 001

     ONLY remove numbers at the end so we
     don't accidentally destroy numbers
     that legitimately belong to the title.
  ------------------------------------------------------- */

  title = title.replace(
    /\s+\d{1,4}\s*$/g,
    " "
  );


  /* -------------------------------------------------------
     Remove extra whitespace
  ------------------------------------------------------- */

  title = title
    .replace(/\s+/g, " ")
    .trim();


  return title;
};


/* =========================================================
   GET EPISODE NUMBER
========================================================= */


/*
  Detects:

  EP1
  EP 1
  EP01
  EP 01
  EPISODE1
  EPISODE 1
  E1
  E01

  AND:

  S01E01
  S1E1
  S01 E01

  AND:

  S01EP01
  S01 EP01
*/

const getEpisodeNumber = (head = "") => {
  const value = String(head);


  /* -------------------------------------------------------
     First try compact Season + Episode
     
     S01E01
     S1E1
     S01 E01
  ------------------------------------------------------- */

  let match = value.match(
    /\b(?:S|SEASON)\s*\d+\s*E\s*0*(\d+)\b/i
  );

  if (match) {
    return Number(match[1]);
  }


  /* -------------------------------------------------------
     Season + EP

     S01EP01
     S01 EP 01
     S01 EPISODE 01
  ------------------------------------------------------- */

  match = value.match(
    /\b(?:S|SEASON)\s*\d+\s*(?:EP|EPISODE)\s*0*(\d+)\b/i
  );

  if (match) {
    return Number(match[1]);
  }


  /* -------------------------------------------------------
     Normal Episode notation

     EP1
     EP 1
     EP01
     EPISODE 1
  ------------------------------------------------------- */

  match = value.match(
    /\b(?:EPISODE|EP)\s*0*(\d+)\b/i
  );

  if (match) {
    return Number(match[1]);
  }


  /* -------------------------------------------------------
     Short E notation

     E1
     E01

     This is checked last so it doesn't interfere
     with other title patterns.
  ------------------------------------------------------- */

  match = value.match(
    /\bE\s*0*(\d+)\b/i
  );

  if (match) {
    return Number(match[1]);
  }


  return null;
};


/* =========================================================
   CHECK FINAL EPISODE
========================================================= */

const isFinalEpisode = (head = "") => {
  return /\b(?:FINAL|FINALL|FINALLY|GINAL|FINNALL)\b/i.test(
    String(head)
  );
};


/* =========================================================
   EPISODE LABEL
========================================================= */

const getEpisodeLabel = (
  head = "",
  index = 0
) => {
  const number =
    getEpisodeNumber(head);

  if (number !== null) {
    return `Episode ${number}`;
  }

  if (isFinalEpisode(head)) {
    return "Final";
  }

  return `Episode ${index + 1}`;
};


/* =========================================================
   CREATED AT
========================================================= */

const getCreatedAtTime = (createdAt) => {
  if (!createdAt) {
    return 0;
  }


  /*
    Firestore Timestamp
  */

  if (
    typeof createdAt === "object" &&
    typeof createdAt.toMillis === "function"
  ) {
    return createdAt.toMillis();
  }


  /*
    Timestamp-like object
  */

  if (
    typeof createdAt === "object" &&
    typeof createdAt.seconds === "number"
  ) {
    return (
      createdAt.seconds * 1000
    );
  }


  /*
    Already milliseconds
  */

  if (
    typeof createdAt === "number"
  ) {
    return createdAt;
  }


  /*
    String date
  */

  const time =
    new Date(createdAt).getTime();


  return Number.isNaN(time)
    ? 0
    : time;
};


/* =========================================================
   SORT EPISODES
========================================================= */

const sortEpisodes = (
  episodes = []
) => {
  return [...episodes].sort(
    (a, b) => {

      const aNumber =
        getEpisodeNumber(
          a.head
        );

      const bNumber =
        getEpisodeNumber(
          b.head
        );


      const aFinal =
        isFinalEpisode(
          a.head
        );

      const bFinal =
        isFinalEpisode(
          b.head
        );


      /*
        Both have episode numbers.

        Episode 1
        Episode 2
        Episode 10
      */

      if (
        aNumber !== null &&
        bNumber !== null
      ) {
        return (
          aNumber -
          bNumber
        );
      }


      /*
        Numbered episode comes
        before Final.
      */

      if (
        aNumber !== null &&
        bFinal
      ) {
        return -1;
      }


      if (
        aFinal &&
        bNumber !== null
      ) {
        return 1;
      }


      /*
        Final vs Final or
        unknown vs unknown.

        Use createdAt.
      */

      return (
        getCreatedAtTime(
          a.createdAt
        ) -
        getCreatedAtTime(
          b.createdAt
        )
      );
    }
  );
};


/* =========================================================
   PAGE
========================================================= */

export default function StoryManager({
  username,
  title,
  episodes: initialEpisodes,
}) {
  const { t } = useI18n();


  const router =
    useRouter();


  const [episodes, setEpisodes] =
    useState(
      initialEpisodes || []
    );


  const [deletingId, setDeletingId] =
    useState(null);


  /* =======================================================
     EDIT
  ======================================================= */

  const handleEdit = (id) => {

    if (!id) {
      return;
    }


    router.push(
      `/dashboard/Editor?id=${encodeURIComponent(
        id
      )}`
    );
  };


  /* =======================================================
     DELETE
  ======================================================= */

  const handleDelete = async (
    id
  ) => {

    if (
      !id ||
      deletingId
    ) {
      return;
    }


    const episode =
      episodes.find(
        (item) =>
          item.id === id
      );


    if (!episode) {
      return;
    }


    const index =
      episodes.findIndex(
        (item) =>
          item.id === id
      );


    const episodeLabel =
      getEpisodeLabel(
        episode.head,
        index
      );


    const confirmed =
      window.confirm(
        `Urashaka gusiba ${episodeLabel}?\n\n` +
        `Umutwe: ${episode.head}\n\n` +
        `Iki gikorwa ntigishobora gusubizwa.`
      );


    if (!confirmed) {
      return;
    }


    try {

      setDeletingId(id);


      /* ---------------------------------------------------
         DELETE COMMENTS
      --------------------------------------------------- */

      const commentsRef =
        collection(
          db,
          "posts",
          id,
          "comments"
        );


      const commentsSnap =
        await getDocs(
          commentsRef
        );


      for (
        const comment
        of commentsSnap.docs
      ) {

        await deleteDoc(
          doc(
            db,
            "posts",
            id,
            "comments",
            comment.id
          )
        );
      }


      /* ---------------------------------------------------
         DELETE EPISODE
      --------------------------------------------------- */

      await deleteDoc(
        doc(
          db,
          "posts",
          id
        )
      );


      /* ---------------------------------------------------
         UPDATE UI
      --------------------------------------------------- */

      setEpisodes(
        (previous) =>
          previous.filter(
            (item) =>
              item.id !== id
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
     BACK
  ======================================================= */

  const handleBack = () => {
    router.push(
      "/dashboard"
    );
  };


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <Head>

        <title>
          {title
            ? t("{title} | Author Dashboard", { title })
            : t("Story Manager | Author Dashboard")}
        </title>


        <meta
          name="description"
          content={
            title
              ? `Manage episodes of ${title}`
              : "Manage your story episodes"
          }
        />


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
          aria-label={t("Subira kuri dashboard")}
        >

          <FaArrowLeft />

          <span>{t("Subira kuri dashboard")}</span>

        </button>


        {/* =================================================
            STORY HEADER
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
              {title || t("Story")}
            </h1>


            <p>
              {episodes.length}{" "}

              {episodes.length ===
              1
                ? t("Episode")
                : t("Episodes")}
            </p>

          </div>

        </div>


        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {episodes.length ===
        0 ? (

          <div
            className={
              styles.empty
            }
          >

            <h3>{t("Nta episode yabonetse")}</h3>


            <p>{t("Iyi nkuru nta episode ifite cyangwa ntikiboneka.")}</p>


            <button
              type="button"
              className={
                styles.backButton
              }
              onClick={
                handleBack
              }
            >

              <FaArrowLeft />

              <span>{t("Subira kuri dashboard")}</span>

            </button>

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


                const label =
                  getEpisodeLabel(
                    episode.head,
                    index
                  );


                const isDeleting =
                  deletingId ===
                  episode.id;


                return (

                  <div
                    key={
                      episode.id
                    }
                    className={
                      styles.episodeCard
                    }
                  >

                    {/* =====================================
                        EPISODE NUMBER
                    ===================================== */}

                    <div
                      className={
                        styles.episodeNumber
                      }
                    >

                      {label}

                    </div>


                    {/* =====================================
                        EPISODE CONTENT
                    ===================================== */}

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
                        {
                          preview.slice(
                            0,
                            220
                          )
                        }

                        {preview.length >
                        220
                          ? "..."
                          : ""}
                      </p>


                      {/* META */}

                      <div
                        className={
                          styles.meta
                        }
                      >

                        <span>
                          <FaEye />

                          {Number(
                            episode.views ||
                              0
                          )}
                        </span>


                        {episode.category && (
                          <span>
                            {
                              episode.category
                            }
                          </span>
                        )}

                      </div>

                    </div>


                    {/* =====================================
                        ACTIONS
                    ===================================== */}

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
                          !!deletingId
                        }
                        aria-label={t("Edit {label}", { label })}
                      >

                        <FaEdit />

                        <span>{t("Edit")}</span>

                      </button>


                      <button
                        type="button"
                        className={
                          styles.delete
                        }
                        onClick={() =>
                          handleDelete(
                            episode.id
                          )
                        }
                        disabled={
                          !!deletingId
                        }
                        aria-label={t("Delete {label}", { label })}
                      >

                        <FaTrash />

                        <span>
                          {isDeleting
                            ? t("Deleting...")
                            : t("Delete")}
                        </span>

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
     READ USER COOKIE
  ======================================================= */

  const cookies =
    cookie.parse(
      context.req.headers.cookie ||
        ""
    );


  let username = null;


  if (cookies.user) {

    try {

      const user =
        JSON.parse(
          cookies.user
        );


      username =
        user.username
          ? String(
              user.username
            ).trim()
          : null;

    } catch (error) {

      console.error(
        "Cookie parse error:",
        error
      );

    }
  }


  /* =======================================================
     AUTHENTICATION
  ======================================================= */

  if (!username) {

    return {
      redirect: {
        destination:
          "/login",
        permanent: false,
      },
    };

  }


  /* =======================================================
     GET TITLE FROM URL
  ======================================================= */

  const rawTitle =
    Array.isArray(
      context.query.title
    )
      ? context.query.title[0]
      : context.query.title;


  const requestedTitle =
    typeof rawTitle ===
    "string"
      ? rawTitle.trim()
      : "";


  if (!requestedTitle) {

    return {
      redirect: {
        destination:
          "/dashboard",
        permanent: false,
      },
    };

  }


  /*
    Normalize requested title.

    Example:

    URL title:
    INKURU S01E01

    becomes:

    INKURU
  */

  const normalizedRequestedTitle =
    normalizeStoryHead(
      requestedTitle
    );


  if (!normalizedRequestedTitle) {

    return {
      redirect: {
        destination:
          "/dashboard",
        permanent: false,
      },
    };

  }


  /* =======================================================
     LOAD AUTHOR POSTS
  ======================================================= */

  try {

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


    /* =====================================================
       CONVERT FIRESTORE DOCUMENTS
    ===================================================== */

    const allPosts =
      snap.docs.map(
        (document) => {

          const data =
            document.data();


          return {

            id:
              document.id,

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
              data.image ||
              null,

            views:
              Number(
                data.views ||
                  0
              ),

            createdAt:
              getCreatedAtTime(
                data.createdAt
              ),

          };

        }
      );


    /* =====================================================
       MATCH STORY
       
       THIS IS THE IMPORTANT PART.

       Example:

       Requested:
       INKURU S01E01

       Stored:
       INKURU S01E01
       INKURU S01E02
       INKURU S01E03
       INKURU S02E01
       INKURU S02E02
       INKURU S1E1

       All normalize to:

       INKURU

       Therefore they are treated as ONE STORY.
    ===================================================== */

    const matchedEpisodes =
      allPosts.filter(
        (post) => {

          const normalizedPostTitle =
            normalizeStoryHead(
              post.head
            );


          return (
            normalizedPostTitle
              .toLowerCase() ===
            normalizedRequestedTitle
              .toLowerCase()
          );

        }
      );


    /* =====================================================
       SORT EPISODES
    ===================================================== */

    const sortedEpisodes =
      sortEpisodes(
        matchedEpisodes
      );


    /* =====================================================
       RETURN PROPS
    ===================================================== */

    return {

      props: {

        username,

        /*
          Always display the clean
          story title.
        */

        title:
          normalizedRequestedTitle,

        episodes:
          sortedEpisodes,

      },

    };

  } catch (error) {

    console.error(
      "SSR StoryManager error:",
      error
    );


    return {

      props: {

        username,

        title:
          normalizedRequestedTitle,

        episodes: [],

      },

    };

  }
}
