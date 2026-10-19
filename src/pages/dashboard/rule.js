'use client';
import React from "react";
import styles from "../../styles/rules.module.css";
import LinkComponent from "../../components/Link";
import { useI18n } from "@/i18n/I18nProvider";
export default function Rules() {
  const { t } = useI18n();

  const rules = [
    { rule: "Ntibyemewe gutangaza inkuru zibiba urwango cyangwa amacakubiri.", penalty: "Kwirukanwa burundu ku rubuga no gusiba ibihangano byose byawe." },
    { rule: "Kirazira gukoresha inkuru y'abandi cyangwa gukora inkuru ku muntu runaka ntaburenganzira bwanyirayo.", penalty: "Kubuzwa gutanga inkuru mu byumweru bibiri no guhagarika konti yawe kugeza ubwo ikibazo gikemutse." },
    { rule: "Inkuru za sex ziremewe, ariko irinde gutanga inkuru izavugwaho nabadomyi ko irimo ubusambanyi bikabije. Kandi menya neza ko wahisemo category yayo ya sex igihe utanga iyo nkuru.", penalty: "Gusibwa kw'iyo nkuru no gucibwa mande ya NeS 50." },
    { rule: "Abasomyi bagomba kwishyura kugira ngo babashe gusoma inkuru.", penalty: "Kubuzwa kugera ku nkuru." },
    { rule: "Ntibyemewe kwiba ibitekerezo by’undi mwanditsi.", penalty: "Gukurwaho inkuru no guhagarikwa ukwezi kumwe." },
    { rule: "Kwibasira abandi banyamuryango ntibyemewe.", penalty: "Guhagarikwa amezi abiri." },
    { rule: "Kwica uburenganzira bw’umwanditsi ntibyemewe.", penalty: "Gukurwaho inkuru no kwihanangirizwa." },
    { rule: "Mugihe ushyiraho inkuru, reba ko inkuru yawe ifite ifoto yemewe, idakwirakwiza ubusambanyi muburyo buziguye, reba kandi ko ifite folder ihura neza nizina ryayo. Ntibyemewe gushyiramo links mu nkuru utabyemerewe cyangwa kwamamaza mo udafite ubureganzira.", penalty: "Kubuzwa gutanga inkuru iminsi 10 no gucibwa mande ya NeS 5." },
    { rule: "Gutanga amakuru y’ibihuha ntibyemewe.", penalty: "Kubuzwa gutanga inkuru ukwezi kumwe no gukatwa NeS 45." },
    { rule: "Birabujijwe kwibasira cyangwa kuvuga nabi umusomyi witwaje ko nawe yakubwiye nabi.", penalty: "Guhagarikwa amezi atatu no gucibwa mande ya NeS 25 zihabwa umusomyi nk’imoza marira." },
    { rule: "Ntibyemewe gukoresha imvugo itari nziza, nko gusebanya, ibitutsi bikabije, imvugo zisesereza no guhindura amazina yibyo tuzi, ugakoresha ibindi. Kandi birabujijwe kwandika inkuru zirwanya iyobokamana, idini runaka cyereka ugamije kwigisha ", penalty: "Gukosorwa inkuru cyangwa guhagarikwa iminsi 15 no gutanga mande ya NeS 10." },
    { rule: "Gusaba abantu kwishyura mu buryo butemewe ubizeza ko bazabona NeS point.", penalty: "Guhagarikwa amezi atandatu cyangwa ukwezi kose utabona inyungu." },
    { rule: "Gutanga ibitekerezo by'ubugome cyangwa by'urwango ntibyemewe.", penalty: "Kwirukanwa burundu." },
    { rule: "Inkuru zose zigomba kuba zifite umwimerere, zuzuye kandi zisobanutse.", penalty: "Gusibwa kw’iyo nkuru no kubuzwa kongera kwandika ukwezi." },
    { rule: "Kugirira nabi abandi banyamuryango ntibyemewe.", penalty: "Guhagarikwa burundu." },
    { rule: "Gutanga inkuru zifite amashusho mabi cyangwa amafoto y’ubusambanyi ntibyemewe.", penalty: "Guhagarikwa imyaka ibiri cyangwa gutanga mande ya NeS 170." },
    { rule: "Gutanga amakuru y'ibihuha nka ‘itangazo’ utabisabiye uburenganzira ntibyemewe.", penalty: "Guhagarikwa amezi 4 no gucibwa mande ya NeS 300." },
    { rule: "Kwica uburenganzira bwa copyright ntibyemewe.", penalty: "Gukurwaho inkuru no kwihanangirizwa." },
    { rule: "Gutanga inkuru zidasobanutse cyangwa zidafite icyerekezo ntibyemewe.", penalty: "Gusibwa kw’iyo nkuru no guhagarikwa iminsi 30." },
    { rule: "Guhakana amategeko y’urubuga ntibyemewe.", penalty: "Kwirukanwa burundu." },
    { rule: "Birabujijwe gushyiraho link iyobora abasomyi ahandi utabisabiye uburenganzira.", penalty: "Kwishyura NeS 200 nk’igiciro cyo kwamamaza." },
    { rule: "Ntamwanditsi ubujijwe kwamamaza mu bihangano bye ariko agomba kubisabira uburenganzira.", penalty: "Iyo atabyubahirije, iyo nkuru irasibwa." },
    { rule: "Buri mwanditsi azajya atanga inkuru afite yose ntibyemewe gutanga ibice bice.", penalty: "Gucibwa mande ya NeS 15 kuri buri nkuru yarenzeho." },
    { rule: "Igihe inkuru yawe ifite Season nyinshi hanyuma ugasoza season runaka wizeza abasomyi ko bazabona season 2 Hanyuma ukamara igihe kirenze amezi 4 utaratanga iyo season, ntibyemewe.", penalty: "Gusibwa kwa folder y’iyo nkuru no gutanga mande ya NeS 10." },
    { rule: "Aya mategeko agomba kubahirizwa kuva taliki 1/09/2025.", penalty: "Inkuru zatanzwe mbere ntizirebwa n’aya mategeko." }
  ];

  return (
    <div>
      <LinkComponent />
      <div className={styles.container}>
        <h1 className={styles.title}>{t("Amategeko ya New Talents Stories Group")}</h1>
        <div className={styles.rulesList}>
          {rules.map((item, index) => (
            <div key={index} className={styles.rule}>
              <strong>{index + 1}. {item.rule}</strong><br />
              <span className={styles.penalty}>{t("Igihano: {penalty}", { penalty: item.penalty })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
