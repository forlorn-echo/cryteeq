import { useState } from "react";

interface ReportDialogProps {
  report: string;
  fileName: string;
}

export function ReportDialog({ report, fileName }: ReportDialogProps) {
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app p-6">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-fg">
            Review complete — {fileName}
          </h1>
          <p className="text-sm text-muted">
            The server has stopped. You may close this tab.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void copy()}
          className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:bg-accent-hover"
        >
          {copied ? "Copied!" : "Copy report"}
        </button>
      </div>
      <pre className="flex-1 overflow-auto rounded-md border border-line bg-surface p-4 text-sm text-fg">
        {report}
      </pre>
    </div>
  );
}
