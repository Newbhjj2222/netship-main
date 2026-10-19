import { useState } from "react";
import Head from "next/head";
import { db } from "@/components/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

import {
  FiUser,
  FiPhone,
  FiMail,
  FiBookOpen,
  FiHash,
  FiFileText,
  FiDollarSign,
  FiDownload,
  FiSearch,
  FiAlertTriangle,
  FiCheckCircle,
  FiLoader,
  FiTrendingUp,
  FiClock,
  FiEdit3,
  FiCpu,
  FiActivity,
  FiZap,
  FiAward,
  FiShield,
  FiCreditCard,
} from "react-icons/fi";

import { FaWhatsapp, FaMobileAlt } from "react-icons/fa";

import jsPDF from "jspdf";

import styles from "../styles/analyser.module.css";
import { useI18n } from "@/i18n/I18nProvider";

/* =========================================================
   CONSTANTS
========================================================= */

const RATE_PER_WORD = 3.2;
const READING_WPM = 200;

const INAPPROPRIATE_WORDS = [
  "gaswere",
  "nyoko",
  "igicucu",
  "gapfe nabi",
  "umusazi",
  "ikigoryi",
];

const INSULT_WORDS = [
  "wa mugaye",
  "gucumita",
  "gaswere",
  "umuswa",
  "ikimara",
];

const EXPLICIT_WORDS = [
  "guswera",
  "igituba",
  "imboro",
  "kunyaza",
  "gusohora",
  "vagina",
  "dick",
  "amabere",
  "ubusambanyi",
];

const PAGE_BG = "#070711";

/* =========================================================
   HELPERS
========================================================= */

const escapeRegExp = (str) =>
  String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const countOccurrences = (text, word) => {
  if (!text || !word) return 0;

  const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi");

  return (text.match(re) || []).length;
};

const countWords = (text) => {
  if (!text) return 0;

  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
};

const formatRWF = (n) => {
  if (!Number.isFinite(n)) return "0 RWF";

  return (
    new Intl.NumberFormat("en-RW").format(Math.round(n)) +
    " RWF"
  );
};

const safeFileName = (name) =>
  String(name || "report")
    .replace(/[^\w\-]+/g, "_")
    .slice(0, 60);

/*
  Iyi function ikora list y'amagambo yabonetse
  hamwe n'umubare w'uko buri jambo ryagaragaye.
*/
const buildWordList = (episodes, words) => {
  return words
    .map((word) => {
      let count = 0;

      episodes.forEach((episode) => {
        count += countOccurrences(
          String(episode || "").toLowerCase(),
          word
        );
      });

      return {
        word,
        count,
      };
    })
    .filter((item) => item.count > 0);
};

const getTotalCategoryCount = (list) =>
  list.reduce((total, item) => total + item.count, 0);

/* =========================================================
   UI COMPONENTS
========================================================= */

function InfoItem({
  icon,
  label,
  value,
  tone = "purple",
}) {
  return (
    <div
      className={`${styles.infoItem} ${
        styles[`tone_${tone}`]
      }`}
    >
      <span className={styles.infoIcon}>{icon}</span>

      <div className={styles.infoText}>
        <span className={styles.infoLabel}>
          {label}
        </span>

        <strong className={styles.infoValue}>
          {value || "—"}
        </strong>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = "purple",
}) {
  return (
    <div
      className={`${styles.statCard} ${
        styles[`tone_${tone}`]
      }`}
    >
      <span className={styles.statIcon}>
        {icon}
      </span>

      <div className={styles.statBody}>
        <span className={styles.statLabel}>
          {label}
        </span>

        <strong className={styles.statValue}>
          {value}
        </strong>
      </div>
    </div>
  );
}

function FlagCard({
  icon,
  label,
  value,
  tone,
}) {
  const clean = value === 0;

  return (
    <div
      className={`${styles.flagCard} ${
        styles[`tone_${tone}`]
      } ${clean ? styles.flagClean : ""}`}
    >
      <span className={styles.flagIcon}>
        {clean ? <FiCheckCircle /> : icon}
      </span>

      <div className={styles.flagBody}>
        <span className={styles.flagLabel}>
          {label}
        </span>

        <strong className={styles.flagValue}>
          {value}
        </strong>
      </div>

      <span
        className={styles.flagRing}
        aria-hidden="true"
      />
    </div>
  );
}

/* =========================================================
   WORD LIST
========================================================= */

function WordCategory({
  title,
  items,
  tone,
}) {
  const { t } = useI18n();

  const total = getTotalCategoryCount(items);

  return (
    <div
      className={`${styles.wordCategory} ${
        styles[`word_${tone}`]
      }`}
    >
      <div className={styles.wordCategoryHeader}>
        <div>
          <h4>{title}</h4>
          <span>{t("{total} occurrence", { total })}{total === 1 ? "" : t("s")}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={styles.noWords}>
          <FiCheckCircle />
          <span>{t("Nta jambo ryabonetse muri iki cyiciro.")}</span>
        </div>
      ) : (
        <div className={styles.wordList}>
          {items.map((item) => (
            <div
              className={styles.wordItem}
              key={`${title}-${item.word}`}
            >
              <span className={styles.wordName}>
                {item.word}
              </span>

              <span className={styles.wordCount}>{t("{count}x", { count: item.count })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Analyser({
  stories,
}) {
  const { t } = useI18n();

  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] =
    useState(false);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  /* =======================================================
     ANALYZE STORY
  ======================================================= */

  const analyzeStory = async () => {
    if (!selected) {
      setError(t("Hitamo inkuru ubanze."));
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const snap = await getDoc(
        doc(db, "stories", selected)
      );

      if (!snap.exists()) {
        setError(
          t("Inkuru ntibonetse muri database.")
        );
        return;
      }

      const data = snap.data();

      const episodesArr = Array.isArray(
        data.episodes
      )
        ? data.episodes
        : [];

      let totalWords = 0;

      episodesArr.forEach((episode) => {
        totalWords += countWords(
          String(episode || "")
        );
      });

      /*
        Episode count.
        Niba nta episode ihari, dushyiraho 1
        kugira ngo division itazagira ikibazo.
      */
      const episodeCount =
        episodesArr.length || 1;

      const avgWords = Math.round(
        totalWords / episodeCount
      );

      /*
        Igiciro cy'inkuru yose.
        Formula:
        average words × rate
      */
      const storyPrice =
        avgWords * RATE_PER_WORD;

      const pricePerEpisode =
        storyPrice / episodeCount;

      /* -----------------------------------------------
         WORD ANALYSIS
      ------------------------------------------------ */

      const inappropriateWords =
        buildWordList(
          episodesArr,
          INAPPROPRIATE_WORDS
        );

      const insultWords =
        buildWordList(
          episodesArr,
          INSULT_WORDS
        );

      const explicitWords =
        buildWordList(
          episodesArr,
          EXPLICIT_WORDS
        );

      const inappropriate =
        getTotalCategoryCount(
          inappropriateWords
        );

      const insults =
        getTotalCategoryCount(
          insultWords
        );

      const explicit =
        getTotalCategoryCount(
          explicitWords
        );

      /* -----------------------------------------------
         RESULT
      ------------------------------------------------ */

      setResult({
        id: snap.id,

        storyName:
          data.storyName || snap.id,

        authorName:
          data.authorName || "—",

        whatsappNumber:
          data.whatsappNumber || "—",

        phoneNumber:
          data.phoneNumber || "—",

        momoNumber:
          data.momoNumber || "—",

        email:
          data.email || "—",

        status:
          data.status || "pending",

        dateSubmitted:
          data.dateSubmitted?.toDate?.() ||
          null,

        episodes: episodeCount,

        totalWords,

        avgWords,

        ratePerWord:
          RATE_PER_WORD,

        pricePerEpisode,

        storyPrice,

        inappropriate,
        insults,
        explicit,

        inappropriateWords,
        insultWords,
        explicitWords,
      });
    } catch (e) {
      console.error(e);

      setError(
        t("Habaye ikibazo mu gusuzuma. Ongera ugerageze.")
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     PDF HELPERS
  ======================================================= */

  const addText = (
    pdf,
    text,
    x,
    y,
    size = 10,
    color = [255, 255, 255],
    options = {}
  ) => {
    pdf.setFont(
      options.font || "helvetica",
      options.style || "normal"
    );

    pdf.setFontSize(size);

    pdf.setTextColor(
      color[0],
      color[1],
      color[2]
    );

    pdf.text(
      String(text || ""),
      x,
      y,
      options.textOptions || {}
    );
  };

  const roundedBox = (
    pdf,
    x,
    y,
    w,
    h,
    fill,
    stroke = null,
    radius = 4
  ) => {
    pdf.setFillColor(
      fill[0],
      fill[1],
      fill[2]
    );

    if (stroke) {
      pdf.setDrawColor(
        stroke[0],
        stroke[1],
        stroke[2]
      );
    }

    pdf.roundedRect(
      x,
      y,
      w,
      h,
      radius,
      radius,
      stroke ? "FD" : "F"
    );
  };

  const drawWatermark = (pdf) => {
    const pageW =
      pdf.internal.pageSize.getWidth();

    const pageH =
      pdf.internal.pageSize.getHeight();

    /*
      NAVIO watermark
    */

    pdf.saveGraphicsState();

    pdf.setGState(
      new pdf.GState({
        opacity: 0.10,
      })
    );

    pdf.setTextColor(120, 80, 255);

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(58);

    pdf.text(
      "NAVIO",
      pageW - 62,
      pageH - 35,
      {
        angle: -18,
        align: "center",
      }
    );

    /*
      Lines zivanze na NAVIO
    */

    pdf.setDrawColor(
      130,
      80,
      255
    );

    pdf.setLineWidth(1);

    for (
      let i = 0;
      i < 5;
      i++
    ) {
      pdf.line(
        pageW - 105 + i * 5,
        pageH - 60 + i * 3,
        pageW - 12,
        pageH - 90 + i * 3
      );
    }

    pdf.restoreGraphicsState();

    /*
      ADMIN red stamp
    */

    pdf.saveGraphicsState();

    pdf.setDrawColor(
      255,
      40,
      40
    );

    pdf.setTextColor(
      255,
      40,
      40
    );

    pdf.setLineWidth(1.3);

    const stampX =
      pageW - 67;

    const stampY =
      pageH - 20;

    pdf.rect(
      stampX,
      stampY - 13,
      52,
      15
    );

    pdf.rect(
      stampX + 2,
      stampY - 11,
      48,
      11
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(15);

    pdf.text(
      "ADMIN",
      stampX + 26,
      stampY - 3,
      {
        align: "center",
        angle: -8,
      }
    );

    pdf.restoreGraphicsState();
  };

  const drawHeader = (
    pdf,
    pageW
  ) => {
    pdf.setFillColor(
      7,
      7,
      17
    );

    pdf.rect(
      0,
      0,
      pageW,
      297,
      "F"
    );

    /*
      Decorative diagonal lines
    */

    pdf.setDrawColor(
      120,
      70,
      255
    );

    pdf.setLineWidth(1.2);

    pdf.line(
      10,
      8,
      35,
      0
    );

    pdf.line(
      pageW - 35,
      0,
      pageW - 10,
      8
    );

    pdf.setTextColor(
      255,
      255,
      255
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(19);

    pdf.text(
      "NEWTALENTSG",
      16,
      19
    );

    pdf.setTextColor(
      170,
      100,
      255
    );

    pdf.setFontSize(9);

    pdf.text(
      "Stories • Talent • Opportunities",
      17,
      26
    );

    pdf.setTextColor(
      255,
      255,
      255
    );

    pdf.setFontSize(25);

    pdf.text(
      "ISUZUMA RY'INKURU",
      16,
      44
    );

    pdf.setFontSize(9);

    pdf.setTextColor(
      180,
      180,
      205
    );

    pdf.text(
      "REPORT Y'ISUZUMA",
      17,
      51
    );

    /*
      Rate badge
    */

    pdf.setDrawColor(
      0,
      200,
      255
    );

    pdf.setLineWidth(0.8);

    pdf.roundedRect(
      pageW - 61,
      13,
      45,
      16,
      4,
      4,
      "S"
    );

    pdf.setTextColor(
      255,
      220,
      60
    );

    pdf.setFontSize(8);

    pdf.text(
      `${RATE_PER_WORD} RWF / ijambo`,
      pageW - 38.5,
      23,
      {
        align: "center",
      }
    );
  };

  /* =======================================================
     PDF SECTION
  ======================================================= */

  const drawSectionTitle = (
    pdf,
    title,
    x,
    y,
    width
  ) => {
    pdf.setFillColor(
      20,
      18,
      42
    );

    pdf.roundedRect(
      x,
      y,
      width,
      10,
      3,
      3,
      "F"
    );

    pdf.setDrawColor(
      100,
      70,
      255
    );

    pdf.line(
      x,
      y + 10,
      x + width,
      y + 10
    );

    addText(
      pdf,
      title,
      x + 5,
      y + 6.7,
      9,
      [255, 255, 255],
      {
        style: "bold",
      }
    );
  };

  /* =======================================================
     PDF WORD TABLE
  ======================================================= */

  const drawWordTable = (
    pdf,
    title,
    items,
    x,
    y,
    width,
    color
  ) => {
    const rowHeight = 8;

    drawSectionTitle(
      pdf,
      title,
      x,
      y,
      width
    );

    let currentY = y + 14;

    /*
      Header
    */

    pdf.setFillColor(
      30,
      28,
      55
    );

    pdf.rect(
      x,
      currentY - 5,
      width,
      rowHeight,
      "F"
    );

    addText(
      pdf,
      "#",
      x + 3,
      currentY,
      7,
      [220, 220, 240],
      {
        style: "bold",
      }
    );

    addText(
      pdf,
      "Ijambo",
      x + 14,
      currentY,
      7,
      [220, 220, 240],
      {
        style: "bold",
      }
    );

    addText(
      pdf,
      "Umubare",
      x + width - 26,
      currentY,
      7,
      [220, 220, 240],
      {
        style: "bold",
      }
    );

    currentY += 8;

    if (items.length === 0) {
      addText(
        pdf,
        "Nta jambo ryabonetse muri iki cyiciro.",
        x + 4,
        currentY + 2,
        8,
        [130, 220, 170]
      );

      return currentY + 12;
    }

    items.forEach(
      (item, index) => {
        pdf.setDrawColor(
          45,
          43,
          70
        );

        pdf.line(
          x,
          currentY - 3,
          x + width,
          currentY - 3
        );

        addText(
          pdf,
          String(index + 1),
          x + 3,
          currentY + 2,
          7,
          [170, 170, 195]
        );

        addText(
          pdf,
          item.word,
          x + 14,
          currentY + 2,
          8,
          [255, 255, 255]
        );

        pdf.setTextColor(
          color[0],
          color[1],
          color[2]
        );

        pdf.setFont(
          "helvetica",
          "bold"
        );

        pdf.setFontSize(8);

        pdf.text(
          `${item.count}x`,
          x + width - 18,
          currentY + 2
        );

        currentY += rowHeight;
      }
    );

    return currentY + 4;
  };

  /* =======================================================
     DOWNLOAD PDF
  ======================================================= */

  const downloadPDF = async () => {
    if (!result) return;

    setDownloading(true);
    setError("");

    try {
      const pdf = new jsPDF(
        "p",
        "mm",
        "a4"
      );

      const pageW =
        pdf.internal.pageSize.getWidth();

      const pageH =
        pdf.internal.pageSize.getHeight();

      const margin = 12;

      let y = 61;

      /*
        PAGE BACKGROUND
      */

      drawHeader(
        pdf,
        pageW
      );

      drawWatermark(pdf);

      /*
        AUTHOR + STORY
      */

      roundedBox(
        pdf,
        margin,
        y,
        pageW - margin * 2,
        39,
        [14, 14, 31],
        [70, 50, 180]
      );

      addText(
        pdf,
        "AMAZINA Y'UMWANDITSI",
        margin + 6,
        y + 9,
        7,
        [150, 150, 180]
      );

      addText(
        pdf,
        result.authorName,
        margin + 6,
        y + 16,
        12,
        [255, 255, 255],
        {
          style: "bold",
        }
      );

      addText(
        pdf,
        "AMAZINA Y'INKURU",
        margin + 6,
        y + 26,
        7,
        [150, 150, 180]
      );

      addText(
        pdf,
        result.storyName,
        margin + 6,
        y + 33,
        11,
        [180, 110, 255],
        {
          style: "bold",
        }
      );

      /*
        Status
      */

      pdf.setTextColor(
        80,
        230,
        170
      );

      pdf.setFontSize(8);

      pdf.text(
        String(result.status).toUpperCase(),
        pageW - margin - 5,
        y + 10,
        {
          align: "right",
        }
      );

      y += 47;

      /*
        STATS
      */

      const gap = 4;

      const boxW =
        (pageW -
          margin * 2 -
          gap * 2) /
        3;

      const statY = y;

      const stats = [
        {
          label: "TOTAL EPISODES",
          value: result.episodes,
        },
        {
          label: "AVERAGE AMAGAMBO",
          value:
            result.avgWords.toLocaleString(),
        },
        {
          label: "TOTAL PRICE",
          value:
            formatRWF(
              result.storyPrice
            ),
        },
      ];

      stats.forEach(
        (stat, index) => {
          const x =
            margin +
            index *
              (boxW + gap);

          roundedBox(
            pdf,
            x,
            statY,
            boxW,
            31,
            [17, 16, 38],
            [
              90,
              65,
              190,
            ]
          );

          addText(
            pdf,
            stat.label,
            x + 5,
            statY + 9,
            6.5,
            [145, 145, 175],
            {
              style: "bold",
            }
          );

          addText(
            pdf,
            String(stat.value),
            x + 5,
            statY + 22,
            index === 2
              ? 10
              : 16,
            index === 2
              ? [255, 215, 50]
              : [255, 255, 255],
            {
              style: "bold",
            }
          );
        }
      );

      y += 40;

      /*
        PRICE DETAILS
      */

      drawSectionTitle(
        pdf,
        "IGICIRO",
        margin,
        y,
        pageW - margin * 2
      );

      y += 16;

      addText(
        pdf,
        `Rate ku ijambo: ${result.ratePerWord} RWF`,
        margin + 4,
        y,
        8,
        [210, 210, 230]
      );

      addText(
        pdf,
        `Average / Episode: ${result.avgWords.toLocaleString()}`,
        pageW / 2,
        y,
        8,
        [210, 210, 230]
      );

      y += 8;

      addText(
        pdf,
        `Igiciro / Episode: ${formatRWF(
          result.pricePerEpisode
        )}`,
        margin + 4,
        y,
        8,
        [210, 210, 230]
      );

      addText(
        pdf,
        `Total: ${formatRWF(
          result.storyPrice
        )}`,
        pageW / 2,
        y,
        9,
        [255, 215, 50],
        {
          style: "bold",
        }
      );

      y += 16;

      /*
        WORD CATEGORIES
      */

      const categories = [
        {
          title:
            "AMAGAMBO MABI YAKUWEHO",
          items:
            result.inappropriateWords,
          color: [
            255,
            80,
            80,
          ],
        },
        {
          title:
            "IBITUTSI YAKUWEHO",
          items:
            result.insultWords,
          color: [
            255,
            180,
            40,
          ],
        },
        {
          title:
            "UBUSAMBANYI YAKUWEHO",
          items:
            result.explicitWords,
          color: [
            190,
            100,
            255,
          ],
        },
      ];

      for (
        let i = 0;
        i < categories.length;
        i++
      ) {
        const category =
          categories[i];

        const estimatedHeight =
          22 +
          Math.max(
            1,
            category.items.length
          ) *
            8;

        /*
          Niba table itakijya kuri page iriho,
          dukora page nshya.
        */

        if (
          y +
            estimatedHeight >
          pageH - 28
        ) {
          pdf.addPage();

          drawHeader(
            pdf,
            pageW
          );

          drawWatermark(pdf);

          y = 61;
        }

        y = drawWordTable(
          pdf,
          category.title,
          category.items,
          margin,
          y,
          pageW - margin * 2,
          category.color
        );

        y += 4;
      }

      /*
        PAYMENT NOTICE
      */

      if (y + 38 > pageH - 25) {
        pdf.addPage();

        drawHeader(
          pdf,
          pageW
        );

        drawWatermark(pdf);

        y = 61;
      }

      y += 4;

      roundedBox(
        pdf,
        margin,
        y,
        pageW - margin * 2,
        32,
        [18, 25, 25],
        [255, 190, 40]
      );

      addText(
        pdf,
        "NYUMA Y'UKO WEMERANYWE NATWE",
        margin + 7,
        y + 10,
        7,
        [180, 180, 190],
        {
          style: "bold",
        }
      );

      addText(
        pdf,
        "TURAHITA DUSOZA UBWISHYU BWAWE.",
        margin + 7,
        y + 20,
        11,
        [255, 215, 50],
        {
          style: "bold",
        }
      );

      y += 42;

      /*
        SIGNATURE
      */

      addText(
        pdf,
        "Navio kki dabble le,",
        margin + 2,
        y,
        16,
        [255, 255, 255],
        {
          style: "italic",
        }
      );

      pdf.setDrawColor(
        255,
        255,
        255
      );

      pdf.line(
        margin + 2,
        y + 3,
        margin + 65,
        y + 3
      );

      addText(
        pdf,
        "A C.E.O of New Talents Stories Group",
        margin + 2,
        y + 12,
        8,
        [190, 190, 210],
        {
          style: "bold",
        }
      );

      /*
        FOOTER
      */

      const footerY =
        pageH - 10;

      pdf.setDrawColor(
        90,
        70,
        180
      );

      pdf.line(
        margin,
        footerY - 5,
        pageW - margin,
        footerY - 5
      );

      addText(
        pdf,
        "© NewTalentsG · Isuzuma ry'Inkuru",
        margin,
        footerY,
        6.5,
        [120, 120, 145]
      );

      addText(
        pdf,
        `Generated: ${new Date().toLocaleString()}`,
        pageW - margin,
        footerY,
        6.5,
        [120, 120, 145],
        {
          textOptions: {
            align: "right",
          },
        }
      );

      /*
        PAGE NUMBER
      */

      const pageCount =
        pdf.getNumberOfPages();

      for (
        let page = 1;
        page <= pageCount;
        page++
      ) {
        pdf.setPage(page);

        addText(
          pdf,
          `Page ${page} / ${pageCount}`,
          pageW / 2,
          pageH - 3,
          6,
          [100, 100, 125],
          {
            textOptions: {
              align: "center",
            },
          }
        );
      }

      /*
        SAVE
      */

      pdf.save(
        `${safeFileName(
          result.storyName
        )}-report.pdf`
      );
    } catch (e) {
      console.error(e);

      setError(
        t("Ntibyakunze gukora PDF. Reba console niba hari ikibazo.")
      );
    } finally {
      setDownloading(false);
    }
  };

  /* =======================================================
     CALCULATED VALUES
  ======================================================= */

  const totalFlags = result
    ? result.inappropriate +
      result.insults +
      result.explicit
    : 0;

  const readingMinutes = result
    ? Math.max(
        1,
        Math.ceil(
          result.totalWords /
            READING_WPM
        )
      )
    : 0;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <Head>
        <title>{t("Isuzuma ry'Inkuru — NewTalentsG")}</title>

        <meta
          name="description"
          content="Suzuma inkuru ziri muri NewTalentsG"
        />
      </Head>

      <div className={styles.page}>
        <div className={styles.shell}>

          {/* =================================================
              HERO
          ================================================= */}

          <header className={styles.hero}>
            <div
              className={styles.heroLeft}
            >
              <span
                className={
                  styles.heroIcon
                }
              >
                <FiCpu />
              </span>

              <div
                className={
                  styles.heroText
                }
              >
                <h1>{t("Isuzuma ry'")}<span>{t("Inkuru")}</span>
                </h1>

                <p>{t("Bara amagambo, suzuma ibigaragara, ubone igiciro cy'inkuru mu kanya")}</p>
              </div>
            </div>

            <span
              className={
                styles.badge
              }
            >
              <FiZap />{t("Rate:")}{" "}{t("{RATE_PER_WORD} RWF / ijambo", { RATE_PER_WORD })}</span>
          </header>

          {/* =================================================
              PICKER
          ================================================= */}

          <section
            className={
              styles.picker
            }
          >
            <label
              htmlFor="story-select"
              className={
                styles.pickerLabel
              }
            >
              <FiBookOpen />{t("Hitamo inkuru ushaka gusuzuma")}</label>

            <div
              className={
                styles.pickerRow
              }
            >
              <div
                className={
                  styles.selectWrap
                }
              >
                <select
                  id="story-select"
                  value={
                    selected
                  }
                  onChange={(e) =>
                    setSelected(
                      e.target.value
                    )
                  }
                  className={
                    styles.select
                  }
                >
                  <option value="">{t("-- Hitamo inkuru --")}</option>

                  {stories.map(
                    (s) => (
                      <option
                        key={s.id}
                        value={s.id}
                      >
                        {s.storyName ||
                          s.id}
                      </option>
                    )
                  )}
                </select>
              </div>

              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={
                  analyzeStory
                }
                disabled={
                  loading ||
                  !selected
                }
              >
                {loading ? (
                  <>
                    <FiLoader
                      className={
                        styles.spin
                      }
                    />{t("Turasuzuma...")}</>
                ) : (
                  <>
                    <FiSearch />{t("Analysis")}</>
                )}
              </button>
            </div>

            {stories.length ===
              0 && (
              <p
                className={
                  styles.warn
                }
              >
                <FiAlertTriangle />{t("Nta nkuru ibonetse muri database.")}</p>
            )}

            {error && (
              <p
                className={
                  styles.warn
                }
              >
                <FiAlertTriangle />
                {error}
              </p>
            )}
          </section>

          {/* =================================================
              RESULT
          ================================================= */}

          {result && (
            <>
              <div
                className={
                  styles.actions
                }
              >
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={
                    downloadPDF
                  }
                  disabled={
                    downloading
                  }
                >
                  {downloading ? (
                    <>
                      <FiLoader
                        className={
                          styles.spin
                        }
                      />{t("Turakora PDF...")}</>
                  ) : (
                    <>
                      <FiDownload />{t("Download PDF")}</>
                  )}
                </button>
              </div>

              {/* =================================================
                  LIVE REPORT PREVIEW
              ================================================= */}

              <div
                className={
                  styles.report
                }
              >

                {/* REPORT HEADER */}

                <div
                  className={
                    styles.reportHead
                  }
                >
                  <div
                    className={
                      styles.reportHeadLeft
                    }
                  >
                    <span
                      className={
                        styles.reportTag
                      }
                    >
                      <FiAward />{t("NEWTALENTSG · REPORT")}</span>

                    <h2
                      className={
                        styles.reportTitle
                      }
                    >
                      {
                        result.storyName
                      }
                    </h2>

                    <p
                      className={
                        styles.reportSub
                      }
                    >{t("Yatanzwe na")}{" "}
                      <strong>
                        {
                          result.authorName
                        }
                      </strong>

                      {result.dateSubmitted && (
                        <>
                          {" "}
                          ·{" "}
                          {result.dateSubmitted.toLocaleString()}
                        </>
                      )}
                    </p>
                  </div>

                  <span
                    className={`${styles.status} ${
                      styles[
                        `status_${result.status}`
                      ]
                    }`}
                  >
                    {result.status}
                  </span>
                </div>

                {/* =================================================
                    AUTHOR
                ================================================= */}

                <section
                  className={
                    styles.section
                  }
                >
                  <h3
                    className={
                      styles.sectionTitle
                    }
                  >
                    <FiUser />{t("Umwanditsi & Adresse")}</h3>

                  <div
                    className={
                      styles.infoGrid
                    }
                  >
                    <InfoItem
                      icon={
                        <FiUser />
                      }
                      label={t("Amazina y'umwanditsi")}
                      value={
                        result.authorName
                      }
                      tone="purple"
                    />

                    <InfoItem
                      icon={
                        <FaWhatsapp />
                      }
                      label={t("WhatsApp")}
                      value={
                        result.whatsappNumber
                      }
                      tone="green"
                    />

                    <InfoItem
                      icon={
                        <FiPhone />
                      }
                      label={t("Telefone")}
                      value={
                        result.phoneNumber
                      }
                      tone="cyan"
                    />

                    <InfoItem
                      icon={
                        <FaMobileAlt />
                      }
                      label={t("MoMo")}
                      value={
                        result.momoNumber
                      }
                      tone="amber"
                    />

                    <InfoItem
                      icon={
                        <FiMail />
                      }
                      label={t("Email")}
                      value={
                        result.email
                      }
                      tone="pink"
                    />
                  </div>
                </section>

                {/* =================================================
                    MAIN NUMBERS
                ================================================= */}

                <section
                  className={
                    styles.section
                  }
                >
                  <h3
                    className={
                      styles.sectionTitle
                    }
                  >
                    <FiTrendingUp />{t("Imibare y'inkuru")}</h3>

                  <div
                    className={
                      styles.statGrid
                    }
                  >
                    <StatCard
                      icon={
                        <FiHash />
                      }
                      label={t("Total Episodes")}
                      value={result.episodes.toLocaleString()}
                      tone="purple"
                    />

                    <StatCard
                      icon={
                        <FiFileText />
                      }
                      label={t("Total Amagambo")}
                      value={result.totalWords.toLocaleString()}
                      tone="cyan"
                    />

                    <StatCard
                      icon={
                        <FiEdit3 />
                      }
                      label={t("Average / Episode")}
                      value={result.avgWords.toLocaleString()}
                      tone="pink"
                    />

                    <StatCard
                      icon={
                        <FiClock />
                      }
                      label={t("Igihe cyo gusoma")}
                      value={`~${readingMinutes} min`}
                      tone="green"
                    />
                  </div>
                </section>

                {/* =================================================
                    PRICE
                ================================================= */}

                <section
                  className={
                    styles.section
                  }
                >
                  <h3
                    className={
                      styles.sectionTitle
                    }
                  >
                    <FiDollarSign />{t("Igiciro")}</h3>

                  <div
                    className={
                      styles.priceRow
                    }
                  >
                    <div
                      className={
                        styles.priceBox
                      }
                    >
                      <span
                        className={
                          styles.priceLabel
                        }
                      >{t("Igiciro ku ijambo")}</span>

                      <strong
                        className={
                          styles.priceValue
                        }
                      >
                        {
                          result.ratePerWord
                        }{" "}{t("RWF")}</strong>
                    </div>

                    <div
                      className={
                        styles.priceBox
                      }
                    >
                      <span
                        className={
                          styles.priceLabel
                        }
                      >{t("Igiciro / Episode")}</span>

                      <strong
                        className={
                          styles.priceValue
                        }
                      >
                        {formatRWF(
                          result.pricePerEpisode
                        )}
                      </strong>
                    </div>

                    <div
                      className={`${styles.priceBox} ${styles.priceHighlight}`}
                    >
                      <span
                        className={
                          styles.priceLabel
                        }
                      >{t("Total Price")}</span>

                      <strong
                        className={
                          styles.priceTotal
                        }
                      >
                        {formatRWF(
                          result.storyPrice
                        )}
                      </strong>

                      <em
                        className={
                          styles.priceFormula
                        }
                      >
                        {
                          result.avgWords.toLocaleString()
                        }{" "}{t("average amagambo ×")}{" "}
                        {
                          result.ratePerWord
                        }{" "}{t("RWF")}</em>
                    </div>
                  </div>
                </section>

                {/* =================================================
                    WORDS REMOVED
                ================================================= */}

                <section
                  className={
                    styles.section
                  }
                >
                  <h3
                    className={
                      styles.sectionTitle
                    }
                  >
                    <FiShield />{t("Amagambo yakuweho")}{totalFlags ===
                      0 && (
                      <span
                        className={
                          styles.cleanBadge
                        }
                      >
                        <FiCheckCircle />{t("Nta kibazo")}</span>
                    )}
                  </h3>

                  <div
                    className={
                      styles.wordCategories
                    }
                  >
                    <WordCategory
                      title={t("Amagambo mabi")}
                      items={
                        result.inappropriateWords
                      }
                      tone="red"
                    />

                    <WordCategory
                      title={t("Ibitutsi")}
                      items={
                        result.insultWords
                      }
                      tone="amber"
                    />

                    <WordCategory
                      title={t("Ubusambanyi")}
                      items={
                        result.explicitWords
                      }
                      tone="violet"
                    />
                  </div>
                </section>

                {/* =================================================
                    PAYMENT NOTICE
                ================================================= */}

                <section
                  className={
                    styles.paymentNotice
                  }
                >
                  <div
                    className={
                      styles.paymentIcon
                    }
                  >
                    <FiCreditCard />
                  </div>

                  <div>
                    <span>{t("Nyuma yuko wemeranywe natwe")}</span>

                    <strong>{t("turahita dusoza ubwishyu bwawe.")}</strong>

                    <small>{t("Murakoze ku bw'icyizere mwaduhaye.")}</small>
                  </div>
                </section>

                {/* =================================================
                    SIGNATURE + WATERMARK
                ================================================= */}

                <section
                  className={
                    styles.signatureArea
                  }
                >
                  <div
                    className={
                      styles.signature
                    }
                  >
                    <div
                      className={
                        styles.signatureName
                      }
                    >{t("Navio kki dabble le,")}</div>

                    <div
                      className={
                        styles.signatureLine
                      }
                    />

                    <strong>{t("A C.E.O of New Talents Stories Group")}</strong>
                  </div>

                  <div
                    className={
                      styles.watermark
                    }
                  >
                    <div
                      className={
                        styles.navioWatermark
                      }
                    >{t("NAVIO")}</div>

                    <div
                      className={
                        styles.waterLines
                      }
                    >
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>

                    <div
                      className={
                        styles.adminStamp
                      }
                    >{t("ADMIN")}</div>
                  </div>
                </section>

                {/* =================================================
                    FOOTER
                ================================================= */}

                <div
                  className={
                    styles.reportFoot
                  }
                >
                  <span>{t("Generated:")}{" "}
                    <strong>
                      {new Date().toLocaleString()}
                    </strong>
                  </span>

                  <span>{t("© NewTalentsG · Isuzuma ry'inkuru")}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* =========================================================
   SSR
========================================================= */

export async function getServerSideProps() {
  try {
    const snap =
      await getDocs(
        collection(
          db,
          "stories"
        )
      );

    const stories = snap.docs
      .map((d) => {
        const data =
          d.data();

        return {
          id: d.id,

          storyName:
            data.storyName ||
            null,

          dateSubmitted:
            data.dateSubmitted
              ?.toDate?.()
              ?.getTime?.() ||
            0,
        };
      })
      .sort(
        (a, b) =>
          b.dateSubmitted -
          a.dateSubmitted
      )
      .map(
        ({
          id,
          storyName,
        }) => ({
          id,
          storyName,
        })
      );

    return {
      props: {
        stories,
      },
    };
  } catch (e) {
    console.error(
      "getServerSideProps error:",
      e
    );

    return {
      props: {
        stories: [],
      },
    };
  }
}
