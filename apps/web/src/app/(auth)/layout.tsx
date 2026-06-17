export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      id="main-content"
      className="min-h-screen flex items-center justify-center bg-muted/40"
    >
      <div className="w-full max-w-md px-4">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            WhatsApp AI Platform
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-powered business automation
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
