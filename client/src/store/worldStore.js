import { create } from 'zustand';

export const useWorldStore = create((set, get) => ({
  worldId: null,
  world: null,
  character: null,
  interactables: [],
  activeTasks: [],
  environmentNarrative: '',
  lastCompanion: null,
  isLoading: false,
  error: null,

  setWorld: (world) => set({ world, worldId: world?.id }),
  setCharacter: (character) => set({ character }),
  setInteractables: (interactables) => set({ interactables }),
  setActiveTasks: (activeTasks) => set({ activeTasks }),

  applyInteractUpdate: (data) => set({
    interactables: data.interactables || get().interactables,
    activeTasks: data.activeTasks || get().activeTasks,
    environmentNarrative: data.environmentNarrative || '',
    lastCompanion: data.companion || null,
    world: data.worldState ? { ...get().world, ...data.worldState } : get().world,
  }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ worldId: null, world: null, character: null, interactables: [], activeTasks: [] }),
}));

export const useGameStore = create((set) => ({
  phase: 'home', // home | character_creation | playing | deletion_modal
  creatorConversation: [],
  partialProfile: {},
  wsConnection: null,
  characterModelUrl: null,
  modelStatus: 'pending', // pending | processing | ready | fallback
  isSpeaking: false,
  isListening: false,
  isThinking: false,
  subtitles: '',
  companionGesture: null,   // { action, tick } — tick lets the same action retrigger
  gestureTick: 0,
  startMode: 'new',         // 'amnesia' | 'surprise' | 'new' | 'continue' — drives waking intro
  avatarFallback: false,    // true when the realistic avatar failed and we used the simple figure

  setPhase: (phase) => set({ phase }),
  setCreatorConversation: (creatorConversation) => set({ creatorConversation }),
  setPartialProfile: (partialProfile) => set({ partialProfile }),
  setWsConnection: (wsConnection) => set({ wsConnection }),
  setCharacterModelUrl: (url) => set({ characterModelUrl: url }),
  setModelStatus: (modelStatus) => set({ modelStatus }),
  setSpeaking: (isSpeaking) => set({ isSpeaking }),
  setThinking: (isThinking) => set({ isThinking }),
  setListening: (isListening) => set({ isListening }),
  setSubtitles: (subtitles) => set({ subtitles }),
  triggerGesture: (action) => set(s => ({ companionGesture: action, gestureTick: s.gestureTick + 1 })),
  setStartMode: (startMode) => set({ startMode }),
  setAvatarFallback: (avatarFallback) => set({ avatarFallback }),
}));
