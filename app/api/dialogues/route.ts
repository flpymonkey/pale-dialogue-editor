import { NextResponse } from "next/server";
import { listGraphs, saveGraph, storageEnabled } from "@/lib/store";
import { emptyGraph } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/dialogues -> list metadata
export async function GET() {
  if (!storageEnabled()) {
    return NextResponse.json({ error: "storage-disabled" }, { status: 503 });
  }
  const metas = await listGraphs();
  return NextResponse.json(metas);
}

// POST /api/dialogues { title } -> create + return the new graph
export async function POST(req: Request) {
  if (!storageEnabled()) {
    return NextResponse.json({ error: "storage-disabled" }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const id = "d_" + Math.random().toString(36).slice(2, 10);
  const graph = emptyGraph(id, body.title || "Untitled dialogue");
  await saveGraph(graph);
  return NextResponse.json(graph, { status: 201 });
}
