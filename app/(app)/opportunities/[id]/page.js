"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  ExternalLink,
  Share2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { request } from "@/lib/api-client";

export default function OpportunityDetails() {
  const router = useRouter();
  const params = useParams();

  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await request(
          `/api/opportunities/${params.id}`
        );

        if (!cancelled) {
          setOpportunity(result.opportunity);
        }
      } catch {
        if (!cancelled) {
          setOpportunity(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const handleShare = async () => {
    const shareData = {
      title: opportunity?.title || "UniLink Opportunity",
      text:
        opportunity?.description ||
        "Check out this opportunity on UniLink.",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          window.location.href
        );

        alert("Link copied to clipboard.");
      }
    } catch {
      // User cancelled sharing.
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">
          Loading opportunity...
        </p>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-50 flex h-[60px] items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex size-9 items-center justify-center rounded-full hover:bg-slate-100"
          >
            <ArrowLeft size={20} />
          </button>

          <h1 className="ml-3 text-sm font-semibold text-slate-900">
            Opportunity
          </h1>
        </header>

        <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <CalendarDays size={26} />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Opportunity not found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              This opportunity may have been removed
              or is no longer available.
            </p>

            <button
              type="button"
              onClick={() => router.push("/search")}
              className="mt-5 rounded-xl bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-600"
            >
              Back to Search
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* HEADER */}
      <header className="sticky top-0 z-50 flex h-[60px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex size-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <h1 className="text-sm font-semibold text-slate-900">
            Opportunity
          </h1>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="flex size-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
          aria-label="Share opportunity"
        >
          <Share2 size={18} />
        </button>
      </header>

      {/* CONTENT */}
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        {/* BANNER */}
        {opportunity.banner ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <img
              src={opportunity.banner}
              alt={opportunity.title}
              className="block h-[220px] w-full object-cover sm:h-[300px] lg:h-[340px]"
            />
          </div>
        ) : (
          <div className="flex h-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-violet-50 sm:h-[280px]">
            <CalendarDays
              size={52}
              className="text-indigo-300"
            />
          </div>
        )}

        {/* MAIN CARD */}
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {/* TYPE */}
          <div className="flex flex-wrap items-center gap-2">
            {opportunity.type && (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-semibold text-indigo-600">
                {opportunity.type}
              </span>
            )}
          </div>

          {/* TITLE */}
          <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
            {opportunity.title}
          </h2>

          {/* META */}
          <div className="mt-5 flex flex-col gap-3 border-y border-slate-100 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
            {opportunity.date && (
              <div className="flex items-center gap-2 text-slate-600">
                <CalendarDays
                  size={17}
                  className="text-indigo-500"
                />

                <span className="text-xs font-medium">
                  {new Date(
                    `${opportunity.date}T00:00:00`
                  ).toLocaleDateString(
                    undefined,
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )}
                </span>
              </div>
            )}

            {opportunity.location && (
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin
                  size={17}
                  className="text-indigo-500"
                />

                <span className="text-xs font-medium">
                  {opportunity.location}
                </span>
              </div>
            )}
          </div>

          {/* DESCRIPTION */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900">
              About this opportunity
            </h3>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {opportunity.description}
            </p>
          </div>

          {/* ACTIONS */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {opportunity.link && (
              <a
                href={opportunity.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-xs font-semibold text-white transition hover:bg-indigo-600"
              >
                <ExternalLink size={16} />
                Registration / Information
              </a>
            )}

            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Share2 size={16} />
              Share
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}