// pages/index.js
import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import * as cookie from "cookie";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/components/firebase";
import styles from "@/styles/index.module.css";
import { FaEye, FaComments, FaEdit, FaTrash } from "react-icons/fa";
import LinkComponent from "../../components/Link";
import WritingCoach from "@/components/WritingCoach";
import { useI18n } from "@/i18n/I18nProvider";

/* ======================
   HELPERS
====================== */
const stripHTML = (html = "") => html.replace(/<[^>]*>/g, "");

/* ======================
   PAGE
====================== */
export default function Home({
  initialPosts,
  totalPosts: initialTotalPosts,
  totalViews: initialTotalViews,
  username,
}) {
  const { t } = useI18n();

  const router = useRouter();

  const [posts, setPosts] = useState(initialPosts);
  const [lastDoc, setLastDoc] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === 40);
  const [search, setSearch] = useState("");
  const [loadingComments, setLoadingComments] = useState({});
  const [totalPosts, setTotalPosts] = useState(initialTotalPosts);
  const [totalViews, setTotalViews] = useState(initialTotalViews);

  /* ======================
     LOAD COMMENTS (ONCE)
  ====================== */
  useEffect(() => {
    const loadComments = async () => {
      for (const post of posts) {
        if (post.commentsLoaded) continue;

        setLoadingComments((p) => ({ ...p, [post.id]: true }));

        try {
          const ref = collection(db, "posts", post.id, "comments");
          const snap = await getDocs(ref);

          const comments = snap.docs.map((d) => ({
            id: d.id,
            author: d.data().author || "Unknown",
            text: d.data().text || "",
          }));

          setPosts((prev) =>
            prev.map((p) =>
              p.id === post.id
                ? {
                    ...p,
                    comments,
                    totalComments: comments.length,
                    commentsLoaded: true,
                  }
                : p
            )
          );
        } catch (err) {
          console.error("Comments error:", err);
        } finally {
          setLoadingComments((p) => ({ ...p, [post.id]: false }));
        }
      }
    };

    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ======================
     FILTER
  ====================== */
  const filteredPosts = posts.filter((p) =>
    (p.head || "").toLowerCase().includes(search.toLowerCase())
  );

  /* ======================
     ACTIONS
  ====================== */
  const handleEdit = (id) => router.push(`dashboard/Editor?id=${id}`);

  const handleDelete = async (id) => {
    if (!confirm(t("Are you sure you want to delete this post?"))) return;

    try {
      const commentsRef = collection(db, "posts", id, "comments");
      const commentsSnap = await getDocs(commentsRef);

      for (const c of commentsSnap.docs) {
        await deleteDoc(doc(db, "posts", id, "comments", c.id));
      }

      await deleteDoc(doc(db, "posts", id));

      const deleted = posts.find((p) => p.id === id);

      setPosts((prev) => prev.filter((p) => p.id !== id));
      setTotalPosts((p) => p - 1);
      setTotalViews((v) => v - (deleted?.views || 0));

      alert(t("Post deleted"));
    } catch (err) {
      console.error(err);
      alert(t("Error deleting post"));
    }
  };

  /* ======================
     LOAD MORE
  ====================== */
  const loadMorePosts = async () => {
    if (!hasMore || loadingMore) return;

    setLoadingMore(true);

    try {
      const ref = collection(db, "posts");

      const q = query(
        ref,
        where("author", "==", username),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(40)
      );

      const snap = await getDocs(q);

      const newPosts = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          head: data.head || "",
          story: data.story || "",
          category: data.categories || "",
          image: data.imageUrl || null,
          views: data.views || 0,
          comments: [],
          totalComments: 0,
          commentsLoaded: false,
        };
      });

      setPosts((prev) => [...prev, ...newPosts]);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === 40);
    } catch (err) {
      console.error("Pagination error:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  /* ======================
     RENDER
  ====================== */
  return (
    <>
      <Head>
  <title>{t("Author Dashboard")}</title>

  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": `https://www.newtalentsg.co.rw/author/${username}#person`,
        "name": username,
        "url": `https://www.newtalentsg.co.rw/author/${username}`,
        "worksFor": {
          "@type": "Organization",
          "name": "New Talents Stories Group",
          "url": "https://www.newtalentsg.co.rw"
        }
      })
    }}
  />
</Head>
<LinkComponent />
      <div className={styles.container}>

        {/* STATS */}
        <div className={styles.cards}>
          <div className={styles.card}>
            <h3>{t("Total Posts")}</h3>
            <p>{totalPosts}</p>
          </div>
          <div className={styles.card}>
            <h3>{t("Total Views")}</h3>
            <p>{totalViews}</p>
          </div>
        </div>
<WritingCoach />
        {/* SEARCH */}
        <input
          className={styles.search}
          placeholder={t("Search posts...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* POSTS */}
        <div className={styles.postsList}>
          {filteredPosts.map((post) => (
            <div key={post.id} className={styles.postCard}>
              {post.image && (
                <img src={post.image} className={styles.postImage} alt="" />
              )}

              <h2>{post.head}</h2>

              <p>
                {stripHTML(post.story).slice(0, 400)}
                {post.story.length > 400 && "..."}
              </p>

              <p>
                <strong>{t("Category:")}</strong> {post.category}
              </p>

              <p>
                <FaEye /> {post.views} &nbsp;&nbsp;
                <FaComments />{" "}
                {loadingComments[post.id]
                  ? t("Loading...")
                  : post.totalComments}
              </p>

              <div className={styles.actions}>
                <button onClick={() => handleEdit(post.id)}>
                  <FaEdit />{" "}{t("Edit")}</button>
                <button onClick={() => handleDelete(post.id)}>
                  <FaTrash />{" "}{t("Delete")}</button>
              </div>

              {post.commentsLoaded && post.comments.length > 0 && (
                <div className={styles.commentsList}>
                  {post.comments.map((c) => (
                    <div key={c.id}>
                      <strong>{c.author}:</strong> {c.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* LOAD MORE */}
        {hasMore && (
          <button
            className={styles.loadMoreBtn}
            onClick={loadMorePosts}
            disabled={loadingMore}
          >
            {loadingMore ? t("Loading...") : t("Reba izindi")}
          </button>
        )}
      </div>
    </>
  );
}

/* ======================
   SERVER SIDE
====================== */
export async function getServerSideProps(context) {
  const cookies = cookie.parse(
    context.req.headers.cookie || ""
  );

  let user = null;
  let username = null;

  if (cookies.user) {
    try {
      user = JSON.parse(cookies.user);
      username = user.username;
    } catch (error) {
      console.error("Cookie parse error:", error);
    }
  }

  if (!username) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }
  const ref = collection(db, "posts");

  const firstQuery = query(
    ref,
    where("author", "==", username),
    orderBy("createdAt", "desc"),
    limit(40)
  );

  const snap = await getDocs(firstQuery);

  const initialPosts = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      head: data.head || "",
      story: data.story || "",
      category: data.categories || "",
      image: data.imageUrl || null,
      views: data.views || 0,
      comments: [],
      totalComments: 0,
      commentsLoaded: false,
    };
  });

  let totalViews = 0;
  const allSnap = await getDocs(query(ref, where("author", "==", username)));
  allSnap.forEach((d) => (totalViews += d.data().views || 0));

  return {
    props: {
      initialPosts,
      totalPosts: allSnap.size,
      totalViews,
      username,
    },
  };
}
