"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronRight, UserRound } from "lucide-react";
import type { ConversationDto, StageDto } from "@/lib/types";
import { cn, formatPhone } from "@/lib/utils";
import { ContactAvatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const HANDOFF_LABELS: Record<string, string> = {
  cliente: "El cliente pidió un humano",
  modelo: "El agente decidió escalar",
  error: "Error del proveedor de IA",
  ventana: "Ventana de 24h cerrada",
};

export function ContactPanel({
  conversation,
  onPatchConversation,
  onClose,
}: {
  conversation: ConversationDto;
  onPatchConversation: (patch: {
    aiEnabled?: boolean;
    reactivate?: boolean;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [stages, setStages] = useState<StageDto[]>([]);
  const [currentStageId, setCurrentStageId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);

  const contactId = conversation.contact.id;

  const refetch = useCallback(async () => {
    const [detail, stagesRes] = await Promise.all([
      fetch(`/api/contacts/${contactId}`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/pipeline/stages").then((r) => (r.ok ? r.json() : null)),
    ]).catch(() => [null, null]);
    if (detail) {
      setNotes(detail.contact?.notes ?? "");
      setCurrentStageId(detail.stage?.id ?? null);
      setLeadId(detail.lead?.id ?? null);
    }
    if (stagesRes) setStages(stagesRes.stages);
    setNotesLoaded(true);
  }, [contactId]);

  useEffect(() => {
    setNotesLoaded(false);
    void refetch();
  }, [refetch]);

  async function moveToStage(stageId: string) {
    if (!leadId || stageId === currentStageId) return;
    setCurrentStageId(stageId); // optimista
    await fetch(`/api/pipeline/leads/${leadId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stageId, position: 0 }),
    }).catch(() => null);
    void refetch();
  }

  async function saveNotes() {
    setSavingNotes(true);
    await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes }),
    }).catch(() => null);
    setSavingNotes(false);
  }

  const currentIndex = stages.findIndex((s) => s.id === currentStageId);

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 flex items-center justify-between border-b bg-background px-4 py-3">
        <h3 className="text-[13px] font-[650] uppercase tracking-wide text-text-2">
          Detalles
        </h3>
        <button
          onClick={onClose}
          aria-label="Ocultar panel"
          className="rounded p-1 text-text-3 hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.7} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Contacto */}
        <section className="border-b p-4">
          <div className="flex items-center gap-3">
            <ContactAvatar
              name={conversation.contact.name}
              seed={conversation.contact.id}
              size="md"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-[650]">
                {conversation.contact.name}
              </p>
              <p className="text-xs text-text-3">
                {formatPhone(conversation.contact.phone)}
              </p>
            </div>
          </div>

          {conversation.handoffAt && (
            <div className="mt-3 rounded-md border border-[#ece2cf] bg-[#faf7f0] p-3">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-[#8a6d3b]">
                <UserRound className="h-4 w-4" strokeWidth={1.7} /> Atención humana
              </p>
              <p className="mt-1 text-xs text-[#8a6d3b]/80">
                {HANDOFF_LABELS[conversation.handoffReason ?? ""] ??
                  "La IA está en pausa en esta conversación."}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                onClick={() => void onPatchConversation({ reactivate: true })}
              >
                Reactivar IA
              </Button>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between rounded-md border bg-secondary/50 px-3 py-2.5">
            <div>
              <p className="text-[13px] font-medium">IA en esta conversación</p>
              <p className="text-[11px] text-text-3">
                {conversation.aiEnabled ? "Respondiendo" : "En pausa"}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={conversation.aiEnabled}
              aria-label="IA en esta conversación"
              onClick={() =>
                void onPatchConversation({ aiEnabled: !conversation.aiEnabled })
              }
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                conversation.aiEnabled ? "bg-brand" : "bg-border-strong"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  conversation.aiEnabled ? "translate-x-[18px]" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
        </section>

        {/* Stepper de etapa */}
        {stages.length > 0 && leadId && (
          <section className="border-b p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-3">
              Etapa del pipeline
            </p>
            <ol>
              {stages.map((s, i) => {
                const done = currentIndex >= 0 && i < currentIndex;
                const current = s.id === currentStageId;
                return (
                  <li key={s.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < stages.length - 1 && (
                      <span
                        className={cn(
                          "absolute left-[7px] top-4 h-full w-px",
                          done ? "bg-brand" : "bg-border-strong"
                        )}
                      />
                    )}
                    <button
                      onClick={() => void moveToStage(s.id)}
                      aria-label={`Mover a ${s.name}`}
                      className={cn(
                        "relative z-10 mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full transition-colors",
                        done && "bg-brand text-white",
                        current && "bg-brand ring-4 ring-brand-soft",
                        !done && !current && "border border-border-strong bg-background hover:border-brand"
                      )}
                    >
                      {done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                    </button>
                    <button
                      onClick={() => void moveToStage(s.id)}
                      className={cn(
                        "text-left text-[13px]",
                        current ? "font-[650] text-brand-text" : "text-text-2 hover:text-foreground"
                      )}
                    >
                      {s.name}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Notas */}
        <section className="p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-3">
            Notas
          </p>
          <Textarea
            rows={5}
            placeholder="Notas internas sobre este contacto…"
            value={notes}
            disabled={!notesLoaded}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button
            size="sm"
            variant="secondary"
            className="mt-2"
            disabled={savingNotes || !notesLoaded}
            onClick={() => void saveNotes()}
          >
            {savingNotes ? "Guardando…" : "Guardar notas"}
          </Button>
        </section>
      </div>
    </div>
  );
}
