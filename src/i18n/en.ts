import type { Translations } from './types.ts';

export const en: Translations = {
  header: {
    title: 'Resonite User Search',
    subtitle: 'Search and view Resonite user profiles',
  },
  search: {
    placeholder: 'Enter a username',
    button: 'Search',
    loading: 'Searching...',
    error: 'An error occurred: {message}',
    noResults: 'No users found',
  },
  userDetail: {
    missingId: 'No user ID specified',
    loading: 'Loading user info...',
    error: 'An error occurred: {message}',
    backToSearch: '← Back to search',
    currentSession: 'Current Session',
    sessionThumbnail: 'Session thumbnail',
    badges: 'Badges',
    createdWorlds: 'Created Worlds',
    showAll: 'Show all',
    worldsLoading: 'Loading...',
    worldsError: 'Failed to load worlds',
    registrationDate: 'Registered: {date}',
    migratedDate: 'Pre-migration: {date}',
    metaDescription: '{username} • Registered {date}',
  },
  copy: {
    success: 'Copied!',
    fallback: 'Text selected',
  },
  worlds: {
    noWorlds: 'No published worlds',
    publishDate: 'Published: {date}',
  },
  api: {
    httpError: 'HTTP error: {status}',
  },
};
