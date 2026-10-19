import React, { useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import * as cookie from "cookie";

import LinkComponent from "../../components/Links";

import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

import { db } from "@/components/firebase";

import styles from "@/styles/idex.module.css";

import {
  FaEye,
  FaComments,
} from "react-icons/fa";
import { useI18n } from "@/i18n/I18nProvider";

/* =========================================
   HELPERS
========================================= */

/**
 * Kuraho HTML tags muri story preview
 */
const stripHTML = (html = "") => {
  return String(html)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
};


/* =========================================
   NORMALIZE STORY TITLE
========================================= */

/**
 * Iyi function niyo ihuriza episodes zose
 * z'inkuru imwe.
 *
 * Examples:
 *
 * INKURU S01E01
 * INKURU S01E02
 * INKURU S01 EP01
 * INKURU S1E1
 * INKURU S1 EP 1
 * INKURU SEASON 01 EPISODE 01
 * INKURU SEASON 1 EPISODE 2
 * INKURU EP01
 * INKURU EP 2
 * INKURU EPISODE 3
 * INKURU PART 1
 * INKURU IGICE 1
 * INKURU FINAL
 *
 * byose bihinduka:
 *
 * INKURU
 */

const normalizeStoryHead = (head = "") => {
  let title = String(head).trim();

  if (!title) {
    return "Untitled Story";
  }

  /* ---------------------------------------
     Kuraho text iri muri parentheses
  --------------------------------------- */

  title = title.replace(/\([^)]*\)/g, " ");


  /* ---------------------------------------
     SEASON + EPISODE COMBINED
     
     S01E01
     S1E1
     S01 EP01
     S1 EP 1
  --------------------------------------- */

  title = title.replace(
    /\bS(?:EASON)?\s*0*\d+\s*E(?:P(?:ISODE)?)?\.?\s*0*\d+\b/gi,
    " "
  );


  /* ---------------------------------------
     SEASON
     
     S01
     S1
     SEASON 01
     SEASON 1
  --------------------------------------- */

  title = title.replace(
    /\b(?:S|SEASON)\s*0*\d+\b/gi,
    " "
  );


  /* ---------------------------------------
     EPISODE
     
     EP01
     EP 01
     EP1
     EP 1
     EPISODE 01
     EPISODE 1
  --------------------------------------- */

  title = title.replace(
    /\b(?:EPISODE|EP)\.?\s*0*\d+\b/gi,
    " "
  );


  /* ---------------------------------------
     EPISODE written as E01
     
     E01
     E1
  --------------------------------------- */

  title = title.replace(
    /\bE\s*0*\d+\b/gi,
    " "
  );


  /* ---------------------------------------
     PART
     
     PART 1
     PART01
     PART01
  --------------------------------------- */

  title = title.replace(
    /\bPART\.?\s*0*\d+\b/gi,
    " "
  );


  /* ---------------------------------------
     IGICE
     
     IGICE 1
     IGICE01
  --------------------------------------- */

  title = title.replace(
    /\bIGICE\.?\s*0*\d+\b/gi,
    " "
  );


  /* ---------------------------------------
     FINAL EPISODE
     
     EP FINAL
     EPISODE FINAL
     FINAL EPISODE
     FINAL
     FINALL
     FINALLY
     GINAL
     LAST
  --------------------------------------- */

  title = title.replace(
    /\b(?:FINAL|FINALL|FINALLY|GINAL|LAST)\b/gi,
    " "
  );


  /* ---------------------------------------
     FINAL + EPISODE
  --------------------------------------- */

  title = title.replace(
    /\b(?:EP|EPISODE)\s*(?:FINAL|FINALL|FINALLY|GINAL|LAST)\b/gi,
    " "
  );


  title = title.replace(
    /\b(?:FINAL|FINALL|FINALLY|GINAL|LAST)\s*(?:EP|EPISODE|PART|IGICE)\b/gi,
    " "
  );


  /* ---------------------------------------
     Remove separators
     
     -
     _
     :
     |
     /
     .
  --------------------------------------- */

  title = title.replace(
    /[-_:|/]+/g,
    " "
  );


  /* ---------------------------------------
     Remove extra spaces
  --------------------------------------- */

  title = title
    .replace(/\s+/g, " ")
    .trim();


  /* ---------------------------------------
     Normalize case
  --------------------------------------- */

  return title
    ? title.toUpperCase()
    : "UNTITLED STORY";
};


/* =========================================
   DATE HELPER
========================================= */

const getTimestamp = (value) => {
  if (!value) return 0;

  if (
    typeof value.toMillis === "function"
  ) {
    return value.toMillis();
  }

  if (
    value instanceof Date
  ) {
    return value.getTime();
  }

  if (
    typeof value === "number"
  ) {
    return value;
  }

  const date =
    new Date(value).getTime();

  return Number.isNaN(date)
    ? 0
    : date;
};


/* =========================================
   PAGE
========================================= */

export default function Home({
  initialPosts,
  totalStories,
  totalViews,
}) {
  const { t } = useI18n();

  const router = useRouter();

  const [search, setSearch] =
    useState("");

  /*
    Story groups zigaragara 10 kuri 10.
  */

  const [visibleCount, setVisibleCount] =
    useState(10);


  /* =========================================
     GROUP STORIES
  ========================================= */

  const groupedStories = useMemo(() => {
    const groups = {};

    initialPosts.forEach((post) => {

      /*
        INKURU S01E01
        INKURU S01E02

        zombi zigomba kuba group imwe.
      */

      const storyTitle =
        normalizeStoryHead(
          post.head || ""
        );


      if (!groups[storyTitle]) {

        groups[storyTitle] = {
          title: storyTitle,

          episodes: [],

          totalViews: 0,

          totalComments: 0,

          image:
            post.imageUrl ||
            null,

          category:
            post.categories ||
            post.category ||
            "",

          latestCreatedAt:
            post.createdAt ||
            null,
        };
      }


      const group =
        groups[storyTitle];


      /* ---------------------------------------
         Add episode
      --------------------------------------- */

      group.episodes.push(post);


      /* ---------------------------------------
         Views
      --------------------------------------- */

      group.totalViews +=
        Number(
          post.views || 0
        );


      /* ---------------------------------------
         Comments
      --------------------------------------- */

      group.totalComments +=
        Number(
          post.totalComments || 0
        );


      /* ---------------------------------------
         Image
         
         Koresha image ya mbere ibonetse.
      --------------------------------------- */

      if (
        !group.image &&
        post.imageUrl
      ) {
        group.image =
          post.imageUrl;
      }


      /* ---------------------------------------
         Category
      --------------------------------------- */

      if (
        !group.category &&
        (
          post.categories ||
          post.category
        )
      ) {
        group.category =
          post.categories ||
          post.category;
      }


      /* ---------------------------------------
         Latest episode date
         
         Niba iyi episode ari nshya kurusha
         iyari iriho, uyigire latest.
      --------------------------------------- */

      const currentDate =
        getTimestamp(
          post.createdAt
        );

      const groupDate =
        getTimestamp(
          group.latestCreatedAt
        );

      if (
        currentDate >
        groupDate
      ) {
        group.latestCreatedAt =
          post.createdAt;
      }
    });


    /* =========================================
       SORT STORIES
       
       Inkuru nshya ziza mbere.
    ========================================= */

    return Object.values(groups)
      .sort((a, b) => {

        const aDate =
          getTimestamp(
            a.latestCreatedAt
          );

        const bDate =
          getTimestamp(
            b.latestCreatedAt
          );

        return bDate - aDate;
      });

  }, [initialPosts]);


  /* =========================================
     SEARCH
  ========================================= */

  const filteredStories =
    useMemo(() => {

      const value =
        search
          .trim()
          .toLowerCase();


      if (!value) {
        return groupedStories;
      }


      return groupedStories.filter(
        (story) =>
          story.title
            .toLowerCase()
            .includes(value)
      );

    }, [
      groupedStories,
      search,
    ]);


  /* =========================================
     VISIBLE STORIES
  ========================================= */

  const visibleStories =
    search.trim()
      ? filteredStories
      : filteredStories.slice(
          0,
          visibleCount
        );


  /* =========================================
     LOAD MORE
  ========================================= */

  const handleLoadMore = () => {

    setVisibleCount(
      (prev) => prev + 10
    );

  };


  /* =========================================
     OPEN STORY
  ========================================= */

  const openStory = (title) => {

    router.push(
      `/admin/story?title=${encodeURIComponent(
        title
      )}`
    );

  };


  /* =========================================
     RENDER
  ========================================= */

  return (
    <>
      <Head>

        <title>{t("Dashboard | New Talents Stories")}</title>

        <meta
          name="robots"
          content="noindex, nofollow"
        />

      </Head>


      <LinkComponent />


      <div
        className={
          styles.container
        }
      >

        {/* =================================
            STATS
        ================================= */}

        <div
          className={
            styles.stats
          }
        >

          <div
            className={
              styles.statCard
            }
          >

            <h4>{t("Total Stories")}</h4>

            <span>
              {totalStories}
            </span>

          </div>


          <div
            className={
              styles.statCard
            }
          >

            <h4>{t("Total Views")}</h4>

            <span>
              {totalViews}
            </span>

          </div>

        </div>


        {/* =================================
            SEARCH
        ================================= */}

        <input
          className={
            styles.search
          }

          placeholder={t("Search stories...")}

          value={search}

          onChange={(e) => {

            setSearch(
              e.target.value
            );

            /*
              Ongera utangire kuri 10
              igihe search ihindutse.
            */

            setVisibleCount(10);

          }}
        />


        {/* =================================
            STORIES
        ================================= */}

        <div
          className={
            styles.posts
          }
        >

          {visibleStories.map(
            (story) => {

              /*
                Sort episodes imbere muri story.
                Latest episode iba iya mbere.
              */

              const sortedEpisodes =
                [...story.episodes]
                  .sort(
                    (a, b) =>
                      getTimestamp(
                        b.createdAt
                      ) -
                      getTimestamp(
                        a.createdAt
                      )
                  );


              /*
                Koresha episode ya mbere
                nk'preview.
              */

              const firstEpisode =
                sortedEpisodes[0];


              const preview =
                stripHTML(
                  firstEpisode?.story ||
                  ""
                );


              return (
                <div
                  key={
                    story.title
                  }

                  className={
                    styles.post
                  }

                  onClick={() =>
                    openStory(
                      story.title
                    )
                  }

                  role="button"

                  tabIndex={0}

                  onKeyDown={(e) => {

                    if (
                      e.key === "Enter" ||
                      e.key === " "
                    ) {

                      e.preventDefault();

                      openStory(
                        story.title
                      );

                    }

                  }}
                >

                  {/* =========================
                      IMAGE
                  ========================= */}

                  {story.image && (

                    <img
                      src={
                        story.image
                      }

                      className={
                        styles.image
                      }

                      alt={
                        story.title
                      }

                      loading="lazy"

                      decoding="async"
                    />

                  )}


                  {/* =========================
                      TITLE
                  ========================= */}

                  <h2>
                    {story.title}
                  </h2>


                  {/* =========================
                      PREVIEW
                  ========================= */}

                  <p>
                    {preview.slice(
                      0,
                      300
                    )}

                    {preview.length > 300
                      ? "..."
                      : ""}
                  </p>


                  {/* =========================
                      META
                  ========================= */}

                  <div
                    className={
                      styles.meta
                    }
                  >

                    <span>

                      📚{" "}

                      <strong>
                        {
                          story
                            .episodes
                            .length
                        }
                      </strong>{" "}{t("Episodes")}</span>


                    <span>

                      <FaEye />

                      {" "}

                      {
                        story.totalViews
                      }

                    </span>


                    <span>

                      <FaComments />

                      {" "}

                      {
                        story.totalComments
                      }

                    </span>

                  </div>


                  {/* =========================
                      CATEGORY
                  ========================= */}

                  {story.category && (

                    <div>

                      <strong>{t("Category:")}</strong>{" "}

                      {Array.isArray(
                        story.category
                      )
                        ? story.category.join(
                            ", "
                          )
                        : story.category}

                    </div>

                  )}


                  {/* =========================
                      OPEN STORY
                  ========================= */}

                  <div
                    className={
                      styles.openStory
                    }
                  >{t("Reba Episodes →")}</div>

                </div>
              );

            }
          )}

        </div>


        {/* =================================
            EMPTY STATE
        ================================= */}

        {visibleStories.length === 0 && (

          <div>{t("No stories found.")}</div>

        )}


        {/* =================================
            LOAD MORE
        ================================= */}

        {!search.trim() &&
          visibleCount <
            filteredStories.length && (

          <button
            className={
              styles.loadMore
            }

            onClick={
              handleLoadMore
            }
          >{t("Loading Stories")}</button>

        )}

      </div>
    </>
  );
}


/* =========================================
   SERVER-SIDE RENDERING
========================================= */

export async function getServerSideProps({
  req,
}) {

  /* =================================
     READ COOKIE
  ================================= */

  const cookies =
    cookie.parse(
      req.headers.cookie || ""
    );


  const userCookie =
    cookies.user;


  /* =================================
     REQUIRE LOGIN
  ================================= */

  if (!userCookie) {

    return {
      redirect: {
        destination:
          "/login",
        permanent: false,
      },
    };

  }


  /* =================================
     VERIFY ADMIN
  ================================= */

  try {

    const user =
      JSON.parse(
        userCookie
      );


    if (
      user.username
        ?.trim()
        .toLowerCase() !==
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

  } catch (error) {

    return {
      redirect: {
        destination:
          "/login",
        permanent: false,
      },
    };

  }


  /* =================================
     FETCH ALL POSTS
     
     Turimo gufata episodes zose
     kugira ngo tuzibumbire hamwe.
  ================================= */

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


  /* =================================
     CONVERT FIRESTORE DATA
  ================================= */

  const initialPosts =
    snap.docs.map(
      (d) => ({
        id: d.id,
        ...d.data(),
      })
    );


  /* =================================
     TOTAL VIEWS
  ================================= */

  let totalViews = 0;


  initialPosts.forEach(
    (post) => {

      totalViews +=
        Number(
          post.views || 0
        );

    }
  );


  /* =================================
     TOTAL UNIQUE STORIES
     
     S01E01 na S01E02
     zizaba title imwe.
  ================================= */

  const storyTitles =
    new Set();


  initialPosts.forEach(
    (post) => {

      const title =
        normalizeStoryHead(
          post.head || ""
        );


      if (title) {

        storyTitles.add(
          title
        );

      }

    }
  );


  const totalStories =
    storyTitles.size;


  /* =================================
     RETURN PROPS
  ================================= */

  return {

    props: {

      initialPosts,

      totalStories,

      totalViews,

    },

  };
}
