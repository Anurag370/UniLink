"use client";

import { useState } from "react";
import { ArrowLeft, Camera, GraduationCap, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { readNextParam } from "@/lib/redirect";

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();

  const [accountType, setAccountType] = useState("student");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");

  const [graduationYear, setGraduationYear] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [company, setCompany] = useState("");

  const [registrationError, setRegistrationError] = useState("");

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => setProfilePhoto(reader.result);

    reader.readAsDataURL(file);
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    setRegistrationError("");

    const newUser = {
      fullName: name.trim(),
      username: username.trim() || undefined,
      email: email.trim().toLowerCase(),
      password,
      department,
      accountType,

      ...(profilePhoto ? { profilePhoto } : {}),

      ...(accountType === "student"
        ? {
            year,
          }
        : {
            graduationYear,
            currentRole: currentRole.trim(),
            company: company.trim(),
          }),
    };

    try {
      await register(newUser);

      // Read at submit time, not on mount: the query cannot change while the
      // form is on screen, and it keeps ?next= out of React state entirely.
      // Resolves to "/" when absent, and rejects off-site values.
      router.push(readNextParam());
    } catch {
      setRegistrationError(
        "Could not create your account. Please check your details and try again."
      );
    }
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

      <main className="px-[22px] pt-5 pb-[60px]">
        <div className="my-[20px] mb-[45px] text-center">
          <h1 className="text-[30px] font-extrabold tracking-[-1px]">
            Uni<span className="text-indigo-500">Link</span>
          </h1>

          <p className="mt-[5px] text-slate-500 text-[10px]">Ideas. People. Opportunities.</p>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl">Create your account</h2>

          <p className="mt-1.5 text-slate-500 text-[11px] leading-[1.5]">
            Join your college community and start connecting.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            className={`flex min-h-[78px] items-center gap-[9px] rounded-[14px] border p-3 text-left ${
              accountType === "student"
                ? "border-indigo-500 bg-indigo-50 text-indigo-500"
                : "border-slate-200 bg-white text-slate-500"
            }`}
            onClick={() => setAccountType("student")}
          >
            <UserRound size={19} className="shrink-0" />

            <div className="flex flex-col">
              <strong className={`text-[11px] ${accountType === "student" ? "text-indigo-500" : "text-slate-900"}`}>Student</strong>
              <span className="mt-[3px] text-slate-500 text-[8px] leading-[1.3]">Currently studying</span>
            </div>
          </button>

          <button
            type="button"
            className={`flex min-h-[78px] items-center gap-[9px] rounded-[14px] border p-3 text-left ${
              accountType === "alumni"
                ? "border-indigo-500 bg-indigo-50 text-indigo-500"
                : "border-slate-200 bg-white text-slate-500"
            }`}
            onClick={() => setAccountType("alumni")}
          >
            <GraduationCap size={19} className="shrink-0" />

            <div className="flex flex-col">
              <strong className={`text-[11px] ${accountType === "alumni" ? "text-indigo-500" : "text-slate-900"}`}>Alumni</strong>
              <span className="mt-[3px] text-slate-500 text-[8px] leading-[1.3]">Already graduated</span>
            </div>
          </button>
        </div>

        <form
          className="auth-form"
          onSubmit={handleRegister}
        >
          {/* PROFILE PICTURE */}

          <div className="mb-5 flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound size={26} />
                )}
              </div>

              <label className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-indigo-500 text-white transition hover:bg-indigo-600">
                <Camera size={13} />

                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <p className="text-[12px] font-semibold text-slate-900">
                Profile picture
              </p>

              <p className="mt-1 text-[10px] leading-[1.4] text-slate-500">
                Upload a photo so classmates recognise you.
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-[7px] block text-[11px] font-semibold">Full Name *</label>

            <div className="flex h-[46px] items-center gap-[9px] rounded-xl border border-slate-200 bg-white px-[13px] text-slate-400 focus-within:border-indigo-500 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]">
              <input
                className="w-full border-none bg-transparent outline-none placeholder:text-slate-400 text-slate-900 text-[12px]"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-[7px] block text-[11px] font-semibold">Username</label>

            <div className="flex h-[46px] items-center gap-[9px] rounded-xl border border-slate-200 bg-white px-[13px] text-slate-400 focus-within:border-indigo-500 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]">
              <span className="text-[12px] text-slate-400">@</span>

              <input
                className="w-full border-none bg-transparent outline-none placeholder:text-slate-400 text-slate-900 text-[12px]"
                type="text"
                placeholder="username"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-[7px] block text-[11px] font-semibold">College Email *</label>

            <div className="flex h-[46px] items-center gap-[9px] rounded-xl border border-slate-200 bg-white px-[13px] text-slate-400 focus-within:border-indigo-500 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]">
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
            <label className="mb-[7px] block text-[11px] font-semibold">Password *</label>

            <div className="flex h-[46px] items-center gap-[9px] rounded-xl border border-slate-200 bg-white px-[13px] text-slate-400 focus-within:border-indigo-500 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]">
              <input
                className="w-full border-none bg-transparent outline-none placeholder:text-slate-400 text-slate-900 text-[12px]"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-[7px] block text-[11px] font-semibold">Department *</label>

            <select
              className="h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] text-slate-900 text-[12px]"
              value={department}
              onChange={(event) =>
                setDepartment(event.target.value)
              }
              required
            >
              <option value="">Select department</option>
              <option value="CSE">
                Computer Science & Engineering
              </option>
              <option value="ECE">
                Electronics & Communication
              </option>
              <option value="EE">
                Electrical Engineering
              </option>
              <option value="ME">
                Mechanical Engineering
              </option>
              <option value="CE">
                Civil Engineering
              </option>
              <option value="Other">Other</option>
            </select>
          </div>

          {accountType === "student" && (
            <div className="mb-4">
              <label className="mb-[7px] block text-[11px] font-semibold">Year *</label>

              <select
                className="h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] text-slate-900 text-[12px]"
                value={year}
                onChange={(event) =>
                  setYear(event.target.value)
                }
                required
              >
                <option value="">Select year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
          )}

          {accountType === "alumni" && (
            <>
              <div className="mb-4">
                <label className="mb-[7px] block text-[11px] font-semibold">Graduation Year *</label>

                <select
                  className="h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] text-slate-900 text-[12px]"
                  value={graduationYear}
                  onChange={(event) =>
                    setGraduationYear(event.target.value)
                  }
                  required
                >
                  <option value="">
                    Select graduation year
                  </option>

                  {Array.from(
                    { length: 15 },
                    (_, index) => 2026 - index
                  ).map((year) => (
                    <option
                      key={year}
                      value={year}
                    >
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="mb-[7px] block text-[11px] font-semibold">Current Role</label>

                <div className="flex h-[46px] items-center gap-[9px] rounded-xl border border-slate-200 bg-white px-[13px] text-slate-400 focus-within:border-indigo-500 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]">
                  <input
                    className="w-full border-none bg-transparent outline-none placeholder:text-slate-400 text-slate-900 text-[12px]"
                    type="text"
                    placeholder="e.g. Software Engineer"
                    value={currentRole}
                    onChange={(event) =>
                      setCurrentRole(event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="mb-[7px] block text-[11px] font-semibold">Company / Organization</label>

                <div className="flex h-[46px] items-center gap-[9px] rounded-xl border border-slate-200 bg-white px-[13px] text-slate-400 focus-within:border-indigo-500 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]">
                  <input
                    className="w-full border-none bg-transparent outline-none placeholder:text-slate-400 text-slate-900 text-[12px]"
                    type="text"
                    placeholder="e.g. Google"
                    value={company}
                    onChange={(event) =>
                      setCompany(event.target.value)
                    }
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            className="h-[46px] w-full rounded-xl bg-indigo-500 text-white text-[12px] font-semibold active:scale-[0.98]"
          >
            Create Account
          </button>

          {registrationError && (
            <p className="mt-3 text-center text-red-500 text-[11px]">
              {registrationError}
            </p>
          )}
        </form>

        <div className="text-center">
          <p className="text-slate-500 text-[11px]">Already have an account?</p>

          <Link className="mt-1.5 inline-block font-semibold text-indigo-500 text-[12px]" href="/login">
            Log In
          </Link>
        </div>

        <button
          className="mx-auto mt-[25px] block text-slate-500 text-[10px]"
          onClick={() => router.push("/login")}
        >
          Continue browsing
        </button>
      </main>
    </div>
  );
}