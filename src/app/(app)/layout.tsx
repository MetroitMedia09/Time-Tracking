import Sidebar from "@/components/Sidebar";
import ThemeProvider from "@/components/ThemeProvider";
import { getCurrentUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar username={user?.username ?? null} />
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </ThemeProvider>
  );
}
