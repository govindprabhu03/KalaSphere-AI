import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicOrgHeader({ name, slug }: { name: string; slug: string }) {
  return (
    <header className="border-b border-border/60">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <Link href={`/o/${slug}`} className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-pink-600 text-xs font-bold text-white">
            {name.slice(0, 2).toUpperCase()}
          </span>
          <span className="font-heading text-sm font-semibold">{name}</span>
        </Link>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Log in
        </Link>
      </div>
    </header>
  );
}
