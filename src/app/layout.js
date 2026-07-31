import "./globals.css";
import AppShell from "@/components/app-shell";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Rootspace",
  description: "Personal tools for developer and life admin work.",
  icons: {
    icon: [{ url: "/favicon-white.svg", type: "image/svg+xml" }],
    shortcut: "/favicon-white.svg",
  },
};

export default async function RootLayout({ children }) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <AppShell currentUser={currentUser}>{children}</AppShell>
      </body>
    </html>
  );
}
