/**
 * Punto de enganche del turno del agente tras la ingesta de un mensaje
 * entrante. La lógica real (coalesce + lock + pipeline) vive en
 * server/ai/pipeline y se conecta en la fase del agente (US3).
 */
export async function maybeRunAgentTurn(
  _conversationId: string
): Promise<void> {
  // Conectado en US3 (src/server/ai/pipeline.ts).
}
