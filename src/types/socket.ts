export interface Planet {
  id: string;
  userId: string;
  color: string;
  position: [number, number, number];
  orbitRadius: number;
  orbitSpeed: number;
  size: number;
  isUser: boolean;
  userName?: string;
}
