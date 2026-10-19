// pages/api/check-payout.js

import { db } from "../../components/firebase";
import {
  doc,
  getDoc,
} from "firebase/firestore";

export default async function handler(
  req,
  res
) {
  // ============================================================
  // ONLY GET
  // ============================================================

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    // ============================================================
    // PAYOUT ID
    // ============================================================

    const {
      payoutId,
    } = req.query;

    if (!payoutId) {
      return res.status(400).json({
        error:
          "payoutId required",
      });
    }

    // ============================================================
    // FIRESTORE PAYOUT
    // ============================================================

    const payoutRef = doc(
      db,
      "payouts",
      payoutId
    );

    const payoutSnap =
      await getDoc(payoutRef);

    if (!payoutSnap.exists()) {
      return res.status(404).json({
        error:
          "Payout not found",
      });
    }

    const payout =
      payoutSnap.data();

    // ============================================================
    // RETURN ONLY SAFE STATUS DATA
    //
    // PawaPay raw response is intentionally hidden.
    // ============================================================

    return res.status(200).json({
      success: true,

      payoutId,

      payoutStatus:
        payout.status ||
        "PENDING",

      nesRequested:
        Number(
          payout.nesRequested ||
          0
        ),

      nesDeducted:
        payout.nesDeducted ===
        true,

      refunded:
        payout.refunded ===
        true,

      previousBalance:
        payout.previousBalance ??
        null,

      newBalance:
        payout.newBalance ??
        null,

      failureReason:
        payout.failureReason ||
        null,

      createdAt:
        payout.createdAt ||
        null,

      completedAt:
        payout.completedAt ||
        null,

      failedAt:
        payout.failedAt ||
        null,

      updatedAt:
        payout.updatedAt ||
        null,
    });
  } catch (error) {
    console.error(
      "Check payout error:",
      error
    );

    return res.status(500).json({
      error:
        "Unable to check payout",
    });
  }
}
