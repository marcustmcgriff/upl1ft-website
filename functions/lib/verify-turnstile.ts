export async function verifyTurnstileToken(
  token: string,
  secretKey: string,
  ip?: string | null
): Promise<boolean> {
  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (ip) formData.append("remoteip", ip);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      }
    );

    const result = (await res.json()) as { success: boolean };
    return result.success;
  } catch {
    return false;
  }
}
