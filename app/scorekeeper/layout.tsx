import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/app/admin/sign-out-button";

export default async function ScorekeeperLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-[var(--accent)] font-black text-sm">🏀 Scorekeeper</span>
          <div className="flex items-center gap-3">
            <span className="text-[var(--muted)] text-xs">{session.user.name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">{children}</main>
    </div>
  );
}
