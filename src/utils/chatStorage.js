import Cookies from "js-cookie";
import { getUsername } from "./getUserFromCookie";


const COOKIE_PREFIX = "chatbot_messages_";

const isBrowser = typeof window !== "undefined";


// ===============================
// GET STORAGE KEY
// ===============================

export function getChatStorageKey(username = null) {

  const user =
    username || getUsername() || "guest";

  return `${COOKIE_PREFIX}${user}`;

}



// ===============================
// LOAD CHAT
// ===============================

export function loadChatMessages(){

  if(!isBrowser) return null;


  try{

    const key = getChatStorageKey();

    const saved = Cookies.get(key);


    return saved
      ? JSON.parse(saved)
      : null;


  }catch(error){

    console.error(
      "Error loading chat:",
      error
    );

    return null;

  }

}



// ===============================
// SAVE CHAT
// ===============================

export function saveChatMessages(messages){

  if(!isBrowser) return false;


  try{

    const key = getChatStorageKey();


    Cookies.set(
      key,
      JSON.stringify(messages),
      {
        expires:7,
        sameSite:"lax"
      }
    );


    return true;


  }catch(error){

    console.error(
      "Error saving chat:",
      error
    );

    return false;

  }

}



// ===============================
// CLEAR CURRENT USER CHAT
// ===============================

export function clearChatHistory(){

  if(!isBrowser) return false;


  try{

    Cookies.remove(
      getChatStorageKey()
    );


    return true;


  }catch(error){

    return false;

  }

}



// ===============================
// CHECK CHAT EXISTS
// ===============================

export function hasChatHistory(){

  if(!isBrowser) return false;


  return (
    Cookies.get(
      getChatStorageKey()
    ) !== undefined
  );

}



// ===============================
// GET SPECIFIC USER CHAT
// ===============================

export function getChatHistoryForUser(username){

  try{

    const data =
      Cookies.get(
        getChatStorageKey(username)
      );


    return data
      ? JSON.parse(data)
      : null;


  }catch(error){

    console.error(error);

    return null;

  }

}



// ===============================
// CLEAR SPECIFIC USER
// ===============================

export function clearChatHistoryForUser(username){

  try{

    Cookies.remove(
      getChatStorageKey(username)
    );


    return true;


  }catch(error){

    return false;

  }

}



// ===============================
// GET ALL CHAT HISTORIES
// ===============================

export function getAllChatHistories(){

  const histories = {};


  try{

    const cookies = Cookies.get();


    Object.keys(cookies).forEach(
      cookie=>{


        if(
          cookie.startsWith(
            COOKIE_PREFIX
          )
        ){

          const username =
            cookie.replace(
              COOKIE_PREFIX,
              ""
            );


          histories[username] =
            JSON.parse(
              cookies[cookie]
            );

        }


      }
    );


  }catch(error){

    console.error(error);

  }


  return histories;

}



// ===============================
// EXPORT CHAT
// ===============================

export function exportChatHistory(){

  try{

    return Cookies.get(
      getChatStorageKey()
    ) || null;


  }catch(error){

    return null;

  }

}



// ===============================
// IMPORT CHAT
// ===============================

export function importChatHistory(jsonData){

  try{

    const data =
      JSON.parse(jsonData);


    if(!Array.isArray(data)){

      throw new Error(
        "Invalid chat format"
      );

    }


    saveChatMessages(data);


    return true;


  }catch(error){

    console.error(error);

    return false;

  }

}



// ===============================
// DOWNLOAD CHAT
// ===============================

export function downloadChatHistory(username=null){

  if(!isBrowser) return false;


  try{

    const user =
      username || getUsername();


    const data =
      Cookies.get(
        getChatStorageKey(user)
      );


    if(!data) return false;


    const blob =
      new Blob(
        [data],
        {
          type:"application/json"
        }
      );


    const url =
      URL.createObjectURL(blob);


    const a =
      document.createElement("a");


    a.href=url;


    a.download =
      `chat_history_${user}.json`;


    a.click();


    URL.revokeObjectURL(url);


    return true;


  }catch(error){

    console.error(error);

    return false;

  }

}



// ===============================
// UPLOAD CHAT
// ===============================

export function uploadChatHistory(file){


  if(!isBrowser){

    return Promise.reject(
      new Error(
        "SSR not allowed"
      )
    );

  }



  return new Promise(
    (resolve,reject)=>{


      const reader =
        new FileReader();



      reader.onload =
      (event)=>{


        try{


          const data =
            JSON.parse(
              event.target.result
            );



          if(!Array.isArray(data)){

            throw new Error(
              "Invalid format"
            );

          }


          saveChatMessages(data);


          resolve(true);


        }catch(error){

          reject(error);

        }

      };



      reader.onerror =
      ()=>reject(
        new Error(
          "Reading failed"
        )
      );



      reader.readAsText(file);


    }
  );

}



// ===============================
// STATISTICS
// ===============================

export function getTotalMessageCount(){

  const messages =
    loadChatMessages();


  return messages
    ? messages.length
    : 0;

}



export function getUserMessageCount(){

  const messages =
    loadChatMessages();


  if(!messages) return 0;


  return messages.filter(
    m=>m.sender==="user"
  ).length;

}



export function getBotMessageCount(){

  const messages =
    loadChatMessages();


  if(!messages) return 0;


  return messages.filter(
    m=>m.sender==="bot"
  ).length;

}



// ===============================
// CHAT STATS
// ===============================

export function getChatStats(){

  const messages =
    loadChatMessages();



  if(!messages || messages.length===0){

    return {

      total:0,
      user:0,
      bot:0,
      lastMessage:null,
      firstMessage:null

    };

  }



  return {

    total:messages.length,

    user:
      messages.filter(
        m=>m.sender==="user"
      ).length,


    bot:
      messages.filter(
        m=>m.sender==="bot"
      ).length,


    lastMessage:
      messages[messages.length-1],


    firstMessage:
      messages[0]

  };

}



// ===============================
// SEARCH
// ===============================

export function searchMessages(query){

  const messages =
    loadChatMessages();


  if(!messages) return [];


  const term =
    query.toLowerCase().trim();


  if(!term) return messages;



  return messages.filter(
    m=>
      m.text
      .toLowerCase()
      .includes(term)
  );

}



// ===============================
// DELETE MESSAGE
// ===============================

export function deleteMessage(index){

  try{

    const messages =
      loadChatMessages();


    if(
      !messages ||
      index < 0 ||
      index >= messages.length
    ){

      return false;

    }


    messages.splice(index,1);


    return saveChatMessages(messages);


  }catch(error){

    return false;

  }

}



// ===============================
// EDIT MESSAGE
// ===============================

export function editMessage(index,newText){

  try{

    const messages =
      loadChatMessages();


    if(
      !messages ||
      index < 0 ||
      index >= messages.length
    ){

      return false;

    }


    messages[index].text =
      newText;


    return saveChatMessages(messages);


  }catch(error){

    return false;

  }

}
