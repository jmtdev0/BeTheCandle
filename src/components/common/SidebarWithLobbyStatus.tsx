"use client";

import { useSocket } from "@/hooks/useSocket";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function SidebarWithLobbyStatus() {
  const pathname = usePathname();
  const isLobbyPage = pathname === "/lobby";
  
  // Only subscribe to socket updates when on lobby page
  const { planets, isConnected } = useSocket();
  
  return (
    <Sidebar 
      lobbyUserCount={isLobbyPage ? planets.length : undefined}
      isLobbyConnected={isLobbyPage ? isConnected : undefined}
    />
  );
}
