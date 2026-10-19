import { useRef, useState } from "react";
import { useRouter } from "next/router";
import { db } from "@/components/firebase";
import { doc, getDoc } from "firebase/firestore";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import styles from "@/styles/singleContract.module.css";
import {
  FaDownload,
  FaArrowLeft,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaFileContract,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaWhatsapp,
  FaGlobe,
  FaCity,
  FaBuilding,
  FaSignature,
  FaShieldAlt
} from "react-icons/fa";
import LinkComponent from "@/components/Links";
import { useI18n } from "@/i18n/I18nProvider";

export default function SingleContract({ contract, error }) {
  const { t } = useI18n();

  const router = useRouter();
  const pdfRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  // ===== GO BACK =====
  const goBack = () => {
    router.back();
  };

  // ===== DOWNLOAD PDF =====
  const downloadPDF = async () => {
    if (!pdfRef.current) return;

    setDownloading(true);
    setDownloadError("");

    try {
      const element = pdfRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#121926",
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      pdf.save(`${contract.fullName || "contract"}-contract.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      setDownloadError("Habaye ikosa mu kurema PDF.");
    } finally {
      setDownloading(false);
    }
  };

  // ===== FORMAT DATE =====
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString("rw-RW", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  // ===== ERROR =====
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <FaTimesCircle className={styles.errorIcon} />
          <h2>{t("⚠️ Habaye ikibazo")}</h2>
          <p>{error}</p>
          <button onClick={goBack} className={styles.backBtn}>
            <FaArrowLeft />{" "}{t("Subira")}</button>
        </div>
      </div>
    );
  }

  // ===== NOT FOUND =====
  if (!contract) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <FaFileContract className={styles.errorIcon} />
          <h2>{t("📭 Contract ntiboneka")}</h2>
          <p>{t("Iyi contract ntaboneka cyangwa yasibwe.")}</p>
          <button onClick={goBack} className={styles.backBtn}>
            <FaArrowLeft />{" "}{t("Subira")}</button>
        </div>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <>
    <LinkComponent />
    <div className={styles.container}>
      {/* BACK & DOWNLOAD BUTTONS */}
      <div className={styles.actions}>
        <button onClick={goBack} className={styles.backBtn}>
          <FaArrowLeft />{" "}{t("Subira")}</button>
        <button
          onClick={downloadPDF}
          disabled={downloading}
          className={styles.downloadBtn}
        >
          {downloading ? (
            <><FaSpinner className={styles.spinner} />{" "}{t("Generating...")}</>
          ) : (
            <><FaDownload />{" "}{t("Download PDF")}</>
          )}
        </button>
      </div>

      {downloadError && (
        <div className={styles.downloadError}>
          <FaTimesCircle /> {downloadError}
        </div>
      )}

      {/* CONTRACT */}
      <div ref={pdfRef} className={styles.contractBox}>
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.logoWrapper}>
            <FaFileContract className={styles.logoIcon} />
            <span className={styles.logoText}>{t("NTS")}</span>
          </div>
          <h1 className={styles.title}>{t("NEW TALENTS STORIES GROUP")}</h1>
          <h2 className={styles.subtitle}>{t("📄 Author Contract Agreement")}</h2>
          <div className={styles.statusBadge}>
            {contract.approved ? (
              <span className={styles.approvedBadge}>
                <FaCheckCircle />{" "}{t("Approved")}</span>
            ) : (
              <span className={styles.pendingBadge}>
                <FaSpinner className={styles.pendingSpinner} />{" "}{t("Pending")}</span>
            )}
          </div>
        </div>

        {/* AUTHOR INFO */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FaUser className={styles.sectionIcon} />{" "}{t("Amakuru y'umwanditsi")}</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>{t("Amazina:")}</span>
              <span className={styles.infoValue}>{contract.fullName || "N/A"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>{t("Adresse:")}</span>
              <span className={styles.infoValue}>{contract.address || "N/A"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>{t("Igihugu:")}</span>
              <span className={styles.infoValue}>{contract.country || "N/A"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>{t("Aho yavukiye:")}</span>
              <span className={styles.infoValue}>{contract.cityOfBirth || "N/A"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>{t("Telephone:")}</span>
              <span className={styles.infoValue}>{contract.phone || "N/A"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>{t("WhatsApp:")}</span>
              <span className={styles.infoValue}>{contract.whatsapp || "N/A"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>{t("Email:")}</span>
              <span className={styles.infoValue}>{contract.email || "N/A"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>{t("Username:")}</span>
              <span className={styles.infoValue}>{contract.firstStoryTitle || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* CONTRACT TYPE */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FaFileContract className={styles.sectionIcon} />{" "}{t("Ubwoko bwa Contract")}</h3>
          <div className={styles.contractType}>
            <span className={contract.contractType === "exclusive" ? styles.exclusiveType : styles.nonExclusiveType}>
              {contract.contractType === "exclusive" ? t("Exclusive Contract") : t("Non-Exclusive Contract")}
            </span>
            <span className={styles.contractDesc}>
              {contract.contractType === "exclusive"
                ? t("🔒 Inkuru zawe ziri gusa kuri New Talents Stories")
                : t("🔓 Ushobora gutanga inkuru zawe ahandi")}
            </span>
          </div>
        </div>

        {/* AGREEMENTS */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FaShieldAlt className={styles.sectionIcon} />{" "}{t("Aho wahisemo ko inkuru zawe zikoreshwa")}</h3>
          <div className={styles.agreementList}>
            <div className={`${styles.agreementItem} ${contract.contentLicensing ? styles.agreed : styles.notAgreed}`}>
              <span className={styles.agreementIcon}>
                {contract.contentLicensing ? <FaCheckCircle /> : <FaTimesCircle />}
              </span>
              <span>{t("Inkuru zawe zizajya zitagwa ho Content Licensing:")}{" "}{contract.contentLicensing ? t("Yego") : t("Oya")}</span>
            </div>
            <div className={`${styles.agreementItem} ${contract.advertising ? styles.agreed : styles.notAgreed}`}>
              <span className={styles.agreementIcon}>
                {contract.advertising ? <FaCheckCircle /> : <FaTimesCircle />}
              </span>
              <span>{t("Inkuru zawe urubuga ruzajya ruzikoresha mu kwamamaza Urubuga:")}{" "}{contract.advertising ? t("Yego") : t("Oya")}</span>
            </div>
            <div className={`${styles.agreementItem} ${contract.addLink ? styles.agreed : styles.notAgreed}`}>
              <span className={styles.agreementIcon}>
                {contract.addLink ? <FaCheckCircle /> : <FaTimesCircle />}
              </span>
              <span>{t("Uzajya ushyira Link ya website mu nkuru igihe utanga inkuru zawe ahandi:")}{" "}{contract.addLink ? t("Yego") : t("Oya")}</span>
            </div>
            <div className={`${styles.agreementItem} ${contract.acceptRules ? styles.agreed : styles.notAgreed}`}>
              <span className={styles.agreementIcon}>
                {contract.acceptRules ? <FaCheckCircle /> : <FaTimesCircle />}
              </span>
              <span>{t("Kwemera Amategeko:")}{" "}<strong>{contract.acceptRules ? t("Yego") : t("Oya")}</strong></span>
            </div>
            <div className={`${styles.agreementItem} ${contract.legalAcknowledgment ? styles.agreed : styles.notAgreed}`}>
              <span className={styles.agreementIcon}>
                {contract.legalAcknowledgment ? <FaCheckCircle /> : <FaTimesCircle />}
              </span>
              <span>{t("Legal Agreement:")}{" "}<strong>{contract.legalAcknowledgment ? t("Yego") : t("Oya")}</strong></span>
            </div>
          </div>
        </div>

        {/* SIGNATURE */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <FaSignature className={styles.sectionIcon} />{" "}{t("Signature")}</h3>
          <div className={styles.signature}>
            <p className={styles.signatureText}>{t("Njyewe")}{" "}<strong>{contract.fullName || "N/A"}</strong>{" "}{t("nemeye aya masezerano.")}</p>
            <div className={styles.signLine}></div>
            <p className={styles.signName}>{contract.fullName || "N/A"}</p>
            {contract.approved && (
              <div className={styles.signatureStamp}>
                <FaCheckCircle />{" "}{t("NetBoard - Approved")}</div>
            )}
            <p className={styles.signDate}>
              <FaCalendarAlt /> {formatDate(contract.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
              </>
  );
}

// ============================================
// SSR - getServerSideProps
// ============================================
export async function getServerSideProps(context) {
  const { id } = context.params;

  if (!id) {
    return { notFound: true };
  }

  try {
    const docRef = doc(db, "contracts", id);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return { notFound: true };
    }

    const data = snap.data();

    return {
      props: {
        contract: {
          id: snap.id,
          ...data,
          createdAt: data.createdAt?.seconds
            ? data.createdAt.seconds * 1000
            : data.createdAt?.toDate?.()?.getTime() || null,
        },
        error: null,
      },
    };
  } catch (error) {
    console.error("Error fetching contract:", error);
    return {
      props: {
        contract: null,
        error: "Habaye ikibazo mu kubona contract.",
      },
    };
  }
}
