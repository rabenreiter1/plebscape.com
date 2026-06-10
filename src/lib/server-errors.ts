export function logApiError(context: string, error: unknown) {
  if (error instanceof Error) {
    console.error(`[${context}] ${error.name}: ${error.message}`, {
      stack: error.stack
    });
    return;
  }

  console.error(`[${context}] Unknown error`, { error });
}
