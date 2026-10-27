import PageHeader from "@/components/page-header";
import PasswordGeneratorTool from "@/components/password-generator-tool";

export default function PasswordGeneratorPage() {
	return (
		<>
			<PageHeader eyebrow="rootspace / tool 08" title="Password generator" />
			<PasswordGeneratorTool />
		</>
	);
}
