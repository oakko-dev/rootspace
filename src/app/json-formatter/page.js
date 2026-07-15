import JsonFormatterTool from "@/components/json-formatter-tool";

export default function JsonFormatterPage() {
  return (
    <>
      <header className="border-b border-[#343b2f] pb-5">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#65d9f2]">
          rootspace / tool 03
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-[#eef4e8] sm:text-4xl">
          JSON formatter
        </h1>
      </header>
      <JsonFormatterTool />
    </>
  );
}
