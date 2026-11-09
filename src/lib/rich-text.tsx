import type { ReactNode } from "react";

// Description d'article : texte simple avec **gras** et listes « - ». Aucun HTML n'est interprété.

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={blocks.length} className="list-disc space-y-1 pl-5">
          {list.map((l, i) => (
            <li key={i}>{inline(l)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
    if (para.length) {
      blocks.push(<p key={blocks.length}>{inline(para.join(" "))}</p>);
      para = [];
    }
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^[-•*]\s+/.test(line)) {
      if (para.length) flush();
      list.push(line.replace(/^[-•*]\s+/, ""));
    } else if (!line) {
      flush();
    } else {
      if (list.length) flush();
      para.push(line);
    }
  }
  flush();
  return <div className={className ?? "space-y-3"}>{blocks}</div>;
}
