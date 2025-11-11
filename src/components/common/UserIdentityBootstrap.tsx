"use client";

import { useEffect } from "react";
import { getOrCreateUserId } from "@/lib/userId";

export default function UserIdentityBootstrap() {
  useEffect(() => {
    try {
      getOrCreateUserId();
    } catch (err) {
      console.error("Failed to initialize user id cookie", err);
    }
  }, []);

  return null;
}
