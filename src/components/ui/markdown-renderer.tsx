"use client";

import * as React from "react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) {
    return <p className="text-muted-foreground italic text-sm">No content provided.</p>;
  }

  // Parse lines to build basic elements
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let keyCounter = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${keyCounter++}`} className="list-disc pl-5 my-2 space-y-1 text-sm text-foreground/80">
          {listItems.map((item, idx) => (
            <li key={idx}>{parseInlineStyles(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushCodeBlock = () => {
    if (codeBlockLines.length > 0) {
      elements.push(
        <pre key={`pre-${keyCounter++}`} className="bg-muted/70 border border-border/80 rounded-lg p-3 font-mono text-xs overflow-x-auto my-3 text-foreground/90 max-w-full">
          <code>{codeBlockLines.join("\n")}</code>
        </pre>
      );
      codeBlockLines = [];
      inCodeBlock = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check code blocks
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Check headers
    if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h1 key={keyCounter++} className="text-xl font-bold tracking-tight text-foreground mt-4 mb-2 border-b border-border/40 pb-1">
          {parseInlineStyles(line.substring(2))}
        </h1>
      );
      continue;
    }

    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={keyCounter++} className="text-lg font-bold tracking-tight text-foreground mt-3 mb-1.5">
          {parseInlineStyles(line.substring(3))}
        </h2>
      );
      continue;
    }

    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={keyCounter++} className="text-md font-semibold tracking-tight text-foreground mt-2 mb-1">
          {parseInlineStyles(line.substring(4))}
        </h3>
      );
      continue;
    }

    // Check lists
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      if (!inList) {
        inList = true;
      }
      // Strip marker
      const itemContent = line.trim().substring(2);
      listItems.push(itemContent);
      continue;
    }

    // Empty line triggers flushing of lists
    if (line.trim() === "") {
      flushList();
      elements.push(<div key={keyCounter++} className="h-2" />);
      continue;
    }

    // Normal line
    flushList();
    elements.push(
      <p key={keyCounter++} className="text-sm leading-relaxed text-foreground/90 my-1">
        {parseInlineStyles(line)}
      </p>
    );
  }

  // Final flush
  flushList();
  flushCodeBlock();

  return <div className="space-y-1.5">{elements}</div>;
}

// Function to handle inline styles like bold, italic, code
function parseInlineStyles(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let i = 0;
  let keyCounter = 0;

  // Simple token regex for inline markdown
  // Match bold **text**, inline `code`, or normal text
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const splitParts = text.split(regex);

  return splitParts.map((part) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={keyCounter++} className="font-bold text-foreground">
          {part.substring(2, part.length - 2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={keyCounter++} className="italic text-foreground/95">
          {part.substring(1, part.length - 1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={keyCounter++} className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] text-primary border border-border/40">
          {part.substring(1, part.length - 1)}
        </code>
      );
    }
    return part;
  });
}
