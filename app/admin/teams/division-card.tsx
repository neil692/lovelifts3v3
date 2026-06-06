"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTeam, updateTeam, deleteTeam, renameDivision } from "@/actions/teams";
import { GeneratePoolsButton } from "@/app/admin/pools/generate-pools-button";

type PoolTeamEntry = { id: string; seed: number; team: { id: string; name: string } };
type Pool = { id: string; name: string; teams: PoolTeamEntry[] };
type Team = { id: string; name: string; members: string | null; contactName: string | null; contactPhone: string | null; divisionId: string };

type DivisionData = {
  id: string;
  name: string;
  pools: Pool[];
  teams: Team[];
};

export function DivisionCard({ division }: { division: DivisionData }) {
  const router = useRouter();
  const [renamingDiv, setRenamingDiv] = useState(false);
  const [divName, setDivName] = useState(division.name);
  const [renameSaving, setRenameSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editMembers, setEditMembers] = useState("");
  const [editCaptain, setEditCaptain] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMembers, setNewMembers] = useState("");
  const [newCaptain, setNewCaptain] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!divName.trim()) return;
    setRenameSaving(true);
    await renameDivision(division.id, divName);
    setRenameSaving(false);
    setRenamingDiv(false);
    router.refresh();
  }

  function startEdit(team: Team) {
    setEditingId(team.id);
    setEditName(team.name);
    setEditMembers(team.members ?? "");
    setEditCaptain(team.contactName ?? "");
    setEditPhone(team.contactPhone ?? "");
  }

  async function handleSave(teamId: string) {
    setSaving(true);
    await updateTeam(teamId, { name: editName, divisionId: division.id, members: editMembers, contactName: editCaptain, contactPhone: editPhone });
    setEditingId(null);
    setSaving(false);
    router.refresh();
  }

  async function handleDelete(team: Team) {
    if (!confirm(`Delete "${team.name}"?`)) return;
    await deleteTeam(team.id);
    router.refresh();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    await addTeam({ name: newName, divisionId: division.id, members: newMembers, contactName: newCaptain, contactPhone: newPhone });
    setNewName("");
    setNewMembers("");
    setNewCaptain("");
    setNewPhone("");
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface-2)]">
        <div className="flex items-center gap-2 min-w-0">
          {renamingDiv ? (
            <form onSubmit={handleRename} className="flex items-center gap-2">
              <input
                value={divName}
                onChange={(e) => setDivName(e.target.value)}
                className="input text-sm font-bold py-1 px-2 w-44"
                autoFocus
              />
              <button type="submit" disabled={renameSaving} className="btn-primary text-xs py-1 px-2">
                {renameSaving ? "…" : "Save"}
              </button>
              <button type="button" onClick={() => { setRenamingDiv(false); setDivName(division.name); }} className="btn-ghost text-xs py-1 px-2">
                Cancel
              </button>
            </form>
          ) : (
            <>
              <span className="font-bold text-white text-sm">{divName}</span>
              <button
                onClick={() => setRenamingDiv(true)}
                className="text-[var(--muted)] hover:text-white transition-colors text-xs"
                title="Rename division"
              >
                ✎
              </button>
              <span className="text-[var(--muted)] text-xs">{division.teams.length} teams</span>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setEditOpen((o) => !o); setEditingId(null); }}
            className="btn-ghost text-xs py-1.5 px-3"
          >
            {editOpen ? "Done" : "Edit"}
          </button>
          {division.teams.length >= 2 && (
            <GeneratePoolsButton divisionId={division.id} />
          )}
        </div>
      </div>

      {/* Edit panel */}
      {editOpen && (
        <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 space-y-4">
          {division.teams.length > 0 && (
            <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] overflow-hidden">
              {division.teams.map((team) =>
                editingId === team.id ? (
                  <div key={team.id} className="px-3 py-3 space-y-2 bg-[var(--surface-2)]">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Team name"
                      className="input text-sm w-full"
                    />
                    <textarea
                      value={editMembers}
                      onChange={(e) => setEditMembers(e.target.value)}
                      placeholder="Team members (one per line)"
                      rows={3}
                      className="input text-sm w-full resize-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={editCaptain}
                        onChange={(e) => setEditCaptain(e.target.value)}
                        placeholder="Captain name"
                        className="input text-sm"
                      />
                      <input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="Phone"
                        className="input text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSave(team.id)} disabled={saving} className="btn-primary text-xs py-1.5 px-3">Save</button>
                      <button onClick={() => setEditingId(null)} className="btn-ghost text-xs py-1.5 px-3">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div key={team.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-[var(--surface-2)] transition-colors">
                    <div>
                      <span className="text-white text-sm font-medium">{team.name}</span>
                      {team.contactName && <span className="text-[var(--muted)] text-xs ml-2">{team.contactName}</span>}
                      {team.contactPhone && <span className="text-[var(--muted)] text-xs ml-2">{team.contactPhone}</span>}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => startEdit(team)} className="text-xs text-[var(--muted)] hover:text-white transition-colors">Edit</button>
                      <button onClick={() => handleDelete(team)} className="text-xs text-[var(--muted)] hover:text-red-400 transition-colors">Delete</button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          <form onSubmit={handleAdd} className="space-y-2">
            <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">Add Team</p>
            <input
              placeholder="Team name *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="input text-sm w-full"
            />
            <textarea
              placeholder="Team members (one per line)"
              value={newMembers}
              onChange={(e) => setNewMembers(e.target.value)}
              rows={3}
              className="input text-sm w-full resize-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Captain name"
                value={newCaptain}
                onChange={(e) => setNewCaptain(e.target.value)}
                className="input text-sm"
              />
              <input
                placeholder="Phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="input text-sm"
              />
            </div>
            <button type="submit" disabled={adding || !newName.trim()} className="btn-primary text-sm">
              {adding ? "Adding…" : "Add Team"}
            </button>
          </form>
        </div>
      )}

      {/* Pools */}
      {division.pools.length > 0 && (
        <div className="bg-[var(--surface)] px-4 py-3 space-y-3">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">Pools</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {division.pools.map((pool) => (
              <div key={pool.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <p className="text-xs font-semibold text-[var(--accent)] mb-2">{pool.name}</p>
                <ul className="space-y-1">
                  {pool.teams.map((pt) => (
                    <li key={pt.id} className="text-sm text-white">{pt.team.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
