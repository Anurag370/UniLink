"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Save,
  Code2,
  ExternalLink,
  FolderGit2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { request } from "@/lib/api-client";

export default function AddProject() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [technologies, setTechnologies] = useState("");
  const [github, setGithub] = useState("");
  const [demo, setDemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  if (!user) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaveError("");

    try {
      setSaving(true);

      await request("/api/projects", {
        method: "POST",
        body: {
          name: name.trim(),
          description: description.trim(),
          technologies: technologies.trim(),
          github: github.trim(),
          demo: demo.trim(),
        },
      });

      router.push("/profile");
    } catch {
      setSaveError(
        "Could not add your project. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-[64px] w-full max-w-[1000px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="flex size-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 className="text-base font-semibold text-slate-900">
                Add Project
              </h1>

              <p className="hidden text-[11px] text-slate-500 sm:block">
                Showcase something you&apos;ve built
              </p>
            </div>
          </div>

          <button
            type="submit"
            form="project-form"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Adding..." : "Add Project"}
          </button>
        </div>
      </header>

      {saveError && (
        <p className="mx-auto mt-3 max-w-[1000px] px-4 text-center text-sm text-red-500 sm:px-6 lg:px-8">
          {saveError}
        </p>
      )}

      <main className="mx-auto w-full max-w-[1000px] px-4 pt-6 pb-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
              <FolderGit2 size={23} />
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Add a project
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add a project to your UniLink profile so other students can
                discover your work.
              </p>
            </div>
          </div>
        </div>

        <form
          id="project-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-base font-semibold text-slate-900">
                  Project Information
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Tell people what you built and why it matters.
                </p>
              </div>

              <div className="mb-5">
                <label className="mb-2 block text-xs font-semibold text-slate-800">
                  Project Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="e.g. Campus Connect"
                  required
                  className="
                    w-full
                    rounded-xl
                    border border-slate-200
                    bg-slate-50
                    px-4
                    py-3
                    text-sm
                    text-slate-900
                    outline-none
                    transition
                    placeholder:text-slate-400
                    focus:border-indigo-500
                    focus:bg-white
                    focus:ring-4
                    focus:ring-indigo-500/10
                  "
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">
                    Description
                  </label>

                  <span className="text-[10px] text-slate-400">
                    {description.length}/500
                  </span>
                </div>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="What did you build? What problem does it solve? What makes it useful?"
                  maxLength={500}
                  required
                  className="
                    min-h-[230px]
                    w-full
                    resize-none
                    rounded-xl
                    border border-slate-200
                    bg-slate-50
                    px-4
                    py-3
                    text-sm
                    leading-6
                    text-slate-900
                    outline-none
                    transition
                    placeholder:text-slate-400
                    focus:border-indigo-500
                    focus:bg-white
                    focus:ring-4
                    focus:ring-indigo-500/10
                  "
                />
              </div>
            </section>

            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-slate-900">
                    Technologies
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Add the technologies used in your project.
                  </p>
                </div>

                <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <Code2 size={15} />
                  Tech Stack
                </label>

                <input
                  type="text"
                  value={technologies}
                  onChange={(event) =>
                    setTechnologies(event.target.value)
                  }
                  placeholder="React, Node.js, MongoDB"
                  required
                  className="
                    w-full
                    rounded-xl
                    border border-slate-200
                    bg-slate-50
                    px-4
                    py-3
                    text-sm
                    text-slate-900
                    outline-none
                    transition
                    placeholder:text-slate-400
                    focus:border-indigo-500
                    focus:bg-white
                    focus:ring-4
                    focus:ring-indigo-500/10
                  "
                />

                <p className="mt-2 text-[10px] text-slate-400">
                  Separate technologies with commas.
                </p>

                {technologies.trim() && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {technologies
                      .split(",")
                      .map((technology) => technology.trim())
                      .filter(Boolean)
                      .map((technology, index) => (
                        <span
                          key={`${technology}-${index}`}
                          className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-medium text-indigo-600"
                        >
                          {technology}
                        </span>
                      ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-slate-900">
                    Project Links
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Let people view your source code or live project.
                  </p>
                </div>

                <div className="mb-5">
                  <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <Code2 size={15} />
                    GitHub Repository
                  </label>

                  <input
                    type="url"
                    value={github}
                    onChange={(event) =>
                      setGithub(event.target.value)
                    }
                    placeholder="https://github.com/username/project"
                    className="
                      w-full
                      rounded-xl
                      border border-slate-200
                      bg-slate-50
                      px-4
                      py-3
                      text-sm
                      text-slate-900
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-indigo-500
                      focus:bg-white
                      focus:ring-4
                      focus:ring-indigo-500/10
                    "
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <ExternalLink size={15} />
                    Live Demo
                  </label>

                  <input
                    type="url"
                    value={demo}
                    onChange={(event) =>
                      setDemo(event.target.value)
                    }
                    placeholder="https://your-project.com"
                    className="
                      w-full
                      rounded-xl
                      border border-slate-200
                      bg-slate-50
                      px-4
                      py-3
                      text-sm
                      text-slate-900
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-indigo-500
                      focus:bg-white
                      focus:ring-4
                      focus:ring-indigo-500/10
                    "
                  />
                </div>
              </section>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Ready to showcase your project?
              </p>

              <p className="mt-1 text-xs text-slate-500">
                You can edit your project later from your profile.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="
                flex
                shrink-0
                items-center
                gap-2
                rounded-xl
                bg-indigo-500
                px-5
                py-3
                text-xs
                font-semibold
                text-white
                transition
                hover:bg-indigo-600
                active:scale-[0.98]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <Save size={16} />
              {saving ? "Adding..." : "Add Project"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}