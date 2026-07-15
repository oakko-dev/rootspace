"use client";

import { useState } from "react";
import CopyButton from "@/components/copy-button";
import { generateThaiName } from "@/lib/thai-name-generator";

export default function ThaiNameGeneratorTool() {
  const [thaiName, setThaiName] = useState(null);
  const [thaiNameData, setThaiNameData] = useState(null);
  const [thaiNameError, setThaiNameError] = useState("");
  const [isLoadingThaiName, setIsLoadingThaiName] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");

  async function handleGenerateThaiName() {
    setIsLoadingThaiName(true);
    setThaiNameError("");

    try {
      const data =
        thaiNameData ??
        (await fetch("/thai-names.json").then((response) => {
          if (!response.ok) {
            throw new Error("Could not load thai names.");
          }

          return response.json();
        }));

      if (!thaiNameData) {
        setThaiNameData(data);
      }

      setThaiName(generateThaiName(data));
    } catch (error) {
      setThaiNameError(
        error instanceof Error ? error.message : "Could not load thai names."
      );
    } finally {
      setIsLoadingThaiName(false);
    }
  }

  async function handleCopy(key, value) {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(""), 1500);
    } catch {
      setThaiNameError("Could not copy to clipboard.");
    }
  }

  return (
    <section className="grid gap-5 rounded-lg border border-[#343b2f] bg-[#1b1f18] p-4 lg:grid-cols-[360px_1fr] lg:p-5">
      <div className="flex flex-col gap-4">
        <div>
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.16em] text-[#65d9f2]">
            Tool 02
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[#eef4e8]">
            Thai name generator
          </h2>
        </div>

        <p className="text-sm leading-6 text-[#aab5a0]">
          Pick a random Thai full name and nickname from the local name list.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGenerateThaiName}
            className="rounded-md bg-[#c8ff65] px-3 py-2 text-sm font-semibold text-[#11130f] transition hover:bg-[#d8ff8c] disabled:cursor-wait disabled:bg-[#87917d]"
            disabled={isLoadingThaiName}
          >
            {isLoadingThaiName ? "Generating..." : "Generate name"}
          </button>
        </div>

        {thaiNameError ? (
          <p className="rounded-md border border-[#f7c65b]/40 bg-[#f7c65b]/10 px-3 py-2 text-sm font-medium text-[#f7c65b]">
            {thaiNameError}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-[#343b2f] bg-[#11130f] p-3 sm:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#87917d]">
              Full name
            </p>
            <CopyButton
              copied={copiedKey === "thai-full-name"}
              label="Copy full name"
              onClick={() => handleCopy("thai-full-name", thaiName?.fullName ?? "")}
              disabled={!thaiName?.fullName}
            />
          </div>
          <p className="mt-2 break-words font-mono text-lg text-[#eef4e8]">
            {thaiName?.fullName ?? "Click generate to create a Thai name."}
          </p>
        </div>
        <div className="rounded-md border border-[#343b2f] bg-[#11130f] p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#87917d]">
              Nickname
            </p>
            <CopyButton
              copied={copiedKey === "thai-nickname"}
              label="Copy nickname"
              onClick={() => handleCopy("thai-nickname", thaiName?.nickname ?? "")}
              disabled={!thaiName?.nickname}
            />
          </div>
          <p className="mt-2 break-words font-mono text-sm text-[#eef4e8]">
            {thaiName?.nickname ?? "-"}
          </p>
        </div>
        <div className="rounded-md border border-[#343b2f] bg-[#11130f] p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#87917d]">
              Citizen number
            </p>
            <CopyButton
              copied={copiedKey === "thai-citizen-number"}
              label="Copy citizen number"
              onClick={() =>
                handleCopy("thai-citizen-number", thaiName?.citizenNumber ?? "")
              }
              disabled={!thaiName?.citizenNumber}
            />
          </div>
          <p className="mt-2 break-words font-mono text-sm text-[#eef4e8]">
            {thaiName?.citizenNumber ?? "-"}
          </p>
        </div>
        <div className="rounded-md border border-[#343b2f] bg-[#11130f] p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#87917d]">
              Combined
            </p>
            <CopyButton
              copied={copiedKey === "thai-combined"}
              label="Copy combined name"
              onClick={() => handleCopy("thai-combined", thaiName?.displayName ?? "")}
              disabled={!thaiName?.displayName}
            />
          </div>
          <p className="mt-2 break-words font-mono text-sm text-[#eef4e8]">
            {thaiName?.displayName ?? "-"}
          </p>
        </div>
      </div>
    </section>
  );
}
