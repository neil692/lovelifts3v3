"use client";

import { useState } from "react";
import { cascadeCourt } from "@/actions/schedule";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CascadeButton({ courtId, courtName }: { courtId: string; courtName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [delay, setDelay] = useState("15");

  async function handle() {
    setLoading(true);
    const fromTime = new Date().toISOString();
    const result = await cascadeCourt(courtId, fromTime, parseInt(delay));
    setLoading(false);
    if (result?.error) {
      toast.error(result.error as string);
    } else {
      toast.success(`${courtName}: pushed ${result?.updated} games by ${delay} min`);
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <span className="text-white text-xs font-medium">{courtName}</span>
      <select
        value={delay}
        onChange={(e) => setDelay(e.target.value)}
        className="bg-transparent text-[var(--muted)] text-xs focus:outline-none"
      >
        <option value="15">+15 min</option>
        <option value="30">+30 min</option>
        <option value="45">+45 min</option>
      </select>
      <button
        onClick={handle}
        disabled={loading}
        className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-semibold transition-colors"
      >
        {loading ? "…" : "Push"}
      </button>
    </div>
  );
}
