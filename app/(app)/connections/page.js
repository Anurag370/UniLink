"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  X,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";

import BottomNav from "@/components/BottomNav";
import LoginPrompt from "@/components/LoginPrompt";
import { useAuth } from "@/context/AuthContext";

import { request } from "@/lib/api-client";

export default function ConnectionsPage() {
  const router = useRouter();
  const {
    user,
    isLoggedIn,
    loading,
  } = useAuth();

  const [requests, setRequests] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showLoginPrompt, setShowLoginPrompt] =
    useState(false);

  const [processingRequestId, setProcessingRequestId] =
    useState(null);

  const loadRequests = async () => {
    if (!user?.id) {
      setRequests([]);
      setAccounts([]);
      return;
    }

    try {
      const result = await request(
        "/api/connections?status=incoming&limit=50"
      );

      const incoming = (result.connections ?? []).map(
        (connection) => {
          const sender = connection.user ?? {};
          const profile = sender.profile ?? {};

          return {
            id: connection.id,
            senderId: sender.id,
            sender: {
              id: sender.id,
              name: sender.fullName || "Student",
              profilePhoto: sender.profilePhoto ?? "",
              avatar: sender.profilePhoto ?? "",
              department:
                profile.department || "Student",
              branch: profile.department || "Student",
              course: profile.department || "Student",
              year: profile.year || "",
              studyYear: profile.year || "",
              accountType: sender.accountType || "student",
            },
          };
        }
      );

      setAccounts(incoming.map((request) => request.sender));
      setRequests(incoming);
    } catch {
      setAccounts([]);
      setRequests([]);
    }
  };

  useEffect(() => {
    if (loading || !user) return;

    void (async () => {
      await loadRequests();
    })();
  }, [user, loading]);

  /*
   * Keep the page synchronized if another part of the app
   * changes the connection data.
   */
  useEffect(() => {
    if (!user?.id) return;

    const handleConnectionsUpdated = () => {
      loadRequests();
    };

    window.addEventListener(
      "focus",
      handleConnectionsUpdated
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleConnectionsUpdated
      );
    };
  }, [user]);

  const getSender = (senderId) => {
    if (senderId == null) return null;

    return accounts.find(
      (account) =>
        String(account.id) ===
        String(senderId)
    );
  };

  const handleAccept = async (requestId) => {
    if (
      !user?.id ||
      !requestId ||
      processingRequestId
    ) {
      return;
    }

    const request = requests.find(
      (item) =>
        String(item.id) ===
        String(requestId)
    );

    if (!request) return;

    setProcessingRequestId(requestId);

    try {
      await request(`/api/connections/${requestId}`, {
        method: "PATCH",
        body: { action: "accept" },
      });

      setRequests((previous) =>
        previous.filter(
          (item) =>
            String(item.id) !==
            String(requestId)
        )
      );
    } catch {
      loadRequests();
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleReject = async (requestId) => {
    if (
      !user?.id ||
      !requestId ||
      processingRequestId
    ) {
      return;
    }

    const request = requests.find(
      (item) =>
        String(item.id) ===
        String(requestId)
    );

    if (!request) return;

    setProcessingRequestId(requestId);

    try {
      await request(`/api/connections/${requestId}`, {
        method: "PATCH",
        body: { action: "reject" },
      });

      setRequests((previous) =>
        previous.filter(
          (item) =>
            String(item.id) !==
            String(requestId)
        )
      );
    } catch {
      loadRequests();
    } finally {
      setProcessingRequestId(null);
    }
  };

  /*
   * Don't decide that the user isn't logged in while
   * AuthContext is still initializing.
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
          <p className="text-sm text-slate-500">
            Loading connections...
          </p>
        </main>
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return (
      <>
        <div className="min-h-screen bg-slate-50">
          <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
              <Users size={30} />
            </div>

            <h1 className="mt-5 text-xl font-semibold text-slate-900">
              Login required
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Log in to view your connection requests.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowLoginPrompt(true)
              }
              className="mt-6 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
            >
              Log In
            </button>
          </main>
        </div>

        <LoginPrompt
          isOpen={showLoginPrompt}
          onClose={() =>
            setShowLoginPrompt(false)
          }
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-10">
      <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pt-10">

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
              Connection Requests
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage people who want to connect with you.
            </p>
          </div>
        </header>

        {/* Request count */}
        {requests.length > 0 && (
          <div className="mt-6">
            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600">
              {requests.length}{" "}
              {requests.length === 1
                ? "request"
                : "requests"}
            </span>
          </div>
        )}

        {/* Requests */}
        <section className="mt-5">
          {requests.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Users size={25} />
          </div>

              <h2 className="mt-4 text-base font-semibold text-slate-900">
                No connection requests
              </h2>

              <p className="mt-2 max-w-sm text-sm text-slate-500">
                When someone sends you a connection
                request, it will appear here.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/search")
                }
                className="mt-5 rounded-xl bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-600"
              >
                Find People
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => {
                const sender = getSender(
                  request.senderId
                );

                if (!sender) return null;

                const profilePhoto =
                  sender.profilePhoto ||
                  sender.avatar;

                const department =
                  sender.department ||
                  sender.branch ||
                  sender.course ||
                  "Student";

                const year =
                  sender.year ||
                  sender.studyYear ||
                  "";

                const isAlumni =
                  sender.accountType ===
                  "alumni";

                const isProcessing =
                  String(processingRequestId) ===
                  String(request.id);

                return (
                  <article
                    key={request.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      {/* User */}
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/profile/${sender.id}`
                          )
                        }
                        className="flex min-w-0 items-center gap-3 text-left"
                        disabled={isProcessing}
                      >
                        {profilePhoto ? (
                          <img
                            src={profilePhoto}
                            alt={
                              sender.name ||
                              "User"
                            }
                            className="h-12 w-12 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-lg font-bold text-indigo-500">
                            {sender.name
                              ?.charAt(0)
                              ?.toUpperCase() ||
                              "U"}
                          </div>
                        )}

                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-slate-900">
                            {sender.name ||
                              "Student"}
                          </h3>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {department}

                            {!isAlumni &&
                              year &&
                              ` • ${year}`}
                          </p>

                          {isAlumni && (
                            <span className="mt-1 block text-xs font-semibold text-violet-500">
                              🎓 Alumni
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Actions */}
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleReject(
                              request.id
                            )
                          }
                          disabled={isProcessing}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                        >
                          <X size={15} />
                          Reject
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleAccept(
                              request.id
                            )
                          }
                          disabled={isProcessing}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                        >
                          <Check size={15} />

                          {isProcessing
                            ? "Processing..."
                            : "Accept"}
                        </button>
                      </div>
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