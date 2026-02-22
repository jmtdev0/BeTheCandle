"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    startImmersiveMode?: () => void;
    stopImmersiveMode?: () => void;
    __btcImmersiveMode?: {
      enabled: boolean;
      style?: HTMLStyleElement;
      observer?: MutationObserver;
    };
  }
}

const IMMERSIVE_KEY = "__btcImmersiveMode";
const IMMERSIVE_STYLE_ID = "btc-immersive-style";
const WALLET_TOOLTIP_SELECTOR = 'div[style*="user-select: text"][class*="border-blue-300/60"]';

export default function ConsoleImmersiveTools() {
  useEffect(() => {
    const hideWalletTooltips = () => {
      document.querySelectorAll(WALLET_TOOLTIP_SELECTOR).forEach((el) => {
        (el as HTMLElement).style.display = "none";
      });
    };

    window.startImmersiveMode = () => {
      if (window[IMMERSIVE_KEY]?.enabled) {
        console.log("Immersive mode is already ON");
        return;
      }

      const style = document.createElement("style");
      style.id = IMMERSIVE_STYLE_ID;
      style.textContent = `
        .ui-panel.absolute { display: none !important; }
        .ui-panel.fixed.group { display: none !important; }
        .ui-panel.fixed.top-4.right-4 { display: none !important; }
        ${WALLET_TOOLTIP_SELECTOR} { display: none !important; }
      `;
      document.head.appendChild(style);

      hideWalletTooltips();

      const observer = new MutationObserver(hideWalletTooltips);
      observer.observe(document.body, { childList: true, subtree: true });

      window[IMMERSIVE_KEY] = {
        enabled: true,
        style,
        observer,
      };

      console.log("Immersive mode ON");
    };

    window.stopImmersiveMode = () => {
      if (!window[IMMERSIVE_KEY]?.enabled) {
        console.log("Immersive mode is already OFF");
        return;
      }

      window[IMMERSIVE_KEY]?.observer?.disconnect();
      window[IMMERSIVE_KEY]?.style?.remove();
      delete window[IMMERSIVE_KEY];

      document.querySelectorAll(WALLET_TOOLTIP_SELECTOR).forEach((el) => {
        (el as HTMLElement).style.display = "";
      });

      console.log("Immersive mode OFF");
    };

    return () => {
      if (window[IMMERSIVE_KEY]?.enabled) {
        window.stopImmersiveMode?.();
      }
      document.getElementById(IMMERSIVE_STYLE_ID)?.remove();
      delete window.startImmersiveMode;
      delete window.stopImmersiveMode;
    };
  }, []);

  return null;
}

