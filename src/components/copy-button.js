"use client";

export default function CopyButton({
  copied,
  disabled = false,
  label,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-[#343b2f] p-2 text-[#aab5a0] transition hover:border-[#65d9f2] hover:text-[#65d9f2] disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={label}
      title={label}
      disabled={disabled}
    >
      {copied ? (
        <span className="text-[11px] font-semibold">Copied</span>
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}
