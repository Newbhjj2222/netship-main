// utils/getUserFromCookie.js
import Cookies from "js-cookie";

/**
 * Get full user data from cookie
 * @returns {Object|null} User data or null if not found
 */
export function getUserFromCookie() {
  try {
    const userCookie = Cookies.get("user");
    if (userCookie) {
      return JSON.parse(userCookie);
    }
    return null;
  } catch (error) {
    console.error("Error reading user cookie:", error);
    return null;
  }
}

/**
 * Get username from cookie
 * @returns {string} Username or "Guest" if not found
 */
export function getUsername() {
  const user = getUserFromCookie();
  return user?.username || user?.fName || "Guest";
}

/**
 * Get user ID from cookie
 * @returns {string|null} User ID or null if not found
 */
export function getUserId() {
  const user = getUserFromCookie();
  return user?.uid || null;
}

/**
 * Get user email from cookie
 * @returns {string|null} User email or null if not found
 */
export function getUserEmail() {
  const user = getUserFromCookie();
  return user?.email || null;
}

/**
 * Get user full name from cookie
 * @returns {string|null} User full name or null if not found
 */
export function getUserFullName() {
  const user = getUserFromCookie();
  return user?.fName || user?.username || null;
}

/**
 * Check if user is logged in
 * @returns {boolean} True if user is logged in
 */
export function isUserLoggedIn() {
  return getUserFromCookie() !== null;
}

/**
 * Get user's first letter for avatar
 * @returns {string} First letter of username or "G" for Guest
 */
export function getUserInitial() {
  const username = getUsername();
  return username !== "Guest" ? username.charAt(0).toUpperCase() : "G";
}
