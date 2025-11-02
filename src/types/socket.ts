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

export interface ServerToClientEvents {
  'planets:update': (planets: Planet[]) => void;
  'planet:added': (planet: Planet) => void;
  'planet:removed': (userId: string) => void;
  'planet:colorChanged': (userId: string, color: string) => void;
}

export interface ClientToServerEvents {
  'planet:join': (data: { color: string; userName?: string }) => void;
  'planet:leave': () => void;
  'planet:updateColor': (color: string) => void;
}
