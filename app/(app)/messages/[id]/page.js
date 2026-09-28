"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, MoreVertical, User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import BottomNav from "@/components/BottomNav";
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
    profilePhoto: apiUser.profilePhoto ?? "",
    avatar: apiUser.profilePhoto ?? "",
  };
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();

  const { user, isLoggedIn, loading: authLoading } = useAuth();

  const otherUserId = params?.id;

  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [peerActive, setPeerActive] = useState("offline");

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user || !otherUserId) return;

    let cancelled = false;

    (async () => {
      try {
        const result = await request(
          `/api/users/${otherUserId}`
        );

        if (!cancelled) {
          setOtherUser(toClientAccount(result.user));
        }
      } catch (err) {
        if (!cancelled) {
          setOtherUser(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, otherUserId]);

  useEffect(() => {
    if (!user || !otherUserId) return;

    let cancelled = false;

    const checkConnection = async () => {
      try {
        const result = await request(            "/api/connections?status=connected&limit=50"
        );

        const found = (result.connections ?? []).some(
          (connection) =>
            String(connection.user?.id) === String(otherUserId)
        );

        if (!cancelled && found) {
          setIsConnected(true);
        }
      } catch {
        // Ignore failures locally.
      }
    };

    checkConnection();

    return () => {
      cancelled = true;
    };
  }, [user, otherUserId]);

  useEffect(() => {
    if (!user || !otherUserId || !isConnected) return;

    let cancelled = false;

    const loadMessages = async () => {
      try {
        const result = await request(
          `/api/messages/${otherUserId}?limit=50`
        );

        await request(`/api/messages/${otherUserId}`, {
          method: "PATCH",
        });

        if (!cancelled) {
          setMessages(
            [...(result.messages ?? [])].reverse()
          );

          setPeerActive(
            result.peer?.activeState ?? "offline"
          );

          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setMessages([]);
          setLoading(false);
        }
      }
    };

    loadMessages();

    const interval = setInterval(loadMessages, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, otherUserId, isConnected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = async (event) => {
    event.preventDefault();

    if (!user || !otherUserId) return;

    if (!text.trim()) return;

    const messageText = text.trim();

    setText("");

    try {
      const result = await request("/api/messages", {
        method: "POST",
        body: {
          userId: Number(otherUserId),
          text: messageText,
        },
      });

      setMessages((previous) => [
        ...previous,
        result.message,
      ]);
    } catch {
      setText(messageText);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    return new Date(
      Number(timestamp)
    ).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const profilePhoto = otherUser?.profilePhoto || otherUser?.avatar;

  const connectionStatus = isConnected ? "accepted" : "none";

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="flex min-h-screen items-center justify-center px-6">
          <p className="text-sm text-slate-500">
            Loading...
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
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
              <User size={28} />
            </div>

            <h1 className="mt-5 text-xl font-semibold text-slate-900">
              Login required
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Log in to use messages.
            </p>

            <button
              onClick={() => router.push("/")}
              className="mt-6 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-600"
            >
              Go Home
            </button>
          </div>
        </main>

        <BottomNav />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-slate-500">
            Loading conversation...
          </p>
        </main>

        <BottomNav />
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <User size={28} />
          </div>

          <h1 className="mt-5 text-xl font-semibold text-slate-900">
            User not found
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            This account doesn&apos;t exist anymore.
          </p>

          <button
            onClick={() =>
              router.push("/messages")
            }
            className="mt-6 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-600"
          >
            Back to Messages
          </button>
        </main>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 pb-24 lg:pb-0">

      {/* Header */}
      <header className="sticky top-0 z-40 flex h-[60px] items-center border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 sm:px-6 lg:px-8">

        <button
          type="button"
          onClick={() =>
            router.push("/messages")
          }
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeft size={20} />
        </button>

        <button
          type="button"
          onClick={() =>
            router.push(
              `/profile/${otherUser.id}`
            )
          }
          className="flex min-w-0 items-center gap-3 text-left"
        >
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt={otherUser.name || "User"}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-500">
              {otherUser.name
                ?.charAt(0)
                ?.toUpperCase() || "U"}
            </div>
          )}

          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-slate-900">
              {otherUser.name || "Student"}
            </h1>

            <p className="truncate text-[11px] text-slate-500">
              {otherUser.username
                ? `@${otherUser.username}`
                : otherUser.department ||
                  "UniLink user"}

              <span
                className={
                  peerActive === "online"
                    ? "ml-2 inline-flex items-center gap-1 font-semibold text-green-600"
                    : "ml-2 inline-flex items-center gap-1 text-slate-400"
                }
              >
                <span
                  className={
                    peerActive === "online"
                      ? "size-1.5 rounded-full bg-green-500"
                      : "size-1.5 rounded-full bg-slate-300"
                  }
                />
                {peerActive === "online"
                  ? "Online"
                  : "Offline"}
              </span>
            </p>
          </div>
        </button>

        <button
          type="button"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
        >
          <MoreVertical size={19} />
        </button>
        </div>
      </header>

      {/* Chat */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 sm:px-6 lg:px-8">

        {connectionStatus !== "accepted" ? (
          <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">

            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <User size={28} />
            </div>

            <h2 className="mt-5 text-base font-semibold text-slate-900">
              You&apos;re not connected
            </h2>

            <p className="mt-2 max-w-sm text-sm text-slate-500">
              You can only message people after
              accepting their connection request.
            </p>

            <button
              onClick={() =>
                router.push(
                  `/profile/${otherUser.id}`
                )
              }
              className="mt-5 rounded-xl bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-600"
            >
              View Profile
            </button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-6">

              {messages.length === 0 ? (
                <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">

                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                    <Send size={25} />
                  </div>

                  <h2 className="mt-5 text-base font-semibold text-slate-900">
                    Start the conversation
                  </h2>

                  <p className="mt-2 max-w-sm text-sm text-slate-500">
                    Say hello to{" "}
                    {otherUser.name ||
                      "your connection"}.
                  </p>

                </div>
              ) : (
                messages.map((message) => {
                  const isMine =
                    String(message.senderId) ===
                    String(user.id);

                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        isMine
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex max-w-[78%] flex-col ${
                          isMine
                            ? "items-end"
                            : "items-start"
                        }`}
                      >
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-5 ${
                            isMine
                              ? "rounded-br-md bg-indigo-500 text-white"
                              : "rounded-bl-md bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
                          }`}
                        >
                          {message.text}
                        </div>

                        <span className="mt-1 px-1 text-[9px] text-slate-400">
                          {formatTime(
                            message.createdAt
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="sticky bottom-0 mb-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
            >
              <input
                type="text"
                value={text}
                onChange={(event) =>
                  setText(event.target.value)
                }
                placeholder="Write a message..."
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />

              <button
                type="submit"
                disabled={!text.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={17} />
              </button>
            </form>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}