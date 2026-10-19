import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

import { db } from "./firebase";
import { finalScore } from "./Similarity";

// ===== FAQ DATA (Hardcoded for performance) =====
const FAQ_DATA = [
  {
    question: "NewTalentsG niki?",
    answer: "NewTalentsG ni urubuga rwo gusoma no gusohora inkuru z'ikinyarwanda. Uru rubuga ruha abasomyi uburyo bwo gusoma inkuru z'ubwoko bwose, mu buryo bworoshye kandi bwigenga."
  },
  {
    question: "Ni gute nshobora gutangira gusoma kuri NewTalentsG?",
    answer: "Kugira ngo utangire gusoma kuri NewTalentsG, ugomba gukora konti, hanyuma uhitamo inkuru ushaka gusoma. Ushobora gusoma inkuru z'ubuntu cyangwa gukoresha NES kugira ngo usome Premium Stories."
  },
  {
    question: "NeS ni iki kandi ikoreshwa iki?",
    answer: "NES ni ifaranga ry'imigambi rya NewTalentsG. Rifasha abasomyi kwishyura inkuru zishyurwa (Premium Stories) no guhemba abanditsi. NES irashobora kuboneka binyuze mu kwishyura cyangwa ibikorwa bitandukanye ku rubuga."
  },
  {
    question: "Ni izihe nkuru nshobora gusoma kuri NewTalentsG?",
    answer: "NewTalentsG ifite inkuru z'ubwoko bwinshi harimo: inkuru ndende z'urukundo, inkuru z'ubwenge, inkuru z'ibanga, inkuru z'ubwoba, inkuru z'amateka, inkuru z'ubuzima, inkuru z'ibyaha, n'izindi nyinshi. Buri kwezi habonekamo inkuru nshya."
  },
  {
    question: "Mbese gusoma kuri NewTalentsG birahenze?",
    answer: "Gusoma inkuru z'ubuntu kuri NewTalentsG ni ubuntu. Ariko, iyo ushaka gusoma Premium Stories (inkuru zishyurwa), ugomba kwishyura ukoresheje NES. NES irashobora kuboneka mu buryo butandukanye."
  },
  {
    question: "Ni gute nshobora kubona NES?",
    answer: "NES irashobora kuboneka binyuze mu kwishyura, mu bihembo by'urubuga, cyangwa mu bikorwa bitandukanye nko gusangira inkuru, gusubiramo inkuru, no kwitabira ibikorwa by'urubuga."
  },
  {
    question: "Premium Stories ni iki?",
    answer: "Premium Stories ni inkuru zishyurwa zisabwa umusomyi kwishyura mbere yo kuzisoma. Izi nkuru zanditswe n'abanditsi bahabwa umugabane w'amafaranga yinjijwe. Premium Stories zifite ubwiza bwihariye."
  },
  {
    question: "Ni gute nshobora kubika inkuru nkunda?",
    answer: "Ushobora kubika inkuru ukoresheje feature ya Bookmark. Iyi feature ifasha kubika inkuru ushaka gusoma nyuma, no gukurikira inkuru ukunda."
  },
  {
    question: "Continue Reading ni iki?",
    answer: "Continue Reading ni feature igufasha gusubira aho wari uhariye mu nkuru wasomaga. Iyi feature ikora neza ku bikonoshwa byose, ikagufasha kutazimira aho wari uhariye."
  },
  {
    question: "Community ni iki?",
    answer: "Community ni itsinda ry'abasomyi n'abanditsi bakorana ku rubuga. Ushobora gusangira ibitekerezo, gusubiramo inkuru, no kugirana ibiganiro n'abandi basomyi n'abanditsi."
  },
  {
    question: "Ni gute nshobora gusangiza inkuru?",
    answer: "Ushobora gusangira inkuru binyuze mu button ya Share. Ushobora kuyisangira kuri WhatsApp, Twitter, Facebook, cyangwa binyuze mu link."
  },
  {
    question: "Iyo nanze comment ku nkuru, byamfasha iki?",
    answer: "Iyo utanze comment, ufasha umwanditsi kumenya ibyo abasomyi batekereza. Ibi bituma umwanditsi yandika inkuru nziza kurushaho, kandi ushobora no gutsindira ibihembo by'urubuga."
  },
  {
    question: "Membership ni iki?",
    answer: "Membership ni gahunda yihariye iha abasomyi uburyo bwo kubona ibinyaburanga byihariye, nko gusoma Premium Stories ku giciro gito, kubona bonus, no kwitabira ibikorwa by'urubuga."
  },
  {
    question: "Author Profiles ni iki?",
    answer: "Author Profiles ni pages z'abanditsi. Ushobora kureba inkuru zanditswe n'umwanditsi runaka, amakuru ye, no gukurikira inkuru ze nshya."
  },
  {
    question: "Episode zikomeza ni iki?",
    answer: "Episode zikomeza ni inkuru zisohoka buri gihe mu bice. Ibi bishobora kuba inkuru ndende zisohoka buri cyumweru cyangwa buri kwezi, zikomeza amateka y'inkuru."
  },
  {
    question: "Notifications ni iki?",
    answer: "Notifications ni ubutumwa bwo kumenya iyo habonetse inkuru nshya, iyo hari episode nshya y'inkuru ukurikira, cyangwa iyo hari ibintu bishya ku rubuga."
  },
  {
    question: "Ratings ni iki?",
    answer: "Ratings ni uburyo abasomyi bashyira amanota ku nkuru. Ibi bifasha abandi basomyi kumenya inkuru nziza, kandi bifasha abanditsi kumenya ibyo bakora neza."
  },
  {
    question: "Comments ni iki?",
    answer: "Comments ni uburyo abasomyi bashobora gusubiza ku nkuru, gusangira ibitekerezo, no kugirana ibiganiro n'abandi basomyi n'abanditsi."
  },
  {
    question: "Mbese nshobora gusoma inkuru nta interineti?",
    answer: "Kugira ngo usome inkuru kuri NewTalentsG, ugomba kuba ufite interineti. Ariko, ushobora kubika inkuru ukoresheje feature ya Offline Reading, ikagufasha gusoma nta interineti."
  },
  {
    question: "story reading experience ni iki?",
    answer: "Story reading experience ni uburyo NewTalentsG yubatswe kugira ngo gusoma inkuru bibe byoroshye kandi bishimishije. Ibi birimo: font nziza, spacing nziza, dark mode, no responsive design."
  },
  {
    question: "Uko umwanditsi yinjiza amafaranga?",
    answer: "Umwanditsi yinjiza amafaranga binyuze mu nzira zitandukanye: Premium Stories (inkuru zishyurwa), views z'inkuru, bonus buri kwezi, ndetse no muri Revenue Sharing. Umwanditsi yinjiza amafaranga bitewe n'uko inkuru ze zisomwa ndetse n'ubwiza bwazo."
  },
  {
    question: "Ni iyihe gahunda y'ishyurwa ry'amafaranga ikoreshwa?",
    answer: "NewTalentsG ikoresha gahunda ya Revenue Sharing n'ishyurwa ry'amafaranga akurikije views. Umwanditsi yinjiza amafaranga akurikije umubare w'abasomyi b'inkuru ze ndetse n'umugabane w'amafaranga yinjijwe kuri Premium Stories."
  },
  {
    question: "Na amafaranga angahe umwanditsi yinjiza ku nkuru igize views 500?",
    answer: "Ku nkuru isomwa 500 views, umwanditsi yinjiza amafaranga angana na 100 NES. Iyo inkuru ibonye views nyinshi, umwanditsi yinjiza amafaranga menshi, akagera ku 800 NES ku nkuru zisomwa 10,000+ views."
  },
  {
    question: "Ni iyihe bonus umwanditsi ashobora kwitega buri kwezi?",
    answer: "Umwanditsi yinjiza amafaranga ya bonus akurikije imikorere ye. Bonus iri hagati ya 500-2,000 NES buri kwezi, ishingiye ku bwiza bw'inkuru, umubare w'abasomyi, n'uruhare rw'umwanditsi mu guteza imbere urubuga."
  },
  {
    question: "Ni iyihe gahunda yo kwishyura umwanditsi ikoreshwa?",
    answer: "NewTalentsG ikoresha uburyo butandukanye bwo kwishyura umwanditsi: binyuze mu NES, Mobile Money, bank, cyangwa uburyo bw'ikoranabuhanga. Umwanditsi yinjiza amafaranga akurikije amabwiriza ya gahunda ya Monetization."
  },
  {
    question: "Ni iki Revenue Sharing kandi ikora iki?",
    answer: "Revenue Sharing ni gahunda umwanditsi yinjiza amafaranga akurikije umugabane w'inyungu z'urubuga. Abanditsi bakomeye bahabwa umugabane munini, kandi biyubaha hakurikijwe amabwiriza ya gahunda."
  },
  {
    question: "Ni gute mba umwanditsi kuri NewTalentsG?",
    answer:
      "Fungura konti, winjire ku rubuga hanyuma utangire wandike inkuru yawe. Iyo wujuje ibisabwa, ushobora gusaba kwemererwa kwinjiza amafaranga ku nkuru zawe."
  },
  {
    question: "Ese kwandika inkuru ni ubuntu?",
    answer:
      "Yego. Kwandika no gusohora inkuru kuri NewTalentsG ni ubuntu. Ariko kugira ngo utangire kwinjiza amafaranga, ushobora gusabwa kubanza kwemererwa muri gahunda ya Monetization."
  },
  {
    question: "Monetization ni iki?",
    answer:
      "Monetization ni gahunda ifasha umwanditsi kwinjiza amafaranga cyangwa NES bitewe n'imikorere y'inkuru ze n'amabwiriza ya NewTalentsG."
  },
  {
    question: "Ni gute nasaba Monetization?",
    answer:
      "Jya ku rubuga rwawe nk'umwanditsi cyangwa ahandi habugenewe usabe Monetization. Ubuyobozi buzagenzura niba wujuje ibisabwa mbere yo kubyemeza."
  },
  {
    question: "Ese abanditsi bose binjiza amafaranga?",
    answer:
      "Oya. Abanditsi bemerewe muri gahunda ya Monetization ni bo bemerewe kwinjiza amafaranga cyangwa NES hakurikijwe amabwiriza y'urubuga."
  },
  {
    question: "Revenue Sharing ni iki?",
    answer:
      "Revenue Sharing ni uburyo bwo kugabana amafaranga yinjijwe n'inkuru zishyurwa hagati y'urubuga n'umwanditsi hakurikijwe amabwiriza ya NewTalentsG."
  },
  {
    question: "Ni gute mbona amafaranga nanditse inkuru?",
    answer:
      "Iyo inkuru yawe iri muri gahunda ya Monetization kandi igasomwa cyangwa ikishyurirwa hakurikijwe amabwiriza y'urubuga, ubona amafaranga cyangwa NES bijyanye n'inyungu yinjijwe."
  },
  {
    question: "Ni gute mbona Bonus?",
    answer:
      "Bonus ishobora guhabwa abanditsi bagaragaje umusaruro mwiza cyangwa bujuje ibisabwa n'urubuga. Itangwa hakurikijwe amabwiriza ya NewTalentsG."
  },
  {
    question: "Views ni iki?",
    answer:
      "Views ni umubare w'abantu basomye inkuru yawe. Ushobora gukoreshwa mu gupima uburyo inkuru yakunzwe."
  },
  {
    question: "Ese views zonyine zituma mbona amafaranga?",
    answer:
      "Oya. Amafaranga cyangwa NES bitangwa hakurikijwe amabwiriza ya gahunda ya Monetization, ntabwo views zonyine zihagije."
  },
  {
    question: "Ni gute nongerera inkuru yanjye abasomyi?",
    answer:
      "Andika inkuru ifite ireme, usohore episodes ku gihe, usangize abandi link y'inkuru kandi usubize ibitekerezo by'abasomyi."
  },
  {
    question: "Ni ubuhe bwoko bw'inkuru bwemerwa?",
    answer:
      "Inkuru zigomba kubahiriza amategeko y'urubuga. Ntizemerewe gukangurira urwango, urugomo, ibikorwa bitemewe cyangwa kurenga ku burenganzira bw'abandi."
  },
  {
    question: "Ese nshobora guhindura inkuru maze nayisohoye?",
    answer:
      "Yego. Ushobora guhindura inkuru yawe igihe bikenewe, igihe cyose ibyo bidahabanye n'amabwiriza y'urubuga."
  },
  {
    question: "Ese nshobora gusiba inkuru yanjye?",
    answer:
      "Yego, niba amategeko y'urubuga abyemera. Hari igihe bishobora gusaba uburenganzira bw'ubuyobozi bitewe n'imiterere y'inkuru."
  },
  {
    question: "Copyright ni iki?",
    answer:
      "Copyright ni uburenganzira bw'umwanditsi ku murimo we. Birabujijwe kwiba, gukoporora cyangwa gusakaza inkuru y'undi nta ruhushya."
  },
  {
    question: "Ese nshobora gusohora inkuru yanditswe n'undi muntu?",
    answer:
      "Oya, keretse ufite uruhushya rw'umwanditsi cyangwa uburenganzira bwemewe n'amategeko."
  },
  {
    question: "Ni gute natanga report ku nkuru?",
    answer:
      "Niba ubona inkuru irimo amakosa cyangwa irenga ku mategeko y'urubuga, koresha uburyo bwa Report kugira ngo ubuyobozi buyisuzume."
  },
  {
    question: "Ni gute natanga igitekerezo ku rubuga?",
    answer:
      "Ushobora kohereza igitekerezo cyawe ukoresheje uburyo bwo kuvugana n'ubuyobozi cyangwa ugakoresha Contact page."
  },
  {
    question: "Ni gute navugana n'ubuyobozi?",
    answer:
      "Jya kuri Contact cyangwa Support page ku rubuga maze wohereze ubutumwa bwawe."
  },
  {
    question: "Support ni iki?",
    answer:
      "Support ni serivisi ifasha abakoresha gukemura ibibazo bahura na byo igihe bakoresha NewTalentsG."
  },
  {
    question: "Ese nshobora guhindura username yanjye?",
    answer:
      "Biterwa n'amabwiriza ya NewTalentsG. Hari igihe username ishobora kudahindurwa nyuma yo gukora konti."
  },
  {
    question: "Ni gute mpindura ifoto ya profile?",
    answer:
      "Jya kuri Profile yawe uhitemo uburyo bwo guhindura ifoto, maze ushyireho ifoto nshya."
  },
  {
    question: "Ese nshobora kugira inkuru nyinshi icyarimwe?",
    answer:
      "Yego. Umwanditsi ashobora kwandika no gusohora inkuru nyinshi igihe zose zubahiriza amategeko y'urubuga."
  },
  {
    question: "Ni gute nkomeza abasomyi banjye?",
    answer:
      "Sohora episodes ku gihe, andike inkuru zifite ireme kandi ujye usabana n'abasomyi binyuze mu bitekerezo (comments)."
  },
  {
    question: "Kuki inkuru yanjye itagaragara mu bushakashatsi?",
    answer:
      "Birashoboka ko itarakorerwa indexing, itarasohoka neza cyangwa idahuye n'ijambo washakishije. Tegereza gato cyangwa ugenzure niba yarasohotse neza."
  },
  {
    question: "Membership ni iki?",
    answer:
      "Membership ni gahunda iha umunyamuryango inyungu zinyuranye hakurikijwe urwego rw'ubunyamuryango afite. Izo nyungu zishobora kuba zirimo kugabanyirizwa ibiciro, kubona bonus cyangwa izindi serivisi zihariye."
  },
  {
    question: "Ni gute mba umunyamuryango (Member)?",
    answer:
      "Jya ku rupapuro rwa Membership ukurikize amabwiriza agaragara ku rubuga kugira ngo usabe cyangwa ugure ubunyamuryango."
  },
  {
    question: "Ni izihe nyungu za Membership?",
    answer:
      "Inyungu ziterwa n'ubwoko bwa Membership ufite. Zishobora kubamo kugabanyirizwa ibiciro, bonus, kubona amakuru mbere y'abandi cyangwa izindi serivisi zihariye."
  },
  {
    question: "Ese Membership irarangira?",
    answer:
      "Yego. Hari ubwoko bwa Membership bugira igihe bumara. Iyo kirangiye ushobora kubusubizamo ukurikije amabwiriza y'urubuga."
  },
  {
    question: "Ni gute ngura NES?",
    answer:
      "Jya ku rupapuro rwo kongeraho NES, uhitemo amafaranga ushaka kongeraho hanyuma ukurikize amabwiriza yo kwishyura."
  },
  {
    question: "Ni ubuhe buryo bwo kwishyura bwemewe?",
    answer:
      "Uburyo bwo kwishyura bugaragara ku rubuga. Bushobora kuba burimo Mobile Money cyangwa ubundi buryo bwemewe na NewTalentsG."
  },
  {
    question: "Nishyuye ariko NES ntizagera kuri konti yanjye. Nkore iki?",
    answer:
      "Banza utegereze iminota mike. Niba ikibazo gikomeje, hamagara ubufasha bw'urubuga ugaragaze amakuru y'ubwishyu wakoze."
  },
  {
    question: "Ese amafaranga nishyura arasubizwa?",
    answer:
      "Gusubizwa amafaranga biterwa n'impamvu y'ikibazo n'amabwiriza ya NewTalentsG."
  },
  {
    question: "Ni gute ndeba umubare wa NES mfite?",
    answer:
      "Injira muri konti yawe urebe ahagaragara amakuru ya konti cyangwa Dashboard yawe."
  },
  {
    question: "Ni gute ndeba amateka y'ubwishyu nakoze?",
    answer:
      "Amateka y'ubwishyu agaragara muri konti yawe niba urubuga rubishyigikira."
  },
  {
    question: "Ese nshobora kohereza NES ku wundi muntu?",
    answer:
      "Ibyo biterwa n'imiterere ya serivisi ya NewTalentsG. Niba bishyigikiwe, amabwiriza azaboneka ku rubuga."
  },
  {
    question: "Ni gute mbona inkuru zigezweho?",
    answer:
      "Jya ku rupapuro rw'inkuru nshya cyangwa ukoreshe uburyo bwo gushakisha kugira ngo ubone inkuru ziheruka gusohoka."
  },
  {
    question: "Ni gute mbona inkuru zikunzwe cyane?",
    answer:
      "Jya ku gice cy'inkuru zikunzwe cyangwa izifite amanota menshi."
  },
  {
    question: "Ni gute mbona inkuru z'umwanditsi runaka?",
    answer:
      "Fungura profile y'uwo mwanditsi cyangwa ushakishe izina rye."
  },
  {
    question: "Author Profile ni iki?",
    answer:
      "Author Profile ni urupapuro rwerekana amakuru y'umwanditsi n'urutonde rw'inkuru ze."
  },
  {
    question: "Ni gute nkurikira umwanditsi?",
    answer:
      "Niba urubuga rubishyigikira, jya kuri profile ye ukande Follow cyangwa uburyo bungana na bwo."
  },
  {
    question: "Ni gute ndeba inkuru nabitse?",
    answer:
      "Jya mu gice cya Bookmark cyangwa Library yawe urebe inkuru wabitse."
  },
  {
    question: "Library ni iki?",
    answer:
      "Library ni ahabikwa inkuru wabitse cyangwa ibyo uri gusoma kugira ngo ubisange vuba."
  },
  {
    question: "Ni gute nsiba inkuru muri Bookmark?",
    answer:
      "Fungura Bookmark yawe uhitemo inkuru ushaka gukuramo, hanyuma ukande uburyo bwo kuyivanamo."
  },
  {
    question: "Ese nshobora gusoma inkuru nkiri offline?",
    answer:
      "Biterwa n'uburyo urubuga rubikora. Niba Offline Reading ishoboka, ushobora kubanza kubika inkuru mbere yo kubura internet."
  },
  {
    question: "Ni iki Offline Reading?",
    answer:
      "Offline Reading ni uburyo bwo gusoma inkuru wabanje kubika n'ubwo internet yaba itaboneka."
  },
  {
    question: "Ni gute nsubira aho nari ngeze nsoma?",
    answer:
      "Koresha Continue Reading. Izagusubiza ku gice wari ugezeho."
  },
  {
    question: "Ese nshobora gukoresha NewTalentsG kuri mudasobwa?",
    answer:
      "Yego. NewTalentsG ikora neza kuri mudasobwa, telefoni na tablet."
  },
  {
    question: "Ese NewTalentsG ikora amasaha yose?",
    answer:
      "Yego. Urubuga rugerageza gukora amasaha 24 kuri 24, keretse habaye ibikorwa byo kuruvugurura cyangwa ibibazo bya tekiniki."
  },
  {
    question: "Ni gute menya amakuru mashya ya NewTalentsG?",
    answer:
      "Kurikirana Notifications, Blog cyangwa imbuga nkoranyambaga za NewTalentsG kugira ngo uhore umenya ibishya."
      },
  {
    question: "Net AI ni iki?",
    answer:
      "Net AI ni umufasha w'ikoranabuhanga wa NewTalentsG ugufasha kubona ibisubizo ku bibazo byawe, gushaka inkuru, kumenya uko urubuga rukora no kubona ubufasha bwihuse."
  },
  {
    question: "Net AI ishobora kunkorera iki?",
    answer:
      "Net AI ishobora kugufasha gushaka inkuru, gusobanura serivisi za NewTalentsG, kukwereka uburyo bwo gukoresha urubuga no kugusubiza ibibazo bikunze kubazwa."
  },
  {
    question: "Ni gute nshakira inkuru muri Net AI?",
    answer:
      "Andika izina ry'inkuru cyangwa ukoreshe itegeko #inkuru ukurikiyeho izina ry'inkuru ushaka. Net AI izagerageza kukwereka inkuru zihuye n'icyo washatse."
  },
  {
    question: "Ese Net AI ihora itanga ibisubizo nyabyo?",
    answer:
      "Net AI ikoresha amakuru ari kuri NewTalentsG kugira ngo igusubize. Nubwo iharanira gutanga ibisubizo nyabyo, hari igihe ushobora gusabwa kugenzura amakuru ku rupapuro bireba."
  },
  {
    question: "Ni gute mpindura email yanjye?",
    answer:
      "Niba urubuga rubyemera, jya muri Profile cyangwa Account Settings uhindure email yawe ukurikije amabwiriza agaragara."
  },
  {
    question: "Ni gute mpindura password?",
    answer:
      "Jya muri Account Settings uhitemo uburyo bwo guhindura password maze ushyireho ijambo ry'ibanga rishya kandi rikomeye."
  },
  {
    question: "Ni gute ndinda konti yanjye?",
    answer:
      "Koresha password ikomeye, ntuyiha undi muntu kandi ujye usohoka muri konti yawe igihe ukoresheje igikoresho kitari icyawe."
  },
  {
    question: "Konti yanjye yanze kwinjira. Nkore iki?",
    answer:
      "Reba niba username cyangwa email na password wanditse ari byo. Niba ikibazo gikomeje, koresha uburyo bwo gusubizaho password cyangwa uvugishe ubufasha."
  },
  {
    question: "Kuki konti yanjye yafunzwe?",
    answer:
      "Konti ishobora gufungwa igihe habaye ukurenga ku mabwiriza ya NewTalentsG cyangwa habonetse ibikorwa biteye impungenge. Ushobora kuvugana n'ubuyobozi kugira ngo ubimenye neza."
  },
  {
    question: "Ni gute nsiba konti yanjye burundu?",
    answer:
      "Niba ushaka gusiba konti yawe, kurikiza amabwiriza agaragara muri Account Settings cyangwa uvugishe ubuyobozi bw'urubuga."
  },
  {
    question: "Ese amakuru yanjye asangizwa abandi?",
    answer:
      "NewTalentsG yubahiriza ubuzima bwite bw'abakoresha. Amakuru yawe akoreshwa hakurikijwe amategeko n'amabwiriza ya Privacy Policy."
  },
  {
    question: "Privacy Policy ni iki?",
    answer:
      "Privacy Policy ni amabwiriza asobanura uburyo NewTalentsG ikusanya, ibika kandi ikoresha amakuru y'abakoresha."
  },
  {
    question: "Terms of Use ni iki?",
    answer:
      "Terms of Use ni amategeko n'amabwiriza agenga ikoreshwa rya NewTalentsG. Buri mukoresha agomba kuyubahiriza."
  },
  {
    question: "Ni gute natanga ikibazo cyangwa igitekerezo?",
    answer:
      "Ushobora kohereza ubutumwa ukoresheje Contact cyangwa Support page kugira ngo ubuyobozi bukugoboke."
  },
  {
    question: "Ni gute natanga report ku mukoresha?",
    answer:
      "Niba hari umukoresha urenga ku mabwiriza y'urubuga, koresha uburyo bwa Report maze usobanure ikibazo wabonye."
  },
  {
    question: "Ni gute natanga report ku gitekerezo (comment)?",
    answer:
      "Koresha uburyo bwa Report buri kuri comment bireba kugira ngo ubuyobozi buyisuzume."
  },
  {
    question: "Kuki page yanze gufunguka?",
    answer:
      "Ibi bishobora guterwa n'ikibazo cya internet, server cyangwa page yakuweho. Ongera ugerageze nyuma cyangwa uvugishe ubufasha."
  },
  {
    question: "Kuki inkuru itaboneka?",
    answer:
      "Inkuru ishobora kuba itarasohoka, yarasibwe cyangwa yarimuwe. Ushobora kongera kuyishakisha cyangwa ukavugisha ubuyobozi."
  },
  {
    question: "Ni gute nshakisha umwanditsi?",
    answer:
      "Koresha Search wandike izina ry'umwanditsi ushaka maze urebe ibisubizo."
  },
  {
    question: "Ni gute nshakisha inkuru z'urukundo?",
    answer:
      "Andika amagambo nka 'inkuru z'urukundo' cyangwa ukoreshe Categories kugira ngo ubone izo nkuru."
  },
  {
    question: "Ni gute nshakisha inkuru z'ubwoba?",
    answer:
      "Koresha Search cyangwa Categories uhitemo inkuru z'ubwoba."
  },
  {
    question: "Ni gute nshakisha inkuru z'amateka?",
    answer:
      "Andika 'inkuru z'amateka' mu ishakiro cyangwa urebere mu byiciro by'inkuru."
  },
  {
    question: "Ni gute menya inkuru ziri gukundwa?",
    answer:
      "Reba urutonde rw'inkuru zikunzwe cyangwa izifite amanota menshi ku rubuga."
  },
  {
    question: "Ese nshobora gukoresha NewTalentsG ku buntu?",
    answer:
      "Yego. Hari inkuru nyinshi zisomwa ku buntu, nubwo hari n'izisaba NES kugira ngo uzisome."
  },
  {
    question: "Ninde nagana niba mfite ikibazo?",
    answer:
      "Niba ufite ikibazo kitakemutse, koresha Contact cyangwa Support kugira ngo uvugane n'ubuyobozi bwa NewTalentsG."
  }
];

export async function searchKnowledge(userQuestion) {
  try {
    // ===== SEARCH IN FAQ DATA FIRST =====
    const faqResult = searchFAQ(userQuestion);
    
    if (faqResult && faqResult.score >= 0.65) {
      return {
        answer: faqResult.answer,
        score: faqResult.score,
        data: faqResult.data,
        type: "faq"
      };
    }

    // ===== SEARCH IN KNOWLEDGE COLLECTION SECOND =====
    const q = query(
      collection(db, "knowledge"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    let bestMatch = null;
    let highestScore = 0;

    if (!snapshot.empty) {
      snapshot.forEach((doc) => {
        const data = {
          id: doc.id,
          ...doc.data()
        };

        const score = finalScore(
          userQuestion,
          data
        );

        if (score > highestScore) {
          highestScore = score;
          bestMatch = data;
        }
      });

      // If knowledge match is good enough (score > 0.6), return it
      if (highestScore >= 0.6) {
        return {
          answer: bestMatch.answer,
          score: highestScore,
          data: bestMatch,
          type: "knowledge"
        };
      }
    }

    // ===== SEARCH IN POSTS COLLECTION =====
    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc")
    );

    const postsSnapshot = await getDocs(postsQuery);

    if (postsSnapshot.empty) {
      return null;
    }

    let bestPost = null;
    let bestPostScore = 0;
    let bestMatches = [];

    postsSnapshot.forEach((doc) => {
      const data = {
        id: doc.id,
        ...doc.data()
      };

      // Calculate score based on head/title and story/content
      const headScore = calculateHeadSimilarity(userQuestion, data.head || "");
      const storyScore = calculateStorySimilarity(userQuestion, data.story || "");
      
      // Weighted score: head is more important (0.8), story is 0.2
      const totalScore = (headScore * 0.8) + (storyScore * 0.2);

      if (totalScore > 0.3) {
        bestMatches.push({
          ...data,
          score: totalScore
        });
      }

      if (totalScore > bestPostScore) {
        bestPostScore = totalScore;
        bestPost = data;
      }
    });

    // Sort matches by score
    bestMatches.sort((a, b) => b.score - a.score);

    // If we have multiple good matches, return the top ones
    if (bestMatches.length > 1 && bestMatches[0].score > 0.5) {
      const topMatches = bestMatches.slice(0, 3);
      const reply = generateMultipleResultsReply(topMatches);
      
      return {
        answer: reply,
        score: bestMatches[0].score,
        data: bestMatches[0],
        type: "post",
        url: getPostUrl(bestMatches[0].id),
        title: bestMatches[0].head || "Inkuru",
        summary: generateSummary(bestMatches[0].story || "", 150),
        matches: topMatches.map(m => ({
          url: getPostUrl(m.id),
          title: m.head || "Inkuru",
          summary: generateSummary(m.story || "", 120)
        }))
      };
    }

    // If post score is good enough (score > 0.4)
    if (bestPostScore >= 0.4 && bestPost) {
      const summary = generateSummary(bestPost.story || "", 150);
      
      return {
        answer: `📰 **${bestPost.head || "Inkuru"}**\n\n${summary}\n\n🔗 Soma inkuru yose: [Hano](${getPostUrl(bestPost.id)})`,
        score: bestPostScore,
        data: bestPost,
        type: "post",
        url: getPostUrl(bestPost.id),
        title: bestPost.head || "Inkuru",
        summary: summary
      };
    }

    // If no good match found
    if (highestScore < 0.35 && bestPostScore < 0.4) {
      return null;
    }

    // Return best available
    if (highestScore > bestPostScore) {
      return {
        answer: bestMatch.answer,
        score: highestScore,
        data: bestMatch,
        type: "knowledge"
      };
    }

    return null;

  } catch (error) {
    console.error("Chatbot search error:", error);
    return null;
  }
}

// ===== SEARCH FAQ FUNCTION =====
function searchFAQ(userQuestion) {
  if (!userQuestion || !FAQ_DATA.length) {
    return null;
  }

  let bestMatch = null;
  let highestScore = 0;

  FAQ_DATA.forEach((faq) => {
    // Calculate similarity between user question and FAQ question
    const score = calculateFAQSimilarity(userQuestion, faq.question);
    
    // Also check for keywords in the question
    const keywordScore = calculateKeywordMatch(userQuestion, faq.question);
    
    // Combined score: similarity (0.7) + keyword match (0.3)
    const totalScore = (score * 0.7) + (keywordScore * 0.3);

    if (totalScore > highestScore) {
      highestScore = totalScore;
      bestMatch = {
        ...faq,
        score: totalScore
      };
    }
  });

  // Return if score is above threshold
  if (bestMatch && bestMatch.score >= 0.6) {
    return {
      answer: bestMatch.answer,
      score: bestMatch.score,
      data: bestMatch
    };
  }

  return null;
}

// ===== CALCULATE FAQ SIMILARITY =====
function calculateFAQSimilarity(userText, faqQuestion) {
  if (!userText || !faqQuestion) return 0;
  
  const userWords = processText(userText);
  const faqWords = processText(faqQuestion);
  
  if (!userWords.length || !faqWords.length) return 0;
  
  const userSet = new Set(userWords);
  const faqSet = new Set(faqWords);
  
  let matches = 0;
  userSet.forEach(word => {
    if (faqSet.has(word)) {
      matches++;
    }
  });
  
  const total = new Set([...userWords, ...faqWords]).size;
  return matches / total;
}

// ===== CALCULATE KEYWORD MATCH =====
function calculateKeywordMatch(userText, faqQuestion) {
  if (!userText || !faqQuestion) return 0;
  
  const userWords = processText(userText);
  const faqWords = processText(faqQuestion);
  
  if (!userWords.length || !faqWords.length) return 0;
  
  // Count how many user words appear in FAQ question
  let matches = 0;
  userWords.forEach(word => {
    if (faqWords.includes(word)) {
      matches++;
    }
  });
  
  // Return percentage of user words that match FAQ
  return matches / userWords.length;
}

// ===== CALCULATE HEAD SIMILARITY =====
function calculateHeadSimilarity(userText, head) {
  if (!head) return 0;
  
  const userWords = processText(userText);
  const headWords = processText(head);
  
  if (!userWords.length || !headWords.length) return 0;
  
  const userSet = new Set(userWords);
  const headSet = new Set(headWords);
  
  let matches = 0;
  userSet.forEach(word => {
    if (headSet.has(word)) {
      matches++;
    }
  });
  
  const total = new Set([...userWords, ...headWords]).size;
  return matches / total;
}

// ===== CALCULATE STORY SIMILARITY =====
function calculateStorySimilarity(userText, story) {
  if (!story) return 0;
  
  // Clean story first (remove HTML)
  const cleanStory = story
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .trim();
  
  const userWords = processText(userText);
  const storyWords = processText(cleanStory).slice(0, 200); // Limit to first 200 words
  
  if (!userWords.length || !storyWords.length) return 0;
  
  const userSet = new Set(userWords);
  const storySet = new Set(storyWords);
  
  let matches = 0;
  userSet.forEach(word => {
    if (storySet.has(word)) {
      matches++;
    }
  });
  
  const total = new Set([...userWords, ...storyWords]).size;
  return matches / total;
}

// ===== GENERATE SUMMARY =====
function generateSummary(story, maxLength = 150) {
  if (!story) return "Nta content iboneka.";
  
  // Clean story first
  const cleanStory = story
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  
  if (cleanStory.length <= maxLength) {
    return cleanStory;
  }
  
  // Find the last space within maxLength
  let summary = cleanStory.substring(0, maxLength);
  const lastSpace = summary.lastIndexOf(' ');
  
  if (lastSpace > 0) {
    summary = summary.substring(0, lastSpace);
  }
  
  return summary + '...';
}

// ===== GENERATE MULTIPLE RESULTS REPLY =====
function generateMultipleResultsReply(matches) {
  let reply = "📚 **Nabonye inkuru nyinshi zishobora kugufasha:**\n\n";
  
  matches.forEach((match, index) => {
    const num = index + 1;
    const summary = generateSummary(match.story || "", 100);
    reply += `${num}. **${match.head || "Inkuru"}**\n`;
    reply += `   ${summary}\n`;
    reply += `   🔗 [Soma hano](${getPostUrl(match.id)})\n\n`;
  });
  
  reply += "📖 Kanda kuri link niba ushaka gusoma inkuru yose.";
  
  return reply;
}

// ===== GET POST URL =====
function getPostUrl(postId) {
  return `https://www.newtalentsg.co.rw/post/${postId}`;
}

// ===== TEXT PROCESSOR =====
function processText(text) {
  if (!text) return [];
  
  const clean = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, "")
    .trim();
  
  const words = clean.split(/\s+/).filter(Boolean);
  
  const stopWords = [
    "na", "ni", "iki", "ese", "ko", "kuri", "mu", "muri", 
    "ku", "ya", "byo", "the", "is", "a", "an", "and", "to", "of",
    "for", "with", "on", "at", "from", "by", "in", "as", "or", "but",
    "n", "m", "k", "b", "r", "t", "y"
  ];
  
  return words.filter(word => !stopWords.includes(word));
}
