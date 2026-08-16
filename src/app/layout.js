// The root layout owns shared typography so every route inherits one font contract.
import { Google_Sans } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/app-shell";

const googleSans = Google_Sans({
	variable: "--font-google-sans",
	subsets: ["latin", "thai"],
	weight: "variable",
	style: "normal",
	display: "swap",
	fallback: ["Arial", "Helvetica", "sans-serif"],
});

export const metadata = {
	title: "Rootspace",
	description: "Personal tools for developer and life admin work.",
	icons: {
		icon: [{ url: "/favicon-white.svg", type: "image/svg+xml" }],
		shortcut: "/favicon-white.svg",
	},
};

export default function RootLayout({ children }) {
	return (
		<html lang="en" className={`${googleSans.variable} h-full font-sans antialiased`}>
			<body className="min-h-full">
				<AppShell>{children}</AppShell>
			</body>
		</html>
	);
}
