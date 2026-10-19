import { randomUUID } from "crypto";


export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { amount, country } = req.body;

    if (!amount || !country) {
      return res.status(400).json({
        message: "Amount and country are required",
      });
    }

    const PAWAPAY_API_KEY =
      "eyJraWQiOiIxIiwiYWxnIjoiRVMyNTYifQ.eyJ0dCI6IkFBVCIsInN1YiI6IjIwMTgiLCJtYXYiOiIxIiwiZXhwIjoyMDgwMzgxOTU2LCJpYXQiOjE3NjQ4NDkxNTYsInBtIjoiREFGLFBBRiIsImp0aSI6ImI0YWM3MzQ4LWYyNDEtNDVjNy04MmQ1LTI0ZTgwZjVlZmJhNSJ9.8qxWc0Aph9QhrhKcfPXvaFe5l_RzSPjOWsCGFr6W88QpMmcyWwqm7W7M83-UCE4OrM8UQZOncdnx-t1MACbObA"; // 🔹 shyiramo key yawe nyayo
    const PAWAPAY_URL = "https://api.pawapay.io/v1/widget/sessions";
    const depositId = randomUUID();

    const payload = {
      depositId,
      amount: amount.toString(),
      country,
      reason: "Live payment",
      statementDescription: "ONLINE PAYMENT",
      language: "EN",
      returnUrl: "https://newtalentsg.co.rw/payment-result",
    };

    const response = await fetch(PAWAPAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PAWAPAY_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log("PawaPay response:", data); // 🔹 check response nyayo

    if (!response.ok) {
      return res.status(400).json({
        message: "PawaPay LIVE error",
        error: data,
      });
    }

    if (!data.redirectUrl) {
      return res.status(400).json({
        message: "LIVE: redirectUrl not returned",
        data,
      });
    }

    return res.status(200).json({
      redirectUrl: data.redirectUrl,
      depositId,
    });
  } catch (error) {
    console.error("LIVE PAY ERROR:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
