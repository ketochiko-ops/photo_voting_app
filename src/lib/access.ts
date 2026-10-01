export interface FragmentAccess {
  key: string;
  role: 'participant' | 'admin';
}
export function consumeFragment(roomId: string): FragmentAccess | null {
  const params = new URLSearchParams(location.hash.slice(1));
  const admin = params.get('admin'),
    participant = params.get('k');
  const access = admin
    ? { key: admin, role: 'admin' as const }
    : participant
      ? { key: participant, role: 'participant' as const }
      : null;
  if (access) {
    sessionStorage.setItem(`room-access:${roomId}`, JSON.stringify(access));
    history.replaceState(null, '', location.pathname + location.search);
  }
  const stored = sessionStorage.getItem(`room-access:${roomId}`);
  if (access) return access;
  if (!stored) return null;
  try {
    return JSON.parse(stored) as FragmentAccess;
  } catch {
    return null;
  }
}
export function participantToken(roomId: string): string {
  const storageKey = `participant-token:${roomId}`;
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const generated = btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  localStorage.setItem(storageKey, generated);
  return generated;
}
