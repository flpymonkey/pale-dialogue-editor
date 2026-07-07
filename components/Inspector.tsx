"use client";

import {
  SKILLS, type Condition, type DialogueEdge, type DialogueGraph,
  type DialogueNode, type Effect,
} from "@/lib/types";

const uid = () => Math.random().toString(36).slice(2, 9);

// -------- Condition editor --------
function ConditionRows({
  conds, graph, onChange,
}: {
  conds: Condition[];
  graph: DialogueGraph;
  onChange: (c: Condition[]) => void;
}) {
  const add = () =>
    onChange([...conds, { id: uid(), kind: "var", key: graph.variables[0]?.name || "", op: "==", value: "true" }]);
  const upd = (i: number, patch: Partial<Condition>) =>
    onChange(conds.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const del = (i: number) => onChange(conds.filter((_, j) => j !== i));

  return (
    <div>
      {conds.map((c, i) => (
        <div className="row" key={c.id}>
          <select value={c.kind} onChange={(e) => upd(i, { kind: e.target.value as Condition["kind"] })} style={{ flex: "0 0 64px" }}>
            <option value="var">var</option>
            <option value="skill">skill</option>
          </select>
          {c.kind === "skill" ? (
            <select value={c.key} onChange={(e) => upd(i, { key: e.target.value })}>
              {SKILLS.map((s) => <option key={s}>{s}</option>)}
            </select>
          ) : (
            <select value={c.key} onChange={(e) => upd(i, { key: e.target.value })}>
              {graph.variables.map((v) => <option key={v.name}>{v.name}</option>)}
            </select>
          )}
          <select value={c.op} onChange={(e) => upd(i, { op: e.target.value as Condition["op"] })} style={{ flex: "0 0 56px" }}>
            {["==", "!=", ">=", "<=", ">", "<"].map((o) => <option key={o}>{o}</option>)}
          </select>
          <input value={c.value} onChange={(e) => upd(i, { value: e.target.value })} style={{ flex: "0 0 64px" }} />
          <button className="del-x" onClick={() => del(i)}>×</button>
        </div>
      ))}
      <button onClick={add} style={{ marginTop: 4 }}>+ condition</button>
    </div>
  );
}

// -------- Effect editor --------
function EffectRows({
  effects, graph, onChange,
}: {
  effects: Effect[];
  graph: DialogueGraph;
  onChange: (e: Effect[]) => void;
}) {
  const add = () =>
    onChange([...effects, { id: uid(), kind: "setVar", key: graph.variables[0]?.name || "", value: "true" }]);
  const upd = (i: number, patch: Partial<Effect>) =>
    onChange(effects.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const del = (i: number) => onChange(effects.filter((_, j) => j !== i));

  return (
    <div>
      {effects.map((e, i) => (
        <div className="row" key={e.id}>
          <select value={e.kind} onChange={(ev) => upd(i, { kind: ev.target.value as Effect["kind"] })} style={{ flex: "0 0 84px" }}>
            <option value="setVar">set var</option>
            <option value="addVar">add var</option>
            <option value="addItem">+item</option>
            <option value="addThought">+thought</option>
            <option value="xp">+xp</option>
          </select>
          {e.kind === "xp" ? (
            <input value={e.value} placeholder="amount" onChange={(ev) => upd(i, { value: ev.target.value })} />
          ) : e.kind === "setVar" || e.kind === "addVar" ? (
            <>
              <select value={e.key} onChange={(ev) => upd(i, { key: ev.target.value })}>
                {graph.variables.map((v) => <option key={v.name}>{v.name}</option>)}
              </select>
              <input value={e.value} onChange={(ev) => upd(i, { value: ev.target.value })} style={{ flex: "0 0 64px" }} />
            </>
          ) : (
            <input value={e.key} placeholder="name" onChange={(ev) => upd(i, { key: ev.target.value })} />
          )}
          <button className="del-x" onClick={() => del(i)}>×</button>
        </div>
      ))}
      <button onClick={add} style={{ marginTop: 4 }}>+ effect</button>
    </div>
  );
}

// -------- Node inspector --------
export function NodeInspector({
  node, graph, onPatch, onDelete, onMakeStart,
}: {
  node: DialogueNode;
  graph: DialogueGraph;
  onPatch: (patch: Partial<DialogueNode["data"]>) => void;
  onDelete: () => void;
  onMakeStart: () => void;
}) {
  const d = node.data;
  const nodeOptions = graph.nodes.filter((n) => n.id !== node.id);

  return (
    <div>
      <div className="section-title">{node.type} node</div>

      {(node.type === "line" || node.type === "hub") && (
        <>
          {node.type === "line" && (
            <>
              <label>Speaker</label>
              <input list="speakers" value={d.speaker || ""} onChange={(e) => onPatch({ speaker: e.target.value })} />
              <datalist id="speakers">
                {SKILLS.map((s) => <option key={s} value={s.toUpperCase()} />)}
                <option value="Kim Kitsuragi" />
                <option value="You" />
              </datalist>
            </>
          )}
          <label>{node.type === "hub" ? "Prompt (optional)" : "Text"}</label>
          <textarea value={d.text || ""} onChange={(e) => onPatch({ text: e.target.value })} />
        </>
      )}

      {node.type === "check" && (
        <>
          <label>Skill</label>
          <select value={d.skill || "Logic"} onChange={(e) => onPatch({ skill: e.target.value as any })}>
            {SKILLS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <label>Difficulty (target for 2d6 + skill)</label>
          <input type="number" value={d.difficulty ?? 8} onChange={(e) => onPatch({ difficulty: Number(e.target.value) })} />
          <label>Kind</label>
          <select value={d.checkKind || "white"} onChange={(e) => onPatch({ checkKind: e.target.value as any })}>
            <option value="white">white (retryable)</option>
            <option value="red">red (one-shot)</option>
          </select>
          <label>On success → node</label>
          <select value={d.successTarget || ""} onChange={(e) => onPatch({ successTarget: e.target.value })}>
            <option value="">(none)</option>
            {nodeOptions.map((n) => <option key={n.id} value={n.id}>{label(n)}</option>)}
          </select>
          <label>On failure → node</label>
          <select value={d.failTarget || ""} onChange={(e) => onPatch({ failTarget: e.target.value })}>
            <option value="">(none)</option>
            {nodeOptions.map((n) => <option key={n.id} value={n.id}>{label(n)}</option>)}
          </select>
        </>
      )}

      {node.type === "jump" && (
        <>
          <label>Jump to node</label>
          <select value={d.jumpTarget || ""} onChange={(e) => onPatch({ jumpTarget: e.target.value })}>
            <option value="">(none)</option>
            {nodeOptions.map((n) => <option key={n.id} value={n.id}>{label(n)}</option>)}
          </select>
        </>
      )}

      <div className="section-title">Conditions (guards)</div>
      <ConditionRows conds={d.conditions || []} graph={graph} onChange={(c) => onPatch({ conditions: c })} />

      <div className="section-title">Effects (on visit)</div>
      <EffectRows effects={d.effects || []} graph={graph} onChange={(e) => onPatch({ effects: e })} />

      <div className="section-title">Node</div>
      <div className="row">
        {!d.isStart && <button onClick={onMakeStart}>Set as start</button>}
        <button className="danger" onClick={onDelete}>Delete node</button>
      </div>
    </div>
  );
}

// -------- Edge inspector --------
export function EdgeInspector({
  edge, graph, onPatch, onDelete,
}: {
  edge: DialogueEdge;
  graph: DialogueGraph;
  onPatch: (patch: Partial<DialogueEdge>) => void;
  onDelete: () => void;
}) {
  const src = graph.nodes.find((n) => n.id === edge.source);
  const isHub = src?.type === "hub";
  return (
    <div>
      <div className="section-title">{isHub ? "Choice option" : "Link"}</div>
      <label>{isHub ? "Player choice text" : "Label (optional)"}</label>
      <input value={edge.label || ""} onChange={(e) => onPatch({ label: e.target.value })} />
      <div className="row" style={{ marginTop: 10 }}>
        <input type="checkbox" style={{ width: "auto" }} checked={!!edge.once}
          onChange={(e) => onPatch({ once: e.target.checked })} />
        <span className="mini">Once only (consumed after first use)</span>
      </div>
      <div className="section-title">Show only if</div>
      <ConditionRows conds={edge.condition || []} graph={graph} onChange={(c) => onPatch({ condition: c })} />
      <div className="section-title">Link</div>
      <button className="danger" onClick={onDelete}>Delete link</button>
    </div>
  );
}

function label(n: DialogueNode) {
  const t = n.data.text || n.data.speaker || n.type;
  return `${n.type}: ${t.slice(0, 24)}`;
}
