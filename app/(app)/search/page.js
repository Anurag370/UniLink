"use client";

import { useEffect, useState } from "react";
import {
  Search as SearchIcon,
  Users,
  CalendarDays,
} from "lucide-react";
import { useRouter } from "next/navigation";

import BottomNav from "@/components/BottomNav";
import LoginPrompt from "@/components/LoginPrompt";

import { useAuth } from "@/context/AuthContext";

import { request } from "@/lib/api-client";

export default function SearchPage() {
  const router = useRouter();

  const {
    user,
    isLoggedIn,
  } = useAuth();

  const [activeTab, setActiveTab] = useState("people");
  const [searchQuery, setSearchQuery] = useState("");

  const [accounts, setAccounts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);

  const [
    connectionStatuses,
    setConnectionStatuses,
  ] = useState({});

  const [
    showLoginPrompt,
    setShowLoginPrompt,
  ] = useState(false);

  /*
   * Map an API user row to the account shape used below.
   */
  const toAccount = (apiUser) => {
    const profile = apiUser.profile ?? {};

    return {
      id: apiUser.id,
      name: apiUser.fullName,
      username: apiUser.username ?? "",
      department: profile.department ?? "",
      branch: profile.department ?? "",
      course: profile.department ?? "",
      year: profile.year ?? "",
      studyYear: profile.year ?? "",
      profilePhoto: apiUser.profilePhoto ?? "",
      avatar: apiUser.profilePhoto ?? "",
      skills: (apiUser.skills ?? []).map((skill) =>
        typeof skill === "string" ? skill : skill.name
      ),
      accountType: apiUser.accountType ?? "student",
    };
  };

  /*
   * Load accounts and opportunities
   */
  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      try {
        const [usersResult, opportunitiesResult] =
          await Promise.all([
            request("/api/users?limit=50"),
            request("/api/opportunities?limit=50"),
          ]);

        if (cancelled) return;

        setAccounts(
          (usersResult.users ?? []).map(toAccount)
        );

        setOpportunities(
          opportunitiesResult.opportunities ?? []
        );
      } catch {
        if (!cancelled) {
          setAccounts([]);
          setOpportunities([]);
        }
      }
    };

    loadAll();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Refresh connection statuses
   */
  const loadConnectionStatuses = async () => {
    try {
      const [accepted, incoming, outgoing] =
        await Promise.all([
          request("/api/connections?limit=50"),
          request(
            "/api/connections?status=incoming&limit=50"
          ),
          request(
            "/api/connections?status=outgoing&limit=50"
          ),
        ]);

      const statuses = {};

      (accepted.connections ?? []).forEach((connection) => {
        if (connection.user?.id != null) {
          statuses[connection.user.id] = "accepted";
        }
      });

      (outgoing.connections ?? []).forEach((connection) => {
        if (connection.user?.id != null) {
          statuses[connection.user.id] = "pending";
        }
      });

      (incoming.connections ?? []).forEach((connection) => {
        if (
          connection.user?.id != null &&
          !statuses[connection.user.id]
        ) {
          statuses[connection.user.id] = "pending";
        }
      });

      setConnectionStatuses(statuses);
    } catch {
      setConnectionStatuses({});
    }
  };

  useEffect(() => {
    if (!user) return;

    void (async () => {
      await loadConnectionStatuses();
    })();
  }, [user, accounts]);

  /*
   * Keep connection status synchronized on focus
   */
  useEffect(() => {
    if (!user) {
      return;
    }

    const handleConnectionUpdate = () => {
      loadConnectionStatuses();
    };

    window.addEventListener(
      "focus",
      handleConnectionUpdate
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleConnectionUpdate
      );
    };
  }, [user, accounts]);

  /*
   * Search query
   */
  const query =
    searchQuery
      .trim()
      .toLowerCase();

  /*
   * Remove currently logged-in user
   */
  const otherAccounts =
    accounts.filter(
      (account) =>
        String(account.id) !==
        String(user?.id)
    );

  /*
   * Filter people
   */
  const filteredAccounts =
    otherAccounts.filter(
      (account) => {
        const skills =
          Array.isArray(account.skills)
            ? account.skills.join(" ")
            : account.skills || "";

        const searchableText = `
          ${account.name || ""}
          ${account.username || ""}
          ${account.email || ""}
          ${account.department || ""}
          ${account.branch || ""}
          ${account.course || ""}
          ${account.year || ""}
          ${account.studyYear || ""}
          ${account.graduationYear || ""}
          ${account.currentJob || ""}
          ${account.currentRole || ""}
          ${account.company || ""}
          ${skills}
          ${account.bio || ""}
          ${account.accountType || ""}
        `.toLowerCase();

        return searchableText.includes(query);
      }
    );

  /*
   * Filter opportunities
   */
  const filteredOpportunities =
    opportunities.filter(
      (opportunity) => {
        const searchableText = `
          ${opportunity.title || ""}
          ${opportunity.type || ""}
          ${opportunity.location || ""}
          ${opportunity.description || ""}
        `.toLowerCase();

        return searchableText.includes(query);
      }
    );

  /*
   * Profile image
   */
  const getProfileImage = (account) => {
    if (account.profilePhoto) {
      return account.profilePhoto;
    }

    if (account.avatar) {
      return account.avatar;
    }

    if (account.profilePicture) {
      return account.profilePicture;
    }

    return `https://i.pravatar.cc/100?u=${
      account.id ||
      account.email ||
      account.name ||
      "user"
    }`;
  };

  /*
   * Branch
   */
  const getBranch = (account) => {
    return (
      account.branch ||
      account.department ||
      account.course ||
      "Student"
    );
  };

  /*
   * Year
   */
  const getYear = (account) => {
    return (
      account.year ||
      account.studyYear ||
      ""
    );
  };

  /*
   * Handle connection
   */
  const handleConnect = async (accountId) => {
    if (
      !isLoggedIn ||
      !user
    ) {
      setShowLoginPrompt(true);
      return;
    }

    if (
      String(user.id) ===
      String(accountId)
    ) {
      return;
    }

    /*
     * Already connected / pending
     */
    if (
      (connectionStatuses[accountId] || "none") !==
      "none"
    ) {
      return;
    }

    /*
     * Send request
     */
    try {
      const result = await request("/api/connections", {
        method: "POST",
        body: { userId: accountId },
      });

      setConnectionStatuses(
        (previous) => ({
          ...previous,
          [accountId]:
            result.connection?.status ||
            "pending",
        })
      );
    } catch {
      loadConnectionStatuses();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-10">

      {/* =====================================================
          DESKTOP / MOBILE SEARCH HEADER
          ===================================================== */}

      <header
        className="
          sticky
          top-0
          z-40
          border-b
          border-slate-200
          bg-white/95
          px-4
          py-4
          backdrop-blur-md

          
          

          
          
        "
      >
        <div
          className="
            mx-auto
            w-full
            max-w-4xl
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <SearchIcon
              size={20}
              className="shrink-0 text-slate-400"
            />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
              placeholder="Search people, opportunities..."
              className="
                w-full
                bg-transparent
                text-sm
                text-slate-800
                outline-none
                placeholder:text-slate-400
              "
            />
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <main
        className="
          w-full
          px-4
          py-6

          sm:px-6

          
          
          lg:px-8

          
          
        "
      >
        <div
          className="
            mx-auto
            w-full
            max-w-4xl
          "
        >

          {/* =================================================
              TABS
              ================================================= */}

          <div
            className="
              flex
              gap-2
              rounded-xl
              bg-white
              p-1
              shadow-sm
              ring-1
              ring-slate-200
            "
          >

            {/* PEOPLE TAB */}

            <button
              type="button"
              onClick={() =>
                setActiveTab("people")
              }
              className={`
                flex
                flex-1
                items-center
                justify-center
                gap-2
                rounded-lg
                px-4
                py-2.5
                text-xs
                font-semibold
                transition

                ${
                  activeTab === "people"
                    ? "bg-indigo-500 text-white"
                    : "text-slate-500 hover:bg-slate-50"
                }
              `}
            >
              <Users size={15} />

              <span>
                People
              </span>
            </button>

            {/* OPPORTUNITIES TAB */}

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "opportunities"
                )
              }
              className={`
                flex
                flex-1
                items-center
                justify-center
                gap-2
                rounded-lg
                px-4
                py-2.5
                text-xs
                font-semibold
                transition

                ${
                  activeTab ===
                  "opportunities"
                    ? "bg-indigo-500 text-white"
                    : "text-slate-500 hover:bg-slate-50"
                }
              `}
            >
              <CalendarDays
                size={15}
              />

              <span>
                Opportunities
              </span>
            </button>
          </div>

          {/* =================================================
              PEOPLE
              ================================================= */}

          {activeTab === "people" && (
            <section className="mt-5 space-y-3">

              {filteredAccounts.length === 0 ? (
                <div
                  className="
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    px-5
                    py-12
                    text-center
                    shadow-sm
                  "
                >
                  <Users
                    size={30}
                    className="mx-auto text-slate-300"
                  />

                  <h3 className="mt-3 text-sm font-semibold text-slate-800">
                    No people found
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    Try searching for another
                    name, branch, or skill.
                  </p>
                </div>
              ) : (
                filteredAccounts.map(
                  (account) => {
                    const status =
                      connectionStatuses[
                        account.id
                      ] || "none";

                    return (
                      <article
                        key={account.id}
                        className="
                          rounded-2xl
                          border
                          border-slate-200
                          bg-white
                          p-4
                          shadow-sm
                          transition
                          hover:border-indigo-100
                          hover:shadow-md
                        "
                      >
                        <div
                          className="
                            flex
                            items-center
                            gap-3
                          "
                        >

                          {/* PROFILE */}

                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/profile/${account.id}`
                              )
                            }
                            className="
                              flex
                              min-w-0
                              flex-1
                              items-center
                              gap-3
                              text-left
                            "
                          >
                            <img
                              src={getProfileImage(
                                account
                              )}
                              alt={
                                account.name ||
                                "User"
                              }
                              className="
                                h-12
                                w-12
                                shrink-0
                                rounded-full
                                object-cover
                              "
                            />

                            <div className="min-w-0">

                              <h3
                                className="
                                  truncate
                                  text-sm
                                  font-semibold
                                  text-slate-900
                                "
                              >
                                {account.name ||
                                  "Student"}
                              </h3>

                              <p
                                className="
                                  mt-1
                                  truncate
                                  text-xs
                                  text-slate-500
                                "
                              >
                                {getBranch(
                                  account
                                )}

                                {getYear(
                                  account
                                ) &&
                                  ` • ${getYear(
                                    account
                                  )}`}
                              </p>

                              {Array.isArray(
                                account.skills
                              ) &&
                                account.skills
                                  .length > 0 && (
                                  <p
                                    className="
                                      mt-1
                                      truncate
                                      text-xs
                                      text-slate-400
                                    "
                                  >
                                    {account.skills
                                      .slice(
                                        0,
                                        3
                                      )
                                      .join(
                                        " • "
                                      )}
                                  </p>
                                )}
                            </div>
                          </button>

                          {/* CONNECTION BUTTON */}

                          <button
                            type="button"
                            onClick={() =>
                              handleConnect(
                                account.id
                              )
                            }
                            disabled={
                              status !==
                              "none"
                            }
                            className={`
                              shrink-0
                              rounded-xl
                              px-3
                              py-2
                              text-xs
                              font-semibold
                              transition

                              ${
                                status ===
                                "pending"
                                  ? "bg-slate-100 text-slate-500"
                                  : status ===
                                    "accepted"
                                  ? "bg-green-50 text-green-600"
                                  : "bg-indigo-600 text-white hover:bg-indigo-700"
                              }
                            `}
                          >
                            {status ===
                            "pending"
                              ? "Pending"
                              : status ===
                                "accepted"
                              ? "Connected"
                              : "Connect"}
                          </button>
                        </div>
                      </article>
                    );
                  }
                )
              )}
            </section>
          )}

          {/* =================================================
              OPPORTUNITIES
              ================================================= */}

          {activeTab ===
            "opportunities" && (
            <section className="mt-5 space-y-3">

              {filteredOpportunities.length ===
              0 ? (
                <div
                  className="
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    px-5
                    py-12
                    text-center
                    shadow-sm
                  "
                >
                  <CalendarDays
                    size={30}
                    className="mx-auto text-slate-300"
                  />

                  <h3 className="mt-3 text-sm font-semibold text-slate-800">
                    No opportunities found
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    There are no opportunities
                    matching your search.
                  </p>
                </div>
              ) : (
                filteredOpportunities.map(
                  (opportunity) => (
                    <button
                      key={
                        opportunity.id
                      }
                      type="button"
                      onClick={() =>
                        router.push(
                          `/opportunities/${opportunity.id}`
                        )
                      }
                      className="
                        w-full
                        overflow-hidden
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        text-left
                        shadow-sm
                        transition
                        hover:border-indigo-100
                        hover:shadow-md
                      "
                    >

                      {/* OPPORTUNITY IMAGE */}

                      {opportunity.banner ? (
                        <img
                          src={
                            opportunity.banner
                          }
                          alt={
                            opportunity.title
                          }
                          className="
                            h-48
                            w-full
                            object-cover
                          "
                        />
                      ) : (
                        <div
                          className="
                            flex
                            h-32
                            w-full
                            items-center
                            justify-center
                            bg-gradient-to-br
                            from-indigo-50
                            to-violet-50
                          "
                        >
                          <CalendarDays
                            size={38}
                            className="text-indigo-300"
                          />
                        </div>
                      )}

                      {/* OPPORTUNITY CONTENT */}

                      <div className="p-4">

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            {opportunity.type && (
                              <span
                                className="
                                  inline-flex
                                  rounded-full
                                  bg-indigo-50
                                  px-2.5
                                  py-1
                                  text-[9px]
                                  font-semibold
                                  text-indigo-600
                                "
                              >
                                {
                                  opportunity.type
                                }
                              </span>
                            )}

                            <h3
                              className="
                                mt-2
                                truncate
                                text-sm
                                font-semibold
                                text-slate-900
                              "
                            >
                              {
                                opportunity.title
                              }
                            </h3>
                          </div>

                          <CalendarDays
                            size={18}
                            className="
                              shrink-0
                              text-indigo-400
                            "
                          />
                        </div>

                        {opportunity.date && (
                          <p
                            className="
                              mt-2
                              text-xs
                              font-medium
                              text-slate-500
                            "
                          >
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
                          </p>
                        )}

                        {opportunity.location && (
                          <p
                            className="
                              mt-1
                              text-xs
                              text-slate-500
                            "
                          >
                            {opportunity.location}
                          </p>
                        )}

                        {opportunity.description && (
                          <p
                            className="
                              mt-3
                              line-clamp-2
                              text-xs
                              leading-5
                              text-slate-500
                            "
                          >
                            {
                              opportunity.description
                            }
                          </p>
                        )}
                      </div>
                    </button>
                  )
                )
              )}
            </section>
          )}
        </div>
      </main>

      {/* =====================================================
          BOTTOM NAV
          ===================================================== */}

      <BottomNav />

      {/* =====================================================
          LOGIN PROMPT
          ===================================================== */}

      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() =>
          setShowLoginPrompt(false)
        }
      />
    </div>
  );
}