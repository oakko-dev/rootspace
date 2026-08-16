import DateConverterTool from "@/components/date-converter-tool";
import PageHeader from "@/components/page-header";

export default function DateConverterPage() {
	return (
		<>
			<PageHeader eyebrow="rootspace / tool 01" title="Date converter" />
			<DateConverterTool />
		</>
	);
}
