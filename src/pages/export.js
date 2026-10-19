import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export default function ExportPage() {
  const { t } = useI18n();

  const [img, setImg] = useState(null);

  useEffect(() => {
    const data = sessionStorage.getItem("exportImage");
    setImg(data);
  }, []);

  const downloadImage = () => {
    if (!img) return;

    const link = document.createElement("a");
    link.download = "quote-hd.png";
    link.href = img;
    link.click();
  };

  if (!img) {
    return (
      <div className="min-h-screen flex items-center justify-center">{t("No image found")}</div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">

      {/* IMAGE ONLY */}
      <img
        src={img}
        className="w-[90%] max-w-md rounded-2xl shadow-xl"
      />

      {/* SAVE BUTTON */}
      <button
        onClick={downloadImage}
        className="bg-black text-white px-6 py-3 rounded-xl"
      >{t("Save Image")}</button>

    </div>
  );
}
