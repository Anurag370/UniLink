"use client";

import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Link as LinkIcon,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { request } from "@/lib/api-client";

export default function CreateOpportunity() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [type, setType] = useState("Hackathon");
  const [customType, setCustomType] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [banner, setBanner] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");

  /*
   * Compress the selected image before storing it.
   * This prevents localStorage from filling up too quickly.
   */
  const handleBannerChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // Don't allow extremely large source files.
    if (file.size > 10 * 1024 * 1024) {
      alert("Please select an image smaller than 10 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = new window.Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");

        const maxWidth = 1200;
        const maxHeight = 700;

        let width = image.width;
        let height = image.height;

        /*
         * Scale the image down while maintaining
         * its original aspect ratio.
         */
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          return;
        }

        context.drawImage(
          image,
          0,
          0,
          width,
          height
        );

        /*
         * Convert to compressed JPEG.
         *
         * 0.65 = good balance between quality
         * and localStorage size.
         */
        const compressedImage =
          canvas.toDataURL(
            "image/jpeg",
            0.65
          );

        setBanner(compressedImage);
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  };

  const handlePublish = async () => {
    if (
      !title.trim() ||
      !date ||
      !description.trim()
    ) {
      return;
    }

    const opportunity = {
      title: title.trim(),

      type:
        type === "Other"
          ? customType.trim()
          : type,

      date,

      banner: banner || null,

      location: location.trim(),

      description: description.trim(),

      link: link.trim(),
    };

    try {
      setPublishing(true);
      setPublishError("");

      await request("/api/opportunities", {
        method: "POST",
        body: opportunity,
      });

      router.push("/search");
    } catch (err) {
      setPublishError(
        err?.message ||
          "Could not publish this opportunity. Please try again."
      );
    } finally {
      setPublishing(false);
    }
  };

  const isValid =
    title.trim() &&
    date &&
    description.trim() &&
    (type !== "Other" || customType.trim());

  return (
    <div className="min-h-screen bg-slate-50 md:mx-auto md:max-w-[760px] lg:max-w-[800px]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 flex h-[60px] items-center justify-between border-b border-slate-200 bg-white/96 px-[14px] backdrop-blur-md">
        <button
          type="button"
          className="flex items-center justify-center"
          onClick={() => router.back()}
        >
          <ArrowLeft size={21} />
        </button>

        <h1 className="text-base">
          Create Opportunity
        </h1>

        <button
          type="button"
          className="rounded-[10px] bg-indigo-500 px-[15px] py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          onClick={handlePublish}
          disabled={!isValid || publishing}
        >
          {publishing ? "Publishing..." : "Publish"}
        </button>
      </header>

      {publishError && (
        <p className="px-4 pt-3 text-center text-xs font-medium text-red-500">
          {publishError}
        </p>
      )}

      <main className="px-4 pt-5 pb-[100px]">
        {/* INTRO CARD */}
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-[15px]">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-500">
            <CalendarDays size={24} />
          </div>

          <div>
            <h2 className="text-sm">
              Share an opportunity
            </h2>

            <p className="mt-1 text-slate-500 text-[10px] leading-[1.4]">
              Help your college network discover
              something useful.
            </p>
          </div>
        </div>

        {/* BANNER */}
        <div className="relative mb-[18px]">
          <label className="mb-[7px] flex items-center gap-[5px] font-semibold text-slate-900 text-[11px]">
            Banner Image
          </label>

          {!banner && (
            <label className="flex min-h-[110px] w-full cursor-pointer flex-col items-center justify-center gap-[7px] rounded-[14px] border border-dashed border-slate-200 bg-white text-indigo-500 transition hover:border-indigo-300 hover:bg-indigo-50">
              <CalendarDays size={22} />

              <span className="text-[12px] font-semibold">
                Add a banner image
              </span>

              <small className="text-slate-400 text-[9px]">
                Recommended: wide landscape image
              </small>

              <input
                className="hidden"
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
              />
            </label>
          )}

          {banner && (
            <div className="relative mx-auto w-full">
              <img
                className="block h-[180px] w-full rounded-xl bg-slate-100 object-cover"
                src={banner}
                alt="Opportunity banner"
              />

              <button
                type="button"
                onClick={() => setBanner(null)}
                className="absolute right-[10px] top-[10px] flex size-8 items-center justify-center rounded-full bg-slate-900/70 text-white transition hover:bg-slate-900"
                aria-label="Remove banner"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        {/* TITLE */}
        <div className="relative mb-[18px]">
          <label className="mb-[7px] flex items-center gap-[5px] font-semibold text-slate-900 text-[11px]">
            Title *
          </label>

          <input
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[12px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            type="text"
            placeholder="e.g. College Hackathon 2026"
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
          />
        </div>

        {/* TYPE */}
        <div className="relative mb-[18px]">
          <label className="mb-[7px] flex items-center gap-[5px] font-semibold text-slate-900 text-[11px]">
            Type *
          </label>

          <select
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[12px] text-slate-900 outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            value={type}
            onChange={(event) =>
              setType(event.target.value)
            }
          >
            <option>Hackathon</option>
            <option>Internship</option>
            <option>Competition</option>
            <option>Workshop</option>
            <option>Event</option>
            <option>Other</option>
          </select>
        </div>

        {/* CUSTOM TYPE */}
        {type === "Other" && (
          <div className="relative mb-[18px]">
            <label className="mb-[7px] flex items-center gap-[5px] font-semibold text-slate-900 text-[11px]">
              Specify Type *
            </label>

            <input
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[12px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
              type="text"
              placeholder="e.g. Seminar, Meetup, Webinar..."
              value={customType}
              onChange={(event) =>
                setCustomType(event.target.value)
              }
            />
          </div>
        )}

        {/* DATE */}
        <div className="relative mb-[18px]">
          <label className="mb-[7px] flex items-center gap-[5px] font-semibold text-slate-900 text-[11px]">
            Date *
          </label>

          <input
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[12px] text-slate-900 outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            type="date"
            value={date}
            onChange={(event) =>
              setDate(event.target.value)
            }
          />
        </div>

        {/* LOCATION */}
        <div className="relative mb-[18px]">
          <label className="mb-[7px] flex items-center gap-[5px] font-semibold text-slate-900 text-[11px]">
            <MapPin size={14} />
            Location
          </label>

          <input
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[12px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            type="text"
            placeholder="e.g. College Auditorium / Online"
            value={location}
            onChange={(event) =>
              setLocation(event.target.value)
            }
          />
        </div>

        {/* DESCRIPTION */}
        <div className="relative mb-[18px]">
          <label className="mb-[7px] flex items-center gap-[5px] font-semibold text-slate-900 text-[11px]">
            Description *
          </label>

          <textarea
            className="min-h-[130px] w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-[12px] leading-[1.5] text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            placeholder="Tell students what this opportunity is about..."
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            maxLength={1000}
          />

          <span className="absolute bottom-[9px] right-[10px] text-right text-[9px] text-slate-400">
            {description.length}/1000
          </span>
        </div>

        {/* LINK */}
        <div className="relative mb-[18px]">
          <label className="mb-[7px] flex items-center gap-[5px] font-semibold text-slate-900 text-[11px]">
            <LinkIcon size={14} />
            Registration / Information Link
          </label>

          <input
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[12px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            type="url"
            placeholder="https://..."
            value={link}
            onChange={(event) =>
              setLink(event.target.value)
            }
          />
        </div>
      </main>
    </div>
  );
}