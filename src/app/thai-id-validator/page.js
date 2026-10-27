import PageHeader from "@/components/page-header";
import ThaiIdValidatorTool from "@/components/thai-id-validator-tool";

export default function ThaiIdValidatorPage() {
	return (
		<>
			<PageHeader eyebrow="rootspace / tool 09" title="Thai ID validator" />
			<ThaiIdValidatorTool />
		</>
	);
}
