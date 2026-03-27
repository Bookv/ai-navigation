const ADMIN_PASSWORD_KEY = "nav_admin_password";
const ADMIN_DEFAULT_KEY = "nav_admin_default";

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

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

export async function onRequest() {
  try {
    let password = await nav.get(ADMIN_PASSWORD_KEY);
    let isDefault = (await nav.get(ADMIN_DEFAULT_KEY)) === "1";
    let bootstrapPassword = "";

    if (!password) {
      password = generatePassword() ?? "123456";
      isDefault = password === "123456";
      await nav.put(ADMIN_PASSWORD_KEY, password);
      await nav.put(ADMIN_DEFAULT_KEY, isDefault ? "1" : "0");
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
      { error: "KV_ERROR", message: error?.message ?? String(error) },
      500
    );
  }
}