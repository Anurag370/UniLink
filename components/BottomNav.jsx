"use client";

import { useState } from "react";
import {
  Home as HomeIcon,
  Search,
  Plus,
  MessageCircle,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";

import CreateSheet from "./CreateSheet";
import LoginPrompt from "./LoginPrompt";
import { useAuth } from "@/context/AuthContext";

// Mobile-only bottom navigation. Desktop gets the left sidebar from
// components/Sidebar instead (see app/(app)/layout.js).
function BottomNav() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleCreateClick = () => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }

    setShowCreate(true);
  };

  const handleRestrictedNavigation = (path) => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }

    router.push(path);
  };

  const navButton =
    "flex flex-col items-center justify-center gap-[3px] text-slate-500 text-[9px]";

  return (
    <>
      <nav
        className="
          fixed
          bottom-[10px]
          left-1/2
          z-50
          flex
          h-16
          w-[calc(100%-20px)]
          max-w-[600px]
          -translate-x-1/2
          items-center
          justify-around
          rounded-[20px]
          border
          border-slate-200
          bg-white/95
          shadow-[0_8px_25px_rgba(15,23,42,0.12)]

          max-[380px]:bottom-[7px]
          max-[380px]:w-[calc(100%-14px)]
        "
      >
        {/* Home */}
        <button
          type="button"
          className={navButton}
          onClick={() => router.push("/")}
        >
          <HomeIcon size={21} />
          <span>Home</span>
        </button>

        {/* Search */}
        <button
          type="button"
          className={navButton}
          onClick={() => router.push("/search")}
        >
          <Search size={21} />
          <span>Search</span>
        </button>

        {/* Create */}
        <button
          type="button"
          aria-label="Create"
          className="
            flex
            size-[52px]
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-indigo-500
            text-white
            shadow-[0_5px_20px_rgba(99,102,241,0.4)]

            max-[380px]:size-12
          "
          onClick={handleCreateClick}
        >
          <Plus size={27} />
        </button>

        {/* Messages */}
        <button
          type="button"
          className={navButton}
          onClick={() => handleRestrictedNavigation("/messages")}
        >
          <MessageCircle size={21} />
          <span>Messages</span>
        </button>

        {/* Profile */}
        <button
          type="button"
          className={navButton}
          onClick={() => handleRestrictedNavigation("/profile")}
        >
          <User size={21} />
          <span>Profile</span>
        </button>
      </nav>

      <CreateSheet
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
      />

      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
      />
    </>
  );
}

export default BottomNav;
