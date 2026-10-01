const ROW_WIDTHS = [
  "w-1/2",
  "w-2/3",
  "w-1/3",
  "w-3/4",
  "w-5/6",
  "w-1/4",
  "w-2/3",
  "w-1/2",
  "w-4/5",
  "w-3/8",
  "w-2/3",
  "w-1/3",
  "w-1/2",
  "w-3/4",
  "w-1/4",
  "w-2/3",
];

export function Loading() {
  return (
    <div className="min-h-screen bg-app">
      <div className="border-b border-line px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="h-3.5 w-48 animate-pulse rounded bg-raised" />
            <div className="mt-1.5 h-2.5 w-72 animate-pulse rounded bg-raised/60" />
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-5xl px-4 py-4">
        <div className="rounded-lg border border-line bg-surface">
          {ROW_WIDTHS.map((width, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border-b border-line/40 px-4 py-2 last:border-b-0"
            >
              <div className="h-3 w-12 shrink-0 animate-pulse rounded bg-raised/60" />
              <div className={`h-3 animate-pulse rounded bg-raised ${width}`} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
