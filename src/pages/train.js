// pages/train.js
import { useState } from 'react';
import { db } from '../components/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import Cookies from 'js-cookie';
import { 
  FaUser, 
  FaStar, 
  FaTrophy, 
  FaBook, 
  FaLightbulb,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaAward,
  FaCertificate,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowRight,
  FaGraduationCap,
  FaMedal,
  FaGem,
  FaCrown,
  FaFire,
  FaRocket,
  FaShieldAlt,
  FaBrain,
  FaPenFancy,
  FaQuoteRight,
  FaHeart,
  FaMicrophone,
  FaGlobeAfrica,
  FaSecret,
  FaMapMarkerAlt,
  FaShareAlt,
  FaUsers
} from 'react-icons/fa';
import styles from '../styles/train.module.css';
import Head from 'next/head';
import { useI18n } from "@/i18n/I18nProvider";

// ============================================
// AMAHUGURWA (LESSONS) - 20 LESSONS IN KINYARWANDA
// ============================================
const LESSONS = [
  {
    id: 1,
    title: "Inkingi z'Inkuru Nziza",
    category: "Inkingi z'Inkuru",
    difficulty: "Beginner",
    readingTime: "Iminota 5",
    icon: <FaBook />,
    content: `
      Inkuru nziza ni nk'urugendo rujyana umusomyi ahantu hatandukanye. Igizwe n'ibintu bitatu by'ingenzi: 
      abantu bafate ibyifuzo, ibibazo bibahagarika Imitima, n'ibisubizo bihindura buri kintu mu buzima bwabo.

      Iyo wandika inkuru, uba usezeranya umusomyi ibintu bizamushimisha, bitume yumva, atekereza, 
      cyangwa areba isi mu buryo butandukanye. Inkuru nziza zikomeza kuba mu mutwe w'umusomyi 
      n'iyo asoje gusoma.

      Utangira wibaze: Ni ibihe byiyumviro nshaka ko umusomyi yumva? Ni ibyishimo, agahinda, ubwoba, 
      cyangwa ibyiringiro? Ibyo byiyumviro ni byo bizayobora buri cyemezo ukora mu nkuru yawe.
    `,
    summary: "Inkuru nziza igizwe n'abantu, ibibazo, n'ihinduka ry'amarangamutima.",
    exercise: "Andika paragarafe imwe y'inkuru ivuga umuntu ushaka ikintu runaka ariko agahura n'ikibazo."
  },
  {
    id: 2,
    title: "Kurema Abakinankuru Batazibagirana",
    category: "Gutezimbere Abantu",
    difficulty: "Beginner",
    readingTime: "Iminota 6",
    icon: <FaUser />,
    content: `
      Abantu baza mu nkuru bameze nk'abantu nyirizina. Bafite ibyifuzo, ubwoba, imbaraga, n'ubunebwe. 
      Bakora amakosa, biga ibintu, kandi bahinduka mu gihe gito nkuko bisanzwe kubantu.

      Kugira ngo ureme umuntu utazibagirana nk'umukina nkuru mwiza, tangirana n'icyo ashaka n'icyo akenera. Ni iki yibwira ko ashaka? 
      Ni iki akenera by'ukuri? Itandukaniro riri hagati y'ibyo bibiri ni ryo rituma umuntu ahinduka.

      Ha umuntu wawe ijwi ryihariye. Uburyo bavuga, ibyo babona, n'uburyo batwara ibintu bigaragaza imico yabo. 
      Abantu beza ni abo tubona muri twe ubwacu.
    `,
    summary: "Abantu batazibagirana bafite ibyifuzo, ibyakenerwa, n'amajwi yihariye.",
    exercise: "Kora urutonde rw'imico y'umuntu ushaka kurema: izina, imyaka, akazi, icyifuzo, icyo akenera, n'amabanga afite."
  },
  {
    id: 3,
    title: "Kwandika Ibibazo cyangwa ibiganiro mu Kinyarwanda",
    category: "Kwandika Ibibazo n'ibiganiro",
    difficulty: "Beginner",
    readingTime: "Iminota 5",
    icon: <FaQuoteRight />,
    content: `
      Ibibazo n'ibiganiro bigaragaza imico y'abantu kandi bigatuma inkuru igenda neza. Bigomba kumvikana nk'ibiganiro bisanzwe 
      ariko bikagira imiterere iruta uko abantu bavuga mu buzima bwa buri munsi.

      Buri muntu agomba kugira uburyo bwe bwo kuvuga. Amagambo akoresha, uburebure bw'interuro, 
      n'umuvuduko w'ijwi byerekana amateka ye, uburezi, n'imico ye. Ibibazo bigomba kuba bifite ibyo bivuga 
      mu buryo butaziguye — ibyo abantu bavuga ntibihuje n'ibyo baba bavuga mu mutima.

      Wirinda gukoresha ibibazo mu gutanga amakuru menshi ahubwo werekane amakuru binyuze mu bikorwa n'imyitwarire. 
      Koresha ibibazo mu kurema amakimbirane, kwerekana amakimbirane, no kwerekana imibanire.
    `,
    summary: "Ibibazo bigaragaza imico, bituma inkuru igenda neza, kandi bifite ibyo bivuga mu buryo butaziguye.",
    exercise: "Andika ikibazo hagati y'abantu babiri batavuga rumwe ku kintu runaka."
  },
  {
    id: 4,
    title: "Gukora Amakimbirane",
    category: "Amakimbirane",
    difficulty: "Beginner",
    readingTime: "Iminota 6",
    icon: <FaFire />,
    content: `
      Amakimbirane ni yo moteri y'inkuru. Atera imbaraga, yongera ibihombo, kandi akomeza kwifashisha abasomyi, mu gukurura amaranga mutima yabo.

      Hariho ubwoko butatu bw'amakimbirane: imbere mu mutima (umuntu na we ubwe), hanze (umuntu n'abandi), 
      n'ibidukikije (umuntu n'isi). Inkuru nziza zikoresha ubwoko bwose butatu.

      Buri gice gikwiye kugira amakimbirane runaka, n'ubwo atoshobora kuba akomeye. Amakimbirane ntabwo 
      ari ukurwana gusa — ashobora kuba amakosa, kutumvikana, cyangwa guhitamo bigoranye. Ikintu cy'ingenzi 
      ni uko abantu bahura n'ibibazo bibahagarika umutima.
    `,
    summary: "Amakimbirane atuma inkuru igenda neza binyuze mu bibazo by'imbere, hanze, n'ibidukikije.",
    exercise: "Andika igice aho umuntu ahura n'ikibazo cy'imyitwarire gikomeye."
  },
  {
    id: 5,
    title: "Gukora Ubwoba n'Impagarara",
    category: "Ubwoba n'Impagarara",
    difficulty: "Beginner",
    readingTime: "Iminota 7",
    icon: <FaShieldAlt />,
    content: `
      Impagarara zituma umusomyi atimuka ku ntebe ngo arekere gusoma, niyo asubitse aba yumva yatinze kugaruka. Zikorwa binyuze mu gutegereza, kudasobanuka, 
      n'isezerano ry'ikintu gikomeye kigiye kubaho yibwira muri we atarabona.

      Koresha umuvuduko wo kugira ngo ukore impagarara. Interuro ngufi zihutisha ibintu. Interuro ndende 
      zishobora gukora umuvuduko binyuze mu gutwara ibintu buhoro buhoro. Kureka kwerekana amakuru runaka uwo mwanya,
      bituma abasomyi bashaka cyane kumenya ibizabaho.

      Gushushanya ibizaba (foreshadowing) ni igikoresho gikomeye cyo gukora impagarara. Tera ibimenyetso 
      by'ibizaba mu ntangiriro byongera bigasobanuka mu bice bindi. Ariko witondere — gushushanya ibizaba 
      bigomba kuba ibintu bitagaragara cyane ku buryo abasomyi batabibona, ariko bigasobanuka iyo bisubiyemo mu bindi bice.
    `,
    summary: "Impagarara zikorwa binyuze mu gutegereza, umuvuduko, no kugenzura amakuru.",
    exercise: "Andika igice gifite ubwoba aho umuntu ategereje amakuru akomeye."
  },
  {
    id: 6,
    title: "Kwandika Impinduka mu Nkuru",
    category: "Impinduka z'Inkuru",
    difficulty: "Beginner",
    readingTime: "Iminota 8",
    icon: <FaRocket />,
    content: `
      Impinduka mu nkuru zibabaza abasomyi binyuze mu guhindura ibyo bari biteze. Impinduka nziza ni izo 
      utatezaga ariko zikaba zari gukomeza kubaho.

      Kugira ngo wandike impinduka nziza, tera ibimenyetso mu ntangiriro byerekana ukuri kw'ibintu 
      ariko bishobora gusobanurwa mu buryo butandukanye. Impinduka igomba guhindura uburyo abasomyi 
      babona ibyabanjirije izo mpinduka, bigatuma bashaka gusoma ibice byabanje inyuma nanone kugirango barebe neza aho izo minduka zavuye.

      Impinduka zikora neza iyo zikorera ku ngingo n'ibintu by'inkuru, si ugutangaza gusa. Impinduka nziza 
      zigaragaza ibintu by'imbitse kuri ba bakinankuru cyangwa mu isi y'inkuru.
    `,
    summary: "Impinduka mu nkuru zihindura ibyitezwe kandi zikagaragaza iby'imbitse.",
    exercise: "Andika igice aho umuntu abona ko ibyo yizeraga byose ari ibinyoma."
  },
  {
    id: 7,
    title: "Imiterere y'Igice",
    category: "Imiterere y'Igice",
    difficulty: "Beginner",
    readingTime: "Iminota 6",
    icon: <FaGraduationCap />,
    content: `
      Imiterere y'igice ikurikiza amahame nk'ay'inkuru ariko mu rugero ruto. Buri gice kigomba kugira 
      urugendo rwacyo cy'ubwacyo mu gihe kibarwa ku nkuru yose.

      Buri gice gikenera: urwunge (gutangira igice), ibibazo bikiyongera (kongera imbaraga), 
      impinduka (guhindura icyerekezo), ibintu bigabanuka (gusubiza ibibazo abasomyi bibazaga), n'ibiteganyiriza ibice bikurikira
      (gutegura igice gikurikira).

      Rangiza buri gice n'ikibazo cyangwa ibintu by'amarangamutima bituma abasomyi bashaka gukomeza. 
      Inkuru nziza zikozwe mu bice zishimisha ubwazo abasomyi kandi zikaba zikorera ku nkuru yose.
    `,
    summary: "Buri gice kigomba kugira urugendo rwacyo mu gihe gishamikiye ku nkuru yose.",
    exercise: "Andika urutonde rw'ibice bitatu bikurikirana hamwe n'urwunge rw'ikisubizo."
  },
  {
    id: 8,
    title: "Ubumenyi bw'Ikinyarwanda ku Banditsi",
    category: "Ubumenyi bw'Ikinyarwanda",
    difficulty: "Beginner",
    readingTime: "Iminota 5",
    icon: <FaBrain />,
    content: `
      Ubumenyi bw'Ikinyarwanda butuma inkuru yawe yoroha gusoma kandi ihebuje. Ariko ubumenyi 
      n'igikoresho cy'ubuhanga.

      Imiterere y'interuro igira ingaruka ku muvuduko n'amarangamutima. Interuro ngufi zihutisha ibintu. 
      Interuro ndende zishobora kuba nk'inzozi cyangwa zikaba zirimo ibitekerezo. Ibice by'interuro 
      bishobora gushimangira igitekerezo cyangwa amarangamutima. Ibimenyetso by'ubwandu bugenzura 
      umuvuduko n'amarangamutima.

      Mbere yo kwandika, banza usobanukirwe neza amahame agenga ibyo ushaka gukora kugira ngo umenye uko wayakoresha mu buryo buboneye cyangwa igihe bibaye ngombwa uyarenze ubigiranye ubushishozi. Menya neza intego ushaka kugeraho, hanyuma uhitemo ubumenyi n'uburyo bukwiranye na yo. Icy'ingenzi si ugukurikiza amahame uko yakabaye gusa, ahubwo ni ugusobanura igitekerezo mu buryo bwumvikana no kugira ingaruka nziza ku marangamutima y'usoma.
    `,
    summary: "Ubumenyi bw'Ikinyarwanda ni igikoresho cy'ubuhanga cyo kugenzura umuvuduko n'amarangamutima.",
    exercise: "Subiramo paragarafu ukoresheje interuro zitandukanye kugira ngo uhindure ikinyabupfura."
  },
  {
  id: 9,
  title: "Ubuhanga bwo Gutunganya Inkuru",
  category: "Gutunganya",
  difficulty: "Hagati",
  readingTime: "Iminota 7",
  icon: <FaPenFancy />,
  content: `
    Gutunganya ni intambwe ituma inkuru nziza irushaho kuba nziza. Ni bwo usubira mu byo wanditse, ugakosora, ugakuraho ibidakenewe, kandi ugashyira ibintu ku murongo kugira ngo inkuru irusheho gusobanuka no gushimisha abasomyi.

    Tangira ubanze urebe ibintu by'ingenzi bigize inkuru: umugambi wayo, uko ibikorwa bikurikirana, n'iterambere ry'abavugwa mo. Ugenzure niba buri gice gifasha inkuru kugera ku ntego yayo.

    Nyuma y'ibyo, ongera usuzume uko ibice bikurikirana, umuvuduko w'inkuru, aho impagarara zubakwa n'uko zikemuka. Hanyuma ugaruke ku nteruro imwe imwe, ukosore ikibonezamvugo, uhitamo amagambo akwiriye kandi ushyireho imvugo yoroshye kandi isobanutse.

    Umwanditsi mwiza ntatinya gukuraho amagambo, interuro cyangwa ibice bidafasha inkuru, n'ubwo yaba yarabihaye igihe kinini. Intego si ukugumana ibyo wanditse byose, ahubwo ni ugusigaza ibituma inkuru iba nziza, isobanutse kandi ikora ku mutima w'umusomyi.
  `,
  summary: "Gutunganya inkuru ni ukuyisubiramo uyikosora, unoza imiterere yayo, ugakuraho ibidakenewe no kunoza imvugo kugira ngo irusheho gushimisha abasomyi.",
  exercise: "Subira ku gika wanditse, ugikoremo ubugororangingo ukuraho nibura 20% by'amagambo adafite umumaro, hanyuma urebe niba ubutumwa bukomeza gusobanuka kurushaho."
},
  {
  id: 10,
  title: "Gutangaza Umurimo Wawe",
  category: "Gutangaza",
  difficulty: "Hagati",
  readingTime: "Iminota 6",
  icon: <FaRocket />,
  content: `
    Nyuma yo kurangiza kwandika no gutunganya inkuru yawe, intambwe ikurikira ni ukuyigeza ku basomyi. Ushobora kuyitangaza ubwawe cyangwa ugakorana n'inzu icapa cyangwa urubuga ruyitangaza. Buri nzira igira ibyiza n'imbogamizi zayo.

    Gutangaza binyuze ku bandi bishobora gutuma inkuru yawe imenyekana vuba kandi ikagera ku basomyi benshi, ariko akenshi bisaba gukurikiza amabwiriza y'abayitangaza no kugirana na bo amasezerano.

    Kwitangariza ku giti cyawe biguha uburenganzira busesuye ku murimo wawe no ku nyungu zawo, ariko bisaba ko wita ku bintu byose birimo gutunganya igitabo, kugikorera igishushanyo, kugishyira ku isoko no kukimenyekanisha.

    Uko inzira wahitamo yaba imeze kose, isura y'umurimo wawe ifite akamaro. Igifuniko cyiza, imiterere inoze n'imyandikire iteguye neza bituma abasomyi bagira icyizere cyo kuyisoma mbere yo kuyifungura.
  `,
  summary: "Menya uburyo butandukanye bwo gutangaza umurimo wawe, uhitemo inzira ikubereye kandi wite ku isura yawo.",
  exercise: "Gereranya ibyiza n'imbogamizi zo kwitangariza ku giti cyawe no gukorana n'inzu cyangwa urubuga rutangaza ibitabo."
},
{
  id: 11,
  title: "Kumenya Ibyo Abasomyi Bakeneye",
  category: "Abasomyi",
  difficulty: "Hagati",
  readingTime: "Iminota 8",
  icon: <FaUsers />,
  content: `
    Umwanditsi mwiza ntiyandika ibyo ashaka gusa, ahubwo anamenya ibyo abasomyi bifuza. Gusobanukirwa abo wandikira bigufasha guhanga inkuru zibashimisha kandi zigakora ku marangamutima yabo.

    Abasomyi bakunda inkuru zibafasha kwiyumvamo abavugwa, zikabatera amatsiko, zikabasekesha, zikabariza cyangwa zikabigisha isomo rifite akamaro. Bifuza kubona abavugwa bahura n'ibibazo, bakarwana na byo, hanyuma bagatera imbere.

    Jya witondera ibitekerezo n'ibitekerezo-mpaka by'abasomyi. Suzuma ibyo bakunda n'ibyo banenga, ariko wirinde kwandika ugamije gushimisha buri wese. Ahubwo, andika inkuru ifite ubutumwa busobanutse kandi yubakiye ku byo abasomyi bashobora kwiyumvamo.

    Uko urushaho gusobanukirwa abasomyi bawe, ni ko uzarushaho kubaka inkuru zibafata umutima kandi bakazahora bazizirikana.
  `,
  summary: "Kumenya ibyo abasomyi bakeneye bigufasha kwandika inkuru zibashimisha kandi zikabasigira isomo cyangwa amarangamutima akomeye.",
  exercise: "Hitamo amarangamutima runaka, nk'ibyishimo, agahinda cyangwa amatsiko, hanyuma wandike igika kigamije gutuma umusomyi yumva nkaho ariwe wavugaga."
},
{
  id: 12,
  title: "Kwamamaza no Gukwirakwiza Inkuru",
  category: "Kwamamaza",
  difficulty: "Hagati",
  readingTime: "Iminota 6",
  icon: <FaShareAlt />,
  content: `
    Kwandika inkuru nziza ntibihagije, igomba no kugera ku basomyi. Kwamamaza no gukwirakwiza inkuru ni byo bituma abantu bayimenya kandi bagashishikarira kuyisoma.

    Banza umenye abo wandikira. Menya imyaka yabo, ibyo bakunda, imbuga bakoresha ndetse n'uburyo bakunda gusoma inkuru. Ibyo bizagufasha kumenya uburyo bwiza bwo kubageraho.

    Koresha uburyo butandukanye bwo kumenyekanisha umurimo wawe, nko gukoresha imbuga nkoranyambaga, gusangiza abantu ibice bito by'inkuru, gukora ibyapa byamamaza, cyangwa gukorana n'abandi banditsi n'abasomyi bazwi.

    Irinde kwamamaza bikabije. Ahubwo jya utanga ibintu bifite akamaro, usubize ibitekerezo by'abasomyi kandi wubake umubano mwiza na bo. Umwanditsi ugirana umubano mwiza n'abasomyi akomeza kugira abazirikana ibikorwa bye.
  `,
  summary: "Kwamamaza no gukwirakwiza inkuru bifasha umurimo wawe kugera ku basomyi benshi no kubaka umubano urambye na bo.",
  exercise: "Tegura gahunda yo kwamamaza inkuru yawe ukoresheje nibura uburyo butatu butandukanye."
},
{
  id: 13,
  title: "Kwandika Ibice Bikora ku Marangamutima",
  category: "Inkingi z'Inkuru",
  difficulty: "Hagati",
  readingTime: "Iminota 7",
  icon: <FaHeart />,
  content: `
    Ibice bikora ku marangamutima ni byo bituma inkuru yibagirana cyangwa igahora mu mutima w'umusomyi. Iyo byanditswe neza, bituma umusomyi aseka, arira, agira impuhwe cyangwa agira amatsiko.

    Mbere yo kwandika, banza wibaze amarangamutima ushaka kubyutsa. Ese ushaka gutera agahinda, ibyishimo, ubwoba cyangwa icyizere? Hanyuma wubake igice kigenda gitera ayo marangamutima buhoro buhoro.

    Ntukabwire umusomyi uko akwiriye kumva. Ahubwo mwereke ibikorwa, imvugo n'ibyemezo by'abavugwa. Iyo umusomyi abyibonera ubwe, amarangamutima aba akomeye kurushaho.

    Ibice bikomeye bishingira ku kuri kw'abavugwa no ku bihe bibafata mu buryo busanzwe, aho kubahatira amarangamutima atumvikana.
  `,
  summary: "Ibice bikora ku marangamutima byubakwa n'ibikorwa, imyitwarire n'imiterere y'abavugwa aho kubisobanura gusa.",
  exercise: "Andika igice cyerekana intsinzi cyangwa igihombo gikomeye, utabwira umusomyi amarangamutima ahubwo uyamwereke."
},
{
  id: 14,
  title: "Kurema Ijwi Ryihariye ry'Umukinnyi",
  category: "Guteza Imbere Abavugwa",
  difficulty: "Hagati",
  readingTime: "Iminota 6",
  icon: <FaMicrophone />,
  content: `
    Buri mukinnyi akwiye kugira uburyo bwe bwihariye bwo gutekereza no kuvuga. Ibyo ni byo bituma abasomyi bamwibuka kandi bakamushobora kumutandukanya n'abandi.

    Ijwi ry'umukinnyi rigaragarira mu magambo akoresha, uburyo yubaka interuro, ibyo akunda kuvugaho n'uko abona isi. Umwana, umusaza, umwarimu cyangwa umucuruzi ntibavuga kimwe kandi ntibatekereza kimwe.

    Irinde gutuma abantu bose bavuga mu buryo bumwe. Reka buri wese agaragaze imiterere ye n'amateka ye mu mvugo ye.

    Iyo buri mukinnyi afite ijwi rye bwite, ibiganiro birushaho kuba ibyanyabyo kandi inkuru igasomwa neza.
  `,
  summary: "Ijwi ry'umukinnyi rigaragazwa n'imvugo ye, imitekerereze ye n'uburyo abona isi.",
  exercise: "Andika ikiganiro hagati y'abakinnyi binkuru babiri bafite imyaka cyangwa imyuga itandukanye, ku buryo umusomyi ashobora kubatandukanya atarebye amazina yabo."
},
{
  id: 15,
  title: "Kwandika Ibiganiro Bifite Ubutumwa Bwihishe",
  category: "Ibiganiro",
  difficulty: "Urwego Ruhanitse",
  readingTime: "Iminota 7",
  icon: <FaQuoteRight />,
  content: `
    Mu nkuru nziza, amagambo avugwa si yo aba afite akamaro gusa. Hari n'ubutumwa bwihishe inyuma y'ayo magambo, bugaragarira mu guceceka, mu maso, mu bikorwa cyangwa mu buryo abantu basubizanya.

    Abantu bashobora kuvuga ko byose ari byiza kandi mu by'ukuri bafite uburakari cyangwa agahinda. Bashobora no kwirinda kuvuga ikibazo nyamukuru ariko ibikorwa byabo bikabigaragaza.

    Ntusobanurire umusomyi buri kantu. Muhe ibimenyetso bihagije kugira ngo abe ari we uhuza ibitekerezo. Ibyo bituma inkuru irushaho kuba nyayo kandi igatera amatsiko.

    Ibiganiro bifite ubutumwa bwihishe bituma abavugwa bagaragara nk'abantu nyabo, kuko no mu buzima busanzwe abantu badahora bavuga ibyo batekereza byose.
  `,
  summary: "Ibiganiro bikomeye ntibishingira ku magambo gusa, ahubwo binashingira ku butumwa bwihishe n'ibikorwa by'abavugwa.",
  exercise: "Andika ikiganiro hagati y'abantu babiri bafite amakimbirane, ariko ntihagire n'umwe uvuga ikibazo nyamukuru mu buryo butaziguye."
},
  {
  id: 16,
  title: "Kuzamura Uburemere bw'Amakimbirane",
  category: "Amakimbirane",
  difficulty: "Hagati",
  readingTime: "Iminota 6",
  icon: <FaFire />,
  content: `
    Inkuru irushaho gushimisha iyo umusomyi yumva hari ikintu gikomeye umukinankuru ashobora gutakaza. Ibyo ni byo bita uburemere bw'amakimbirane. Iyo buri cyemezo gifite ingaruka zikomeye, umusomyi arushaho kugira amatsiko.

    Ibyo umukinankuru ashobora gutakaza bishobora kuba ubuzima bwe, amafaranga, urukundo, umuryango, icyubahiro cyangwa inzozi ze. Ashobora no gutakaza icyizere, indangagaciro cyangwa ikizere yari afitiye abandi.

    Ntutangire inkuru ibintu byose biri ku rwego rwo hejuru. Ahubwo jya uzamura uburemere bw'amakimbirane buhoro buhoro. Buri kibazo gishya kigomba kurusha icyabanje ubukana, ku buryo umusomyi ahora yifuza kumenya uko bizagenda bigana.

    Ku musozo w'inkuru, umukinankuru akwiye kuba ageze aho agomba gufata icyemezo gikomeye gishobora guhindura ubuzima bwe burundu.
  `,
  summary: "Uburemere bw'amakimbirane butuma umusomyi ahora ategereje kumenya icyo umukinankuru azahitamo n'ingaruka zabyo.",
  exercise: "Andika ibintu bitatu by'ingenzi umukinankuru wawe ashobora gutakaza, hanyuma werekane uko buri kimwe cyongera ubukana bw'inkuru."
},
{
  id: 17,
  title: "Kubaka Isi y'Inkuru",
  category: "Inkingi z'Inkuru",
  difficulty: "Hagati",
  readingTime: "Iminota 7",
  icon: <FaGlobeAfrica />,
  content: `
    Buri nkuru iba ifite isi iberamo. Ishobora kuba ari ahantu hasanzwe cyangwa ari isi wahimbye, ariko igomba kumvikana nk'aho ibaho koko.

    Sobanura ahantu, umuco, amateka, amategeko n'imibereho y'abaturage buhoro buhoro uko inkuru igenda. Irinde gusuka amakuru yose icyarimwe, ahubwo yerekane binyuze mu bikorwa n'ibiganiro by'abavugwa.

    Isi yanditswe neza ituma umusomyi yiyumvamo ko ari muri iyo nkuru. Ahantu hose, imigenzo yose n'amategeko yaho bigomba gukurikizwa kuva inkuru itangiye kugeza irangiye.

    Niba isi yawe ifite amategeko yihariye, jya uyubahiriza kugira ngo inkuru ikomeze kumvikana kandi yizewe.
  `,
  summary: "Kubaka isi y'inkuru bituma umusomyi yumva aho ibikorwa bibera kandi akabyinjiramo byoroshye.",
  exercise: "Sobanura ahantu h'ingenzi mu nkuru yawe ukoresheje ibyo umuntu abona, yumva, ahumurirwa n'ibyo akoraho."
},
{
  id: 18,
  title: "Kwandika Ibice by'Ibikorwa Bikomeye",
  category: "Ibikorwa n'Impagarara",
  difficulty: "Hagati",
  readingTime: "Iminota 7",
  icon: <FaShieldAlt />,
  content: `
    Ibice birimo ibikorwa bikomeye cyangwa intambara bigomba gusobanuka kandi bikihuta gusomwa. Intego yabyo si ukurwana gusa, ahubwo ni ukwerekana ibyemezo bikomeye n'ingaruka zabyo.

    Koresha interuro ngufi kandi zisobanutse kugira ngo ibikorwa bikomeze umuvuduko. Garagaza aho abavugwa bahagaze, ibyo babona, bumva n'uko bitwara.

    Muri ibyo bihe bikomeye ni ho imico nyakuri y'abavugwa igaragarira. Uko umuntu yitwara ari mu kaga ni ko kumwerekana kurusha amagambo menshi.

    Buri gikorwa gikomeye kigomba kugira impamvu n'ingaruka ku nkuru, aho kuba icyashyizwemo kugira ngo cyuzuze impapuro gusa.
  `,
  summary: "Ibice by'ibikorwa bikomeye bigaragaza imico y'abavugwa kandi bigateza inkuru imbere.",
  exercise: "Andika igice kirimo ikibazo gikomeye, aho umukinankuru afata icyemezo mu gihe gito kandi kikagira ingaruka zikomeye."
},
{
  id: 19,
  title: "Gusubiramo no Kunoza Inkuru",
  category: "Gutunganya",
  difficulty: "Hagati",
  readingTime: "Iminota 8",
  icon: <FaPenFancy />,
  content: `
    Gusubiramo ni imwe mu ntambwe z'ingenzi mu kwandika. Ni bwo ubona amakosa, ugakosora ibitagenda neza kandi ugatunganya inkuru kugira ngo irusheho gukomera.

    Mbere yo gusubiramo, fata akanya uhumpeke. Iyo ugarutse ku nkuru nyuma y'igihe gito, ubasha kubona ibyo utabonaga ukiyandika.

    Tangira ureba umugambi rusange n'imiterere y'inkuru. Nyuma usuzume ibice, ibiganiro n'umuvuduko w'ibyabaye. Isoze ukosora amagambo, ikibonezamvugo n'imyandikire.

    Ntutinye guhindura cyangwa gukuraho ibice bidafasha inkuru. Intego si ukugumana ibyo wanditse byose, ahubwo ni ukugira inkuru ikomeye kandi isobanutse.
  `,
  summary: "Gusubiramo ni ugusesengura no kunoza inkuru kugeza ibaye isobanutse kandi ifite ireme.",
  exercise: "Subira ku gice kimwe wanditse, ugikosore inshuro eshatu: ubanze urebe umugambi, nyuma ibice, hanyuma imyandikire n'ururimi."
},
{
  id: 20,
  title: "Kubaka Umuryango w'Abanditsi",
  category: "Iterambere ry'Umwanditsi",
  difficulty: "Ibanze",
  readingTime: "Iminota 6",
  icon: <FaUsers />,
  content: `
    Umwanditsi ntakura wenyine. Gukorana n'abandi banditsi n'abasomyi bituma wunguka ubumenyi, ibitekerezo n'inararibonye bishya.

    Jya witabira amatsinda y'abanditsi, amahugurwa n'ibiganiro bibahuza. Sangiza abandi ibyo wanditse kandi wemere inama n'ibitekerezo bigamije kukubaka.

    Nawe ujye usoma ibikorwa by'abandi, ubashimire ibyo bakoze neza kandi ubagire inama zubaka. Iyo muterana inkunga, buri wese arushaho gutera imbere.

    Umubano mwiza n'abanditsi ndetse n'abasomyi ushobora kugufungurira amahirwe mashya yo kumenyekana no gukomeza guteza imbere impano yawe.
  `,
  summary: "Kubaka umuryango w'abanditsi bitanga amahirwe yo kwiga, kungurana ibitekerezo no gutera imbere.",
  exercise: "Shaka itsinda cyangwa urubuga ruhuza abanditsi, usangize abandi igice cy'inkuru yawe kandi wakire ibitekerezo byabo."
}
];

// ============================================
// IBIBAZO BY'AMAHUGURWA (QUIZZES) - IN KINYARWANDA
// ============================================
const QUIZZES = {
  1: {
    question: "Ni ibihe bintu bitatu by'ingenzi bigize inkuru nziza?",
    options: ["Abakinankuru, Umugambi n'Umwanzuro", "Abakinankuru, Amakimbirane n'Umugambi", "Intangiriro, Hagati n'Impera", "Ahantu, Igihe n'Umuco"],
    correct: 1
  },
  2: {
    question: "Ni iki gituma umukinankuru ahinduka uko inkuru igenda itera imbere?",
    options: ["Amateka ye gusa", "Itandukaniro hagati y'ibyo yifuza n'ibyo akeneye", "Aho inkuru ibera", "Impinduka z'ikirere"],
    correct: 1
  },
  3: {
    question: "Ni akahe kamaro k'ibibazo cyangwa amakimbirane mu nkuru?",
    options: ["Bituma umusomyi arushaho gukurikira inkuru", "Bituma inkuru iba ndende", "Bituma amagambo yiyongera", "Bituma inkuru irangira vuba"],
    correct: 0
  },
  4: {
    question: "Ni ubuhe muri ubu butari ubwoko bw'amakimbirane mu nkuru?",
    options: ["Amakimbirane y'imbere mu muntu", "Amakimbirane hagati y'abantu", "Amakimbirane hagati y'umuntu n'ibidukikije", "Amakimbirane y'ibara"],
    correct: 3
  },
  5: {
    question: "Ni iki gifasha kubaka impagarara mu nkuru?",
    options: ["Ibisobanuro birebire", "Gutera amatsiko no gukomeza amakimbirane", "Kugaragaza iherezo hakiri kare", "Kugabanya ibikorwa"],
    correct: 1
  },
  6: {
    question: "Ni ryari impinduka mu nkuru iba ikomeye?",
    options: ["Iyo itunguranye gusa", "Iyo itunguranye ariko igasa n'iyashobokaga", "Iyo idafite impamvu", "Iyo ihindura umutwe w'inkuru"],
    correct: 1
  },
  7: {
    question: "Ni iki buri gice cy'inkuru gikwiye kuba gifite?",
    options: ["Ibanga gusa", "Intego, amakimbirane n'icyo igeraho", "Amagambo menshi", "Abakinankuru benshi"],
    correct: 1
  },
  8: {
    question: "Imiterere y'interuro ifasha iki mu nkuru?",
    options: ["Nta kamaro igira", "Kugenzura umuvuduko n'amarangamutima", "Gusa gukosora ikibonezamvugo", "Gutuma inkuru iba ndende"],
    correct: 1
  },
  9: {
    question: "Iyo utunganya inkuru, ni iki ubanza gusuzuma?",
    options: ["Interuro imwe imwe", "Imiterere rusange y'inkuru n'umugambi wayo", "Uko umutwe wanditse", "Ibimenyetso by'inyuguti"],
    correct: 1
  },
  10: {
    question: "Ni iki cy'ingenzi gitandukanya kwitangariza no gutangazwa n'inzu y'ibitabo?",
    options: ["Kwitangariza biguha uburenganzira busesuye ku murimo wawe", "Nta tandukaniro rihari", "Gutangarizwa n'abandi ni ubuntu buri gihe", "Kwitangariza ntibisaba kwamamaza"],
    correct: 0
  },
  11: {
    question: "Ni iki abasomyi bakunda cyane mu nkuru nziza?",
    options: ["Amarangamutima n'ibikorwa bibafata umutima", "Amagambo akomeye gusa", "Ibisobanuro birebire", "Inkuru ndende gusa"],
    correct: 0
  },
  12: {
    question: "Kwamamaza inkuru bigerwaho neza iyo...",
    options: ["Ukoresheje amafaranga menshi gusa", "Wubaka umubano mwiza n'abasomyi", "Ukoresheje imbuga zose icyarimwe", "Wandika amatangazo maremare"],
    correct: 1
  },
  13: {
    question: "Ni ubuhe buryo bwiza bwo kwandika igice gikora ku marangamutima?",
    options: ["Kubwira umusomyi icyo agomba kumva", "Kwerekana ibikorwa n'imyitwarire y'abakinankuru", "Kwihutisha inkuru", "Kwirinda amarangamutima"],
    correct: 1
  },
  14: {
    question: "Ni iki gitandukanya ijwi ry'umukinankuru n'iry'undi?",
    options: ["Izina rye", "Uburyo avuga, atekereza n'amagambo akoresha", "Imyambaro ye", "Imyaka ye gusa"],
    correct: 1
  },
  15: {
    question: "Mu nkuru, ubutumwa bwihishe (subtext) ni iki?",
    options: ["Amagambo avugwa gusa", "Icyo abavugwa bashaka kuvuga batakivuze mu buryo butaziguye", "Umutwe w'inkuru", "Igika cya nyuma"],
    correct: 1
  },
  16: {
    question: "Ni gute uburemere bw'amakimbirane bugomba kuzamuka mu nkuru?",
    options: ["Buhoro buhoro uko inkuru itera imbere", "Buri gihe butangira buri hejuru", "Nta mpamvu yo kubuzamura", "Mu gice cya nyuma gusa"],
    correct: 0
  },
  17: {
    question: "Ni ubuhe buryo bwiza bwo kubaka isi y'inkuru?",
    options: ["Gusuka amakuru yose icyarimwe", "Kuyerekana binyuze mu bikorwa n'ubuzima bw'abavugwa", "Kuyisobanura mu gika cya mbere gusa", "Kwirengagiza aho inkuru ibera"],
    correct: 1
  },
  18: {
    question: "Ibice birimo ibikorwa bikomeye cyangwa intambara bigomba kwerekana iki?",
    options: ["Imico n'ibyemezo by'abavugwa", "Aho inkuru ibera gusa", "Amateka y'igihugu", "Imiterere y'ikirere"],
    correct: 0
  },
  19: {
    question: "Mbere yo gusubiramo inkuru, ni iki cyiza wakora?",
    options: ["Kongeramo abakinankuru benshi", "Kubanza gufata akaruhuko kugira ngo uyisome n'amaso mashya", "Guhita ukosora ikibonezamvugo", "Guhindura umutwe gusa"],
    correct: 1
  },
  20: {
    question: "Kubaka umuryango w'abanditsi bifasha iki?",
    options: ["Kubona amafaranga ako kanya", "Kunguka inama, ubufasha n'ubunararibonye", "Kubona umwanditsi ugukorera", "Gutangaza igitabo ku buntu"],
    correct: 1
  }
};

// ============================================
// IBIMENYETSO BY'INDANGAMUNTU (BADGES)
// ============================================
const BADGE_DEFINITIONS = {
  FIRST_LESSON: { name: "Amahugurwa ya Mbere", description: "Warangije amahugurwa ya mbere", icon: <FaStar /> },
  FIVE_LESSONS: { name: "Amahugurwa 5", description: "Warangije amahugurwa 5", icon: <FaTrophy /> },
  TEN_LESSONS: { name: "Amahugurwa 10", description: "Warangije amahugurwa 10", icon: <FaAward /> },
  PERFECT_QUIZ: { name: "Ibibazo Byose", description: "Wakozemo ibibazo byose neza", icon: <FaCheckCircle /> },
  HUNDRED_POINTS: { name: "Amanota 100", description: "Wabonye amanota 100", icon: <FaGem /> },
  THREE_HUNDRED_POINTS: { name: "Amanota 200", description: "Wabonye amanota 200", icon: <FaCrown /> },
  MASTER_STORYTELLER: { name: "Umwanditsi mwiza", description: "Warangije amahugurwa yose", icon: <FaMedal /> }
};

// ============================================
// INKUNGA (WRITING TIPS) - IN KINYARWANDA
// ============================================
const WRITING_TIPS = [
  "Ntukabwire umusomyi uko ibintu bimeze, ahubwo ubyerekene. Aho kuvuga ngo 'yararakaye', garagaza uko yakomeje ibipfunsi, yahindutse mu maso cyangwa yazamuye ijwi.",
  
  "Jya usoma ibyo wanditse uranguruye ijwi. Iyo hari ahakugoye gusoma, akenshi ni ho hakenera gukosorwa.",
  
  "Mu nyandiko ya mbere, andika udafite ubwoba bwo gukora amakosa. Nyuma uzayisubiremo uyitunganye witonze.",
  
  "Buri gice cy'inkuru kigomba kugira umumaro, nko guteza inkuru imbere, guteza imbere umukinankuru cyangwa gukora byombi.",
  
  "Abanditsi beza bigira ku bandi, ariko abanditsi b'indashyikirwa bafata ibyo bize bakabihindura umwihariko wabo.",
  
  "Ntugaharanire ko inyandiko ya mbere iba itunganye. Icy'ingenzi ni ukuyirangiza, gutunganya bikaza nyuma.",
  
  "Jya ugendana agatabo cyangwa ukoreshe telefone wandikemo ibitekerezo. Ibitekerezo byiza bishobora kuza igihe icyo ari cyo cyose.",
  
  "Tangira wandike ibyo usanzwe uzi, ariko ujye ushaka no kwiga ibishya kugira ngo ubashe kwandika ibyo utari uzi.",
  
  "Ha buri mukinankuru intego cyangwa icyo ashaka kugeraho. Ni byo bituma ibikorwa bye bigira icyerekezo.",
  
  "Umwanditsi mwiza agerageza kumva no gusobanukirwa amarangamutima n'ubuzima bw'abandi.",
  
  "Ntutegereze guhumekerwa n'igitekerezo. Gira gahunda ihoraho yo kwandika, kuko ari yo ituma utera imbere.",
  
  "Niba inkuru ifite ikibazo, ntukihishe inyuma yo guhindura amagambo gusa. Kosora ikibazo kiri mu nkuru ubwayo.",
  
  "Buri mukinankuru yumva ari we muntu w'ingenzi mu buzima bwe. Jya ubyubaha igihe umwubaka.",
  
  "Koresha ibisobanuro bisobanutse kandi bifatika. Amagambo yihariye afasha umusomyi kubona ishusho nyayo y'ibiri kuba.",
  
  "Ha umusomyi amahirwe yo kwivumburira ibiri kuba. Ntumusobanurire buri kantu kose."
];

// ============================================
// AMAKOSA ARI KUNZE (COMMON MISTAKES) - IN KINYARWANDA
// ============================================
// ============================================
// AMAKOSA AKUNZE GUKORWA N'ABANDITSI
// ============================================
const COMMON_MISTAKES = [
  {
    mistake: "Kwibwira aho kwerekana",
    explanation: "Aho kuvuga uti 'Yari afite agahinda', erekana ibimenyetso byabyo. Urugero: 'Yacuritse umutwe, aceceka igihe kirekire, amarira atangira kumuzenga mu maso.'"
  },
  {
    mistake: "Gukoresha amagambo adafite umumaro",
    explanation: "Hitamo amagambo afite imbaraga. Aho kuvuga ngo 'Yirutse vuba cyane', andika ngo 'Yirukankanye imbaraga ze zose'."
  },
  {
    mistake: "Guhindagura icyerekezo cy'inkuru",
    explanation: "Irinde gusimbukira mu bitekerezo by'abakinankuru benshi mu gice kimwe. Kurikiza icyerekezo cy'umukinankuru umwe kugira ngo umusomyi atabitiranya."
  },
  {
    mistake: "Gusobanura buri kantu",
    explanation: "Ntusobanurire umusomyi ibintu byose. Muhe ibimenyetso bihagije, umureke na we yitekerereze ku bice bimwe by'inkuru."
  },
  {
    mistake: "Gutangiza inkuru mu buryo busanzwe",
    explanation: "Irinde gutangiza inkuru uvuga umuntu ukangutse cyangwa warose. Ahubwo tangira ahari igikorwa, ikibazo cyangwa ikintu gitera amatsiko."
  },
  {
    mistake: "Gukoresha imvugo imenyerewe cyane",
    explanation: "Shaka uburyo bushya bwo gusobanura ibintu aho gukoresha interuro zisanzwe zisomwa kenshi."
  },
  {
    mistake: "Gusuka amateka yose icyarimwe",
    explanation: "Amakuru y'ibyabaye mbere (background) uyatangire buhoro buhoro uko inkuru igenda itera imbere."
  },
  {
    mistake: "Gutuma abakinankuru bose bavuga kimwe",
    explanation: "Buri mukinankuru akwiye kugira imvugo ye, amagambo n'imiterere bimuranga."
  },
  {
    mistake: "Kwihutira kurangiza inkuru",
    explanation: "Ha amakimbirane n'impinduka z'abakinankuru umwanya uhagije mbere yo kugera ku musozo."
  }
];

// ============================================
// IMYITOZO YA BURI CYUMWERU
// ============================================
const WEEKLY_CHALLENGES = [
  "Andika inkuru y'amagambo nibura 500, aho ibiganiro hagati y'abavugwa babiri bahishura ibanga rikomeye.",
  "Andika igice cy'inkuru aho umuvugwa ahatirwa guhitamo hagati y'amahitamo abiri yose amugora.",
  "Andika inkuru y'amagambo 100 ivuga ubuhemu cyangwa ubugambanyi, utavuze ijambo 'ubugambanyi'.",
  "Hitamo inkuru usanzwe uzi, wongere uyandike uyibona mu maso y'umuntu ufatwa nk'umwanzi.",
  "Andika igice cy'inkuru aho umukinankuru avumbura icyumba cyangwa ahantu hihishe hafite ibanga rikomeye.",
  "Andika inkuru yose ibe mu gihe kigice kimwe gusa. ifite amagambo 1600",
  "Andika inkuru y'urukundo, ariko ugaragaze uko urwo rukundo ruhindura ubuzima bw'abakinankuru mu buryo butunguranye."
];

// ============================================
// MAIN COMPONENT
// ============================================
export default function Train() {
  const { t } = useI18n();

  // Soma username mu cookie ukoresheje js-cookie
  const userCookie = Cookies.get('user');
  let username = '';
  
  try {
    if (userCookie) {
      const user = JSON.parse(userCookie);
      username = user.username || '';
    }
  } catch (error) {
    console.error('Error parsing user cookie:', error);
  }

  const [training, setTraining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quizResults, setQuizResults] = useState({});
  const [activeTab, setActiveTab] = useState('lessons');

  // Load training data from Firestore
  useState(() => {
    const loadTraining = async () => {
      if (!username) {
        window.location.href = '/login';
        return;
      }

      try {
        const docRef = doc(db, 'training', username);
        const docSnap = await getDoc(docRef);

        let trainingData;
        if (docSnap.exists()) {
          trainingData = docSnap.data();
        } else {
          trainingData = {
            username,
            completedLessons: [],
            completedQuiz: [],
            score: 0,
            level: 'Beginner',
            badges: [],
            progress: 0,
            lastLesson: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(docRef, trainingData);
        }

        setTraining(trainingData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading training data:', error);
        setLoading(false);
      }
    };

    loadTraining();
  }, [username]);

  const [dailyTip] = useState(() => {
    const today = new Date().toDateString();
    const index = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return WRITING_TIPS[index % WRITING_TIPS.length];
  });

  const [weeklyChallenge] = useState(() => {
    const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    return WEEKLY_CHALLENGES[week % WEEKLY_CHALLENGES.length];
  });

  const [commonMistake] = useState(() => {
    const index = Math.floor(Math.random() * COMMON_MISTAKES.length);
    return COMMON_MISTAKES[index];
  });

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getLevel = (points) => {
    if (points < 50) return "Beginner";
    if (points < 150) return "Intermediate";
    if (points < 300) return "Semi Professional Author";
    return "Professional Author";
  };

  const getLevelColor = (level) => {
    switch(level) {
      case 'Beginner': return '#4CAF50';
      case 'Intermediate': return '#FFC107';
      case 'Semi Professional Author': return '#FF9800';
      case 'Professional Author': return '#9C27B0';
      default: return '#666';
    }
  };

  const calculateProgress = () => {
    if (!training) return 0;
    return Math.round((training.completedLessons.length / LESSONS.length) * 100);
  };

  const getBadge = (badgeId) => BADGE_DEFINITIONS[badgeId];

  const checkForBadges = async (trainingData) => {
    const newBadges = [];
    const currentBadges = trainingData.badges || [];

    if (trainingData.completedLessons.length >= 1 && !currentBadges.includes('FIRST_LESSON')) {
      newBadges.push('FIRST_LESSON');
    }
    if (trainingData.completedLessons.length >= 5 && !currentBadges.includes('FIVE_LESSONS')) {
      newBadges.push('FIVE_LESSONS');
    }
    if (trainingData.completedLessons.length >= 10 && !currentBadges.includes('TEN_LESSONS')) {
      newBadges.push('TEN_LESSONS');
    }
    if (trainingData.completedLessons.length === LESSONS.length && !currentBadges.includes('MASTER_STORYTELLER')) {
      newBadges.push('MASTER_STORYTELLER');
    }
    if (trainingData.score >= 100 && !currentBadges.includes('HUNDRED_POINTS')) {
      newBadges.push('HUNDRED_POINTS');
    }
    if (trainingData.score >= 300 && !currentBadges.includes('THREE_HUNDRED_POINTS')) {
      newBadges.push('THREE_HUNDRED_POINTS');
    }

    return newBadges;
  };

  // ============================================
  // FIRESTORE UPDATE FUNCTIONS
  // ============================================
  const updateFirestore = async (updates) => {
    if (!username) return;
    try {
      const docRef = doc(db, 'training', username);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating Firestore:', error);
    }
  };

  // ============================================
  // LESSON COMPLETION
  // ============================================
  const completeLesson = async (lessonId) => {
    if (!training || training.completedLessons.includes(lessonId)) return;

    const newCompleted = [...training.completedLessons, lessonId];
    const updates = {
      completedLessons: newCompleted,
      lastLesson: lessonId,
      progress: (newCompleted.length / LESSONS.length) * 100
    };

    setTraining(prev => ({ ...prev, ...updates }));
    await updateFirestore(updates);

    const newBadges = await checkForBadges({ ...training, ...updates });
    if (newBadges.length > 0) {
      setTraining(prev => ({ ...prev, badges: [...prev.badges, ...newBadges] }));
      await updateFirestore({ badges: [...training.badges, ...newBadges] });
    }
  };

  // ============================================
  // QUIZ HANDLING
  // ============================================
  const handleQuizAnswer = async (lessonId, answerIndex) => {
    if (!training || quizResults[lessonId]) return;
    
    const quiz = QUIZZES[lessonId];
    const isCorrect = answerIndex === quiz.correct;
    const points = isCorrect ? 10 : 0;

    if (training.completedQuiz.includes(lessonId)) return;

    setQuizResults(prev => ({ ...prev, [lessonId]: isCorrect }));

    const updates = {
      score: training.score + points,
      completedQuiz: [...training.completedQuiz, lessonId]
    };

    setTraining(prev => ({
      ...prev,
      score: prev.score + points,
      completedQuiz: [...prev.completedQuiz, lessonId]
    }));

    await updateFirestore(updates);

    const newBadges = await checkForBadges({ ...training, ...updates });
    if (newBadges.length > 0) {
      setTraining(prev => ({ ...prev, badges: [...prev.badges, ...newBadges] }));
      await updateFirestore({ badges: [...training.badges, ...newBadges] });
    }
  };

  // ============================================
  // RENDER COMPONENTS
  // ============================================
  const renderLesson = (lesson) => {
    if (!training) return null;
    
    const isCompleted = training.completedLessons.includes(lesson.id);
    const isQuizCompleted = training.completedQuiz.includes(lesson.id);
    const quizResult = quizResults[lesson.id];
    const quiz = QUIZZES[lesson.id];

    return (
      <div key={lesson.id} className={styles.lessonCard}>
        <div className={styles.lessonHeader}>
          <div className={styles.lessonTitleWrapper}>
            <span className={styles.lessonIcon}>{lesson.icon}</span>
            <div>
              <h3 className={styles.lessonTitle}>{lesson.title}</h3>
              <div className={styles.lessonMeta}>
                <span className={styles.category}>{lesson.category}</span>
                <span className={styles.difficulty}>{lesson.difficulty}</span>
                <span className={styles.readingTime}>{lesson.readingTime}</span>
              </div>
            </div>
          </div>
          {isCompleted && (
            <span className={styles.completedBadge}>
              <FaCheckCircle />{" "}{t("warangije iki gice")}</span>
          )}
        </div>

        <div className={styles.lessonContent}>
          <div className={styles.contentSection}>
            <p>{lesson.content}</p>
          </div>
          
          <div className={styles.contentSection}>
            <h4><FaBook />{" "}{t("Iby'ingenzi")}</h4>
            <p>{lesson.summary}</p>
          </div>

          <div className={styles.contentSection}>
            <h4><FaPenFancy />{" "}{t("Ibyo gukora")}</h4>
            <p>{lesson.exercise}</p>
          </div>

          {/* Quiz */}
          {quiz && !isQuizCompleted && (
            <div className={styles.quizSection}>
              <h4><FaBrain />{" "}{t("Ibibazo")}</h4>
              <p className={styles.quizQuestion}>{quiz.question}</p>
              <div className={styles.quizOptions}>
                {quiz.options.map((option, index) => (
                  <button
                    key={index}
                    className={`${styles.quizOption} ${quizResult !== undefined ? (index === quiz.correct ? styles.correct : styles.incorrect) : ''}`}
                    onClick={() => handleQuizAnswer(lesson.id, index)}
                    disabled={quizResult !== undefined}
                  >
                    {quizResult !== undefined && index === quiz.correct && <FaCheckCircle className={styles.quizIcon} />}
                    {quizResult !== undefined && index !== quiz.correct && quizResult === false && <FaTimesCircle className={styles.quizIcon} />}
                    {option}
                  </button>
                ))}
              </div>
              {quizResult !== undefined && (
                <div className={quizResult ? styles.quizCorrect : styles.quizIncorrect}>
                  {quizResult ? (
                    <><FaCheckCircle />{" "}{t("Byakunze! +10 amanota")}</>
                  ) : (
                    <><FaTimesCircle />{" "}{t("Ntibyakunze. Amanota 0")}</>
                  )}
                </div>
              )}
            </div>
          )}

          {isQuizCompleted && (
            <div className={styles.quizCompleted}>
              <FaCheckCircle />{" "}{t("Ibibazo byarangiye")}</div>
          )}

          <button
            className={`${styles.completeButton} ${isCompleted ? styles.completed : ''}`}
            onClick={() => completeLesson(lesson.id)}
            disabled={isCompleted}
          >
            {isCompleted ? (
              <><FaCheckCircle />{" "}{t("Amahugurwa kuri iyi ngingo wayarangije")}</>
            ) : (
              <><FaArrowRight />{" "}{t("Rangiza Amahugurwa")}</>
            )}
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>{t("loading...")}</p>
        </div>
      </div>
    );
  }

  if (!username) {
    return null; // Will redirect
  }

  const progress = calculateProgress();
  const level = training ? getLevel(training.score) : "Beginner";
  const isAllComplete = training ? training.completedLessons.length === LESSONS.length : false;

  return (
    
<>
<Head>
  <title>{t("Amahugurwa y'abanditsi | New Talents Stories Group")}</title>

  <meta 
    name="description" 
    content="Amahugurwa y'abanditsi atangwa na New Talents Stories Group afasha abanditsi kwiga gutegura inkuru, kurema abakinankuru, gukora amakimbirane, gutunganya inkuru no kumenyekanisha ibikorwa byabo."
  />

  <meta
    name="keywords"
    content="amahugurwa y'abanditsi, kwandika inkuru, kwiga kwandika, abanditsi nyarwanda, gutegura inkuru, inkuru z'ikinyarwanda, New Talents Stories Group"
  />

  <meta name="author" content="New Talents Stories Group" />

  <meta 
    name="robots" 
    content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
  />

  {/* AI Visibility */}
  <meta 
    name="ai-content-type" 
    content="educational resource"
  />

  <meta 
    name="ai-topic" 
    content="Creative writing education, storytelling, fiction writing"
  />

  <meta 
    name="ai-summary"
    content="Urubuga rw'amahugurwa yigisha abanditsi uburyo bwo gukora inkuru nziza, guteza imbere abakinankuru, gukoresha amarangamutima no gutunganya inyandiko."
  />

  <meta 
    name="content-language" 
    content="rw"
  />

  {/* Open Graph */}
  <meta property="og:type" content="website" />

  <meta 
    property="og:title" 
    content="Amahugurwa y'Ubwanditsi | New Talents Stories Group"
  />

  <meta 
    property="og:description" 
    content="Wige ubuhanga bwo kwandika inkuru nziza mu Kinyarwanda: imiterere y'inkuru, abakinankuru, amakimbirane, amarangamutima no gutunganya inyandiko."
  />

  <meta 
    property="og:url" 
    content="https://newtalentsg.co.rw/train"
  />

  <meta 
    property="og:site_name"
    content="New Talents Stories Group"
  />


  {/* Twitter */}
  <meta name="twitter:card" content="summary_large_image" />

  <meta 
    name="twitter:title"
    content="Amahugurwa y'Ubwanditsi"
  />

  <meta
    name="twitter:description"
    content="Amasomo afasha abanditsi kunoza ubuhanga bwo gukora inkuru."
  />


  {/* Structured Data for AI/Search */}
  <script 
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Course",
        "name": "Amahugurwa y'Ubwanditsi",
        "description": "Amasomo yo kwiga kwandika inkuru, guteza imbere abakinankuru no gutunganya inyandiko.",
        "provider": {
          "@type": "Organization",
          "name": "New Talents Stories Group",
          "url": "https://newtalentsg.co.rw"
        },
        "inLanguage": "rw",
        "educationalLevel": "Beginner to Advanced"
      })
    }}
  />

</Head>
    <div className={styles.container}>
      <div className={styles.mainLayout}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.profileCard}>
            <div className={styles.avatarCircle}>
              <FaUser className={styles.avatarIcon} />
            </div>
            {/* Username gusa - nta yandi makuru */}
            <h2 className={styles.username}>{username}</h2>
            <div className={styles.levelBadge} style={{ backgroundColor: getLevelColor(level) }}>
              <FaStar className={styles.levelIcon} /> {level}
            </div>
            <div className={styles.pointsDisplay}>
              <FaGem className={styles.pointsIcon} />
              <span className={styles.pointsValue}>{training?.score || 0}{" "}{t("amanota")}</span>
            </div>
          </div>

          <div className={styles.progressCard}>
            <div className={styles.progressHeader}>
              <span><FaBook />{" "}{t("Iterambere")}</span>
              <span>{progress}%</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <div className={styles.progressStats}>
              <span>{training?.completedLessons?.length || 0}{" "}{t("/ {length} amahugurwa", { length: LESSONS.length })}</span>
              <span>{LESSONS.length - (training?.completedLessons?.length || 0)}{" "}{t("asigaye")}</span>
            </div>
          </div>

          {/* Badges */}
          <div className={styles.badgesCard}>
            <h4><FaAward />{" "}{t("certificate")}</h4>
            <div className={styles.badgesGrid}>
              {training?.badges && training.badges.length > 0 ? (
                training.badges.map(badgeId => {
                  const badge = getBadge(badgeId);
                  return badge ? (
                    <div key={badgeId} className={styles.badgeItem} title={badge.description}>
                      <span className={styles.badgeIcon}>{badge.icon}</span>
                      <span className={styles.badgeName}>{badge.name}</span>
                    </div>
                  ) : null;
                })
              ) : (
                <p className={styles.noBadges}>{t("Rangiza amahugurwa kugira ngo ubone certificate!")}</p>
              )}
            </div>
          </div>

          {/* Daily Tip */}
          <div className={styles.tipCard}>
            <h4><FaLightbulb />{" "}{t("Inama k'umwanditsi")}</h4>
            <p>{dailyTip}</p>
          </div>

          {/* Common Mistake */}
          <div className={styles.mistakeCard}>
            <h4><FaExclamationTriangle />{" "}{t("Amakosa abanditsi bakora")}</h4>
            <p className={styles.mistakeTitle}>{commonMistake.mistake}</p>
            <p className={styles.mistakeExplanation}>{commonMistake.explanation}</p>
          </div>

          {/* Weekly Challenge */}
          <div className={styles.challengeCard}>
            <h4><FaCalendarAlt />{" "}{t("Icyo ukwiye gukora iki cyumweru")}</h4>
            <p>{weeklyChallenge}</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className={styles.mainContent}>
          <header className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>
              <FaGraduationCap />{" "}{t("Amahungurwa y'Abanditsi")}</h1>
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'lessons' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('lessons')}
              >
                <FaBook />{" "}{t("Amahugurwa")}</button>
              <button
                className={`${styles.tab} ${activeTab === 'certificate' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('certificate')}
              >
                <FaCertificate />{" "}{t("certificates")}</button>
            </div>
          </header>

          {activeTab === 'lessons' && (
            <div className={styles.lessonsList}>
              {LESSONS.map(lesson => renderLesson(lesson))}
            </div>
          )}

          {activeTab === 'certificate' && isAllComplete && (
            <div className={styles.certificateCard}>
              <div className={styles.certificateContent}>
                <FaCertificate className={styles.certificateIcon} />
                <h2>{t("CERTIFICATE")}</h2>
                <p>{t("Iyi certificate igaragaza ko")}</p>
                <h3>{username}</h3>
                <p>{t("yarangije amahugurwa yose {length} yakoreye kuri new talents stories group, kandi yemerewe kwandika inkuru kuko yavamo", { length: LESSONS.length })}</p>
                <h4>{t("Umwanditsi mwiza")}</h4>
                <p>{t("afite amanota")}{" "}{training?.score || 0}</p>
                <div className={styles.certificateBadges}>
                  {training?.badges?.map(badgeId => {
                    const badge = getBadge(badgeId);
                    return badge ? (
                      <span key={badgeId} className={styles.certificateBadge}>
                        {badge.icon} {badge.name}
                      </span>
                    ) : null;
                  })}
                </div>
                <p className={styles.certificateDate}>{t("Yatanzwe ku")}{" "}{new Date(training?.updatedAt || Date.now()).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'certificate' && !isAllComplete && (
            <div className={styles.certificateCard}>
              <div className={styles.certificateContent}>
                <FaCertificate className={styles.certificateIcon} />
                <h2>{t("CERTIFICATE")}</h2>
                <p>{t("Rangiza amahugurwa yose {length} kugira ngo ubone certificate!", { length: LESSONS.length })}</p>
                <p className={styles.certificateProgress}>
                  {training?.completedLessons?.length || 0}{" "}{t("/ {length} amahugurwa yarangiye", { length: LESSONS.length })}</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
            </>
  );
}
