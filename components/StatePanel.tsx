"use client";

import { SKILLS, type DialogueGraph, type SpeakerDef, type VariableDef } from "@/lib/types";

const DEFAULT_COLORS = ["#4b8c9c", "#c9a24b", "#b4544a", "#8c948c", "#7a8c4b", "#8c5ba0"];

export function StatePanel({
  graph, onChange,
}: {
  graph: DialogueGraph;
  onChange: (patch: Partial<DialogueGraph>) => void;
}) {
  const vars = graph.variables;
  const speakers = graph.speakers ?? [];

  const addVar = () => {
    let n = 1;
    while (vars.some((v) => v.name === `flag${n}`)) n++;
    onChange({ variables: [...vars, { name: `flag${n}`, type: "bool", initial: "false" }] });
  };
  const updVar = (i: number, patch: Partial<VariableDef>) =>
    onChange({ variables: vars.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  const delVar = (i: number) =>
    onChange({ variables: vars.filter((_, j) => j !== i) });

  const addSpeaker = () => {
    let n = 1;
    while (speakers.some((s) => s.name === `Speaker ${n}`)) n++;
    const color = DEFAULT_COLORS[speakers.length % DEFAULT_COLORS.length];
    onChange({ speakers: [...speakers, { name: `Speaker ${n}`, color }] });
  };
  const updSpeaker = (i: number, patch: Partial<SpeakerDef>) =>
    onChange({ speakers: speakers.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const delSpeaker = (i: number) =>
    onChange({ speakers: speakers.filter((_, j) => j !== i) });

  const setSkill = (s: string, val: number) =>
    onChange({ skills: { ...graph.skills, [s]: val } });

  return (
    <div>
      <div className="section-title">Speakers</div>
      {speakers.map((s, i) => (
        <div className="row" key={i}>
          <input
            type="color"
            value={s.color}
            onChange={(e) => updSpeaker(i, { color: e.target.value })}
            style={{ flex: "0 0 32px", padding: 2 }}
            title="Speaker color"
          />
          <input value={s.name} onChange={(e) => updSpeaker(i, { name: e.target.value })} style={{ flex: 1 }} />
          <button className="del-x" onClick={() => delSpeaker(i)}>×</button>
        </div>
      ))}
      <button onClick={addSpeaker} style={{ marginTop: 4 }}>+ speaker</button>

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
