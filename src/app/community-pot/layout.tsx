import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Pot - Be The Candle",
  description: "Join the weekly community pot and receive your share of USDC",
};

export default function CommunityPotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
