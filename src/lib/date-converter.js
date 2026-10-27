const INTEGER_PATTERN = /^-?\d+$/u;
// A leading year of 2400-2999 is read as Buddhist Era (e.g. 2567-01-02).
const BUDDHIST_YEAR_PATTERN = /^(?<year>2[4-9]\d{2})(?<rest>-.*)?$/u;
const BUDDHIST_ERA_OFFSET = 543;

export function convertDateInput(value) {
	const input = String(value ?? "").trim();

	if (!input) {
		return {
			ok: false,
			error: "Enter a date, ISO string, or Unix timestamp.",
		};
	}

	const parsed = parseInput(input);

	if (Number.isNaN(parsed.date.getTime())) {
		return {
			ok: false,
			error: "Could not parse that date.",
		};
	}

	const unixMilliseconds = parsed.date.getTime();

	return {
		ok: true,
		inputType: parsed.inputType,
		iso: parsed.date.toISOString(),
		utc: parsed.date.toUTCString(),
		local: parsed.date.toLocaleString(),
		thai: parsed.date.toLocaleString("th-TH-u-ca-buddhist", {
			dateStyle: "long",
			timeStyle: "medium",
		}),
		buddhistYear: parsed.date.getFullYear() + BUDDHIST_ERA_OFFSET,
		unixSeconds: Math.floor(unixMilliseconds / 1000),
		unixMilliseconds,
	};
}

function parseInput(input) {
	const buddhistMatch = BUDDHIST_YEAR_PATTERN.exec(input);

	if (buddhistMatch) {
		const { year, rest = "" } = buddhistMatch.groups;

		return {
			inputType: "buddhist era date",
			date: new Date(`${Number(year) - BUDDHIST_ERA_OFFSET}${rest}`),
		};
	}

	if (!INTEGER_PATTERN.test(input)) {
		return {
			inputType: "date string",
			date: new Date(input),
		};
	}

	const signlessLength = input.replace("-", "").length;
	const timestamp = Number(input);

	if (signlessLength <= 10) {
		return {
			inputType: "unix seconds",
			date: new Date(timestamp * 1000),
		};
	}

	return {
		inputType: "unix milliseconds",
		date: new Date(timestamp),
	};
}
