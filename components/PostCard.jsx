"use client";

import { useState } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  X,
  Copy,
  Check,
} from "lucide-react";

import LoginPrompt from "./LoginPrompt";
import { useAuth } from "@/context/AuthContext";
import { request } from "@/lib/api-client";

function timeAgo(createdAt) {
  if (!createdAt) return "";

  const seconds = Math.floor((Date.now() - createdAt) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

  return `${Math.floor(seconds / 86400)}d ago`;
}

function postAuthor(post) {
  return post?.author ?? {};
}

function postName(post) {
  const author = postAuthor(post);
  return author.fullName || "Student";
}

function postAvatar(post) {
  const author = postAuthor(post);
  return (
    author.profilePhoto ||
    `https://i.pravatar.cc/100?u=${author.id || "user"}`
  );
}

function postBranch(post) {
  const author = postAuthor(post);
  return author.profile?.department || "Student";
}

function postYear(post) {
  const author = postAuthor(post);
  return author.profile?.year || "";
}

function PostCard({ post }) {
  const { user, isLoggedIn } = useAuth();

  const [liked, setLiked] = useState(Boolean(post.isLiked));
  const [likeCount, setLikeCount] = useState(Number(post.likes) || 0);
  const [commentCount, setCommentCount] = useState(
    Number(post.comments) || 0
  );

  const [bookmarked, setBookmarked] = useState(false);

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [commentList, setCommentList] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentError, setCommentError] = useState("");

  const [copied, setCopied] = useState(false);

  const name = postName(post);
  const branch = postBranch(post);
  const year = postYear(post);
  const avatar = postAvatar(post);
  const time = timeAgo(post.createdAt);

  const requireLogin = () => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return true;
    }

    return false;
  };

  const handleLike = async () => {
    if (requireLogin()) return;

    try {
      const result = await request(
        `/api/posts/${post.id}/like`,
        { method: "POST" }
      );

      setLiked(result.liked);
      setLikeCount(result.likes);
    } catch {
    }
  };

  const handleBookmark = () => {
    if (requireLogin()) return;

    setBookmarked((previous) => !previous);
  };

  const handleComment = async () => {
    if (requireLogin()) return;

    setShowComments(true);

    try {
      setCommentsLoading(true);

      const result = await request(
        `/api/posts/${post.id}/comments`
      );

      setCommentList(result.comments ?? []);
    } catch {
      setCommentList([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (requireLogin()) return;

    const text = commentText.trim();

    if (!text) return;

    try {
      const comment = await request(
        `/api/posts/${post.id}/comments`,
        { method: "POST", body: { content: text } }
      );

      setCommentList((previous) => [...previous, comment]);
      setCommentCount((count) => count + 1);
      setCommentText("");
      setCommentError("");
    } catch {
      setCommentError("Could not add comment. Try again.");
    }
  };

  const handleShare = () => {
    if (requireLogin()) return;

    setShowShare(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Could not copy link:", error);
    }
  };

  return (
    <>
      <article className="w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white p-[14px] shadow-[0_2px_8px_rgba(15,23,42,0.04)] mt-3 mb-3 max-md:rounded-[15px] max-[380px]:p-3 lg:rounded-2xl lg:p-4">

        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-[11px]">

            {avatar ? (
              <img
                className="size-[42px] shrink-0 rounded-full object-cover"
                src={avatar}
                alt={name || "User"}
              />
            ) : (
              <div className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-500">
                {name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}

            <div className="min-w-0">
              <h3 className="truncate font-semibold text-slate-900 text-sm">
                {name || "Student"}
              </h3>

              <p className="mt-[3px] truncate text-slate-500 text-[12px]">
                {branch || "Student"}
                {year ? ` • ${year}` : ""}
                {time ? ` • ${time}` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="flex items-center justify-center rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <MoreHorizontal size={20} />
          </button>
        </div>

        <div className="mt-[14px] pb-1">
          <p className="text-slate-900 text-sm leading-[1.55] [overflow-wrap:anywhere]">
            {post.content}
          </p>
        </div>

        {post.image && (
          <img
            className="mt-3 block aspect-[16/10] w-full max-h-[600px] rounded-[14px] object-cover max-md:max-h-[500px] lg:max-h-[650px] lg:aspect-[4/5]"
            src={post.image}
            alt="Post"
          />
        )}

        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">

          <div className="flex items-center gap-[18px]">

            <button
              type="button"
              className={`flex items-center gap-1.5 p-[3px] transition active:scale-90 ${
                liked
                  ? "text-red-500"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              onClick={handleLike}
            >
              <Heart
                size={20}
                fill={liked ? "currentColor" : "none"}
              />

              <span>{likeCount}</span>
            </button>

            <button
              type="button"
              className="flex items-center gap-1.5 p-[3px] text-slate-500 transition hover:text-slate-900 active:scale-90"
              onClick={handleComment}
            >
              <MessageCircle size={20} />

              <span>{commentCount}</span>
            </button>

            <button
              type="button"
              className="flex items-center gap-1.5 p-[3px] text-slate-500 transition hover:text-slate-900 active:scale-90"
              onClick={handleShare}
            >
              <Send size={20} />
            </button>
          </div>

          <button
            type="button"
            className={`flex items-center gap-1.5 p-[3px] transition active:scale-90 ${
              bookmarked
                ? "text-indigo-500"
                : "text-slate-500 hover:text-slate-900"
            }`}
            onClick={handleBookmark}
          >
            <Bookmark
              size={20}
              fill={bookmarked ? "currentColor" : "none"}
            />
          </button>
        </div>
      </article>

      {showComments && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:px-4">
          <div className="flex max-h-[80vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white sm:max-w-lg sm:rounded-2xl">

            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Comments
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Join the conversation
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowComments(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-[180px] flex-1 overflow-y-auto px-5 py-4">

              {commentsLoading ? (
                <p className="py-10 text-center text-sm text-slate-400">
                  Loading comments...
                </p>
              ) : commentList.length === 0 ? (
                <div className="flex min-h-[180px] items-center justify-center text-center">
                  <div>
                    <MessageCircle
                      size={30}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-3 text-sm font-medium text-slate-600">
                      No comments yet
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Be the first to comment.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {commentList.map((comment) => (
                    <div
                      key={comment.id}
                      className="flex gap-3"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-50 text-xs font-bold text-indigo-500">
                        {comment.author?.profilePhoto ? (
                          <img
                            className="size-full object-cover"
                            src={comment.author.profilePhoto}
                            alt={comment.author.fullName || "User"}
                          />
                        ) : (
                          (comment.author?.fullName || "U")
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </div>

                      <div className="rounded-2xl bg-slate-100 px-4 py-2.5">
                        <p className="text-xs font-semibold text-slate-800">
                          {comment.author?.fullName || "User"}
                        </p>

                        <p className="mt-1 text-sm text-slate-700">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 p-4">
              {commentError && (
                <p className="mb-2 text-xs text-red-500">
                  {commentError}
                </p>
              )}

              <div className="flex items-end gap-2">
                <textarea
                  value={commentText}
                  onChange={(event) =>
                    setCommentText(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      handleAddComment();
                    }
                  }}
                  placeholder="Write a comment..."
                  rows={1}
                  className="max-h-24 min-h-10 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />

                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showShare && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">

            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Share Post
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Share this post with your campus.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowShare(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="line-clamp-3 text-sm text-slate-700">
                {post.content}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
            >
              {copied ? (
                <>
                  <Check size={17} />
                  Link Copied
                </>
              ) : (
                <>
                  <Copy size={17} />
                  Copy Post Link
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
      />
    </>
  );
}

export default PostCard;