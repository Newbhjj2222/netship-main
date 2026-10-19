// pages/test.js
import ChatBot from "../components/ChatBot";
import { useI18n } from "@/i18n/I18nProvider";

export default function TestPage() {
  const { t } = useI18n();

  return (
    <div style={{ minHeight: "100vh", padding: "20px" }}>
      <h1>{t("Page ya Test")}</h1>
      <p>{t("Iyi ni page yo gupima chatbot")}</p>
      <p>{t("Chatbot ikwiye kugaragara hepfo cyangwa mu buryo bwa floating")}</p>

      {/* ChatBot izagaragara kuri iyi page gusa */}
      <ChatBot
        title={t("Net AI Assistant - Test")}
        placeholder={t("Andika ikibazo cyawe...")}
        username="Tester"
        maxHeight="500px"
      />
    </div>
  );
}
