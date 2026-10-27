const CITIZEN_ID_PATTERN = /^\d{13}$/u;
const SEPARATOR_PATTERN = /[\s-]/gu;

// Check digit for the first 12 digits of a Thai citizen ID (weights 13 down to 2, mod 11).
export function thaiCitizenChecksum(digits) {
	const weightedSum = digits
		.slice(0, 12)
		.reduce((sum, digit, index) => sum + digit * (13 - index), 0);

	return (11 - (weightedSum % 11)) % 10;
}

export function validateThaiCitizenId(value) {
	const id = String(value ?? "").replace(SEPARATOR_PATTERN, "");

	if (!CITIZEN_ID_PATTERN.test(id)) {
		return { ok: false, error: "Enter 13 digits. Spaces and dashes are ignored." };
	}

	const digits = [...id].map(Number);
	const expected = thaiCitizenChecksum(digits);

	return {
		ok: true,
		valid: digits[12] === expected,
		expected,
		formatted: `${id[0]}-${id.slice(1, 5)}-${id.slice(5, 10)}-${id.slice(10, 12)}-${id[12]}`,
	};
}
