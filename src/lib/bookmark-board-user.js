export const BOOKMARK_BOARD_USER_VERSION = 1;
export const BOOKMARK_BOARD_USER_KEY = "rootspace:bookmark-board:last-user:v1";
export const BOOKMARK_BOARD_USER_EVENT = "rootspace:bookmark-board:user";

function resolveStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function parseBookmarkBoardUser(rawValue) {
  if (typeof rawValue !== "string") return null;

  try {
    const value = JSON.parse(rawValue);
    if (
      !value ||
      typeof value !== "object" ||
      value.version !== BOOKMARK_BOARD_USER_VERSION ||
      typeof value.userId !== "string" ||
      !value.userId.trim()
    ) {
      return null;
    }

    return { version: BOOKMARK_BOARD_USER_VERSION, userId: value.userId };
  } catch {
    return null;
  }
}

export function readBookmarkBoardUser(storage) {
  const target = resolveStorage(storage);
  if (!target) return null;

  try {
    return parseBookmarkBoardUser(target.getItem(BOOKMARK_BOARD_USER_KEY));
  } catch {
    return null;
  }
}

export function writeBookmarkBoardUser(userId, storage) {
  const target = resolveStorage(storage);
  if (!target || typeof userId !== "string" || !userId.trim()) return false;

  try {
    target.setItem(
      BOOKMARK_BOARD_USER_KEY,
      JSON.stringify({ version: BOOKMARK_BOARD_USER_VERSION, userId }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearBookmarkBoardUser(storage) {
  const target = resolveStorage(storage);
  if (!target) return false;

  try {
    target.removeItem(BOOKMARK_BOARD_USER_KEY);
    return true;
  } catch {
    return false;
  }
}

export function announceBookmarkBoardUser(user) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BOOKMARK_BOARD_USER_EVENT, { detail: user }));
}
