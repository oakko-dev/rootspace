import assert from "node:assert/strict";
import test from "node:test";

import { validateEmailPassword } from "./auth-validation.js";

test("normalizes valid email/password form input", () => {
  const formData = new FormData();
  formData.set("email", "  Oakko@Example.COM ");
  formData.set("password", "secret1");

  assert.deepEqual(validateEmailPassword(formData), {
    ok: true,
    email: "oakko@example.com",
    password: "secret1",
  });
});

test("rejects invalid email input", () => {
  const formData = new FormData();
  formData.set("email", "nope");
  formData.set("password", "secret1");

  assert.deepEqual(validateEmailPassword(formData), {
    ok: false,
    message: "Enter a valid email address.",
  });
});

test("rejects short passwords", () => {
  const formData = new FormData();
  formData.set("email", "oakko@example.com");
  formData.set("password", "12345");

  assert.deepEqual(validateEmailPassword(formData), {
    ok: false,
    message: "Password must be at least 6 characters.",
  });
});
