/**
 * Parses the plain-text representation used by planner money fields.
 * Empty input is represented as null so callers can distinguish it from zero.
 * @param {string|number} value - The raw or numeric money value to parse.
 * @returns {number|null} The non-negative numeric value, or null when invalid.
 */
export function parseMoneyInput(value) {
	if (typeof value === "number") {
		return Number.isFinite(value) && value >= 0 ? value : null;
	}
	if (typeof value !== "string") {
		return null;
	}

	const input = value.trim();
	if (!input) {
		return null;
	}
	if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/u.test(input)) {
		return null;
	}

	const parsed = Number(input.replaceAll(",", ""));
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Formats a valid non-negative money value with thousands separators.
 * @param {string|number} value - The money value to format.
 * @returns {string} The comma-separated value, or an empty string when invalid.
 */
export function formatMoneyInput(value) {
	const parsed = parseMoneyInput(value);
	return parsed === null ? "" : parsed.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
