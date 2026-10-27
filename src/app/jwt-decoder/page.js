import JwtDecoderTool from "@/components/jwt-decoder-tool";
import PageHeader from "@/components/page-header";

export default function JwtDecoderPage() {
	return (
		<>
			<PageHeader eyebrow="rootspace / tool 06" title="JWT decoder" />
			<JwtDecoderTool />
		</>
	);
}
