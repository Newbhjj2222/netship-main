// pages/invoice.js
import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";

import { db } from "@/components/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

import {
  FiFileText,
  FiUser,
  FiPhone,
  FiMail,
  FiCalendar,
  FiHash,
  FiPlus,
  FiMinus,
  FiTrash2,
  FiDownload,
  FiImage,
  FiSave,
  FiLoader,
  FiCheckCircle,
  FiAlertTriangle,
  FiX,
  FiEye,
  FiDollarSign,
  FiPackage,
  FiEdit3,
  FiAward,
  FiEdit,
  FiRefreshCw,
} from "react-icons/fi";

import { FaMobileAlt } from "react-icons/fa";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import styles from "../styles/invoice.module.css";
import { useI18n } from "@/i18n/I18nProvider";

/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_BG = "#070711";
const CURRENCY = "RWF";
const STORAGE_KEY = "newtalents_invoice_draft_v1";

const PDF = {
  pageWidth: 210,
  pageHeight: 297,
  margin: 12,
  contentWidth: 186,
};

const PDF_COLORS = {
  background: [7, 7, 17],
  white: [245, 245, 250],
  softWhite: [220, 220, 230],
  muted: [160, 160, 175],
  purple: [145, 90, 255],
  cyan: [40, 210, 220],
  green: [70, 210, 140],
  red: [230, 70, 90],
  border: [55, 55, 75],
  card: [14, 14, 28],
  darkCard: [10, 10, 20],
};

/* =========================================================
   BUSINESS INFORMATION
========================================================= */

const BUSINESS = {
  name: "New Talents Stories Group",
  tagline: "Stories · Publishing · Creativity",
  address: "Kigali, Rwanda",
  phone: "+250 722 319 367",
  email: "admin@newtalentsg.co.rw",
  momo: "1374912",
  
};

/* =========================================================
   HELPERS
========================================================= */

const formatRWF = (n) =>
  !Number.isFinite(Number(n))
    ? `0 ${CURRENCY}`
    : `${new Intl.NumberFormat("en-RW").format(
        Math.round(Number(n))
      )} ${CURRENCY}`;

const safeFileName = (name) =>
  String(name || "invoice")
    .replace(/[^\w-]+/g, "_")
    .slice(0, 60);

const generateInvoiceNumber = () => {
  const d = new Date();

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  const rand = Math.floor(Math.random() * 9000) + 1000;

  return `INV-${y}${m}${day}-${rand}`;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const loadDraft = () => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveDraftLocal = (data) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );
  } catch {}
};

const clearDraftLocal = () => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
};

const emptyItem = () => ({
  id: Math.random().toString(36).slice(2, 9),
  description: "",
  qty: 1,
  price: 0,
});

const toDateInput = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (value?.toDate) {
    const d = value.toDate();
    return d.toISOString().slice(0, 10);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return "";
};

const formatDisplayDate = (value) => {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("en-GB");
  } catch {
    return value;
  }
};

const normalizeText = (value) =>
  String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

const splitTextForPDF = (pdf, text, width) => {
  const normalized = normalizeText(text);

  if (!normalized) return [""];

  const paragraphs = normalized.split("\n");
  const result = [];

  paragraphs.forEach((paragraph) => {
    if (!paragraph.trim()) {
      result.push("");
      return;
    }

    const wrapped = pdf.splitTextToSize(
      paragraph,
      width
    );

    if (Array.isArray(wrapped)) {
      result.push(...wrapped);
    } else {
      result.push(wrapped);
    }
  });

  return result;
};
const loadImageAsDataURL = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(
          new Error("Canvas context ntiyabonetse.")
        );
        return;
      }

      ctx.drawImage(img, 0, 0);

      resolve(
        canvas.toDataURL("image/png")
      );
    };

    img.onerror = () => {
      reject(
        new Error(
          `Logo ntiyabonetse: ${src}`
        )
      );
    };

    img.src = src;
  });

/* =========================================================
   WATERMARK
========================================================= */

function Watermark() {
  const { t } = useI18n();

  const items = Array.from({ length: 28 }, (_, i) => i);

  return (
    <div className={styles.watermark} aria-hidden="true">
      <div className={styles.watermarkLines} />

      <div className={styles.watermarkGrid}>
        {items.map((i) => (
          <span
            key={i}
            className={`${styles.watermarkItem} ${
              i % 3 === 0
                ? styles.watermarkAlt
                : ""
            }`}
          >{t("NAVIO · ADMIN")}</span>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   PDF HELPERS
========================================================= */

const pdfSetFont = (
  pdf,
  size = 10,
  style = "normal",
  color = PDF_COLORS.white
) => {
  pdf.setFont("helvetica", style);
  pdf.setFontSize(size);
  pdf.setTextColor(
    color[0],
    color[1],
    color[2]
  );
};

const pdfFill = (pdf, color) => {
  pdf.setFillColor(
    color[0],
    color[1],
    color[2]
  );
};

const pdfStroke = (pdf, color) => {
  pdf.setDrawColor(
    color[0],
    color[1],
    color[2]
  );
};

const pdfDrawBackground = (pdf) => {
  pdfFill(pdf, PDF_COLORS.background);

  pdf.rect(
    0,
    0,
    PDF.pageWidth,
    PDF.pageHeight,
    "F"
  );
};

const pdfDrawHeader = (
  pdf,
  invoice,
  logoData = null
) => {
  pdfDrawBackground(pdf);

  const x = PDF.margin;
  const y = 12;

  /* Top accent */
  /* =====================================================
   LOGO
===================================================== */

if (logoData) {
  pdf.addImage(
    logoData,
    "PNG",
    x,
    y - 1,
    18,
    18
  );
}

pdfSetFont(
  pdf,
  16,
  "bold",
  PDF_COLORS.white
);

pdf.text(
  BUSINESS.name,
  x + 24,
  y + 6
);

  pdfSetFont(
  pdf,
  8,
  "normal",
  PDF_COLORS.muted
);

pdf.text(
  BUSINESS.tagline,
  x + 24,
  y + 11
);

  pdfSetFont(
    pdf,
    8,
    "normal",
    PDF_COLORS.softWhite
  );

  pdf.text(
    `${BUSINESS.address} · ${BUSINESS.phone}`,
    x,
    y + 18
  );

  pdf.text(
    `${BUSINESS.email} · MoMo: ${BUSINESS.momo}`,
    x,
    y + 23
  );

  /* Invoice side */

  pdfSetFont(
    pdf,
    18,
    "bold",
    PDF_COLORS.purple
  );

  pdf.text(
    "INVOICE",
    PDF.pageWidth - PDF.margin,
    y + 4,
    { align: "right" }
  );

  pdfSetFont(
    pdf,
    10,
    "bold",
    PDF_COLORS.white
  );

  pdf.text(
    invoice.invoiceNumber || "—",
    PDF.pageWidth - PDF.margin,
    y + 10,
    { align: "right" }
  );

  pdfSetFont(
    pdf,
    8,
    "normal",
    PDF_COLORS.muted
  );

  pdf.text(
    `Date: ${formatDisplayDate(
      invoice.dateIssued
    )}`,
    PDF.pageWidth - PDF.margin,
    y + 16,
    { align: "right" }
  );

  if (invoice.dueDate) {
    pdf.text(
      `Due: ${formatDisplayDate(
        invoice.dueDate
      )}`,
      PDF.pageWidth - PDF.margin,
      y + 21,
      { align: "right" }
    );
  }

  /* Divider */

  pdfStroke(pdf, PDF_COLORS.border);
  pdf.setLineWidth(0.3);

  pdf.line(
    PDF.margin,
    41,
    PDF.pageWidth - PDF.margin,
    41
  );
};

const pdfDrawWatermark = (pdf) => {
  try {
    if (typeof pdf.GState === "function") {
      pdf.setGState(
        new pdf.GState({
          opacity: 0.055,
        })
      );
    }
  } catch {}

  pdfSetFont(
    pdf,
    30,
    "bold",
    [190, 70, 80]
  );

  for (let y = 70; y < 280; y += 34) {
    pdf.text(
      "NAVIO",
      PDF.pageWidth / 2,
      y,
      {
        align: "center",
        angle: -25,
      }
    );

    pdf.setLineWidth(0.6);

    pdf.line(
      30,
      y + 7,
      180,
      y - 12
    );
  }

  try {
    if (typeof pdf.GState === "function") {
      pdf.setGState(
        new pdf.GState({
          opacity: 1,
        })
      );
    }
  } catch {}
};

const pdfDrawClientBox = (pdf, invoice) => {
  const x = PDF.margin;
  const y = 48;
  const w = 186;
  const h = 34;

  pdfFill(pdf, PDF_COLORS.card);

  pdfStroke(pdf, PDF_COLORS.border);

  pdf.roundedRect(
    x,
    y,
    w,
    h,
    3,
    3,
    "FD"
  );

  /* Client */

  pdfSetFont(
    pdf,
    7,
    "bold",
    PDF_COLORS.purple
  );

  pdf.text(
    "BILLED TO",
    x + 5,
    y + 7
  );

  pdfSetFont(
    pdf,
    11,
    "bold",
    PDF_COLORS.white
  );

  pdf.text(
    invoice.clientName || "—",
    x + 5,
    y + 14
  );

  let clientY = y + 20;

  pdfSetFont(
    pdf,
    8,
    "normal",
    PDF_COLORS.muted
  );

  if (invoice.clientPhone) {
    pdf.text(
      `Tel: ${invoice.clientPhone}`,
      x + 5,
      clientY
    );

    clientY += 5;
  }

  if (invoice.clientEmail) {
    pdf.text(
      `Email: ${invoice.clientEmail}`,
      x + 5,
      clientY
    );
  }

  /* Status */

  pdfSetFont(
    pdf,
    7,
    "bold",
    PDF_COLORS.muted
  );

  pdf.text(
    "STATUS",
    x + w - 5,
    y + 7,
    { align: "right" }
  );

  const status =
    String(invoice.status || "pending")
      .toUpperCase();

  const statusColor =
    invoice.status === "paid"
      ? PDF_COLORS.green
      : invoice.status === "cancelled"
      ? PDF_COLORS.red
      : PDF_COLORS.purple;

  pdfSetFont(
    pdf,
    10,
    "bold",
    statusColor
  );

  pdf.text(
    status,
    x + w - 5,
    y + 16,
    { align: "right" }
  );
};

const pdfDrawTableHeader = (pdf, y) => {
  const x = PDF.margin;
  const w = 186;
  const h = 9;

  pdfFill(pdf, [24, 24, 42]);

  pdf.roundedRect(
    x,
    y,
    w,
    h,
    2,
    2,
    "F"
  );

  pdfSetFont(
    pdf,
    7.5,
    "bold",
    PDF_COLORS.softWhite
  );

  pdf.text("#", x + 4, y + 6);

  pdf.text(
    "DESCRIPTION",
    x + 14,
    y + 6
  );

  pdf.text(
    "QTY",
    x + 112,
    y + 6,
    { align: "center" }
  );

  pdf.text(
    "PRICE",
    x + 142,
    y + 6,
    { align: "right" }
  );

  pdf.text(
    "AMOUNT",
    x + 181,
    y + 6,
    { align: "right" }
  );

  return y + h;
};

const pdfDrawItemRow = (
  pdf,
  item,
  index,
  y
) => {
  const x = PDF.margin;
  const w = 186;

  const description = normalizeText(
    item.description
  );

  const wrappedDescription =
    pdf.splitTextToSize(
      description || "—",
      90
    );

  const rowHeight = Math.max(
    10,
    wrappedDescription.length * 4.5 + 5
  );

  if (index % 2 === 0) {
    pdfFill(pdf, [11, 11, 23]);

    pdf.rect(
      x,
      y,
      w,
      rowHeight,
      "F"
    );
  }

  pdfStroke(pdf, PDF_COLORS.border);

  pdf.setLineWidth(0.2);

  pdf.line(
    x,
    y + rowHeight,
    x + w,
    y + rowHeight
  );

  pdfSetFont(
    pdf,
    8,
    "normal",
    PDF_COLORS.muted
  );

  pdf.text(
    String(index + 1),
    x + 4,
    y + 6
  );

  pdfSetFont(
    pdf,
    8.2,
    "normal",
    PDF_COLORS.white
  );

  pdf.text(
    wrappedDescription,
    x + 14,
    y + 5
  );

  pdfSetFont(
    pdf,
    8,
    "normal",
    PDF_COLORS.white
  );

  pdf.text(
    String(item.qty || 0),
    x + 112,
    y + 6,
    { align: "center" }
  );

  pdf.text(
    formatRWF(Number(item.price) || 0),
    x + 142,
    y + 6,
    { align: "right" }
  );

  pdfSetFont(
    pdf,
    8,
    "bold",
    PDF_COLORS.white
  );

  pdf.text(
    formatRWF(
      (Number(item.qty) || 0) *
        (Number(item.price) || 0)
    ),
    x + 181,
    y + 6,
    { align: "right" }
  );

  return y + rowHeight;
};

const pdfDrawTotals = (
  pdf,
  totals,
  invoice,
  y
) => {
  const x = 112;
  const w = 80;

  const boxHeight =
    31 +
    (totals.tax > 0 ? 6 : 0) +
    (totals.discount > 0 ? 6 : 0);

  pdfFill(pdf, PDF_COLORS.card);

  pdfStroke(pdf, PDF_COLORS.border);

  pdf.roundedRect(
    x,
    y,
    w,
    boxHeight,
    3,
    3,
    "FD"
  );

  let rowY = y + 7;

  pdfSetFont(
    pdf,
    8,
    "normal",
    PDF_COLORS.muted
  );

  pdf.text(
    "Subtotal",
    x + 5,
    rowY
  );

  pdfSetFont(
    pdf,
    8,
    "bold",
    PDF_COLORS.white
  );

  pdf.text(
    formatRWF(totals.subtotal),
    x + w - 5,
    rowY,
    { align: "right" }
  );

  rowY += 6;

  if (totals.tax > 0) {
    pdfSetFont(
      pdf,
      8,
      "normal",
      PDF_COLORS.muted
    );

    pdf.text(
      `Tax (${invoice.taxRate}%)`,
      x + 5,
      rowY
    );

    pdfSetFont(
      pdf,
      8,
      "bold",
      PDF_COLORS.white
    );

    pdf.text(
      formatRWF(totals.tax),
      x + w - 5,
      rowY,
      { align: "right" }
    );

    rowY += 6;
  }

  if (totals.discount > 0) {
    pdfSetFont(
      pdf,
      8,
      "normal",
      PDF_COLORS.muted
    );

    pdf.text(
      "Discount",
      x + 5,
      rowY
    );

    pdfSetFont(
      pdf,
      8,
      "bold",
      PDF_COLORS.red
    );

    pdf.text(
      `-${formatRWF(totals.discount)}`,
      x + w - 5,
      rowY,
      { align: "right" }
    );

    rowY += 6;
  }

  pdfStroke(pdf, PDF_COLORS.border);

  pdf.line(
    x + 5,
    rowY + 1,
    x + w - 5,
    rowY + 1
  );

  rowY += 8;

  pdfSetFont(
    pdf,
    10,
    "bold",
    PDF_COLORS.purple
  );

  pdf.text(
    "TOTAL DUE",
    x + 5,
    rowY
  );

  pdfSetFont(
    pdf,
    11,
    "bold",
    PDF_COLORS.white
  );

  pdf.text(
    formatRWF(totals.total),
    x + w - 5,
    rowY,
    { align: "right" }
  );

  return y + boxHeight;
};

const pdfDrawNote = (
  pdf,
  note,
  y
) => {
  if (!normalizeText(note)) {
    return y;
  }

  const x = PDF.margin;
  const w = 186;

  const lines = splitTextForPDF(
    pdf,
    note,
    w - 10
  );

  const h =
    12 +
    lines.length * 4.5;

  pdfFill(pdf, [12, 12, 25]);

  pdfStroke(pdf, PDF_COLORS.border);

  pdf.roundedRect(
    x,
    y,
    w,
    h,
    3,
    3,
    "FD"
  );

  pdfSetFont(
    pdf,
    7,
    "bold",
    PDF_COLORS.purple
  );

  pdf.text(
    "NOTE",
    x + 5,
    y + 7
  );

  pdfSetFont(
    pdf,
    8,
    "normal",
    PDF_COLORS.softWhite
  );

  pdf.text(
    lines,
    x + 5,
    y + 12
  );

  return y + h;
};

const pdfDrawPaymentNotice = (
  pdf,
  y
) => {
  const x = PDF.margin;
  const w = 186;

  const title =
    "Amabwiriza agenga iyi invoice";

  const message =
    "Iri tangazo ritanzwe hakurikijwe amategeko agenga urubuga rwacu.";

  const messageLines =
    pdf.splitTextToSize(
      message,
      w - 12
    );

  const h =
    17 +
    messageLines.length * 4.5;

  pdfFill(pdf, [22, 13, 28]);

  pdfStroke(pdf, [85, 50, 100]);

  pdf.roundedRect(
    x,
    y,
    w,
    h,
    3,
    3,
    "FD"
  );

  pdfSetFont(
    pdf,
    8,
    "bold",
    PDF_COLORS.purple
  );

  pdf.text(
    title,
    x + 6,
    y + 7
  );

  pdfSetFont(
    pdf,
    8.5,
    "normal",
    PDF_COLORS.softWhite
  );

  pdf.text(
    messageLines,
    x + 6,
    y + 13
  );

  return y + h;
};

const pdfDrawSignature = (pdf, y) => {
  const x = PDF.margin;
  const signatureY = y + 12;

  /* =====================================================
     ADMIN STAMP / KASHE
  ===================================================== */

  try {
    if (typeof pdf.GState === "function") {
      pdf.setGState(
        new pdf.GState({
          opacity: 0.85,
        })
      );
    }
  } catch {}

  pdf.setDrawColor(
    255,
    45,
    85
  );

  pdf.setLineWidth(1.2);

  /* Outer border */

  pdf.roundedRect(
    148,
    signatureY - 14,
    46,
    16,
    2,
    2,
    "D"
  );

  /* Inner border */

  pdf.roundedRect(
    150,
    signatureY - 12,
    42,
    12,
    2,
    2,
    "D"
  );

  /* ADMIN text */

  pdfSetFont(
    pdf,
    16,
    "bold",
    [255, 45, 85]
  );

  pdf.text(
    "ADMIN",
    171,
    signatureY - 4,
    {
      align: "center",
      angle: -8,
    }
  );

  /* Reset opacity */

  try {
    if (typeof pdf.GState === "function") {
      pdf.setGState(
        new pdf.GState({
          opacity: 1,
        })
      );
    }
  } catch {}

  /* =====================================================
     SIGNATURE
  ===================================================== */

  pdfSetFont(
    pdf,
    7,
    "normal",
    PDF_COLORS.muted
  );

  pdf.text(
    "UMUKONO W'UBUYOBOZI",
    x,
    signatureY
  );

  pdfSetFont(
    pdf,
    20,
    "italic",
    PDF_COLORS.white
  );

  pdf.text(
    "Navio",
    x,
    signatureY + 10
  );

  pdfStroke(
    pdf,
    PDF_COLORS.border
  );

  pdf.line(
    x,
    signatureY + 13,
    x + 55,
    signatureY + 13
  );

  pdfSetFont(
    pdf,
    8.5,
    "bold",
    PDF_COLORS.white
  );

  pdf.text(
    "Navio Kki Dabble Le",
    x,
    signatureY + 19
  );

  pdfSetFont(
    pdf,
    7.5,
    "normal",
    PDF_COLORS.muted
  );

  pdf.text(
    "A C.E.O of New Talents Stories Group",
    x,
    signatureY + 24
  );

  /* =====================================================
     DATE
  ===================================================== */

  pdfSetFont(
    pdf,
    7,
    "normal",
    PDF_COLORS.muted
  );

  pdf.text(
    "ITARIKI",
    150,
    signatureY
  );

  pdfSetFont(
    pdf,
    8.5,
    "bold",
    PDF_COLORS.white
  );

  pdf.text(
    new Date().toLocaleDateString(
      "en-GB"
    ),
    150,
    signatureY + 7
  );

  pdfSetFont(
    pdf,
    7,
    "normal",
    PDF_COLORS.muted
  );

  pdf.text(
    new Date().toLocaleTimeString(),
    150,
    signatureY + 13
  );

  return signatureY + 27;
};

  

const pdfDrawFooter = (pdf) => {
  const y = 286;

  pdfStroke(pdf, PDF_COLORS.border);

  pdf.setLineWidth(0.25);

  pdf.line(
    PDF.margin,
    y - 5,
    PDF.pageWidth - PDF.margin,
    y - 5
  );

  pdfSetFont(
    pdf,
    7,
    "normal",
    PDF_COLORS.muted
  );

  pdf.text(
    "Thank you for your business · Murakoze cyane!",
    PDF.margin,
    y
  );

  pdf.text(
    `© ${new Date().getFullYear()} NewTalentsG`,
    PDF.pageWidth - PDF.margin,
    y,
    { align: "right" }
  );
};

/* =========================================================
   MAIN PAGE
========================================================= */

export default function InvoicePage() {
  const { t } = useI18n();

  const [hydrated, setHydrated] = useState(false);

  /* =======================================================
     CURRENT INVOICE
  ======================================================= */

  const [invoice, setInvoice] = useState({
    invoiceNumber: "",
    dateIssued: todayISO(),
    dueDate: "",
    status: "pending",

    clientName: "",
    clientPhone: "",
    clientEmail: "",
    clientAddress: "",

    note: "",

    taxRate: 0,
    discount: 0,
  });

  const [items, setItems] = useState([
    emptyItem(),
  ]);

  const [editingId, setEditingId] =
    useState(null);

  /* =======================================================
     UI STATE
  ======================================================= */

  const [saving, setSaving] = useState(false);

  const [downloading, setDownloading] =
    useState(null);

  const [toast, setToast] =
    useState(null);

  const [savedInvoices, setSavedInvoices] =
    useState([]);

  const [loadingInvoices, setLoadingInvoices] =
    useState(false);

  const [preview, setPreview] =
    useState(null);

  const invoiceRef = useRef(null);

  /* =======================================================
     TOAST
  ======================================================= */

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(
      () => setToast(null),
      4500
    );

    return () => clearTimeout(timer);
  }, [toast]);

  /* =======================================================
     INIT
  ======================================================= */

  useEffect(() => {
    const draft = loadDraft();

    if (draft) {
      setInvoice((prev) => ({
        ...prev,
        ...(draft.invoice || {}),
      }));

      if (
        Array.isArray(draft.items) &&
        draft.items.length
      ) {
        setItems(draft.items);
      }

      if (draft.editingId) {
        setEditingId(draft.editingId);
      }
    } else {
      setInvoice((prev) => ({
        ...prev,
        invoiceNumber:
          generateInvoiceNumber(),
      }));
    }

    setHydrated(true);

    loadSavedInvoices();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =======================================================
     AUTO SAVE
  ======================================================= */

  useEffect(() => {
    if (!hydrated) return;

    const timer = setTimeout(() => {
      saveDraftLocal({
        invoice,
        items,
        editingId,
      });
    }, 700);

    return () => clearTimeout(timer);
  }, [
    invoice,
    items,
    editingId,
    hydrated,
  ]);

  /* =======================================================
     LOAD SAVED INVOICES
  ======================================================= */

  const loadSavedInvoices = async () => {
    setLoadingInvoices(true);

    try {
      const q = query(
        collection(db, "invoices"),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(q);

      setSavedInvoices(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    } catch {
      try {
        const snap = await getDocs(
          collection(db, "invoices")
        );

        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        list.sort(
          (a, b) =>
            (b.createdAt?.seconds || 0) -
            (a.createdAt?.seconds || 0)
        );

        setSavedInvoices(list);
      } catch (err) {
        console.error(
          "Load invoices error:",
          err
        );
      }
    } finally {
      setLoadingInvoices(false);
    }
  };

  /* =======================================================
     UPDATE HELPERS
  ======================================================= */

  const updateInvoice =
    (key) => (e) => {
      setInvoice((prev) => ({
        ...prev,
        [key]: e.target.value,
      }));
    };

  const updateItem = (
    id,
    key,
    value
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]:
                key === "description"
                  ? value
                  : Number(value) || 0,
            }
          : item
      )
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      emptyItem(),
    ]);
  };

  const removeItem = (id) => {
    setItems((prev) =>
      prev.length <= 1
        ? prev
        : prev.filter(
            (item) => item.id !== id
          )
    );
  };

  /* =======================================================
     TOTALS
  ======================================================= */

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) =>
        sum +
        (Number(item.qty) || 0) *
          (Number(item.price) || 0),
      0
    );

    const tax =
      (subtotal *
        (Number(invoice.taxRate) || 0)) /
      100;

    const discount =
      Number(invoice.discount) || 0;

    const total = Math.max(
      0,
      subtotal + tax - discount
    );

    return {
      subtotal,
      tax,
      discount,
      total,
    };
  }, [
    items,
    invoice.taxRate,
    invoice.discount,
  ]);

  /* =======================================================
     VALIDATE
  ======================================================= */

  const validate = (data) => {
    const inv =
      data?.invoice || invoice;

    const its =
      data?.items || items;

    if (!inv.invoiceNumber?.trim()) {
      return "Invoice number irakenewe.";
    }

    if (!inv.clientName?.trim()) {
      return "Amazina y'umukiriya arakenewe.";
    }

    if (!inv.dateIssued) {
      return "Itariki ya invoice irakenewe.";
    }

    const hasValidItem = its.some(
      (item) =>
        String(
          item.description || ""
        ).trim() &&
        Number(item.qty) > 0 &&
        Number(item.price) >= 0
    );

    if (!hasValidItem) {
      return "Ongeraho nibura item imwe yuzuye (description, qty, price).";
    }

    return null;
  };

  /* =======================================================
     COMPUTE TOTALS
  ======================================================= */

  const computeTotals = (data) => {
    const its = data.items || [];

    const subtotal = its.reduce(
      (sum, item) =>
        sum +
        (Number(item.qty) || 0) *
          (Number(item.price) || 0),
      0
    );

    const tax =
      (subtotal *
        (Number(data.invoice.taxRate) || 0)) /
      100;

    const discount =
      Number(data.invoice.discount) || 0;

    const total = Math.max(
      0,
      subtotal + tax - discount
    );

    return {
      subtotal,
      tax,
      discount,
      total,
    };
  };

  /* =======================================================
     SAVE / UPDATE
  ======================================================= */

  const saveInvoice = async () => {
    const err = validate();

    if (err) {
      setToast({
        type: "err",
        text: err,
      });

      return null;
    }

    setSaving(true);

    try {
      const cleanItems = items
        .filter((item) =>
          String(
            item.description || ""
          ).trim()
        )
        .map(
          ({
            id,
            ...rest
          }) => ({
            description:
              String(
                rest.description
              ).trim(),

            qty:
              Number(rest.qty) || 0,

            price:
              Number(rest.price) || 0,

            amount:
              (Number(rest.qty) || 0) *
              (Number(rest.price) || 0),
          })
        );

      const payload = {
        ...invoice,

        items: cleanItems,

        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.discount,
        total: totals.total,

        currency: CURRENCY,
        business: BUSINESS,

        lastUpdated:
          serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(
          doc(
            db,
            "invoices",
            editingId
          ),
          payload
        );

        setToast({
          type: "ok",
          text: `Invoice ${invoice.invoiceNumber} yahinduwe neza!`,
        });
      } else {
        await addDoc(
          collection(db, "invoices"),
          {
            ...payload,
            createdAt:
              serverTimestamp(),
          }
        );

        setToast({
          type: "ok",
          text: `Invoice ${invoice.invoiceNumber} yabitswe neza!`,
        });
      }

      clearDraftLocal();

      await loadSavedInvoices();

      resetForm();

      return true;
    } catch (error) {
      console.error(
        "Save invoice error:",
        error
      );

      setToast({
        type: "err",
        text:
          "Ntibyakunze kubika invoice. Ongera ugerageze.",
      });

      return null;
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     RESET
  ======================================================= */

  const resetForm = () => {
    setEditingId(null);

    setInvoice({
      invoiceNumber:
        generateInvoiceNumber(),

      dateIssued: todayISO(),

      dueDate: "",

      status: "pending",

      clientName: "",
      clientPhone: "",
      clientEmail: "",
      clientAddress: "",

      note: "",

      taxRate: 0,
      discount: 0,
    });

    setItems([emptyItem()]);

    clearDraftLocal();
  };

  /* =======================================================
     PREVIEW FROM FORM
  ======================================================= */

  const openPreviewFromForm = () => {
    const err = validate();

    if (err) {
      setToast({
        type: "err",
        text: err,
      });

      return;
    }

    setPreview({
      mode: "new",
      source: "form",

      data: {
        invoice,
        items,
      },
    });
  };

  /* =======================================================
     PREVIEW SAVED
  ======================================================= */

  const openPreviewFromSaved = (
    saved
  ) => {
    const savedItems = (
      saved.items || []
    ).map((item, i) => ({
      id:
        item.id ||
        `s-${i}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,

      description:
        item.description || "",

      qty:
        Number(item.qty) || 0,

      price:
        Number(item.price) || 0,
    }));

    setPreview({
      mode: "saved",
      source: "list",

      id: saved.id,

      data: {
        invoice: {
          invoiceNumber:
            saved.invoiceNumber || "",

          dateIssued:
            toDateInput(
              saved.dateIssued
            ),

          dueDate:
            toDateInput(
              saved.dueDate
            ),

          status:
            saved.status ||
            "pending",

          clientName:
            saved.clientName || "",

          clientPhone:
            saved.clientPhone || "",

          clientEmail:
            saved.clientEmail || "",

          clientAddress:
            saved.clientAddress || "",

          note: saved.note || "",

          taxRate:
            Number(
              saved.taxRate
            ) || 0,

          discount:
            Number(
              saved.discount
            ) || 0,
        },

        items: savedItems.length
          ? savedItems
          : [emptyItem()],
      },
    });
  };

  /* =======================================================
     LOAD SAVED INTO FORM
  ======================================================= */

  const loadIntoForm = (
    saved
  ) => {
    if (!saved) return;

    const savedItems = (
      saved.items || []
    ).map((item, i) => ({
      id: `e-${i}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,

      description:
        item.description || "",

      qty:
        Number(item.qty) || 0,

      price:
        Number(item.price) || 0,
    }));

    setInvoice({
      invoiceNumber:
        saved.invoiceNumber || "",

      dateIssued:
        toDateInput(
          saved.dateIssued
        ),

      dueDate:
        toDateInput(
          saved.dueDate
        ),

      status:
        saved.status ||
        "pending",

      clientName:
        saved.clientName || "",

      clientPhone:
        saved.clientPhone || "",

      clientEmail:
        saved.clientEmail || "",

      clientAddress:
        saved.clientAddress || "",

      note: saved.note || "",

      taxRate:
        Number(
          saved.taxRate
        ) || 0,

      discount:
        Number(
          saved.discount
        ) || 0,
    });

    setItems(
      savedItems.length
        ? savedItems
        : [emptyItem()]
    );

    setEditingId(saved.id);

    setPreview(null);

    setToast({
      type: "ok",
      text: `Invoice ${saved.invoiceNumber} yifunguye mu ifishi. Hindura hanyuma ukande "Bika".`,
    });

    if (
      typeof window !==
      "undefined"
    ) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  /* =======================================================
     DOWNLOAD PNG
  ======================================================= */

  const downloadPNG = async () => {
    if (!invoiceRef.current) {
      setToast({
        type: "err",
        text:
          "Invoice document ntiyabonetse.",
      });

      return;
    }

    const inv =
      preview?.data?.invoice ||
      invoice;

    setDownloading("png");

    try {
      await new Promise(
        (resolve) =>
          requestAnimationFrame(
            resolve
          )
      );

      const element =
        invoiceRef.current;

      const canvas =
        await html2canvas(
          element,
          {
            backgroundColor:
              PAGE_BG,

            scale: 2,

            useCORS: true,

            allowTaint: true,

            logging: false,

            imageTimeout: 15000,

            windowWidth:
              element.scrollWidth,

            windowHeight:
              element.scrollHeight,

            scrollX: 0,

            scrollY: 0,
          }
        );

      const link =
        document.createElement(
          "a"
        );

      link.download = `${safeFileName(
        inv.invoiceNumber
      )}.png`;

      link.href =
        canvas.toDataURL(
          "image/png"
        );

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      setToast({
        type: "ok",
        text: "PNG yakuwemo neza.",
      });
    } catch (error) {
      console.error(
        "PNG download error:",
        error
      );

      setToast({
        type: "err",
        text:
          "Ntibyakunze gukura PNG.",
      });
    } finally {
      setDownloading(null);
    }
  };

  /* =======================================================
     DIRECT PDF GENERATOR
     
     IMPORTANT:
     PDF NTIYONGERA gukorwa na html2canvas.
     Ihita ikorwa na jsPDF.
  ======================================================= */

  const downloadPDF = async () => {
    const data =
      preview?.data || {
        invoice,
        items,
      };

    const inv =
      data.invoice || invoice;

    const its =
      data.items || items;

    const validationError =
      validate(data);

    if (validationError) {
      setToast({
        type: "err",
        text: validationError,
      });

      return;
    }

    setDownloading("pdf");

    try {
      const totalsForPDF =
        computeTotals(data);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });
      let logoData = null;

try {
  logoData = await loadImageAsDataURL(
    "/logo.png"
  );
} catch (logoError) {
  console.warn(
    "Logo ntiyashoboye gushyirwa muri PDF:",
    logoError
  );
}

      /*
       * =====================================================
       * PAGE 1
       * =====================================================
       */

      pdfDrawHeader(
  pdf,
  inv,
  logoData
);

      pdfDrawWatermark(pdf);

      pdfDrawClientBox(
        pdf,
        inv
      );

      let y = 90;

      /*
       * TABLE
       */

      y = pdfDrawTableHeader(
        pdf,
        y
      );

      const validItems = its.filter(
        (item) =>
          String(
            item.description || ""
          ).trim()
      );

      validItems.forEach(
        (item, index) => {
          const description =
            normalizeText(
              item.description
            );

          const lines =
            pdf.splitTextToSize(
              description || "—",
              90
            );

          const estimatedHeight =
            Math.max(
              10,
              lines.length * 4.5 + 5
            );

          /*
           * Niba row itakijya kuri page,
           * dushyiraho page nshya.
           */

          if (
            y +
              estimatedHeight >
            258
          ) {
            pdfDrawFooter(pdf);

            pdf.addPage();

            pdfDrawHeader(
  pdf,
  inv,
  logoData
);

            pdfDrawWatermark(pdf);

            y = 48;

            y =
              pdfDrawTableHeader(
                pdf,
                y
              );
          }

          y = pdfDrawItemRow(
            pdf,
            item,
            index,
            y
          );
        }
      );

      /*
       * TOTALS
       */

      if (y + 45 > 258) {
        pdfDrawFooter(pdf);

        pdf.addPage();

        pdfDrawHeader(
  pdf,
  inv,
  logoData
);
        pdfDrawWatermark(pdf);

        y = 55;
      }

      y += 8;

      y = pdfDrawTotals(
        pdf,
        totalsForPDF,
        inv,
        y
      );

      /*
       * NOTE
       */

      if (
        normalizeText(inv.note)
      ) {
        y += 8;

        if (y > 245) {
          pdfDrawFooter(pdf);

          pdf.addPage();

          pdfDrawHeader(
  pdf,
  inv,
  logoData
);

          pdfDrawWatermark(pdf);

          y = 55;
        }

        y = pdfDrawNote(
          pdf,
          inv.note,
          y
        );
      }

      /*
       * LEGAL / PLATFORM NOTICE
       */

      y += 8;

      if (y > 250) {
        pdfDrawFooter(pdf);

        pdf.addPage();

        pdfDrawHeader(
          pdf,
          inv
        );

        pdfDrawWatermark(pdf);

        y = 55;
      }

      y =
        pdfDrawPaymentNotice(
          pdf,
          y
        );

      /*
       * SIGNATURE
       */

      y += 5;

      if (y > 255) {
        pdfDrawFooter(pdf);

        pdf.addPage();

        pdfDrawHeader(
          pdf,
          inv
        );

        pdfDrawWatermark(pdf);

        y = 55;
      }

      pdfDrawSignature(
        pdf,
        y
      );

      /*
       * FOOTER
       */

      pdfDrawFooter(pdf);

      /*
       * DOWNLOAD
       */

      const fileName = `${safeFileName(
        inv.invoiceNumber ||
          "invoice"
      )}.pdf`;

      pdf.save(fileName);

      setToast({
        type: "ok",
        text:
          "PDF yako yakozwe kandi ikurwa neza.",
      });
    } catch (error) {
      console.error(
        "PDF generation error:",
        error
      );

      setToast({
        type: "err",
        text:
          "PDF ntiyashoboye gukorwa. Reba browser console urebe error.",
      });
    } finally {
      setDownloading(null);
    }
  };

  /* =======================================================
     DELETE
  ======================================================= */

  const deleteSavedInvoice = async (
    id,
    number
  ) => {
    if (
      !window.confirm(
        t("Gusiba invoice {number} burundu?", { number })
      )
    ) {
      return;
    }

    try {
      await deleteDoc(
        doc(db, "invoices", id)
      );

      setSavedInvoices((prev) =>
        prev.filter(
          (inv) => inv.id !== id
        )
      );

      if (
        preview?.id === id
      ) {
        setPreview(null);
      }

      if (editingId === id) {
        resetForm();
      }

      setToast({
        type: "ok",
        text: "Invoice yasibwe.",
      });
    } catch (error) {
      console.error(error);

      setToast({
        type: "err",
        text:
          "Ntibyakunze gusiba.",
      });
    }
  };

  /* =======================================================
     PREVIEW DATA
  ======================================================= */

  const previewInvoice =
    preview?.data?.invoice ||
    null;

  const previewItems =
    preview?.data?.items || [];

  const previewTotals =
    preview
      ? computeTotals(
          preview.data
        )
      : null;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <Head>
        <title>{t("Invoice — NewTalentsG")}</title>

        <meta
          name="description"
          content="Kora invoice ibikwa muri Firestore"
        />
      </Head>

      <div className={styles.page}>
        <div className={styles.shell}>
          {/* =================================================
              HERO
          ================================================= */}

          <header
            className={styles.hero}
          >
            <div
              className={
                styles.heroLeft
              }
            >
              <span
                className={
                  styles.heroIcon
                }
              >
                <FiFileText />
              </span>

              <div
                className={
                  styles.heroText
                }
              >
                <h1>{t("Invoice")}{" "}
                  <span>{t("Generator")}</span>
                </h1>

                <p>{t("Kora invoice, yibike muri Firestore, uyikure nka PDF cyangwa PNG, urebe n'izabitswe.")}</p>
              </div>
            </div>

            <span
              className={
                styles.badge
              }
            >
              <FiAward />{t("NewTalentsG · Billing")}</span>
          </header>

          {/* =================================================
              EDITING BANNER
          ================================================= */}

          {editingId && (
            <div
              className={
                styles.editingBanner
              }
            >
              <span
                className={
                  styles.editingText
                }
              >
                <FiEdit />{t("Uri guhindura invoice")}{" "}

                <strong>
                  {
                    invoice.invoiceNumber
                  }
                </strong>
              </span>

              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={
                  resetForm
                }
              >
                <FiRefreshCw />{t("Kora nshya")}</button>
            </div>
          )}

          <div
            className={
              styles.layout
            }
          >
            {/* =================================================
                FORM COLUMN
            ================================================= */}

            <div
              className={
                styles.formCol
              }
            >
              {/* ===============================================
                  INVOICE META
              =============================================== */}

              <section
                className={
                  styles.card
                }
              >
                <div
                  className={
                    styles.cardHead
                  }
                >
                  <span
                    className={`${styles.cardIcon} ${styles.iconPurple}`}
                  >
                    <FiHash />
                  </span>

                  <div>
                    <h2>{t("Amakuru y'invoice")}</h2>

                    <p>{t("Nomero, itariki, status")}</p>
                  </div>
                </div>

                <div
                  className={
                    styles.grid
                  }
                >
                  <div
                    className={
                      styles.field
                    }
                  >
                    <FiHash
                      className={
                        styles.fieldIcon
                      }
                    />

                    <input
                      type="text"
                      placeholder={t("Invoice number...")}
                      value={
                        invoice.invoiceNumber
                      }
                      onChange={updateInvoice(
                        "invoiceNumber"
                      )}
                    />

                    <button
                      type="button"
                      className={
                        styles.regenBtn
                      }
                      onClick={() =>
                        setInvoice(
                          (prev) => ({
                            ...prev,
                            invoiceNumber:
                              generateInvoiceNumber(),
                          })
                        )
                      }
                      title={t("Hindura nomero")}
                    >
                      ↻
                    </button>
                  </div>

                  <div
                    className={
                      styles.field
                    }
                  >
                    <FiCalendar
                      className={
                        styles.fieldIcon
                      }
                    />

                    <input
                      type="date"
                      value={
                        invoice.dateIssued
                      }
                      onChange={updateInvoice(
                        "dateIssued"
                      )}
                    />
                  </div>

                  <div
                    className={
                      styles.field
                    }
                  >
                    <FiCalendar
                      className={
                        styles.fieldIcon
                      }
                    />

                    <input
                      type="date"
                      value={
                        invoice.dueDate
                      }
                      onChange={updateInvoice(
                        "dueDate"
                      )}
                    />
                  </div>

                  <div
                    className={
                      styles.field
                    }
                  >
                    <FiCheckCircle
                      className={
                        styles.fieldIcon
                      }
                    />

                    <select
                      value={
                        invoice.status
                      }
                      onChange={updateInvoice(
                        "status"
                      )}
                      className={
                        styles.selectInline
                      }
                    >
                      <option value="pending">{t("Pending")}</option>

                      <option value="paid">{t("Paid")}</option>

                      <option value="cancelled">{t("Cancelled")}</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* ===============================================
                  CLIENT
              =============================================== */}

              <section
                className={
                  styles.card
                }
              >
                <div
                  className={
                    styles.cardHead
                  }
                >
                  <span
                    className={`${styles.cardIcon} ${styles.iconCyan}`}
                  >
                    <FiUser />
                  </span>

                  <div>
                    <h2>{t("Umukiriya")}</h2>

                    <p>{t("Amakuru y'uwo uguha invoice")}</p>
                  </div>
                </div>

                <div
                  className={
                    styles.grid
                  }
                >
                  <div
                    className={
                      styles.field
                    }
                  >
                    <FiUser
                      className={
                        styles.fieldIcon
                      }
                    />

                    <input
                      type="text"
                      placeholder={t("Amazina y'umukiriya...")}
                      value={
                        invoice.clientName
                      }
                      onChange={updateInvoice(
                        "clientName"
                      )}
                    />
                  </div>

                  <div
                    className={
                      styles.field
                    }
                  >
                    <FiPhone
                      className={
                        styles.fieldIcon
                      }
                    />

                    <input
                      type="tel"
                      placeholder={t("Telefone...")}
                      value={
                        invoice.clientPhone
                      }
                      onChange={updateInvoice(
                        "clientPhone"
                      )}
                    />
                  </div>

                  <div
                    className={
                      styles.field
                    }
                  >
                    <FiMail
                      className={
                        styles.fieldIcon
                      }
                    />

                    <input
                      type="email"
                      placeholder={t("Email...")}
                      value={
                        invoice.clientEmail
                      }
                      onChange={updateInvoice(
                        "clientEmail"
                      )}
                    />
                  </div>

                  <div
                    className={
                      styles.field
                    }
                  >
                    <FaMobileAlt
                      className={
                        styles.fieldIcon
                      }
                    />

                    <input
                      type="tel"
                      placeholder={t("MoMo...")}
                      value={
                        invoice.clientAddress
                      }
                      onChange={updateInvoice(
                        "clientAddress"
                      )}
                    />
                  </div>
                </div>
              </section>

              {/* ===============================================
                  ITEMS
              =============================================== */}

              <section
                className={
                  styles.card
                }
              >
                <div
                  className={
                    styles.cardHead
                  }
                >
                  <span
                    className={`${styles.cardIcon} ${styles.iconPink}`}
                  >
                    <FiPackage />
                  </span>

                  <div>
                    <h2>{t("Ibintu (Items)")}</h2>

                    <p>{t("Ongeraho cyangwa ugabanye ibintu")}</p>
                  </div>
                </div>

                <div
                  className={
                    styles.itemsList
                  }
                >
                  {items.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={
                          item.id
                        }
                        className={
                          styles.itemRow
                        }
                      >
                        <span
                          className={
                            styles.itemNum
                          }
                        >
                          #
                          {index +
                            1}
                        </span>

                        <input
                          type="text"
                          placeholder={t("Description...")}
                          value={
                            item.description
                          }
                          onChange={(
                            e
                          ) =>
                            updateItem(
                              item.id,
                              "description",
                              e
                                .target
                                .value
                            )
                          }
                          className={
                            styles.itemDesc
                          }
                        />

                        <div
                          className={
                            styles.qtyWrap
                          }
                        >
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(
                                item.id,
                                "qty",
                                Math.max(
                                  1,
                                  Number(
                                    item.qty
                                  ) -
                                    1
                                )
                              )
                            }
                          >
                            <FiMinus />
                          </button>

                          <input
                            type="number"
                            min="1"
                            value={
                              item.qty
                            }
                            onChange={(
                              e
                            ) =>
                              updateItem(
                                item.id,
                                "qty",
                                e
                                  .target
                                  .value
                              )
                            }
                          />

                          <button
                            type="button"
                            onClick={() =>
                              updateItem(
                                item.id,
                                "qty",
                                Number(
                                  item.qty
                                ) +
                                  1
                              )
                            }
                          >
                            <FiPlus />
                          </button>
                        </div>

                        <input
                          type="number"
                          min="0"
                          placeholder={t("Price")}
                          value={
                            item.price
                          }
                          onChange={(
                            e
                          ) =>
                            updateItem(
                              item.id,
                              "price",
                              e
                                .target
                                .value
                            )
                          }
                          className={
                            styles.itemPrice
                          }
                        />

                        <span
                          className={
                            styles.itemAmount
                          }
                        >
                          {formatRWF(
                            (Number(
                              item.qty
                            ) || 0) *
                              (Number(
                                item.price
                              ) || 0)
                          )}
                        </span>

                        <button
                          type="button"
                          className={
                            styles.removeItem
                          }
                          onClick={() =>
                            removeItem(
                              item.id
                            )
                          }
                          disabled={
                            items.length <=
                            1
                          }
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    )
                  )}
                </div>

                <button
                  type="button"
                  className={
                    styles.addItem
                  }
                  onClick={
                    addItem
                  }
                >
                  <FiPlus />{t("Ongeraho item")}</button>
              </section>

              {/* ===============================================
                  EXTRA
              =============================================== */}

              <section
                className={
                  styles.card
                }
              >
                <div
                  className={
                    styles.cardHead
                  }
                >
                  <span
                    className={`${styles.cardIcon} ${styles.iconGreen}`}
                  >
                    <FiDollarSign />
                  </span>

                  <div>
                    <h2>{t("Tax, Discount & Note")}</h2>

                    <p>{t("Bigenera invoice yawe")}</p>
                  </div>
                </div>

                <div
                  className={
                    styles.grid
                  }
                >
                  <div
                    className={
                      styles.field
                    }
                  >
                    <FiDollarSign
                      className={
                        styles.fieldIcon
                      }
                    />

                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder={t("Tax (%)...")}
                      value={
                        invoice.taxRate
                      }
                      onChange={updateInvoice(
                        "taxRate"
                      )}
                    />
                  </div>

                  <div
                    className={
                      styles.field
                    }
                  >
                    <FiDollarSign
                      className={
                        styles.fieldIcon
                      }
                    />

                    <input
                      type="number"
                      min="0"
                      placeholder={t("Discount (RWF)...")}
                      value={
                        invoice.discount
                      }
                      onChange={updateInvoice(
                        "discount"
                      )}
                    />
                  </div>

                  <div
                    className={`${styles.field} ${styles.full}`}
                  >
                    <FiEdit3
                      className={
                        styles.fieldIcon
                      }
                    />

                    <textarea
                      rows="3"
                      placeholder={t("Note cyangwa amabwiriza...")}
                      value={
                        invoice.note
                      }
                      onChange={updateInvoice(
                        "note"
                      )}
                      className={
                        styles.textarea
                      }
                    />
                  </div>
                </div>
              </section>

              {/* ===============================================
                  ACTIONS
              =============================================== */}

              <div
                className={
                  styles.actions
                }
              >
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={
                    openPreviewFromForm
                  }
                >
                  <FiEye />{t("Reba invoice")}</button>

                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={
                    saveInvoice
                  }
                  disabled={
                    saving
                  }
                >
                  {saving ? (
                    <>
                      <FiLoader
                        className={
                          styles.spin
                        }
                      />{t("Tubika...")}</>
                  ) : editingId ? (
                    <>
                      <FiSave />{t("Bika impinduka")}</>
                  ) : (
                    <>
                      <FiSave />{t("Bika invoice")}</>
                  )}
                </button>
              </div>
            </div>

            {/* =================================================
                SAVED INVOICES
            ================================================= */}

            <aside
              className={
                styles.listCol
              }
            >
              <div
                className={
                  styles.listHead
                }
              >
                <FiFileText />

                <h2>{t("Invoice zabitswe")}</h2>

                <span
                  className={
                    styles.count
                  }
                >
                  {
                    savedInvoices.length
                  }
                </span>
              </div>

              {loadingInvoices && (
                <div
                  className={
                    styles.listEmpty
                  }
                >
                  <FiLoader
                    className={
                      styles.spin
                    }
                  />{t("Turazana...")}</div>
              )}

              {!loadingInvoices &&
                savedInvoices.length ===
                  0 && (
                  <div
                    className={
                      styles.listEmpty
                    }
                  >
                    <FiAlertTriangle />{t("Nta invoice irabikwa.")}</div>
                )}

              {!loadingInvoices &&
                savedInvoices.map(
                  (inv) => {
                    const isActive =
                      preview?.id ===
                      inv.id;

                    const isEditing =
                      editingId ===
                      inv.id;

                    return (
                      <div
                        key={
                          inv.id
                        }
                        className={`${styles.savedItem} ${
                          isActive
                            ? styles.savedItemActive
                            : ""
                        } ${
                          isEditing
                            ? styles.savedItemEditing
                            : ""
                        }`}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          openPreviewFromSaved(
                            inv
                          )
                        }
                        onKeyDown={(
                          e
                        ) => {
                          if (
                            e.key ===
                              "Enter" ||
                            e.key ===
                              " "
                          ) {
                            e.preventDefault();

                            openPreviewFromSaved(
                              inv
                            );
                          }
                        }}
                      >
                        <div
                          className={
                            styles.savedItemTop
                          }
                        >
                          <span
                            className={
                              styles.savedNum
                            }
                          >
                            {
                              inv.invoiceNumber
                            }
                          </span>

                          <span
                            className={`${styles.savedStatus} ${
                              styles[
                                `status_${
                                  inv.status ||
                                  "pending"
                                }`
                              ]
                            }`}
                          >
                            {
                              inv.status ||
                              t("pending")
                            }
                          </span>
                        </div>

                        <span
                          className={
                            styles.savedClient
                          }
                        >
                          {
                            inv.clientName ||
                            "—"
                          }
                        </span>

                        <div
                          className={
                            styles.savedBottom
                          }
                        >
                          <span
                            className={
                              styles.savedTotal
                            }
                          >
                            {formatRWF(
                              inv.total ||
                                0
                            )}
                          </span>

                          <span
                            className={
                              styles.savedHint
                            }
                          >
                            <FiEye />{t("Reba")}</span>
                        </div>

                        <div
                          className={
                            styles.savedActions
                          }
                          onClick={(
                            e
                          ) =>
                            e.stopPropagation()
                          }
                        >
                          <button
                            type="button"
                            className={
                              styles.savedAction
                            }
                            title={t("Hindura")}
                            onClick={() =>
                              loadIntoForm(
                                inv
                              )
                            }
                          >
                            <FiEdit3 />
                          </button>

                          <button
                            type="button"
                            className={
                              styles.savedAction
                            }
                            title={t("Preview")}
                            onClick={() =>
                              openPreviewFromSaved(
                                inv
                              )
                            }
                          >
                            <FiEye />
                          </button>

                          <button
                            type="button"
                            className={`${styles.savedAction} ${styles.savedActionDanger}`}
                            title={t("Siba")}
                            onClick={() =>
                              deleteSavedInvoice(
                                inv.id,
                                inv.invoiceNumber
                              )
                            }
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
            </aside>
          </div>
        </div>

        {/* =====================================================
            PREVIEW MODAL
        ===================================================== */}

        {preview &&
          previewInvoice && (
            <div
              className={
                styles.modalOverlay
              }
              onClick={() =>
                downloading ===
                  null &&
                setPreview(null)
              }
            >
              <div
                className={
                  styles.modal
                }
                onClick={(e) =>
                  e.stopPropagation()
                }
              >
                <div
                  className={
                    styles.modalHead
                  }
                >
                  <h3>
                    <FiEye />{t("Preview ·")}{" "}
                    {
                      previewInvoice.invoiceNumber
                    }

                    {preview.mode ===
                      "saved" && (
                      <span
                        className={
                          styles.modalTag
                        }
                      >{t("Saved")}</span>
                    )}
                  </h3>

                  <button
                    type="button"
                    className={
                      styles.modalClose
                    }
                    onClick={() =>
                      setPreview(null)
                    }
                    disabled={
                      downloading !==
                      null
                    }
                  >
                    <FiX />
                  </button>
                </div>

                <div
                  className={
                    styles.modalBody
                  }
                >
                  {/* =========================================
                      MODAL ACTIONS
                  ========================================= */}

                  <div
                    className={
                      styles.modalActions
                    }
                  >
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnGhost}`}
                      onClick={
                        downloadPNG
                      }
                      disabled={
                        downloading !==
                        null
                      }
                    >
                      {downloading ===
                      "png" ? (
                        <>
                          <FiLoader
                            className={
                              styles.spin
                            }
                          />{t("Turimo gukora...")}</>
                      ) : (
                        <>
                          <FiImage />{t("PNG")}</>
                      )}
                    </button>

                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      onClick={
                        downloadPDF
                      }
                      disabled={
                        downloading !==
                        null
                      }
                    >
                      {downloading ===
                      "pdf" ? (
                        <>
                          <FiLoader
                            className={
                              styles.spin
                            }
                          />{t("Turimo gukora PDF...")}</>
                      ) : (
                        <>
                          <FiDownload />{t("PDF")}</>
                      )}
                    </button>

                    {preview.mode ===
                      "saved" && (
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnGreen}`}
                        onClick={() =>
                          loadIntoForm(
                            {
                              id: preview.id,
                              ...preview
                                .data
                                .invoice,
                              items:
                                preview
                                  .data
                                  .items,
                            }
                          )
                        }
                        disabled={
                          saving
                        }
                      >
                        <FiEdit3 />{t("Hindura")}</button>
                    )}

                    {preview.mode ===
                      "new" && (
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnGreen}`}
                        onClick={async () => {
                          const ok =
                            await saveInvoice();

                          if (ok) {
                            setPreview(
                              null
                            );
                          }
                        }}
                        disabled={
                          saving
                        }
                      >
                        {saving ? (
                          <>
                            <FiLoader
                              className={
                                styles.spin
                              }
                            />{t("Tubika...")}</>
                        ) : (
                          <>
                            <FiSave />{t("Bika")}</>
                        )}
                      </button>
                    )}
                  </div>

                  {/* =========================================
                      INVOICE DOCUMENT / SCREEN PREVIEW
                  ========================================= */}

                  <div
                    className={
                      styles.invoice
                    }
                    ref={
                      invoiceRef
                    }
                  >
                    <Watermark />

                    <div
                      className={
                        styles.invoiceInner
                      }
                    >
                      {/* =====================================
                          HEADER
                      ===================================== */}

                      <div
                        className={
                          styles.invHead
                        }
                      >
                        <div
                          className={
                            styles.invHeadLeft
                          }
                        >
                          <div className={styles.brandMark}>
  <img
    src="/logo.png"
    alt={t("New Talents Stories Group")}
    className={styles.invoiceLogo}
  />

  <div>
    <h2>{BUSINESS.name}</h2>

    <p>{BUSINESS.tagline}</p>
  </div>
</div>

                          <div
                            className={
                              styles.bizInfo
                            }
                          >
                            <span>
                              {
                                BUSINESS.address
                              }
                            </span>

                            <span>
                              {
                                BUSINESS.phone
                              }{" "}
                              ·{" "}
                              {
                                BUSINESS.email
                              }
                            </span>

                            <span>{t("MoMo:")}{" "}
                              {
                                BUSINESS.momo
                              }
                            </span>
                          </div>
                        </div>

                        <div
                          className={
                            styles.invHeadRight
                          }
                        >
                          <span
                            className={
                              styles.invTag
                            }
                          >{t("INVOICE")}</span>

                          <strong
                            className={
                              styles.invNum
                            }
                          >
                            {
                              previewInvoice.invoiceNumber
                            }
                          </strong>

                          <span
                            className={`${styles.invStatus} ${
                              styles[
                                `status_${previewInvoice.status}`
                              ]
                            }`}
                          >
                            {
                              previewInvoice.status
                            }
                          </span>
                        </div>
                      </div>

                      {/* =====================================
                          META
                      ===================================== */}

                      <div
                        className={
                          styles.invMeta
                        }
                      >
                        <div
                          className={
                            styles.invMetaBlock
                          }
                        >
                          <span
                            className={
                              styles.invMetaLabel
                            }
                          >{t("Billed To")}</span>

                          <strong>
                            {
                              previewInvoice.clientName ||
                              "—"
                            }
                          </strong>

                          {previewInvoice.clientPhone && (
                            <span>
                              {
                                previewInvoice.clientPhone
                              }
                            </span>
                          )}

                          {previewInvoice.clientEmail && (
                            <span>
                              {
                                previewInvoice.clientEmail
                              }
                            </span>
                          )}

                          {previewInvoice.clientAddress && (
                            <span>
                              {
                                previewInvoice.clientAddress
                              }
                            </span>
                          )}
                        </div>

                        <div
                          className={
                            styles.invMetaBlock
                          }
                        >
                          <span
                            className={
                              styles.invMetaLabel
                            }
                          >{t("Date Issued")}</span>

                          <strong>
                            {formatDisplayDate(
                              previewInvoice.dateIssued
                            )}
                          </strong>

                          {previewInvoice.dueDate && (
                            <>
                              <span
                                className={
                                  styles.invMetaLabel
                                }
                              >{t("Due Date")}</span>

                              <strong>
                                {formatDisplayDate(
                                  previewInvoice.dueDate
                                )}
                              </strong>
                            </>
                          )}
                        </div>
                      </div>

                      {/* =====================================
                          ITEMS TABLE
                      ===================================== */}

                      <div
                        className={
                          styles.invTableWrap
                        }
                      >
                        <table
                          className={
                            styles.invTable
                          }
                        >
                          <thead>
                            <tr>
                              <th
                                className={
                                  styles.colNum
                                }
                              >
                                #
                              </th>

                              <th>{t("Description")}</th>

                              <th
                                className={
                                  styles.colQty
                                }
                              >{t("Qty")}</th>

                              <th
                                className={
                                  styles.colPrice
                                }
                              >{t("Price")}</th>

                              <th
                                className={
                                  styles.colAmt
                                }
                              >{t("Amount")}</th>
                            </tr>
                          </thead>

                          <tbody>
                            {previewItems
                              .filter(
                                (
                                  item
                                ) =>
                                  String(
                                    item.description ||
                                      ""
                                  ).trim()
                              )
                              .map(
                                (
                                  item,
                                  index
                                ) => (
                                  <tr
                                    key={
                                      item.id ||
                                      index
                                    }
                                  >
                                    <td
                                      className={
                                        styles.colNum
                                      }
                                    >
                                      {index +
                                        1}
                                    </td>

                                    <td>
                                      {
                                        item.description
                                      }
                                    </td>

                                    <td
                                      className={
                                        styles.colQty
                                      }
                                    >
                                      {
                                        item.qty
                                      }
                                    </td>

                                    <td
                                      className={
                                        styles.colPrice
                                      }
                                    >
                                      {formatRWF(
                                        Number(
                                          item.price
                                        ) ||
                                          0
                                      )}
                                    </td>

                                    <td
                                      className={
                                        styles.colAmt
                                      }
                                    >
                                      {formatRWF(
                                        (Number(
                                          item.qty
                                        ) ||
                                          0) *
                                          (Number(
                                            item.price
                                          ) ||
                                            0)
                                      )}
                                    </td>
                                  </tr>
                                )
                              )}
                          </tbody>
                        </table>
                      </div>

                      {/* =====================================
                          TOTALS
                      ===================================== */}

                      <div
                        className={
                          styles.invTotals
                        }
                      >
                        <div
                          className={
                            styles.invTotalsRows
                          }
                        >
                          <div
                            className={
                              styles.invTotalRow
                            }
                          >
                            <span>{t("Subtotal")}</span>

                            <strong>
                              {formatRWF(
                                previewTotals.subtotal
                              )}
                            </strong>
                          </div>

                          {previewTotals.tax >
                            0 && (
                            <div
                              className={
                                styles.invTotalRow
                              }
                            >
                              <span>{t("Tax ({taxRate}%)", { taxRate: previewInvoice.taxRate })}</span>

                              <strong>
                                {formatRWF(
                                  previewTotals.tax
                                )}
                              </strong>
                            </div>
                          )}

                          {previewTotals.discount >
                            0 && (
                            <div
                              className={`${styles.invTotalRow} ${styles.invDiscount}`}
                            >
                              <span>{t("Discount")}</span>

                              <strong>
                                -
                                {formatRWF(
                                  previewTotals.discount
                                )}
                              </strong>
                            </div>
                          )}

                          <div
                            className={`${styles.invTotalRow} ${styles.invGrand}`}
                          >
                            <span>{t("Total Due")}</span>

                            <strong>
                              {formatRWF(
                                previewTotals.total
                              )}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* =====================================
                          NOTE
                      ===================================== */}

                      {previewInvoice.note && (
                        <div
                          className={
                            styles.invNote
                          }
                        >
                          <span
                            className={
                              styles.invMetaLabel
                            }
                          >{t("Note")}</span>

                          <p
                            style={{
                              whiteSpace:
                                "pre-line",
                            }}
                          >
                            {
                              previewInvoice.note
                            }
                          </p>
                        </div>
                      )}

                      {/* =====================================
                          LEGAL NOTICE
                      ===================================== */}

                      <div
                        className={
                          styles.payNote
                        }
                      >
                        <span
                          className={
                            styles.payIcon
                          }
                        >
                          <FiDollarSign />
                        </span>

                        <div>
                          <strong>{t("Amabwiriza agenga iyi invoice")}</strong>

                          <p>{t("Iri tangazo ritanzwe hakurikijwe amategeko agenga urubuga rwacu.")}</p>
                        </div>
                      </div>

                      {/* =====================================
                          SIGNATURE
                      ===================================== */}

                      <div
                        className={
                          styles.signature
                        }
                      >
                        <div
                          className={
                            styles.signatureBlock
                          }
                        >
                          <span
                            className={
                              styles.signatureLabel
                            }
                          >{t("Umukono w'ubuyobozi")}</span>

                          <span
                            className={
                              styles.signatureScript
                            }
                          >{t("Navio")}</span>

                          <span
                            className={
                              styles.signatureLine
                            }
                          />

                          <strong
                            className={
                              styles.signatureName
                            }
                          >{t("Navio Kki Dabble Le")}</strong>

                          <span
                            className={
                              styles.signatureTitle
                            }
                          >{t("A C.E.O of New Talents Stories Group")}</span>
                        </div>

                        <div
                          className={
                            styles.signatureMeta
                          }
                        >
                          <span
                            className={
                              styles.signatureLabel
                            }
                          >{t("Itariki")}</span>

                          <strong
                            className={
                              styles.signatureDate
                            }
                          >
                            {new Date().toLocaleDateString()}
                          </strong>

                          <span
                            className={
                              styles.signatureTitle
                            }
                          >
                            {new Date().toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      {/* =====================================
                          FOOTER
                      ===================================== */}

                      <div
                        className={
                          styles.invFoot
                        }
                      >
                        <span>{t("Thank you for your business — Murakoze cyane!")}</span>

                        <span>
                          ©{" "}
                          {
                            new Date().getFullYear()
                          }{" "}{t("NewTalentsG")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* =====================================================
            TOAST
        ===================================================== */}

        {toast && (
          <div
            className={`${styles.toast} ${
              toast.type === "ok"
                ? styles.toastOk
                : styles.toastErr
            }`}
          >
            {toast.type ===
            "ok" ? (
              <FiCheckCircle />
            ) : (
              <FiAlertTriangle />
            )}

            <span>
              {toast.text}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
