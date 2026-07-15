"use client";

import { useState } from "react";
import CopyButton from "@/components/copy-button";
import { formatJson } from "@/lib/json-formatter";

const sampleInput = '{"name":"oak","tools":["date","json"],"active":true}';

export default function JsonFormatterTool() {
  const [input, setInput] = useState(sampleInput);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function handleFormat(action) {
    const result = formatJson(input, action);

    if (!result.ok) {
      setError(result.error);
      setOutput("");
      return;
    }

    setError("");
    setOutput(result.output);
  }

  async function handleCopy() {
    if (!output) {
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      setError("Could not copy to clipboard.");
    }
  }

  return (
    <section className="grid gap-5 rounded-lg border border-[#343b2f] bg-[#1b1f18] p-4 lg:grid-cols-[360px_1fr] lg:p-5">
      <div className="flex flex-col gap-4">
        <div>
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.16em] text-[#65d9f2]">
            Tool 03
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[#eef4e8]">
            JSON formatter
          </h2>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-[#eef4e8]">
          JSON input
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-h-56 rounded-md border border-[#394033] bg-[#11130f] px-3 py-2 font-mono text-sm text-[#eef4e8] outline-none transition placeholder:text-[#87917d] focus:border-[#65d9f2] focus:ring-2 focus:ring-[#65d9f2]/20"
            placeholder='{"name":"oak"}'
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleFormat("pretty")}
            className="rounded-md bg-[#c8ff65] px-3 py-2 text-sm font-semibold text-[#11130f] transition hover:bg-[#d8ff8c]"
          >
            Pretty
          </button>
          <button
            type="button"
            onClick={() => handleFormat("minify")}
            className="rounded-md border border-[#394033] px-3 py-2 text-sm font-semibold text-[#aab5a0] transition hover:border-[#65d9f2] hover:text-[#65d9f2]"
          >
            Minify
          </button>
        </div>

        {error ? (
          <p className="rounded-md border border-[#f7c65b]/40 bg-[#f7c65b]/10 px-3 py-2 text-sm font-medium text-[#f7c65b]">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-[#343b2f] bg-[#11130f] p-3">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#87917d]">
            Output
          </p>
          <CopyButton
            copied={copied}
            label="Copy output"
            onClick={handleCopy}
            disabled={!output}
          />
        </div>
        <textarea
          value={output}
          readOnly
          className="min-h-72 rounded-md border border-[#343b2f] bg-[#171a14] px-3 py-2 font-mono text-sm text-[#eef4e8] outline-none placeholder:text-[#87917d]"
          placeholder="Formatted JSON will appear here."
        />
      </div>
    </section>
  );
}
