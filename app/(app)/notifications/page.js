"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Check,
  UserPlus,
  MessageCircle,
  CalendarDays,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/context/AuthContext";
import { request } from "@/lib/api-client";

const timeAgo = (timestamp) => {
  if (!timestamp) return "";

  const seconds = Math.floor(
    (Date.now() - Number(timestamp)) / 1000
  );

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return new Date(Number(timestamp)).toLocaleDateString(
    [],
    { day: "numeric", month: "short" }
  );
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isLoggedIn, loading } = useAuth();

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      try {
        const result = await request("/api/notifications?limit=50");

        if (!cancelled) {
          setNotifications(result.notifications);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleNotificationClick = async (notification) => {
    setNotifications((previous) =>
      previous.map((item) =>
        item.id === notification.id
          ? { ...item, read: true }
          : item
      )
    );

    try {
      await request(`/api/notifications/${notification.id}`, {
        method: "PATCH",
      });
    } catch {
    }

    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((previous) =>
      previous.map((notification) => ({
        ...notification,
        read: true,
      }))
    );

    try {
      await request("/api/notifications/read-all", {
        method: "POST",
      });
    } catch {
    }
  };

  const handleDelete = async (event, notificationId) => {
    event.stopPropagation();

    setNotifications((previous) =>
      previous.filter(
        (notification) =>
          notification.id !== notificationId
      )
    );

    try {
      await request(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });
    } catch {
    }
  };

  const handleClearAll = async () => {
    setNotifications([]);

    try {
      await request("/api/notifications", {
        method: "DELETE",
      });
    } catch {
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "connection":
        return <UserPlus size={18} />;

      case "message":
        return <MessageCircle size={18} />;

      case "opportunity":
        return <CalendarDays size={18} />;

      default:
        return <Bell size={18} />;
    }
  };

  const getIconStyle = (type) => {
    switch (type) {
      case "connection":
        return "bg-indigo-50 text-indigo-500";

      case "message":
        return "bg-blue-50 text-blue-500";

      case "opportunity":
        return "bg-violet-50 text-violet-500";

      default:
        return "bg-slate-100 text-slate-500";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="flex min-h-screen items-center justify-center px-6">
          <p className="text-sm text-slate-500">
            Loading notifications...
          </p>
        </main>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
              <Bell size={28} />
            </div>

            <h1 className="mt-5 text-xl font-semibold text-slate-900">
              Login required
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Log in to view your notifications.
            </p>

            <button
              onClick={() => router.push("/")}
              className="mt-6 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-600"
            >
              Go Home
            </button>
          </div>
        </main>

        <BottomNav />
      </div>
    );
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-10">
      <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pt-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Notifications
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${
                      unreadCount > 1 ? "s" : ""
                    }`
                  : "You're all caught up."}
              </p>
            </div>
          </div>

          {notifications.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-indigo-500 hover:bg-indigo-50 sm:flex"
            >
              <Check size={15} />
              Mark all read
            </button>
          )}
        </header>

        {notifications.length > 0 && (
          <div className="mt-5 flex gap-2 sm:hidden">
            <button
              onClick={handleMarkAllRead}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-indigo-500"
            >
              <Check size={15} />
              Mark all read
            </button>

            <button
              onClick={handleClearAll}
              className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-500"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}

        <section className="mt-6">
          {notifications.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Bell size={25} />
          </div>

              <h2 className="mt-5 text-base font-semibold text-slate-900">
                No notifications
              </h2>

              <p className="mt-2 max-w-sm text-sm text-slate-500">
                New connection requests, messages and
                opportunities will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  onClick={() =>
                    handleNotificationClick(
                      notification
                    )
                  }
                  className={`group relative flex cursor-pointer items-start gap-4 border-b border-slate-100 p-4 transition last:border-b-0 hover:bg-slate-50 ${
                    !notification.read
                      ? "bg-indigo-50/30"
                      : "bg-white"
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${getIconStyle(
                      notification.type
                    )}`}
                  >
                    {getIcon(notification.type)}
                  </div>

                  <div className="min-w-0 flex-1 pr-8">
                    <p className="text-sm leading-5 text-slate-700">
                      {notification.message}
                    </p>

                    {timeAgo(notification.createdAt) && (
                      <p className="mt-1.5 text-xs text-slate-400">
                        {timeAgo(notification.createdAt)}
                      </p>
                    )}
                  </div>

                  {!notification.read && (
                    <span className="absolute right-4 top-5 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  )}

                  <button
                    onClick={(event) =>
                      handleDelete(
                        event,
                        notification.id
                      )
                    }
                    aria-label="Delete notification"
                    className="absolute bottom-3 right-3 hidden rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500 group-hover:block"
                  >
                    <Trash2 size={14} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        {notifications.length > 0 && (
          <div className="mt-4 hidden justify-end sm:flex">
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <Trash2 size={14} />
              Clear notifications
            </button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}