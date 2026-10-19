import { randomUUID } from "crypto";

const PAWAPAY_API_KEY =
  "eyJraWQiOiIxIiwiYWxnIjoiRVMyNTYifQ.eyJ0dCI6IkFBVCIsInN1YiI6IjIwMTgiLCJtYXYiOiIxIiwiZXhwIjoyMDgwMzgxOTU2LCJpYXQiOjE3NjQ4NDkxNTYsInBtIjoiREFGLFBBRiIsImp0aSI6ImI0YWM3MzQ4LWYyNDEtNDVjNy04MmQ1LTI0ZTgwZjVlZmJhNSJ9.8qxWc0Aph9QhrhKcfPXvaFe5l_RzSPjOWsCGFr6W88QpMmcyWwqm7W7M83-UCE4OrM8UQZOncdnx-t1MACbObA";

const COUNTRY_CODES = {
  RWA: "Rwanda",
  UGA: "Uganda",
  KEN: "Kenya",
  COD: "DR Congo",
  COG: "Congo",
  BDI: "Burundi",
  ZMB: "Zambia",
  MOZ: "Mozambique",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const { amount, country, phone } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount ntabwo yemewe",
      });
    }

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Shyiramo nimero ya telefone",
      });
    }

    if (!country || !COUNTRY_CODES[country]) {
      return res.status(400).json({
        success: false,
        message: "Country ntabwo yemewe",
      });
    }

    const depositId = randomUUID();

    const payload = {
      depositId,
      amount: String(amount),
      country,
      reason: "New Talents Stories Group Membership",
      statementDescription: "Membership",
      language: "EN",
      returnUrl:
        `https://newtalentsg.co.rw/payment-result` +
        `?depositId=${depositId}` +
        `&phone=${encodeURIComponent(phone)}`,
    };

    const response = await fetch(
      "https://api.pawapay.io/v1/widget/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAWAPAY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: "PawaPay Error",
        error: data,
      });
    }

    if (!data.redirectUrl) {
      return res.status(400).json({
        success: false,
        message: "redirectUrl ntabwo yabonetse",
        data,
      });
    }

    return res.status(200).json({
      success: true,
      depositId,
      redirectUrl: data.redirectUrl,
      amount,
      country,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
}
