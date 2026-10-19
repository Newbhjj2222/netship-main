// pages/api/webhook-payout.js
import { db } from "../../components/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
} from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const event = req.body;
    console.log("📨 Payout Webhook received:", JSON.stringify(event, null, 2));

    const payoutId = event.payoutId || event.id || event.payout?.id || event.data?.payoutId;
    const status = event.status || event.payout?.status || event.data?.status;
    
    let username = null;
    let nesAmount = 0;
    let phone = null;
    
    if (event.metadata && Array.isArray(event.metadata)) {
      const usernameMeta = event.metadata.find(m => m.fieldName === "username");
      const nesMeta = event.metadata.find(m => m.fieldName === "nesAmount");
      const phoneMeta = event.metadata.find(m => m.fieldName === "phone");
      
      if (usernameMeta) username = usernameMeta.fieldValue;
      if (nesMeta) nesAmount = parseInt(nesMeta.fieldValue) || 0;
      if (phoneMeta) phone = phoneMeta.fieldValue;
    }

    if (!payoutId) {
      console.error("❌ No payoutId in webhook");
      return res.status(400).json({ error: "Missing payoutId" });
    }

    console.log(`🔍 Webhook: Payout ${payoutId}, Status: ${status}`);

    // Handle COMPLETED status
    if (status === "COMPLETED" || status === "SUCCESS") {
      console.log(`✅ Payout ${payoutId} completed via webhook!`);

      try {
        // Check if payout exists
        const payoutRef = doc(db, "payouts", payoutId);
        const payoutSnap = await getDoc(payoutRef);
        
        if (!payoutSnap.exists()) {
          console.log(`⚠️ Payout ${payoutId} not found, creating...`);
          
          await setDoc(payoutRef, {
            payoutId,
            username: username || "unknown",
            phone: phone || "unknown",
            nesRequested: nesAmount || 0,
            status: "COMPLETED",
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            source: "webhook",
            pawapayData: event
          });
          
          // Deduct NES if user exists
          if (username && nesAmount > 0) {
            const userRef = doc(db, "authors", username);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
              const currentPoints = Number(userSnap.data().nes || 0);
              const newPoints = Math.max(0, currentPoints - nesAmount);
              
              console.log(`💰 Deducting ${nesAmount} NES from ${username}: ${currentPoints} -> ${newPoints}`);
              
              await updateDoc(userRef, {
                nes: newPoints,
                lastPayout: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
              
              const historyRef = doc(db, "transactions", `${payoutId}_${Date.now()}`);
              await setDoc(historyRef, {
                type: "payout",
                payoutId,
                username,
                amount: nesAmount,
                previousBalance: currentPoints,
                newBalance: newPoints,
                status: "COMPLETED",
                createdAt: new Date().toISOString(),
                source: "webhook"
              });
            }
          }
        } else {
          const payoutData = payoutSnap.data();
          
          if (payoutData.status !== "COMPLETED") {
            await updateDoc(payoutRef, {
              status: "COMPLETED",
              completedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              source: "webhook",
              pawapayData: event
            });

            // Deduct NES if not already deducted
            if (username && nesAmount > 0) {
              const userRef = doc(db, "authors", username);
              const userSnap = await getDoc(userRef);
              
              if (userSnap.exists()) {
                const currentPoints = Number(userSnap.data().nes || 0);
                const newPoints = Math.max(0, currentPoints - nesAmount);
                
                console.log(`💰 Deducting ${nesAmount} NES from ${username}: ${currentPoints} -> ${newPoints}`);
                
                await updateDoc(userRef, {
                  nes: newPoints,
                  lastPayout: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                });
              }
            }

            const historyRef = doc(db, "transactions", `${payoutId}_COMPLETED_${Date.now()}`);
            await setDoc(historyRef, {
              payoutId,
              username: payoutData.username || username,
              amount: payoutData.nesRequested || nesAmount,
              status: "COMPLETED",
              completedAt: new Date().toISOString(),
              source: "webhook"
            });

            console.log(`✅ Payout ${payoutId} marked as COMPLETED`);
          }
        }

        return res.status(200).json({
          received: true,
          payoutId,
          status: "processed",
          action: "completed"
        });

      } catch (error) {
        console.error("❌ Webhook update error:", error);
        return res.status(500).json({
          error: "Failed to process webhook",
          details: error.message
        });
      }

    } 
    // Handle FAILED status
    else if (status === "FAILED" || status === "REJECTED" || status === "CANCELLED") {
      console.log(`❌ Payout ${payoutId} failed: ${status}`);

      try {
        const payoutRef = doc(db, "payouts", payoutId);
        const payoutSnap = await getDoc(payoutRef);
        
        if (payoutSnap.exists()) {
          const payoutData = payoutSnap.data();
          
          if (payoutData.status !== "COMPLETED") {
            await updateDoc(payoutRef, {
              status: "FAILED",
              failedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              failureReason: event.reason || event.message || "Unknown error",
              source: "webhook",
              pawapayData: event
            });

            // Refund NES
            const username = payoutData.username || event.metadata?.find(m => m.fieldName === "username")?.fieldValue;
            const nesAmount = payoutData.nesRequested || 0;
            
            if (username && nesAmount > 0) {
              const userRef = doc(db, "authors", username);
              const userSnap = await getDoc(userRef);
              
              if (userSnap.exists()) {
                const currentPoints = Number(userSnap.data().nes || 0);
                const newPoints = currentPoints + nesAmount;
                
                console.log(`💰 Refunding ${nesAmount} NES to ${username}: ${currentPoints} -> ${newPoints}`);
                
                await updateDoc(userRef, {
                  nes: newPoints,
                  updatedAt: new Date().toISOString()
                });
                
                const historyRef = doc(db, "transactions", `${payoutId}_REFUND_${Date.now()}`);
                await setDoc(historyRef, {
                  type: "refund",
                  payoutId,
                  username,
                  amount: nesAmount,
                  previousBalance: currentPoints,
                  newBalance: newPoints,
                  status: "REFUNDED",
                  reason: "Payout failed",
                  createdAt: new Date().toISOString(),
                  source: "webhook"
                });
              }
            }
          }
        } else {
          // Create failed payout record
          await setDoc(payoutRef, {
            payoutId,
            username: username || "unknown",
            phone: phone || "unknown",
            nesRequested: nesAmount || 0,
            status: "FAILED",
            failedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: "webhook",
            pawapayData: event
          });
        }

        return res.status(200).json({
          received: true,
          payoutId,
          status: "failed",
          action: "refunded_nes"
        });

      } catch (error) {
        console.error("❌ Webhook error:", error);
        return res.status(500).json({
          error: "Failed to process failed payout",
          details: error.message
        });
      }

    } 
    // Handle other statuses (PENDING, PROCESSING, etc.)
    else {
      console.log(`ℹ️ Payout ${payoutId} status: ${status}`);
      
      try {
        const payoutRef = doc(db, "payouts", payoutId);
        const payoutSnap = await getDoc(payoutRef);
        
        if (payoutSnap.exists()) {
          await updateDoc(payoutRef, {
            status: status,
            updatedAt: new Date().toISOString(),
            pawapayData: event
          });
        } else {
          await setDoc(payoutRef, {
            payoutId,
            username: username || "unknown",
            phone: phone || "unknown",
            nesRequested: nesAmount || 0,
            status: status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: "webhook",
            pawapayData: event
          });
        }
      } catch (e) {
        console.error("Failed to update status:", e);
      }
      
      return res.status(200).json({
        received: true,
        payoutId,
        status: "acknowledged"
      });
    }

  } catch (error) {
    console.error("❌ Webhook error:", error);
    return res.status(500).json({
      error: error.message,
      received: false
    });
  }
}
