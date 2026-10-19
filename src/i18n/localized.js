// src/i18n/localized.js
// Inyandiko ziva muri database (inkuru, imitwe...) ntizihindurwa na mashini.
// Niba wifuza kuzishyira mu ndimi nyinshi, bika ubuhinduzi muri document ubwayo mu buryo bumwe muri ubu:
//   post.head_en = "..."            post.story_sw = "<p>...</p>"
//   post.translations = { fr: { head: "...", story: "..." } }
// Iyo ubuhinduzi budahari, hakoreshwa umwimerere.
export function pickLocalized(obj, field, lang) {
  if (!obj) return "";
  return obj.translations?.[lang]?.[field] || obj[`${field}_${lang}`] || obj[field] || "";
}
