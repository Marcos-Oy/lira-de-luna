"use client";

import { createContext, useContext } from "react";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string;
} | null;

const UserContext = createContext<SessionUser>(null);

export function UserProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
