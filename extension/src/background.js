/**
 * KandidFlow — Background Service Worker (Manifest v3)
 * Handles background lifecycle events, default configurations, and network proxying.
 */

const DEFAULT_BACKEND_URL = "http://localhost:8000";
const DEFAULT_API_TOKEN = "kandid_dev_secret_token_replace_in_production_32chars";

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[KandidFlow Background] Extension installed/updated:", details.reason);
  const stored = await chrome.storage.local.get(["backendUrl", "apiToken"]);
  const updates = {};
  if (!stored.backendUrl) {
    updates.backendUrl = DEFAULT_BACKEND_URL;
  }
  if (!stored.apiToken) {
    updates.apiToken = DEFAULT_API_TOKEN;
  }
  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }
});

/**
 * Helper to get authorization headers.
 */
async function getAuthHeaders() {
  const settings = await chrome.storage.local.get(["apiToken"]);
  const token = settings.apiToken || DEFAULT_API_TOKEN;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-API-Token": token,
  };
}

/**
 * Helper to get backend base URL.
 */
async function getBackendUrl() {
  const settings = await chrome.storage.local.get(["backendUrl"]);
  const url = settings.backendUrl || DEFAULT_BACKEND_URL;
  return url.replace(/\/+$/, "");
}

// Runtime message listener for background operations
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "CHECK_DUPLICATE_URL") {
    (async () => {
      try {
        const baseUrl = await getBackendUrl();
        const headers = await getAuthHeaders();
        const checkUrl = `${baseUrl}/api/v1/inbox/check?url=${encodeURIComponent(request.url)}`;

        const response = await fetch(checkUrl, {
          method: "GET",
          headers: headers,
        });

        if (!response.ok) {
          const errorText = await response.text();
          sendResponse({
            success: false,
            status: response.status,
            error: `Błąd serwera (${response.status}): ${errorText}`,
          });
          return;
        }

        const data = await response.json();
        sendResponse({ success: true, data: data });
      } catch (err) {
        sendResponse({
          success: false,
          error: `Błąd połączenia z serwerem: ${err.message}`,
        });
      }
    })();
    return true; // Keep message channel open for async response
  }

  if (request.action === "SAVE_JOB_OFFER") {
    (async () => {
      try {
        const baseUrl = await getBackendUrl();
        const headers = await getAuthHeaders();
        const saveUrl = `${baseUrl}/api/v1/inbox`;

        const response = await fetch(saveUrl, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(request.payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          sendResponse({
            success: false,
            status: response.status,
            error: `Błąd serwera (${response.status}): ${errorText}`,
          });
          return;
        }

        const data = await response.json();
        sendResponse({ success: true, data: data });
      } catch (err) {
        sendResponse({
          success: false,
          error: `Błąd zapisu oferty: ${err.message}`,
        });
      }
    })();
    return true;
  }

  if (request.action === "TEST_CONNECTION") {
    (async () => {
      try {
        const baseUrl = (request.backendUrl || (await getBackendUrl())).replace(/\/+$/, "");
        const token = request.apiToken || (await chrome.storage.local.get(["apiToken"])).apiToken;
        const testUrl = `${baseUrl}/api/v1/inbox/check?url=${encodeURIComponent("https://example.com/test")}`;

        const response = await fetch(testUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-API-Token": token,
          },
        });

        if (response.ok || response.status === 200) {
          sendResponse({ success: true, status: response.status });
        } else if (response.status === 401) {
          sendResponse({
            success: false,
            status: 401,
            error: "Nieprawidłowy token autoryzacyjny (HTTP 401)",
          });
        } else {
          sendResponse({
            success: false,
            status: response.status,
            error: `Serwer odpowiedział statusem HTTP ${response.status}`,
          });
        }
      } catch (err) {
        sendResponse({
          success: false,
          error: `Nie można połączyć się z serwerem: ${err.message}`,
        });
      }
    })();
    return true;
  }

  return false;
});
