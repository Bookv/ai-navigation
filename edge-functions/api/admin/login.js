const ADMIN_PASSWORD_KEY = "nav_admin_password";

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

const getKv = (env) => env?.nav ?? globalThis.nav;

const readBody = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

export async function onRequest({ request, env }) {
  const kv = getKv(env);
  if (!kv) {
    return jsonResponse({ error: "KV_NOT_BOUND" }, 503);
  }

  if (request.method.toUpperCase() !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const body = await readBody(request);
  const password = body?.password ?? "";
  const stored = await kv.get(ADMIN_PASSWORD_KEY);

  if (!stored) {
    return jsonResponse({ error: "PASSWORD_NOT_SET" }, 428);
  }

  if (!password || password !== stored) {
    return jsonResponse({ error: "INVALID_PASSWORD" }, 401);
  }

  return jsonResponse({ ok: true });
}