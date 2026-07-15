import ThaiNameGeneratorTool from "@/components/thai-name-generator-tool";

export default function ThaiNameGeneratorPage() {
  return (
    <>
      <header className="border-b border-[#343b2f] pb-5">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#65d9f2]">
          rootspace / tool 02
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-[#eef4e8] sm:text-4xl">
          Thai name generator
        </h1>
      </header>
      <ThaiNameGeneratorTool />
    </>
  );
}
