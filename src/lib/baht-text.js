const DIGITS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const PLACES = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
const MILLION = 1_000_000;
const SATANG_PER_BAHT = 100;
const AMOUNT_PATTERN = /^(?<sign>-)?(?<integerPart>\d+)(?:\.(?<fractionPart>\d*))?$/u;
const IGNORED_CHARACTERS_PATTERN = /[\s,]/gu;

// Reads 0-999,999. A trailing 1 becomes "เอ็ด" when anything comes before it (11, 101, 1,000,001).
function readGroup(value, hasHigherPart) {
	const digits = [...String(value)].map(Number);
	let text = "";

	for (const [index, digit] of digits.entries()) {
		const place = digits.length - 1 - index;

		if (digit === 0) {
			continue;
		}

		if (place === 1 && digit === 1) {
			text += "สิบ";
		} else if (place === 1 && digit === 2) {
			text += "ยี่สิบ";
		} else if (place === 0 && digit === 1 && (hasHigherPart || digits.length > 1)) {
			text += "เอ็ด";
		} else {
			text += DIGITS[digit] + PLACES[place];
		}
	}

	return text;
}

function readInteger(value) {
	if (value < MILLION) {
		return readGroup(value, false);
	}

	const lower = value % MILLION;

	return `${readInteger(Math.floor(value / MILLION))}ล้าน${lower ? readGroup(lower, true) : ""}`;
}

export function toBahtText(value) {
	const match = AMOUNT_PATTERN.exec(String(value ?? "").replace(IGNORED_CHARACTERS_PATTERN, ""));

	if (!match) {
		return { ok: false, error: "Enter an amount like 1250.50. Commas are ignored." };
	}

	const { sign, integerPart, fractionPart = "" } = match.groups;
	let baht = Number(integerPart);
	// Round half up to whole satang using the digits as written, avoiding float error.
	const fraction = fractionPart.padEnd(3, "0");
	let satang = Number(fraction.slice(0, 2)) + (Number(fraction[2]) >= 5 ? 1 : 0);

	if (satang === SATANG_PER_BAHT) {
		baht += 1;
		satang = 0;
	}

	if (!Number.isSafeInteger(baht)) {
		return { ok: false, error: "That amount is too large." };
	}

	if (baht === 0 && satang === 0) {
		return { ok: true, text: "ศูนย์บาทถ้วน" };
	}

	const bahtText = baht > 0 ? `${readInteger(baht)}บาท` : "";
	const satangText = satang > 0 ? `${readGroup(satang, false)}สตางค์` : "ถ้วน";

	return { ok: true, text: `${sign ? "ลบ" : ""}${bahtText}${satangText}` };
}
