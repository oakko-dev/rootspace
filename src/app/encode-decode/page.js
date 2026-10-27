import EncodeDecodeTool from "@/components/encode-decode-tool";
import PageHeader from "@/components/page-header";

export default function EncodeDecodePage() {
	return (
		<>
			<PageHeader eyebrow="rootspace / tool 05" title="Encode / decode" />
			<EncodeDecodeTool />
		</>
	);
}
