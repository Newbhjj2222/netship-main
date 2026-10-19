import {
  getBalance,
  getUsernameFromRequest,
  requireMethod,
} from "../../../lib/nesGame";

export default async function handler(req, res) {
  if (!requireMethod(req, "GET")) {
    return res.status(405).json({
      message: "Method not allowed.",
    });
  }

  try {
    const username = getUsernameFromRequest(req);

    if (!username) {
      return res.status(401).json({
        message: "Login required.",
      });
    }

    const nes = await getBalance(username);

    return res.status(200).json({
      success: true,
      username,
      nes,
    });
  } catch (error) {
    console.error("NES BALANCE ERROR:", error);

    return res.status(500).json({
      message:
        error?.message ||
        "Failed to load NES balance.",
    });
  }
}
