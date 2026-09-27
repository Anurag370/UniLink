"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Save,
  UserRound,
  Code2,
  ExternalLink,
  Camera,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function EditProfile() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const isAlumni = user?.accountType === "alumni";

  const [name, setName] = useState(user?.name || "");

  const [profilePhoto, setProfilePhoto] = useState(
    user?.profilePhoto || ""
  );

  const [bio, setBio] = useState(user?.bio || "");

  const [skills, setSkills] = useState(
    (user?.skills ?? [])
      .map((skill) => skill?.name ?? skill)
      .join(", ") || ""
  );

  const [github, setGithub] = useState(
    user?.github || ""
  );

  const [linkedin, setLinkedin] = useState(
    user?.linkedin || ""
  );

  const [graduationYear, setGraduationYear] =
    useState(
      user?.graduationYear
        ? String(user.graduationYear)
        : ""
    );

  const [currentRole, setCurrentRole] = useState(
    user?.currentRole || ""
  );

  const [company, setCompany] = useState(
    user?.company || ""
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  if (!user) {
    return null;
  }

  const displayYear = isAlumni
    ? graduationYear
      ? `Class of ${graduationYear}`
      : "Alumni"
    : user.year || "";

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setProfilePhoto(reader.result);
    };

    reader.readAsDataURL(file);
  };

  const handleSave = async (event) => {
    event.preventDefault();

    setSaveError("");

    const updatedData = {
      fullName: name.trim(),
      bio: bio.trim(),
      profilePhoto,

      skills: skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),

      github: github.trim(),
      linkedin: linkedin.trim(),
    };

    if (isAlumni) {
      const trimmedYear = graduationYear.trim();

      if (trimmedYear) {
        updatedData.graduationYear = Number(trimmedYear);
      }

      updatedData.currentRole = currentRole.trim();
      updatedData.company = company.trim();
    }

    try {
      setSaving(true);

      await updateUser(updatedData);

      router.push("/profile");
    } catch {
      setSaveError(
        "Could not save your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6 lg:px-8">

          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft size={22} />
          </button>

          <h1 className="ml-3 text-lg font-semibold text-slate-900 sm:text-xl">
            Edit Profile
          </h1>

        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">

        {/* Profile Preview */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

            {/* Avatar */}
            <div className="relative shrink-0 self-center sm:self-auto">

              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm sm:h-24 sm:w-24">

                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound size={38} />
                )}

              </div>

              <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-indigo-500 text-white shadow-sm transition hover:bg-indigo-600">

                <Camera size={15} />

                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />

              </label>

            </div>

            {/* User Info */}
            <div className="text-center sm:text-left">

              <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                {name || "Your Name"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {user.department}
                {displayYear && ` • ${displayYear}`}
              </p>

              {isAlumni && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-600">
                  <GraduationCap size={14} />
                  Alumni
                </span>
              )}

            </div>

          </div>
        </section>

        <form onSubmit={handleSave}>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Basic Information */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

              <h2 className="mb-5 text-lg font-semibold text-slate-900">
                Basic Information
              </h2>

              {/* Name */}
              <div className="mb-5">

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Full Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Your full name"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                />

              </div>

              {/* Bio */}
              <div>

                <div className="mb-2 flex items-center justify-between">

                  <label className="text-sm font-medium text-slate-700">
                    Bio
                  </label>

                  <span className="text-xs text-slate-400">
                    {bio.length}/250
                  </span>

                </div>

                <textarea
                  value={bio}
                  onChange={(event) =>
                    setBio(event.target.value)
                  }
                  placeholder="Tell people a little about yourself..."
                  maxLength={250}
                  rows={5}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                />

              </div>

            </section>

            {/* Skills */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

              <h2 className="mb-5 text-lg font-semibold text-slate-900">
                Skills
              </h2>

              <label className="mb-2 block text-sm font-medium text-slate-700">
                Your Skills
              </label>

              <input
                type="text"
                value={skills}
                onChange={(event) =>
                  setSkills(event.target.value)
                }
                placeholder="Java, Python, React, SQL"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />

              <p className="mt-2 text-xs text-slate-400">
                Separate skills with commas.
              </p>

              {skills.trim() && (
                <div className="mt-5 flex flex-wrap gap-2">

                  {skills
                    .split(",")
                    .map((skill) => skill.trim())
                    .filter(Boolean)
                    .map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600"
                      >
                        {skill}
                      </span>
                    ))}

                </div>
              )}

            </section>

            {/* Alumni Information */}
            {isAlumni && (
              <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">

                <div className="mb-5 flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
                    <GraduationCap size={20} />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Alumni Information
                    </h2>

                    <p className="text-xs text-slate-500">
                      Your academic history
                    </p>
                  </div>

                </div>

                {/* Graduation Year */}
                <div className="mb-5">

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Graduation Year
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={graduationYear}
                    onChange={(event) =>
                      setGraduationYear(
                        event.target.value
                      )
                    }
                    placeholder="e.g. 2025"
                    maxLength={4}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    The year you graduated from college.
                  </p>

                </div>

                {/* Current Role */}
                <div className="mb-5">

                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Briefcase size={16} />
                    Current Role
                  </label>

                  <input
                    type="text"
                    value={currentRole}
                    onChange={(event) =>
                      setCurrentRole(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Software Engineer"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />

                </div>

                {/* Company */}
                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Company / Organization
                  </label>

                  <input
                    type="text"
                    value={company}
                    onChange={(event) =>
                      setCompany(event.target.value)
                    }
                    placeholder="e.g. Google"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />

                </div>

              </section>
            )}

            {/* Social Links */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

              <h2 className="mb-5 text-lg font-semibold text-slate-900">
                Social Links
              </h2>

              {/* GitHub */}
              <div className="mb-5">

                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Code2 size={16} />
                  GitHub
                </label>

                <input
                  type="url"
                  value={github}
                  onChange={(event) =>
                    setGithub(event.target.value)
                  }
                  placeholder="https://github.com/username"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                />

              </div>

              {/* LinkedIn */}
              <div>

                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <ExternalLink size={16} />
                  LinkedIn
                </label>

                <input
                  type="url"
                  value={linkedin}
                  onChange={(event) =>
                    setLinkedin(event.target.value)
                  }
                  placeholder="https://linkedin.com/in/username"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                />

              </div>

            </section>

          </div>

          {/* Save */}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={() =>
                router.push("/profile")
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Save size={17} />
              {saving ? "Saving..." : "Save Changes"}
            </button>

          </div>

          {saveError && (
            <p className="mt-4 text-center text-sm text-red-500">
              {saveError}
            </p>
          )}

        </form>
      </main>
    </div>
  );
}