interface Env {
  API: Fetcher;
}

/** Forward API requests from the web Worker to the private API Worker. */
export default {
  fetch: (request, env) => env.API.fetch(request),
} satisfies ExportedHandler<Env>;
