"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, Children, cloneElement, isValidElement } from "react";
import { useRouter, usePathname } from "next/navigation";
import PageLoader from "@/components/common/PageLoader";

interface PageTransitionContextType {
  isTransitioning: boolean;
  navigate: (href: string) => void;
}

const PageTransitionContext = createContext<PageTransitionContextType | undefined>(undefined);

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(true); // Start with true for initial load
  const [transitionMessage, setTransitionMessage] = useState("Loading...");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const childrenArray = Children.toArray(children);
  const pageContent = childrenArray[childrenArray.length - 1]; // Last child is the page content
  const persistentComponents = childrenArray.slice(0, -1); // Everything else is persistent

  const navigate = useCallback((href: string) => {
    // Don't navigate if already on the same page
    if (pathname === href) return;

    // Set appropriate message based on destination
    const messages: Record<string, string> = {
      "/lobby": "Entering the Lobby...",
      "/community-pot": "Loading Community Pot...",
      "/donate": "Opening Donations...",
      "/sharing-future": "Loading...",
      "/even-goofier-mode": "Loading...",
    };
    setTransitionMessage(messages[href] || "Loading...");

    // Show loader immediately
    setIsTransitioning(true);

    // Navigate immediately
    router.push(href);
  }, [router, pathname]);

  // Handle initial page load
  useEffect(() => {
    if (isInitialLoad) {
      // Set message based on current pathname
      const messages: Record<string, string> = {
        "/lobby": "Entering the Lobby...",
        "/community-pot": "Loading Community Pot...",
        "/donate": "Opening Donations...",
        "/sharing-future": "Loading...",
        "/even-goofier-mode": "Loading...",
      };
      setTransitionMessage(messages[pathname] || "Loading...");

      // Hide loader after initial mount
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setIsInitialLoad(false);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [isInitialLoad, pathname]);

  // Hide loader once new page content has mounted
  useEffect(() => {
    if (isInitialLoad) return;
    if (!isTransitioning) return;

    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [pageContent, isInitialLoad, isTransitioning]);

  // Separate children into persistent components and page content

  return (
    <PageTransitionContext.Provider value={{ isTransitioning, navigate }}>
      {isTransitioning && <PageLoader message={transitionMessage} />}
      {/* Persistent components (Sidebar, Music Player) - always visible */}
      {persistentComponents}
      {/* Page content - hidden during transitions */}
      <div style={{ display: isTransitioning ? "none" : "block" }}>
        {pageContent}
      </div>
    </PageTransitionContext.Provider>
  );
}

export function usePageTransition() {
  const context = useContext(PageTransitionContext);
  if (!context) {
    throw new Error("usePageTransition must be used within PageTransitionProvider");
  }
  return context;
}
