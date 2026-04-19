export { EncounterConversation } from "./EncounterConversation";
export type {
  EncounterConversationProps,
  EncounterConversationHandle,
} from "./EncounterConversation";

export { ConversationTabs } from "./ConversationTabs";
export { ChatTranscript } from "./ChatTranscript";
export { TextInputPanel } from "./TextInputPanel";
export { VoiceInputPanel } from "./VoiceInputPanel";
export { SpeakingIndicator } from "./SpeakingIndicator";

export { useEncounterConversation } from "./hooks/useEncounterConversation";
export type {
  UseEncounterConversationArgs,
  UseEncounterConversationReturn,
  SendMessageOptions,
} from "./hooks/useEncounterConversation";

export { useVoiceConversation } from "./hooks/useVoiceConversation";
export type {
  UseVoiceConversationArgs,
  UseVoiceConversationReturn,
  VoiceSttMode,
} from "./hooks/useVoiceConversation";

export { useSpeechRecognition } from "./hooks/useSpeechRecognition";
export { useEncounterAudio } from "./hooks/useEncounterAudio";
export { useMediaRecorder } from "./hooks/useMediaRecorder";

export type {
  EncounterBackend,
  EncounterMessage,
  EncounterMode,
  EncounterRole,
  EncounterStatus,
  DiscoveredFact,
  DiscoveredFactKind,
  NormalizedReply,
} from "./lib/types";
