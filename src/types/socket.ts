export interface Planet {
  id: string;
  userId: string;
  color: string;
  position: [number, number, number];
  orbitRadius: number;
  orbitSpeed: number;
  orbitSpeedMultiplier?: number; // User-configurable speed multiplier (0.1 - 3.0)
  size: number;
  isUser: boolean;
  userName?: string;
}
