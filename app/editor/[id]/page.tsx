"use client";

import { Editor } from "@/components/Editor";

export default function EditorPage({ params }: { params: { id: string } }) {
  return <Editor id={params.id} />;
}
