import assert from "node:assert/strict";
import test from "node:test";

import { convertDateInput } from "./date-converter.js";

test("converts ISO input into stable date formats", () => {
  const result = convertDateInput("2024-01-02T03:04:05.000Z");

  assert.equal(result.ok, true);
  assert.equal(result.inputType, "date string");
  assert.equal(result.iso, "2024-01-02T03:04:05.000Z");
  assert.equal(result.utc, "Tue, 02 Jan 2024 03:04:05 GMT");
  assert.equal(result.unixSeconds, 1704164645);
  assert.equal(result.unixMilliseconds, 1704164645000);
  assert.equal(typeof result.local, "string");
});

test("treats a 10 digit integer as Unix seconds", () => {
  const result = convertDateInput("1704164645");

  assert.equal(result.ok, true);
  assert.equal(result.inputType, "unix seconds");
  assert.equal(result.iso, "2024-01-02T03:04:05.000Z");
  assert.equal(result.unixSeconds, 1704164645);
  assert.equal(result.unixMilliseconds, 1704164645000);
});

test("treats a 13 digit integer as Unix milliseconds", () => {
  const result = convertDateInput("1704164645000");

  assert.equal(result.ok, true);
  assert.equal(result.inputType, "unix milliseconds");
  assert.equal(result.iso, "2024-01-02T03:04:05.000Z");
  assert.equal(result.unixSeconds, 1704164645);
  assert.equal(result.unixMilliseconds, 1704164645000);
});

test("returns a validation error for empty input", () => {
  const result = convertDateInput("   ");

  assert.deepEqual(result, {
    ok: false,
    error: "Enter a date, ISO string, or Unix timestamp.",
  });
});

test("returns a validation error for invalid input", () => {
  const result = convertDateInput("next thursday after lunch-ish");

  assert.deepEqual(result, {
    ok: false,
    error: "Could not parse that date.",
  });
});
