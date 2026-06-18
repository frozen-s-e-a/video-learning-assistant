export async function analyzeFrame({ backendUrl, accessToken, payload, fetchImpl = fetch }) {
  const response = await fetchImpl(`${backendUrl.replace(/\/$/, "")}/api/analyze-frame`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  if (!response.ok) {
    const message = body?.error?.message || "Backend request failed";
    throw new Error(message);
  }
  return body;
}
