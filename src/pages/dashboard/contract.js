import { useState } from "react";
import styles from "../../styles/contract.module.css";
import { db } from "../../components/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { FiInfo } from "react-icons/fi";
import LinkComponent from "../../components/Link";
import { useI18n } from "@/i18n/I18nProvider";


export default function Contract() {
  const { t } = useI18n();

  const [formData, setFormData] = useState({
    fullName: "",
    address: "",
    country: "",
    cityOfBirth: "",
    phone: "",
    whatsapp: "",
    email: "",
    firstStoryTitle: "",
    contractType: "non-exclusive",
    contentLicensing: false,
    advertising: false,
    addLink: false,
    acceptRules: false,
    legalAcknowledgment: false,
  });

  const [tooltip, setTooltip] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "contracts"), {
        ...formData,
        createdAt: serverTimestamp(),
      });
      alert(t("Contract submitted successfully!"));
      setFormData({
        fullName: "",
        address: "",
        country: "",
        cityOfBirth: "",
        phone: "",
        whatsapp: "",
        email: "",
        firstStoryTitle: "",
        contractType: "non-exclusive",
        contentLicensing: false,
        advertising: false,
        addLink: false,
        acceptRules: false,
        legalAcknowledgment: false,
      });
    } catch (err) {
      console.error("Error saving contract: ", err);
      alert(t("There was an error submitting the contract."));
    }
  };

  return (
    <>
    <LinkComponent />
    <div className={styles.container}>
      <h1 className={styles.title}>{t("New Talents Stories - Contract Form")}</h1>
      <p className={styles.description}>{t("Hano ushobora kuzuza contract y'umwanditsi. Uhitamo hagati ya")}{" "}
        <strong>{t("Exclusive")}</strong>{" "}{t("na")}{" "}<strong>{t("Non-Exclusive")}</strong>.
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Personal Info */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("Amakuru yawe")}</h2>
          <input
            type="text"
            name="fullName"
            placeholder={t("Amazina ya Nyakuri")}
            className={styles.inputField}
            value={formData.fullName}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="address"
            placeholder={t("Adresse")}
            className={styles.inputField}
            value={formData.address}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="country"
            placeholder={t("Igihugu")}
            className={styles.inputField}
            value={formData.country}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="cityOfBirth"
            placeholder={t("Aho wavukiye")}
            className={styles.inputField}
            value={formData.cityOfBirth}
            onChange={handleChange}
            required
          />
          <input
            type="tel"
            name="phone"
            placeholder={t("Telephone")}
            className={styles.inputField}
            value={formData.phone}
            onChange={handleChange}
            required
          />
          <input
            type="tel"
            name="whatsapp"
            placeholder={t("Whatsapp Number")}
            className={styles.inputField}
            value={formData.whatsapp}
            onChange={handleChange}
          />
          <input
            type="email"
            name="email"
            placeholder={t("Email")}
            className={styles.inputField}
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="firstStoryTitle"
            placeholder={t("Amazina ukoresha nkumwanditsi")}
            className={styles.inputField}
            value={formData.firstStoryTitle}
            onChange={handleChange}
            required
          />
        </div>

        {/* Contract Type */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("Contract Type")}{" "}
            <FiInfo
              className={styles.infoIcon}
              onMouseEnter={() =>
                setTooltip(
                  "Exclusive ituma ubona verified badge vuba na full monetization. Non-exclusive igumana uburenganzira bwo gusohora inkuru ahandi."
                )
              }
              onMouseLeave={() => setTooltip("")}
            />
          </h2>
          <select
            name="contractType"
            value={formData.contractType}
            onChange={handleChange}
            className={styles.selectInput}
          >
            <option value="non-exclusive">{t("Non-Exclusive")}</option>
            <option value="exclusive">{t("Exclusive")}</option>
          </select>
          {tooltip && <p className={styles.tooltip}>{tooltip}</p>}
        </div>

        {/* Checkboxes */}
        <div className={styles.section}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              name="contentLicensing"
              checked={formData.contentLicensing}
              onChange={handleChange}
            />
            <span>{t("Nemera ko inkuru zanjye zikoreshwa mu ma filme, audios, n'ahandi (70% ku mwanditsi, 30% urubuga)")}<FiInfo
                className={styles.infoIcon}
                onMouseEnter={() =>
                  setTooltip(
                    "Content licensing ituma inkuru zawe zishyurwa kandi zigakoresha ahandi. Urubuga rufata 30% by'inyungu."
                  )
                }
                onMouseLeave={() => setTooltip("")}
              />
            </span>
          </label>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              name="advertising"
              checked={formData.advertising}
              onChange={handleChange}
            />
            <span>{t("Nemera ko inkuru zanjye zikoreshwa mu kwamamaza urubuga")}<FiInfo
                className={styles.infoIcon}
                onMouseEnter={() =>
                  setTooltip(
                    "Urubuga rushobora gukoresha inkuru zawe mu kwamamaza kugirango rwongere traffic."
                  )
                }
                onMouseLeave={() => setTooltip("")}
              />
            </span>
          </label>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              name="addLink"
              checked={formData.addLink}
              onChange={handleChange}
            />
            <span>{t("Nemera ko igihe natanga inkuru ahandi, izajya irimo link ya website")}<FiInfo
                className={styles.infoIcon}
                onMouseEnter={() =>
                  setTooltip(
                    "Iyo utanze inkuru ahandi, link igaragaza ko yavuye ku rubuga rwa New Talents Stories."
                  )
                }
                onMouseLeave={() => setTooltip("")}
              />
            </span>
          </label>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              name="acceptRules"
              checked={formData.acceptRules}
              onChange={handleChange}
              required
            />
            <span>{t("Nemeye amategeko na mabwiriza ya New Talents Stories")}<FiInfo
                className={styles.infoIcon}
                onMouseEnter={() =>
                  setTooltip(
                    "Ugomba kwemera amategeko n'amabwiriza ya website mbere yo kohereza contract."
                  )
                }
                onMouseLeave={() => setTooltip("")}
              />
            </span>
          </label>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              name="legalAcknowledgment"
              checked={formData.legalAcknowledgment}
              onChange={handleChange}
              required
            />
            <span>{t("Nemeye ko ibyo nahamije bihamye kandi nshobora gukurikiranwa mu mategeko y'u Rwanda")}<FiInfo
                className={styles.infoIcon}
                onMouseEnter={() =>
                  setTooltip(
                    "Ibi birahagarariye ko wemera uburenganzira bw'amategeko y'u Rwanda ku byo wahamije."
                  )
                }
                onMouseLeave={() => setTooltip("")}
              />
            </span>
          </label>
          {tooltip && <p className={styles.tooltip}>{tooltip}</p>}
        </div>

        <button type="submit" className={styles.submitBtn}>{t("Ohereza Contract")}</button>
      </form>
    </div>
           
                </>
  );
}
