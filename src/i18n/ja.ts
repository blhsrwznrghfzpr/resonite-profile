import type { Translations } from './types.ts';

export const ja: Translations = {
  header: {
    title: 'Resonite ユーザー検索',
    subtitle: 'Resoniteユーザーの情報を検索・表示できます',
  },
  search: {
    placeholder: 'ユーザー名を入力してください',
    button: '検索',
    loading: '検索中...',
    error: 'エラーが発生しました: {message}',
    noResults: 'ユーザーが見つかりませんでした',
  },
  userDetail: {
    missingId: 'ユーザーIDが指定されていません',
    loading: 'ユーザー情報を読み込み中...',
    error: 'エラーが発生しました: {message}',
    backToSearch: '← 検索に戻る',
    currentSession: '現在のセッション',
    sessionThumbnail: 'セッションサムネイル',
    badges: 'バッジ',
    createdWorlds: '作成したワールド',
    showAll: 'すべて表示',
    worldsLoading: '読み込み中...',
    worldsError: 'ワールドの読み込みに失敗しました',
    registrationDate: '登録日: {date}',
    migratedDate: '移行前登録日: {date}',
    metaDescription: '{username} • {date}登録',
  },
  copy: {
    success: 'コピーしました!',
    fallback: 'テキストを選択しました',
  },
  worlds: {
    noWorlds: '公開されたワールドがありません',
    publishDate: '公開日: {date}',
  },
  api: {
    httpError: 'HTTPエラー: {status}',
  },
};
