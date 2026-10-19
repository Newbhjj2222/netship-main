import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Script from "next/script";
import { db } from "@/components/firebase";
import styles from "@/styles/authors.module.css";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

import {
  FaUser,
  FaBook,
  FaEye,
  FaUsers,
  FaUserPlus,
  FaCheckCircle,
} from "react-icons/fa";
import { useI18n } from "@/i18n/I18nProvider";

// =========================
// FORMAT NUMBER
// =========================

function formatNumber(num = 0) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(".0", "") + "M";
  }

  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(".0", "") + "K";
  }

  return num;
}

// =========================
// SERVER SIDE
// =========================

export async function getServerSideProps() {
  try {
    // ----------------------
    // POSTS
    // ----------------------

    const postsSnap = await getDocs(
      query(collection(db, "posts"), orderBy("createdAt", "desc"))
    );

    // ----------------------
    // AUTHORS
    // ----------------------

    const authorsSnap = await getDocs(collection(db, "authors"));

    // ----------------------
    // FOLLOWERS
    // ----------------------

    const followersSnap = await getDocs(collection(db, "authorFollowers"));

    const authors = {};

    // ======================
    // COUNT STORIES + VIEWS
    // ======================

    postsSnap.forEach((doc) => {
      const post = doc.data();

      const author = post.author || "Unknown";

      if (!authors[author]) {
        authors[author] = {
          name: author,
          stories: 0,
          views: 0,
          followers: 0,
          badge: "unverified",
        };
      }

      authors[author].stories += 1;

      authors[author].views += post.views || 0;
    });

    // ======================
    // VERIFIED BADGE
    // ======================

    authorsSnap.forEach((doc) => {
      const data = doc.data();

      const username = data.name || data.username || doc.id;

      if (!authors[username]) {
        authors[username] = {
          name: username,
          stories: 0,
          views: 0,
          followers: 0,
          badge: "unverified",
        };
      }

      authors[username].badge = data.badge || "unverified";
    });

    // ======================
    // FOLLOWERS COUNT
    // ======================

    followersSnap.forEach((doc) => {
      const data = doc.data();

      const author = data.author;

      if (!authors[author]) {
        authors[author] = {
          name: author,
          stories: 0,
          views: 0,
          followers: 0,
          badge: "unverified",
        };
      }

      authors[author].followers += 1;
    });

    // ======================
    // SORT AUTHORS
    // ======================

    const authorList = Object.values(authors).sort(
      (a, b) => b.views - a.views
    );

    return {
      props: {
        authors: authorList,
        totalAuthors: authorList.length,
      },
    };
  } catch (error) {
    console.log(error);

    return {
      props: {
        authors: [],
        totalAuthors: 0,
      },
    };
  }
}

// ======================================================
// MAIN COMPONENT
// ======================================================

export default function Authors({ authors, totalAuthors }) {
  const { t } = useI18n();

  const [currentUser, setCurrentUser] = useState(null);
  const [following, setFollowing] = useState({});
  const [loading, setLoading] = useState("");

  // ===========================
  // GET LOGGED USER FROM COOKIE
  // ===========================

  useEffect(() => {
    const cookie = Cookies.get("user");

    if (!cookie) return;

    try {
      const user = JSON.parse(cookie);
      setCurrentUser(user);
    } catch (err) {
      console.log(err);
    }
  }, []);

  // ===========================
  // LOAD FOLLOWING AUTHORS
  // ===========================

  useEffect(() => {
    if (!currentUser) return;

    async function loadFollowing() {
      try {
        const snap = await getDocs(collection(db, "authorFollowers"));

        const data = {};

        snap.forEach((doc) => {
          const follow = doc.data();

          if (follow.followerUid === currentUser.uid) {
            data[follow.author] = true;
          }
        });

        setFollowing(data);
      } catch (err) {
        console.log(err);
      }
    }

    loadFollowing();
  }, [currentUser]);

  // ===========================
  // FOLLOW AUTHOR
  // ===========================

  async function followAuthor(authorName) {
    if (!currentUser) {
      window.location.href = "/login";
      return;
    }

    if (following[authorName]) return;

    try {
      setLoading(authorName);

      const followId = `${authorName}_${currentUser.uid}`;

      await setDoc(doc(db, "authorFollowers", followId), {
        author: authorName,
        followerUid: currentUser.uid,
        followerUsername: currentUser.username,
        followerName: currentUser.fName,
        followerEmail: currentUser.email,
        createdAt: new Date(),
      });

      setFollowing((prev) => ({
        ...prev,
        [authorName]: true,
      }));

      setLoading("");
    } catch (err) {
      console.log(err);
      setLoading("");
    }
  }

  // ===========================
  // UNFOLLOW AUTHOR
  // ===========================

  async function unfollowAuthor(authorName) {
    if (!currentUser) return;

    try {
      setLoading(authorName);

      const followId = `${authorName}_${currentUser.uid}`;

      await deleteDoc(doc(db, "authorFollowers", followId));

      const copy = {
        ...following,
      };

      delete copy[authorName];

      setFollowing(copy);

      setLoading("");
    } catch (err) {
      console.log(err);
      setLoading("");
    }
  }

  // ===========================
  // PAGE UI
  // ===========================

  return (
    <>
      <Head>
        <title>{t("Abanditsi b'Inkuru | Authors | New Talents Stories Group")}</title>

        <meta
          name="description"
          content={`Menya abanditsi ${totalAuthors}+ b'inkuru kuri New Talents Stories Group. Reba abanditsi b'abahanga bandika inkuru z'urukundo, ubuzima, amateka, drama, adventure n'izindi nkuru mu Kinyarwanda. Kurikira umwanditsi ukunda kandi usome ibikorwa bye.`}
        />

        <meta
          name="keywords"
          content="
abanditsi b'inkuru,
authors in Rwanda,
Kinyarwanda writers,
abahanzi b'inkuru,
inkuru nyarwanda,
stories in Rwanda,
online stories Rwanda,
New Talents Stories Group,
abasomyi,
writers platform,
African writers,
fiction authors,
romance writers,
drama stories,
historical stories
"
        />

        <link rel="canonical" href="https://www.newtalentsg.co.rw/authors" />

        <meta
          property="og:title"
          content="Abanditsi b'Inkuru | New Talents Stories Group"
        />

        <meta
          property="og:description"
          content="Shakisha kandi ukurikirane abanditsi b'inkuru kuri New Talents Stories Group."
        />

        <meta property="og:type" content="website" />

        <meta
          property="og:url"
          content="https://www.newtalentsg.co.rw/authors"
        />

        <meta
          property="og:image"
          content="https://www.newtalentsg.co.rw/logo.png"
        />

        <meta name="twitter:card" content="summary_large_image" />

        <meta
          name="twitter:title"
          content="Abanditsi b'Inkuru | New Talents Stories Group"
        />

        <meta
          name="twitter:description"
          content="Menya abanditsi, inkuru zabo n'abasomyi babakurikirana."
        />

        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />

        <meta name="author" content="New Talents Stories Group" />

        <Script
          id="authors-schema"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "CollectionPage",
                  name: "Abanditsi b'Inkuru",
                  url: "https://www.newtalentsg.co.rw/authors",
                  description:
                    "Urutonde rw'abanditsi bandika inkuru kuri New Talents Stories Group.",
                  about: {
                    "@type": "CreativeWork",
                    name: "Kinyarwanda Stories",
                  },
                },
                {
                  "@type": "Organization",
                  name: "New Talents Stories Group",
                  url: "https://www.newtalentsg.co.rw",
                  logo: "https://www.newtalentsg.co.rw/logo.png",
                },
              ],
            }),
          }}
        />

        <Script
          id="breadcrumb-schema"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: "https://www.newtalentsg.co.rw",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Authors",
                  item: "https://www.newtalentsg.co.rw/authors",
                },
              ],
            }),
          }}
        />
      </Head>

      <div className={styles.container}>
        <div className={styles.header}>
          <h1>{t("✍️ Abanditsi b'Inkuru Nyarwanda | Authors")}</h1>

          <p>{t("Menya abanditsi b'inkuru nyarwanda kuri New Talents Stories Group. Soma ibikorwa byabo, inkuru z'urukundo, drama, adventure, amateka n'ibindi bihangano byanditswe n'abanditsi bacu. Kurikirana umwanditsi ukunda kugira ngo ubone inkuru nshya.")}</p>

          <section className={styles.aiSummary}>
            <p>{t("New Talents Stories Group ni urubuga ruhuza abasomyi n'abanditsi b'inkuru nyarwanda. Abanditsi bashobora gusangiza abasomyi inkuru zabo, naho abasomyi bagakurikirana abanditsi bakunda kandi bagasoma ibihangano byabo.")}</p>
          </section>
        </div>

        <div className={styles.grid}>
          {authors.map((author) => (
            <div
              key={author.name}
              className={styles.card}
              itemScope
              itemType="https://schema.org/Person"
            >
              <div className={styles.avatar}>
                <FaUser />
              </div>

              <h2 className={styles.name} itemProp="name">
                <Script
                  id={`author-${author.name}`}
                  type="application/ld+json"
                  strategy="afterInteractive"
                  dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                      "@context": "https://schema.org",
                      "@type": "Person",
                      name: author.name,
                      url: `https://www.newtalentsg.co.rw/author/${encodeURIComponent(
                        author.name
                      )}`,
                      jobTitle: "Author and Story Writer",
                      knowsAbout: [
                        "Kinyarwanda stories",
                        "Creative writing",
                        "Fiction",
                        "Drama",
                        "Romance",
                      ],
                      worksFor: {
                        "@type": "Organization",
                        name: "New Talents Stories Group",
                      },
                    }),
                  }}
                />

                {author.name}

                {author.badge === "verified" && (
                  <FaCheckCircle className={styles.verified} />
                )}
              </h2>

              <div className={styles.stats}>
                <div>
                  <FaBook />
                  <span>{t("{Number} Stories", { Number: formatNumber(author.stories) })}</span>
                </div>

                <div>
                  <FaEye />
                  <span>{t("{Number} Views", { Number: formatNumber(author.views) })}</span>
                </div>

                <div>
                  <FaUsers />
                  <span>{t("{Number} Followers", { Number: formatNumber(author.followers) })}</span>
                </div>
              </div>

              <button
                className={styles.followBtn}
                disabled={loading === author.name}
                onClick={() =>
                  following[author.name]
                    ? unfollowAuthor(author.name)
                    : followAuthor(author.name)
                }
              >
                <FaUserPlus />
                {loading === author.name
                  ? t("Loading...")
                  : following[author.name]
                  ? t("Following")
                  : t("Follow")}
              </button>

              <Link
                href={`/author/${encodeURIComponent(author.name)}`}
                className={styles.profileBtn}
              >{t("Reba Page")}</Link>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
