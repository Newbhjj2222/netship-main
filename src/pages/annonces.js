import { useMemo, useState } from "react";
import Head from "next/head";
import jsPDF from "jspdf";

import {
  FiBell,
  FiCalendar,
  FiCheck,
  FiClock,
  FiDownload,
  FiEdit3,
  FiEye,
  FiFileText,
  FiInfo,
  FiMapPin,
  FiRefreshCw,
  FiSend,
  FiShield,
  FiStar,
  FiTag,
  FiUser,
  FiUsers,
  FiVolume2,
  FiX,
  FiZap,
} from "react-icons/fi";

import styles from "../styles/annonce.module.css";
import { useI18n } from "@/i18n/I18nProvider";

/* =========================================================
   ANNOUNCEMENT TYPES
========================================================= */

const ANNOUNCEMENT_TYPES = [
  {
    value: "kumenyesha",
    label: "Kumenyesha",
    icon: <FiVolume2 />,
    description: "Amakuru mashya cyangwa itangazo risanzwe.",
  },
  {
    value: "kwibutsa",
    label: "Kwibutsa",
    icon: <FiBell />,
    description: "Kwibutsa abantu gahunda cyangwa inshingano.",
  },
  {
    value: "itangazo_rusange",
    label: "Itangazo rusange",
    icon: <FiUsers />,
    description: "Itangazo rigenewe abantu benshi.",
  },
  {
    value: "urgent",
    label: "Itangazo ryihutirwa",
    icon: <FiZap />,
    description: "Amakuru agomba kwitabwaho vuba.",
  },
  {
    value: "impinduka",
    label: "Impinduka",
    icon: <FiRefreshCw />,
    description: "Kumenyesha impinduka yabaye.",
  },
  {
    value: "gahunda",
    label: "Guhindura gahunda",
    icon: <FiCalendar />,
    description: "Impinduka ku itariki, igihe cyangwa gahunda.",
  },
  {
    value: "ubutumire",
    label: "Ubutumire",
    icon: <FiSend />,
    description: "Ubutumire mu nama cyangwa igikorwa.",
  },
  {
    value: "event",
    label: "Event / Igikorwa",
    icon: <FiStar />,
    description: "Kwamamaza cyangwa kumenyesha igikorwa.",
  },
  {
    value: "akazi",
    label: "Akazi / Opportunity",
    icon: <FiUser />,
    description: "Amahirwe y'akazi cyangwa andi mahirwe.",
  },
  {
    value: "serivisi",
    label: "Serivisi",
    icon: <FiShield />,
    description: "Amakuru ajyanye na serivisi.",
  },
  {
    value: "ubwishyu",
    label: "Ubwishyu",
    icon: <FiFileText />,
    description: "Amakuru ajyanye n'ubwishyu.",
  },
  {
    value: "gushimira",
    label: "Gushimira",
    icon: <FiStar />,
    description: "Ubutumwa bwo gushimira.",
  },
  {
    value: "warning",
    label: "Iburira / Warning",
    icon: <FiShield />,
    description:
      "Ubutumwa busaba kwitondera cyangwa gukurikiza amabwiriza.",
  },
  {
    value: "amakuru_mashya",
    label: "Amakuru mashya",
    icon: <FiInfo />,
    description: "Amakuru mashya agezweho.",
  },
  {
    value: "andi",
    label: "Andi",
    icon: <FiTag />,
    description: "Ubundi bwoko bw'itangazo.",
  },
];

const TYPE_META = Object.fromEntries(
  ANNOUNCEMENT_TYPES.map((item) => [item.value, item])
);

const DEFAULT_FORM = {
  type: "kumenyesha",
  title: "",
  audience: "",
  date: "",
  time: "",
  location: "",
  reference: "",
  body: "",
};

/* =========================================================
   HELPERS
========================================================= */

const safeFileName = (name) =>
  String(name || "itangazo")
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .slice(0, 70);

const normalizeBody = (text) =>
  String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const getParagraphs = (text) => {
  const normalized = normalizeBody(text);

  if (!normalized) return [];

  return normalized
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
};

const formatDate = (value) => {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("rw-RW", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
};

/* =========================================================
   PDF COLORS
========================================================= */

const PDF_COLORS = {
  bg: [7, 7, 17],
  panel: [15, 15, 31],
  panel2: [20, 18, 42],
  purple: [124, 92, 255],
  purpleLight: [168, 85, 247],
  cyan: [0, 200, 255],
  yellow: [250, 204, 21],
  green: [52, 211, 153],
  red: [239, 48, 48],
  white: [255, 255, 255],
  text: [225, 225, 235],
  muted: [155, 155, 180],
  line: [55, 52, 80],
};

/* =========================================================
   PDF TEXT
========================================================= */

const setPDFText = (
  pdf,
  text,
  x,
  y,
  size = 10,
  color = PDF_COLORS.white,
  style = "normal"
) => {
  pdf.setFont("helvetica", style);
  pdf.setFontSize(size);

  pdf.setTextColor(
    color[0],
    color[1],
    color[2]
  );

  pdf.text(String(text ?? ""), x, y);
};

/* =========================================================
   PDF WRAPPED TEXT
========================================================= */

const drawPDFWrappedText = (
  pdf,
  text,
  x,
  y,
  width,
  size = 10,
  color = PDF_COLORS.white,
  style = "normal",
  lineHeight = 5
) => {
  pdf.setFont("helvetica", style);
  pdf.setFontSize(size);

  const lines = pdf.splitTextToSize(
    String(text || ""),
    width
  );

  lines.forEach((line, index) => {
    setPDFText(
      pdf,
      line,
      x,
      y + index * lineHeight,
      size,
      color,
      style
    );
  });

  return {
    lines,
    height: lines.length * lineHeight,
  };
};

/* =========================================================
   PDF BOX
========================================================= */

const drawPDFBox = (
  pdf,
  x,
  y,
  w,
  h,
  fill = PDF_COLORS.panel,
  stroke = null,
  radius = 5
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

/* =========================================================
   PDF HEADER
========================================================= */

const drawPDFHeader = (pdf, pageW, pageH) => {
  pdf.setFillColor(
    PDF_COLORS.bg[0],
    PDF_COLORS.bg[1],
    PDF_COLORS.bg[2]
  );

  pdf.rect(
    0,
    0,
    pageW,
    pageH,
    "F"
  );

  pdf.setDrawColor(
    PDF_COLORS.purple[0],
    PDF_COLORS.purple[1],
    PDF_COLORS.purple[2]
  );

  pdf.setLineWidth(1.2);

  pdf.line(8, 8, 37, 0);
  pdf.line(pageW - 37, 0, pageW - 8, 8);

  pdf.line(0, 23, 20, 10);
  pdf.line(pageW - 20, 10, pageW, 23);

  setPDFText(
    pdf,
    "NEWTALENTSG",
    16,
    18,
    19,
    PDF_COLORS.white,
    "bold"
  );

  setPDFText(
    pdf,
    "Stories • Talent • Opportunities",
    17,
    25,
    8,
    PDF_COLORS.muted
  );

  pdf.setDrawColor(
    PDF_COLORS.purpleLight[0],
    PDF_COLORS.purpleLight[1],
    PDF_COLORS.purpleLight[2]
  );

  pdf.setLineWidth(0.7);

  pdf.line(
    16,
    30,
    pageW - 16,
    30
  );
};

/* =========================================================
   PDF WATERMARK
========================================================= */

const drawPDFWatermark = (pdf) => {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  /* NAVIO WATERMARK */
  pdf.saveGraphicsState();

  try {
    pdf.setGState(
      new pdf.GState({
        opacity: 0.1,
      })
    );
  } catch {}

  pdf.setTextColor(
    PDF_COLORS.purple[0],
    PDF_COLORS.purple[1],
    PDF_COLORS.purple[2]
  );

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(60);

  pdf.text(
    "NAVIO",
    pageW - 61,
    pageH - 37,
    {
      angle: -17,
      align: "center",
    }
  );

  pdf.setDrawColor(
    PDF_COLORS.purpleLight[0],
    PDF_COLORS.purpleLight[1],
    PDF_COLORS.purpleLight[2]
  );

  pdf.setLineWidth(1);

  for (let i = 0; i < 6; i++) {
    pdf.line(
      pageW - 112 + i * 5,
      pageH - 64 + i * 3,
      pageW - 12,
      pageH - 94 + i * 3
    );
  }

  pdf.restoreGraphicsState();

  /* ADMIN STAMP */
  pdf.saveGraphicsState();

  pdf.setDrawColor(
    PDF_COLORS.red[0],
    PDF_COLORS.red[1],
    PDF_COLORS.red[2]
  );

  pdf.setTextColor(
    PDF_COLORS.red[0],
    PDF_COLORS.red[1],
    PDF_COLORS.red[2]
  );

  pdf.setLineWidth(1.2);

  const stampX = pageW - 68;
  const stampY = pageH - 20;

  pdf.rect(
    stampX,
    stampY - 14,
    53,
    16
  );

  pdf.rect(
    stampX + 2,
    stampY - 12,
    49,
    12
  );

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(15);

  pdf.text(
    "ADMIN",
    stampX + 26.5,
    stampY - 4,
    {
      align: "center",
      angle: -8,
    }
  );

  pdf.restoreGraphicsState();
};

/* =========================================================
   PDF FOOTER
========================================================= */

const drawPDFFooter = (
  pdf,
  pageNumber,
  pageCount
) => {
  const pageW =
    pdf.internal.pageSize.getWidth();

  const pageH =
    pdf.internal.pageSize.getHeight();

  pdf.setDrawColor(
    PDF_COLORS.line[0],
    PDF_COLORS.line[1],
    PDF_COLORS.line[2]
  );

  pdf.setLineWidth(0.4);

  pdf.line(
    12,
    pageH - 14,
    pageW - 12,
    pageH - 14
  );

  setPDFText(
    pdf,
    "© NewTalentsG · Announcement",
    12,
    pageH - 7,
    6.5,
    PDF_COLORS.muted
  );

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setFontSize(6.5);

  pdf.setTextColor(
    PDF_COLORS.muted[0],
    PDF_COLORS.muted[1],
    PDF_COLORS.muted[2]
  );

  pdf.text(
    `Page ${pageNumber} / ${pageCount}`,
    pageW - 12,
    pageH - 7,
    {
      align: "right",
    }
  );
};

/* =========================================================
   PDF SIGNATURE
========================================================= */

const drawPDFSignature = (
  pdf,
  x,
  y,
  width
) => {
  setPDFText(
    pdf,
    "Navio kki dabble le,",
    x,
    y,
    17,
    PDF_COLORS.white,
    "italic"
  );

  pdf.setDrawColor(
    PDF_COLORS.white[0],
    PDF_COLORS.white[1],
    PDF_COLORS.white[2]
  );

  pdf.setLineWidth(0.5);

  pdf.line(
    x,
    y + 4,
    x + 64,
    y + 4
  );

  setPDFText(
    pdf,
    "A C.E.O of New Talents Stories Group",
    x,
    y + 13,
    8,
    [190, 190, 210],
    "bold"
  );

  pdf.setDrawColor(
    PDF_COLORS.purple[0],
    PDF_COLORS.purple[1],
    PDF_COLORS.purple[2]
  );

  pdf.setLineWidth(0.7);

  pdf.line(
    x + width - 58,
    y + 9,
    x + width,
    y + 9
  );

  pdf.line(
    x + width - 45,
    y + 13,
    x + width,
    y + 13
  );
};

/* =========================================================
   CREATE NEW PAGE
========================================================= */

const createPDFPage = (pdf) => {
  pdf.addPage();

  const pageW =
    pdf.internal.pageSize.getWidth();

  const pageH =
    pdf.internal.pageSize.getHeight();

  drawPDFHeader(
    pdf,
    pageW,
    pageH
  );

  drawPDFWatermark(pdf);

  return {
    pageW,
    pageH,
    y: 42,
  };
};

/* =========================================================
   BODY LABEL
========================================================= */

const drawBodyLabel = (
  pdf,
  margin,
  y
) => {
  setPDFText(
    pdf,
    "UBUTUMWA",
    margin,
    y,
    7,
    PDF_COLORS.purpleLight,
    "bold"
  );

  pdf.setDrawColor(
    PDF_COLORS.purple[0],
    PDF_COLORS.purple[1],
    PDF_COLORS.purple[2]
  );

  pdf.setLineWidth(0.4);

  pdf.line(
    margin,
    y + 2,
    margin + 22,
    y + 2
  );
};

/* =========================================================
   PDF BODY PARAGRAPH RENDERER
========================================================= */

const renderParagraphsToPDF = (
  pdf,
  paragraphs,
  options = {}
) => {
  const {
    margin = 14,
    startY = 52,
    fontSize = 10.5,
    lineHeight = 5.6,
    paragraphGap = 5,
  } = options;

  const pageW =
    pdf.internal.pageSize.getWidth();

  const pageH =
    pdf.internal.pageSize.getHeight();

  /*
    Small horizontal padding.
    This keeps the text comfortably inside
    the document borders.
  */
  const horizontalPadding = 3;

  const contentWidth =
    pageW -
    margin * 2 -
    horizontalPadding * 2;

  /*
    Footer starts around here.
    Body must never enter this area.
  */
  const bottomLimit = pageH - 32;

  /*
    Where body starts on a new page.
  */
  const newPageStartY = 52;

  let y = startY;

  /* -------------------------------------------------------
     Move to another page
  ------------------------------------------------------- */

  const moveToNextPage = () => {
    createPDFPage(pdf);

    y = newPageStartY;

    drawBodyLabel(
      pdf,
      margin,
      y
    );

    y += 9;
  };

  /* -------------------------------------------------------
     Make sure there is enough vertical space
  ------------------------------------------------------- */

  const ensureSpace = (heightNeeded) => {
    if (
      y + heightNeeded >
      bottomLimit
    ) {
      moveToNextPage();
      return true;
    }

    return false;
  };

  /* -------------------------------------------------------
     Render paragraphs
  ------------------------------------------------------- */

  paragraphs.forEach(
    (paragraph, paragraphIndex) => {
      const paragraphText =
        String(paragraph || "");

      /*
        Preserve normal ENTERs.

        Example:

        Umurongo wa mbere.
        Umurongo wa kabiri.

        remains two separate lines.
      */
      const sourceLines =
        paragraphText.split("\n");

      sourceLines.forEach(
        (sourceLine) => {
          const cleanLine =
            sourceLine.trim();

          /*
            Empty line inside a paragraph.
          */
          if (!cleanLine) {
            ensureSpace(
              lineHeight
            );

            y += lineHeight;

            return;
          }

          /*
            Set the exact same font settings
            BEFORE measuring the text.
          */
          pdf.setFont(
            "helvetica",
            "normal"
          );

          pdf.setFontSize(
            fontSize
          );

          /*
            Wrap text according to
            the actual PDF width.
          */
          const wrappedLines =
            pdf.splitTextToSize(
              cleanLine,
              contentWidth
            );

          wrappedLines.forEach(
            (wrappedLine) => {
              /*
                Check page space BEFORE writing.
              */
              ensureSpace(
                lineHeight
              );

              setPDFText(
                pdf,
                wrappedLine,
                margin +
                  horizontalPadding,
                y,
                fontSize,
                PDF_COLORS.text,
                "normal"
              );

              y += lineHeight;
            }
          );
        }
      );

      /*
        Space between paragraphs.
      */
      if (
        paragraphIndex <
        paragraphs.length - 1
      ) {
        ensureSpace(
          paragraphGap
        );

        y += paragraphGap;
      }
    }
  );

  return y;
};

/* =========================================================
   PDF GENERATOR
========================================================= */

const generateAnnouncementPDF = (
  form
) => {
  const pdf = new jsPDF(
    "p",
    "mm",
    "a4"
  );

  const pageW =
    pdf.internal.pageSize.getWidth();

  const pageH =
    pdf.internal.pageSize.getHeight();

  const margin = 14;

  const type =
    TYPE_META[form.type] ||
    TYPE_META.kumenyesha;

  /* -------------------------------------------------------
     FIRST PAGE
  ------------------------------------------------------- */

  drawPDFHeader(
    pdf,
    pageW,
    pageH
  );

  drawPDFWatermark(pdf);

  let y = 40;

  /* -------------------------------------------------------
     TYPE
  ------------------------------------------------------- */

  drawPDFBox(
    pdf,
    margin,
    y,
    pageW - margin * 2,
    17,
    PDF_COLORS.panel2,
    PDF_COLORS.purple
  );

  setPDFText(
    pdf,
    "UBWOKO BW'ITANGAZO",
    margin + 7,
    y + 7,
    6.5,
    PDF_COLORS.muted,
    "bold"
  );

  setPDFText(
    pdf,
    type.label.toUpperCase(),
    margin + 7,
    y + 13,
    9,
    PDF_COLORS.purpleLight,
    "bold"
  );

  y += 25;

  /* -------------------------------------------------------
     TITLE
  ------------------------------------------------------- */

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(22);

  const titleLines =
    pdf.splitTextToSize(
      form.title || "ITANGAZO",
      pageW - margin * 2 - 10
    );

  for (
    let i = 0;
    i < titleLines.length;
    i++
  ) {
    setPDFText(
      pdf,
      titleLines[i],
      margin + 4,
      y + 8 + i * 9,
      22,
      PDF_COLORS.white,
      "bold"
    );
  }

  y +=
    Math.max(
      1,
      titleLines.length
    ) *
      9 +
    8;

  /* -------------------------------------------------------
     META DATA
  ------------------------------------------------------- */

  const metaItems = [];

  if (form.audience) {
    metaItems.push([
      "Rigenewe",
      form.audience,
    ]);
  }

  if (form.reference) {
    metaItems.push([
      "Reference",
      form.reference,
    ]);
  }

  if (form.date) {
    metaItems.push([
      "Itariki",
      formatDate(form.date),
    ]);
  }

  if (form.time) {
    metaItems.push([
      "Igihe",
      form.time,
    ]);
  }

  if (form.location) {
    metaItems.push([
      "Aho bizabera",
      form.location,
    ]);
  }

  if (metaItems.length > 0) {
    const rows =
      Math.ceil(
        metaItems.length / 2
      );

    const boxH =
      Math.max(
        18,
        rows * 16
      );

    if (
      y + boxH >
      pageH - 35
    ) {
      createPDFPage(pdf);

      y = 42;
    }

    drawPDFBox(
      pdf,
      margin,
      y,
      pageW - margin * 2,
      boxH,
      [12, 12, 27],
      [50, 48, 75]
    );

    let metaY = y + 8;

    for (
      let i = 0;
      i < metaItems.length;
      i += 2
    ) {
      const left =
        metaItems[i];

      const right =
        metaItems[i + 1];

      /* LEFT */
      setPDFText(
        pdf,
        left[0].toUpperCase(),
        margin + 6,
        metaY,
        5.8,
        PDF_COLORS.muted,
        "bold"
      );

      drawPDFWrappedText(
        pdf,
        left[1],
        margin + 6,
        metaY + 6,
        pageW / 2 -
          margin -
          15,
        7.5,
        PDF_COLORS.white,
        "bold",
        4
      );

      /* RIGHT */
      if (right) {
        const mid =
          pageW / 2 + 2;

        setPDFText(
          pdf,
          right[0].toUpperCase(),
          mid,
          metaY,
          5.8,
          PDF_COLORS.muted,
          "bold"
        );

        drawPDFWrappedText(
          pdf,
          right[1],
          mid,
          metaY + 6,
          pageW / 2 -
            margin -
            15,
          7.5,
          PDF_COLORS.white,
          "bold",
          4
        );
      }

      metaY += 16;
    }

    y +=
      boxH + 12;
  }

  /* -------------------------------------------------------
     BODY TITLE
  ------------------------------------------------------- */

  if (
    y + 15 >
    pageH - 30
  ) {
    createPDFPage(pdf);

    y = 42;
  }

  drawBodyLabel(
    pdf,
    margin,
    y
  );

  y += 9;

  /* -------------------------------------------------------
     BODY
  ------------------------------------------------------- */

  const paragraphs =
    getParagraphs(
      form.body
    );

  if (
    paragraphs.length > 0
  ) {
    y =
      renderParagraphsToPDF(
        pdf,
        paragraphs,
        {
          margin,
          startY: y,
          fontSize: 10.5,
          lineHeight: 5.6,
          paragraphGap: 5,
        }
      );
  } else {
    setPDFText(
      pdf,
      "Nta butumwa bwanditswe.",
      margin + 2,
      y,
      10,
      PDF_COLORS.muted
    );

    y += 15;
  }

  /* -------------------------------------------------------
     WEBSITE RULE NOTICE
  ------------------------------------------------------- */

  const noticeHeight = 35;

  /*
    If there is not enough space for the notice
    plus signature, create a new page.
  */
  if (
    y +
      noticeHeight +
      48 >
    pageH - 28
  ) {
    createPDFPage(pdf);

    y = 52;
  }

  drawPDFBox(
    pdf,
    margin,
    y,
    pageW - margin * 2,
    noticeHeight,
    [18, 25, 25],
    PDF_COLORS.purple
  );

  setPDFText(
    pdf,
    "AMABWIRIZA AGENGA URUBUGA",
    margin + 7,
    y + 9,
    6,
    PDF_COLORS.muted,
    "bold"
  );

  const noticeText =
    "Iri tangazo ritanzwe hakurikijwe amategeko agenga urubuga rwacu.";

  drawPDFWrappedText(
    pdf,
    noticeText,
    margin + 7,
    y + 18,
    pageW - margin * 2 - 14,
    10,
    PDF_COLORS.white,
    "bold",
    5
  );

  y +=
    noticeHeight + 15;

  /* -------------------------------------------------------
     SIGNATURE
  ------------------------------------------------------- */

  if (
    y + 30 >
    pageH - 27
  ) {
    createPDFPage(pdf);

    y = 55;
  }

  drawPDFSignature(
    pdf,
    margin + 3,
    y,
    pageW - margin * 2
  );

  /* -------------------------------------------------------
     FOOTERS
  ------------------------------------------------------- */

  const pageCount =
    pdf.getNumberOfPages();

  for (
    let page = 1;
    page <= pageCount;
    page++
  ) {
    pdf.setPage(page);

    drawPDFFooter(
      pdf,
      page,
      pageCount
    );
  }

  /* -------------------------------------------------------
     SAVE
  ------------------------------------------------------- */

  const filename =
    `${safeFileName(
      form.title ||
        "itangazo"
    )}.pdf`;

  pdf.save(filename);
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Annonce() {
  const { t } = useI18n();

  const [form, setForm] =
    useState(DEFAULT_FORM);

  const [preview, setPreview] =
    useState(false);

  const [error, setError] =
    useState("");

  const [downloading, setDownloading] =
    useState(false);

  const selectedType =
    useMemo(
      () =>
        TYPE_META[form.type] ||
        TYPE_META.kumenyesha,
      [form.type]
    );

  /* -------------------------------------------------------
     UPDATE FIELD
  ------------------------------------------------------- */

  const updateField = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
  };

  /* -------------------------------------------------------
     PREVIEW
  ------------------------------------------------------- */

  const handlePreview = () => {
    const title =
      form.title.trim();

    const body =
      normalizeBody(
        form.body
      );

    if (!title) {
      setError(
        t("Andika umutwe w'itangazo.")
      );

      return;
    }

    if (!body) {
      setError(
        t("Andika ubutumwa bw'itangazo.")
      );

      return;
    }

    setForm((current) => ({
      ...current,
      title,
      body,
    }));

    setPreview(true);

    setTimeout(() => {
      document
        .getElementById(
          "announcement-preview"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 80);
  };

  /* -------------------------------------------------------
     RESET
  ------------------------------------------------------- */

  const resetForm = () => {
    setForm({
      ...DEFAULT_FORM,
    });

    setPreview(false);
    setError("");
  };

  /* -------------------------------------------------------
     DOWNLOAD
  ------------------------------------------------------- */

  const handleDownload = () => {
    if (!preview) {
      setError(
        t("Banza ukande Preview urebe itangazo mbere yo kurimanura.")
      );

      return;
    }

    setDownloading(true);

    try {
      generateAnnouncementPDF(
        form
      );
    } catch (e) {
      console.error(
        "PDF generation error:",
        e
      );

      setError(
        t("PDF ntiyakozwe neza. Reba console ya browser.")
      );
    } finally {
      setTimeout(() => {
        setDownloading(false);
      }, 700);
    }
  };

  const paragraphs =
    getParagraphs(
      form.body
    );

  return (
    <>
      <Head>
        <title>{t("Andika Itangazo — NewTalentsG")}</title>

        <meta
          name="description"
          content="Andika, reba preview kandi ukore PDF y'itangazo rya NewTalentsG"
        />
      </Head>

      <main className={styles.page}>
        <div className={styles.shell}>

          {/* =================================================
              HEADER
          ================================================= */}

          <header
            className={
              styles.pageHeader
            }
          >
            <div
              className={
                styles.headerLeft
              }
            >
              <div
                className={
                  styles.headerIcon
                }
              >
                <FiVolume2 />
              </div>

              <div>
                <div
                  className={
                    styles.eyebrow
                  }
                >
                  <FiZap />{t("NEWTALENTSG")}</div>

                <h1>{t("Andika")}{" "}
                  <span>{t("Itangazo")}</span>
                </h1>

                <p>{t("Andika itangazo, hitamo ubwoko, urebe preview, hanyuma urikore PDF.")}</p>
              </div>
            </div>

            <div
              className={
                styles.headerBadge
              }
            >
              <FiFileText />{t("PDF READY")}</div>
          </header>

          {/* =================================================
              BUILDER
          ================================================= */}

          <section
            className={
              styles.builder
            }
          >
            <div
              className={
                styles.builderHeader
              }
            >
              <div>
                <h2>
                  <FiEdit3 />{t("Andika itangazo")}</h2>

                <p>{t("Uzuza amakuru akenewe maze ubone report iteguye neza.")}</p>
              </div>

              <button
                type="button"
                className={
                  styles.resetBtn
                }
                onClick={
                  resetForm
                }
              >
                <FiRefreshCw />{t("Tangira bundi")}</button>
            </div>

            {/* =================================================
                TYPE SELECTOR
            ================================================= */}

            <div
              className={
                styles.formSection
              }
            >
              <div
                className={
                  styles.sectionLabel
                }
              >
                <FiTag />{t("Ubwoko bw'itangazo")}</div>

              <div
                className={
                  styles.typeGrid
                }
              >
                {ANNOUNCEMENT_TYPES.map(
                  (item) => {
                    const active =
                      form.type ===
                      item.value;

                    return (
                      <button
                        key={
                          item.value
                        }
                        type="button"
                        className={`${styles.typeCard} ${
                          active
                            ? styles.typeActive
                            : ""
                        }`}
                        onClick={() =>
                          updateField(
                            "type",
                            item.value
                          )
                        }
                      >
                        <span
                          className={
                            styles.typeIcon
                          }
                        >
                          {
                            item.icon
                          }
                        </span>

                        <span
                          className={
                            styles.typeContent
                          }
                        >
                          <strong>
                            {
                              item.label
                            }
                          </strong>

                          <small>
                            {
                              item.description
                            }
                          </small>
                        </span>

                        {active && (
                          <span
                            className={
                              styles.typeCheck
                            }
                          >
                            <FiCheck />
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* =================================================
                FORM
            ================================================= */}

            <div
              className={
                styles.formSection
              }
            >
              <div
                className={
                  styles.sectionLabel
                }
              >
                <FiFileText />{t("Amakuru y'itangazo")}</div>

              <div
                className={
                  styles.formGrid
                }
              >
                {/* TITLE */}
                <div
                  className={
                    styles.field
                  }
                >
                  <label>{t("Umutwe w'itangazo")}<span>*</span>
                  </label>

                  <input
                    type="text"
                    value={
                      form.title
                    }
                    onChange={(e) =>
                      updateField(
                        "title",
                        e.target.value
                      )
                    }
                    placeholder={t("Urugero: Itangazo rigenewe abanditsi bose")}
                    className={
                      styles.input
                    }
                  />
                </div>

                {/* AUDIENCE */}
                <div
                  className={
                    styles.field
                  }
                >
                  <label>{t("Rigenewe")}</label>

                  <input
                    type="text"
                    value={
                      form.audience
                    }
                    onChange={(e) =>
                      updateField(
                        "audience",
                        e.target.value
                      )
                    }
                    placeholder={t("Urugero: Abanditsi bose ba NewTalentsG")}
                    className={
                      styles.input
                    }
                  />
                </div>

                {/* DATE */}
                <div
                  className={
                    styles.field
                  }
                >
                  <label>{t("Itariki")}</label>

                  <div
                    className={
                      styles.inputIcon
                    }
                  >
                    <FiCalendar />

                    <input
                      type="date"
                      value={
                        form.date
                      }
                      onChange={(e) =>
                        updateField(
                          "date",
                          e.target.value
                        )
                      }
                      className={
                        styles.input
                      }
                    />
                  </div>
                </div>

                {/* TIME */}
                <div
                  className={
                    styles.field
                  }
                >
                  <label>{t("Igihe")}</label>

                  <div
                    className={
                      styles.inputIcon
                    }
                  >
                    <FiClock />

                    <input
                      type="time"
                      value={
                        form.time
                      }
                      onChange={(e) =>
                        updateField(
                          "time",
                          e.target.value
                        )
                      }
                      className={
                        styles.input
                      }
                    />
                  </div>
                </div>

                {/* LOCATION */}
                <div
                  className={
                    styles.field
                  }
                >
                  <label>{t("Aho bizabera")}</label>

                  <div
                    className={
                      styles.inputIcon
                    }
                  >
                    <FiMapPin />

                    <input
                      type="text"
                      value={
                        form.location
                      }
                      onChange={(e) =>
                        updateField(
                          "location",
                          e.target.value
                        )
                      }
                      placeholder={t("Urugero: NewTalentsG Office")}
                      className={
                        styles.input
                      }
                    />
                  </div>
                </div>

                {/* REFERENCE */}
                <div
                  className={
                    styles.field
                  }
                >
                  <label>{t("Reference")}</label>

                  <input
                    type="text"
                    value={
                      form.reference
                    }
                    onChange={(e) =>
                      updateField(
                        "reference",
                        e.target.value
                      )
                    }
                    placeholder={t("Urugero: NTG/2026/09")}
                    className={
                      styles.input
                    }
                  />
                </div>
              </div>

              {/* =================================================
                  BODY
              ================================================= */}

              <div
                className={
                  styles.field
                }
              >
                <div
                  className={
                    styles.bodyLabel
                  }
                >
                  <label>{t("Andika itangazo")}<span>*</span>
                  </label>

                  <span>
                    {form.body.length.toLocaleString()}{" "}{t("characters")}</span>
                </div>

                <textarea
                  value={
                    form.body
                  }
                  onChange={(e) =>
                    updateField(
                      "body",
                      e.target.value
                    )
                  }
                  placeholder={t("Andika itangazo ryawe hano... Urugero: Turamenyesha abanditsi bose ko gahunda nshya yo gutanga inkuru izatangira... Andika paragraph nshya ushyizemo umurongo ubusa hagati yayo.")}
                  className={
                    styles.textarea
                  }
                  rows={12}
                />

                <div
                  className={
                    styles.editorHint
                  }
                >
                  <FiInfo />{t("Koresha umurongo utambitse hagati ya paragraphs kugira ngo report igaragare neza.")}</div>
              </div>
            </div>

            {/* ERROR */}

            {error && (
              <div
                className={
                  styles.error
                }
              >
                <FiX />
                {error}
              </div>
            )}

            {/* ACTIONS */}

            <div
              className={
                styles.builderActions
              }
            >
              <button
                type="button"
                className={
                  styles.previewBtn
                }
                onClick={
                  handlePreview
                }
              >
                <FiEye />{t("Preview")}</button>

              <button
                type="button"
                className={
                  styles.downloadBtn
                }
                onClick={
                  handleDownload
                }
                disabled={
                  downloading ||
                  !preview
                }
              >
                {downloading ? (
                  <>
                    <FiRefreshCw
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
          </section>

          {/* =================================================
              PREVIEW
          ================================================= */}

          {preview && (
            <section
              id="announcement-preview"
              className={
                styles.previewSection
              }
            >
              <div
                className={
                  styles.previewHeader
                }
              >
                <div>
                  <span
                    className={
                      styles.previewEyebrow
                    }
                  >
                    <FiEye />{t("LIVE PREVIEW")}</span>

                  <h2>{t("Reba uko itangazo rizasohoka")}</h2>

                  <p>{t("Ibyo ubona hano ni preview. PDF nyayo yubakwa direct na jsPDF.")}</p>
                </div>

                <button
                  type="button"
                  className={
                    styles.downloadSmall
                  }
                  onClick={
                    handleDownload
                  }
                  disabled={
                    downloading
                  }
                >
                  <FiDownload />

                  {downloading
                    ? t("Turakora...")
                    : t("Download PDF")}
                </button>
              </div>

              <article
                className={
                  styles.announcementPaper
                }
              >
                {/* CORNERS */}

                <span
                  className={
                    styles.cornerTopLeft
                  }
                />

                <span
                  className={
                    styles.cornerTopRight
                  }
                />

                <span
                  className={
                    styles.cornerBottomLeft
                  }
                />

                <span
                  className={
                    styles.cornerBottomRight
                  }
                />

                {/* PAPER HEADER */}

                <header
                  className={
                    styles.paperHeader
                  }
                >
                  <div>
                    <div
                      className={
                        styles.paperBrand
                      }
                    >{t("NEWTALENTSG")}</div>

                    <div
                      className={
                        styles.paperBrandSub
                      }
                    >{t("Stories • Talent • Opportunities")}</div>
                  </div>

                  <div
                    className={
                      styles.paperType
                    }
                  >
                    {
                      selectedType.label
                    }
                  </div>
                </header>

                {/* TITLE */}

                <div
                  className={
                    styles.paperTitleBlock
                  }
                >
                  <span
                    className={
                      styles.paperKicker
                    }
                  >{t("ITANGAZO")}</span>

                  <h1>
                    {form.title ||
                      t("Umutwe w'itangazo")}
                  </h1>

                  <div
                    className={
                      styles.titleLine
                    }
                  />
                </div>

                {/* META */}

                {(form.audience ||
                  form.date ||
                  form.time ||
                  form.location ||
                  form.reference) && (
                  <div
                    className={
                      styles.paperMeta
                    }
                  >
                    {form.audience && (
                      <div
                        className={
                          styles.metaItem
                        }
                      >
                        <FiUsers />

                        <div>
                          <small>{t("RIGENEWE")}</small>

                          <strong>
                            {
                              form.audience
                            }
                          </strong>
                        </div>
                      </div>
                    )}

                    {form.date && (
                      <div
                        className={
                          styles.metaItem
                        }
                      >
                        <FiCalendar />

                        <div>
                          <small>{t("ITARIKI")}</small>

                          <strong>
                            {formatDate(
                              form.date
                            )}
                          </strong>
                        </div>
                      </div>
                    )}

                    {form.time && (
                      <div
                        className={
                          styles.metaItem
                        }
                      >
                        <FiClock />

                        <div>
                          <small>{t("IGIHE")}</small>

                          <strong>
                            {form.time}
                          </strong>
                        </div>
                      </div>
                    )}

                    {form.location && (
                      <div
                        className={
                          styles.metaItem
                        }
                      >
                        <FiMapPin />

                        <div>
                          <small>{t("AHO BIZABERA")}</small>

                          <strong>
                            {
                              form.location
                            }
                          </strong>
                        </div>
                      </div>
                    )}

                    {form.reference && (
                      <div
                        className={
                          styles.metaItem
                        }
                      >
                        <FiTag />

                        <div>
                          <small>{t("REFERENCE")}</small>

                          <strong>
                            {
                              form.reference
                            }
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* BODY */}

                <div
                  className={
                    styles.paperBody
                  }
                >
                  {paragraphs.length >
                  0 ? (
                    paragraphs.map(
                      (
                        paragraph,
                        index
                      ) => (
                        <p
                          key={`p-${index}`}
                          style={{
                            whiteSpace:
                              "pre-line",
                          }}
                        >
                          {paragraph}
                        </p>
                      )
                    )
                  ) : (
                    <p
                      className={
                        styles.emptyBody
                      }
                    >{t("Andika ubutumwa bw'itangazo hano...")}</p>
                  )}
                </div>

                {/* WEBSITE NOTICE */}

                <div
                  className={
                    styles.paymentNotice
                  }
                >
                  <div
                    className={
                      styles.noticeIcon
                    }
                  >
                    <FiCheck />
                  </div>

                  <div>
                    <span>{t("AMABWIRIZA AGENGA URUBUGA")}</span>

                    <strong>{t("Iri tangazo ritanzwe hakurikijwe amategeko agenga urubuga rwacu.")}</strong>

                    <small>{t("Murakoze kubahiriza amabwiriza yacu.")}</small>
                  </div>
                </div>

                {/* FOOTER */}

                <footer
                  className={
                    styles.paperFooter
                  }
                >
                  <div
                    className={
                      styles.signatureBlock
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
                      styles.watermarkBlock
                    }
                  >
                    <div
                      className={
                        styles.navioWatermark
                      }
                    >{t("NAVIO")}</div>

                    <div
                      className={
                        styles.watermarkLines
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
                </footer>

                {/* BOTTOM */}

                <div
                  className={
                    styles.paperBottom
                  }
                >
                  <span>{t("NewTalentsG")}</span>

                  <span>{t("Announcement")}</span>

                  <span>
                    {new Date().getFullYear()}
                  </span>
                </div>
              </article>
            </section>
          )}

          {/* =================================================
              EMPTY PREVIEW
          ================================================= */}

          {!preview && (
            <div
              className={
                styles.emptyPreview
              }
            >
              <div
                className={
                  styles.emptyIcon
                }
              >
                <FiEye />
              </div>

              <h3>{t("Preview y'itangazo")}</h3>

              <p>{t("Uzuza umutwe n'ubutumwa bw'itangazo, hanyuma ukande Preview kugira ngo uribone mbere yo gukora PDF.")}</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
