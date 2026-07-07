"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ReactFlow, Background, Controls, MiniMap,
  applyNodeChanges, applyEdgeChanges, addEdge,
  type Node, type Edge, type Connection,
  type NodeChange, type EdgeChange,
} from "@xyflow/react";
import { nodeTypes } from "./nodes";
import { NodeInspector, EdgeInspector } from "./Inspector";
import { StatePanel } from "./StatePanel";
import { Playtest } from "./Playtest";
import { loadDialogue, saveDialogue, type StorageMode } from "@/lib/client";
import type { DialogueGraph, DialogueNode, NodeType } from "@/lib/types";

const uid = (p: string) => p + Math.random().toString(36).slice(2, 8);

function toRfNodes(g: DialogueGraph): Node[] {
  return g.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data as unknown as Record<string, unknown>,
  }));
}
function toRfEdges(g: DialogueGraph): Edge[] {
  return g.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
  }));
}

export function Editor({ id }: { id: string }) {
  const [graph, setGraph] = useState<DialogueGraph | null>(null);
  const [selNode, setSelNode] = useState<string | null>(null);
  const [selEdge, setSelEdge] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"inspect" | "play">("inspect");
  const [mode, setMode] = useState<StorageMode>("local");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const firstLoad = useRef(true);
  const addCount = useRef(0);

  useEffect(() => {
    loadDialogue(id).then((g) => {
      if (g) setGraph(g);
      else setGraph(null);
    });
  }, [id]);

  // Debounced autosave whenever the graph changes (skip initial load).
  useEffect(() => {
    if (!graph) return;
    if (firstLoad.current) { firstLoad.current = false; return; }
    setSaving("saving");
    const t = setTimeout(async () => {
      const m = await saveDialogue(graph);
      setMode(m);
      setSaving("saved");
    }, 800);
    return () => clearTimeout(t);
  }, [graph]);

  const rfNodes = useMemo(() => (graph ? toRfNodes(graph) : []), [graph]);
  const rfEdges = useMemo(() => (graph ? toRfEdges(graph) : []), [graph]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setGraph((g) => {
      if (!g) return g;
      const next = applyNodeChanges(changes, toRfNodes(g));
      const ids = new Set(next.map((n) => n.id));
      const posMap = new Map(next.map((n) => [n.id, n.position]));
      const nodes = g.nodes
        .filter((n) => ids.has(n.id))
        .map((n) => ({ ...n, position: posMap.get(n.id) || n.position }));
      const edges = g.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
      return { ...g, nodes, edges };
    });
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setGraph((g) => {
      if (!g) return g;
      const next = applyEdgeChanges(changes, toRfEdges(g));
      const ids = new Set(next.map((e) => e.id));
      return { ...g, edges: g.edges.filter((e) => ids.has(e.id)) };
    });
  }, []);

  const onConnect = useCallback((c: Connection) => {
    setGraph((g) => {
      if (!g || !c.source || !c.target) return g;
      const newEdge = { id: uid("e_"), source: c.source, target: c.target, label: "", condition: [], once: false };
      return { ...g, edges: [...g.edges, newEdge] };
    });
  }, []);

  function addNode(type: NodeType) {
    setGraph((g) => {
      if (!g) return g;
      addCount.current += 1;
      const k = addCount.current;
      const node: DialogueNode = {
        id: uid("n_"),
        type,
        position: { x: 160 + (k % 5) * 60, y: 320 + Math.floor(k / 5) * 60 + (k % 3) * 20 },
        data: {
          conditions: [], effects: [],
          ...(type === "line" ? { speaker: "You", text: "New line." } : {}),
          ...(type === "hub" ? { text: "" } : {}),
          ...(type === "check" ? { skill: "Logic", difficulty: 8, checkKind: "white" } : {}),
        },
      };
      return { ...g, nodes: [...g.nodes, node] };
    });
  }

  function patchNode(nodeId: string, patch: Partial<DialogueNode["data"]>) {
    setGraph((g) => g && ({
      ...g,
      nodes: g.nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)),
    }));
  }
  function deleteNode(nodeId: string) {
    setGraph((g) => g && ({
      ...g,
      nodes: g.nodes.filter((n) => n.id !== nodeId),
      edges: g.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    }));
    setSelNode(null);
  }
  function makeStart(nodeId: string) {
    setGraph((g) => g && ({
      ...g,
      nodes: g.nodes.map((n) => ({ ...n, data: { ...n.data, isStart: n.id === nodeId } })),
    }));
  }
  function patchEdge(edgeId: string, patch: Partial<DialogueGraph["edges"][number]>) {
    setGraph((g) => g && ({
      ...g,
      edges: g.edges.map((e) => (e.id === edgeId ? { ...e, ...patch } : e)),
    }));
  }
  function deleteEdge(edgeId: string) {
    setGraph((g) => g && ({ ...g, edges: g.edges.filter((e) => e.id !== edgeId) }));
    setSelEdge(null);
  }

  if (graph === null) {
    return (
      <div className="wrap">
        <p>Dialogue not found. <Link href="/">← Back</Link></p>
      </div>
    );
  }

  const selectedNode = graph.nodes.find((n) => n.id === selNode) || null;
  const selectedEdge = graph.edges.find((e) => e.id === selEdge) || null;

  return (
    <div className="editor">
      <div className="topbar">
        <Link href="/" style={{ textDecoration: "none" }}><button>←</button></Link>
        <input
          value={graph.title}
          onChange={(e) => setGraph({ ...graph, title: e.target.value })}
          style={{ width: 280, fontSize: 15 }}
        />
        <span className={`pill ${mode}`}>{mode === "cloud" ? "Vercel Blob" : "Local"}</span>
        <span className="mini">
          {saving === "saving" ? "saving…" : saving === "saved" ? "✓ saved" : ""}
        </span>
        <div className="spacer" />
        <button className={rightTab === "play" ? "primary" : ""} onClick={() => setRightTab(rightTab === "play" ? "inspect" : "play")}>
          ▶ Playtest
        </button>
      </div>

      <div className="editor-body">
        <div className="side left">
          <div className="section-title">Add node</div>
          <button className="node-btn" onClick={() => addNode("line")}>＋ Line (speech)</button>
          <button className="node-btn" onClick={() => addNode("hub")}>＋ Choice hub</button>
          <button className="node-btn" onClick={() => addNode("check")}>＋ Skill check</button>
          <button className="node-btn" onClick={() => addNode("jump")}>＋ Jump</button>
          <StatePanel graph={graph} onChange={(patch) => setGraph({ ...graph, ...patch })} />
        </div>

        <div className="canvas">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => { setSelNode(n.id); setSelEdge(null); setRightTab("inspect"); }}
            onEdgeClick={(_, e) => { setSelEdge(e.id); setSelNode(null); setRightTab("inspect"); }}
            onPaneClick={() => { setSelNode(null); setSelEdge(null); }}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#2a3138" gap={20} />
            <Controls />
            <MiniMap pannable zoomable style={{ background: "#1c2126" }} maskColor="rgba(0,0,0,0.5)" />
          </ReactFlow>
        </div>

        <div className="side">
          {rightTab === "play" ? (
            <Playtest graph={graph} />
          ) : selectedNode ? (
            <NodeInspector
              node={selectedNode}
              graph={graph}
              onPatch={(p) => patchNode(selectedNode.id, p)}
              onDelete={() => deleteNode(selectedNode.id)}
              onMakeStart={() => makeStart(selectedNode.id)}
            />
          ) : selectedEdge ? (
            <EdgeInspector
              edge={selectedEdge}
              graph={graph}
              onPatch={(p) => patchEdge(selectedEdge.id, p)}
              onDelete={() => deleteEdge(selectedEdge.id)}
            />
          ) : (
            <div className="mini">
              Select a node or link to edit it. Drag from a node's bottom handle to
              another node's top handle to connect them. For a choice hub, each
              outgoing link is one player option — set its text in the link inspector.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
