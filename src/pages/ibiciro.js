"use client";
import styles from "../styles/Ibiciro.module.css";
import { useI18n } from "@/i18n/I18nProvider";

// ================== EXCHANGE RATES (ESTIMATED) ==================
// 1 RWF ≈ (approx values, update with API for production)
const rates = {
  UGX: 3.2,     // Uganda Shilling
  CDF: 1.55,     // DRC / Congo Franc
  KES: 0.11,    // Kenya Shilling
  MZN: 0.05,    // Mozambique Metical
  ZMW: 0.045,   // Zambia Kwacha
  BIF: 2,    // Burundi Franc
};

function convert(rwf) {
  return {
    UGX: Math.round(rwf * rates.UGX),
    CDF: Math.round(rwf * rates.CDF),
    KES: Math.round(rwf * rates.KES),
    MZN: Math.round(rwf * rates.MZN),
    ZMW: Math.round(rwf * rates.ZMW),
    BIF: Math.round(rwf * rates.BIF),
  };
}

// ================== PLANS ==================
const plans = [
  {
    title: "🟢 NeS 1 – 20 RWF",
    price: "20 RWF",
    nes: 1,
    details: "Wishyura 20 RWF kugira ngo usome igice kimwe cy’inkuru.",
    extra: "Pay-per-read system yoroheje.",
  },
  {
    title: "🟢 Daily Access – 200 RWF",
    price: "200 RWF / umunsi",
    nes: 10,
    details: "Uhabwa uburenganzira bwo gusoma ibice bigera kuri 10 mu masaha 24.",
    extra: "Iyo umunsi urangiye, access irarangira.",
  },
  {
    title: "🟢 Weekly Pack – 350 RWF",
    price: "350 RWF / icyumweru",
    nes: 20,
    details: "Ushobora gusoma ibice bigera kuri 20 mu minsi 7.",
    extra: "Igiciro gito ku bakunda gusoma kenshi.",
  },
  {
    title: "🟢 VIP Best Reader – 600 RWF",
    price: "600 RWF / ukwezi",
    nes: "Unlimited",
    details: "Access yose yo gusoma ibice by'inkuru 60 igihe kingana nu kwezi kose.",
    extra: "VIP plan — iyo ukwezi kurangiye irahagarara.",
  },
  {
    title: "🟢 membership",
    price: "4000 RWF / umwaka",
    nes: "Unlimited",
    details: "Access yose yo gusoma inkuru zose igihe kingana nu mwaka wose..",
    extra: "Amara umwaka wose usoma inkuru zose ziri kurubuga. ndetse aha unashyirwa muri group ya WhatsApp ya members bacu ukajya uganira n'abanditsi buri munsi",
  },
];

// ================== COMPONENT ==================
export default function Ibiciro() {
  const { t } = useI18n();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("💎 NeS Pricing Plans 💎")}</h1>

      <p className={styles.intro}>{t("Hitamo plan ijyanye n’ukuntu ushaka gusoma.")}</p>

      <div className={styles.grid}>
        {plans.map((plan, index) => {
          const conv = convert(
            parseInt(plan.price.split(" ")[0]) || 0
          );

          return (
            <div key={index} className={styles.card}>
              <h2>{plan.title}</h2>

              <p className={styles.price}>{plan.price}</p>
              <p>{t("NeS: {nes}", { nes: plan.nes })}</p>

              <p className={styles.details}>{plan.details}</p>
              <p className={styles.extra}>{plan.extra}</p>

              <div className={styles.currencyBox}>
                <p><b>{t("UGX:")}</b> {conv.UGX}</p>
                <p><b>{t("CDF:")}</b> {conv.CDF}</p>
                <p><b>{t("KES:")}</b> {conv.KES}</p>
                <p><b>{t("MZN:")}</b> {conv.MZN}</p>
                <p><b>{t("ZMW:")}</b> {conv.ZMW}</p>
                <p><b>{t("BIF:")}</b> {conv.BIF}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
