// pages/api/payment-stream.js
import { getPaymentStatus } from "./webhook";

export default async function handler(req, res) {
  const { depositId } = req.query;

  if (!depositId) {
    return res.status(400).json({ error: "depositId required" });
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  console.log(`📡 SSE connection established for ${depositId}`);

  let lastStatus = null;
  let checkCount = 0;
  const maxChecks = 90; // 90 * 2s = 3 minutes

  const sendStatus = (status, data = null) => {
    res.write(`data: ${JSON.stringify({ status, data })}\n\n`);
  };

  const checkInterval = setInterval(async () => {
    checkCount++;

    try {
      // Check webhook memory first
      const webhookData = getPaymentStatus(depositId);
      
      if (webhookData) {
        const status = webhookData.status;
        
        if (status === "success" && lastStatus !== "success") {
          console.log(`✅ SSE: Payment ${depositId} confirmed!`);
          sendStatus("success", webhookData.data);
          clearInterval(checkInterval);
          res.end();
          return;
        } else if (status === "failed" && lastStatus !== "failed") {
          console.log(`❌ SSE: Payment ${depositId} failed`);
          sendStatus("failed", webhookData.data);
          clearInterval(checkInterval);
          res.end();
          return;
        }
        
        lastStatus = status;
      }

      // If max checks reached, close connection
      if (checkCount >= maxChecks) {
        console.log(`⏰ SSE: ${depositId} timeout after ${maxChecks} checks`);
        sendStatus("pending");
        clearInterval(checkInterval);
        res.end();
        return;
      }

      // Keep connection alive with heartbeat
      if (checkCount % 5 === 0) {
        sendStatus("heartbeat");
      }

    } catch (error) {
      console.error("SSE error:", error);
      sendStatus("error");
      clearInterval(checkInterval);
      res.end();
    }
  }, 2000);

  // Clean up on client disconnect
  req.on('close', () => {
    console.log(`🔌 SSE: ${depositId} connection closed`);
    clearInterval(checkInterval);
    res.end();
  });
}
