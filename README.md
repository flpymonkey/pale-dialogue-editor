# Pale — a Disco Elysium-style dialogue tree editor

A Vercel/Next.js app for authoring branching dialogue as a node graph, with
skill checks, conditions, effects, global variables, and a live playtest mode.

## Data model

A whole dialogue is one JSON document (`lib/types.ts`):

- **Nodes** (`line`, `hub`, `check`, `jump`) each carry `conditions[]` (guards)
  and `effects[]` (actions on visit).
- **Edges** are the branches. From a `hub`, each outgoing edge is a player
  option with its own text, guard conditions, and optional `once` flag.
- **check** nodes roll `2d6 + skill` vs a difficulty and branch to
  success/failure targets. `white` = retryable, `red` = one-shot.
- **variables** + **skills** define the global state the interpreter mutates.

## Editing

- `@xyflow/react` canvas with a custom node per type.
- Left panel: add nodes, manage variables and starting skill levels.
- Right panel: inspector for the selected node/edge, or the **Playtest** runner
  (`lib/interpreter.ts`) that executes the graph.

## Saving

Autosave (debounced) writes the whole graph via `PUT /api/dialogues/[id]`.

- **Source of truth:** Vercel Blob — one JSON blob per dialogue at
  `dialogues/{id}.json` (`lib/store.ts`).
- **Fallback:** if no Blob store is connected (`BLOB_READ_WRITE_TOKEN` unset),
  the API returns 503 and the client (`lib/client.ts`) transparently uses
  browser `localStorage`, so the app works the instant it's deployed.

### Enable cloud storage

1. In the Vercel project: **Storage → Create → Blob**, connect it to the project.
2. Vercel injects `BLOB_READ_WRITE_TOKEN`. Redeploy.
3. The header pill switches from **Local** to **Vercel Blob**.

## Local dev

```bash
npm install
npm run dev
```
# pale-dialogue-editor
