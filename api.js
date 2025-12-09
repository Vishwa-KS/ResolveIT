// api.js  – shared helpers for all pages

const API_BASE = "http://localhost:8080";

// Smart helper: JSON by default, but leaves FormData alone
async function apiFetch(path, options = {}) {
    const finalOptions = { ...options };
    const body = options.body;

    const isFormData = (body instanceof FormData);

    const baseHeaders = options.headers || {};

    if (isFormData) {
        // 🚫 Do NOT set Content-Type, browser will set multipart boundary
        finalOptions.headers = baseHeaders;
    } else {
        // Normal JSON calls
        finalOptions.headers = {
            "Content-Type": "application/json",
            ...baseHeaders
        };
    }

    return fetch(`${API_BASE}${path}`, finalOptions);
}

// Store current logged-in user in localStorage
function setCurrentUser(user) {
    localStorage.setItem("currentUser", JSON.stringify(user));
}

// Read current logged-in user from localStorage
function getCurrentUser() {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error("Failed to parse currentUser from localStorage:", e);
        return null;
    }
}

// Clear current user on logout
function clearCurrentUser() {
    localStorage.removeItem("currentUser");
}
