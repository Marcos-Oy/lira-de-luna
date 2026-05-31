import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — Lira de Luna",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
