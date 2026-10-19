import UnansweredTable from "@/components/admin/ChatBot/UnansweredTable";
import LinkComponent from "../../components/Links";
import { useI18n } from "@/i18n/I18nProvider";

export default function UnansweredPage(){
  const { t } = useI18n();


 return (

  <div>
<LinkComponent />
    <h1>{t("Unanswered Questions")}</h1>


    <UnansweredTable />

  </div>

 );

}
