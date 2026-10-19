// pages/_app.js
import "@/styles/globals.css";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useEffect } from "react";
import Cookies from "js-cookie";
import Head from "next/head";
import ChatBot from "../components/ChatBot";
import OneSignalProvider from "../components/OneSignalProvider";
import CommunityChat from "../components/CommunityChat";
import { I18nProvider, useI18n } from "../i18n/I18nProvider";
import { getLanguage } from "../i18n/config";

export default function App(props) {
  return (
    <I18nProvider>
      <Shell {...props} />
    </I18nProvider>
  );
}

function Shell({ Component, pageProps }) {
  const { t, lang } = useI18n();

  useEffect(() => {
    const bg = Cookies.get("bg") || "#ffffff";
    const color = Cookies.get("color") || "#000000";
    const font = Cookies.get("font") || "sans";

    document.documentElement.style.setProperty("--background", bg);
    document.documentElement.style.setProperty("--foreground", color);

    document.body.style.fontFamily =
      font === "sans"
        ? "Arial, Helvetica, sans-serif"
        : font === "mono"
        ? "Courier New, monospace"
        : "Georgia, serif";
  }, []);
  useEffect(() => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("Service Worker Registered"))
      .catch(console.error);
  }
}, []);

  return (
    <>
    <Head>
  {/* Basic */}
  <meta charSet="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
  <meta name="theme-color" content="#2563eb" />
  <meta name="application-name" content="New Talents Stories Group" />

  {/* SEO */}
  <title>{t("New Talents Stories Group")}</title>

  <meta
    name="description"
    content="Soma inkuru ndende z'urukundo, inkuru z'ubwenge, inkuru z'ubuzima, inkuru z'iterabwoba, novels, books, stories, ibisigo n'ibindi byinshi kuri New Talents Stories Group."
  />

  <meta
    name="keywords"
    content="
      inkuru,
      inkuru ndende,
      inkuru z'urukundo,
      inkuru z'ubwenge,
      novels,
      books,
      stories,
      literature,
      Rwanda stories,
      Kinyarwanda stories,
      ebooks,
      online reading,
      online books,
      writers,
      authors,
      storytelling,
      fiction,
      romance,
      horror,
      mystery,
      adventure,
      motivation,
      education,
      free books,
      paid books,
      AI stories,
      New Talents Stories Group
    "
  />

  <meta name="author" content="New Talents Stories Group" />
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
  <meta name="googlebot" content="index,follow" />
  <meta name="bingbot" content="index,follow" />
  <meta name="rating" content="general" />
  <meta name="language" content={lang} />
  <meta property="og:locale" content={getLanguage(lang).ogLocale} />
  <meta name="distribution" content="global" />
  <meta name="revisit-after" content="1 days" />

  {/* Canonical */}
  <link rel="canonical" href="https://newtalentsg.com" />

  {/* Sitemap */}
  <link rel="sitemap" type="application/xml" href="/sitemap.xml" />

  {/* Manifest */}
  <link rel="manifest" href="/manifest.json" />

  {/* Icons */}
  <link rel="icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/icon-192.png" />

  {/* Open Graph */}
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="New Talents Stories Group" />
  <meta property="og:title" content="New Talents Stories Group" />
  <meta
    property="og:description"
    content="Soma inkuru ndende z'urukundo, novels, books n'izindi nkuru nziza."
  />
  <meta property="og:url" content="https://newtalentsg.com" />
  <meta property="og:image" content="https://newtalentsg.com/logo.png" />

  {/* Twitter */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="New Talents Stories Group" />
  <meta
    name="twitter:description"
    content="Soma inkuru ndende, novels, books n'ibindi."
  />
  <meta
    name="twitter:image"
    content="https://newtalentsg.com/logo.png"
  />

  {/* PWA */}
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta
    name="apple-mobile-web-app-status-bar-style"
    content="default"
  />

  {/* AI Discovery */}
  <meta name="creator" content="New Talents Stories Group" />
  <meta name="publisher" content="New Talents Stories Group" />
  <meta name="generator" content="Next.js" />
  <meta name="category" content="Books, Stories, Literature" />
  <meta name="classification" content="Education, Entertainment" />
</Head>
       <OneSignalProvider />
      <Header />
      <CommunityChat />
             {/* ChatBot izagaragara kuri iyi page gusa */}
      <ChatBot
        title={t("Net AI Assistant")}
        placeholder={t("chat.placeholder")}
        username="New talents stories group"
        maxHeight="500px"
      />
      <Component {...pageProps} />
      <Footer /> {/* 🔥 THIS IS THE MAGIC */}
    </>
  );
}
