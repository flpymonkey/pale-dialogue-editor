// ---------------------------------------------------------------------------
// Core data model for a Disco-Elysium-style dialogue graph.
// A whole dialogue = one JSON document (nodes + edges + state definitions).
// ---------------------------------------------------------------------------

// The 24 skills, used both as "voices" (speakers) and as check attributes.
export const SKILLS = [
  "Logic", "Encyclopedia", "Rhetoric", "Drama", "Conceptualization", "Visual Calculus",
  "Volition", "Inland Empire", "Empathy", "Authority", "Esprit de Corps", "Suggestion",
  "Endurance", "Pain Threshold", "Physical Instrument", "Electrochemistry", "Shivers", "Half Light",
  "Hand/Eye Coordination", "Perception", "Reaction Speed", "Savoir Faire", "Interfacing", "Composure",
] as const;
export type Skill = (typeof SKILLS)[number];

export type NodeType = "line" | "hub" | "check" | "jump";

// A guard: the referenced variable/skill compared against a value.
export interface Condition {
  id: string;
  kind: "var" | "skill";
  key: string;                 // variable name, or Skill name
  op: "==" | "!=" | ">=" | "<=" | ">" | "<";
  value: string;               // parsed to number/bool/string at eval time
}

// An action applied when a node is visited.
export interface Effect {
  id: string;
  kind: "setVar" | "addVar" | "addItem" | "addThought" | "xp";
  key: string;                 // variable name / item / thought / "" for xp
  value: string;
}

export interface DialogueNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    speaker?: string;          // character name or Skill voice (line nodes)
    text?: string;
    conditions: Condition[];   // must all pass for node to be reachable
    effects: Effect[];         // applied on visit
    // check-only:
    skill?: Skill;
    difficulty?: number;       // target number (2d6 + skill vs difficulty)
    checkKind?: "white" | "red"; // white = retryable, red = one-shot
    successTarget?: string;    // node id
    failTarget?: string;       // node id
    // jump-only:
    jumpTarget?: string;       // node id
    // flags
    isStart?: boolean;
  };
}

export interface DialogueEdge {
  id: string;
  source: string;
  target: string;
  // For hub options: the label is the choosable player line.
  label?: string;
  condition?: Condition[];     // option only shown if guards pass
  once?: boolean;              // consumed after first use
}

export interface VariableDef {
  name: string;
  type: "bool" | "int" | "string";
  initial: string;
}

export interface DialogueGraph {
  id: string;
  title: string;
  updatedAt: number;
  version: number;
  nodes: DialogueNode[];
  edges: DialogueEdge[];
  variables: VariableDef[];
  skills: Partial<Record<Skill, number>>; // starting skill levels for playtest
}

export interface DialogueMeta {
  id: string;
  title: string;
  updatedAt: number;
}

export function emptyGraph(id: string, title: string): DialogueGraph {
  const startId = "n_start";
  return {
    id,
    title,
    updatedAt: Date.now(),
    version: 1,
    nodes: [
      {
        id: startId,
        type: "line",
        position: { x: 250, y: 120 },
        data: {
          speaker: "INLAND EMPIRE",
          text: "You wake. The ceiling fan turns. Something is wrong, but you can't say what.",
          conditions: [],
          effects: [],
          isStart: true,
        },
      },
    ],
    edges: [],
    variables: [
      { name: "metKim", type: "bool", initial: "false" },
    ],
    skills: { Logic: 3, "Inland Empire": 4, Empathy: 2, Authority: 2 },
  };
}
