const ADMIN_PASSWORD_KEY = "nav_admin_password";
const ADMIN_DEFAULT_KEY = "nav_admin_default";

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

const getKv = (env) => env?.nav ?? env?.NAV ?? globalThis.nav ?? globalThis.NAV;

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

    if (request.method.toUpperCase() !== "POST") {
      return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
    }

    const body = await readBody(request);
    const oldPassword = body?.oldPassword ?? "";
    const newPassword = body?.newPassword ?? "";

    if (newPassword.length < 6) {
      return jsonResponse({ error: "PASSWORD_TOO_SHORT" }, 400);
    }

    const stored = await kv.get(ADMIN_PASSWORD_KEY);
    if (!stored) {
      return jsonResponse({ error: "PASSWORD_NOT_SET" }, 428);
    }

    if (!oldPassword || oldPassword !== stored) {
      return jsonResponse({ error: "INVALID_PASSWORD" }, 401);
    }

    await kv.put(ADMIN_PASSWORD_KEY, newPassword);
    await kv.put(ADMIN_DEFAULT_KEY, "0");

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse(
      { error: "INTERNAL_ERROR", message: error?.message ?? String(error) },
      500
    );
  }
}