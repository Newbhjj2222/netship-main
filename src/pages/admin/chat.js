import {useState} from "react";

import KnowledgeForm from "@/components/admin/ChatBot/KnowledgeForm";
import KnowledgeTable from "@/components/admin/ChatBot/KnowledgeTable";
import LinkComponent from "../../components/Links";
import { useI18n } from "@/i18n/I18nProvider";

export default function ChatbotAdmin(){
  const { t } = useI18n();


  const [refresh,setRefresh] = useState(0);


  return (

    <div>
<LinkComponent />
      <h1>{t("Chatbot Knowledge Manager")}</h1>


      <KnowledgeForm
        onAdded={()=>
          setRefresh(refresh+1)
        }
      />


      <KnowledgeTable
        refresh={refresh}
      />


    </div>

  );

}
