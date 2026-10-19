import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../components/firebase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { username, badge } = req.body;

  try {
    const authorRef = doc(db, "authors", username); // 👈 username = doc id

    await updateDoc(authorRef, {
      badge,
    });

    res.status(200).json({ message: "Badge updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
