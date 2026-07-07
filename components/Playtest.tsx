"use client";

import { useMemo, useState } from "react";
import {
  choose, enter, initState, startNode, type Option, type PlayStep, type RuntimeState,
} from "@/lib/interpreter";
import type { DialogueGraph, DialogueNode } from "@/lib/types";

interface Entry {
  who?: string;
  what: string;
  sys?: boolean;
}

export function Playtest({ graph }: { graph: DialogueGraph }) {
  const [nonce, setNonce] = useState(0);
  const [state] = useState<RuntimeState>(() => initState(graph));
  const [transcript, setTranscript] = useState<Entry[]>([]);
  const [step, setStep] = useState<PlayStep | null>(null);

  // Reset when graph identity changes or user hits restart (nonce).
  useMemo(() => {
    const s = startNode(graph);
    if (!s) { setStep(null); return; }
    const fresh = initState(graph);
    Object.assign(state, fresh);
    const st = enter(graph, state, s);
    setTranscript(nodeEntries(st.node, st.log));
    setStep(st);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.id, nonce]);

  function pick(opt: Option) {
    setTranscript((t) => [...t, { who: "You", what: opt.label }]);
    const st = choose(graph, state, opt);
    setTranscript((t) => [...t, ...nodeEntries(st.node, st.log)]);
    setStep(st);
  }

  return (
    <div className="play">
      <div className="row" style={{ marginBottom: 8 }}>
        <strong style={{ flex: 1 }}>Playtest</strong>
        <button onClick={() => setNonce((n) => n + 1)}>↻ Restart</button>
      </div>
      <div className="play-log">
        {transcript.map((e, i) =>
          e.sys ? (
            <div className="play-sys" key={i}>» {e.what}</div>
          ) : (
            <div className="play-line" key={i}>
              {e.who && <div className="who">{e.who}</div>}
              <div className="what">{e.what}</div>
            </div>
          )
        )}
        {step?.done && <div className="play-sys">— end of dialogue —</div>}
      </div>
      <div style={{ paddingTop: 8, borderTop: "1px solid var(--border)" }}>
        {step && !step.done && step.options.map((o, i) => (
          <button className="play-opt" key={i} onClick={() => pick(o)}>
            {o.label}
          </button>
        ))}
      </div>
      <div className="mini" style={{ marginTop: 8 }}>
        XP {state.xp} · items {state.items.length} · thoughts {state.thoughts.length}
      </div>
    </div>
  );
}

function nodeEntries(node: DialogueNode, log: string[]): Entry[] {
  const out: Entry[] = [];
  for (const l of log) out.push({ what: l, sys: true });
  if (node.type === "line") out.push({ who: node.data.speaker || "Narrator", what: node.data.text || "" });
  else if (node.type === "hub" && node.data.text) out.push({ who: "You", what: node.data.text });
  return out;
}
