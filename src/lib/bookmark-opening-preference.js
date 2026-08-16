// Owns the browser-local contract for how ordinary bookmark clicks navigate.
export const BOOKMARK_OPENING_PREFERENCE_VERSION = 1;
export const BOOKMARK_OPENING_PREFERENCE_KEY = "rootspace:bookmark-opening:v1";
export const BOOKMARK_OPENING_NEW_TAB = "new-tab";
export const BOOKMARK_OPENING_CURRENT_TAB = "current-tab";

const VALID_PREFERENCES = new Set([BOOKMARK_OPENING_NEW_TAB, BOOKMARK_OPENING_CURRENT_TAB]);

// Resolves injected storage for tests while safely handling blocked browser storage.
function resolveStorage(storage) {
	if (storage) {
		return storage;
	}
	try {
		return globalThis.localStorage;
	} catch {
		return null;
	}
}

// Parses persisted data and falls back to the established new-tab behavior.
export function parseBookmarkOpeningPreference(rawValue) {
	if (typeof rawValue !== "string") {
		return BOOKMARK_OPENING_NEW_TAB;
	}

	try {
		const value = JSON.parse(rawValue);
		if (
			!value ||
			typeof value !== "object" ||
			value.version !== BOOKMARK_OPENING_PREFERENCE_VERSION ||
			!VALID_PREFERENCES.has(value.preference)
		) {
			return BOOKMARK_OPENING_NEW_TAB;
		}
		return value.preference;
	} catch {
		return BOOKMARK_OPENING_NEW_TAB;
	}
}

// Reads the preference without allowing storage failures to affect navigation.
export function readBookmarkOpeningPreference(storage) {
	const target = resolveStorage(storage);
	if (!target) {
		return BOOKMARK_OPENING_NEW_TAB;
	}

	try {
		return parseBookmarkOpeningPreference(target.getItem(BOOKMARK_OPENING_PREFERENCE_KEY));
	} catch {
		return BOOKMARK_OPENING_NEW_TAB;
	}
}

// Persists a validated preference and reports whether the browser accepted it.
export function writeBookmarkOpeningPreference(preference, storage) {
	const target = resolveStorage(storage);
	if (!target || !VALID_PREFERENCES.has(preference)) {
		return false;
	}

	try {
		target.setItem(
			BOOKMARK_OPENING_PREFERENCE_KEY,
			JSON.stringify({ version: BOOKMARK_OPENING_PREFERENCE_VERSION, preference }),
		);
		return true;
	} catch {
		return false;
	}
}

// Converts the preference into native anchor behavior without intercepting clicks.
export function getBookmarkLinkTarget(preference) {
	return preference === BOOKMARK_OPENING_NEW_TAB ? "_blank" : undefined;
}
