interface Env {
  API?: Fetcher;
}

/** Forward API requests from the web Worker to the private API Worker. */
export default {
  fetch: (request, env) => {
    if (!env.API) {
      return Response.json(
        { error: 'API service is not available in this preview' },
        { status: 503, headers: { 'cache-control': 'no-store' } },
      );
    }

    return env.API.fetch(request);
  },
} satisfies ExportedHandler<Env>;
