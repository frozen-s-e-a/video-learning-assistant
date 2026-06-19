export async function analyzeFrame({ backendUrl, accessToken, payload, fetchImpl = fetch }) {
  return postJson({
    url: `${backendUrl.replace(/\/$/, "")}/api/analyze-frame`,
    accessToken,
    payload,
    fetchImpl
  });
}

export async function sendFollowUp({ backendUrl, accessToken, payload, fetchImpl = fetch }) {
  return postJson({
    url: `${backendUrl.replace(/\/$/, "")}/api/follow-up`,
    accessToken,
    payload,
    fetchImpl
  });
}

async function postJson({ url, accessToken, payload, fetchImpl }) {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await readJson(response);
  if (!response.ok) {
    const message = body?.error?.message || body?.error || "Backend request failed";
    throw new Error(message);
  }
  return body;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
