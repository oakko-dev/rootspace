import IdGeneratorTool from "@/components/id-generator-tool";
import PageHeader from "@/components/page-header";

export default function IdGeneratorPage() {
	return (
		<>
			<PageHeader eyebrow="rootspace / tool 04" title="ID generator" />
			<IdGeneratorTool />
		</>
	);
}
