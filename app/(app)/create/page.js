"use client";

import { FileText, FolderGit2, CalendarPlus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Create() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 p-[24px_16px_100px] md:mx-auto md:max-w-[760px] lg:max-w-[800px]">
      <div className="mb-6">
        <h1 className="text-2xl">Create</h1>
        <p className="mt-[5px] text-slate-500 text-[12px]">What do you want to share?</p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          className="flex w-full items-center gap-[14px] rounded-[17px] border border-slate-200 bg-white p-[17px] text-left active:scale-[0.98]"
          onClick={() => router.push("/create/post")}
        >
          <div className="flex size-[46px] shrink-0 items-center justify-center rounded-[13px] bg-indigo-50 text-indigo-500">
            <FileText size={23} />
          </div>

          <div>
            <h2 className="text-sm">Create a Post</h2>
            <p className="mt-1 text-slate-500 text-[10px] leading-[1.4]">Share something with your network</p>
          </div>
        </button>

        <button
          className="flex w-full items-center gap-[14px] rounded-[17px] border border-slate-200 bg-white p-[17px] text-left active:scale-[0.98]"
          onClick={() => router.push("/profile/project/add")}
        >
          <div className="flex size-[46px] shrink-0 items-center justify-center rounded-[13px] bg-indigo-50 text-indigo-500">
            <FolderGit2 size={23} />
          </div>

          <div>
            <h2 className="text-sm">Create a Project</h2>
            <p className="mt-1 text-slate-500 text-[10px] leading-[1.4]">Showcase your work and find teammates</p>
          </div>
        </button>

        <button
          className="flex w-full items-center gap-[14px] rounded-[17px] border border-slate-200 bg-white p-[17px] text-left active:scale-[0.98]"
          onClick={() => router.push("/create/opportunity")}
        >
          <div className="flex size-[46px] shrink-0 items-center justify-center rounded-[13px] bg-indigo-50 text-indigo-500">
            <CalendarPlus size={23} />
          </div>

          <div>
            <h2 className="text-sm">Create Opportunity</h2>
            <p className="mt-1 text-slate-500 text-[10px] leading-[1.4]">Add a hackathon, event or opportunity</p>
          </div>
        </button>
      </div>
    </div>
  );
}