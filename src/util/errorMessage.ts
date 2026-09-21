export function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return String(error);
}

// Includes the response body (JSON or text), not just Axios's generic HTTP message.
export function requestErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error && error.response && typeof error.response === "object") {
    const response = error.response as {status?: number; statusText?: string; data?: unknown};
    const data = response.data;
    let detail: string;
    if (typeof data === "string") detail = data;
    else if (data && typeof data === "object" && "error" in data && typeof data.error === "string") detail = data.error;
    else if (data && typeof data === "object" && "message" in data && typeof data.message === "string") detail = data.message;
    else detail = data == null ? errorMessage(error) : JSON.stringify(data);
    return [response.status ? `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}` : "", detail].filter(Boolean).join("\n");
  }
  return errorMessage(error);
}
