import { db } from "../../components/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export default async function handler(req, res) {
  // ===== METHOD HANDLING =====
  if (req.method === "GET") {
    return handleGetStatus(req, res);
  } else if (req.method === "POST") {
    return handleWebhook(req, res);
  } else {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }
}

// =============================================
//  GET: Check deposit status
// =============================================
async function handleGetStatus(req, res) {
  try {
    const { depositId } = req.query;

    if (!depositId) {
      return res.status(400).json({
        success: false,
        message: "depositId is required as query parameter",
      });
    }

    const docRef = doc(db, "deposits", depositId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Deposit not found",
      });
    }

    const data = docSnap.data();
    const status = data.status; // e.g., "ACCEPTED", "REJECTED", "COMPLETED", "FAILED", "pending"

    // Map to tran_status
    let tran_status = "pending";
    if (status === "ACCEPTED" || status === "COMPLETED") {
      tran_status = "success";
    } else if (status === "REJECTED" || status === "FAILED") {
      tran_status = "rejected";
    }

    return res.status(200).json({
      success: true,
      depositId,
      status,
      tran_status,
      data, // you can remove this if you don't want all data
    });
  } catch (error) {
    console.error("GET status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

// =============================================
//  POST: Webhook from PawaPay
// =============================================
async function handleWebhook(req, res) {
  try {
    const payload = req.body;

    console.log("📩 Pawapay webhook received:", JSON.stringify(payload, null, 2));

    // Extract depositId from various possible locations
    const depositId =
      payload.depositId ||
      payload.deposit_id ||
      payload.data?.depositId ||
      payload.resource?.id;

    if (!depositId) {
      console.warn("❌ No depositId in webhook payload");
      return res.status(400).json({ success: false, message: "No depositId" });
    }

    // Extract raw status from PawaPay
    const rawStatus =
      payload.status ||
      payload.data?.status ||
      payload.eventType ||
      payload.type;

    // Normalize status to our internal values
    let status = rawStatus;

    // Common PawaPay webhook statuses
    if (status === "DEPOSIT_COMPLETED" || status === "COMPLETED") status = "COMPLETED";
    if (status === "DEPOSIT_FAILED" || status === "FAILED") status = "FAILED";
    if (status === "DEPOSIT_REJECTED" || status === "REJECTED") status = "REJECTED";
    if (status === "DEPOSIT_ACCEPTED" || status === "ACCEPTED") status = "ACCEPTED";

    // If still unknown, keep as is but log
    if (!status || status === rawStatus) {
      console.log(`⚠️ Unknown status from webhook: ${rawStatus}`);
    }

    // Update Firestore
    const docRef = doc(db, "deposits", depositId);
    await updateDoc(docRef, {
      status,
      rawWebhook: payload,
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Updated deposit ${depositId} -> ${status}`);

    return res.status(200).json({ success: true, depositId, status });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
