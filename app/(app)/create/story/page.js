"use client";

import { useState } from "react";
import { ArrowLeft, Image, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { request } from "@/lib/api-client";

export default function CreateStory() {
  const router = useRouter();

  const [image, setImage] = useState(null);
  const [publishError, setPublishError] = useState("");
  const [publishing, setPublishing] = useState(false);

  const handleImageChange = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setImage(reader.result);
    };

    reader.readAsDataURL(file);
  };

  const handlePublish = async () => {
    if (!image) {
      return;
    }

    setPublishError("");

    try {
      setPublishing(true);

      await request("/api/stories", {
        method: "POST",
        body: { image },
      });

      router.push("/");
    } catch {
      setPublishError("Could not publish your story. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 md:mx-auto md:max-w-[760px] lg:max-w-[800px]">
      <header className="sticky top-0 z-50 flex h-[60px] items-center justify-between border-b border-slate-200 bg-white/96 px-[14px] backdrop-blur-md">
        <button
          className="flex items-center justify-center"
          onClick={() => router.back()}
        >
          <ArrowLeft size={21} />
        </button>

        <h1 className="text-base">Create Story</h1>

        <button
          className="rounded-[10px] bg-indigo-500 px-[15px] py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          onClick={handlePublish}
          disabled={!image || publishing}
        >
          {publishing ? "Publishing..." : "Publish"}
        </button>
      </header>

      {publishError && (
        <p className="pt-3 text-center text-red-500 text-[11px]">
          {publishError}
        </p>
      )}

      <main className="flex min-h-[calc(100vh-60px)] items-center justify-center p-5">
        {!image && (
          <label className="flex w-full flex-col items-center rounded-[20px] border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
            <div className="mb-4 flex size-[60px] items-center justify-center rounded-[18px] bg-purple-50 text-violet-500">
              <Image size={28} />
            </div>

            <h2 className="text-lg">Add to your story</h2>

            <p className="my-1.5 mb-[20px] text-slate-500 text-[11px]">
              Share a photo with your college network
            </p>

            <span className="rounded-[10px] bg-indigo-500 px-4 py-2.5 font-semibold text-white text-[12px]">
              Choose Image
            </span>

            <input
              className="hidden"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </label>
        )}

        {image && (
          <div className="relative w-full max-w-[350px]">
            <img
              className="block max-h-[75vh] w-full rounded-[18px] object-cover"
              src={image}
              alt="Story preview"
            />

            <button
              className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-slate-900/70 text-white"
              onClick={() => setImage(null)}
            >
              <X size={20} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}