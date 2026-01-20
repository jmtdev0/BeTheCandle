import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Be The Candle",
  description: "Non-custodial Bitcoin donation platform",
};

export default function LobbyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
