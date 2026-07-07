import { NextResponse } from "next/server";
import { deleteGraph, getGraph, saveGraph, storageEnabled } from "@/lib/store";
import type { DialogueGraph } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/dialogues/[id]
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!storageEnabled()) {
    return NextResponse.json({ error: "storage-disabled" }, { status: 503 });
  }
  const graph = await getGraph(params.id);
  if (!graph) return NextResponse.json({ error: "not-found" }, { status: 404 });
  return NextResponse.json(graph);
}

// PUT /api/dialogues/[id] -> save whole graph (autosave target)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!storageEnabled()) {
    return NextResponse.json({ error: "storage-disabled" }, { status: 503 });
  }
  const graph = (await req.json()) as DialogueGraph;
  graph.id = params.id;
  graph.version = (graph.version || 1) + 1;
  await saveGraph(graph);
  return NextResponse.json({ ok: true, version: graph.version, updatedAt: graph.updatedAt });
}

// DELETE /api/dialogues/[id]
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!storageEnabled()) {
    return NextResponse.json({ error: "storage-disabled" }, { status: 503 });
  }
  await deleteGraph(params.id);
  return NextResponse.json({ ok: true });
}
