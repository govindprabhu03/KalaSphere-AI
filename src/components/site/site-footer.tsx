export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-pink-600 text-[10px] font-bold text-white">
            KS
          </span>
          <span>KalaSphere AI · The AI platform for cultural institutions</span>
        </div>
        <p>© {new Date().getFullYear()} · Built for the community</p>
      </div>
    </footer>
  );
}
