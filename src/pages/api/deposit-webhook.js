import { db } from "../../components/firebase";
import { doc, setDoc, serverTimestamp, getDoc, updateDoc } from "firebase/firestore";

/* =========================
HANDLER
========================= */
export default async function handler(req, res) {
  // ===== 1. CHECK METHOD =====
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // ===== 2. GET PAWAPAY WEBHOOK DATA =====
    const webhookData = req.body;

    console.log("📥 Pawapay webhook received:", JSON.stringify(webhookData, null, 2));

    // ===== 3. EXTRACT DATA (Pawapay field names may vary) =====
    const {
      depositId,
      status,
      phoneNumber,
      amount,
      transactionId,
      message,
      reference,
    } = webhookData;

    // Try to find depositId from different possible field names
    const finalDepositId = depositId || reference || webhookData.id || webhookData.depositReference;

    if (!finalDepositId) {
      console.error("❌ Missing depositId in webhook:", webhookData);
      return res.status(400).json({
        success: false,
        message: "Missing depositId",
      });
    }

    // ===== 4. GET EXISTING DEPOSIT =====
    const depositRef = doc(db, "deposits", finalDepositId);
    const depositSnap = await getDoc(depositRef);

    // ===== 5. UPDATE OR CREATE DEPOSIT =====
    const depositData = {
      status: status || "unknown",
      transactionId: transactionId || null,
      amount: amount || null,
      phone: phoneNumber || null,
      webhookData: webhookData,
      updatedAt: serverTimestamp(),
      webhookReceivedAt: serverTimestamp(),
    };

    if (!depositSnap.exists()) {
      // Create new deposit record if it doesn't exist
      await setDoc(depositRef, {
        depositId: finalDepositId,
        phone: phoneNumber || "unknown",
        ...depositData,
        createdAt: serverTimestamp(),
      });
      console.log(`✅ Deposit ${finalDepositId} created via webhook`);
    } else {
      // Update existing deposit
      await updateDoc(depositRef, depositData);
      console.log(`✅ Deposit ${finalDepositId} updated via webhook`);
    }

    // ===== 6. IF STATUS IS SUCCESS, ACTIVATE MEMBERSHIP =====
    const isSuccess = status === "success" || status === "completed" || status === "SUCCESS";

    if (isSuccess) {
      const userPhone = phoneNumber || depositSnap.data()?.phone;

      if (userPhone) {
        console.log(`✅ Activating membership for ${userPhone}`);

        // Get username from deposit record
        const depositDataFromDb = depositSnap.exists()
          ? depositSnap.data()
          : { username: null };

        const username = depositDataFromDb.username || null;

        // Update members collection
        const memberRef = doc(db, "members", userPhone);
        const memberSnap = await getDoc(memberRef);

        const memberData = {
          phone: userPhone,
          username: username,
          isMember: true,
          depositId: finalDepositId,
          transactionId: transactionId || null,
          subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          updatedAt: serverTimestamp(),
          source: "pawapay-webhook",
          lastWebhookData: webhookData,
        };

        if (!memberSnap.exists()) {
          await setDoc(memberRef, {
            ...memberData,
            createdAt: serverTimestamp(),
          });
        } else {
          await updateDoc(memberRef, memberData);
        }

        console.log(`✅ User ${userPhone} is now a member`);
      } else {
        console.warn("⚠️ No phone number found in webhook or deposit record");
      }
    } else {
      console.log(`⏳ Deposit status is "${status}". Membership not activated.`);
    }

    // ===== 7. RETURN ACKNOWLEDGMENT TO PAWAPAY =====
    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
      depositId: finalDepositId,
      status: status || "unknown",
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
