// pages/post/[id].js
import { db } from "../../components/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";
import cookie from "cookie";
import Link from "next/link";
import { useEffect } from "react";
import { FaWhatsapp, FaFacebook, FaCopy } from "react-icons/fa";
import styles from "../../styles/read.module.css";
import { useI18n } from "@/i18n/I18nProvider";

// ===== PARSE HEAD =====
function parseHead(head) {
  const match = head?.match(/^(.*)\sS(\d+)\s?EP\s?(\d+)/i);
  if (!match) return null;
  return {
    title: match[1].trim(),
    season: parseInt(match[2]),
    episode: parseInt(match[3]),
  };
}

// ===== SSR =====
export async function getServerSideProps({ req, params }) {
  const { id } = params;

  if (!id) return { notFound: true };

  const cookies = cookie.parse(req.headers.cookie || "");

  let userCookie = null;
  try {
    userCookie = cookies.user ? JSON.parse(cookies.user) : null;
  } catch {
    userCookie = null;
  }

  if (!userCookie) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const username = userCookie.username;

  // MEMBERSHIP
  const q = query(collection(db, "members"), where("username", "==", username));
  const snapMembers = await getDocs(q);

  let isMember = false;
  let message = "";

  snapMembers.forEach((d) => {
    const data = d.data();

    let expires = new Date(0);
    try {
      if (data.subscriptionExpiresAt) {
        expires = data.subscriptionExpiresAt.toDate();
      }
    } catch {}

    if (data.isMember && expires > new Date()) {
      isMember = true;
    } else {
      message = "Membership yawe yararangiye cyangwa ntiyabonekaga.";
    }
  });

  // POST
  const postSnap = await getDoc(doc(db, "posts", id));
  if (!postSnap.exists()) return { notFound: true };

  const post = { id, ...postSnap.data() };
  const parsed = parseHead(post.head);

  let seriesPosts = [];
  let currentIndex = 0;

  if (parsed) {
    const allSnap = await getDocs(collection(db, "posts"));
    seriesPosts = allSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => {
        const pParsed = parseHead(p.head);
        return pParsed && pParsed.title === parsed.title;
      })
      .map((p) => ({ ...p, ...parseHead(p.head) }))
      .sort((a, b) =>
        a.season === b.season
          ? a.episode - b.episode
          : a.season - b.season
      );

    currentIndex = seriesPosts.findIndex((p) => p.id === id);
  }

  // COMMENTS
  const commentsSnap = await getDocs(
    query(collection(db, "posts", id, "comments"), orderBy("createdAt", "desc"))
  );

  const comments = commentsSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  return {
    props: {
      post,
      seriesPosts,
      currentIndex,
      comments,
      username,
      isMember,
      message,
    },
  };
}

// ===== COMPONENT =====
export default function ReadPage({
  post,
  seriesPosts,
  currentIndex,
  comments,
  username,
  isMember,
  message,
}) {
  const { t } = useI18n();

  const next = seriesPosts[currentIndex + 1];
  const prev = seriesPosts[currentIndex - 1];

  // ===== LOAD + SAVE PROGRESS =====
  useEffect(() => {
    // LOAD
    fetch(`/api/progress?username=${username}&postId=${post.id}`)
      .then((res) => res.json())
      .then((data) => {
        window.scrollTo(0, data.lastPosition || 0);
      });

    // SAVE (debounced)
    let timeout;

    const handleScroll = () => {
      clearTimeout(timeout);

      timeout = setTimeout(() => {
        fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            postId: post.id,
            lastPosition: window.scrollY,
          }),
        });
      }, 1000);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ALERT
  if (!isMember && typeof window !== "undefined") {
    setTimeout(() => alert(message), 500);
  }

  // COPY
  const handleCopy = async () => {
    const text = post.story
      ?.replace(/<[^>]+>/g, "")
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length)
      .join("\n\n");

    await navigator.clipboard.writeText(text);
    alert(t("Copied!"));
  };

  const link = `https://www.newtalentsg.co.rw/post/${post.id}`;
  const summary = post.story?.replace(/<[^>]+>/g, "").slice(0, 820);

  const shareWhatsApp = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(summary + " " + link)}`);

  const shareFacebook = () =>
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${link}`);

  // COMMENT
  const handleComment = async (e) => {
    e.preventDefault();
    if (!isMember) return;

    const text = e.target.comment.value.trim();
    if (!text) return;

    await addDoc(collection(db, "posts", post.id, "comments"), {
      text,
      author: username,
      createdAt: serverTimestamp(),
    });

    e.target.reset();
    location.reload();
  };

  return (
    <div className={styles.container}>
      <div className={styles.book}>
        <h1 className={styles.title}>{post.head}</h1>

        {post.image && <img src={post.image} className={styles.image} />}

        {isMember ? (
          <div
            className={styles.story}
            dangerouslySetInnerHTML={{ __html: post.story }}
          />
        ) : (
          <p className={styles.locked}>{t("Ugomba kuba member kugirango usome iyi nkuru.")}</p>
        )}

        {isMember && (
          <div className={styles.actions}>
            {prev && <Link href={`/post/${prev.id}`}>{t("← Prev")}</Link>}
            {next && <Link href={`/post/${next.id}`}>{t("Next →")}</Link>}

            <button onClick={handleCopy}>
              <FaCopy />{" "}{t("Copy")}</button>

            <button onClick={shareWhatsApp}>
              <FaWhatsapp />{" "}{t("WhatsApp")}</button>

            <button onClick={shareFacebook}>
              <FaFacebook />{" "}{t("Facebook")}</button>
          </div>
        )}

        <div className={styles.comments}>
          <h3>{t("Comments")}</h3>

          <form onSubmit={handleComment}>
            <input name="comment" placeholder={t("andika comment...")} />
            <button type="submit">{t("Send")}</button>
          </form>

          {comments.map((c) => (
            <div key={c.id}>
              <strong>{c.author || t("Anonymous")}:</strong> {c.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
