// lib/storyHelpers.js

/**
 * Normalize a story title by removing season, episode, and other identifiers
 * This is the core normalization function used across the application
 */
export const normalizeStoryHead = (head = "") => {
  if (!head) return "";
  
  let normalized = head;
  
  // Remove season identifiers (case insensitive)
  normalized = normalized.replace(/season\s*\d+/gi, "");
  normalized = normalized.replace(/s\d{1,2}/gi, "");
  
  // Remove episode identifiers (case insensitive)
  normalized = normalized.replace(/ep(?:isode)?\s*(?:final|finall?|finally|ginal|finnall?)\s*/gi, "");
  normalized = normalized.replace(/ep(?:isode)?\s*\d+\s*/gi, "");
  normalized = normalized.replace(/ep\s*\d+\s*/gi, "");
  
  // Remove standalone finale indicators
  normalized = normalized.replace(/\b(final|finall?|finally|ginal|finnall?)\b/gi, "");
  
  // Remove parenthetical text
  normalized = normalized.replace(/\([^)]*\)/g, "");
  
  // Remove common separators
  normalized = normalized.replace(/[-_:|]/g, " ");
  
  // Remove extra spaces and trim
  normalized = normalized.replace(/\s+/g, " ").trim();
  
  // If after normalization we get an empty string, return a default
  return normalized || "Untitled Story";
};

/**
 * Extract episode number from title
 * Returns null if no episode number is found
 */
export const getEpisodeNumber = (head = "") => {
  if (!head) return null;
  
  // Try to find episode number in various formats
  const patterns = [
    /ep(?:isode)?\s*(\d+)/i,
    /ep\s*(\d+)/i,
    /s\d{1,2}\s*ep\s*(\d+)/i,
    /episode\s*(\d+)/i,
    /#(\d+)/i
  ];
  
  for (const pattern of patterns) {
    const match = head.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return null;
};

/**
 * Check if an episode is a finale
 */
export const isFinale = (head = "") => {
  if (!head) return false;
  return /(final|finall?|finally|ginal|finnall?)/i.test(head);
};

/**
 * Get sorting order for an episode
 * Returns a number that can be used for sorting
 */
export const getEpisodeSortOrder = (head = "") => {
  const episodeNumber = getEpisodeNumber(head);
  
  if (episodeNumber !== null) {
    return episodeNumber;
  }
  
  if (isFinale(head)) {
    return 9999; // Finales come after numbered episodes
  }
  
  return 9998; // Unrecognized episodes come before finales but after numbered
};

/**
 * Group posts by their normalized story title
 */
export const groupPostsByStory = (posts = []) => {
  const groups = new Map();
  
  for (const post of posts) {
    const normalizedTitle = normalizeStoryHead(post.head || post.title || "Untitled");
    
    if (!groups.has(normalizedTitle)) {
      groups.set(normalizedTitle, {
        id: normalizedTitle,
        title: normalizedTitle,
        episodes: [],
        totalEpisodes: 0,
        totalViews: 0,
        image: post.imageUrl || post.image || post.cover || "/cover.jpg",
        category: post.category || "Uncategorized",
        firstEpisode: null,
        latestEpisode: null,
        createdAt: post.createdAt || null,
        latestEpisodeDate: null,
      });
    }
    
    const group = groups.get(normalizedTitle);
    group.episodes.push(post);
    group.totalEpisodes = group.episodes.length;
    group.totalViews += post.views || 0;
    
    // Set image from first episode that has one
    if (!group.image || group.image === "/cover.jpg") {
      group.image = post.imageUrl || post.image || post.cover || "/cover.jpg";
    }
    
    // Set category from first episode that has one
    if (group.category === "Uncategorized" && post.category && post.category !== "Uncategorized") {
      group.category = post.category;
    }
    
    // Keep track of first and latest episode
    if (!group.firstEpisode || (post.createdAt && post.createdAt < group.firstEpisode.createdAt)) {
      group.firstEpisode = post;
    }
    if (!group.latestEpisode || (post.createdAt && post.createdAt > group.latestEpisode.createdAt)) {
      group.latestEpisode = post;
    }
    
    // Track latest episode date for sorting
    const postDate = post.createdAt;
    if (postDate) {
      const timestamp = postDate.seconds ? postDate.seconds : new Date(postDate).getTime() / 1000;
      if (!group.latestEpisodeDate || timestamp > group.latestEpisodeDate) {
        group.latestEpisodeDate = timestamp;
      }
    }
  }
  
  // Sort episodes within each group
  for (const group of groups.values()) {
    group.episodes.sort((a, b) => {
      const orderA = getEpisodeSortOrder(a.head || a.title || "");
      const orderB = getEpisodeSortOrder(b.head || b.title || "");
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // If same order, sort by createdAt
      const dateA = a.createdAt?.seconds || new Date(a.createdAt || 0).getTime() / 1000 || 0;
      const dateB = b.createdAt?.seconds || new Date(b.createdAt || 0).getTime() / 1000 || 0;
      return dateA - dateB;
    });
  }
  
  // Convert to array and sort by latest episode date
  return Array.from(groups.values()).sort((a, b) => {
    return (b.latestEpisodeDate || 0) - (a.latestEpisodeDate || 0);
  });
};

/**
 * Search through grouped stories
 */
export const searchGroupedStories = (groups = [], searchTerm = "") => {
  if (!searchTerm) return groups;
  
  const term = searchTerm.toLowerCase().trim();
  
  return groups.filter(group => {
    // Search in normalized title
    if (group.title.toLowerCase().includes(term)) {
      return true;
    }
    
    // Search in episode titles
    return group.episodes.some(episode => 
      (episode.head || "").toLowerCase().includes(term)
    );
  });
};
