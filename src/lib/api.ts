import type { User, Session, World } from '../types.ts';

const API_BASE =
  (import.meta as unknown as { env: Record<string, string | undefined> }).env
    .VITE_API_BASE ?? '';

export async function searchUsers(name: string): Promise<User[]> {
  const res = await fetch(
    `${API_BASE}/api/users?name=${encodeURIComponent(name)}`
  );
  if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);
  return res.json() as Promise<User[]>;
}

export async function fetchUser(userId: string): Promise<User> {
  const res = await fetch(
    `${API_BASE}/api/users/${encodeURIComponent(userId)}`
  );
  if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);
  return res.json() as Promise<User>;
}

export async function fetchSessions(): Promise<Session[]> {
  const res = await fetch(`${API_BASE}/api/sessions`);
  if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);
  return res.json() as Promise<Session[]>;
}

export async function fetchUserWorlds(userId: string): Promise<World[]> {
  const res = await fetch(`${API_BASE}/api/worlds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      byOwner: userId,
      ownerType: 'User',
      recordType: 'world',
      private: false,
      count: 6,
      sortBy: 'FirstPublishTime',
      sortDirection: 'Descending',
      submittedTo: 'G-Resonite',
    }),
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  const data = (await res.json()) as { records?: World[] };
  return data.records ?? [];
}
