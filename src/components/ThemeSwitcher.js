'use client';

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { FaPaintBrush, FaFont } from "react-icons/fa";
import { useI18n } from "@/i18n/I18nProvider";

export default function ThemeSwitcher() {
  const { t } = useI18n();

  const [bg, setBg] = useState('white');
  const [color, setColor] = useState('black');
  const [font, setFont] = useState('sans');

  // ===== LOAD FROM COOKIES =====
  useEffect(() => {
    const savedBg = Cookies.get("bg");
    const savedColor = Cookies.get("color");
    const savedFont = Cookies.get("font");

    if (savedBg) setBg(savedBg);
    if (savedColor) setColor(savedColor);
    if (savedFont) setFont(savedFont);
  }, []);

  // ===== APPLY THEME CORRECTLY =====
  useEffect(() => {
    // 🎯 THIS IS THE REAL FIX
    document.documentElement.style.setProperty('--background', bg);
    document.documentElement.style.setProperty('--foreground', color);

    document.body.style.fontFamily =
      font === 'sans'
        ? 'Arial, Helvetica, sans-serif'
        : font === 'mono'
        ? 'Courier New, monospace'
        : 'Georgia, serif';

    // SAVE
    Cookies.set("bg", bg, { expires: 7, path: "/" });
    Cookies.set("color", color, { expires: 7, path: "/" });
    Cookies.set("font", font, { expires: 7, path: "/" });

  }, [bg, color, font]);

  return (
    <div className="theme-switcher">
      <div className="row">
        <FaPaintBrush />

        <select value={bg} onChange={(e) => setBg(e.target.value)}>
          <option value="#ffffff">{t("White")}</option>
          <option value="#000000">{t("Black")}</option>
          <option value="#1e3a8a">{t("Blue")}</option>
          <option value="#065f46">{t("Green")}</option>
          <option value="#facc15">{t("Yellow")}</option>
          <option value="#6b7280">{t("Gray")}</option>
        </select>

        <select value={color} onChange={(e) => setColor(e.target.value)}>
          <option value="#000000">{t("Text Black")}</option>
          <option value="#ffffff">{t("Text White")}</option>
          <option value="#2563eb">{t("Text Blue")}</option>
          <option value="#16a34a">{t("Text Green")}</option>
          <option value="#eab308">{t("Text Yellow")}</option>
          <option value="#6b7280">{t("Text Gray")}</option>
        </select>

        <FaFont />

        <select value={font} onChange={(e) => setFont(e.target.value)}>
          <option value="sans">{t("Sans")}</option>
          <option value="mono">{t("Mono")}</option>
          <option value="serif">{t("Serif")}</option>
        </select>
      </div>

      <style jsx>{`
.theme-switcher {
  position: absolute;
  top: 90px; /* ikibanza uhereye hejuru y’urupapuro */
  left: 50%;
  transform: translateX(-50%);
  width: 100%; /* cyangwa 100% niba ushaka ihuze n’urupapuro */
  display: flex;
  justify-content: center;
  padding: 0.5rem;
}

        .row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: var(--background);
          color: var(--foreground);
          padding: 0.4rem 0.6rem;
          border-radius: 999px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          border: 1px solid rgba(0,0,0,0.1);
          flex-wrap: wrap;
        }

        select {
          padding: 0.25rem 0.4rem;
          border-radius: 6px;
          border: 1px solid rgba(0,0,0,0.2);
          font-size: 0.8rem;
          background: var(--background);
          color: blue;
        }

        svg {
          font-size: 0.9rem;
        }

        @media (max-width: 600px) {
          .row {
            gap: 0.3rem;
            padding: 0.3rem;
          }
        }

        html, body {
          touch-action: manipulation;
          overscroll-behavior: none;
        }
      `}</style>
    </div>
  );
}
