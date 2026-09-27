"use client";

import { useState } from "react";
import { ArrowLeft, Image, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { request } from "@/lib/api-client";

export default function CreatePost() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [publishError, setPublishError] = useState("");
  const [publishing, setPublishing] = useState(false);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setImage(reader.result);
    };

    reader.readAsDataURL(file);
  };

  const handlePublish = async () => {
    if (!content.trim() || !user || loading) {
      return;
    }

    setPublishError("");

    try {
      setPublishing(true);

      await request("/api/posts", {
        method: "POST",
        body: {
          content: content.trim(),
          image: image || null,
        },
      });

      router.push("/");
    } catch {
      setPublishError("Could not publish your post. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  const avatar =
    user?.profilePhoto ||
    user?.avatar ||
    user?.profilePicture ||
    "";

  const branch =
    user?.branch ||
    user?.department ||
    "";

  const year =
    user?.year ||
    "";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">
          Loading...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Please log in
          </h2>

          <button
            className="mt-4 rounded-[10px] bg-indigo-500 px-5 py-2 text-sm font-semibold text-white"
            onClick={() => router.push("/login")}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 md:mx-auto md:max-w-[760px] lg:max-w-[800px]">
      <header className="sticky top-0 z-50 flex h-[60px] items-center justify-between border-b border-slate-200 bg-white/96 px-[14px] backdrop-blur-md">
        <button
          className="flex items-center justify-center"
          onClick={() => router.back()}
        >
          <ArrowLeft size={21} />
        </button>

        <h1 className="text-base">
          Create Post
        </h1>

        <button
          className="rounded-[10px] bg-indigo-500 px-[15px] py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          onClick={handlePublish}
          disabled={!content.trim() || publishing}
        >
          {publishing ? "Publishing..." : "Publish"}
        </button>
      </header>

      {publishError && (
        <p className="px-4 pt-3 text-center text-red-500 text-[11px]">
          {publishError}
        </p>
      )}

      <main className="px-4 pt-[18px] pb-[100px]">
        <div className="mb-[18px] flex items-center gap-2.5">
          {avatar ? (
            <img
              className="size-11 rounded-full object-cover"
              src={avatar}
              alt={user.name || "Profile"}
            />
          ) : (
            <div className="flex size-11 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-600">
              {(user.name || "U")
                .charAt(0)
                .toUpperCase()}
            </div>
          )}

          <div>
            <h3 className="text-sm">
              {user.name || "User"}
            </h3>

            <p className="mt-[3px] text-slate-500 text-[11px]">
              {branch}
              {branch && year ? " • " : ""}
              {year}
            </p>
          </div>
        </div>

        <textarea
          className="min-h-[180px] w-full resize-none border-0 bg-transparent py-[5px] outline-none placeholder:text-slate-400 text-slate-900 text-[15px] leading-[1.6]"
          value={content}
          onChange={(event) =>
            setContent(event.target.value)
          }
          placeholder="What's on your mind?"
          maxLength={1000}
        />

        <div className="mb-[18px] text-right text-slate-400 text-[9px]">
          {content.length}/1000
        </div>

        {image && (
          <div className="relative mb-[14px]">
            <img
              className="w-full max-h-[350px] rounded-[14px] object-cover"
              src={image}
              alt="Selected"
            />

            <button
              className="absolute top-[10px] right-[10px] flex size-8 items-center justify-center rounded-full bg-slate-900/70 text-white"
              onClick={() => setImage(null)}
            >
              <X size={18} />
            </button>
          </div>
        )}

        <label className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-slate-200 bg-white p-[13px] font-semibold text-indigo-500 text-[12px]">
          <Image size={21} />

          <span>Add image</span>

          <input
            className="hidden"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
        </label>
      </main>
    </div>
  );
}