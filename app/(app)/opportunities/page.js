"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  MapPin,
  ArrowRight,
  Search,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { request } from "@/lib/api-client";

export default function Opportunities() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const [opportunities, setOpportunities] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await request(
          "/api/opportunities?limit=50"
        );

        if (!cancelled) {
          setOpportunities(
            result.opportunities ?? []
          );
        }
      } catch {
        if (!cancelled) {
          setOpportunities([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredOpportunities = opportunities.filter(
    (opportunity) => {
      const query = search.toLowerCase();

      return (
        opportunity.title
          ?.toLowerCase()
          .includes(query) ||
        opportunity.type
          ?.toLowerCase()
          .includes(query) ||
        opportunity.location
          ?.toLowerCase()
          .includes(query) ||
        opportunity.description
          ?.toLowerCase()
          .includes(query)
      );
    }
  );

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Opportunities
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Discover hackathons, internships, events and more.
            </p>
          </div>

          {isLoggedIn && (
            <button
              type="button"
              onClick={() =>
                router.push("/create/opportunity")
              }
              className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-600"
            >
              <Plus size={16} />
              Create Opportunity
            </button>
          )}
        </div>
      </header>

      {/* CONTENT */}
      <main className="mx-auto max-w-[1100px] px-6 pt-6">
        {/* SEARCH */}
        <div className="mb-6 flex h-11 max-w-[600px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4">
          <Search
            size={18}
            className="text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search opportunities..."
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>

        {/* EMPTY STATE */}
        {filteredOpportunities.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
              <CalendarDays size={26} />
            </div>

            <h2 className="mt-4 text-base font-semibold text-slate-900">
              No opportunities found
            </h2>

            <p className="mx-auto mt-2 max-w-[400px] text-xs leading-5 text-slate-500">
              {search
                ? "Try searching for something else."
                : "Be the first to share an opportunity with your college network."}
            </p>

            {!search && isLoggedIn && (
              <button
                type="button"
                onClick={() =>
                  router.push("/create/opportunity")
                }
                className="mt-5 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white"
              >
                Create Opportunity
              </button>
            )}
          </div>
        )}

        {/* OPPORTUNITY GRID */}
        {filteredOpportunities.length > 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredOpportunities.map(
              (opportunity) => (
                <article
                  key={opportunity.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Open ${opportunity.title}`}
                  onClick={() =>
                    router.push(`/opportunities/${opportunity.id}`)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      router.push(`/opportunities/${opportunity.id}`);
                    }
                  }}
                  className="cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(15,23,42,0.08)]"
                >
                  {/* BANNER */}
                  {opportunity.banner ? (
                    <img
                      src={opportunity.banner}
                      alt={opportunity.title}
                      className="h-[150px] w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-[150px] items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-500">
                      <CalendarDays size={38} />
                    </div>
                  )}

                  <div className="p-5">
                    {/* TYPE */}
                    <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-600">
                      {opportunity.type}
                    </span>

                    {/* TITLE */}
                    <h2 className="mt-3 line-clamp-2 text-base font-bold text-slate-900">
                      {opportunity.title}
                    </h2>

                    {/* DATE */}
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                      <CalendarDays
                        size={15}
                        className="shrink-0"
                      />

                      <span>
                        {formatDate(
                          opportunity.date
                        )}
                      </span>
                    </div>

                    {/* LOCATION */}
                    {opportunity.location && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <MapPin
                          size={15}
                          className="shrink-0"
                        />

                        <span className="truncate">
                          {opportunity.location}
                        </span>
                      </div>
                    )}

                    {/* DESCRIPTION */}
                    <p className="mt-4 line-clamp-3 text-xs leading-5 text-slate-600">
                      {opportunity.description}
                    </p>

                    {/* OPEN DETAIL */}
                    <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-2.5 text-xs font-semibold text-indigo-600">
                      View details
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
}