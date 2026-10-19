// components/AdsBanner.js

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import styles from "./AdsBanner.module.css";
import {
  FaWhatsapp,
  FaExternalLinkAlt,
  FaPlayCircle,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import { useI18n } from "@/i18n/I18nProvider";


// ============================================================
// CONSTANTS
// ============================================================

// Buri ad imara amasegonda 15 gusa hanyuma ihite ihindura.
const AD_SLIDE_MS = 15000;

// Fade animation duration.
const FADE_MS = 300;


// ============================================================
// YOUTUBE HELPERS
// ============================================================

/*
|--------------------------------------------------------------------------
| GET YOUTUBE VIDEO ID
|
| Supports:
|
| https://youtu.be/KdR1AaVoqgg?si=...
| https://www.youtube.com/watch?v=KdR1AaVoqgg
| https://www.youtube.com/embed/KdR1AaVoqgg
| https://www.youtube.com/shorts/KdR1AaVoqgg
| https://www.youtube.com/v/KdR1AaVoqgg
| https://m.youtube.com/watch?v=KdR1AaVoqgg
|
| Returns "" when URL is not a valid YouTube URL.
|--------------------------------------------------------------------------
*/

function getYouTubeVideoId(url = "") {
  const str = String(url || "").trim();

  if (!str) return "";

  const embedMatch = str.match(
    /youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{6,})/i
  );
  if (embedMatch) return embedMatch[1];

  const shortMatch = str.match(
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/i
  );
  if (shortMatch) return shortMatch[1];

  const shortsMatch = str.match(
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/i
  );
  if (shortsMatch) return shortsMatch[1];

  const vMatch = str.match(
    /youtube\.com\/v\/([a-zA-Z0-9_-]{6,})/i
  );
  if (vMatch) return vMatch[1];

  const watchMatch = str.match(/[?&]v=([a-zA-Z0-9_-]{6,})/i);
  if (watchMatch) return watchMatch[1];

  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;

  return "";
}


/*
|--------------------------------------------------------------------------
| RESOLVE MEDIA TYPE
|
| Priority:
|   1. YouTube URL detected → "youtube"
|   2. ad.mediaType (video / image / youtube)
|   3. URL extension
|--------------------------------------------------------------------------
*/

function resolveMediaType(ad = {}) {
  const url = String(ad.mediaUrl || "").trim();

  if (url && getYouTubeVideoId(url)) {
    return "youtube";
  }

  if (ad.mediaType) {
    const type = String(ad.mediaType).toLowerCase().trim();
    if (type === "video" || type === "image" || type === "youtube") {
      return type;
    }
  }

  const lower = url.toLowerCase();

  if (
    lower.includes(".mp4") ||
    lower.includes(".webm") ||
    lower.includes(".ogg") ||
    lower.includes(".mov")
  ) {
    return "video";
  }

  return "image";
}


// ============================================================
// YOUTUBE AD PLAYER
//
// - Autoplay
// - Muted
// - No controls (ad-style)
// - Destroys itself on unmount
// ============================================================

function YouTubeAdPlayer({ videoId }) {
  const containerIdRef = useRef(
    `yt_banner_${Math.random().toString(36).slice(2, 11)}`
  );

  const playerRef = useRef(null);
  const destroyedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !videoId) return;

    destroyedRef.current = false;
    playerRef.current = null;

    const createPlayer = () => {
      if (destroyedRef.current) return;
      if (playerRef.current) return;

      const el = document.getElementById(containerIdRef.current);
      if (!el) return;

      playerRef.current = new window.YT.Player(el, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          mute: 1,            // muted autoplay (browser-friendly)
          controls: 0,        // hide controls (ad look)
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,  // hide annotations
          fs: 0,              // hide fullscreen button
          disablekb: 1,       // disable keyboard shortcuts
          loop: 1,
          playlist: videoId,  // needed for loop to work
        },
        events: {
          onReady: (event) => {
            try {
              event.target.mute();
              event.target.playVideo();
            } catch {
              /* silent */
            }
          },
        },
      });
    };

    const loadApi = () => {
      if (window.YT && window.YT.Player) {
        createPlayer();
        return;
      }

      const previous = window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        try {
          if (typeof previous === "function") previous();
        } catch {
          /* silent */
        }
        createPlayer();
      };

      const existing = document.querySelector(
        'script[src*="youtube.com/iframe_api"]'
      );

      if (!existing) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        tag.async = true;
        document.head.appendChild(tag);
      }
    };

    loadApi();

    return () => {
      destroyedRef.current = true;

      try {
        playerRef.current?.destroy?.();
      } catch {
        /* silent */
      }

      playerRef.current = null;
    };
  }, [videoId]);

  return (
    <div className={styles.youtubeWrapper}>
      <div
        id={containerIdRef.current}
        className={styles.youtubePlayer}
      />
    </div>
  );
}


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AdsBanner() {
  const { t } = useI18n();

  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentAd, setCurrentAd] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // === REFS ===
  const timeoutRef = useRef(null);
  const transitionTimeoutRef = useRef(null);


  // ===== FETCH ADS =====
  useEffect(() => {
    const fetchAds = async () => {
      try {
        setLoading(true);
        setError(null);

        const snap = await getDocs(collection(db, "ads"));

        const allAds = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log("📢 Total ads found:", allAds.length);

        const activeAds = allAds.filter((ad) => ad.active === true);

        console.log("📢 Active ads:", activeAds.length);

        activeAds.sort((a, b) => {
          const dateA = a.createdAt
            ? new Date(a.createdAt)
            : new Date(0);
          const dateB = b.createdAt
            ? new Date(b.createdAt)
            : new Date(0);
          return dateB - dateA;
        });

        const newAds = activeAds.slice(0, 5);

        // Pre-resolve media type so render is fast.
        const preparedAds = newAds.map((ad) => ({
          ...ad,
          _resolvedType: resolveMediaType(ad),
          _youtubeId:
            resolveMediaType(ad) === "youtube"
              ? getYouTubeVideoId(ad.mediaUrl)
              : "",
        }));

        setAds(preparedAds);
        setCurrentAd(0);
      } catch (err) {
        console.error("Error fetching ads:", err);
        setError(t("Habaye ikibazo mu kubona ads."));
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, []);


  // ===== AUTO SLIDE WITH FADE =====
  useEffect(() => {
    // Kuraho timeout ishaje
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Niba nta ads cyangwa ni imwe gusa, ntidukore sliding
    if (ads.length <= 1) {
      return;
    }

    // Tangiza timeout nshya
    const slideNext = () => {
      // Tangiza fade out
      setIsTransitioning(true);

      // Nyuma ya FADE_MS (fade out), hindura ad
      transitionTimeoutRef.current = setTimeout(() => {
        setCurrentAd((prev) => (prev + 1) % ads.length);

        // Nyuma yo guhindura, tangiza fade in
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, FADE_MS);
    };

    timeoutRef.current = setTimeout(slideNext, AD_SLIDE_MS);

    // Kuraho timeout iyo component ihagaritse
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, [currentAd, ads.length]);


  // ===== WHATSAPP CONTACT =====
  const whatsappNumber = "250722319367";
  const message = encodeURIComponent(
    "Nkeneye service yo kwamamaza kurubuga rwanyu."
  );
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${message}`;


  // ===== HANDLE INDICATOR CLICK =====
  const handleIndicatorClick = (index) => {
    // Kuraho timeout ishaje
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Fade out
    setIsTransitioning(true);

    // Nyuma ya FADE_MS, hindura ad
    transitionTimeoutRef.current = setTimeout(() => {
      setCurrentAd(index);

      // Fade in
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);

      // Tangiza timeout nshya
      const slideNext = () => {
        setIsTransitioning(true);
        transitionTimeoutRef.current = setTimeout(() => {
          setCurrentAd((prev) => (prev + 1) % ads.length);
          setTimeout(() => {
            setIsTransitioning(false);
          }, 50);
        }, FADE_MS);
      };
      timeoutRef.current = setTimeout(slideNext, AD_SLIDE_MS);
    }, FADE_MS);
  };


  // ===== LOADING =====
  if (loading) {
    return (
      <section className={styles.wrapper}>
        <div className={styles.header}>
          <span>{t("📢 Kwamamaza")}</span>
        </div>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p>{t("Ibihe...")}</p>
        </div>
      </section>
    );
  }


  // ===== ERROR =====
  if (error) {
    return (
      <section className={styles.wrapper}>
        <div className={styles.header}>
          <span>{t("📢 Kwamamaza")}</span>
        </div>
        <div className={styles.errorState}>
          <p>{error}</p>
        </div>
      </section>
    );
  }


  // ===== NO ADS =====
  if (!ads.length) {
    return (
      <section className={styles.wrapper}>
        <div className={styles.header}>
          <span>{t("📢 Kwamamaza")}</span>
        </div>

        <div className={styles.emptyCard}>
          <div className={styles.logoWrapper}>
            <img
              src="/logo.png"
              alt={t("Logo")}
              className={styles.logo}
              onError={(e) => {
                e.target.src = "/default-logo.png";
              }}
            />
          </div>

          <h3 className={styles.emptyTitle}>{t("Tangaza ibikorwa byawe")}</h3>

          <p className={styles.emptyDesc}>{t("Niba ukeneye kwamamaza ibikorwa byawe cyangwa serivisi zawe kurubuga rwacu, twandikire nonaha kuri WhatsApp tugufashe kugera ku bantu benshi.")}</p>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.whatsappBtn}
          >
            <FaWhatsapp className={styles.whatsappIcon} />{t("Twandikire kuri WhatsApp")}</a>
        </div>
      </section>
    );
  }


  // ===== ADS AVAILABLE =====
  const ad = ads[currentAd];

  // Use pre-resolved values (fallback to runtime just in case)
  const resolvedType =
    ad._resolvedType || resolveMediaType(ad);
  const youtubeId =
    ad._youtubeId || getYouTubeVideoId(ad.mediaUrl);

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <span>{t("📢 Kwamamaza")}</span>
        <span className={styles.headerBadge}>
          {currentAd + 1} / {ads.length}
        </span>
      </div>

      {/* Card imwe gusa */}
      <div className={styles.singleCard}>
        <div
          key={ad.id}
          className={`${styles.card} ${
            isTransitioning
              ? styles.cardFadeOut
              : styles.cardFadeIn
          }`}
        >
          {/* Status Badge */}
          <div className={styles.statusBadge}>
            {ad.active ? (
              <span className={styles.statusActive}>
                <FaEye />{" "}{t("Show")}</span>
            ) : (
              <span className={styles.statusHidden}>
                <FaEyeSlash />{" "}{t("Hidden")}</span>
            )}
          </div>

          <div className={styles.mediaWrapper}>
            {/* === YOUTUBE === */}
            {resolvedType === "youtube" && youtubeId ? (
              <div className={styles.videoWrapper}>
                <YouTubeAdPlayer videoId={youtubeId} />
                <FaPlayCircle className={styles.videoIcon} />
              </div>
            ) : /* === VIDEO FILE === */
            resolvedType === "video" ? (
              <div className={styles.videoWrapper}>
                <video
                  src={ad.mediaUrl}
                  controls
                  muted
                  autoPlay
                  playsInline
                  className={styles.video}
                  poster={
                    ad.thumbnail || "/video-placeholder.jpg"
                  }
                />
                <FaPlayCircle className={styles.videoIcon} />
              </div>
            ) : (
              /* === IMAGE === */
              <img
                src={ad.mediaUrl}
                alt={ad.title || t("Ad")}
                className={styles.image}
                loading="lazy"
                onError={(e) => {
                  e.target.src = "/placeholder-image.jpg";
                }}
              />
            )}
          </div>

          <div className={styles.content}>
            <h3 className={styles.title}>
              {ad.title || t("Ad")}
            </h3>

            <p className={styles.description}>
              {ad.description || ""}
            </p>

            {ad.link && (
              <Link
                href={ad.link}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.button}
              >{t("Reba byinshi")}{" "}
                <FaExternalLinkAlt className={styles.linkIcon} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Indicators */}
      {ads.length > 1 && (
        <div className={styles.indicators}>
          {ads.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`${styles.indicator} ${
                index === currentAd
                  ? styles.indicatorActive
                  : ""
              }`}
              onClick={() => handleIndicatorClick(index)}
              aria-label={`Go to ad ${index + 1}`}
              disabled={isTransitioning}
            />
          ))}
        </div>
      )}

      {/* WHATSAPP CTA */}
      <div className={styles.ctaWrapper}>
        <p className={styles.ctaText}>{t("Ushaka kwamamaza ibikorwa byawe?")}{" "}<br />
          <span>{t("Twandikire kuri WhatsApp!")}</span>
        </p>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.ctaBtn}
        >
          <FaWhatsapp className={styles.ctaIcon} />{t("Twandikire")}</a>
      </div>
    </section>
  );
}
