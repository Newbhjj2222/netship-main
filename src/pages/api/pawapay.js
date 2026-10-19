// pages/api/pawapay.js
import crypto from "crypto";
import { getPaymentStatus } from "./webhook";

const TOKEN = "eyJraWQiOiIxIiwiYWxnIjoiRVMyNTYifQ.eyJ0dCI6IkFBVCIsInN1YiI6IjIwMTgiLCJtYXYiOiIxIiwiZXhwIjoyMDgwMzgxOTU2LCJpYXQiOjE3NjQ4NDkxNTYsInBtIjoiREFGLFBBRiIsImp0aSI6ImI0YWM3MzQ4LWYyNDEtNDVjNy04MmQ1LTI0ZTgwZjVlZmJhNSJ9.8qxWc0Aph9QhrhKcfPXvaFe5l_RzSPjOWsCGFr6W88QpMmcyWwqm7W7M83-UCE4OrM8UQZOncdnx-t1MACbObA";
const BASE_URL = "https://api.pawapay.io";

function generateUUID() {
  return crypto.randomUUID();
}

export default async function handler(req, res) {
  if (req.method === "POST") {
    return deposit(req, res);
  } else if (req.method === "GET") {
    return verifyTransaction(req, res);
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}

// DEPOSIT FUNCTION
async function deposit(req, res) {
  try {
    const {
      amount,
      currency = "TZS",
      country = "TZ",
      correspondent,
      phone,
      username,
      email,
      description,
    } = req.body;

    if (!amount || !phone || !correspondent) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const depositId = generateUUID();
    console.log(`💰 Creating deposit: ${depositId} for ${username}`);

    const response = await fetch(`${BASE_URL}/deposits`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        depositId,
        amount: String(amount),
        currency,
        country,
        correspondent,
        payer: {
          type: "MSISDN",
          address: {
            value: phone,
          },
        },
        customerTimestamp: new Date().toISOString(),
        statementDescription: description || "NES Payment",
        metadata: [
          {
            fieldName: "username",
            fieldValue: username || "anonymous",
          },
          {
            fieldName: "email",
            fieldValue: email || "",
          },
        ],
      }),
    });

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(500).json({
        error: "Non-JSON response from PawaPay",
        raw,
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error || data?.message || "PawaPay error",
        details: data,
      });
    }

    console.log(`✅ Deposit ${depositId} created successfully`);

    return res.status(200).json({
      success: true,
      depositId,
      status: data.status,
      data,
    });
  } catch (err) {
    console.error("❌ Deposit error:", err);
    return res.status(500).json({
      error: err.message,
    });
  }
}

// VERIFY TRANSACTION - Now checks webhook memory first
async function verifyTransaction(req, res) {
  try {
    const { depositId } = req.query;

    if (!depositId) {
      return res.status(400).json({ error: "depositId required" });
    }

    console.log(`🔍 Verifying deposit: ${depositId}`);

    // 1️⃣ FIRST: Check webhook memory (fastest)
    const webhookStatus = getPaymentStatus(depositId);
    
    if (webhookStatus) {
      console.log(`📦 Webhook status found: ${webhookStatus.status}`);
      
      if (webhookStatus.status === "success") {
        return res.status(200).json({
          tran_status: "success",
          source: "webhook",
          data: webhookStatus.data
        });
      } else if (webhookStatus.status === "failed") {
        return res.status(200).json({
          tran_status: "failed",
          source: "webhook",
          data: webhookStatus.data
        });
      }
    }

    // 2️⃣ SECOND: Check PawaPay API directly (backup)
    console.log(`🌐 Checking PawaPay API for ${depositId}`);
    
    const response = await fetch(`${BASE_URL}/deposits/${depositId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(500).json({
        error: "Non-JSON response from PawaPay",
        raw,
      });
    }

    let tran_status = "pending";
    let status = null;

    // Extract status from response
    if (Array.isArray(data) && data.length > 0) {
      status = data[0].status;
    } else if (data?.status) {
      status = data.status;
    } else if (data?.data?.status) {
      status = data.data.status;
    }

    console.log(`📊 PawaPay status: ${status}`);

    if (status === "COMPLETED" || status === "SUCCESS") {
      tran_status = "success";
    } else if (status === "FAILED" || status === "REJECTED" || status === "CANCELLED") {
      tran_status = "failed";
    } else {
      tran_status = "pending";
    }

    return res.status(200).json({
      result: data,
      tran_status,
      source: "api"
    });

  } catch (err) {
    console.error("❌ Verification error:", err);
    return res.status(500).json({
      error: err.message,
    });
  }
}
