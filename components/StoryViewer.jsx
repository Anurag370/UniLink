"use client";

import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const AUTO_ADVANCE_MS = 5000;

function timeAgo(timestamp) {
  if (!timestamp) return "";

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  );

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

// Full-screen story viewer: one story at a time, auto-advances, and closes on
// Escape. Keyboard and swipe-free navigation keep it usable on desktop.
export default function StoryViewer({ stories, startIndex = 0, onClose }) {
  const [index, setIndex] = useState(() =>
    Math.max(0, Math.min(startIndex, stories.length - 1))
  );

  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const story = stories[index];

  // Auto-advance; the last story closes the viewer instead of looping.
  useEffect(() => {
    const delay =
      index >= stories.length - 1 ? AUTO_ADVANCE_MS * 2 : AUTO_ADVANCE_MS;

    const timer = setTimeout(() => {
      if (index >= stories.length - 1) {
        onCloseRef.current?.();
      } else {
        setIndex((current) => current + 1);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [index, stories.length]);

  // Escape closes, arrow keys move between stories.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onCloseRef.current?.();
      } else if (event.key === "ArrowRight") {
        setIndex((current) =>
          Math.min(current + 1, stories.length - 1)
        );
      } else if (event.key === "ArrowLeft") {
        setIndex((current) => Math.max(current - 1, 0));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stories.length]);

  if (!story) {
    return null;
  }

  const avatar =
    story.user?.profilePhoto ||
    `https://i.pravatar.cc/100?u=${story.user?.id || "story"}`;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-950/85 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Story viewer"
    >
      <div
        className="relative w-full max-w-[400px]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* PROGRESS */}

        <div className="flex gap-1">
          {stories.map((item, i) => (
            <span
              key={item.id}
              className={`h-[3px] flex-1 rounded-full ${
                i <= index ? "bg-white" : "bg-white/25"
              }`}
            />
          ))}
        </div>

        {/* HEADER */}

        <div className="mt-3 flex items-center gap-3">
          <img
            src={avatar}
            alt={story.user?.fullName || "Story"}
            className="size-9 rounded-full object-cover"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {story.user?.fullName || "UniLink user"}
            </p>

            <p className="text-[11px] text-white/60">
              {timeAgo(story.createdAt)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close stories"
            className="flex size-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* IMAGE */}

        <div className="relative mt-3 overflow-hidden rounded-xl bg-slate-900">
          <img
            src={story.image}
            alt=""
            className="max-h-[65vh] w-full object-contain"
          />

          {/* PREVIOUS */}

          {index > 0 && (
            <button
              type="button"
              aria-label="Previous story"
              onClick={() => setIndex((current) => current - 1)}
              className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/50 text-white transition hover:bg-slate-950/70"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {/* NEXT */}

          {index < stories.length - 1 && (
            <button
              type="button"
              aria-label="Next story"
              onClick={() => setIndex((current) => current + 1)}
              className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/50 text-white transition hover:bg-slate-950/70"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>

        <p className="mt-3 text-center text-[11px] text-white/50">
          {index + 1} of {stories.length} · Auto-advances
        </p>
      </div>
    </div>
  );
}
