"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DialogueNode } from "@/lib/types";

type Data = DialogueNode["data"];

function Shell({
  cls, selected, children,
}: { cls: string; selected: boolean; children: React.ReactNode }) {
  return (
    <div className={`rf-node ${cls} ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Top} />
      {children}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export function LineNode({ data, selected }: NodeProps) {
  const d = data as Data;
  return (
    <Shell cls="type-line" selected={!!selected}>
      <div className="speaker" style={{ color: "var(--accent-2)" }}>
        {d.speaker || "Narrator"}
        {d.isStart && <span className="badge start-badge" style={{ marginLeft: 6 }}>START</span>}
      </div>
      <div className="body">{d.text || "(empty line)"}</div>
      <Meta d={d} />
    </Shell>
  );
}

export function HubNode({ data, selected }: NodeProps) {
  const d = data as Data;
  return (
    <Shell cls="type-hub" selected={!!selected}>
      <div className="speaker" style={{ color: "var(--accent)" }}>◆ Choice hub</div>
      <div className="body">{d.text || "Player responds…"}</div>
      <Meta d={d} />
    </Shell>
  );
}

export function CheckNode({ data, selected }: NodeProps) {
  const d = data as Data;
  return (
    <Shell cls="type-check" selected={!!selected}>
      <div className="speaker" style={{ color: "var(--danger)" }}>
        ⚄ {d.skill || "Logic"} check
        <span className="badge" style={{ marginLeft: 6 }}>{d.checkKind || "white"}</span>
      </div>
      <div className="body">Difficulty {d.difficulty ?? 8}</div>
      <div className="mini" style={{ marginTop: 4 }}>
        ✓ success / ✗ failure branch to targets
      </div>
    </Shell>
  );
}

export function JumpNode({ data, selected }: NodeProps) {
  const d = data as Data;
  return (
    <Shell cls="type-jump" selected={!!selected}>
      <div className="speaker">↪ Jump</div>
      <div className="body mini">to {d.jumpTarget || "(unset)"}</div>
    </Shell>
  );
}

function Meta({ d }: { d: Data }) {
  if (!d.conditions?.length && !d.effects?.length) return null;
  return (
    <div className="row" style={{ marginTop: 6, flexWrap: "wrap", gap: 4 }}>
      {d.conditions?.length ? <span className="chip">if ×{d.conditions.length}</span> : null}
      {d.effects?.length ? <span className="chip">do ×{d.effects.length}</span> : null}
    </div>
  );
}

export const nodeTypes = {
  line: LineNode,
  hub: HubNode,
  check: CheckNode,
  jump: JumpNode,
};
