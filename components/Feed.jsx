"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Bell,
  Plus,
  Users,
  UserPlus,
  CalendarDays,
  MapPin,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";
import LoginPrompt from "@/components/LoginPrompt";
import PostCard from "@/components/PostCard";
import Sidebar from "@/components/Sidebar";
import StoryViewer from "@/components/StoryViewer";
import { request } from "@/lib/api-client";

function formatDate(date) {
  if (!date) return "";

  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Feed() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [storyIndex, setStoryIndex] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [connectState, setConnectState] = useState({});
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadPosts = async () => {
      try {
        const result = await request("/api/posts");
        if (!cancelled) {
          setPosts(result.posts ?? []);
        }
      } catch {
        if (!cancelled) {
          setPosts([]);
        }
      }
    };

    loadPosts();

    const onFocus = () => loadPosts();

    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadStories = async () => {
      if (!isLoggedIn) return;

      try {
        const result = await request("/api/stories");
        if (!cancelled) {
          setStories(result.stories ?? []);
        }
      } catch {
        if (!cancelled) {
          setStories([]);
        }
      }
    };

    loadStories();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;

    let cancelled = false;

    const loadSuggestions = async () => {
      try {
        const [usersResult, acceptedResult, outgoingResult] =
          await Promise.all([
            request("/api/users?limit=50"),
            request("/api/connections?limit=100"),
            request("/api/connections?status=outgoing&limit=100"),
          ]);

        if (cancelled) return;

        const linked = new Set();

        (acceptedResult.connections ?? []).forEach((connection) => {
          if (connection.user?.id != null) linked.add(connection.user.id);
        });

        (outgoingResult.connections ?? []).forEach((connection) => {
          if (connection.user?.id != null) linked.add(connection.user.id);
        });

        const list = (usersResult.users ?? [])
          .filter(
            (candidate) =>
              candidate.id !== user?.id && !linked.has(candidate.id)
          )
          .slice(0, 4);

        setSuggestions(list);
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      }
    };

    loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadOpportunities = async () => {
      try {
        const result = await request("/api/opportunities?limit=50");

        if (!cancelled) {
          const list = (result.opportunities ?? [])
            .slice()
            .sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")))
            .slice(0, 3);

          setUpcoming(list);
        }
      } catch {
        if (!cancelled) {
          setUpcoming([]);
        }
      }
    };

    loadOpportunities();

    return () => {
      cancelled = true;
    };
  }, []);

  const requireLogin = (action) => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }

    action();
  };

  const handleConnect = async (accountId) => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }

    setConnectState((previous) => ({
      ...previous,
      [accountId]: "loading",
    }));

    try {
      await request("/api/connections", {
        method: "POST",
        body: { userId: accountId },
      });

      setConnectState((previous) => ({
        ...previous,
        [accountId]: "pending",
      }));
    } catch {
      setConnectState((previous) => ({
        ...previous,
        [accountId]: "failed",
      }));
    }
  };

  const profilePhoto =
    user?.profilePhoto ||
    `https://i.pravatar.cc/100?u=${user?.id || "user"}`;

  const renderConnectButton = (accountId) => {
    const state = connectState[accountId] || "idle";

    if (state === "pending") {
      return (
        <span className="rounded-lg bg-green-50 px-3 py-1.5 text-[11px] font-semibold text-green-600">
          Pending
        </span>
      );
    }

    if (state === "loading") {
      return (
        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
          Sending…
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleConnect(accountId)}
        className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
          state === "failed"
            ? "border border-red-200 bg-white text-red-600 hover:bg-red-50"
            : "bg-indigo-500 text-white hover:bg-indigo-600"
        }`}
      >
        {state === "failed" ? "Retry" : "Connect"}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">

      <Sidebar />

      <div className="lg:ml-[240px]">

        <header className="sticky top-0 z-40 flex h-[60px] items-center border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-end px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => router.push("/notifications")}
              aria-label="Notifications"
              className="flex size-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
            >
              <Bell size={20} />
            </button>
          </div>
        </header>


        <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">

          <div className="relative">
            <Search
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Search posts, people, opportunities..."
              onClick={() => router.push("/search")}
              readOnly
              className="h-[48px] w-full cursor-pointer rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 transition hover:border-slate-300"
            />
          </div>

          <div className="mt-5 xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start xl:gap-6">

            <div>

              <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex gap-5 overflow-x-auto pb-1 scrollbar-hide">

                  <button
                    type="button"
                    onClick={() => requireLogin(() => router.push("/create/story"))}
                    className="flex min-w-[58px] flex-col items-center"
                  >
                    <div className="relative">
                      <img
                        src={profilePhoto}
                        alt="Your story"
                        className="size-[58px] rounded-full border-2 border-slate-200 object-cover"
                      />

                      <span className="absolute bottom-0 right-0 flex size-5 items-center justify-center rounded-full border-2 border-white bg-indigo-500 text-white">
                        <Plus size={12} />
                      </span>
                    </div>

                    <span className="mt-2 max-w-[65px] truncate text-[11px] font-medium text-slate-700">
                      Your story
                    </span>
                  </button>


                  {stories.map((story, index) => (
                    <button
                      type="button"
                      key={story.id}
                      onClick={() => setStoryIndex(index)}
                      className="flex min-w-[58px] flex-col items-center"
                    >
                      <div className="rounded-full bg-gradient-to-tr from-indigo-500 via-violet-500 to-pink-500 p-[2px]">
                        <div className="rounded-full bg-white p-[2px]">
                          <img
                            src={
                              story.user?.profilePhoto ||
                              `https://i.pravatar.cc/100?u=${story.user?.id || "story"}`
                            }
                            alt={story.user?.fullName || "Story"}
                            className="size-[54px] rounded-full object-cover"
                          />
                        </div>
                      </div>

                      <span className="mt-2 max-w-[65px] truncate text-[11px] font-medium text-slate-700">
                        {story.user?.fullName || "Story"}
                      </span>
                    </button>
                  ))}
                </div>
              </section>


              <section className="mt-5 space-y-5">
                {posts.length > 0 ? (
                  posts.map((post) => <PostCard key={post.id} post={post} />)
                ) : (

                  <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                      <Users size={26} />
                    </div>

                    <h3 className="mt-4 text-base font-semibold text-slate-900">
                      Your feed is empty
                    </h3>

                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                      Connect with people and share something with your
                      college network.
                    </p>

                    <button
                      type="button"
                      onClick={() => router.push("/search")}
                      className="mt-5 rounded-xl bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-600"
                    >
                      Find People
                    </button>
                  </div>
                )}
              </section>
            </div>


            <aside className="hidden space-y-4 xl:block">

              {suggestions.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Suggested connections
                    </h2>

                    <button
                      type="button"
                      onClick={() => router.push("/connections")}
                      className="text-[11px] font-medium text-indigo-600 transition hover:text-indigo-700"
                    >
                      View all
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {suggestions.map((candidate) => {
                      const profile = candidate.profile ?? {};

                      return (
                        <div
                          key={candidate.id}
                          className="flex items-center gap-3"
                        >
                          <button
                            type="button"
                            onClick={() => router.push(`/profile/${candidate.id}`)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <img
                              src={
                                candidate.profilePhoto ||
                                `https://i.pravatar.cc/100?u=${candidate.id}`
                              }
                              alt={candidate.fullName || "Student"}
                              className="size-10 shrink-0 rounded-full object-cover"
                            />

                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold text-slate-900">
                                {candidate.fullName || "Student"}
                              </p>

                              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                                {profile.department || "Student"}
                                {profile.year ? ` · ${profile.year}` : ""}
                              </p>
                            </div>
                          </button>

                          {renderConnectButton(candidate.id)}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}


              {upcoming.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Upcoming opportunities
                    </h2>

                    <button
                      type="button"
                      onClick={() => router.push("/opportunities")}
                      className="text-[11px] font-medium text-indigo-600 transition hover:text-indigo-700"
                    >
                      View all
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {upcoming.map((opportunity) => (
                      <button
                        type="button"
                        key={opportunity.id}
                        onClick={() =>
                          router.push(`/opportunities/${opportunity.id}`)
                        }
                        className="block w-full rounded-xl border border-slate-100 p-3 text-left transition hover:border-indigo-100 hover:bg-slate-50"
                      >
                        <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                          {opportunity.type || "Opportunity"}
                        </span>

                        <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-5 text-slate-900">
                          {opportunity.title}
                        </p>

                        <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                          {opportunity.date && (
                            <span className="flex items-center gap-1">
                              <CalendarDays size={12} />
                              {formatDate(opportunity.date)}
                            </span>
                          )}

                          {opportunity.location && (
                            <span className="flex min-w-0 items-center gap-1">
                              <MapPin size={12} />
                              <span className="truncate">
                                {opportunity.location}
                              </span>
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}


              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Quick links
                </h2>

                <div className="mt-3 space-y-1">
                  <button
                    type="button"
                    onClick={() => router.push("/search")}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[13px] text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Search size={16} className="text-slate-400" />
                    Find people
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/requests")}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[13px] text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <UserPlus size={16} className="text-slate-400" />
                    Connection requests
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/opportunities")}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[13px] text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <CalendarDays size={16} className="text-slate-400" />
                    Browse opportunities
                  </button>
                </div>
              </section>

              <p className="px-1 text-[11px] leading-5 text-slate-400">
                UniLink · The campus network for students.
              </p>
            </aside>
          </div>
        </main>
      </div>


      <BottomNav />


      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
      />


      {storyIndex !== null && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          startIndex={storyIndex}
          onClose={() => setStoryIndex(null)}
        />
      )}
    </div>
  );
}
