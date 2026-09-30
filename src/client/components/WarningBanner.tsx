export function WarningBanner() {
  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
      This file has changed on disk since the review started — line positions
      may no longer match.
    </div>
  );
}
