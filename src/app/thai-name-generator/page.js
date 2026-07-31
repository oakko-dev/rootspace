import ThaiNameGeneratorTool from "@/components/thai-name-generator-tool";
import PageHeader from "@/components/page-header";

export default function ThaiNameGeneratorPage() {
  return (
    <>
      <PageHeader eyebrow="rootspace / tool 02" title="Thai name generator" />
      <ThaiNameGeneratorTool />
    </>
  );
}
