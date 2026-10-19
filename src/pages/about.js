// src/pages/about.js
import React from "react";
import styles from "../styles/about.module.css";
import { useI18n } from "@/i18n/I18nProvider";
const About = () => {
  const { t } = useI18n();

  return (
    <>
      
      <div className={styles.about}>
        <section className={styles.goal} id="goal">
          <h2>{t("OUR GOALS")}</h2>
          <p>{t("New Talents Stories Group ifite intego yo guteza imbere impano nshya mu kwandika no gusoma, kwigisha abantu uburyo inkuru zubaka zishobora guhindura ubuzima, ndetse no kwihangira imirimo binyuze mu gukoresha ikoranabuhanga rigezweho. Intego yacu ni ugushishikariza urubyiruko n'abakuze kwandika no gusoma inkuru zifite ireme, kubaka umuco wo gusoma, no gusangiza ibitekerezo byubaka amahoro, ubumwe, n’iterambere ry’imiryango.")}</p>
        </section>

        <section className={styles.mission} id="mission">
          <h2>{t("OUR MISSION")}</h2>
          <p>{t("Misiyo ya New Talents Stories Group ni uguteza imbere impano mu kwandika no gusoma, guhindura ubuzima binyuze mu nkuru zubaka, no kubaka umuryango ushingiye ku bumenyi, amahoro, n’iterambere.")}</p>
        </section>

        <section className={styles.vision} id="vision">
          <h2>{t("OUR VISION")}</h2>
          <p>{t("Icyerekezo cya New Talents Stories Group ni ugusiga isi mu mahoro no guteza imbere impano zose binyuze mu nkuru zubaka.")}</p>
        </section>
      </div>

      
    </>
  );
};

export default About;
