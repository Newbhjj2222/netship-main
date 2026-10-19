import Link from "next/link";
import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Hello from "../components/Hello";
import { db } from "../components/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import {
  FaUndo,
  FaFileContract,
  FaShieldAlt,
  FaCertificate,
  FaUsers,
  FaLifeRing,
} from "react-icons/fa";
import { FaLock, FaUnlock } from "react-icons/fa";
import AdsBanner from "@/components/AdsBanner";
import styles from "../styles/posts.module.css";
import Channel from "@/components/Channel";
import ContinueRead from "@/components/ContinueRead";
import { useI18n } from "../i18n/I18nProvider";

// ================= HELPERS =================

/**
 * Format a number to k/m format
 */
function formatNumber(num = 0) {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "m";
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return num;
}

/**
 * Calculate average rating
 */
function getAvgRating(total = 0, count = 0) {
  if (!count) return 0;
  return (total / count).toFixed(1);
}

/**
 * Normalize story title for grouping
 */
function normalizeStoryTitle(title = "") {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Clean story title by removing episode/part/season markers
 */
function cleanStoryTitle(head = "") {
  let title = String(head)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Season + Episode: S1E1, S01E01, S1 EP1, SEASON 1 EPISODE 1
  title = title.replace(
    /\s+(?:S(?:EASON)?\s*\d+)\s*(?:E|EP|EPISODE)\s*\.?\s*\d+\s*$/i,
    ""
  );

  // EP1, EP 01, EPISODE 1
  title = title.replace(
    /\s+(?:E|EP|EPISODE)\s*\.?\s*\d+\s*$/i,
    ""
  );

  // PART 1, PART 01, IGICE 1
  title = title.replace(
    /\s+(?:PART|IGICE)\s*\.?\s*\d+\s*$/i,
    ""
  );

  // 1 PART, 01 PART, 1 IGICE
  title = title.replace(
    /\s+\d+\s+(?:PART|IGICE)\s*$/i,
    ""
  );

  // FINAL EPISODE, LAST EPISODE
  title = title.replace(
    /\s+(?:THE\s+)?(?:FINAL|LAST)\s+(?:EPISODE|EP)\s*$/i,
    ""
  );

  // EPISODE FINAL, EP FINAL
  title = title.replace(
    /\s+(?:EPISODE|EP)\s+(?:THE\s+)?(?:FINAL|LAST)\s*$/i,
    ""
  );

  // FINAL PART, LAST PART
  title = title.replace(
    /\s+(?:THE\s+)?(?:FINAL|LAST)\s+(?:PART|IGICE)\s*$/i,
    ""
  );

  // PART FINAL, PART LAST
  title = title.replace(
    /\s+(?:PART|IGICE)\s+(?:THE\s+)?(?:FINAL|LAST)\s*$/i,
    ""
  );

  // FINAL, LAST
  title = title.replace(
    /\s+(?:THE\s+)?(?:FINAL|LAST)\s*$/i,
    ""
  );

  // Season only: S1, S01, SEASON 1
  title = title.replace(
    /\s+(?:S(?:EASON)?\s*\d+)\s*$/i,
    ""
  );

  return title
    .replace(/[\-_]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detect story type from post data
 */
function detectStoryType(post) {
  if (post.storyType) {
    return post.storyType;
  }

  const head = String(post.head || "");

  // S1E1, S01E01, S1 EP1, SEASON 1 EPISODE 1
  if (
    /\bS(?:EASON)?\s*\d+\s*(?:E|EP|EPISODE)\s*\.?\s*\d+\b/i.test(head)
  ) {
    return "series";
  }

  // EP1, EP 1, EPISODE 1
  if (/\b(?:E|EP|EPISODE)\s*\.?\s*\d+\b/i.test(head)) {
    return "series";
  }

  // PART 1, IGICE 1
  if (/\b(?:PART|IGICE)\s*\.?\s*\d+\b/i.test(head)) {
    return "parts";
  }

  // FINAL EPISODE, LAST EPISODE
  if (
    /\b(?:FINAL|LAST)\s+(?:EPISODE|EP)\b/i.test(head) ||
    /\b(?:EPISODE|EP)\s+(?:FINAL|LAST)\b/i.test(head)
  ) {
    return "series";
  }

  // FINAL PART, LAST PART
  if (
    /\b(?:FINAL|LAST)\s+(?:PART|IGICE)\b/i.test(head) ||
    /\b(?:PART|IGICE)\s+(?:FINAL|LAST)\b/i.test(head)
  ) {
    return "parts";
  }

  return "standalone";
}

// ================= SSR =================

export async function getServerSideProps() {
  try {
    const snapshot = await getDocs(
      query(collection(db, "posts"), orderBy("createdAt", "desc"))
    );

    const rawPosts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const grouped = {};

    rawPosts.forEach((post) => {
      const head = String(post.head || "").trim();

      // Story type
      const storyType = detectStoryType(post);

      // Clean title for grouping
      const cleanedTitle = cleanStoryTitle(head);
      let groupKey = normalizeStoryTitle(cleanedTitle);

      // Title
      let title = post.storyHead || post.storyTitle || cleanedTitle || head || "Untitled Story";

      if (post.storyHead || post.storyTitle) {
        title = cleanStoryTitle(title);
      }

      if (!title) {
        title = "Untitled Story";
      }

      // Create group if it doesn't exist
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          title,
          posts: [],
          author: post.author || "Unknown",
          categories: Array.isArray(post.categories) && post.categories.length
            ? post.categories
            : ["General"],
          totalViews: 0,
          totalRating: 0,
          ratingCount: 0,
          storyType,
          storyId: post.storyId || post.summaryId || groupKey,
          seasons: new Set(),
          episodeCount: 0,
          partCount: 0,
        };
      }

      // Add post to group
      grouped[groupKey].posts.push(post);

      // Update views
      grouped[groupKey].totalViews += Number(post.views || 0);

      // Update ratings
      grouped[groupKey].totalRating += Number(post.rating || 0);
      grouped[groupKey].ratingCount += Number(post.ratingCount || 0);

      // Update season
      if (post.season) {
        grouped[groupKey].seasons.add(post.season);
      }

      // Update episode count
      if (post.episodeNumber !== undefined && post.episodeNumber !== null) {
        grouped[groupKey].episodeCount++;
      }

      // Update part count
      if (post.partNumber !== undefined && post.partNumber !== null) {
        grouped[groupKey].partCount++;
      }
    });

    // Get authors and their badges
    const authorsSnap = await getDocs(collection(db, "authors"));
    const authorsMap = {};

    authorsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const name = data.name || doc.id;
      authorsMap[name] = data.badge || "unverified";
    });

    // Build folders array
    const folders = Object.values(grouped).map((g) => {
      const sorted = g.posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const isPremium = g.posts.some((p) => p.accessType === "paid");

      return {
        title: g.title,
        image: sorted[0]?.imageUrl || "",
        firstEpisodeId: sorted[0]?.id || null,
        author: g.author,
        categories: g.categories || [],
        totalViews: g.totalViews,
        rating: getAvgRating(g.totalRating, g.ratingCount),
        latestTime: sorted[0]?.createdAt || 0,
        badge: authorsMap[g.author] || "unverified",
        isPremium,
        storyType: g.storyType,
        storyId: g.storyId,
        seasons: g.seasons,
        episodeCount: g.episodeCount,
        partCount: g.partCount,
        totalParts: g.posts.length,
      };
    });

    return { props: { folders } };
  } catch (e) {
    console.error("Error fetching posts:", e);
    return { props: { folders: [] } };
  }
}

// ================= PAGE COMPONENT =================

export default function Posts({ folders }) {
  const router = useRouter();
  const { t } = useI18n();

  // Izina ry'icyiciro: rikoresha inkoranyamagambo, iyo ridahari rigasigara uko ryanditse muri database.
  const categoryLabel = (c) => {
    const key = `cat.${String(c).toLowerCase()}`;
    const label = t(key);
    return label === key ? c : label;
  };
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // ========== COMPONENTS ==========

  /**
   * Verified Badge
   */
  const VerifiedBadge = () => (
    <span className={styles.verifiedIcon}>
      <svg width="14" height="14" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="12" fill="#1877F2" />
        <path d="M7 12.5l3 3 7-7" stroke="white" strokeWidth="2" fill="none" />
      </svg>
    </span>
  );

  /**
   * Premium / Free Badge
   */
  const PremiumBadge = ({ isPremium }) => (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: "6px",
        fontSize: "11px",
        margin: "12px",
        fontWeight: "bold",
        background: isPremium ? "#dc2626" : "#16a34a",
        color: "#fff",
      }}
    >
      {isPremium ? t("home.premium") : t("home.free")}
    </span>
  );

  /**
   * Story Card - yikarita y'inkuru
   */
  const StoryCard = ({ story, showRank, rank, isNew }) => (
    <div className={styles.card}>
      {showRank && <div className={styles.rankBadge}>#{rank}</div>}

      {story.image && (
        <img
          src={story.image}
          className={styles.image}
          alt={story.title}
        />
      )}

      {isNew && <span className={styles.newBadge}>{t("home.new")}</span>}

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div>{story.title}</div>
        <PremiumBadge isPremium={story.isPremium} />
      </div>

      <div>
        ✍️ {story.author}{" "}
        {story.badge === "verified" && <VerifiedBadge />}
      </div>

      <div>
        👁 {formatNumber(story.totalViews)} {t("home.readers")}
        {!showRank && ` | ⭐ ${story.rating}`}
      </div>

      {showRank && <div>⭐ {story.rating}</div>}

      <Link href={`/story/${encodeURIComponent(story.title)}`}>
        <button className={styles.button}>{t("home.read")}</button>
      </Link>
    </div>
  );

  // ========== FILTERS & DATA ==========

  // Filter folders based on search and category
  const filtered = folders.filter((f) => {
    const q = search.toLowerCase();
    const matchSearch =
      f.title.toLowerCase().includes(q) ||
      f.author.toLowerCase().includes(q) ||
      (f.categories || []).some((c) => c.toLowerCase().includes(q));

    const matchCategory =
      activeCategory === "all" ||
      (f.categories || []).includes(activeCategory);

    return matchSearch && matchCategory;
  });

  // Trending stories (by views)
  const trending = [...filtered]
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 8);

  // Newest stories
  const newest = [...filtered]
    .sort((a, b) => new Date(b.latestTime) - new Date(a.latestTime))
    .slice(0, 8);

  // Other stories
  const others = filtered.filter(
    (f) => !trending.includes(f) && !newest.includes(f)
  );

  // Top authors
  const topAuthors = Object.values(
    filtered.reduce((acc, s) => {
      const a = s.author || "Unknown";
      if (!acc[a]) acc[a] = { name: a, totalViews: 0, stories: 0 };
      acc[a].totalViews += s.totalViews || 0;
      acc[a].stories += 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 10);

  // Categories list
  const categories = [
    "all", "General", "Love-Story", "Drama", "crime", "kingdom", "Kingdom",
    "Action", "Comedy", "sci-fi", "religion", "adventure",
    "Horror", "Mystery", "Urukundo", "Ibyaha", "politiki", "Educational",
    "Political", "Ubwoba", "ibyumwuka", "Igendo","family",
  ];

  // ========== RENDER ==========

  return (
    <>
      <Head>
        <title>{t("home.title")}</title>

        {/* SEO Description */}
        <meta
          name="description"
          content={t("home.description")}
        />

        {/* Favicon */}
        <link rel="icon" href="/logo.png" />

        {/* Canonical */}
        <link rel="canonical" href="https://www.newtalentsg.co.rw" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="New talents stories group" />
        <meta
          property="og:description"
          content={t("home.description")}
        />
        <meta property="og:url" content="https://www.newtalentsg.co.rw" />
        <meta property="og:image" content="https://www.newtalentsg.co.rw/logo.png" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="New talents stories group" />
        <meta
          name="twitter:description"
          content={t("home.description")}
        />
        <meta name="twitter:image" content="https://www.newtalentsg.co.rw/logo.png" />
        <meta property="fb:app_id" content="1373184784849782" />

        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "New Talents Stories Group",
              url: "https://www.newtalentsg.co.rw",
              logo: "https://www.newtalentsg.co.rw/logo.png",
              image: "https://www.newtalentsg.co.rw/logo.png",
              description:
                "New Talents Stories Group ni urubuga rwo gusoma no gutangaza inkuru z'Ikinyarwanda n'izindi ndimi, aho abanditsi bashobora no kwinjiza amafaranga.",
              email: "admin@newtalentsg.co.rw",
              sameAs: [
                "https://www.facebook.com/profile.php?id=61586794786482"
              ]
            }),
          }}
        />

        {/* FAQ Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "How do I read stories?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Create an account, buy NES Points, then start reading stories."
                  }
                },
                {
                  "@type": "Question",
                  "name": "How can I earn money as a writer?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Publish your stories and receive NES earnings from readers."
                  }
                },
                {
                  "@type": "Question",
                  "name": "What are NES Points?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "NES Points are used to unlock premium story episodes."
                  }
                }
              ]
            }),
          }}
        />

        {/* Website Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "New Talents Stories Group",
              url: "https://www.newtalentsg.co.rw",
              description:
                "Read Kinyarwanda stories online, publish your own stories and earn money with New Talents Stories Group.",
              inLanguage: ["en", "rw"],
              publisher: {
                "@type": "Organization",
                name: "New Talents Stories Group"
              },
              potentialAction: {
                "@type": "SearchAction",
                target: "https://www.newtalentsg.co.rw/?search={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            }),
          }}
        />
      </Head>

      <div className={styles.layout}>
        {/* ============================================
            LEFT SIDEBAR - Quick Links + ContinueRead
            ============================================ */}
        <aside className={styles.leftSidebar}>
          {/* Quick Links */}
          <h2 className={styles.logo}>{t("home.quickLinks")}</h2>

          <nav className={styles.quickLinks}>
            <Link href="/refund" className={styles.linkItem}>
              <FaUndo />
              <span>{t("home.refund")}</span>
            </Link>

            <Link href="/terms" className={styles.linkItem}>
              <FaFileContract />
              <span>{t("home.terms")}</span>
            </Link>

            <Link href="/privacy" className={styles.linkItem}>
              <FaShieldAlt />
              <span>{t("home.privacy")}</span>
            </Link>

            <Link href="/license" className={styles.linkItem}>
              <FaCertificate />
              <span>{t("home.licensing")}</span>
            </Link>

            <Link href="/join" className={styles.linkItem}>
              <FaUsers />
              <span>{t("home.membershipApplication")}</span>
            </Link>

            <Link href="/support" className={styles.linkItem}>
              <FaLifeRing />
              <span>{t("home.support")}</span>
            </Link>
          </nav>

          {/* ==========================================
              CONTINUE READING - Hano ni ho nashyize
              ========================================== */}
          <div className={styles.continueReadWrapper}>
            <ContinueRead />
          </div>
        </aside>

        {/* ============================================
            MAIN CONTENT
            ============================================ */}
        <main className={styles.main}>
          <h1>{t("NEW TALENTS STORIES GROUP")}</h1>

          <Hello />
          <Channel />

          {/* Search */}
          <input
            className={styles.search}
            placeholder={t("home.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Categories */}
          <div className={styles.categories}>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={activeCategory === c ? styles.activeCat : styles.cat}
              >
                {categoryLabel(c)}
              </button>
            ))}
          </div>

<ContinueRead />
          {/* Trending Section */}
          <h2>{t("home.trending")}</h2>
          <div className={styles.grid}>
            {trending.map((story, index) => (
              <StoryCard
                key={story.title}
                story={story}
                showRank
                rank={index + 1}
                isNew={false}
              />
            ))}
          </div>

          <AdsBanner />

          {/* New Stories Section */}
          <h3>{t("home.newStories")}</h3>
          <div className={styles.grid}>
            {newest.map((story) => (
              <StoryCard
                key={story.title}
                story={story}
                showRank={false}
                isNew
              />
            ))}
          </div>

          <AdsBanner />

          {/* Other Stories Section */}
          <h4>{t("home.otherStories")}</h4>
          <div className={styles.grid}>
            {others.map((story) => (
              <StoryCard
                key={story.title}
                story={story}
                showRank={false}
                isNew={false}
              />
            ))}
          </div>
        </main>

        {/* ============================================
            RIGHT SIDEBAR - Top Authors
            ============================================ */}
        <aside className={styles.rightSidebar}>
          <h2 className={styles.sidebarTitle}>{t("home.topAuthors")}</h2>

          <div className={styles.authorList}>
            {topAuthors.map((author, index) => (
              <div key={author.name} className={styles.authorItem}>
                <div className={styles.authorRank}>#{index + 1}</div>

                <div className={styles.authorAvatar}>
                  <span role="img" aria-label={t("author")}>✍️</span>
                </div>

                <div className={styles.authorInfo}>
                  <div className={styles.authorName}>{author.name}</div>
                  <div className={styles.authorStats}>
                    <span>👁 {formatNumber(author.totalViews)} {t("home.readers")}</span>
                    <span>📚 {author.stories} {t("home.stories")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
