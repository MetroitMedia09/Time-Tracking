import Sidebar from "@/components/Sidebar";
import ThemeProvider from "@/components/ThemeProvider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </ThemeProvider>
  );
}
