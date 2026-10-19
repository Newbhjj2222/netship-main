// pages/trainer.js

import { useState } from "react";
import { db } from "@/components/firebase";

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

import styles from "@/styles/Trainer.module.css";
import LinkComponent from "@/components/Links";
import { useI18n } from "@/i18n/I18nProvider";


export default function TrainerPage({ trainings: initialTrainings }) {
  const { t } = useI18n();


  const [trainings, setTrainings] = useState(initialTrainings);
  const [loadingId, setLoadingId] = useState("");


  const handleDelete = async (id) => {

    const ok = confirm(
      t("Urashaka gusiba iyi training document burundu?")
    );

    if (!ok) return;


    try {

      setLoadingId(id);


      await deleteDoc(
        doc(db, "training", id)
      );


      setTrainings((prev)=>
        prev.filter(
          (item)=>item.id !== id
        )
      );


      alert(t("Training yasibwe neza."));

    } catch(error){

      console.log(error);
      alert(t("Habaye ikibazo."));

    } finally {

      setLoadingId("");

    }

  };


  return (

    <>
      <LinkComponent />

      <main className={styles.container}>


        <h1 className={styles.title}>{t("Trainer Management ({length})", { length: trainings.length })}</h1>


        <div className={styles.tableWrapper}>


          <table className={styles.table}>


            <thead>

              <tr>
                <th>{t("User")}</th>
                <th>{t("Lessons")}</th>
                <th>{t("Quiz")}</th>
                <th>{t("Score")}</th>
                <th>{t("Level")}</th>
                <th>{t("Badges")}</th>
                <th>{t("Progress")}</th>
                <th>{t("Last Lesson")}</th>
                <th>{t("Created")}</th>
                <th>{t("Updated")}</th>
                <th>{t("Action")}</th>
              </tr>

            </thead>



            <tbody>


            {
              trainings.length === 0 ? (

                <tr>

                  <td
                    colSpan="11"
                    className={styles.empty}
                  >{t("Nta training data ihari.")}</td>

                </tr>


              ) : (


                trainings.map((item)=>(

                  <tr key={item.id}>


                    <td>
                      {item.username || "-"}
                    </td>


                    <td>
                      {item.completedLessons?.length || 0}
                    </td>


                    <td>
                      {item.completedQuiz?.length || 0}
                    </td>


                    <td>
                      {item.score || 0}
                    </td>


                    <td>
                      {item.level || "-"}
                    </td>


                    <td>
                      {
                        item.badges?.length
                        ? item.badges.join(", ")
                        : "-"
                      }
                    </td>


                    <td>
                      {item.progress || 0}%
                    </td>


                    <td>
                      {item.lastLesson || 0}
                    </td>


                    <td>
                      {item.createdAt || "-"}
                    </td>


                    <td>
                      {item.updatedAt || "-"}
                    </td>


                    <td>

                      <button
                        className={styles.deleteBtn}
                        disabled={loadingId === item.id}
                        onClick={() =>
                          handleDelete(item.id)
                        }
                      >

                        {
                          loadingId === item.id
                          ? t("Deleting...")
                          : t("Delete")
                        }

                      </button>

                    </td>


                  </tr>

                ))

              )
            }


            </tbody>


          </table>


        </div>


      </main>

    </>

  );

}



export async function getServerSideProps(){


  const snapshot = await getDocs(
    collection(db,"training")
  );


  const trainings = snapshot.docs.map((docu)=>{

    const data = docu.data();


    return {

      id: docu.id,

      ...data,

      createdAt:
        data.createdAt || "",

      updatedAt:
        data.updatedAt || ""

    };


  });



  return {

    props:{
      trainings
    }

  };

}
