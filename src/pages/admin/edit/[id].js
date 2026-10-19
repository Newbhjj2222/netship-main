import { useRouter } from "next/router";

import EditKnowledgeForm from "@/components/admin/ChatBot/EditKnowledgeForm";
import LinkComponent from "@/components/Links";
import { useI18n } from "@/i18n/I18nProvider";

export default function EditPage(){
  const { t } = useI18n();


  const router = useRouter();

  const { id } = router.query;


  if(!id){
    return null;
  }


  return (

    <div>
<LinkComponent />
      <h1>{t("Hindura Knowledge")}</h1>


      <EditKnowledgeForm
        id={id}
      />

    </div>

  );

}
