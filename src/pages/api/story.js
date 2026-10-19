// pages/api/story.js (cyangwa app/api/story/route.js)
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "@/components/firebase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { storyName, username } = req.body;

  if (!storyName) {
    return res.status(400).json({ error: "Story name is required" });
  }

  try {
    // ===== SEARCH IN POSTS COLLECTION =====
    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc")
    );

    const postsSnapshot = await getDocs(postsQuery);

    if (postsSnapshot.empty) {
      return res.status(200).json({
        reply: `Nta nkuru yabonetse izwi nka "${storyName}". Gerageza kwandika izina ry'inkuru neza.`,
        type: "none"
      });
    }

    let matches = [];
    let exactMatch = null;
    let bestMatch = null;
    let bestScore = 0;

    postsSnapshot.forEach((doc) => {
      const data = {
        id: doc.id,
        ...doc.data()
      };

      const head = data.head || "";
      const story = data.story || "";
      
      // Check if head contains the story name (case insensitive)
      const headLower = head.toLowerCase();
      const storyNameLower = storyName.toLowerCase();
      
      // Calculate similarity score
      const score = calculateSimilarity(storyNameLower, headLower);
      
      // If exact match (head starts with story name or contains it)
      if (headLower.includes(storyNameLower) || storyNameLower.includes(headLower)) {
        matches.push({
          ...data,
          score: score,
          matchType: "contains"
        });
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = data;
        }
      } else {
        // Check if story content contains the name
        const storyLower = story.toLowerCase();
        if (storyLower.includes(storyNameLower)) {
          matches.push({
            ...data,
            score: score * 0.5, // Lower score for content match
            matchType: "content"
          });
        }
      }
    });

    // Sort matches by score
    matches.sort((a, b) => b.score - a.score);

    // If no matches found
    if (matches.length === 0) {
      return res.status(200).json({
        reply: `Nta nkuru yabonetse izwi nka "${storyName}". Koresha #inkuru n'izina ry'inkuru. Urugero: #inkuru Ruhirwa`,
        type: "none"
      });
    }

    // Get the best match
    const topMatch = matches[0];

    // Generate summary
    const summary = generateSummary(topMatch.story || "", 350);

    // If multiple matches, show them
    if (matches.length > 1) {
      const topMatches = matches.map(m => ({
  id: m.id,
  head: m.head || "Inkuru",
  url: getPostUrl(m.id),
  summary: generateSummary(m.story || "", 100),
  score: m.score,
  matchType: m.matchType
}));

      let reply = `📚 **Nabonye inkuru ifite episode nyinshi ariyo "${storyName}":**\n\n`;
      
      topMatches.forEach((match, index) => {
        const num = index + 1;
        reply += `${num}. **${match.head}**\n`;
        reply += `   ${match.summary}\n`;
        reply += `   🔗 [Kanda Aha uyisome](${match.url})\n\n`;
      });

      return res.status(200).json({
        reply: reply,
        type: "multiple",
        matches: topMatches
      });
    }

    // Single match
    return res.status(200).json({
      reply: `📰 **${topMatch.head || "Inkuru"}**\n\n${summary}\n\n🔗 Soma inkuru yose: [Hano](${getPostUrl(topMatch.id)})`,
      type: "post",
      url: getPostUrl(topMatch.id),
      title: topMatch.head || "Inkuru",
      summary: summary
    });

  } catch (error) {
    console.error("Story API error:", error);
    return res.status(500).json({
      reply: "Habaye ikibazo mu gushakisha inkuru. Ongera ugerageze.",
      type: "error"
    });
  }
}

// ===== HELPER FUNCTIONS =====

function calculateSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  
  const words1 = text1.split(' ').filter(Boolean);
  const words2 = text2.split(' ').filter(Boolean);
  
  if (!words1.length || !words2.length) return 0;
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  let matches = 0;
  set1.forEach(word => {
    if (set2.has(word)) {
      matches++;
    }
  });
  
  const total = new Set([...words1, ...words2]).size;
  return matches / total;
}

function generateSummary(story, maxLength = 350) {
  if (!story) return "Nta content iboneka.";
  
  // Clean story first
  const cleanStory = story
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  
  if (cleanStory.length <= maxLength) {
    return cleanStory;
  }
  
  let summary = cleanStory.substring(0, maxLength);
  const lastSpace = summary.lastIndexOf(' ');
  
  if (lastSpace > 0) {
    summary = summary.substring(0, lastSpace);
  }
  
  return summary + '...';
}

function getPostUrl(postId) {
  return `https://www.newtalentsg.co.rw/post/${postId}`;
}
