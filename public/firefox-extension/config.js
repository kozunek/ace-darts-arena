// ─── Static configuration constants ───
const CONFIG = {
  EDART_URL: "https://edartpolska.pl",
  SUPABASE_URL: "https://uiolhzctnbskdjteufkj.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpb2xoemN0bmJza2RqdGV1ZmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTc4NjEsImV4cCI6MjA4ODQ5Mzg2MX0.SEGOONfttWCS7jbacT5NxlbiOGSxmrVRp4DFqQRDYkk",
  VERSION: "2.0.0",
  TOKEN_FRESH_MS: 300000,       // 5 min
  RATE_LIMIT_MS: 2000,          // min time between API calls
  CACHE_TTL_MS: 180000,         // 3 min cache for league checks
  SUBMISSION_LOCK_TTL_MS: 30000, // 30s lock to prevent duplicate submissions
  DEBUG_MODE: false,
};

// Debug logger
function log(...args) {
  if (CONFIG.DEBUG_MODE) {
    console.log("[eDART]", ...args);
  }
}

function logAlways(...args) {
  console.log("[eDART]", ...args);
}

function logError(...args) {
  console.error("[eDART]", ...args);
}
