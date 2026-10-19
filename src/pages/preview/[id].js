import Head from "next/head";
import html2canvas from "html2canvas";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../components/firebase";
import { useI18n } from "@/i18n/I18nProvider";

/* =========================
   SSR
========================= */
export async function getServerSideProps(context) {
  const { id } = context.params;

  try {
    const ref = doc(db, "quotes", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { notFound: true };
    }

    return {
      props: {
        data: JSON.parse(JSON.stringify(snap.data())),
      },
    };
  } catch (e) {
    return { notFound: true };
  }
}

/* =========================
   COMPONENT
========================= */
export default function Preview({ data }) {
  const { t } = useI18n();


  const downloadImage = async () => {
    const element = document.getElementById("card");

    const canvas = await html2canvas(element);

    const link = document.createElement("a");
    link.download = "netboard.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (!data) {
    return <div className="p-10">{t("No data")}</div>;
  }

  return (
    <>
      <Head>
        <title>{t("NetBoard")}</title>
      </Head>

      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-6">

        {/* CARD */}
        <div
          id="card"
          className="w-[320px] sm:w-[420px] bg-white rounded-2xl overflow-hidden shadow-md"
        >
          {/* BACKGROUND */}
          <img
            src="/logo.png"
            className="w-full h-40 object-cover"
          />

          {/* CONTENT */}
          <div className="p-4">

            {/* NAME + BADGE */}
            <div className="flex items-center gap-2">
              <p className="font-bold text-black text-sm sm:text-base">
                {data.username}
              </p>

              <span className="bg-blue-500 text-white text-xs px-1 rounded">
                ✔
              </span>
            </div>

            {/* QUOTE */}
            <p className="mt-4 text-black text-sm whitespace-pre-line">
              {data.quote}
            </p>

            {/* WATERMARK */}
            <p className="mt-6 text-red-500 text-xs">{t("NetBoard")}</p>

          </div>
        </div>

        {/* BUTTON */}
        <button
          onClick={downloadImage}
          className="bg-black text-white px-6 py-3 rounded-xl"
        >{t("Download Image")}</button>

      </div>
    </>
  );
}
