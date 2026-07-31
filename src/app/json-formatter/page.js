import JsonFormatterTool from "@/components/json-formatter-tool";
import PageHeader from "@/components/page-header";

export default function JsonFormatterPage() {
  return (
    <>
      <PageHeader eyebrow="rootspace / tool 03" title="JSON formatter" />
      <JsonFormatterTool />
    </>
  );
}
