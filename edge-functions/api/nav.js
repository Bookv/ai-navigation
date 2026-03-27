const NAV_CONFIG_KEY = "nav_config";
const ADMIN_PASSWORD_KEY = "nav_admin_password";

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

const KV_NAME = "nav";
const getKv = (env) => env?.[KV_NAME] ?? env?.nav ?? env?.NAV ?? globalThis?.[KV_NAME] ?? globalThis?.nav ?? globalThis?.NAV;

const hasKv = (kv) => kv && typeof kv.get === "function" && typeof kv.put === "function";

const readBody = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

export async function onRequest({ request, env }) {
  try {
    const kv = getKv(env);
    if (!hasKv(kv)) {
      return jsonResponse({ error: "KV_NOT_BOUND" }, 503);
    }

    const method = request.method.toUpperCase();

    if (method === "GET") {
      const raw = await kv.get(NAV_CONFIG_KEY);
      if (!raw) {
        return jsonResponse({ error: "NOT_FOUND" }, 404);
      }
      return new Response(raw, {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }

    if (method === "PUT") {
      const password = request.headers.get("X-Admin-Password") ?? "";
      if (!password) {
        return jsonResponse({ error: "MISSING_PASSWORD" }, 401);
      }

      const stored = await kv.get(ADMIN_PASSWORD_KEY);
      if (!stored) {
        return jsonResponse({ error: "PASSWORD_NOT_SET" }, 428);
      }

      if (stored !== password) {
        return jsonResponse({ error: "INVALID_PASSWORD" }, 403);
      }

      const body = await readBody(request);
      if (!body || typeof body !== "object") {
        return jsonResponse({ error: "INVALID_BODY" }, 400);
      }

      await kv.put(NAV_CONFIG_KEY, JSON.stringify(body));
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  } catch (error) {
    return jsonResponse(
      { error: "INTERNAL_ERROR", message: error?.message ?? String(error) },
      500
    );
  }
}