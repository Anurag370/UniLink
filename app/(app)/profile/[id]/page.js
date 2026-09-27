"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  Code2,
  ExternalLink,
  GitBranch,
  Link as LinkIcon,
  UserPlus,
  Check,
  Clock,
  MessageCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import BottomNav from "@/components/BottomNav";
import { toClientUser, useAuth } from "@/context/AuthContext";
import { request } from "@/lib/api-client";

export default function OtherProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();

  const [connectionStatus, setConnectionStatus] =
    useState("none");

  const [connectionCount, setConnectionCount] =
    useState(0);

  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    if (!params?.id) return;

    try {
      const [
        userResult,
        accepted,
        incoming,
        outgoing,
        projectsResult,
      ] = await Promise.all([
        request(`/api/users/${params.id}`),
        request("/api/connections?limit=50"),
        request("/api/connections?status=incoming&limit=50"),
        request("/api/connections?status=outgoing&limit=50"),
        request(
          `/api/projects?ownerId=${params.id}&limit=50`
        ),
      ]);

      const foundUser = toClientUser(userResult?.user);

      if (!foundUser) {
        setProfile(null);
        setProjects([]);
        setConnectionStatus("none");
        setConnectionCount(0);
        setLoading(false);
        return;
      }

      const has = (list) =>
        (list?.connections ?? []).some(
          (connection) =>
            String(connection.user?.id) ===
            String(params.id)
        );

      setConnectionStatus(
        has(accepted)
          ? "accepted"
          : has(outgoing) || has(incoming)
            ? "pending"
            : "none"
      );
      setConnectionCount(
        (accepted?.connections ?? []).length
      );
      setProjects(projectsResult.projects ?? []);
      setProfile(foundUser);
    } catch {
      setProfile(null);
      setProjects([]);
      setConnectionStatus("none");
      setConnectionCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadProfile();
    })();
  }, [params?.id, user?.id]);

  // Refresh connection state whenever the page becomes visible again.
  useEffect(() => {
    const handleFocus = () => {
      loadProfile();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadProfile();
      }
    };

    window.addEventListener("focus", handleFocus);

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [params?.id, user?.id]);

  const handleConnect = async () => {
    if (!user || !profile) return;

    if (String(user.id) === String(profile.id)) {
      return;
    }

    if (connectionStatus !== "none") {
      return;
    }

    try {
      await request("/api/connections", {
        method: "POST",
        body: { userId: profile.id },
      });

      setConnectionStatus("pending");
    } catch {
      loadProfile();
    }
  };

  const handleMessage = () => {
    if (!user || !profile) return;

    if (String(user.id) === String(profile.id)) {
      return;
    }

    if (connectionStatus !== "accepted") {
      return;
    }

    router.push(`/messages/${profile.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="flex min-h-screen items-center justify-center px-6">
          <p className="text-sm text-slate-500">
            Loading profile...
          </p>
        </main>

        <BottomNav />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-slate-900">
              Profile not found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              This account doesn&apos;t exist.
            </p>

            <button
              type="button"
              onClick={() => router.back()}
              className="mt-5 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600"
            >
              Go Back
            </button>
          </div>
        </main>

        <BottomNav />
      </div>
    );
  }

  const name = profile.name || "Student";

  const username =
    profile.username ||
    profile.email?.split("@")[0] ||
    "unilink-user";

  const isAlumni =
    profile.accountType === "alumni";

  const branch =
    profile.branch ||
    profile.department ||
    profile.course ||
    "Computer Science & Engineering";

  const year =
    profile.year ||
    profile.studyYear ||
    "1st Year";

  const graduationYear =
    profile.graduationYear ||
    profile.passoutYear ||
    profile.yearPassedOut ||
    "";

  const currentJob =
    profile.currentJob ||
    profile.currentRole ||
    profile.jobTitle ||
    profile.position ||
    "";

  const company =
    profile.company ||
    profile.currentCompany ||
    "";

  const bio =
    profile.bio ||
    "Building, learning and connecting with people at UniLink.";

  const skills = Array.isArray(profile.skills)
    ? profile.skills
    : [];

  const github =
    profile.github ||
    profile.githubUrl ||
    "";

  const linkedin =
    profile.linkedin ||
    profile.linkedinUrl ||
    "";

  const profilePhoto =
    profile.profilePhoto ||
    profile.avatar ||
    `https://i.pravatar.cc/200?u=${profile.id}`;

  const isOwnProfile =
    user &&
    String(user.id) === String(profile.id);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-10">

      {/* Header */}
      <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md">

        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-base font-semibold text-slate-900">
          Profile
        </h1>

        {isOwnProfile ? (
          <button
            type="button"
            onClick={() =>
              router.push("/profile/edit")
            }
            className="text-sm font-semibold text-indigo-500"
          >
            Edit
          </button>
        ) : (
          <div className="w-9" />
        )}
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-[820px] px-4 py-6 sm:px-6 lg:px-8">

        {/* Profile */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex flex-col items-center text-center">

            <img
              src={profilePhoto}
              alt={name}
              className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md"
            />

            <h2 className="mt-4 text-xl font-bold text-slate-900">
              {name}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              @{username}
            </p>

            {/* Badges */}
            <div className="mt-3 flex flex-wrap justify-center gap-2">

              <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-500">
                {branch}
              </span>

              {!isAlumni && (
                <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {year}
                </span>
              )}

              {isAlumni && (
                <span className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-500">
                  🎓 Alumni
                </span>
              )}
            </div>

            {/* Alumni information */}
            {isAlumni &&
              (graduationYear ||
                currentJob ||
                company) && (
                <div className="mt-4 flex flex-col items-center gap-1">

                  {graduationYear && (
                    <p className="text-sm font-medium text-violet-600">
                      Class of {graduationYear}
                    </p>
                  )}

                  {(currentJob || company) && (
                    <p className="text-sm text-slate-500">
                      {currentJob || "Professional"}

                      {currentJob && company && " • "}

                      {company}
                    </p>
                  )}

                </div>
              )}

            <p className="mt-4 max-w-[600px] text-sm leading-6 text-slate-600">
              {bio}
            </p>

            {/* Connection / Message */}
            {!isOwnProfile && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">

                {connectionStatus === "none" && (
                  <button
                    type="button"
                    onClick={handleConnect}
                    className="flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600"
                  >
                    <UserPlus size={16} />
                    Connect
                  </button>
                )}

                {connectionStatus === "pending" && (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-500">
                    <Clock size={16} />
                    Pending
                  </div>
                )}

                {connectionStatus === "accepted" && (
                  <>
                    <div className="flex items-center gap-2 rounded-xl bg-green-50 px-5 py-2.5 text-sm font-semibold text-green-600">
                      <Check size={16} />
                      Connected
                    </div>

                    <button
                      type="button"
                      onClick={handleMessage}
                      className="flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600"
                    >
                      <MessageCircle size={16} />
                      Message
                    </button>
                  </>
                )}

              </div>
            )}

            {/* Stats */}
            <div className="mt-6 grid w-full max-w-[420px] grid-cols-2 divide-x divide-slate-200 border-y border-slate-200 py-4">

              <div className="flex flex-col items-center">
                <strong className="text-lg font-bold text-slate-900">
                  {connectionCount}
                </strong>

                <span className="mt-1 text-xs text-slate-500">
                  Connections
                </span>
              </div>

              <div className="flex flex-col items-center">
                <strong className="text-lg font-bold text-slate-900">
                  {projects.length}
                </strong>

                <span className="mt-1 text-xs text-slate-500">
                  Projects
                </span>
              </div>

            </div>

            {/* Links */}
            {(github || linkedin) && (
              <div className="mt-5 flex flex-wrap justify-center gap-3">

                {github && (
                  <a
                    href={github}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <GitBranch size={16} />
                    GitHub
                    <ExternalLink size={13} />
                  </a>
                )}

                {linkedin && (
                  <a
                    href={linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <LinkIcon size={16} />
                    LinkedIn
                    <ExternalLink size={13} />
                  </a>
                )}

              </div>
            )}

          </div>
        </section>

        {/* About */}
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
              <Briefcase size={19} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                About
              </h3>

              <p className="text-xs text-slate-500">
                Academic and professional information
              </p>
            </div>

          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Department
              </p>

              <p className="mt-1 text-sm font-medium text-slate-800">
                {branch}
              </p>
            </div>

            {!isAlumni && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Year
                </p>

                <p className="mt-1 text-sm font-medium text-slate-800">
                  {year}
                </p>
              </div>
            )}

            {isAlumni && graduationYear && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Graduation Year
                </p>

                <p className="mt-1 text-sm font-medium text-slate-800">
                  {graduationYear}
                </p>
              </div>
            )}

            {isAlumni && currentJob && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Current Role
                </p>

                <p className="mt-1 text-sm font-medium text-slate-800">
                  {currentJob}
                </p>
              </div>
            )}

            {isAlumni && company && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Company
                </p>

                <p className="mt-1 text-sm font-medium text-slate-800">
                  {company}
                </p>
              </div>
            )}

            {profile.email && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Email
                </p>

                <p className="mt-1 break-all text-sm font-medium text-slate-800">
                  {profile.email}
                </p>
              </div>
            )}

          </div>
        </section>

        {/* Skills */}
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
              <Code2 size={19} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Skills
              </h3>

              <p className="text-xs text-slate-500">
                Technologies and areas of expertise
              </p>
            </div>

          </div>

          {skills.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <span
                  key={`${skill?.name ?? skill}-${index}`}
                  className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700"
                >
                  {skill?.name ?? skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-400">
              No skills added yet.
            </p>
          )}

        </section>

        {/* Projects */}
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-500">
              <Code2 size={19} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Projects
              </h3>

              <p className="text-xs text-slate-500">
                Projects they&apos;ve worked on
              </p>
            </div>

          </div>

          {projects.length > 0 ? (
            <div className="mt-5 space-y-3">

              {projects.map((project, index) => {

                const projectName =
                  typeof project === "string"
                    ? project
                    : project.name ||
                      project.title ||
                      "Untitled Project";

                const description =
                  typeof project === "string"
                    ? ""
                    : project.description || "";

                const link =
                  typeof project === "string"
                    ? ""
                    : project.link ||
                      project.url ||
                      "";

                return (
                  <div
                    key={
                      project.id ||
                      `${projectName}-${index}`
                    }
                    className="rounded-xl border border-slate-200 p-4"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div>

                        <h4 className="text-sm font-semibold text-slate-900">
                          {projectName}
                        </h4>

                        {description && (
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {description}
                          </p>
                        )}

                      </div>

                      {link && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                        >
                          <ExternalLink size={15} />
                        </a>
                      )}

                    </div>

                  </div>
                );
              })}

            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-400">
              No projects added yet.
            </p>
          )}

        </section>

      </main>

      <BottomNav />
    </div>
  );
}