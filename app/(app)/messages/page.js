"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  MessageCircle,
  Search,
  X,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";

import BottomNav from "@/components/BottomNav";
import LoginPrompt from "@/components/LoginPrompt";
import { useAuth } from "@/context/AuthContext";
import { request } from "@/lib/api-client";

function toClientAccount(apiUser) {
  if (!apiUser) return null;

  const profile = apiUser.profile ?? {};

  return {
    id: apiUser.id,
    name: apiUser.fullName,
    username: apiUser.username ?? "",
    department: profile.department ?? "",
    year: profile.year ?? "",
    profilePhoto: "",
    avatar: "",
  };
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, isLoggedIn, loading } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMessageSearch, setNewMessageSearch] = useState("");
  const [people, setPeople] = useState([]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const loadConversations = async () => {
      try {
        const result = await request("/api/messages?limit=50");

        if (cancelled) return;

        const data = (result.conversations ?? [])
          .map((conversation) => ({
            account: toClientAccount(conversation.user),
            latestMessage: conversation.latestMessage,
            unreadCount: conversation.unreadCount,
            online: conversation.user?.activeState === "online",
          }))
          .filter((item) => item.account)
          .sort((a, b) => {
            const timeA = Number(
              a.latestMessage?.createdAt || 0
            );

            const timeB = Number(
              b.latestMessage?.createdAt || 0
            );

            return timeB - timeA;
          });

        setConversations(data);
      } catch {
        if (!cancelled) {
          setConversations([]);
        }
      }
    };

    loadConversations();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      try {
        const result = await request(
          "/api/users?accountType=student&limit=50"
        );

        if (!cancelled) {
          setPeople(
            (result.users ?? []).map(toClientAccount)
          );
        }
      } catch {
        if (!cancelled) {
          setPeople([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(Number(timestamp));
    const now = new Date();

    const sameDay =
      date.toDateString() === now.toDateString();

    if (sameDay) {
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString([], {
      day: "numeric",
      month: "short",
    });
  };

  const filteredConversations =
    conversations.filter(({ account }) => {
      const query = search.trim().toLowerCase();

      if (!query) return true;

      return (
        account.name?.toLowerCase().includes(query) ||
        account.username?.toLowerCase().includes(query) ||
        account.department?.toLowerCase().includes(query)
      );
    });

  const filteredPeople = people.filter((account) => {
    if (!user) return false;

    if (String(account.id) === String(user.id)) {
      return false;
    }

    const query = newMessageSearch.trim().toLowerCase();

    if (!query) return true;

    return (
      account.name?.toLowerCase().includes(query) ||
      account.username?.toLowerCase().includes(query) ||
      account.department?.toLowerCase().includes(query) ||
      account.year?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="flex min-h-screen items-center justify-center px-6">
          <p className="text-sm text-slate-500">
            Loading conversations...
          </p>
        </main>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <div className="min-h-screen bg-slate-50">
          <main className="flex min-h-screen items-center justify-center px-6">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                <MessageCircle size={28} />
              </div>

              <h1 className="mt-5 text-xl font-semibold text-slate-900">
                Login required
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Log in to view your messages.
              </p>

              <button
                onClick={() => setShowLoginPrompt(true)}
                className="mt-6 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-600"
              >
                Log In
              </button>
            </div>
          </main>
        </div>

        <LoginPrompt
          isOpen={showLoginPrompt}
          onClose={() => setShowLoginPrompt(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-10">
      <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pt-10">

        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Messages
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Your conversations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewMessageSearch("");
              setShowNewMessage(true);
            }}
            className="flex h-10 items-center gap-2 rounded-xl bg-indigo-500 px-4 text-xs font-semibold text-white transition hover:bg-indigo-600"
          >
            <UserPlus size={16} />
            <span className="hidden sm:inline">
              New Message
            </span>
          </button>
        </header>

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
            placeholder="Search conversations..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <section className="mt-5">
          {filteredConversations.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <MessageCircle size={28} />
              </div>

              <h2 className="mt-5 text-base font-semibold text-slate-900">
                {search
                  ? "No conversations found"
                  : "No messages yet"}
              </h2>

              <p className="mt-2 max-w-sm text-sm leading-5 text-slate-500">
                {search
                  ? "Try searching for another person."
                  : "Start a conversation with one of your connections."}
              </p>

              {!search && (
                <button
                  onClick={() => setShowNewMessage(true)}
                  className="mt-5 rounded-xl bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-600"
                >
                  Start a Conversation
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {filteredConversations.map(
                ({
                  account,
                  latestMessage,
                  unreadCount,
                  online,
                }) => {
                  const photo =
                    account.profilePhoto ||
                    account.avatar;

                  const lastMessage =
                    latestMessage?.text ||
                    "Start a conversation";

                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() =>
                        router.push(
                          `/messages/${account.id}`
                        )
                      }
                      className="flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left transition last:border-b-0 hover:bg-slate-50"
                    >
                      <div className="relative shrink-0">
                        {photo ? (
                          <img
                            src={photo}
                            alt={account.name || "User"}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-lg font-bold text-indigo-500">
                            {account.name
                              ?.charAt(0)
                              ?.toUpperCase() || "U"}
                          </div>
                        )}

                        {online && (
                          <span
                            aria-label="Online"
                            className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-green-500"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3
                            className={`truncate text-sm ${
                              unreadCount > 0
                                ? "font-bold text-slate-900"
                                : "font-semibold text-slate-800"
                            }`}
                          >
                            {account.name || "Student"}
                          </h3>

                          <span className="shrink-0 text-[10px] text-slate-400">
                            {formatTime(
                              latestMessage?.createdAt
                            )}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-3">
                          <p
                            className={`truncate text-xs ${
                              unreadCount > 0
                                ? "font-semibold text-slate-700"
                                : "text-slate-500"
                            }`}
                          >
                            {lastMessage}
                          </p>

                          {unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[9px] font-bold text-white">
                              {unreadCount > 9
                                ? "9+"
                                : unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </section>
      </main>

      {showNewMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  New Message
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Choose someone to message
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewMessage(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative px-5 pt-4">
              <Search
                size={17}
                className="absolute left-8 top-1/2 mt-2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={newMessageSearch}
                onChange={(event) =>
                  setNewMessageSearch(event.target.value)
                }
                placeholder="Search students..."
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="max-h-[400px] overflow-y-auto px-5 pb-5 pt-3">
              {filteredPeople.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    No students found
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Try another search.
                  </p>
                </div>
              ) : (
                filteredPeople.map((account) => {
                  const photo =
                    account.profilePhoto ||
                    account.avatar;

                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => {
                        setShowNewMessage(false);
                        router.push(
                          `/messages/${account.id}`
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50"
                    >
                      {photo ? (
                        <img
                          src={photo}
                          alt={account.name || "Student"}
                          className="h-11 w-11 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-semibold text-indigo-500">
                          {account.name
                            ?.charAt(0)
                            ?.toUpperCase() || "U"}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {account.name || "Student"}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {[
                            account.department,
                            account.year,
                          ]
                            .filter(Boolean)
                            .join(" • ") ||
                            "Student"}
                        </p>
                      </div>

                      <MessageCircle
                        size={17}
                        className="shrink-0 text-indigo-500"
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}