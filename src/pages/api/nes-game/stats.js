import {
  collection,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";

import { db } from "../../../components/firebase";
import {
  getBalance,
  getUsernameFromRequest,
  requireMethod,
} from "../../../lib/nesGame";

export default async function handler(req, res) {
  if (!requireMethod(req, "GET")) {
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

    const rewardsRef = collection(
      db,
      "nesGameRewards"
    );

    const q = query(
      rewardsRef,
      where("username", "==", username),
      limit(1000)
    );

    const snapshot = await getDocs(q);

    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    let totalEarned = 0;
    let todayEarned = 0;

    let completedShares = 0;
    let completedAds = 0;

    snapshot.forEach((item) => {
      const data = item.data();

      const reward = Number(data.reward || 0);

      totalEarned += reward;

      if (data.type === "share") {
        completedShares++;
      }

      if (data.type === "ad") {
        completedAds++;
      }

      const createdAt = data.createdAt;

      let date;

      if (createdAt?.toDate) {
        date = createdAt.toDate();
      } else if (createdAt) {
        date = new Date(createdAt);
      }

      if (
        date &&
        !Number.isNaN(date.getTime()) &&
        date >= startOfToday
      ) {
        todayEarned += reward;
      }
    });

    const nes = await getBalance(username);

    return res.status(200).json({
      success: true,

      stats: {
        balance: nes,
        totalEarned,
        todayEarned,
        completedShares,
        completedAds,
        totalCompleted:
          completedShares + completedAds,
      },
    });
  } catch (error) {
    console.error("NES STATS ERROR:", error);

    return res.status(500).json({
      message:
        error?.message ||
        "Failed to load statistics.",
    });
  }
}
