"use client";

import React, { useState, useEffect } from "react";
import styles from "./Channel.module.css";
import { FaWhatsapp, FaCheckCircle, FaArrowRight } from "react-icons/fa";
import { HiUsers } from "react-icons/hi";
import { MdNotificationsActive } from "react-icons/md";
import { BsFillShieldLockFill } from "react-icons/bs";
import { useI18n } from "@/i18n/I18nProvider";

const Channel = () => {
  const { t } = useI18n();

  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Animation on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("channel-section");
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  const stats = [
    { icon: <HiUsers />, label: "Abakurikira", value: "50K+" },
    { icon: <MdNotificationsActive />, label: "Umenyeshwa", value: "24/7" },
    { icon: <BsFillShieldLockFill />, label: "Umutekano", value: "100%" },
  ];

  const benefits = [
    "Kumenyera igihe inkuru nshya isohokeye",
    "Inama z'ingenzi",
    "Ubumenyi bushya",
    "Nta spam",
  ];

  const channelLink = "https://whatsapp.com/channel/0029Vb24TMfKLaHgsBDVUw3N";

  return (
    <section id="channel-section" className={styles.container}>
      <div className={styles.wrapper}>
        {/* Background decorations */}
        <div className={styles.bgDecoration1}></div>
        <div className={styles.bgDecoration2}></div>
        <div className={styles.bgDecoration3}></div>
        <div className={styles.bgDecoration4}></div>

        <div className={`${styles.content} ${isVisible ? styles.visible : ""}`}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.badge}>
              <span className={styles.badgeIcon}>📢</span>
              <span className={styles.badgeText}>{t("Channel")}</span>
            </div>
          </div>

          {/* Main content - Full width, no preview */}
          <div className={styles.mainContent}>
            {/* Left - Icon & Info */}
            <div className={styles.leftSection}>
              <div className={styles.iconWrapper}>
                <div className={styles.iconPulse}></div>
                <FaWhatsapp className={styles.iconLarge} />
              </div>

              <div className={styles.textBox}>
                <h2 className={styles.title}>{t("Dukurikirane kuri")}{" "}
                  <span className={styles.highlight}>{t("WhatsApp Channel")}</span>
                </h2>
                <p className={styles.subtitle}>{t("Ujye ubona inkuru nshya, amakuru, inama, n'ubumenyi kugihe buri munsi.")}</p>
              </div>

              {/* Stats */}
              <div className={styles.stats}>
                {stats.map((stat, index) => (
                  <div key={index} className={styles.statItem}>
                    <span className={styles.statIcon}>{stat.icon}</span>
                    <div>
                      <span className={styles.statValue}>{stat.value}</span>
                      <span className={styles.statLabel}>{stat.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Benefits */}
              <div className={styles.benefits}>
                {benefits.map((benefit, index) => (
                  <span key={index} className={styles.benefitTag}>
                    <FaCheckCircle className={styles.benefitIcon} />
                    {benefit}
                  </span>
                ))}
              </div>

              {/* CTA Button */}
              <a
                href={channelLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.btn} ${isHovered ? styles.btnHover : ""}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <span className={styles.btnContent}>
                  <FaWhatsapp className={styles.btnIcon} />
                  <span className={styles.btnText}>{t("Dukurikirane")}</span>
                  <FaArrowRight
                    className={`${styles.btnArrow} ${
                      isHovered ? styles.btnArrowHover : ""
                    }`}
                  />
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Channel;
