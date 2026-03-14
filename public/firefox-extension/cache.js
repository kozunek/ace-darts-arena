// ─── Simple in-memory cache ───
const _cache = {};

const Cache = {
  get(key) {
    const entry = _cache[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > (entry.ttl || CONFIG.CACHE_TTL_MS)) {
      delete _cache[key];
      return null;
    }
    return entry.value;
  },

  set(key, value, ttl) {
    _cache[key] = { value, timestamp: Date.now(), ttl: ttl || CONFIG.CACHE_TTL_MS };
  },

  has(key) {
    return this.get(key) !== null;
  },

  clear() {
    for (const key of Object.keys(_cache)) delete _cache[key];
  },
};

// ─── Submission lock (prevents duplicate submissions) ───
const _submissionLocks = {};

const SubmissionLock = {
  isLocked(matchId) {
    const lock = _submissionLocks[matchId];
    if (!lock) return false;
    if (Date.now() - lock > CONFIG.SUBMISSION_LOCK_TTL_MS) {
      delete _submissionLocks[matchId];
      return false;
    }
    return true;
  },

  lock(matchId) {
    _submissionLocks[matchId] = Date.now();
  },

  unlock(matchId) {
    delete _submissionLocks[matchId];
  },
};

// ─── Rate limiter ───
let _lastApiCall = 0;

const RateLimiter = {
  canCall() {
    return Date.now() - _lastApiCall >= CONFIG.RATE_LIMIT_MS;
  },

  async waitIfNeeded() {
    const elapsed = Date.now() - _lastApiCall;
    if (elapsed < CONFIG.RATE_LIMIT_MS) {
      await new Promise(r => setTimeout(r, CONFIG.RATE_LIMIT_MS - elapsed));
    }
    _lastApiCall = Date.now();
  },

  mark() {
    _lastApiCall = Date.now();
  },
};
