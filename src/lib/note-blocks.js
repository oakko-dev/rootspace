const FENCE = /^```(?<lang>.*)$/u;

// Splits note text into plain text and ``` fenced code blocks; an unclosed fence runs to the end.
export function splitNoteBlocks(body) {
	const blocks = [];
	let current = { type: "text", lines: [] };
	for (const line of body.split("\n")) {
		const fence = line.trim().match(FENCE);
		if (!fence) {
			current.lines.push(line);
			continue;
		}
		if (current.lines.length || current.type === "code") {
			blocks.push(current);
		}
		current =
			current.type === "code"
				? { type: "text", lines: [] }
				: { type: "code", lang: fence.groups.lang.trim(), lines: [] };
	}
	if (current.lines.length || current.type === "code") {
		blocks.push(current);
	}
	return blocks.map(({ lines, ...block }) => ({ ...block, content: lines.join("\n") }));
}
