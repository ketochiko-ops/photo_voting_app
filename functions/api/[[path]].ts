interface Env {
  API: Fetcher;
}

/**
 * Keep browser API requests on the Pages origin while reaching the API Worker
 * through Cloudflare's private service binding.
 */
export const onRequest: PagesFunction<Env> = ({ request, env }) => env.API.fetch(request);
