export default function ScoremasterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col sk-theme">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <span className="text-[var(--accent)] font-black text-sm">🏀 Scorekeeper</span>
        </div>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">{children}</main>
    </div>
  );
}
