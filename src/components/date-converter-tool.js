"use client";

import { useMemo, useState } from "react";
import { convertDateInput } from "@/lib/date-converter";
import CopyButton from "@/components/copy-button";

const sampleInput = "2024-01-02T03:04:05.000Z";

export default function DateConverterTool() {
  const [input, setInput] = useState(sampleInput);
  const [copiedKey, setCopiedKey] = useState("");
  const result = useMemo(() => convertDateInput(input), [input]);

  const outputs = result.ok
    ? [
        ["Input type", result.inputType],
        ["Local", result.local],
        ["UTC", result.utc],
        ["ISO", result.iso],
        ["Unix seconds", result.unixSeconds],
        ["Unix milliseconds", result.unixMilliseconds],
      ]
    : [];

  async function handleCopy(key, value) {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(""), 1500);
    } catch {
      setCopiedKey("");
    }
  }

  return (
    <section className="grid gap-5 rounded-lg border border-[#343b2f] bg-[#1b1f18] p-4 lg:grid-cols-[360px_1fr] lg:p-5">
      <div className="flex flex-col gap-4">
        <div>
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.16em] text-[#65d9f2]">
            Tool 01
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[#eef4e8]">
            Date converter
          </h2>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#eef4e8]">
          Date input
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-h-11 rounded-md border border-[#394033] bg-[#11130f] px-3 py-2 font-mono text-sm text-[#eef4e8] outline-none transition placeholder:text-[#87917d] focus:border-[#65d9f2] focus:ring-2 focus:ring-[#65d9f2]/20"
            placeholder="ISO date, date text, Unix seconds, or Unix ms"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setInput(new Date().toISOString())}
            className="rounded-md bg-[#c8ff65] px-3 py-2 text-sm font-semibold text-[#11130f] transition hover:bg-[#d8ff8c]"
          >
            Use now
          </button>
          <button
            type="button"
            onClick={() => setInput(sampleInput)}
            className="rounded-md border border-[#394033] px-3 py-2 text-sm font-semibold text-[#aab5a0] transition hover:border-[#65d9f2] hover:text-[#65d9f2]"
          >
            Reset sample
          </button>
        </div>

        {!result.ok ? (
          <p className="rounded-md border border-[#f7c65b]/40 bg-[#f7c65b]/10 px-3 py-2 text-sm font-medium text-[#f7c65b]">
            {result.error}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {outputs.map(([label, value]) => (
          <div
            key={label}
            className="rounded-md border border-[#343b2f] bg-[#11130f] p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#87917d]">
                {label}
              </p>
              <CopyButton
                copied={copiedKey === `date-${label}`}
                label={`Copy ${label}`}
                onClick={() => handleCopy(`date-${label}`, value)}
              />
            </div>
            <p className="mt-2 break-words font-mono text-sm text-[#eef4e8]">
              {String(value)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
