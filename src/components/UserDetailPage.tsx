import { useEffect, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { fetchUser, fetchSessions, fetchUserWorlds } from '../lib/api.ts';
import { convertIconUrl, DEFAULT_AVATAR_URL } from '../lib/url.ts';
import { CopyableText } from './CopyableText.tsx';
import { TagBadge } from './TagBadge.tsx';
import { WorldGrid } from './WorldGrid.tsx';
import { useI18n, formatMessage } from '../i18n/context.tsx';
import type { User, Session, World } from '../types.ts';

interface Props {
  path?: string;
  id?: string;
}

function safeStripHtmlTags(text: string): string {
  try {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return doc.body.textContent ?? '';
  } catch {
    return '';
  }
}

function updateMetaTags(
  user: User,
  locale: string,
  t: { userDetail: { metaDescription: string }; header: { title: string } }
) {
  const username = user.username ?? 'Unknown User';
  const avatarUrl = convertIconUrl(user.profile?.iconUrl);
  const registrationDate = new Date(
    user.registrationDate ?? ''
  ).toLocaleDateString(locale);
  const description = formatMessage(t.userDetail.metaDescription, {
    username,
    date: registrationDate,
  });

  document
    .querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')
    .forEach(el => el.remove());

  const metaTags: Array<{ property?: string; name?: string; content: string }> =
    [
      { property: 'og:title', content: `${username} - Resonite Profile` },
      { property: 'og:description', content: description },
      { property: 'og:image', content: avatarUrl },
      { property: 'og:url', content: window.location.href },
      { property: 'og:type', content: 'profile' },
      { property: 'og:site_name', content: t.header.title },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: `${username} - Resonite Profile` },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: avatarUrl },
    ];

  metaTags.forEach(tagData => {
    const meta = document.createElement('meta');
    if (tagData.property) meta.setAttribute('property', tagData.property);
    else if (tagData.name) meta.setAttribute('name', tagData.name);
    meta.setAttribute('content', tagData.content);
    document.head.appendChild(meta);
  });
}

export function UserDetailPage({ id }: Props) {
  const { route } = useLocation();
  const { locale, t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [worlds, setWorlds] = useState<World[] | null>(null);
  const [worldsError, setWorldsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setUser(null);
      setCurrentSession(null);
      setWorlds(null);
      setWorldsError(false);

      const [userResult, sessionsResult] = await Promise.allSettled([
        fetchUser(id!),
        fetchSessions(),
      ]);

      if (cancelled) return;

      if (userResult.status === 'rejected') {
        setError(String(userResult.reason));
        setLoading(false);
        return;
      }

      const u = userResult.value;
      setUser(u);
      document.title = `${u.username} - Resonite Profile`;
      updateMetaTags(u, locale, t);

      if (sessionsResult.status === 'fulfilled') {
        const session = sessionsResult.value.find(s =>
          s.sessionUsers?.some(su => su.userID === id && su.isPresent)
        );
        setCurrentSession(session ?? null);
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetchUserWorlds(user.id)
      .then(w => {
        if (!cancelled) setWorlds(w);
      })
      .catch(() => {
        if (!cancelled) setWorldsError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  function goBack() {
    route('/');
  }

  if (!id) {
    return (
      <div class="search-section">
        <div class="error">{t.userDetail.missingId}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div class="search-section">
        <div class="loading">{t.userDetail.loading}</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div class="search-section">
        <div class="error">
          {formatMessage(t.userDetail.error, {
            message: error ?? 'Unknown error',
          })}
        </div>
      </div>
    );
  }

  const registrationDate = user.registrationDate
    ? new Date(user.registrationDate).toLocaleDateString(locale)
    : '';
  const migratedDate = user.migratedData?.registrationDate
    ? new Date(user.migratedData.registrationDate).toLocaleDateString(locale)
    : null;

  return (
    <div class="search-section">
      <div class="user-info">
        <div style="margin-bottom: 20px;">
          <button
            onClick={goBack}
            style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;"
          >
            {t.userDetail.backToSearch}
          </button>
        </div>

        <div
          class="user-header"
          style="display: flex; gap: 20px; align-items: flex-start;"
        >
          <div style="display: flex; gap: 15px; align-items: flex-start; flex: 1;">
            <img
              class="user-avatar"
              src={convertIconUrl(user.profile?.iconUrl)}
              alt="Avatar"
              onError={e => {
                (e.target as HTMLImageElement).src = DEFAULT_AVATAR_URL;
              }}
            />
            <div class="user-basic">
              <CopyableText text={user.username} class="username" />
              <CopyableText text={user.id} class="user-id" />
              <div
                class="user-dates"
                style="font-size: 0.9em; color: #666; margin-top: 8px;"
              >
                {registrationDate && (
                  <div>
                    {formatMessage(t.userDetail.registrationDate, {
                      date: registrationDate,
                    })}
                  </div>
                )}
                {migratedDate && (
                  <div>
                    {formatMessage(t.userDetail.migratedDate, {
                      date: migratedDate,
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {currentSession && (
            <div
              class="current-session-header"
              style="flex: 0 0 auto; max-width: 300px;"
            >
              <h4 style="margin: 0 0 8px 0; font-size: 1em; color: #333;">
                {t.userDetail.currentSession}
              </h4>
              <a
                href={`https://go.resonite.com/session/${encodeURIComponent(currentSession.sessionId)}`}
                target="_blank"
                style="text-decoration: none; color: inherit;"
              >
                <div style="padding: 10px; border: 1px solid #e9ecef; border-radius: 8px; cursor: pointer; background: #f8f9fa;">
                  <div style="font-weight: 500; margin-bottom: 8px; color: #333; font-size: 0.9em; word-break: break-word;">
                    {safeStripHtmlTags(currentSession.name)}
                  </div>
                  {currentSession.thumbnailUrl && (
                    <img
                      src={currentSession.thumbnailUrl}
                      alt={t.userDetail.sessionThumbnail}
                      style="width: 100%; max-width: 200px; border-radius: 5px;"
                    />
                  )}
                </div>
              </a>
            </div>
          )}
        </div>

        <div
          class="user-details"
          style="display: flex; flex-direction: column; gap: 20px;"
        >
          {user.tags && user.tags.length > 0 && (
            <div class="detail-section">
              <h3>{t.userDetail.badges}</h3>
              <div class="tags-container">
                {user.tags.map(tag => (
                  <TagBadge key={tag} tag={tag} showLabel />
                ))}
              </div>
            </div>
          )}

          <div class="detail-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h3 style="margin: 0;">{t.userDetail.createdWorlds}</h3>
              <button
                onClick={() => openAllWorlds(user!.id)}
                style="background: #667eea; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9em; transition: background 0.2s ease;"
                onMouseOver={e => {
                  (e.target as HTMLButtonElement).style.background = '#5a67d8';
                }}
                onMouseOut={e => {
                  (e.target as HTMLButtonElement).style.background = '#667eea';
                }}
              >
                {t.userDetail.showAll}
              </button>
            </div>
            <div style="margin-top: 10px;">
              {worlds === null && !worldsError ? (
                <div style="text-align: center; color: #666;">
                  {t.userDetail.worldsLoading}
                </div>
              ) : worldsError ? (
                <div style="text-align: center; color: #999;">
                  {t.userDetail.worldsError}
                </div>
              ) : (
                <WorldGrid worlds={worlds!} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function openAllWorlds(userId: string) {
  window.open(
    `https://resonite-world-search-pages.pages.dev/?owner=${encodeURIComponent(userId)}&sortBy=FirstPublishTime&sortDirection=Descending&submittedTo=G-Resonite`,
    '_blank'
  );
}
