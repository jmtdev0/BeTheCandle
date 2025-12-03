import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lobby - Be The Candle",
  description: "Join the lobby and connect with the community",
};

export default function LobbyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
