import { db } from "../../components/firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

// ===== PAWAPAY CONFIGURATION =====
const PAWAPAY_API_URL = "https://api.pawapay.io/v2";
const PAWAPAY_TOKEN =
  "eyJraWQiOiIxIiwiYWxnIjoiRVMyNTYifQ.eyJ0dCI6IkFBVCIsInN1YiI6IjIwMTgiLCJtYXYiOiIxIiwiZXhwIjoyMDgwMzgxOTU2LCJpYXQiOjE3NjQ4NDkxNTYsInBtIjoiREFGLFBBRiIsImp0aSI6ImI0YWM3MzQ4LWYyNDEtNDVjNy04MmQ1LTI0ZTgwZjVlZmJhNSJ9.8qxWc0Aph9QhrhKcfPXvaFe5l_RzSPjOWsCGFr6W88QpMmcyWwqm7W7M83-UCE4OrM8UQZOncdnx-t1MACbObA";

/* =========================
GENERATE UUID
========================= */
function generateUUID() {
  const data = new Uint8Array(16);
  crypto.getRandomValues(data);
  data[6] = (data[6] & 0x0f) | 0x40;
  data[8] = (data[8] & 0x3f) | 0x80;
  const hex = Array.from(data)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/* =========================
HANDLER
========================= */
export default async function handler(req, res) {
  // ===== 1. METHOD =====
  if (req.method === "POST") {
    return handleDeposit(req, res);
  } else if (req.method === "GET") {
    return handleStatusCheck(req, res);
  } else {
    return res.status(405).json({
      success: false,
      message: "Method not allowed. Use POST or GET.",
    });
  }
}

/* =========================
POST: DEPOSIT
========================= */
async function handleDeposit(req, res) {
  try {
    const { amount, country, phone, username, provider, currency } = req.body;

    if (!amount || !phone) {
      return res.status(400).json({
        success: false,
        message: "Missing amount or phone",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    const depositId = generateUUID();

    const payload = {
      depositId: depositId,
      amount: String(amount),
      currency: currency || "RWF",
      payer: {
        type: "MMO",
        accountDetails: {
          phoneNumber: phone,
          provider: provider || "MTN_MOMO_RWA",
        },
      },
      customerMessage: "NTs Membership",
      metadata: [
        { username: username || "anonymous" },
        { source: "membership_application" },
      ],
    };

    console.log("📤 Pawapay /v2/deposits request:", JSON.stringify(payload, null, 2));

    const response = await fetch(`${PAWAPAY_API_URL}/deposits`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAWAPAY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("📥 Pawapay /v2/deposits response:", JSON.stringify(data, null, 2));

    // Save to Firestore
    await setDoc(
      doc(db, "deposits", depositId),
      {
        depositId,
        phone,
        username: username || null,
        amount,
        currency: currency || "RWF",
        country: country || "RWA",
        provider: provider || "MTN_MOMO_RWA",
        status: data.status || "pending",
        pawapayFullResponse: data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Handle Pawapay statuses
    if (data.status === "REJECTED" || data.status === "DUPLICATE_IGNORED") {
      const failureReason = data.failureReason || data;
      const failureMessage =
        failureReason.failureMessage ||
        failureReason.message ||
        "Pawapay rejected the deposit";

      return res.status(400).json({
        success: false,
        message: failureMessage,
        status: data.status,
        depositId: depositId,
        pawapayResponse: data,
        failureReason: failureReason,
      });
    }

    if (data.status === "ACCEPTED") {
      return res.status(200).json({
        success: true,
        message: "Deposit initiated successfully. Please check your phone for PIN.",
        depositId: depositId,
        status: data.status,
        pawapayResponse: data,
      });
    }

    // Unknown status
    return res.status(500).json({
      success: false,
      message: `Unknown status from Pawapay: ${data.status || "unknown"}`,
      depositId: depositId,
      pawapayResponse: data,
    });
  } catch (error) {
    console.error("Deposit error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* =========================
GET: CHECK STATUS
========================= */
async function handleStatusCheck(req, res) {
  try {
    const { depositId } = req.query;

    if (!depositId) {
      return res.status(400).json({
        success: false,
        message: "depositId is required as query parameter",
      });
    }

    // Retrieve deposit from Firestore
    const docRef = doc(db, "deposits", depositId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: "Deposit not found",
      });
    }

    const data = docSnap.data();
    const status = data.status; // e.g., "ACCEPTED", "REJECTED", "pending", "COMPLETED", etc.

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
      status: status,
      tran_status,
      data,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
