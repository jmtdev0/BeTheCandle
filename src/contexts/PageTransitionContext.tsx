"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, Children, cloneElement, isValidElement } from "react";
import { useRouter, usePathname } from "next/navigation";
import PageLoader from "@/components/common/PageLoader";

interface PageTransitionContextType {
  isTransitioning: boolean;
  navigate: (href: string) => void;
  setDataReady: (ready: boolean) => void;
}

const PageTransitionContext = createContext<PageTransitionContextType | undefined>(undefined);

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(true); // Start with true for initial load
  const [transitionMessage, setTransitionMessage] = useState("Loading...");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const dataReadyPathRef = React.useRef<string | null>(null);
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

  // Pages that require data loading before hiding the loader
  const pagesRequiringData = ["/community-pot"];
  const requiresDataReady = pagesRequiringData.includes(pathname);

  // Reset dataReady when navigating to a new page
  useEffect(() => {
    if (dataReadyPathRef.current !== pathname) {
      setDataReady(false);
      dataReadyPathRef.current = pathname;
    }
  }, [pathname]);

  // Handle initial page load
  useEffect(() => {
    if (isInitialLoad) {
      // Set message based on current pathname
      const messages: Record<string, string> = {
        "/community-pot": "Loading Community Pot...",
        "/donate": "Opening Donations...",
        "/sharing-future": "Loading...",
        "/even-goofier-mode": "Loading...",
      };
      setTransitionMessage(messages[pathname] || "Loading...");

      // For pages that require data, wait for dataReady signal
      // For other pages, use a short timeout
      if (!requiresDataReady) {
        const timer = setTimeout(() => {
          setIsTransitioning(false);
          setIsInitialLoad(false);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [isInitialLoad, pathname, requiresDataReady]);

  // Hide loader when data is ready (for pages that require it)
  useEffect(() => {
    if (!isTransitioning) return;
    
    if (requiresDataReady) {
      // Wait for dataReady signal
      if (dataReady) {
        const timer = setTimeout(() => {
          setIsTransitioning(false);
          setIsInitialLoad(false);
        }, 200);
        return () => clearTimeout(timer);
      }
    } else if (!isInitialLoad) {
      // For pages not requiring data, hide after short delay
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pageContent, isInitialLoad, isTransitioning, requiresDataReady, dataReady]);

  // Separate children into persistent components and page content

  const setDataReadyCallback = useCallback((ready: boolean) => {
    setDataReady(ready);
  }, []);

  return (
    <PageTransitionContext.Provider value={{ isTransitioning, navigate, setDataReady: setDataReadyCallback }}>
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
