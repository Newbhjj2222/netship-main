import { useRouter } from "next/router";
import AnswerQuestionForm from "@/components/admin/ChatBot/AnswerQuestionForm";
import LinkComponent from "@/components/Links";
import { useI18n } from "@/i18n/I18nProvider";

export default function AnswerPage(){
  const { t } = useI18n();


 const router = useRouter();

 const {id}=router.query;


 if(!id) return null;


 return (

  <div>
<LinkComponent />
   <h1>{t("Subiza ikibazo")}</h1>


   <AnswerQuestionForm id={id}/>


  </div>

 );

}
