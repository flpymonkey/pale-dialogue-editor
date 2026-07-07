"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listDialogues, createDialogue, deleteDialogue, type StorageMode,
} from "@/lib/client";
import type { DialogueMeta } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [metas, setMetas] = useState<DialogueMeta[]>([]);
  const [mode, setMode] = useState<StorageMode>("local");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const { metas, mode } = await listDialogues();
    setMetas(metas);
    setMode(mode);
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  async function onCreate() {
    const title = prompt("New dialogue title:", "Whirling-in-Rags, Room 1");
    if (!title) return;
    const g = await createDialogue(title);
    router.push(`/editor/${g.id}`);
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this dialogue?")) return;
    await deleteDialogue(id);
    refresh();
  }

  return (
    <>
      <div className="topbar">
        <h1>PALE — Dialogue Editor</h1>
        <span className={`pill ${mode}`}>
          {mode === "cloud" ? "Vercel Blob" : "Local (browser)"}
        </span>
        <div className="spacer" />
        <button className="primary" onClick={onCreate}>+ New dialogue</button>
      </div>

      <div className="wrap">
        {loading && <p className="mini">Loading…</p>}
        {!loading && metas.length === 0 && (
          <p className="mini">No dialogues yet. Create one to begin.</p>
        )}
        {metas.map((m) => (
          <div key={m.id} className="card">
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => router.push(`/editor/${m.id}`)}>
              <div className="title">{m.title}</div>
              <div className="meta">edited {new Date(m.updatedAt).toLocaleString()}</div>
            </div>
            <button onClick={() => router.push(`/editor/${m.id}`)}>Open</button>
            <button className="danger" onClick={() => onDelete(m.id)}>Delete</button>
          </div>
        ))}
        {mode === "local" && (
          <p className="mini" style={{ marginTop: 24 }}>
            Storage note: no Blob store connected, so dialogues are saved in this
            browser only. Connect Vercel Blob (Storage → Create → Blob) and redeploy
            to sync across devices.
          </p>
        )}
      </div>
    </>
  );
}
