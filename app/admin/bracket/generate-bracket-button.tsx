"use client";

import { useState } from "react";
import { generateBracket } from "@/actions/bracket";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function GenerateBracketButton({
  divisionId,
  disabled,
}: {
  divisionId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    const result = await generateBracket(divisionId);
    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(`Bracket generated: ${result?.games} games`);
      router.refresh();
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading || disabled}
      className="btn-primary text-xs py-1.5 px-3 disabled:opacity-40"
    >
      {loading ? "Generating…" : "Generate Bracket"}
    </button>
  );
}
