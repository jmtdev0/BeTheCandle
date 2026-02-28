import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/common/Sidebar";
import GlobalMusicPlayer from "@/components/common/GlobalMusicPlayer";
import AnimatedFavicon from "@/components/common/AnimatedFavicon";
import UserIdentityBootstrap from "@/components/common/UserIdentityBootstrap";
import CookieBanner from "@/components/common/CookieBanner";
import ConsoleImmersiveTools from "@/components/common/ConsoleImmersiveTools";
import { SupabaseAuthProvider } from "@/components/common/AuthProvider";
import { PageTransitionProvider } from "@/contexts/PageTransitionContext";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { MusicTrackProvider } from "@/contexts/MusicTrackContext";

export const metadata: Metadata = {
  title: "Be The Candle",
  description: "Weekly equally-shared USDC giveaways"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <CookieConsentProvider>
          <SupabaseAuthProvider>
            <MusicTrackProvider>
              <AnimatedFavicon />
              <UserIdentityBootstrap />
              <ConsoleImmersiveTools />
              <PageTransitionProvider>
                <Sidebar />
                <GlobalMusicPlayer />
                {children}
              </PageTransitionProvider>
            </MusicTrackProvider>
          </SupabaseAuthProvider>
          <CookieBanner />
        </CookieConsentProvider>
      </body>
    </html>
  );
}
