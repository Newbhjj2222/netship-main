import Head from "next/head";
import { useRef, useState } from "react";
import { useRouter } from "next/router";
import { db } from "@/components/firebase";
import { doc, getDoc } from "firebase/firestore";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import styles from "@/styles/contractCard.module.css";
import {
  FaDownload,
  FaFilePdf,
  FaImage,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaBook,
  FaShieldAlt,
  FaCheckCircle,
  FaArrowLeft,
  FaFileContract,
  FaLock,
  FaUnlock,
  FaSpinner
} from "react-icons/fa";
import LinkComponent from "@/components/Links";
import { useI18n } from "@/i18n/I18nProvider";

// ============================================
// SSR - getServerSideProps
// ============================================
export async function getServerSideProps(context) {
  const { id } = context.params;

  if (!id) {
    return { notFound: true };
  }

  try {
    const ref = doc(db, "contracts", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { notFound: true };
    }

    const data = snap.data();

    return {
      props: {
        data: JSON.parse(JSON.stringify({
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        })),
      },
    };
  } catch (err) {
    console.error("Error fetching contract:", err);
    return { notFound: true };
  }
}

// ============================================
// COMPONENT
// ============================================
export default function ContractCard({ data }) {
  const { t } = useI18n();

  const router = useRouter();
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadType, setDownloadType] = useState("");

  // ===== GO BACK =====
  const goBack = () => {
    router.back();
  };

  // ===== DOWNLOAD IMAGE =====
  const downloadImage = async () => {
    if (!cardRef.current) return;

    setDownloading(true);
    setDownloadType("image");

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: "#121926",
        useCORS: true,
        logging: false,
        borderRadius: "12px",
      });

      const link = document.createElement("a");
      link.download = `contract-${data.name || "badge"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Error downloading image:", err);
      alert(t("Habaye ikosa mu kurema image."));
    } finally {
      setDownloading(false);
      setDownloadType("");
    }
  };

  // ===== DOWNLOAD PDF =====
  const downloadPDF = async () => {
    if (!cardRef.current) return;

    setDownloading(true);
    setDownloadType("pdf");

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: "#121926",
        useCORS: true,
        logging: false,
        borderRadius: "12px",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 190;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 10, 10, pdfWidth, pdfHeight);
      pdf.save(`contract-${data.name || "badge"}.pdf`);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      alert(t("Habaye ikosa mu kurema PDF."));
    } finally {
      setDownloading(false);
      setDownloadType("");
    }
  };

  // ===== FORMAT DATE =====
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("rw-RW", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // ===== GET LICENSE LABEL =====
  const getLicenseLabel = (type) => {
    if (type === "exclusive") {
      return {
        label: "Exclusive",
        icon: <FaLock />,
        className: styles.licenseExclusive,
        desc: "🔒 Inkuru uherewe content licensing, ni wowe gusa uzayikoresha ndetse n'urubuga rwa  New Talents Stories gusa."
      };
    }
    return {
      label: "Non-Exclusive",
      icon: <FaUnlock />,
      className: styles.licenseNonExclusive,
      desc: "🔓 Inkuru uherewe content licensing, wemerewe kuyikoresha igihe kingana n'umwaka, ikindi urubuga rwa new talents stories group rushobora guha abandi uburenganzira bwo kuyikoresha."
    };
  };

  const license = getLicenseLabel(data.licenseType);

  // ============================================
  // RENDER
  // ============================================
  return (
    <>
      <Head>
        <title>{t("Contract Badge -")}{" "}{data.name || t("Contract")}</title>
        <meta name="description" content="View and download contract badge" />
      </Head>
<LinkComponent />
      <div className={styles.container}>
        {/* ACTIONS */}
        <div className={styles.actions}>
          <button onClick={goBack} className={styles.backBtn}>
            <FaArrowLeft />{" "}{t("Subira")}</button>
          <div className={styles.downloadGroup}>
            <button
              onClick={downloadImage}
              disabled={downloading}
              className={styles.downloadBtn}
            >
              {downloading && downloadType === "image" ? (
                <><FaSpinner className={styles.spinner} />{" "}{t("Generating...")}</>
              ) : (
                <><FaImage />{" "}{t("Image")}</>
              )}
            </button>
            <button
              onClick={downloadPDF}
              disabled={downloading}
              className={`${styles.downloadBtn} ${styles.pdfBtn}`}
            >
              {downloading && downloadType === "pdf" ? (
                <><FaSpinner className={styles.spinner} />{" "}{t("Generating...")}</>
              ) : (
                <><FaFilePdf />{" "}{t("PDF")}</>
              )}
            </button>
          </div>
        </div>

        {/* CARD */}
        <div ref={cardRef} className={styles.card}>
          <div className={styles.cardInner}>
            {/* LOGO */}
            <div className={styles.logoWrapper}>
              <FaFileContract className={styles.logoIcon} />
              <span className={styles.logoText}>{t("NTS")}</span>
            </div>

            {/* TITLE */}
            <h2 className={styles.title}>
              <FaShieldAlt className={styles.titleIcon} />{" "}{t("Content License")}</h2>

            {/* BADGE */}
            <div className={styles.badge}>
              <FaCheckCircle className={styles.badgeIcon} />{t("APPROVED CONTRACT")}</div>

            {/* INFO */}
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <FaUser className={styles.infoIcon} />
                <div>
                  <span className={styles.infoLabel}>{t("Name")}</span>
                  <span className={styles.infoValue}>{data.name || "N/A"}</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <FaEnvelope className={styles.infoIcon} />
                <div>
                  <span className={styles.infoLabel}>{t("Email")}</span>
                  <span className={styles.infoValue}>{data.email || "N/A"}</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <FaPhone className={styles.infoIcon} />
                <div>
                  <span className={styles.infoLabel}>{t("Phone")}</span>
                  <span className={styles.infoValue}>{data.phone || "N/A"}</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <FaBook className={styles.infoIcon} />
                <div>
                  <span className={styles.infoLabel}>{t("Story")}</span>
                  <span className={styles.infoValue}>{data.story || "N/A"}</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <FaShieldAlt className={styles.infoIcon} />
                <div>
                  <span className={styles.infoLabel}>{t("License")}</span>
                  <span className={`${styles.infoValue} ${license.className}`}>
                    {license.icon} {license.label}
                  </span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <FaFileContract className={styles.infoIcon} />
                <div>
                  <span className={styles.infoLabel}>{t("Usage")}</span>
                  <span className={styles.infoValue}>{data.usage || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* LICENSE DESCRIPTION */}
            <div className={styles.licenseDesc}>
              {license.desc}
            </div>

            {/* DATE */}
            <div className={styles.date}>
              <span>{t("📅 Issued: {Date}", { Date: formatDate(data.createdAt) })}</span>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className={styles.footer}>
          <p>{t("© 2026 New Talents Stories Group · All rights reserved")}</p>
        </div>
      </div>
    </>
  );
}
