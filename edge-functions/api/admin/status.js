const ADMIN_PASSWORD_KEY = "nav_admin_password";
const ADMIN_DEFAULT_KEY = "nav_admin_default";

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

const KV_NAME = "nav";
const getKv = (env) => env?.[KV_NAME] ?? env?.nav ?? env?.NAV ?? globalThis?.[KV_NAME] ?? globalThis?.nav ?? globalThis?.NAV;

const hasKv = (kv) => kv && typeof kv.get === "function" && typeof kv.put === "function";

const generatePassword = () => {
  try {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const length = 10;
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
  } catch {
    return null;
  }
};

export async function onRequest({ env }) {
  try {
    const kv = getKv(env);
    if (!hasKv(kv)) {
      return jsonResponse({ error: "KV_NOT_BOUND" }, 503);
    }

    let password = await kv.get(ADMIN_PASSWORD_KEY);
    let isDefault = (await kv.get(ADMIN_DEFAULT_KEY)) === "1";
    let bootstrapPassword = "";

    if (!password) {
      password = generatePassword() ?? "123456";
      isDefault = password === "123456";
      await kv.put(ADMIN_PASSWORD_KEY, password);
      await kv.put(ADMIN_DEFAULT_KEY, isDefault ? "1" : "0");
      bootstrapPassword = password;
    }

    const response = {
      hasPassword: true,
      isDefault
    };

    if (bootstrapPassword) {
      response.bootstrapPassword = bootstrapPassword;
    }

    return jsonResponse(response);
  } catch (error) {
    return jsonResponse(
      { error: "INTERNAL_ERROR", message: error?.message ?? String(error) },
      500
    );
  }
}