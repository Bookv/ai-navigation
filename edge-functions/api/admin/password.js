const ADMIN_PASSWORD_KEY = "nav_admin_password";
const ADMIN_DEFAULT_KEY = "nav_admin_default";

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

const readBody = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

export async function onRequest({ request }) {
  try {
    if (request.method.toUpperCase() !== "POST") {
      return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
    }

    const body = await readBody(request);
    const oldPassword = body?.oldPassword ?? "";
    const newPassword = body?.newPassword ?? "";

    if (newPassword.length < 6) {
      return jsonResponse({ error: "PASSWORD_TOO_SHORT" }, 400);
    }

    const stored = await nav.get(ADMIN_PASSWORD_KEY);
    if (!stored) {
      return jsonResponse({ error: "PASSWORD_NOT_SET" }, 428);
    }

    if (!oldPassword || oldPassword !== stored) {
      return jsonResponse({ error: "INVALID_PASSWORD" }, 401);
    }

    await nav.put(ADMIN_PASSWORD_KEY, newPassword);
    await nav.put(ADMIN_DEFAULT_KEY, "0");

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse(
      { error: "KV_ERROR", message: error?.message ?? String(error) },
      500
    );
  }
}