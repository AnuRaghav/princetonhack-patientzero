# `<EncounterConversation>`

The reusable patient-encounter UI for the standardized-patient simulation. One
component, two interaction modes (text + voice), one shared session state.
Drop it into any page that needs the player to talk to a patient.

```tsx
import { EncounterConversation } from "@/components/encounter";

<EncounterConversation sessionId={sessionId} />
```

That's the whole minimum-viable usage. You get:

- Polished chatbot transcript with bubbles, auto-scroll, typing indicator.
- ChatGPT-style voice mode with mic button, status caption, live partials, and
  ElevenLabs audio playback.
- Switching tabs never resets anything - same transcript, same status, same
  pending audio across modes.
- Persistence to Supabase (when using the `chat` backend).
- Discovered facts surfaced via callback for the 3D avatar / scoring layer.
- Auto-fallback STT that works on restricted networks.

---

## Pick a backend first

This is the most important decision.

| `backend` | Endpoint | Persistence | Returns | Use when |
|---|---|---|---|---|
| `"chat"` *(default)* | `POST /api/chat` | Writes every turn to Supabase via `sessionId` | Reply text **+ revealed facts + findings projection + optional TTS** | Real game session: leaderboard, scoring, fact reveals driving the avatar. **Requires** a row to already exist in `sessions` with this uuid. |
| `"converse"` | `POST /api/patient/converse` | None - stateless | Reply text + optional TTS | One-off chats, sandboxes, demos, curated case previews. `sessionId` becomes the logical key + fallback patient id. |

Only the `chat` backend produces `DiscoveredFact[]` - `converse` always returns
an empty array.

---

## Common patterns

### 1. Real game session (chat backend)

Create the session row server-side first, then route to a page that owns the
uuid:

```tsx
"use client";

import { EncounterConversation } from "@/components/encounter";

export default function CasePage({ params }: { params: { sessionId: string } }) {
  return (
    <EncounterConversation
      sessionId={params.sessionId}
      title="Mr. Johnson, 58yo · Chest pain"
      modeDefault="text"
    />
  );
}
```

The component will hydrate any prior transcript on mount via `/api/sessions/[id]`.

### 2. Stateless sandbox (converse backend)

```tsx
<EncounterConversation
  sessionId="sandbox-1"
  backend="converse"
  patientId="synthea-patient-uuid"
  initialGreeting="Hi doctor, I've been having chest pain since this morning."
  modeDefault="voice"
  disableHydration
/>
```

`disableHydration` skips the `/api/sessions/...` GET (no row exists).

### 3. Force server-side STT (restricted network)

Use this when you know your venue's wifi blocks Chrome's speech servers (e.g.
campus / corp / hackathon networks):

```tsx
<EncounterConversation
  sessionId={sessionId}
  voiceSttMode="server"
/>
```

### 4. Hooking into the gameplay loop

```tsx
<EncounterConversation
  sessionId={sessionId}
  onAssistantReply={(msg, { audioUrl, ttsError }) => {
    if (ttsError) toast.error(`Voice unavailable: ${ttsError}`);
    void refresh(); // re-pull server state for scoring panel, etc.
  }}
  onDiscoveredFactsChange={(facts) => {
    // Cumulative list. Diff against your prior copy to find new reveals
    // to flash in the UI / animate on the 3D model.
    setKnownFacts(facts);
  }}
  onTranscriptChange={(messages) => {
    // Fires on every append. Cheap.
  }}
/>
```

For a complete in-tree example with all callbacks wired, see
`app/sim/[sessionId]/page.tsx`.

---

## Full props reference

```ts
type EncounterConversationProps = {
  sessionId: string;                       // required
  backend?: "chat" | "converse";           // default "chat"
  patientId?: string;                      // converse-only; falls back to sessionId
  modeDefault?: "text" | "voice";          // default "text"
  initialGreeting?: string;                // patient's first line, no API call
  initialMessages?: EncounterMessage[];    // pre-seed transcript instead of hydrating
  disableHydration?: boolean;              // skip auto-fetch from /api/sessions
  systemPrompt?: string;                   // displayed in collapsible "Patient context"
  patientContext?: string;                 // ditto - display only for now
  voiceId?: string;                        // reserved (ElevenLabs voice override)
  voiceSttMode?: "auto" | "browser" | "server";  // default "auto"
  title?: string;                          // panel header (default "Patient encounter")
  className?: string;

  onTranscriptChange?: (messages: EncounterMessage[]) => void;
  onDiscoveredFactsChange?: (facts: DiscoveredFact[]) => void;
  onAssistantReply?: (
    msg: EncounterMessage,
    meta: { audioUrl: string | null; ttsError?: string },
  ) => void;
};
```

### Callback payloads

```ts
type EncounterMessage = {
  id: string;
  role: "patient" | "clinician" | "system";
  text: string;
  source: "text" | "voice";
  createdAt: number;          // ms epoch
  audioUrl?: string | null;
};

type DiscoveredFact = {
  key: string;                // stable id from the curated case findings list
  kind: "observation" | "diagnosis" | "other";
  text: string;
  discoveredAt: number;       // ms epoch
};
```

---

## Voice transport (`voiceSttMode`)

| Mode | Behavior |
|---|---|
| `"auto"` *(default)* | Tries browser Web Speech first (low latency, live partials). On `network` error, transparently switches to MediaRecorder + `/api/voice/stt` (ElevenLabs Scribe) for the rest of the session. The mic hint adapts. |
| `"server"` | Skip Web Speech entirely. MediaRecorder + ElevenLabs Scribe. One tap to start, one tap to stop. Works on any network with mic permission. No live partials. |
| `"browser"` | Chrome/Edge only, no fallback. Good for local dev. |

ElevenLabs Scribe is invoked via `POST /api/voice/stt` (multipart form upload).
Requires `ELEVENLABS_API_KEY` in `.env.local`.

---

## Status state machine

The component tracks one of these statuses across both modes:

```
idle → listening → transcribing → thinking → speaking → idle
                                          ↘ idle (no TTS)
                          ↘ error / paused (interrupt)
```

Surfaced via the `SpeakingIndicator` and the voice panel caption. You don't
need to drive this yourself.

---

## Building a custom shell

If you want a totally different look (voice-only kiosk, no tabs, side-panel
layout, etc.) but the same brain, the hooks and subcomponents are exported
separately:

```ts
import {
  useEncounterConversation,
  useVoiceConversation,
  useSpeechRecognition,
  useEncounterAudio,
  useMediaRecorder,
  ChatTranscript,
  TextInputPanel,
  VoiceInputPanel,
  ConversationTabs,
  SpeakingIndicator,
} from "@/components/encounter";
```

The composition pattern:

```tsx
const conversation = useEncounterConversation({
  backend: "chat",
  sessionId,
  initialGreeting: "...",
  onAssistantReply: handleReply,
});

const voice = useVoiceConversation({ conversation, sttMode: "auto" });

return (
  <>
    <ChatTranscript
      messages={conversation.messages}
      status={conversation.status}
      pendingPartial={conversation.pendingPartial}
    />
    <VoiceInputPanel
      status={conversation.status}
      isListening={voice.isListening}
      isSpeaking={voice.isSpeaking}
      isSupported={voice.isSupported}
      pendingPartial={conversation.pendingPartial}
      onStart={voice.startListening}
      onStop={voice.stopListening}
      onInterrupt={voice.interrupt}
      transport={voice.activeSttTransport}
    />
    <audio ref={voice.audioRef} className="hidden" />
  </>
);
```

`EncounterConversation.tsx` itself is just ~120 lines of glue around these.

---

## Architecture map

```
EncounterConversation                    ← main exported component
├── ConversationTabs                     ← Text / Voice toggle
├── ChatTranscript                       ← message bubbles + auto-scroll + partial
├── TextInputPanel                       ← textarea + send button
├── VoiceInputPanel                      ← mic UI + status caption
├── SpeakingIndicator                    ← animated dots
│
├── useEncounterConversation             ← single source of truth
│   ├── messages, status, facts, pending audio
│   ├── sendMessage / commitPartial / interrupt / reset
│   └── transcript hydration (chat backend)
│
├── useVoiceConversation                 ← orchestrates STT + TTS
│   ├── useSpeechRecognition             ← browser Web Speech wrapper
│   ├── useMediaRecorder                 ← MediaRecorder wrapper
│   └── useEncounterAudio                ← <audio> element manager
│
└── lib/encounterClient.ts               ← /api/chat + /api/patient/converse adapter
    └── lib/factMapping.ts               ← merges chat reveals into stable DiscoveredFact[]
```

---

## Server contract

| Route | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | Send turn, get reply + facts + optional TTS data URL |
| `/api/patient/converse` | POST | Stateless turn, get reply + optional TTS data URL |
| `/api/sessions/[id]` | GET | Hydrate persisted transcript (chat backend only) |
| `/api/voice/stt` | POST | Multipart audio upload → ElevenLabs Scribe → text |

All TTS audio comes back as `data:audio/mpeg;base64,...` data URLs and is
played back via a `Blob`-URL conversion (handled inside `useEncounterAudio`).

---

## Required env

```bash
GEMINI_API_KEY=...                # patient persona model
ELEVENLABS_API_KEY=...            # TTS + server-side STT
ELEVENLABS_VOICE_ID=...           # optional; defaults to a baked-in voice
ELEVENLABS_STT_MODEL_ID=scribe_v1 # optional; default scribe_v1
```

Browsers also need:
- HTTPS or `localhost` for `getUserMedia` (mic).
- Chrome/Edge for browser Web Speech (or use `voiceSttMode="server"`).
