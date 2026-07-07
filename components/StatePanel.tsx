"use client";

import { SKILLS, type DialogueGraph, type VariableDef } from "@/lib/types";

export function StatePanel({
  graph, onChange,
}: {
  graph: DialogueGraph;
  onChange: (patch: Partial<DialogueGraph>) => void;
}) {
  const vars = graph.variables;

  const addVar = () => {
    let n = 1;
    while (vars.some((v) => v.name === `flag${n}`)) n++;
    onChange({ variables: [...vars, { name: `flag${n}`, type: "bool", initial: "false" }] });
  };
  const updVar = (i: number, patch: Partial<VariableDef>) =>
    onChange({ variables: vars.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  const delVar = (i: number) =>
    onChange({ variables: vars.filter((_, j) => j !== i) });

  const setSkill = (s: string, val: number) =>
    onChange({ skills: { ...graph.skills, [s]: val } });

  return (
    <div>
      <div className="section-title">Variables</div>
      {vars.map((v, i) => (
        <div className="row" key={i}>
          <input value={v.name} onChange={(e) => updVar(i, { name: e.target.value })} style={{ flex: 2 }} />
          <select value={v.type} onChange={(e) => updVar(i, { type: e.target.value as VariableDef["type"] })} style={{ flex: "0 0 64px" }}>
            <option value="bool">bool</option>
            <option value="int">int</option>
            <option value="string">string</option>
          </select>
          <input value={v.initial} onChange={(e) => updVar(i, { initial: e.target.value })} style={{ flex: "0 0 56px" }} title="initial value" />
          <button className="del-x" onClick={() => delVar(i)}>×</button>
        </div>
      ))}
      <button onClick={addVar} style={{ marginTop: 4 }}>+ variable</button>

      <div className="section-title">Skills (playtest start levels)</div>
      {SKILLS.map((s) => (
        <div className="row" key={s}>
          <span className="mini" style={{ flex: 1 }}>{s}</span>
          <input
            type="number"
            value={graph.skills[s] ?? 0}
            onChange={(e) => setSkill(s, Number(e.target.value))}
            style={{ flex: "0 0 56px" }}
          />
        </div>
      ))}
    </div>
  );
}
