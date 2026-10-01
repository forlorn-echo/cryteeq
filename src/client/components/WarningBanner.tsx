export function WarningBanner() {
  return (
    <div className="border-b border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning">
      This file has changed on disk since the review started — line positions
      may no longer match.
    </div>
  );
}
