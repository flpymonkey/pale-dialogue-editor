// ---------------------------------------------------------------------------
// Client-side persistence facade.
// Tries the Vercel-backed API first; if storage is disabled (503) or the
// request fails, transparently falls back to browser localStorage. This makes
// the app fully functional the moment it's deployed, and upgrades to cloud
// save automatically once a Blob store is connected.
// ---------------------------------------------------------------------------

import { emptyGraph, type DialogueGraph, type DialogueMeta } from "./types";

const LS_PREFIX = "disco:dialogue:";
const LS_INDEX = "disco:index";

export type StorageMode = "cloud" | "local";

function lsIndex(): DialogueMeta[] {
  try { return JSON.parse(localStorage.getItem(LS_INDEX) || "[]"); }
  catch { return []; }
}
function setLsIndex(metas: DialogueMeta[]) {
  localStorage.setItem(LS_INDEX, JSON.stringify(metas));
}
function lsSave(g: DialogueGraph) {
  localStorage.setItem(LS_PREFIX + g.id, JSON.stringify(g));
  const idx = lsIndex().filter((m) => m.id !== g.id);
  idx.unshift({ id: g.id, title: g.title, updatedAt: g.updatedAt });
  setLsIndex(idx);
}

export async function listDialogues(): Promise<{ metas: DialogueMeta[]; mode: StorageMode }> {
  try {
    const res = await fetch("/api/dialogues", { cache: "no-store" });
    if (res.ok) return { metas: await res.json(), mode: "cloud" };
  } catch { /* fall through */ }
  return { metas: lsIndex().sort((a, b) => b.updatedAt - a.updatedAt), mode: "local" };
}

export async function createDialogue(title: string): Promise<DialogueGraph> {
  try {
    const res = await fetch("/api/dialogues", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) return await res.json();
  } catch { /* fall through */ }
  const g = emptyGraph("d_" + Math.random().toString(36).slice(2, 10), title);
  lsSave(g);
  return g;
}

export async function loadDialogue(id: string): Promise<DialogueGraph | null> {
  try {
    const res = await fetch(`/api/dialogues/${id}`, { cache: "no-store" });
    if (res.ok) return await res.json();
    if (res.status === 404) return null;
  } catch { /* fall through */ }
  const raw = localStorage.getItem(LS_PREFIX + id);
  return raw ? (JSON.parse(raw) as DialogueGraph) : null;
}

export async function saveDialogue(g: DialogueGraph): Promise<StorageMode> {
  g.updatedAt = Date.now();
  // Always mirror locally for resilience.
  lsSave(g);
  try {
    const res = await fetch(`/api/dialogues/${g.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(g),
    });
    if (res.ok) return "cloud";
  } catch { /* fall through */ }
  return "local";
}

export async function deleteDialogue(id: string): Promise<void> {
  try { await fetch(`/api/dialogues/${id}`, { method: "DELETE" }); }
  catch { /* ignore */ }
  localStorage.removeItem(LS_PREFIX + id);
  setLsIndex(lsIndex().filter((m) => m.id !== id));
}
