import type { WebhookValue } from "@/server/inbox/webhook";

/**
 * Evento `message_template_status_update` (llega a nivel WABA: se enruta por
 * entry.id). La lógica de plantillas se completa en la fase US6; los eventos
 * de instancias sin plantillas se ignoran sin error.
 */
export async function processTemplateStatusValue(
  _wabaId: string | null,
  _value: WebhookValue
): Promise<void> {
  // Implementado en US6 (server/whatsapp/templates.ts).
}
