import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  where,
} from "firebase/firestore";

import { db } from "../components/firebase";

export const SHARE_REWARD = 5;
export const SHARE_REQUIRED_CLICKS = 3;

export const AD_REWARD = 1;
export const AD_REQUIRED_SECONDS = 15;

export const SHARE_TASK_MINUTES = 60;
export const AD_TASK_MINUTES = 10;

export function getUsernameFromRequest(req) {
  try {
    const raw = req.cookies?.user;

    if (!raw) return null;

    const user = JSON.parse(raw);

    if (!user?.username) return null;

    return String(user.username).trim();
  } catch {
    return null;
  }
}

export function getUserFromRequest(req) {
  try {
    const raw = req.cookies?.user;

    if (!raw) return null;

    const user = JSON.parse(raw);

    if (!user?.username) return null;

    return user;
  } catch {
    return null;
  }
}

export function requireMethod(req, method) {
  if (req.method !== method) {
    return false;
  }

  return true;
}

export function makePostUrl(postId) {
  return `https://www.newtalentsg.co.rw/post/${encodeURIComponent(
    postId
  )}`;
}

export function makeShareUrl(postId, trackingCode) {
  return `${makePostUrl(postId)}?ref=${encodeURIComponent(
    trackingCode
  )}`;
}

export async function getPostSummary(postId) {
  try {
    const summariesRef = collection(
      db,
      "posts",
      postId,
      "summaries"
    );

    const q = query(summariesRef, limit(1));

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return "";
    }

    const data = snapshot.docs[0].data();

    return (
      data.summary ||
      data.description ||
      data.text ||
      ""
    );
  } catch {
    return "";
  }
}

export async function getPostById(postId) {
  const postRef = doc(db, "posts", postId);

  const snapshot = await getDoc(postRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function getRandomPost() {
  const postsRef = collection(db, "posts");

  const q = query(postsRef, limit(200));

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const posts = snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .filter((post) => post.id);

  if (!posts.length) {
    return null;
  }

  const randomIndex = Math.floor(
    Math.random() * posts.length
  );

  return posts[randomIndex];
}

export function getTrackingCode() {
  return (
    "NES" +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  ).toUpperCase();
}

export function getTaskExpiry(minutes) {
  return new Date(
    Date.now() + minutes * 60 * 1000
  );
}

export async function getBalance(username) {
  const balanceRef = doc(db, "depositers", username);

  const snapshot = await getDoc(balanceRef);

  if (!snapshot.exists()) {
    return 0;
  }

  const data = snapshot.data();

  return Number(data.nes || 0);
}

export async function rewardTask({
  taskId,
  username,
  reward,
  taskType,
  validateTask,
}) {
  const taskRef = doc(db, "nesGameTasks", taskId);

  const balanceRef = doc(
    db,
    "depositers",
    username
  );

  const rewardRef = doc(
    db,
    "nesGameRewards",
    taskId
  );

  return runTransaction(db, async (transaction) => {
    const taskSnapshot = await transaction.get(taskRef);

    if (!taskSnapshot.exists()) {
      throw new Error("Task ntabwo ibonetse.");
    }

    const task = taskSnapshot.data();

    if (task.username !== username) {
      throw new Error("Ntabwo wemerewe iyi task.");
    }

    const existingReward = await transaction.get(
      rewardRef
    );

    const balanceSnapshot = await transaction.get(
      balanceRef
    );

    const currentBalance = Number(
      balanceSnapshot.exists()
        ? balanceSnapshot.data().nes || 0
        : 0
    );

    if (existingReward.exists()) {
      return {
        completed: true,
        alreadyRewarded: true,
        reward,
        nes: currentBalance,
      };
    }

    const validation = validateTask(task);

    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const newBalance = currentBalance + reward;

    transaction.set(
      balanceRef,
      {
        id: username,
        nes: newBalance,
        updatedAt: new Date(),
      },
      {
        merge: true,
      }
    );

    transaction.set(rewardRef, {
      taskId,
      username,
      type: taskType,
      reward,
      createdAt: new Date(),
    });

    transaction.update(taskRef, {
      status: "completed",
      completedAt: new Date(),
      reward,
    });

    return {
      completed: true,
      alreadyRewarded: false,
      reward,
      nes: newBalance,
    };
  });
}

export async function getUserTask(
  taskId,
  username
) {
  const taskRef = doc(
    db,
    "nesGameTasks",
    taskId
  );

  const snapshot = await getDoc(taskRef);

  if (!snapshot.exists()) {
    return null;
  }

  const task = {
    id: snapshot.id,
    ...snapshot.data(),
  };

  if (task.username !== username) {
    return null;
  }

  return task;
}

export function cleanString(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}
