import { db } from "../../../components/firebase";

import {
  collection,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";

import cookie from "cookie";

function getUsername(req) {
  try {
    const cookies = cookie.parse(req.headers.cookie || "");

    if (!cookies.user) {
      return null;
    }

    const user = JSON.parse(cookies.user);

    return user?.username || null;
  } catch (error) {
    console.error("User cookie error:", error);
    return null;
  }
}

function serializeTimestamp(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === "object" &&
    typeof value.seconds === "number"
  ) {
    return new Date(value.seconds * 1000).toISOString();
  }

  return value;
}

function serializeTask(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,

    ...data,

    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
    startedAt: serializeTimestamp(data.startedAt),
    expiresAt: serializeTimestamp(data.expiresAt),
    completedAt: serializeTimestamp(data.completedAt),
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      message: "Method not allowed.",
    });
  }

  try {
    const username = getUsername(req);

    if (!username) {
      return res.status(401).json({
        message: "User ntabonetse.",
      });
    }

    /*
     * Dusoma active tasks z'uyu user.
     *
     * Ntabwo dukoresha orderBy hano kugira ngo
     * tutagira ikibazo cya Firestore composite index.
     */
    const tasksQuery = query(
      collection(db, "nesGameTasks"),
      where("username", "==", username),
      where("status", "==", "active"),
      limit(20)
    );

    const snapshot = await getDocs(tasksQuery);

    if (snapshot.empty) {
      return res.status(200).json({
        task: null,
      });
    }

    const now = Date.now();

    const tasks = snapshot.docs
      .map(serializeTask)
      .filter((task) => {
        /*
         * Task idafite expiration tuyemera.
         */
        if (!task.expiresAt) {
          return true;
        }

        const expiresAt = new Date(task.expiresAt).getTime();

        return expiresAt > now;
      })
      .sort((a, b) => {
        const aTime = a.createdAt
          ? new Date(a.createdAt).getTime()
          : 0;

        const bTime = b.createdAt
          ? new Date(b.createdAt).getTime()
          : 0;

        return bTime - aTime;
      });

    /*
     * Nta active task ikiriho.
     */
    if (!tasks.length) {
      return res.status(200).json({
        task: null,
      });
    }

    /*
     * Dusubizamo task iheruka.
     */
    return res.status(200).json({
      task: tasks[0],
    });
  } catch (error) {
    console.error("Active task error:", error);

    return res.status(500).json({
      message:
        error?.message ||
        "Failed to load active NES Mine task.",
    });
  }
}
