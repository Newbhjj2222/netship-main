import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  limit,
} from "firebase/firestore";

import { db } from "../../../components/firebase";

import {
  AD_REWARD,
  AD_REQUIRED_SECONDS,
  AD_TASK_MINUTES,
  getTaskExpiry,
  getUsernameFromRequest,
  requireMethod,
} from "../../../lib/nesGame";

export default async function handler(req, res) {
  if (!requireMethod(req, "POST")) {
    return res.status(405).json({
      message: "Method not allowed.",
    });
  }

  try {
    const username =
      getUsernameFromRequest(req);

    if (!username) {
      return res.status(401).json({
        message: "Login required.",
      });
    }

    const {
      sessionId,
    } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({
        message: "Session ID irakenewe.",
      });
    }

    const adsRef = collection(
      db,
      "ads"
    );

    const q = query(
      adsRef,
      where("active", "==", true),
      limit(100)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.status(404).json({
        message:
          "Nta active advertisement ibonetse.",
      });
    }

    const ads = snapshot.docs.map(
      (item) => ({
        id: item.id,
        ...item.data(),
      })
    );

    const ad =
      ads[
        Math.floor(
          Math.random() * ads.length
        )
      ];

    const taskRef = doc(
      collection(db, "nesGameTasks")
    );

    const startedAt = new Date();

    const expiresAt =
      getTaskExpiry(AD_TASK_MINUTES);

    const task = {
      id: taskRef.id,

      username,

      sessionId,

      type: "ad",

      adId: ad.id,

      title:
        ad.title ||
        "Advertisement",

      description:
        ad.description || "",

      link: ad.link || "",

      mediaType:
        ad.mediaType || "image",

      mediaUrl:
        ad.mediaUrl || "",

      reward: AD_REWARD,

      requiredSeconds:
        AD_REQUIRED_SECONDS,

      status: "active",

      startedAt,

      expiresAt,

      createdAt: startedAt,
    };

    await setDoc(taskRef, task);

    return res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    console.error(
      "START AD ERROR:",
      error
    );

    return res.status(500).json({
      message:
        error?.message ||
        "Failed to start advertisement.",
    });
  }
}
