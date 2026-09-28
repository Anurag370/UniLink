"use client";

import { useState } from "react";
import { ArrowLeft, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { readNextParam } from "@/lib/redirect";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");

    const success = await login(
      email.trim().toLowerCase(),
      password
    );

    if (!success) {
      setError("Invalid email or password.");
      return;
    }

    router.push(readNextParam());
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex h-[60px] items-center px-[14px]">
        <button
          className="flex items-center justify-center"
          onClick={() => router.push("/")}
          aria-label="Back"
        >
          <ArrowLeft size={21} />
        </button>
      </header>

      <main className="px-[22px] pt-5 pb-[50px]">
        <div className="my-[20px] mb-[45px] text-center">
          <h1 className="text-[25px] font-extrabold tracking-[-1px]">
            Uni<span className="text-indigo-500">Link</span>
          </h1>

          <p className="mt-[5px] text-slate-500 text-[10px]">Ideas. People. Opportunities.</p>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl">Welcome back</h2>

          <p className="mt-1.5 text-slate-500 text-[11px] leading-[1.5]">
            Log in to connect with your college community.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleLogin}
        >
          <div className="mb-4">
            <label className="mb-[7px] block text-[11px] font-semibold">College Email</label>

            <div className="flex h-[46px] items-center gap-[9px] rounded-xl border border-slate-200 bg-white px-[13px] text-slate-400 focus-within:border-indigo-500 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]">
              <Mail size={17} />

              <input
                className="w-full border-none bg-transparent outline-none placeholder:text-slate-400 text-slate-900 text-[12px]"
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-[7px] block text-[11px] font-semibold">Password</label>

            <div className="flex h-[46px] items-center gap-[9px] rounded-xl border border-slate-200 bg-white px-[13px] text-slate-400 focus-within:border-indigo-500 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]">
              <LockKeyhole size={17} />

              <input
                className="w-full border-none bg-transparent outline-none placeholder:text-slate-400 text-slate-900 text-[12px]"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />
            </div>
          </div>

          {error && (
            <p className="-mt-1 mb-4 text-red-500 text-[11px]">
              {error}
            </p>
          )}

          <div className="-mt-[5px] mb-[18px] flex justify-end">
            <button className="text-indigo-500 text-[10px]" type="button">
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="h-[46px] w-full rounded-xl bg-indigo-500 text-white text-[12px] font-semibold active:scale-[0.98]"
          >
            Log In
          </button>
        </form>

        <div className="my-[25px] flex items-center gap-3 text-slate-400 text-[10px] before:content-[''] before:h-px before:flex-1 before:bg-slate-200 after:content-[''] after:h-px after:flex-1 after:bg-slate-200">
          <span>or</span>
        </div>

        <div className="text-center">
          <p className="text-slate-500 text-[11px]">Don&apos;t have an account?</p>

          <Link className="mt-1.5 inline-block font-semibold text-indigo-500 text-[12px]" href="/register">
            Create an account
          </Link>
        </div>

        <button
          className="mx-auto mt-[25px] block text-slate-500 text-[10px]"
          onClick={() => router.push("/register")}
        >
          Continue browsing
        </button>
      </main>
    </div>
  );
}