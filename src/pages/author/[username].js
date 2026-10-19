// pages/author/[username].js

import React from "react";
import Head from "next/head";
import Link from "next/link";

import { db } from "@/components/firebase";

import styles from "@/styles/autho.module.css";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import {
  FaCheckCircle,
  FaBook,
  FaEye,
  FaUsers,
  FaWhatsapp,
  FaFacebook,
  FaInstagram,
} from "react-icons/fa";

import { FaXTwitter } from "react-icons/fa6";
import { useI18n } from "@/i18n/I18nProvider";

/* =========================================================
   FORMAT NUMBER
========================================================= */

function formatNumber(num = 0) {
  const value = Number(num) || 0;

  if (value >= 1000000) {
    return (
      (value / 1000000)
        .toFixed(1)
        .replace(".0", "") + "M"
    );
  }

  if (value >= 1000) {
    return (
      (value / 1000)
        .toFixed(1)
        .replace(".0", "") + "K"
    );
  }

  return value.toString();
}

/* =========================================================
   NORMALIZE STORY TITLE
========================================================= */

/*
  Iyi function ituma izi zose zifatwa nk'inkuru imwe:

  INKURU S01E01
  INKURU S01E02
  INKURU S1E1
  INKURU S1E2

  INKURU S01 EP01
  INKURU S01 EP02

  INKURU Episode 1
  INKURU Episode 2

  INKURU EP 1
  INKURU EP 2

  INKURU EP FINAL
  INKURU FINAL

  byose -> INKURU
*/

const normalizeStoryHead = (head = "") => {
  let title = String(head).trim();

  if (!title) return "";

  // Remove text inside parentheses
  title = title.replace(/\([^)]*\)/g, " ");

  // S01E01, S1E1, S02E10
  title = title.replace(
    /\bS\s*0*\d+\s*E\s*0*\d+\b/gi,
    " "
  );

  // S01, S1, Season 01, Season 1
  title = title.replace(
    /\b(?:S|SEASON)\s*0*\d+\b/gi,
    " "
  );

  // EP1, EP01, EP 1, Episode 1
  title = title.replace(
    /\b(?:EPISODE|EP)\s*0*(?:\d+|FINAL|FINALL|FINALLY|GINAL|FINNALL)\b/gi,
    " "
  );

  // Part 1, Part 01, PART 2
  title = title.replace(
    /\bPART\s*0*\d+\b/gi,
    " "
  );

  // Standalone final
  title = title.replace(
    /\b(?:FINAL|FINALL|FINALLY|GINAL|FINNALL)\b/gi,
    " "
  );

  // Clean separators
  title = title.replace(
    /[-_:|]+/g,
    " "
  );

  // Clean spaces
  title = title
    .replace(/\s+/g, " ")
    .trim();

  return title || "Untitled Story";
};

/* =========================================================
   GET EPISODE NUMBER
========================================================= */

const getEpisodeNumber = (head = "") => {
  const value = String(head);

  /*
    S01E05
    S1E5
  */

  const seasonEpisodeMatch =
    value.match(
      /\bS\s*0*\d+\s*E\s*0*(\d+)\b/i
    );

  if (seasonEpisodeMatch) {
    return Number(
      seasonEpisodeMatch[1]
    );
  }

  /*
    EP01
    EP 01
    EPISODE 01
  */

  const episodeMatch =
    value.match(
      /\b(?:EPISODE|EP)\s*0*(\d+)\b/i
    );

  if (episodeMatch) {
    return Number(
      episodeMatch[1]
    );
  }

  return null;
};

/* =========================================================
   FINAL EPISODE
========================================================= */

const isFinalEpisode = (head = "") => {
  return /\b(?:FINAL|FINALL|FINALLY|GINAL|FINNALL)\b/i.test(
    String(head)
  );
};

/* =========================================================
   FIRESTORE DATE TO NUMBER
========================================================= */

const getCreatedAtTime = (value) => {
  if (!value) {
    return 0;
  }

  /*
    Firestore Timestamp
  */

  if (
    typeof value === "object" &&
    typeof value.toMillis === "function"
  ) {
    return value.toMillis();
  }

  /*
    Timestamp-like object
  */

  if (
    typeof value === "object" &&
    typeof value.seconds === "number"
  ) {
    return (
      value.seconds * 1000 +
      Math.floor(
        Number(value.nanoseconds || 0) /
          1000000
      )
    );
  }

  /*
    Date object
  */

  if (value instanceof Date) {
    return value.getTime();
  }

  /*
    String / number
  */

  const time =
    new Date(value).getTime();

  return Number.isNaN(time)
    ? 0
    : time;
};

/* =========================================================
   SERIALIZE POST
========================================================= */

const serializePost = (
  document
) => {
  const data =
    document.data();

  return {
    id: document.id,

    head:
      data.head || "",

    title:
      data.title || "",

    story:
      data.story || "",

    description:
      data.description || "",

    category:
      data.categories ||
      data.category ||
      "",

    image:
      data.imageUrl ||
      data.image ||
      data.cover ||
      "/cover.jpg",

    views:
      Number(data.views || 0),

    author:
      data.author || "",

    createdAt:
      getCreatedAtTime(
        data.createdAt
      ),
  };
};

/* =========================================================
   GET AUTHOR NAME KEY
========================================================= */

const normalizeName = (
  value = ""
) => {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
};

/* =========================================================
   FIND AUTHOR IN SNAPSHOT
========================================================= */

const findAuthorInSnapshot = (
  snapshot,
  requestedUsername
) => {
  const requested =
    normalizeName(
      requestedUsername
    );

  const match =
    snapshot.docs.find(
      (document) => {
        const data =
          document.data();

        const name =
          data.name ||
          data.username ||
          document.id ||
          "";

        return (
          normalizeName(name) ===
          requested
        );
      }
    );

  if (!match) {
    return null;
  }

  const data =
    match.data();

  return {
    id: match.id,
    ...data,
  };
};

/* =========================================================
   GROUP POSTS INTO STORIES
========================================================= */

const groupPostsIntoStories = (
  rawPosts
) => {
  const groups = {};

  rawPosts.forEach(
    (post) => {
      const storyTitle =
        normalizeStoryHead(
          post.head
        );

      if (!storyTitle) {
        return;
      }

      const key =
        storyTitle.toLowerCase();

      if (!groups[key]) {
        groups[key] = {
          title: storyTitle,

          id: post.id,

          image:
            post.image ||
            "/cover.jpg",

          description:
            post.description ||
            "",

          category:
            post.category ||
            "",

          episodes: [],

          views: 0,

          latestCreatedAt:
            0,
        };
      }

      const group =
        groups[key];

      group.episodes.push(
        post
      );

      group.views +=
        Number(post.views || 0);

      /*
        Use first available
        image.
      */

      if (
        (!group.image ||
          group.image ===
            "/cover.jpg") &&
        post.image
      ) {
        group.image =
          post.image;
      }

      /*
        Use first available
        description.
      */

      if (
        !group.description &&
        post.description
      ) {
        group.description =
          post.description;
      }

      /*
        Use first available
        category.
      */

      if (
        !group.category &&
        post.category
      ) {
        group.category =
          post.category;
      }

      /*
        Latest episode date.
      */

      const createdAt =
        Number(
          post.createdAt || 0
        );

      if (
        createdAt >
        group.latestCreatedAt
      ) {
        group.latestCreatedAt =
          createdAt;
      }
    }
  );

  /*
    Convert object to array.
  */

  return Object.values(
    groups
  )
    .map((story) => {
      /*
        Sort episodes by
        episode number.
      */

      story.episodes.sort(
        (a, b) => {
          const aNumber =
            getEpisodeNumber(
              a.head
            );

          const bNumber =
            getEpisodeNumber(
              b.head
            );

          /*
            Both numbered.
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
            Numbered before Final.
          */

          if (
            aNumber !== null
          ) {
            return -1;
          }

          if (
            bNumber !== null
          ) {
            return 1;
          }

          /*
            Final after other
            unnumbered episodes.
          */

          const aFinal =
            isFinalEpisode(
              a.head
            );

          const bFinal =
            isFinalEpisode(
              b.head
            );

          if (
            aFinal &&
            !bFinal
          ) {
            return 1;
          }

          if (
            !aFinal &&
            bFinal
          ) {
            return -1;
          }

          return (
            Number(
              a.createdAt || 0
            ) -
            Number(
              b.createdAt || 0
            )
          );
        }
      );

      /*
        Use the first episode
        as story metadata source
        if description/image is
        missing.
      */

      const firstEpisode =
        story.episodes[0];

      if (
        firstEpisode
      ) {
        if (
          (!story.image ||
            story.image ===
              "/cover.jpg") &&
          firstEpisode.image
        ) {
          story.image =
            firstEpisode.image;
        }

        if (
          !story.description &&
          firstEpisode.description
        ) {
          story.description =
            firstEpisode.description;
        }

        if (
          !story.category &&
          firstEpisode.category
        ) {
          story.category =
            firstEpisode.category;
        }
      }

      return story;
    })
    .sort(
      (a, b) =>
        b.latestCreatedAt -
        a.latestCreatedAt
    );
};

/* =========================================================
   SERVER SIDE
========================================================= */

export async function getServerSideProps(
  context
) {
  try {
    /*
      Get username from URL.
    */

    const rawUsername =
      Array.isArray(
        context.params?.username
      )
        ? context.params.username[0]
        : context.params?.username;

    if (
      typeof rawUsername !==
      "string"
    ) {
      return {
        notFound: true,
      };
    }

    const username =
      decodeURIComponent(
        rawUsername
      ).trim();

    if (!username) {
      return {
        notFound: true,
      };
    }

    /*
      =====================================
      FIND AUTHOR
      =====================================
    */

    let author = null;

    /*
      AUTHORS COLLECTION
    */

    const authorsSnap =
      await getDocs(
        collection(
          db,
          "authors"
        )
      );

    author =
      findAuthorInSnapshot(
        authorsSnap,
        username
      );

    /*
      TEAM COLLECTION
    */

    if (!author) {
      const teamSnap =
        await getDocs(
          collection(
            db,
            "Team"
          )
        );

      author =
        findAuthorInSnapshot(
          teamSnap,
          username
        );
    }

    /*
      POSTS COLLECTION
      If author does not exist
      in authors/team, find an
      author from posts.
    */

    let allPostsSnap = null;

    if (!author) {
      allPostsSnap =
        await getDocs(
          collection(
            db,
            "posts"
          )
        );

      const matchingPost =
        allPostsSnap.docs.find(
          (document) => {
            const data =
              document.data();

            return (
              normalizeName(
                data.author ||
                  ""
              ) ===
              normalizeName(
                username
              )
            );
          }
        );

      if (matchingPost) {
        const authorNameFromPost =
          matchingPost.data()
            .author;

        /*
          Try authors collection
          again using actual name.
        */

        author =
          findAuthorInSnapshot(
            authorsSnap,
            authorNameFromPost
          );

        /*
          If still not found,
          create a basic author
          profile.
        */

        if (!author) {
          author = {
            name:
              authorNameFromPost,

            bio:
              `${authorNameFromPost} ni umwe mu banditsi ba New Talents Stories Group.`,

            photo:
              "/avatar.png",
          };
        }
      }
    }

    /*
      Author still not found.
    */

    if (!author) {
      return {
        notFound: true,
      };
    }

    /*
      Actual author name.
    */

    const actualName =
      String(
        author.name ||
          author.username ||
          username
      ).trim();

    /*
      =====================================
      GET POSTS
      =====================================
    */

    let postsSnap =
      await getDocs(
        query(
          collection(
            db,
            "posts"
          ),
          where(
            "author",
            "==",
            actualName
          )
        )
      );

    /*
      If exact match failed,
      perform case-insensitive
      search.
    */

    let rawPosts = [];

    if (
      !postsSnap.empty
    ) {
      rawPosts =
        postsSnap.docs.map(
          serializePost
        );
    } else {
      /*
        Reuse allPostsSnap if
        already loaded.
      */

      if (!allPostsSnap) {
        allPostsSnap =
          await getDocs(
            collection(
              db,
              "posts"
            )
          );
      }

      const actualNameNormalized =
        normalizeName(
          actualName
        );

      const matchedPosts =
        allPostsSnap.docs.filter(
          (document) => {
            const data =
              document.data();

            return (
              normalizeName(
                data.author ||
                  ""
              ) ===
              actualNameNormalized
            );
          }
        );

      rawPosts =
        matchedPosts.map(
          serializePost
        );
    }

    /*
      =====================================
      TOTAL VIEWS
      =====================================
    */

    const totalViews =
      rawPosts.reduce(
        (total, post) =>
          total +
          Number(
            post.views || 0
          ),
        0
      );

    /*
      =====================================
      GROUP STORIES
      =====================================
    */

    const posts =
      groupPostsIntoStories(
        rawPosts
      );

    /*
      =====================================
      GET FOLLOWERS
      =====================================
    */

    let followersSnap =
      await getDocs(
        query(
          collection(
            db,
            "authorFollowers"
          ),
          where(
            "author",
            "==",
            actualName
          )
        )
      );

    let totalFollowers =
      followersSnap.size;

    /*
      Case-insensitive fallback.
    */

    if (
      followersSnap.empty
    ) {
      const allFollowersSnap =
        await getDocs(
          collection(
            db,
            "authorFollowers"
          )
        );

      const matchedFollowers =
        allFollowersSnap.docs.filter(
          (document) => {
            const data =
              document.data();

            return (
              normalizeName(
                data.author ||
                  ""
              ) ===
              normalizeName(
                actualName
              )
            );
          }
        );

      totalFollowers =
        matchedFollowers.length;
    }

    /*
      =====================================
      AUTHOR DATA
      =====================================
    */

    const finalAuthor = {
      ...author,

      name: actualName,

      photo:
        author.photo ||
        author.imageUrl ||
        author.image ||
        "/avatar.png",

      bio:
        author.bio ||
        `${actualName} ni umwe mu banditsi ba New Talents Stories Group.`,
    };

    /*
      =====================================
      RETURN
      =====================================
    */

    return {
      props: {
        author: finalAuthor,

        posts,

        totalStories:
          posts.length,

        totalViews,

        totalFollowers,
      },
    };
  } catch (error) {
    console.error(
      "Author page SSR error:",
      error
    );

    return {
      notFound: true,
    };
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function Author({
  author,
  posts,
  totalStories,
  totalViews,
  totalFollowers,
}) {
  const { t } = useI18n();

  const authorPhoto =
    author.photo ||
    author.imageUrl ||
    author.image ||
    "/avatar.png";

  const authorBio =
    author.bio ||
    `${author.name} ni umwe mu banditsi ba New Talents Stories Group.`;

  return (
    <>
      <Head>
        <title>{t("{name} | New Talents Stories Group", { name: author.name })}</title>

        <meta
          name="description"
          content={authorBio}
        />

        <meta
          property="og:title"
          content={`${author.name} | New Talents Stories Group`}
        />

        <meta
          property="og:description"
          content={authorBio}
        />

        <meta
          property="og:image"
          content={authorPhoto}
        />

        <link
          rel="canonical"
          href={`https://www.newtalentsg.co.rw/author/${encodeURIComponent(
            author.name
          )}`}
        />
      </Head>

      <main
        className={
          styles.container
        }
      >
        {/* =================================================
            PROFILE HEADER
        ================================================= */}

        <section
          className={
            styles.profileCard
          }
        >
          <img
            src={authorPhoto}
            alt={t("Ifoto ya {name}", { name: author.name })}
            className={
              styles.avatar
            }
            loading="eager"
            decoding="async"
          />

          <div
            className={
              styles.profileInfo
            }
          >
            <h1
              className={
                styles.name
              }
            >
              {author.name}

              {author.badge ===
                "verified" && (
                <FaCheckCircle
                  className={
                    styles.verified
                  }
                  aria-label={t("Verified author")}
                />
              )}
            </h1>

            {author.role && (
              <p
                className={
                  styles.role
                }
              >
                {author.role}
              </p>
            )}

            <p
              className={
                styles.bio
              }
            >
              {authorBio}
            </p>

            {/* =============================================
                SOCIAL LINKS
            ============================================= */}

            <div
              className={
                styles.socials
              }
            >
              {author.whatsapp && (
                <a
                  href={`https://wa.me/${String(
                    author.whatsapp
                  ).replace(
                    /\D/g,
                    ""
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.socialLink} ${styles.socialWhatsapp}`}
                  aria-label={t("WhatsApp")}
                >
                  <FaWhatsapp />
                </a>
              )}

              {author.facebook && (
                <a
                  href={author.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.socialLink} ${styles.socialFacebook}`}
                  aria-label={t("Facebook")}
                >
                  <FaFacebook />
                </a>
              )}

              {author.instagram && (
                <a
                  href={author.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.socialLink} ${styles.socialInstagram}`}
                  aria-label={t("Instagram")}
                >
                  <FaInstagram />
                </a>
              )}

              {author.twitter && (
                <a
                  href={author.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.socialLink} ${styles.socialTwitter}`}
                  aria-label={t("X / Twitter")}
                >
                  <FaXTwitter />
                </a>
              )}
            </div>
          </div>
        </section>

        {/* =================================================
            STATISTICS
        ================================================= */}

        <section
          className={
            styles.statsGrid
          }
          aria-label={t("Author statistics")}
        >
          <div
            className={
              styles.statCard
            }
          >
            <FaBook
              className={
                styles.statIcon
              }
              aria-hidden="true"
            />

            <h2
              className={
                styles.statNumber
              }
            >
              {formatNumber(
                totalStories
              )}
            </h2>

            <span
              className={
                styles.statLabel
              }
            >{t("Stories")}</span>
          </div>

          <div
            className={
              styles.statCard
            }
          >
            <FaEye
              className={
                styles.statIcon
              }
              aria-hidden="true"
            />

            <h2
              className={
                styles.statNumber
              }
            >
              {formatNumber(
                totalViews
              )}
            </h2>

            <span
              className={
                styles.statLabel
              }
            >{t("Views")}</span>
          </div>

          <div
            className={
              styles.statCard
            }
          >
            <FaUsers
              className={
                styles.statIcon
              }
              aria-hidden="true"
            />

            <h2
              className={
                styles.statNumber
              }
            >
              {formatNumber(
                totalFollowers
              )}
            </h2>

            <span
              className={
                styles.statLabel
              }
            >{t("Followers")}</span>
          </div>
        </section>

        {/* =================================================
            STORIES
        ================================================= */}

        <section
          className={
            styles.storySection
          }
        >
          <h2
            className={
              styles.sectionTitle
            }
          >{t("Inkuru zose za")}{" "}
            {author.name}
          </h2>

          {posts.length === 0 ? (
            <div
              className={
                styles.empty
              }
            >
              <h3
                className={
                  styles.emptyTitle
                }
              >{t("Nta nkuru ziraboneka")}</h3>

              <p
                className={
                  styles.emptyText
                }
              >{t("Uyu mwanditsi ntabwo arashyiraho inkuru kugeza ubu.")}</p>
            </div>
          ) : (
            <div
              className={
                styles.storyGrid
              }
            >
              {posts.map(
                (
                  story,
                  index
                ) => {
                  const description =
                    story.description ||
                    story.episodes?.[0]
                      ?.story ||
                    "";

                  const cleanDescription =
                    String(
                      description
                    )
                      .replace(
                        /<[^>]*>/g,
                        ""
                      )
                      .replace(
                        /\s+/g,
                        " "
                      )
                      .trim();

                  const shortDescription =
                    cleanDescription.length >
                    140
                      ? `${cleanDescription.slice(
                          0,
                          140
                        )}...`
                      : cleanDescription;

                  /*
                    Link to story using
                    normalized story title.

                    This ensures:
                    INKURU S01E01
                    INKURU S01E02
                    INKURU S1E1

                    all open the same
                    story page.
                  */

                  const storyUrl =
                    `/story/${encodeURIComponent(
                      story.title
                    )}`;

                  return (
                    <article
                      key={
                        `${story.title}-${story.id}-${index}`
                      }
                      className={
                        styles.storyCard
                      }
                    >
                      <Link
                        href={
                          storyUrl
                        }
                        className={
                          styles.storyLink
                        }
                      >
                        <img
                          src={
                            story.image ||
                            "/cover.jpg"
                          }
                          alt={
                            story.title
                          }
                          className={
                            styles.storyImage
                          }
                          loading={
                            index < 2
                              ? "eager"
                              : "lazy"
                          }
                          decoding="async"
                        />

                        <div
                          className={
                            styles.storyContent
                          }
                        >
                          <span
                            className={
                              styles.storyBadge
                            }
                          >{t("INKURU")}</span>

                          <h3
                            className={
                              styles.storyTitle
                            }
                          >
                            {
                              story.title
                            }
                          </h3>

                          {shortDescription && (
                            <p
                              className={
                                styles.storyDescription
                              }
                            >
                              {
                                shortDescription
                              }
                            </p>
                          )}

                          <div
                            className={
                              styles.storyMeta
                            }
                          >
                            <span
                              className={
                                styles.storyMetaItem
                              }
                            >
                              <FaBook
                                className={
                                  styles.storyMetaIcon
                                }
                                aria-hidden="true"
                              />

                              {
                                story
                                  .episodes
                                  .length
                              }{" "}
                              {story
                                .episodes
                                .length ===
                              1
                                ? t("Episode")
                                : t("Episodes")}
                            </span>

                            <span
                              className={
                                styles.storyMetaItem
                              }
                            >
                              <FaEye
                                className={
                                  styles.storyMetaIcon
                                }
                                aria-hidden="true"
                              />

                              {formatNumber(
                                story.views
                              )}
                            </span>

                            {story.category && (
                              <span
                                className={
                                  styles.storyMetaItem
                                }
                              >
                                {
                                  story.category
                                }
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
