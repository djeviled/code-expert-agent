import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Placeholder IDs - replace with actual values from your Anthropic dashboard
const AGENT_ID = process.env.ANTHROPIC_AGENT_ID || "your_agent_id_here";
const ENVIRONMENT_ID = process.env.ANTHROPIC_ENVIRONMENT_ID || "your_env_id_here";
const VAULT_ID = process.env.ANTHROPIC_VAULT_ID || "vlt_011CaQM8ftU1AKej6zkVxchA";

export interface SessionInfo {
  sessionId: string;
  userEmail: string;
}

/**
 * Creates a new session for a user with the Code Expert Agent.
 * The agent will load user context from Supabase and greet them.
 */
export async function createSession(userEmail: string): Promise<string> {
  const session = await client.beta.sessions.create(
    {
      agent: AGENT_ID,
      environment_id: ENVIRONMENT_ID,
      vault_ids: [VAULT_ID],
      title: `Session for ${userEmail}`,
    },
    { headers: { "anthropic-beta": "managed-agents-2026-04-01" } }
  );

  // Send opening message so agent loads context from Supabase
  await client.beta.sessions.events.send(
    session.id,
    {
      events: [{
        type: "user.message",
        content: [{ type: "text", text: `My email is ${userEmail} — please load my context from Supabase and greet me.` }]
      }]
    },
    { headers: { "anthropic-beta": "managed-agents-2026-04-01" } }
  );

  return session.id;
}

/**
 * Streams events from an active session.
 */
export async function* streamSessionEvents(sessionId: string) {
  const stream = client.beta.sessions.events.stream(
    sessionId,
    {},
    { headers: { "anthropic-beta": "managed-agents-2026-04-01" } }
  );

  for await (const event of stream) {
    yield event;
    if (event.type === "session.status_idle") break;
  }
}

/**
 * Sends a follow-up message in an existing session.
 */
export async function sendMessage(sessionId: string, text: string): Promise<void> {
  await client.beta.sessions.events.send(
    sessionId,
    { events: [{ type: "user.message", content: [{ type: "text", text }] }] },
    { headers: { "anthropic-beta": "managed-agents-2026-04-01" } }
  );
}

/**
 * Full session lifecycle: create, stream responses, and return session ID.
 */
export async function startUserSession(userEmail: string): Promise<string> {
  const sessionId = await createSession(userEmail);
  return sessionId;
}

// Export client for direct use if needed
export { client };