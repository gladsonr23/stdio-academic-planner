const runtime = globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }

export const env = runtime.process?.env ?? {}
