import { db } from "../components/firebase";
import { collection, getDocs } from "firebase/firestore";
import styles from "../styles/app.module.css";
import { FaStar, FaStarHalfAlt, FaRegStar, FaDownload } from "react-icons/fa";
import { useI18n } from "@/i18n/I18nProvider";

export async function getServerSideProps() {
  const querySnapshot = await getDocs(collection(db, "apps"));

  const apps = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return {
    props: { apps },
  };
}

// ⭐ Generate stars dynamically
function renderStars(rating) {
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push(<FaStar key={i} />);
    } else if (rating >= i - 0.5) {
      stars.push(<FaStarHalfAlt key={i} />);
    } else {
      stars.push(<FaRegStar key={i} />);
    }
  }

  return stars;
}

export default function App({ apps }) {
  const { t } = useI18n();

  const handleInstall = (apk) => {
    window.open(apk, "_blank");
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("App Store")}</h1>

      <div className={styles.grid}>
        {apps.map((app) => (
          <div key={app.id} className={styles.card}>
            <img src={app.image} className={styles.image} alt={t("app")} />

            <div className={styles.content}>
              <h2 className={styles.appName}>{app.name}</h2>

              <div className={styles.meta}>
                <span className={styles.rating}>
                  {renderStars(app.rating)}
                  <span className={styles.ratingText}>
                    {app.rating}
                  </span>
                </span>

                <span className={styles.installs}>{t("{installs} installs", { installs: app.installs })}</span>
              </div>

              <button
                className={styles.btn}
                onClick={() => handleInstall(app.apk)}
              >
                <FaDownload />{" "}{t("Install")}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
