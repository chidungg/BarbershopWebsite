import "dotenv/config";

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value.trim();
}

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("PORT must be a positive integer");
}

export const env = {
  port,

  frontendUrl:
    process.env.FRONTEND_URL ?? "http://localhost:5173",

  supabaseUrl: getRequiredEnvironmentVariable(
    "SUPABASE_URL"
  ),

  supabasePublishableKey:
    getRequiredEnvironmentVariable(
      "SUPABASE_PUBLISHABLE_KEY"
    )
};