import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";

interface ReportDialogProps {
  report: string;
  fileName: string;
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 text-xl font-semibold text-fg">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-6 border-b border-line pb-1 text-base font-semibold text-fg">
      {children}
    </h2>
  ),
  p: ({ children }) => <p className="mb-2.5 leading-6 text-fg">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-3 list-disc pl-6 text-fg">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal pl-6 text-fg">{children}</ol>
  ),
  li: ({ children }) => <li className="mb-1 leading-6">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-accent/40 bg-raised/30 px-3 py-2 text-fg">
      {children}
    </blockquote>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-md border border-line bg-raised/50 p-3 text-xs text-fg">
      {children}
    </pre>
  ),
  code: ({ className, children }) =>
    className?.includes("language-") ? (
      <code className={`${className} font-mono`}>{children}</code>
    ) : (
      <code className="rounded bg-raised px-1 py-0.5 font-mono text-[0.85em]">
        {children}
      </code>
    ),
  hr: () => <hr className="mb-4 border-line" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-fg">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-accent-soft underline">
      {children}
    </a>
  ),
};

export function ReportDialog({ report, fileName }: ReportDialogProps) {
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"rendered" | "source">("rendered");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = report;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${fileName}.review.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app p-6">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-fg">
            Review complete — {fileName}
          </h1>
          <p className="text-sm text-muted">
            The server has stopped. You may close this tab.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-line-strong p-0.5 text-xs">
            <button
              type="button"
              aria-pressed={mode === "rendered"}
              onClick={() => setMode("rendered")}
              className={`rounded px-2.5 py-1 transition-colors ${
                mode === "rendered"
                  ? "bg-accent font-medium text-accent-fg"
                  : "text-fg hover:bg-raised"
              }`}
            >
              Rendered
            </button>
            <button
              type="button"
              aria-pressed={mode === "source"}
              onClick={() => setMode("source")}
              className={`rounded px-2.5 py-1 transition-colors ${
                mode === "source"
                  ? "bg-accent font-medium text-accent-fg"
                  : "text-fg hover:bg-raised"
              }`}
            >
              Source
            </button>
          </div>
          <button
            type="button"
            onClick={() => void download()}
            className="rounded-md border border-line-strong px-3 py-1.5 text-sm text-fg transition-colors hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Download
          </button>
          <button
            type="button"
            onClick={() => void copy()}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            {copied ? "Copied!" : "Copy report"}
          </button>
        </div>
      </div>
      {mode === "rendered" ? (
        <div className="flex-1 overflow-auto rounded-md border border-line bg-surface p-4 text-sm text-fg">
          <div className="mx-auto max-w-3xl">
            <ReactMarkdown components={components}>{report}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <pre className="flex-1 overflow-auto rounded-md border border-line bg-surface p-4 text-sm text-fg">
          {report}
        </pre>
      )}
    </div>
  );
}
