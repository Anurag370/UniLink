"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Search,
  Users,
  MessageCircle,
  Bell,
  User,
  Plus,
  LogOut,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import CreateSheet from "./CreateSheet";
import LoginPrompt from "./LoginPrompt";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Search", href: "/search", icon: Search },
  { label: "Connections", href: "/connections", icon: Users },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Profile", href: "/profile", icon: User },
];

function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoggedIn, logout } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const requireLogin = (action) => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }
    action();
  };

  const avatar =
    user?.profilePhoto ||
    `https://i.pravatar.cc/100?u=${user?.id || "user"}`;

  return (
    <aside
      className="
        fixed
        left-0
        top-0
        z-50
        hidden
        h-screen
        w-[240px]
        flex-col
        border-r
        border-slate-200
        bg-white
        lg:flex
      "
    >

      <button
        type="button"
        onClick={() => router.push("/")}
        className="px-7 pt-10 text-left"
      >
        <span className="text-[26px] font-bold tracking-tight text-slate-900">
          Uni<span className="text-indigo-500">Link</span>
        </span>

        <span className="mt-0.5 block text-[11px] text-slate-500">
          Ideas. People. Opportunities.
        </span>
      </button>


      <nav className="mt-9 flex-1 overflow-y-auto px-4 pb-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <button
              type="button"
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`
                mt-1.5
                flex
                h-11
                w-full
                items-center
                gap-3.5
                rounded-lg
                px-4
                text-sm
                transition
                ${
                  active
                    ? "bg-indigo-50 font-semibold text-indigo-600"
                    : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }
              `}
            >
              <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}


        <button
          type="button"
          onClick={() => requireLogin(() => setShowCreate(true))}
          className="
            mt-5
            flex
            h-11
            w-full
            items-center
            justify-center
            gap-2
            rounded-lg
            bg-indigo-500
            text-sm
            font-semibold
            text-white
            transition
            hover:bg-indigo-600
          "
        >
          <Plus size={18} />
          <span>Create</span>
        </button>
      </nav>


      <div className="border-t border-slate-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => requireLogin(() => router.push("/profile"))}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <img
              src={avatar}
              alt={user?.name || "User"}
              className="size-10 shrink-0 rounded-full object-cover"
            />

            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-slate-900">
                {user?.name || "Student"}
              </p>

              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                {user?.username
                  ? `@${user.username}`
                  : user?.branch || "UniLink"}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => logout()}
            title="Log out"
            aria-label="Log out"
            className="
              flex
              size-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-600
            "
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <CreateSheet
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
      />

      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
      />
    </aside>
  );
}
