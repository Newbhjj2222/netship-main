import {
  collection,
  doc,
  getDocs,
  increment,
  query,
  runTransaction,
  where,
  limit,
} from "firebase/firestore";

import { db } from "../../../components/firebase";

import {
  getUsernameFromRequest,
  requireMethod,
} from "../../../lib/nesGame";

function getVisitorKey(req) {
  const forwarded =
    req.headers["x-forwarded-for"];

  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : String(forwarded || "")
        .split(",")[0]
        .trim();

  const userAgent =
    req.headers["user-agent"] || "";

  return `${ip}|${userAgent}`;
}

async function hashValue(value) {
  if (
    typeof crypto !== "undefined" &&
    crypto.subtle
  ) {
    const encoded = new TextEncoder().encode(
      value
    );

    const hashBuffer =
      await crypto.subtle.digest(
        "SHA-256",
        encoded
      );

    return Array.from(
      new Uint8Array(hashBuffer)
    )
      .map((byte) =>
        byte.toString(16).padStart(2, "0")
      )
      .join("");
  }

  return value;
}

export default async function handler(req, res) {
  if (!requireMethod(req, "POST")) {
    return res.status(405).json({
      message: "Method not allowed.",
    });
  }

  try {
    const {
      trackingCode,
      visitorSession,
    } = req.body || {};

    if (!trackingCode) {
      return res.status(400).json({
        message: "Tracking code irakenewe.",
      });
    }

    const tasksRef = collection(
      db,
      "nesGameTasks"
    );

    const q = query(
      tasksRef,
      where(
        "trackingCode",
        "==",
        String(trackingCode)
      ),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.status(404).json({
        message: "Share task ntabwo ibonetse.",
      });
    }

    const taskDoc = snapshot.docs[0];

    const taskRef = doc(
      db,
      "nesGameTasks",
      taskDoc.id
    );

    const task = taskDoc.data();

    const now = Date.now();

    const expiresAt = new Date(
      task.expiresAt?.toDate
        ? task.expiresAt.toDate()
        : task.expiresAt
    ).getTime();

    if (
      Number.isFinite(expiresAt) &&
      now > expiresAt
    ) {
      return res.status(410).json({
        message: "Iyi share task yarangiye.",
      });
    }

    const currentUsername =
      getUsernameFromRequest(req);

    const visitorRaw =
      visitorSession ||
      getVisitorKey(req);

    const visitorHash =
      await hashValue(visitorRaw);

    const ownerSession =
      String(task.sessionId || "");

    if (
      visitorSession &&
      visitorSession === ownerSession
    ) {
      return res.status(200).json({
        success: true,
        counted: false,
        reason: "owner",
        clicks: Number(task.clicks || 0),
        requiredClicks: Number(
          task.requiredClicks || 3
        ),
      });
    }

    if (
      currentUsername &&
      currentUsername === task.username &&
      visitorSession
    ) {
      return res.status(200).json({
        success: true,
        counted: false,
        reason: "owner",
        clicks: Number(task.clicks || 0),
        requiredClicks: Number(
          task.requiredClicks || 3
        ),
      });
    }

    const clickRef = doc(
      collection(db, "nesShareClicks")
    );

    const clickKey = `${taskDoc.id}_${visitorHash}`;

    const existingClickQuery = query(
      collection(db, "nesShareClicks"),
      where("clickKey", "==", clickKey),
      limit(1)
    );

    const existingClickSnapshot =
      await getDocs(existingClickQuery);

    if (!existingClickSnapshot.empty) {
      return res.status(200).json({
        success: true,
        counted: false,
        reason: "duplicate",
        clicks: Number(task.clicks || 0),
        requiredClicks: Number(
          task.requiredClicks || 3
        ),
      });
    }

    const result =
      await runTransaction(
        db,
        async (transaction) => {
          const freshTask =
            await transaction.get(taskRef);

          if (!freshTask.exists()) {
            throw new Error(
              "Task ntabwo ibonetse."
            );
          }

          const freshData =
            freshTask.data();

          const currentClicks = Number(
            freshData.clicks || 0
          );

          if (
            freshData.status ===
            "completed"
          ) {
            return {
              clicks: currentClicks,
              counted: false,
              reason: "completed",
            };
          }

          transaction.set(clickRef, {
            taskId: taskDoc.id,
            clickKey,
            visitorHash,
            username:
              freshData.username,
            postId:
              freshData.postId,
            createdAt: new Date(),
          });

          const newClicks =
            currentClicks + 1;

          transaction.update(taskRef, {
            clicks: increment(1),
            updatedAt: new Date(),
          });

          return {
            clicks: newClicks,
            counted: true,
            reason: "new",
          };
        }
      );

    return res.status(200).json({
      success: true,
      ...result,
      requiredClicks: Number(
        task.requiredClicks || 3
      ),
    });
  } catch (error) {
    console.error(
      "TRACK CLICK ERROR:",
      error
    );

    return res.status(500).json({
      message:
        error?.message ||
        "Failed to track click.",
    });
  }
}
