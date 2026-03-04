import { jsonResponse } from '../lib/response.ts';

export function handleHealth(): Response {
  return jsonResponse(
    {
      status: 'ok',
      service: 'resonite-profile-worker',
      now: new Date().toISOString(),
    },
    200,
    { 'Cache-Control': 'no-store' }
  );
}
