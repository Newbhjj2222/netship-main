import {
  collection,
  doc,
  setDoc,
} from "firebase/firestore";

import { db } from "../../../components/firebase";

import {
  getPostSummary,
  getRandomPost,
  getTaskExpiry,
  getTrackingCode,
  getUsernameFromRequest,
  makePostUrl,
  makeShareUrl,
  requireMethod,
  SHARE_REWARD,
  SHARE_REQUIRED_CLICKS,
  SHARE_TASK_MINUTES,
} from "../../../lib/nesGame";

export default async function handler(req, res) {
  if (!requireMethod(req, "POST")) {
    return res.status(405).json({
      message: "Method not allowed.",
    });
  }

  try {
    const username = getUsernameFromRequest(req);

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

    const post = await getRandomPost();

    if (!post) {
      return res.status(404).json({
        message:
          "Nta nkuru ibonetse muri posts.",
      });
    }

    const summary = await getPostSummary(
      post.id
    );

    const trackingCode = getTrackingCode();

    const taskRef = doc(
      collection(db, "nesGameTasks")
    );

    const expiresAt =
      getTaskExpiry(SHARE_TASK_MINUTES);

    const postUrl = makePostUrl(post.id);

    const shareUrl = makeShareUrl(
      post.id,
      trackingCode
    );

    const task = {
      id: taskRef.id,

      username,

      sessionId,

      type: "share",

      postId: post.id,

      title:
        post.head ||
        post.title ||
        post.storyHead ||
        "New Talents Stories",

      storyTitle:
        post.storyHead ||
        post.storyTitle ||
        post.head ||
        "New Talents Stories",

      summary,

      imageUrl: post.imageUrl || "",

      postUrl,

      trackingCode,

      shareUrl,

      reward: SHARE_REWARD,

      requiredClicks:
        SHARE_REQUIRED_CLICKS,

      clicks: 0,

      status: "active",

      createdAt: new Date(),

      expiresAt,
    };

    await setDoc(taskRef, task);

    return res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    console.error(
      "CREATE SHARE TASK ERROR:",
      error
    );

    return res.status(500).json({
      message:
        error?.message ||
        "Failed to create share task.",
    });
  }
}
