"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  X,
  User,
} from "lucide-react";

import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/context/AuthContext";

import { request } from "@/lib/api-client";

export default function RequestsPage() {
  const router = useRouter();
  const {
    user,
    isLoggedIn,
    loading,
  } = useAuth();

  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!user) return;

    loadRequests();
  }, [user]);

  async function loadRequests() {
    if (!user) return;

    try {
      const result = await request(
        "/api/connections?status=incoming&limit=50"
      );

      const requestUsers = (result.connections ?? []).map(
        (connection) => {
          const sender = connection.user ?? {};
          const profile = sender.profile ?? {};

          return {
            id: connection.id,
            sender: {
              id: sender.id,
              name: sender.fullName || "Student",
              profilePhoto: sender.profilePhoto ?? "",
              department: profile.department || "Student",
              year: profile.year || "",
            },
          };
        }
      );

      setRequests(requestUsers);
    } catch {
      setRequests([]);
    }
  };

  const handleAccept = async (id) => {
    try {
      await request(`/api/connections/${id}`, {
        method: "PATCH",
        body: { action: "accept" },
      });
    } catch {
      // Ignore; reload below keeps the UI in sync.
    }

    loadRequests();
  };

  const handleReject = async (id) => {
    try {
      await request(`/api/connections/${id}`, {
        method: "PATCH",
        body: { action: "reject" },
      });
    } catch {
      // Ignore; reload below keeps the UI in sync.
    }

    loadRequests();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="flex min-h-screen items-center justify-center px-4">
          <p className="text-sm text-slate-500">
            Loading requests...
          </p>
        </main>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="flex min-h-screen items-center justify-center px-4 pb-28">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Login required
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Log in to view connection requests.
            </p>

            <button
              onClick={() => router.push("/login")}
              className="mt-6 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-600"
            >
              Log In
            </button>
          </div>
        </main>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto w-full max-w-3xl px-4 pb-32 pt-5 sm:px-6 sm:pt-8">

        <button
          onClick={() => router.back()}
          className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 p-5 sm:p-6">
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Connection Requests
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              People who want to connect with you.
            </p>
          </div>

          {requests.length === 0 ? (
            <div className="px-5 py-16 text-center sm:px-6">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
                <User size={25} />
              </div>

              <h2 className="mt-4 font-semibold text-slate-900">
                No connection requests
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                You&apos;re all caught up.
              </p>

            </div>
          ) : (
            <div className="divide-y divide-slate-100">

              {requests.map((request) => {
                const sender = request.sender;

                return (
                  <div
                    key={request.id}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6"
                  >

                    <button
                      onClick={() =>
                        router.push(
                          `/profile?id=${sender.id}`
                        )
                      }
                      className="flex min-w-0 flex-1 items-center gap-4 text-left"
                    >

                      {sender.profilePhoto ? (
                        <img
                          src={sender.profilePhoto}
                          alt={sender.name}
                          className="h-14 w-14 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xl font-bold text-indigo-500">
                          {sender.name
                            ?.charAt(0)
                            ?.toUpperCase() || "U"}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-900">
                          {sender.name}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {sender.department}
                          {sender.year &&
                            ` • ${sender.year}`}
                        </p>
                      </div>

                    </button>

                    <div className="flex shrink-0 gap-2">

                      <button
                        onClick={() =>
                          handleAccept(
                            request.id
                          )
                        }
                        className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600"
                      >
                        <Check size={16} />
                        Accept
                      </button>

                      <button
                        onClick={() =>
                          handleReject(
                            request.id
                          )
                        }
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <X size={16} />
                        Reject
                      </button>

                    </div>
                  </div>
                );
              })}

            </div>
          )}

        </div>
      </main>

      <BottomNav />
    </div>
  );
}