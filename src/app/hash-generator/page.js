import HashGeneratorTool from "@/components/hash-generator-tool";
import PageHeader from "@/components/page-header";

export default function HashGeneratorPage() {
	return (
		<>
			<PageHeader eyebrow="rootspace / tool 07" title="Hash generator" />
			<HashGeneratorTool />
		</>
	);
}
