const API_URL = import.meta.env.VITE_API_URL;

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let data: unknown = null;

  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Server returned an invalid response (${response.status}).`
      );
    }
  }

  if (!response.ok) {
    const errorData = data as
      | {
          error?: string;
          message?: string;
        }
      | null;

    throw new Error(
      errorData?.error ||
        errorData?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data as T;
}