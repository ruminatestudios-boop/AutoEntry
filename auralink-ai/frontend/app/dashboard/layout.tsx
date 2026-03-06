export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#18181b" }}>
      {children}
    </div>
  );
}
