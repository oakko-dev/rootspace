export const BOOKMARK_BOARD_CACHE_VERSION = 1;
export const BOOKMARK_BOARD_CACHE_PREFIX = "rootspace:bookmark-board:v1:";

export function getBookmarkBoardCacheKey(userId) {
  return `${BOOKMARK_BOARD_CACHE_PREFIX}${userId}`;
}

function isCollection(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    typeof value.color === "string" &&
    Number.isInteger(value.position)
  );
}

function isBookmark(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.collectionId === "string" &&
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    typeof value.faviconUrl === "string" &&
    typeof value.description === "string" &&
    Number.isInteger(value.position) &&
    typeof value.isFavorite === "boolean"
  );
}

export function parseBookmarkBoardPayload(value, userId) {
  if (!value || typeof value !== "object") return null;
  if (value.version !== BOOKMARK_BOARD_CACHE_VERSION || value.userId !== userId) return null;
  if (!Array.isArray(value.collections) || !value.collections.every(isCollection)) return null;
  if (!Array.isArray(value.bookmarks) || !value.bookmarks.every(isBookmark)) return null;

  return {
    version: BOOKMARK_BOARD_CACHE_VERSION,
    userId,
    cachedAt: Number.isFinite(value.cachedAt) ? value.cachedAt : 0,
    collections: value.collections,
    bookmarks: value.bookmarks,
  };
}

export function parseBookmarkBoardCache(rawValue, userId) {
  if (typeof rawValue !== "string") return null;
  try {
    return parseBookmarkBoardPayload(JSON.parse(rawValue), userId);
  } catch {
    return null;
  }
}

function resolveStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function readBookmarkBoardCache(userId, storage) {
  const target = resolveStorage(storage);
  if (!target) return null;
  try {
    return parseBookmarkBoardCache(target.getItem(getBookmarkBoardCacheKey(userId)), userId);
  } catch {
    return null;
  }
}

export function writeBookmarkBoardCache(userId, board, storage, now = Date.now()) {
  const target = resolveStorage(storage);
  if (!target) return false;
  const payload = parseBookmarkBoardPayload(
    {
      version: BOOKMARK_BOARD_CACHE_VERSION,
      userId,
      cachedAt: now,
      collections: board.collections,
      bookmarks: board.bookmarks,
    },
    userId,
  );
  if (!payload) return false;

  try {
    target.setItem(getBookmarkBoardCacheKey(userId), JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearBookmarkBoardCache(userId, storage) {
  const target = resolveStorage(storage);
  if (!target || !userId) return false;
  try {
    target.removeItem(getBookmarkBoardCacheKey(userId));
    return true;
  } catch {
    return false;
  }
}
