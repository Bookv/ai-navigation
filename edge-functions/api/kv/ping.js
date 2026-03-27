const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

const getKv = (env) => env?.nav ?? env?.NAV ?? globalThis.nav ?? globalThis.NAV;

const hasKv = (kv) => kv && typeof kv.get === "function" && typeof kv.put === "function";

export async function onRequest({ env }) {
  const kv = getKv(env);
  const envKeys = env ? Object.keys(env) : [];

  const result = {
    envKeys,
    hasEnvNav: Boolean(env?.nav),
    hasEnvNAV: Boolean(env?.NAV),
    hasGlobalNav: Boolean(globalThis.nav),
    hasGlobalNAV: Boolean(globalThis.NAV),
    kvDetected: Boolean(kv),
    kvUsable: hasKv(kv)
  };

  if (!kv) {
    return jsonResponse({ ...result, error: "KV_NOT_BOUND" }, 503);
  }

  try {
    const value = await kv.get("__kv_ping__");
    return jsonResponse({ ...result, ping: "ok", sample: value ?? null });
  } catch (error) {
    return jsonResponse(
      {
        ...result,
        ping: "error",
        message: error?.message ?? String(error)
      },
      500
    );
  }
}