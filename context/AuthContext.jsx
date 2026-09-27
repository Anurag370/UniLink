"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { request } from "@/lib/api-client";

const AuthContext = createContext();

export function toClientUser(apiUser) {
  if (!apiUser) return null;

  const profile = apiUser.profile ?? {};

  return {
    id: apiUser.id,
    name: apiUser.fullName,
    email: apiUser.email,
    username: apiUser.username ?? "",
    accountType: apiUser.accountType ?? "student",
    department: profile.department ?? "",
    branch: profile.department ?? "",
    course: profile.department ?? "",
    year: profile.year ?? "",
    studyYear: profile.year ?? "",
    bio: profile.bio ?? "",
    profilePhoto: apiUser.profilePhoto ?? "",
    avatar: apiUser.profilePhoto ?? "",
    profilePicture: apiUser.profilePhoto ?? "",
    github: apiUser.github ?? "",
    linkedin: apiUser.linkedin ?? "",
    location: apiUser.location ?? "",
    college: apiUser.college ?? "",
    graduationYear: apiUser.graduationYear ?? "",
    currentRole: apiUser.currentRole ?? "",
    company: apiUser.company ?? "",
    skills: apiUser.skills ?? [],
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me = await request("/api/auth/me");

        if (!cancelled) {
          setUser(toClientUser(me));
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const register = async (newUser) => {
    const created = await request("/api/auth/register", {
      method: "POST",
      body: newUser,
    });

    setUser(toClientUser(created.user));
  };

  const login = async (email, password) => {
    try {
      const result = await request("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });

      setUser(toClientUser(result.user));

      return true;
    } catch {
      return false;
    }
  };

  const updateUser = async (updatedData) => {
    const updated = await request("/api/users/me", {
      method: "PATCH",
      body: updatedData,
    });

    setUser(toClientUser(updated.user));
  };

  const logout = async () => {
    try {
      await request("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore logout failures; clear local state regardless.
    }

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggedIn: !!user,
        register,
        login,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}