import DateConverterTool from "@/components/date-converter-tool";

export default function DateConverterPage() {
  return (
    <>
      <header className="border-b border-[#343b2f] pb-5">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#65d9f2]">
          rootspace / tool 01
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-[#eef4e8] sm:text-4xl">
          Date converter
        </h1>
      </header>
      <DateConverterTool />
    </>
  );
}
