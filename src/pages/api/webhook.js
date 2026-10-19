// pages/api/webhook.js
import { getServerSession } from "next-auth/next";

// Store pending payments (in production, use database)
const pendingPayments = new Map();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get webhook data from PawaPay
    const event = req.body;
    console.log("📨 Webhook received:", JSON.stringify(event, null, 2));

    // Extract payment data
    const depositId = event.depositId || event.id;
    const status = event.status || event.transactionStatus;
    const transactionId = event.transactionId || event.id;

    if (!depositId) {
      console.error("❌ No depositId in webhook");
      return res.status(400).json({ error: "Missing depositId" });
    }

    console.log(`🔍 Processing webhook for deposit: ${depositId}`);
    console.log(`📊 Status: ${status}`);

    // Handle different statuses
    if (status === "COMPLETED" || status === "SUCCESS") {
      // ✅ Payment successful
      console.log(`✅ Payment ${depositId} completed successfully!`);
      
      // Store that payment is complete
      pendingPayments.set(depositId, {
        status: "success",
        transactionId: transactionId,
        updatedAt: new Date().toISOString(),
        data: event
      });

      // Here you would:
      // 1. Update user's NES points in database
      // 2. Mark transaction as completed
      // 3. Send email confirmation
      // 4. Update user balance

      console.log(`💰 Payment ${depositId} - User should get points now`);

    } else if (status === "FAILED" || status === "REJECTED" || status === "CANCELLED") {
      // ❌ Payment failed
      console.log(`❌ Payment ${depositId} failed: ${status}`);
      
      pendingPayments.set(depositId, {
        status: "failed",
        transactionId: transactionId,
        updatedAt: new Date().toISOString(),
        data: event
      });

    } else {
      // ⏳ Other status (PENDING, PROCESSING, etc.)
      console.log(`⏳ Payment ${depositId} is ${status}`);
      
      pendingPayments.set(depositId, {
        status: "pending",
        transactionId: transactionId,
        updatedAt: new Date().toISOString(),
        data: event
      });
    }

    // Respond to PawaPay
    return res.status(200).json({ 
      received: true, 
      depositId: depositId,
      status: "processed" 
    });

  } catch (error) {
    console.error("❌ Webhook error:", error);
    return res.status(500).json({ 
      error: error.message,
      received: false 
    });
  }
}

// Export for checking payment status from polling
export function getPaymentStatus(depositId) {
  return pendingPayments.get(depositId) || null;
}

// Clean up old entries (optional)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pendingPayments.entries()) {
    const age = now - new Date(value.updatedAt).getTime();
    if (age > 3600000) { // 1 hour
      pendingPayments.delete(key);
    }
  }
}, 600000); // Every 10 minutes
