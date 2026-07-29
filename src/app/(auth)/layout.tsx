import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-10">
      <Link href="/" className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-pink-600 text-xs font-bold text-white">
          KS
        </span>
        <span className="font-heading text-base font-semibold">
          KalaSphere AI
        </span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
