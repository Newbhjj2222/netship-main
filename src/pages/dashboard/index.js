// pages/index.js

import React, { useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import * as cookie from "cookie";

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";

import { db } from "@/components/firebase";
import styles from "@/styles/index.module.css";

import {
  FaEye,
  FaComments,
} from "react-icons/fa";

import LinkComponent from "../../components/Link";
import WritingCoach from "@/components/WritingCoach";
import { useI18n } from "@/i18n/I18nProvider";

/* =====================================================
   HELPERS
===================================================== */

/**
 * Remove HTML tags from story preview.
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


/**
 * Normalize story title.
 *
 * The purpose is to make all of these:
 *
 * INKURU S01E01
 * INKURU S01 E01
 * INKURU S01EP01
 * INKURU S01 EP01
 * INKURU S1E1
 * INKURU S1 EP 1
 * INKURU SEASON 01 EPISODE 01
 * INKURU Episode 1
 * INKURU EP01
 * INKURU E01
 * INKURU PART 1
 * INKURU IGICE 1
 * INKURU FINAL
 *
 * become:
 *
 * INKURU
 */
const normalizeStoryHead = (head = "") => {
  let title = String(head).trim();

  if (!title) {
    return "Untitled Story";
  }

  /* ---------------------------------------------
     Remove content inside parentheses
     Example:
     INKURU S01E01 (Action)
     --------------------------------------------- */

  title = title.replace(/\([^)]*\)/g, " ");


  /* ---------------------------------------------
     Remove season notation

     S01
     S1
     S 01
     SEASON 01
     SEASON 1
     SEASON01
     --------------------------------------------- */

  title = title.replace(
    /\b(?:S|SEASON)\s*0*\d+\b/gi,
    " "
  );


  /* ---------------------------------------------
     Remove episode notation

     E01
     E1
     E 01

     EP01
     EP 01
     EP 1

     EPISODE01
     EPISODE 01
     EPISODE 1

     This is important for:

     INKURU S01E01

     because after removing S01,
     E01 must also disappear.
     --------------------------------------------- */

  title = title.replace(
    /\b(?:EPISODE|EP|E)\s*0*\d+\b/gi,
    " "
  );


  /* ---------------------------------------------
     Remove PART / IGICE

     PART 1
     PART01
     IGICE 1
     IGICE01
     --------------------------------------------- */

  title = title.replace(
    /\b(?:PART|IGICE)\s*0*\d+\b/gi,
    " "
  );


  /* ---------------------------------------------
     Remove final notation

     FINAL
     FINALL
     FINALLY
     GINAL

     EP FINAL
     EP FINALLY
     EPISODE FINAL
     --------------------------------------------- */

  title = title.replace(
    /\b(?:FINAL|FINALL|FINALLY|GINAL)\b/gi,
    " "
  );


  /* ---------------------------------------------
     Remove common separators
     --------------------------------------------- */

  title = title.replace(
    /[-_:|./]+/g,
    " "
  );


  /* ---------------------------------------------
     Remove extra spaces
     --------------------------------------------- */

  title = title
    .replace(/\s+/g, " ")
    .trim();


  return title || "Untitled Story";
};


/**
 * Convert Firestore Timestamp / Date
 * into milliseconds for sorting.
 */
const getDateValue = (value) => {
  if (!value) return 0;

  if (
    typeof value.toMillis === "function"
  ) {
    return value.toMillis();
  }

  if (
    typeof value.toDate === "function"
  ) {
    return value.toDate().getTime();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const parsed = new Date(value).getTime();

  return Number.isNaN(parsed)
    ? 0
    : parsed;
};


/* =====================================================
   PAGE
===================================================== */

export default function Home({
  initialPosts,
  totalPosts,
  totalViews,
  username,
}) {
  const { t } = useI18n();

  const router = useRouter();

  const [search, setSearch] = useState("");


  /* =================================================
     GROUP STORIES
     
     This is the important part.

     Episodes are grouped BEFORE rendering.

     Therefore:

     INKURU S01E01
     INKURU S01E02
     INKURU S01E03
     INKURU S02E01

     all appear as ONE story:

     INKURU
  ================================================= */

  const groupedStories = useMemo(() => {
    const groups = {};

    initialPosts.forEach((post) => {
      const storyTitle = normalizeStoryHead(
        post.head || ""
      );

      const groupKey = storyTitle
        .toLowerCase()
        .trim();

      if (!groups[groupKey]) {
        groups[groupKey] = {
          title: storyTitle,

          episodes: [],

          totalViews: 0,

          totalComments: 0,

          image:
            post.image ||
            post.imageUrl ||
            null,

          category:
            post.category ||
            post.categories ||
            "",

          latestCreatedAt:
            post.createdAt || null,

          firstEpisode: post,
        };
      }

      const group = groups[groupKey];


      /* -------------------------------------------
         Add episode
      ------------------------------------------- */

      group.episodes.push(post);


      /* -------------------------------------------
         Total views
      ------------------------------------------- */

      group.totalViews += Number(
        post.views || 0
      );


      /* -------------------------------------------
         Total comments
      ------------------------------------------- */

      group.totalComments += Number(
        post.totalComments || 0
      );


      /* -------------------------------------------
         Image

         Use the first available image.
      ------------------------------------------- */

      if (
        !group.image &&
        (post.image || post.imageUrl)
      ) {
        group.image =
          post.image ||
          post.imageUrl;
      }


      /* -------------------------------------------
         Category
      ------------------------------------------- */

      if (
        !group.category &&
        (post.category || post.categories)
      ) {
        group.category =
          post.category ||
          post.categories;
      }


      /* -------------------------------------------
         Newest episode

         Since Firestore sends posts ordered
         newest first, compare dates anyway
         to make this safe.
      ------------------------------------------- */

      const currentDate = getDateValue(
        group.latestCreatedAt
      );

      const postDate = getDateValue(
        post.createdAt
      );

      if (postDate > currentDate) {
        group.latestCreatedAt =
          post.createdAt;

        group.firstEpisode = post;
      }
    });


    /* -------------------------------------------
       Sort newest stories first
    ------------------------------------------- */

    return Object.values(groups).sort(
      (a, b) => {
        const aDate = getDateValue(
          a.latestCreatedAt
        );

        const bDate = getDateValue(
          b.latestCreatedAt
        );

        return bDate - aDate;
      }
    );
  }, [initialPosts]);


  /* =================================================
     SEARCH
  ================================================= */

  const filteredStories = useMemo(() => {
    const value = search
      .trim()
      .toLowerCase();

    if (!value) {
      return groupedStories;
    }

    return groupedStories.filter(
      (story) => {
        const title =
          story.title
            .toLowerCase();

        const episodeHeads =
          story.episodes
            .map(
              (episode) =>
                episode.head || ""
            )
            .join(" ")
            .toLowerCase();

        return (
          title.includes(value) ||
          episodeHeads.includes(value)
        );
      }
    );
  }, [
    groupedStories,
    search,
  ]);


  /* =================================================
     OPEN STORY
  ================================================= */

  const openStory = (title) => {
    router.push(
      `/dashboard/story?title=${encodeURIComponent(
        title
      )}`
    );
  };


  /* =================================================
     RENDER
  ================================================= */

  return (
    <>
      <Head>
        <title>{t("Author Dashboard | New Talents Stories")}</title>

        <meta
          name="robots"
          content="noindex,nofollow"
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context":
                "https://schema.org",

              "@type":
                "Person",

              "@id":
                `https://www.newtalentsg.co.rw/author/${encodeURIComponent(
                  username
                )}#person`,

              name: username,

              url:
                `https://www.newtalentsg.co.rw/author/${encodeURIComponent(
                  username
                )}`,

              worksFor: {
                "@type":
                  "Organization",

                name:
                  "New Talents Stories Group",

                url:
                  "https://www.newtalentsg.co.rw",
              },
            }),
          }}
        />
      </Head>


      {/* =================================================
          NAVIGATION
      ================================================= */}

      <LinkComponent />


      <div className={styles.container}>


        {/* =================================================
            STATS
        ================================================= */}

        <div className={styles.cards}>

          <div className={styles.card}>
            <h3>{t("Total Stories")}</h3>

            <p>
              {totalPosts}
            </p>
          </div>


          <div className={styles.card}>
            <h3>{t("Total Views")}</h3>

            <p>
              {totalViews}
            </p>
          </div>


          <div className={styles.card}>
            <h3>{t("Your Episodes")}</h3>

            <p>
              {initialPosts.length}
            </p>
          </div>

        </div>


        {/* =================================================
            WRITING COACH
        ================================================= */}

        <WritingCoach />


        {/* =================================================
            SEARCH
        ================================================= */}

        <input
          type="search"
          className={styles.search}
          placeholder={t("Search stories...")}
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          aria-label={t("Search stories")}
        />


        {/* =================================================
            STORY LIST
        ================================================= */}

        <div className={styles.postsList}>

          {filteredStories.map(
            (story) => {

              /*
                Use the newest episode
                for preview.
              */

              const previewEpisode =
                story.firstEpisode ||
                story.episodes[0];


              const preview =
                stripHTML(
                  previewEpisode?.story ||
                    ""
                );


              return (
                <div
                  key={story.title}
                  className={
                    styles.postCard
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
                      e.key ===
                        "Enter" ||
                      e.key ===
                        " "
                    ) {
                      e.preventDefault();

                      openStory(
                        story.title
                      );
                    }
                  }}
                >


                  {/* =================================================
                      IMAGE
                      
                      Lazy loading means the browser can wait
                      until the image is close to the viewport.
                  ================================================= */}

                  {story.image && (
                    <img
                      src={story.image}
                      className={
                        styles.postImage
                      }
                      alt={
                        story.title
                      }

                      loading="lazy"
                      decoding="async"

                      onError={(e) => {
                        e.currentTarget.style.display =
                          "none";
                      }}
                    />
                  )}


                  {/* =================================================
                      STORY CONTENT
                  ================================================= */}

                  <div
                    className={
                      styles.storyCardContent
                    }
                  >


                    {/* STORY BADGE */}

                    <span
                      className={
                        styles.storyBadge
                      }
                    >{t("INKURU")}</span>


                    {/* STORY TITLE */}

                    <h2>
                      {story.title}
                    </h2>


                    {/* PREVIEW */}

                    <p>
                      {preview.slice(
                        0,
                        250
                      )}

                      {preview.length >
                        250
                        ? "..."
                        : ""}
                    </p>


                    {/* =================================================
                        STORY INFORMATION
                    ================================================= */}

                    <div
                      className={
                        styles.storyInfo
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
                        </strong>{" "}
                        {story.episodes.length ===
                        1
                          ? t("Episode")
                          : t("Episodes")}
                      </span>


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


                    {/* =================================================
                        CATEGORY
                    ================================================= */}

                    {story.category && (
                      <p
                        className={
                          styles.category
                        }
                      >
                        <strong>{t("Category:")}</strong>{" "}

                        {
                          Array.isArray(
                            story.category
                          )
                            ? story.category.join(
                                ", "
                              )
                            : story.category
                        }
                      </p>
                    )}


                    {/* =================================================
                        OPEN STORY
                    ================================================= */}

                    <div
                      className={
                        styles.openStory
                      }
                    >{t("Reba Episodes →")}</div>

                  </div>

                </div>
              );
            }
          )}

        </div>


        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {filteredStories.length ===
          0 && (
          <div
            className={
              styles.empty
            }
          >
            <h2>{t("Nta nkuru yabonetse.")}</h2>

            <p>{t("Gerageza gushakisha ukoresheje izina ry'inkuru.")}</p>
          </div>
        )}

      </div>
    </>
  );
}


/* =========================================================
   SERVER SIDE RENDERING
========================================================= */

export async function getServerSideProps(
  context
) {
  const cookies = cookie.parse(
    context.req.headers.cookie ||
      ""
  );


  /* =================================================
     READ USER COOKIE
  ================================================= */

  let user = null;
  let username = null;

  if (cookies.user) {
    try {
      user = JSON.parse(
        cookies.user
      );

      username =
        user.username
          ?.trim() || null;

    } catch (error) {
      console.error(
        "Cookie parse error:",
        error
      );
    }
  }


  /* =================================================
     REQUIRE LOGIN
  ================================================= */

  if (!username) {
    return {
      redirect: {
        destination:
          "/login",
        permanent: false,
      },
    };
  }


  /* =================================================
     FETCH ONLY THIS AUTHOR'S POSTS
  ================================================= */

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


  /* =================================================
     CONVERT FIRESTORE DATA

     Keep only data needed by this page.
  ================================================= */

  const initialPosts =
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
              data.views || 0
            ),

          totalComments:
            Number(
              data.totalComments ||
                0
            ),

          createdAt:
            data.createdAt || null,
        };
      }
    );


  /* =================================================
     TOTAL VIEWS
  ================================================= */

  const totalViews =
    initialPosts.reduce(
      (total, post) =>
        total +
        Number(
          post.views || 0
        ),
      0
    );


  /* =================================================
     UNIQUE STORY COUNT
     
     Important:

     INKURU S01E01
     INKURU S01E02
     INKURU S02E01

     are counted as ONE story.
  ================================================= */

  const storyTitles =
    new Set();

  initialPosts.forEach(
    (post) => {

      const title =
        normalizeStoryHead(
          post.head
        );

      if (title) {
        storyTitles.add(
          title
            .toLowerCase()
            .trim()
        );
      }
    }
  );


  const totalStories =
    storyTitles.size;


  /* =================================================
     RETURN SSR
  ================================================= */

  return {
    props: {
      initialPosts,

      totalPosts:
        totalStories,

      totalViews,

      username,
    },
  };
}
