export function formatJson(input, action) {
	if (!input.trim()) {
		return {
			ok: false,
			error: "Enter JSON to format.",
		};
	}

	try {
		const value = JSON.parse(input);

		return {
			ok: true,
			output: action === "minify" ? JSON.stringify(value) : JSON.stringify(value, null, 2),
		};
	} catch {
		return {
			ok: false,
			error: "Could not parse that JSON.",
		};
	}
}
