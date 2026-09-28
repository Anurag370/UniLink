"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Search,
  GraduationCap,
  BriefcaseBusiness,
  MapPin,
  Users,
  UserPlus,
  Check,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";

import BottomNav from "@/components/BottomNav";
import { useAuth, toClientUser } from "@/context/AuthContext";
import { request } from "@/lib/api-client";

export default function AlumniPage() {
  const router = useRouter();
  const { user, isLoggedIn, loading } = useAuth();

  const [alumni, setAlumni] = useState([]);
  const [search, setSearch] = useState("");
  const [connectionStatuses, setConnectionStatuses] = useState({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await request(
          "/api/users?accountType=alumni&limit=50"
        );

        if (!cancelled) {
          setAlumni(
            (result.users ?? []).map(toClientUser)
          );
        }
      } catch {
        if (!cancelled) {
          setAlumni([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadConnectionStatuses = async () => {
    try {
      const [accepted, incoming, outgoing] =
        await Promise.all([
          request("/api/connections?limit=50"),
          request(
            "/api/connections?status=incoming&limit=50"
          ),
          request(
            "/api/connections?status=outgoing&limit=50"
          ),
        ]);

      const statuses = {};

      (accepted.connections ?? []).forEach((connection) => {
        if (connection.user?.id != null) {
          statuses[connection.user.id] = "accepted";
        }
      });

      (outgoing.connections ?? []).forEach((connection) => {
        if (connection.user?.id != null) {
          statuses[connection.user.id] = "pending";
        }
      });

      (incoming.connections ?? []).forEach((connection) => {
        if (
          connection.user?.id != null &&
          !statuses[connection.user.id]
        ) {
          statuses[connection.user.id] = "pending";
        }
      });

      setConnectionStatuses(statuses);
    } catch {
      setConnectionStatuses({});
    }
  };

  // Load connection statuses
  useEffect(() => {
    if (!user) return;

    void (async () => {
      await loadConnectionStatuses();
    })();
  }, [user, alumni]);

  const filteredAlumni = alumni.filter((person) => {
    const query = search.toLowerCase().trim();

    if (!query) return true;

    return (
      person.name
        ?.toLowerCase()
        .includes(query) ||
      person.department
        ?.toLowerCase()
        .includes(query) ||
      person.currentRole
        ?.toLowerCase()
        .includes(query) ||
      person.company
        ?.toLowerCase()
        .includes(query) ||
      person.location
        ?.toLowerCase()
        .includes(query)
    );
  });

  const handleConnect = async (event, personId) => {
    event.stopPropagation();

    if (!user) return;

    const status =
      connectionStatuses[personId] || "none";

    if (status !== "none") {
      return;
    }

    try {
      await request("/api/connections", {
        method: "POST",
        body: { userId: Number(personId) },
      });

      setConnectionStatuses((previous) => ({
        ...previous,
        [personId]: "pending",
      }));
    } catch {
      // Ignore failed requests locally.
    }
  };

  const openProfile = (personId) => {
    router.push(`/profile/${personId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="flex min-h-screen items-center justify-center px-6">
          <p className="text-sm text-slate-500">
            Loading alumni...
          </p>
        </main>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-50 text-violet-500">
              <GraduationCap size={30} />
            </div>

            <h1 className="mt-5 text-xl font-semibold text-slate-900">
              Login required
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Log in to explore alumni from your college.
            </p>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-6 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
            >
              Go Home
            </button>
          </div>
        </main>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-10">
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pt-10">

        {/* Header */}
        <header className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft size={19} />
          </button>

          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Alumni
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Connect with graduates and explore their careers.
            </p>
          </div>
        </header>

        {/* Search */}
        <div className="relative mt-6">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search alumni by name, role or company..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>

        {/* Count */}
        <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
          <Users size={16} />

          <span>
            {filteredAlumni.length}{" "}
            {filteredAlumni.length === 1
              ? "alumnus"
              : "alumni"}
          </span>
        </div>

        {/* Alumni */}
        <section className="mt-4">
          {filteredAlumni.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <GraduationCap size={25} />
          </div>

              <h2 className="mt-4 text-base font-semibold text-slate-900">
                No alumni found
              </h2>

              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Try searching with a different name,
                company or role.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredAlumni.map((person) => {
                const status =
                  connectionStatuses[person.id] ||
                  "none";

                const isOwnProfile =
                  user &&
                  String(user.id) ===
                    String(person.id);

                return (
                  <article
                    key={person.id}
                    onClick={() =>
                      openProfile(person.id)
                    }
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className="flex items-start gap-4">

                      {/* Avatar */}
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-500">
                        {person.profilePhoto ? (
                          <img
                            src={person.profilePhoto}
                            alt={
                              person.name ||
                              "Alumni"
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xl font-bold text-white">
                            {person.name
                              ?.charAt(0)
                              ?.toUpperCase() ||
                              "A"}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base font-semibold text-slate-900">
                          {person.name ||
                            "Alumni"}
                        </h2>

                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <GraduationCap
                            size={14}
                          />

                          <span>
                            Class of{" "}
                            {person.graduationYear ||
                              "—"}
                          </span>
                        </div>

                        {person.department && (
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {person.department}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Professional Info */}
                    {(person.currentRole ||
                      person.company ||
                      person.location) && (
                      <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">

                        {person.currentRole && (
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <BriefcaseBusiness
                              size={15}
                              className="shrink-0 text-indigo-500"
                            />

                            <span className="truncate">
                              {person.currentRole}
                            </span>
                          </div>
                        )}

                        {person.company && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="ml-[1px] h-[13px] w-[13px] shrink-0 rounded border-2 border-slate-400" />

                            <span className="truncate">
                              {person.company}
                            </span>
                          </div>
                        )}

                        {person.location && (
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <MapPin
                              size={14}
                              className="shrink-0"
                            />

                            <span className="truncate">
                              {person.location}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom Row */}
                    <div className="mt-4 flex items-center justify-between gap-3">

                      {/* Alumni Badge */}
                      <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-600">
                        🎓 Alumni
                      </span>

                      {/* Connection Button */}
                      {!isOwnProfile && (
                        <>
                          {status === "none" && (
                            <button
                              type="button"
                              onClick={(event) =>
                                handleConnect(
                                  event,
                                  person.id
                                )
                              }
                              className="flex items-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-600"
                            >
                              <UserPlus
                                size={14}
                              />
                              Connect
                            </button>
                          )}

                          {status === "pending" && (
                            <button
                              type="button"
                              disabled
                              onClick={(event) =>
                                event.stopPropagation()
                              }
                              className="flex cursor-default items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-500"
                            >
                              <Clock
                                size={14}
                              />
                              Pending
                            </button>
                          )}

                          {status === "accepted" && (
                            <button
                              type="button"
                              disabled
                              onClick={(event) =>
                                event.stopPropagation()
                              }
                              className="flex cursor-default items-center gap-1.5 rounded-xl bg-green-50 px-3.5 py-2 text-xs font-semibold text-green-600"
                            >
                              <Check
                                size={14}
                              />
                              Connected
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}