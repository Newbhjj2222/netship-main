// pages/api/payout-callback.js

import { db } from "../../components/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export default async function handler(req, res) {
  // ============================================================
  // ONLY POST
  // ============================================================

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    // ============================================================
    // PAWAPAY CALLBACK BODY
    // ============================================================

    const callback = req.body || {};

    const payoutId = callback.payoutId;
    const payoutStatus = String(
      callback.status || ""
    )
      .trim()
      .toUpperCase();

    // ============================================================
    // VALIDATION
    // ============================================================

    if (!payoutId) {
      return res.status(400).json({
        success: false,
        error: "payoutId is required",
      });
    }

    if (!payoutStatus) {
      return res.status(400).json({
        success: false,
        error: "status is required",
      });
    }

    console.log(
      "=========================================="
    );

    console.log(
      "PAWAPAY PAYOUT CALLBACK"
    );

    console.log(
      "Payout ID:",
      payoutId
    );

    console.log(
      "Status:",
      payoutStatus
    );

    console.log(
      "=========================================="
    );

    // ============================================================
    // PAYOUT DOCUMENT
    // ============================================================

    const payoutRef = doc(
      db,
      "payouts",
      payoutId
    );

    const payoutSnap =
      await getDoc(payoutRef);

    // ============================================================
    // PAYOUT MUST EXIST
    // ============================================================

    if (!payoutSnap.exists()) {
      console.error(
        "Payout not found:",
        payoutId
      );

      /*
       * Do not create a payout blindly.
       *
       * payout.js should create the payout document
       * when the payout request is initiated.
       */

      return res.status(404).json({
        success: false,
        error: "Payout not found",
      });
    }

    const payout = payoutSnap.data();

    // ============================================================
    // DATA STORED WHEN PAYOUT WAS CREATED
    // ============================================================

    const username =
      payout.username || null;

    const nesRequested = Number(
      payout.nesRequested || 0
    );

    const previousStatus =
      String(
        payout.status || "PENDING"
      ).toUpperCase();

    const alreadyDeducted =
      payout.nesDeducted === true;

    // ============================================================
    // VALIDATE USER
    // ============================================================

    if (!username) {
      console.error(
        "Payout has no username:",
        payoutId
      );

      return res.status(400).json({
        success: false,
        error:
          "Payout does not contain username",
      });
    }

    // ============================================================
    // VALIDATE NES
    // ============================================================

    if (
      !Number.isInteger(
        nesRequested
      ) ||
      nesRequested <= 0
    ) {
      console.error(
        "Invalid NES requested:",
        nesRequested
      );

      return res.status(400).json({
        success: false,
        error:
          "Invalid nesRequested",
      });
    }

    // ============================================================
    // SAVE CALLBACK INFORMATION
    //
    // We keep the real PawaPay callback internally.
    // check-payout.js will NOT expose this to the browser.
    // ============================================================

    const callbackUpdate = {
      status: payoutStatus,

      pawapayStatus:
        payoutStatus,

      pawapayCallback:
        callback,

      lastCallbackAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),
    };

    // ============================================================
    // PROCESSING
    //
    // According to your requested logic:
    //
    // PROCESSING => deduct NES immediately.
    //
    // If PawaPay later sends FAILED, we refund them.
    // ============================================================

    if (
      payoutStatus ===
      "PROCESSING"
    ) {
      // ----------------------------------------------------------
      // Already deducted?
      // ----------------------------------------------------------

      if (alreadyDeducted) {
        await updateDoc(
          payoutRef,
          callbackUpdate
        );

        console.log(
          "NES already deducted."
        );

        return res.status(200).json({
          success: true,
          received: true,
        });
      }

      // ----------------------------------------------------------
      // USER DOCUMENT
      // ----------------------------------------------------------

      const userRef = doc(
        db,
        "authors",
        username
      );

      const userSnap =
        await getDoc(userRef);

      if (!userSnap.exists()) {
        console.error(
          "User not found:",
          username
        );

        return res.status(404).json({
          success: false,
          error:
            "User not found",
        });
      }

      const userData =
        userSnap.data();

      const currentNES =
        Number(
          userData.nes || 0
        );

      // ----------------------------------------------------------
      // CHECK BALANCE
      // ----------------------------------------------------------

      if (
        currentNES <
        nesRequested
      ) {
        console.error(
          "Insufficient NES during callback:",
          {
            username,
            currentNES,
            nesRequested,
          }
        );

        /*
         * We do NOT mark nesDeducted=true.
         * This makes the problem visible in Firebase
         * instead of silently creating a negative balance.
         */

        await updateDoc(
          payoutRef,
          {
            ...callbackUpdate,

            status:
              payoutStatus,

            nesDeducted:
              false,

            nesError:
              "Insufficient NES balance",

            currentNES,
            nesRequested,

            updatedAt:
              new Date().toISOString(),
          }
        );

        return res.status(200).json({
          success: true,
          received: true,
          nesDeducted: false,
        });
      }

      // ----------------------------------------------------------
      // CALCULATE NEW BALANCE
      // ----------------------------------------------------------

      const newNES =
        currentNES -
        nesRequested;

      // ----------------------------------------------------------
      // UPDATE USER
      // ----------------------------------------------------------

      await updateDoc(
        userRef,
        {
          nes: newNES,

          updatedAt:
            new Date().toISOString(),

          lastPayout:
            new Date().toISOString(),
        }
      );

      // ----------------------------------------------------------
      // UPDATE PAYOUT
      // ----------------------------------------------------------

      await updateDoc(
        payoutRef,
        {
          ...callbackUpdate,

          status:
            payoutStatus,

          nesRequested,

          nesDeducted:
            true,

          previousBalance:
            currentNES,

          newBalance:
            newNES,

          deductedAt:
            new Date().toISOString(),

          refunded:
            false,

          updatedAt:
            new Date().toISOString(),
        }
      );

      console.log(
        "=========================================="
      );

      console.log(
        "NES DEDUCTED"
      );

      console.log(
        "Username:",
        username
      );

      console.log(
        "NES requested:",
        nesRequested
      );

      console.log(
        "Previous:",
        currentNES
      );

      console.log(
        "New:",
        newNES
      );

      console.log(
        "=========================================="
      );

      return res.status(200).json({
        success: true,
        received: true,
        nesDeducted: true,
      });
    }

    // ============================================================
    // COMPLETED
    //
    // If NES wasn't deducted earlier, deduct now.
    // This covers a callback that jumps directly to COMPLETED.
    // ============================================================

    if (
      payoutStatus ===
      "COMPLETED"
    ) {
      // ----------------------------------------------------------
      // ALREADY DEDUCTED
      // ----------------------------------------------------------

      if (alreadyDeducted) {
        await updateDoc(
          payoutRef,
          {
            ...callbackUpdate,

            status:
              "COMPLETED",

            completedAt:
              new Date().toISOString(),

            updatedAt:
              new Date().toISOString(),
          }
        );

        console.log(
          "Payout completed. NES already deducted."
        );

        return res.status(200).json({
          success: true,
          received: true,
          nesDeducted: true,
        });
      }

      // ----------------------------------------------------------
      // USER
      // ----------------------------------------------------------

      const userRef = doc(
        db,
        "authors",
        username
      );

      const userSnap =
        await getDoc(userRef);

      if (!userSnap.exists()) {
        return res.status(404).json({
          success: false,
          error:
            "User not found",
        });
      }

      const userData =
        userSnap.data();

      const currentNES =
        Number(
          userData.nes || 0
        );

      // ----------------------------------------------------------
      // BALANCE CHECK
      // ----------------------------------------------------------

      if (
        currentNES <
        nesRequested
      ) {
        await updateDoc(
          payoutRef,
          {
            ...callbackUpdate,

            status:
              "COMPLETED",

            nesDeducted:
              false,

            nesError:
              "Insufficient NES balance",

            currentNES,

            nesRequested,

            completedAt:
              new Date().toISOString(),

            updatedAt:
              new Date().toISOString(),
          }
        );

        return res.status(200).json({
          success: true,
          received: true,
          nesDeducted: false,
        });
      }

      // ----------------------------------------------------------
      // DEDUCT
      // ----------------------------------------------------------

      const newNES =
        currentNES -
        nesRequested;

      await updateDoc(
        userRef,
        {
          nes: newNES,

          updatedAt:
            new Date().toISOString(),

          lastPayout:
            new Date().toISOString(),
        }
      );

      // ----------------------------------------------------------
      // SAVE PAYOUT
      // ----------------------------------------------------------

      await updateDoc(
        payoutRef,
        {
          ...callbackUpdate,

          status:
            "COMPLETED",

          nesRequested,

          nesDeducted:
            true,

          previousBalance:
            currentNES,

          newBalance:
            newNES,

          completedAt:
            new Date().toISOString(),

          deductedAt:
            new Date().toISOString(),

          refunded:
            false,

          updatedAt:
            new Date().toISOString(),
        }
      );

      console.log(
        "COMPLETED payout. NES deducted:",
        nesRequested
      );

      return res.status(200).json({
        success: true,
        received: true,
        nesDeducted: true,
      });
    }

    // ============================================================
    // FAILED
    //
    // If NES were deducted during PROCESSING,
    // refund them.
    // ============================================================

    if (
      payoutStatus ===
      "FAILED"
    ) {
      // ----------------------------------------------------------
      // Already refunded
      // ----------------------------------------------------------

      if (
        payout.refunded === true
      ) {
        await updateDoc(
          payoutRef,
          {
            ...callbackUpdate,

            status:
              "FAILED",

            failedAt:
              new Date().toISOString(),

            updatedAt:
              new Date().toISOString(),
          }
        );

        return res.status(200).json({
          success: true,
          received: true,
          refunded: true,
        });
      }

      // ----------------------------------------------------------
      // NES WAS NEVER DEDUCTED
      // ----------------------------------------------------------

      if (!alreadyDeducted) {
        await updateDoc(
          payoutRef,
          {
            ...callbackUpdate,

            status:
              "FAILED",

            nesDeducted:
              false,

            refunded:
              false,

            failedAt:
              new Date().toISOString(),

            updatedAt:
              new Date().toISOString(),
          }
        );

        console.log(
          "Payout failed. No NES deduction was made."
        );

        return res.status(200).json({
          success: true,
          received: true,
          refunded: false,
        });
      }

      // ----------------------------------------------------------
      // USER
      // ----------------------------------------------------------

      const userRef = doc(
        db,
        "authors",
        username
      );

      const userSnap =
        await getDoc(userRef);

      if (!userSnap.exists()) {
        return res.status(404).json({
          success: false,
          error:
            "User not found for refund",
        });
      }

      const userData =
        userSnap.data();

      const currentNES =
        Number(
          userData.nes || 0
        );

      // ----------------------------------------------------------
      // REFUND
      // ----------------------------------------------------------

      const refundedNES =
        currentNES +
        nesRequested;

      await updateDoc(
        userRef,
        {
          nes: refundedNES,

          updatedAt:
            new Date().toISOString(),
        }
      );

      // ----------------------------------------------------------
      // SAVE FAILED PAYOUT
      // ----------------------------------------------------------

      await updateDoc(
        payoutRef,
        {
          ...callbackUpdate,

          status:
            "FAILED",

          nesDeducted:
            false,

          refunded:
            true,

          refundAmount:
            nesRequested,

          previousBalance:
            currentNES,

          newBalance:
            refundedNES,

          failedAt:
            new Date().toISOString(),

          refundedAt:
            new Date().toISOString(),

          failureReason:
            callback.failureReason ||
            null,

          updatedAt:
            new Date().toISOString(),
        }
      );

      console.log(
        "=========================================="
      );

      console.log(
        "PAYOUT FAILED - NES REFUNDED"
      );

      console.log(
        "Username:",
        username
      );

      console.log(
        "Refund:",
        nesRequested
      );

      console.log(
        "Previous:",
        currentNES
      );

      console.log(
        "New:",
        refundedNES
      );

      console.log(
        "=========================================="
      );

      return res.status(200).json({
        success: true,
        received: true,
        refunded: true,
      });
    }

    // ============================================================
    // OTHER STATUS
    //
    // ACCEPTED / ENQUEUED / SUBMITTED etc.
    // ============================================================

    await updateDoc(
      payoutRef,
      {
        ...callbackUpdate,

        status:
          payoutStatus,

        updatedAt:
          new Date().toISOString(),
      }
    );

    return res.status(200).json({
      success: true,
      received: true,
    });
  } catch (error) {
    console.error(
      "PawaPay callback error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Callback processing failed",
    });
  }
}
