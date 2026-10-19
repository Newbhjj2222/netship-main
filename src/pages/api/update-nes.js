import { db } from "@/components/firebase";

import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

export default async function handler(req, res) {
  // =====================================================
  // ONLY POST METHOD
  // =====================================================

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // ===================================================
    // GET DATA FROM REQUEST
    // ===================================================

    const { user, nes } = req.body || {};

    // ===================================================
    // VALIDATE USER
    // ===================================================

    if (
      typeof user !== "string" ||
      user.trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Username irakenewe.",
      });
    }

    const username = user.trim();

    // ===================================================
    // VALIDATE NES
    //
    // IMPORTANT:
    // Ntukoreshe:
    // if (!nes)
    //
    // kuko NES = 0 ari valid.
    // ===================================================

    if (
      nes === undefined ||
      nes === null ||
      nes === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "NES irakenewe.",
      });
    }

    const parsedNes = Number(nes);

    // ===================================================
    // CHECK NES NUMBER
    // ===================================================

    if (
      !Number.isFinite(parsedNes)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "NES igomba kuba umubare.",
      });
    }

    // ===================================================
    // NES MUST NOT BE NEGATIVE
    // ===================================================

    if (parsedNes < 0) {
      return res.status(400).json({
        success: false,
        message:
          "NES ntishobora kuba munsi ya 0.",
      });
    }

    // ===================================================
    // NES MUST BE WHOLE NUMBER
    // ===================================================

    if (!Number.isInteger(parsedNes)) {
      return res.status(400).json({
        success: false,
        message:
          "NES igomba kuba umubare wuzuye, urugero 0, 10, 100.",
      });
    }

    // ===================================================
    // GET USER DOCUMENT
    // ===================================================

    const userRef = doc(
      db,
      "depositers",
      username
    );

    const userSnap = await getDoc(
      userRef
    );

    // ===================================================
    // USER DOES NOT EXIST
    // ===================================================

    if (!userSnap.exists()) {
      return res.status(404).json({
        success: false,
        message:
          `Umukoresha "${username}" ntaboneka muri database.`,
      });
    }

    // ===================================================
    // CURRENT TIME
    // ===================================================

    const now = Timestamp.now();

    // ===================================================
    // UPDATE USER
    // ===================================================

    await updateDoc(
      userRef,
      {
        // NES nshya
        nes: parsedNes,

        // igihe yahinduriwe
        time: now,

        // igihe cya nyuma yahinduriwe
        updatedAt: now,
      }
    );

    // ===================================================
    // SUCCESS RESPONSE
    // ===================================================

    return res.status(200).json({
      success: true,

      message:
        `NES za ${username} zahinduwe kuri ${parsedNes}.`,

      user: username,

      nes: parsedNes,

      updatedAt:
        now.toDate().toISOString(),
    });
  } catch (error) {
    // ===================================================
    // ERROR
    // ===================================================

    console.error(
      "UPDATE NES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Habaye ikibazo mu kuvugurura NES.",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
}
