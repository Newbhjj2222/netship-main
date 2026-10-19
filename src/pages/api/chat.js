import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../components/firebase";
import { searchKnowledge } from "../../components/SearchEngine";


export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      reply: "Method not allowed"
    });
  }


  try {

    const {
      message,
      username = "Guest"
    } = req.body;


    if (!message || !message.trim()) {

      return res.status(400).json({
        reply: "Andika ikibazo mbere yo kohereza."
      });

    }


    const result = await searchKnowledge(message);


    let reply;


    if (result) {

      reply = result.answer;


    } else {

      reply =
        "Unyihanganire, ntubifate nko kwanga kugusubiza. Sinabonye igisubizo cy'icyo kibazo. Ongera ubaze mu bundi buryo cyangwa twandikire kuri Whatsapp +250722319367 niba byihutirwa. ariko ugarutse nka nyuma yumunsi cyangwa iminsi 2, nzabasha kukigusubiza.";

      await addDoc(
        collection(db, "unanswered"),
        {
          question: message,
          username,
          createdAt: serverTimestamp()
        }
      );

    }


    await addDoc(
      collection(db, "conversations"),
      {
        username,
        message,
        reply,
        createdAt: serverTimestamp()
      }
    );


    return res.status(200).json({
      reply
    });


  } catch (error) {

    console.error(
      "Chat API Error:",
      error
    );


    return res.status(500).json({
      reply:
        "Habaye ikibazo kuri server. Ongera ugerageze."
    });

  }

}
