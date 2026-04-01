export interface UserProfile {
  iconUrl?: string;
}

export interface MigratedData {
  registrationDate?: string;
}

export interface User {
  id: string;
  username: string;
  registrationDate?: string;
  profile?: UserProfile;
  tags?: string[];
  migratedData?: MigratedData;
}

export interface SessionUser {
  userID: string;
  isPresent: boolean;
}

export interface Session {
  sessionId: string;
  name: string;
  thumbnailUrl?: string;
  sessionUsers?: SessionUser[];
}

export interface World {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  thumbnailUri?: string;
  firstPublishTime?: string;
}

export interface MintedColorEntry {
  ownerUserId?: string;
  color?: {
    r: number;
    g: number;
    b: number;
    a?: number;
  };
  timestamp?: string;
  counterMints?: string[];
}
