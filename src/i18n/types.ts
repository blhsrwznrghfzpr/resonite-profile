export interface Translations {
  header: {
    title: string;
    subtitle: string;
  };
  search: {
    placeholder: string;
    button: string;
    loading: string;
    error: string;
    noResults: string;
  };
  userDetail: {
    missingId: string;
    loading: string;
    error: string;
    backToSearch: string;
    currentSession: string;
    sessionThumbnail: string;
    badges: string;
    createdWorlds: string;
    showAll: string;
    worldsLoading: string;
    worldsError: string;
    registrationDate: string;
    migratedDate: string;
    metaDescription: string;
  };
  copy: {
    success: string;
    fallback: string;
  };
  worlds: {
    noWorlds: string;
    publishDate: string;
  };
  api: {
    httpError: string;
  };
}
