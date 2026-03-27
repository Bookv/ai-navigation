const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

export async function onRequest({ request, params, env }) {
  try {
    const value = await nav.get("test");
    return jsonResponse({ ok: true, sample: value ?? null });
  } catch (error) {
    return jsonResponse(
      { error: "KV_ERROR", message: error?.message ?? String(error) },
      500
    );
  }
}
