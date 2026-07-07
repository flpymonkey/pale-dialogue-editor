// ---------------------------------------------------------------------------
// Runtime interpreter — "playtest mode". Walks the graph from the start node,
// holding a mutable state snapshot, evaluating conditions, rolling checks,
// and applying effects. This is just the data model executed.
// ---------------------------------------------------------------------------

import type {
  Condition, DialogueEdge, DialogueGraph, DialogueNode, Effect,
} from "./types";

export interface RuntimeState {
  vars: Record<string, number | boolean | string>;
  skills: Record<string, number>;
  items: string[];
  thoughts: string[];
  xp: number;
  consumedEdges: Set<string>;   // once-only edges already used
  passedChecks: Set<string>;    // white-check node ids already passed
}

export interface Option {
  edge: DialogueEdge;
  label: string;
}

export interface PlayStep {
  node: DialogueNode;
  options: Option[];
  log: string[];      // messages generated arriving at this node
  done: boolean;
}

function coerce(raw: string): number | boolean | string {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw !== "" && !isNaN(Number(raw))) return Number(raw);
  return raw;
}

export function initState(graph: DialogueGraph): RuntimeState {
  const vars: Record<string, number | boolean | string> = {};
  for (const v of graph.variables) vars[v.name] = coerce(v.initial);
  return {
    vars,
    skills: { ...(graph.skills as Record<string, number>) },
    items: [],
    thoughts: [],
    xp: 0,
    consumedEdges: new Set(),
    passedChecks: new Set(),
  };
}

function lookup(state: RuntimeState, c: Condition): number | boolean | string {
  if (c.kind === "skill") return state.skills[c.key] ?? 0;
  return state.vars[c.key] ?? 0;
}

export function evalCondition(state: RuntimeState, c: Condition): boolean {
  const left = lookup(state, c);
  const right = coerce(c.value);
  switch (c.op) {
    case "==": return left === right;
    case "!=": return left !== right;
    case ">=": return Number(left) >= Number(right);
    case "<=": return Number(left) <= Number(right);
    case ">": return Number(left) > Number(right);
    case "<": return Number(left) < Number(right);
    default: return false;
  }
}

export function evalAll(state: RuntimeState, conds: Condition[] = []): boolean {
  return conds.every((c) => evalCondition(state, c));
}

export function applyEffects(state: RuntimeState, effects: Effect[] = []): string[] {
  const log: string[] = [];
  for (const e of effects) {
    switch (e.kind) {
      case "setVar":
        state.vars[e.key] = coerce(e.value);
        log.push(`${e.key} = ${e.value}`);
        break;
      case "addVar":
        state.vars[e.key] = Number(state.vars[e.key] ?? 0) + Number(e.value);
        log.push(`${e.key} += ${e.value}`);
        break;
      case "addItem":
        state.items.push(e.key);
        log.push(`Got item: ${e.key}`);
        break;
      case "addThought":
        state.thoughts.push(e.key);
        log.push(`Thought internalized: ${e.key}`);
        break;
      case "xp":
        state.xp += Number(e.value || 0);
        log.push(`+${e.value} XP`);
        break;
    }
  }
  return log;
}

// 2d6 + skill vs difficulty. Returns roll detail.
export function rollCheck(skillLevel: number, difficulty: number) {
  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  const total = d1 + d2 + skillLevel;
  // 2 always fails, 12 always succeeds (DE rule).
  const success = (d1 === 6 && d2 === 6) ? true : (d1 === 1 && d2 === 1) ? false : total >= difficulty;
  return { d1, d2, skillLevel, total, difficulty, success };
}

function byId(graph: DialogueGraph, id?: string): DialogueNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

export function startNode(graph: DialogueGraph): DialogueNode | undefined {
  return graph.nodes.find((n) => n.data.isStart) ?? graph.nodes[0];
}

// Resolve arriving at a node: apply effects, auto-follow jump/check, gather options.
export function enter(graph: DialogueGraph, state: RuntimeState, node: DialogueNode): PlayStep {
  const log: string[] = [];
  let current: DialogueNode | undefined = node;

  // Follow non-interactive nodes (jump / check) until we land on line or hub.
  // Guard against infinite loops.
  for (let i = 0; i < 100 && current; i++) {
    log.push(...applyEffects(state, current.data.effects));

    if (current.type === "jump") {
      const next = byId(graph, current.data.jumpTarget);
      if (!next) break;
      current = next;
      continue;
    }

    if (current.type === "check") {
      const skill = current.data.skill ?? "Logic";
      const already = state.passedChecks.has(current.id);
      let success: boolean;
      if (current.data.checkKind === "white" && already) {
        success = true;
        log.push(`${skill} check — already passed.`);
      } else {
        const r = rollCheck(state.skills[skill] ?? 0, current.data.difficulty ?? 8);
        success = r.success;
        log.push(
          `${skill} check [${current.data.checkKind ?? "white"}] — ` +
          `${r.d1}+${r.d2}+${r.skillLevel}=${r.total} vs ${r.difficulty}: ` +
          (success ? "SUCCESS" : "FAILURE")
        );
        if (success && current.data.checkKind === "white") state.passedChecks.add(current.id);
      }
      const next = byId(graph, success ? current.data.successTarget : current.data.failTarget);
      if (!next) break;
      current = next;
      continue;
    }

    // line or hub — this is an interactive stop.
    break;
  }

  if (!current) {
    return { node, options: [], log, done: true };
  }

  const options = outgoingOptions(graph, state, current);
  const done = options.length === 0;
  return { node: current, options, log, done };
}

export function outgoingOptions(
  graph: DialogueGraph, state: RuntimeState, node: DialogueNode
): Option[] {
  return graph.edges
    .filter((e) => e.source === node.id)
    .filter((e) => !(e.once && state.consumedEdges.has(e.id)))
    .filter((e) => evalAll(state, e.condition))
    .map((e) => ({ edge: e, label: e.label || "Continue" }));
}

export function choose(
  graph: DialogueGraph, state: RuntimeState, opt: Option
): PlayStep {
  if (opt.edge.once) state.consumedEdges.add(opt.edge.id);
  const next = byId(graph, opt.edge.target);
  if (!next) return { node: graph.nodes[0], options: [], log: ["(dead end)"], done: true };
  return enter(graph, state, next);
}
