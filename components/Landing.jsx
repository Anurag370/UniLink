import Link from "next/link";

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-16 text-center">
      <div className="w-full max-w-[360px]">
        <h1 className="text-[40px] font-extrabold tracking-[-1.5px] text-slate-900">
          Uni<span className="text-indigo-500">Link</span>
        </h1>

        <p className="mt-8 text-[25px] font-extrabold leading-tight tracking-[-1px] text-slate-900">
          Ideas. People. Opportunities.
        </p>

        <p className="mt-4 text-[11px] leading-[1.7] text-slate-500">
          A campus network where students and alumni share projects, swap notes
          and find their next opportunity.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          <Link
            href="/login"
            className="block h-[46px] w-full rounded-xl bg-indigo-500 text-[12px] font-semibold text-white active:scale-[0.98]"
          >
            Log In
          </Link>

          <Link
            href="/register"
            className="block h-[46px] w-full rounded-xl border border-slate-200 bg-white text-[12px] font-semibold text-slate-900 active:scale-[0.98]"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
