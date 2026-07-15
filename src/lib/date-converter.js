const INTEGER_PATTERN = /^-?\d+$/;

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
    unixSeconds: Math.floor(unixMilliseconds / 1000),
    unixMilliseconds,
  };
}

function parseInput(input) {
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
