export function logApiError(context: string, error: unknown) {
  console.error(`[${context}]`, serializeError(error));
}

function serializeError(error: unknown): unknown {
  if (!(error instanceof Error)) {
    return { error };
  }

  const withCause = error as Error & {
    cause?: unknown;
    code?: string;
  };

  return {
    name: error.name,
    message: error.message,
    code: withCause.code,
    cause: withCause.cause ? serializeError(withCause.cause) : undefined,
    stack: error.stack
  };
}
