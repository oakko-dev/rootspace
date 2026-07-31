import "./globals.css";
import AppShell from "@/components/app-shell";

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
