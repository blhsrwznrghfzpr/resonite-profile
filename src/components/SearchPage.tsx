import { useEffect, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { searchUsers } from '../lib/api.ts';
import { convertIconUrl, DEFAULT_AVATAR_URL } from '../lib/url.ts';
import { TagBadge } from './TagBadge.tsx';
import type { User } from '../types.ts';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Props {
  default?: boolean;
}

export function SearchPage(_: Props) {
  const { route } = useLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Resonite ユーザー検索';
    document
      .querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')
      .forEach(el => el.remove());
  }, []);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const users = await searchUsers(query.trim());
      setResults(users);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter') handleSearch();
  }

  return (
    <div class="search-section">
      <div class="search-form">
        <input
          type="text"
          class="search-input"
          placeholder="ユーザー名を入力してください"
          value={query}
          onInput={e => setQuery((e.target as HTMLInputElement).value)}
          onKeyPress={handleKeyPress}
          autofocus
        />
        <button class="search-btn" onClick={handleSearch} disabled={loading}>
          検索
        </button>
      </div>

      {loading && <div class="loading">検索中...</div>}
      {error && <div class="error">エラーが発生しました: {error}</div>}
      {results !== null && results.length === 0 && (
        <div class="no-results">ユーザーが見つかりませんでした</div>
      )}
      {results && results.length > 0 && (
        <div>
          {results.map(user => (
            <div
              key={user.id}
              class="user-info"
              style="cursor: pointer;"
              onClick={() => route(`/${encodeURIComponent(user.id)}`)}
            >
              <div class="user-header">
                <img
                  class="user-avatar"
                  src={convertIconUrl(user.profile?.iconUrl)}
                  alt="Avatar"
                  onError={e => {
                    (e.target as HTMLImageElement).src = DEFAULT_AVATAR_URL;
                  }}
                />
                <div class="user-basic">
                  <div class="username">{user.username}</div>
                  <div class="user-id">{user.id}</div>
                  {user.tags && user.tags.length > 0 && (
                    <div class="user-tags">
                      {user.tags.map(tag => (
                        <TagBadge key={tag} tag={tag} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
