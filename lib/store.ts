// ---------------------------------------------------------------------------
// Server-side persistence backed by Vercel Blob.
// Source of truth = one JSON blob per dialogue at `dialogues/{id}.json`.
// If BLOB_READ_WRITE_TOKEN is not set, storageEnabled() is false and the API
// returns 503 so the client falls back to localStorage.
// ---------------------------------------------------------------------------

import { list, put, del } from "@vercel/blob";
import type { DialogueGraph, DialogueMeta } from "./types";

const PREFIX = "dialogues/";

export function storageEnabled(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function listGraphs(): Promise<DialogueMeta[]> {
  const { blobs } = await list({ prefix: PREFIX });
  const metas = await Promise.all(
    blobs.map(async (b) => {
      try {
        const res = await fetch(b.url, { cache: "no-store" });
        const g = (await res.json()) as DialogueGraph;
        return { id: g.id, title: g.title, updatedAt: g.updatedAt };
      } catch {
        return null;
      }
    })
  );
  return metas.filter((m): m is DialogueMeta => m !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getGraph(id: string): Promise<DialogueGraph | null> {
  const { blobs } = await list({ prefix: `${PREFIX}${id}.json` });
  const blob = blobs.find((b) => b.pathname === `${PREFIX}${id}.json`);
  if (!blob) return null;
  const res = await fetch(blob.url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as DialogueGraph;
}

export async function saveGraph(graph: DialogueGraph): Promise<void> {
  graph.updatedAt = Date.now();
  // Overwrite by removing any existing blob first (older @vercel/blob throws
  // on re-put of the same pathname). Autosave is single-user so this is safe.
  await deleteGraph(graph.id).catch(() => {});
  await put(`${PREFIX}${graph.id}.json`, JSON.stringify(graph), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

export async function deleteGraph(id: string): Promise<void> {
  const { blobs } = await list({ prefix: `${PREFIX}${id}.json` });
  await Promise.all(blobs.map((b) => del(b.url)));
}
