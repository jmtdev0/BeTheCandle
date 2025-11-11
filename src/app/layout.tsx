import type { Metadata } from "next";
import "./globals.css";
import SidebarWithLobbyStatus from "@/components/common/SidebarWithLobbyStatus";
import GlobalMusicPlayer from "@/components/common/GlobalMusicPlayer";
import AnimatedFavicon from "@/components/common/AnimatedFavicon";
import UserIdentityBootstrap from "@/components/common/UserIdentityBootstrap";
import { SupabaseAuthProvider } from "@/components/common/AuthProvider";

export const metadata: Metadata = {
  title: "Bitcoin Daily Collection - Donation Platform",
  description: "Non-custodial Bitcoin donation platform with animated bubbles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SupabaseAuthProvider>
          <AnimatedFavicon />
          <UserIdentityBootstrap />
          <SidebarWithLobbyStatus />
          <GlobalMusicPlayer />
          {children}
        </SupabaseAuthProvider>
      </body>
    </html>
  );
}
