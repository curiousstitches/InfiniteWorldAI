// client/src/hooks/useVoice.js
// Voice loop:
//   1. STT  → invokeSTT cascade (Web Speech first; falls back to server)
//   2. /api/interact → server runs GM + TaskGen + persists state, returns world update + scene context
//   3. Companion runs CLIENT-SIDE (Q1-A: Puter first) with the personality system prompt
//   4. TTS plays via invokeTTS cascade (ElevenLabs → Puter → Web Speech)
//   5. Hidden <state .../> tag from companion updates mood/affection/trust live.

import { useRef, useCallback } from 'react';
import { useGameStore, useWorldStore } from '../store/worldStore.js';
import { useLifeSim } from '../store/lifeSimStore.js';
import { recordPlayerMessage, updateSummary, memoryPreamble } from '../services/companionMemory.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { invokeChat, invokeTTS, invokeSTT } from '../providers/router.js';
import { buildSystemPrompt, parseHiddenState } from '../personality/promptBuilder.js';
import { createWebSpeechSTT, webSpeechSTTAvailable } from '../services/webSpeech.js';

const API = '/api';

export const useVoice = () => {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const recRef           = useRef(null);
  const conversationRef  = useRef([]);   // last N exchanges, in OpenAI chat format

  const { setListening, setSpeaking, setSubtitles } = useGameStore();
  const { worldId, world, applyInteractUpdate } = useWorldStore();

  // Pull settings reactively (so changes take effect mid-session).
  const getSettings = () => useSettingsStore.getState();
  const applyStateDelta = useSettingsStore.getState().applyStateDelta;

  const playLocalTTS = useCallback(async (text) => {
    setSpeaking(true);
    try {
      await invokeTTS({ text, settings: getSettings(), onEnd: () => setSpeaking(false) });
    } catch (e) {
      console.warn('[tts] all providers failed:', e);
      setSpeaking(false);
    }
  }, [setSpeaking]);

  const runCompanion = useCallback(async (playerText, sceneCtx) => {
    const settings = getSettings();
    const personality = settings.personality;
    const recent = conversationRef.current.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
    let systemPrompt = buildSystemPrompt(personality, { scene: sceneCtx, recent });

    // Long-term memory: record what the player said + recall what we know about them.
    try {
      const wid = useWorldStore.getState().worldId;
      if (wid) {
        recordPlayerMessage(wid, playerText);
        systemPrompt += memoryPreamble(wid);
      }
    } catch {}

    // Inject live life-sim state so the companion's mood/needs color its dialogue.
    try {
      const ls = useLifeSim.getState();
      systemPrompt += `\n\n— Your current state (let it subtly color your tone, don't list it) —` +
        `\nMood: ${ls.moodLabel()}. Bond level ${ls.bond}. ` +
        `Hunger ${Math.round(ls.hunger)}/100, energy ${Math.round(ls.energy)}/100, happiness ${Math.round(ls.happiness)}/100. ` +
        `Affection ${Math.round(ls.affection)}/100, trust ${Math.round(ls.trust)}/100.` +
        `\nIf you're hungry or tired, hint at it. If affection/trust are high, be warmer. If low, be more guarded.`;
    } catch {}

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationRef.current.slice(-10),
      { role: 'user', content: playerText }
    ];

    let result;
    const gs = useGameStore.getState();
    gs.setThinking(true);
    try {
      result = await invokeChat('companion', { messages, temperature: 0.9, max_tokens: 220, settings });
    } catch (e) {
      console.error('[companion] no provider succeeded:', e);
      gs.setThinking(false);
      setSubtitles('(...)');
      return null;
    }
    gs.setThinking(false);

    const { mood, affectionDelta, trustDelta, gesture, cleaned } = parseHiddenState(result.text);
    if (mood || affectionDelta || trustDelta) applyStateDelta({ mood, affectionDelta, trustDelta });
    // Conversation also nudges the life-sim relationship stats.
    try {
      const ls = useLifeSim.getState();
      if (affectionDelta || trustDelta) {
        ls.rewardWin && useLifeSim.setState((s) => ({
          affection: Math.max(0, Math.min(100, s.affection + (affectionDelta || 0))),
          trust: Math.max(0, Math.min(100, s.trust + (trustDelta || 0))),
        }));
      }
    } catch {}
    // Fire the procedural gesture (turn + motion) on the 3D companion.
    useGameStore.getState().triggerGesture(gesture || 'idle');

    // Fold this exchange into long-term memory.
    try {
      const wid = useWorldStore.getState().worldId;
      if (wid) updateSummary(wid, playerText, cleaned);
    } catch {}

    conversationRef.current.push({ role: 'user', content: playerText });
    conversationRef.current.push({ role: 'assistant', content: cleaned });

    setSubtitles(cleaned);
    playLocalTTS(cleaned);
    return { text: cleaned, providerId: result.providerId };
  }, [setSubtitles, applyStateDelta, playLocalTTS]);

  const dispatchPlayerInput = useCallback(async (transcript) => {
    if (!worldId || !transcript?.trim()) return;
    setSubtitles(`▸ ${transcript}`);

    const settings = getSettings();

    // Kick off the world update (GM + tasks) and the companion reply IN PARALLEL.
    // The companion no longer waits for the server round-trip, so replies feel fast;
    // the world state catches up a moment later. This is the main latency fix.
    const sceneCtxNow = `Biome: ${world?.biome || 'unknown'}. Scale: ${world?.scale || 'HUMAN'}.`;
    const companionPromise = runCompanion(transcript, sceneCtxNow);

    const worldPromise = fetch(`${API}/interact/${worldId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        playerInput: transcript,
        providerPicks: { gm: settings.providerPicks.gm, taskgen: settings.providerPicks.taskgen },
        personality: settings.personality,
        skipCompanion: true,
        skipAudio: true,
      }),
    }).then(res => res.ok ? res.json() : null)
      .then(update => { if (update) applyInteractUpdate(update); })
      .catch(e => console.warn('[interact] world update skipped', e));

    await Promise.allSettled([companionPromise, worldPromise]);
  }, [worldId, world, setSubtitles, applyInteractUpdate, runCompanion]);

  // ── Public: push-to-talk loop ──
  const startListening = useCallback(async () => {
    if (!worldId) return;
    const settings = getSettings();
    const sttPick = settings.providerPicks.stt;

    // Web Speech path — live STT, no blob roundtrip.
    if (sttPick === 'browser:webspeech' && webSpeechSTTAvailable()) {
      const rec = createWebSpeechSTT({
        interimResults: true,
        onResult: ({ final, interim }) => {
          if (interim) setSubtitles(`▸ ${interim}…`);
          if (final.trim()) {
            rec.stop();
            dispatchPlayerInput(final.trim());
          }
        },
        onEnd: () => setListening(false),
        onError: () => setListening(false)
      });
      recRef.current = rec;
      rec.start();
      setListening(true);
      return;
    }

    // Blob path — for Groq Whisper / Puter / server STT.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      audioChunksRef.current = [];
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setListening(false);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          const { text } = await invokeSTT({ blob, settings: getSettings() });
          if (text?.trim()) dispatchPlayerInput(text.trim());
        } catch (e) {
          console.error('[stt] failed:', e);
        }
      };
      mr.start();
      setListening(true);
    } catch (err) {
      console.error('Mic error:', err);
      setListening(false);
    }
  }, [worldId, setListening, setSubtitles, dispatchPlayerInput]);

  const stopListening = useCallback(() => {
    if (recRef.current) { try { recRef.current.stop(); } catch {} recRef.current = null; }
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    setListening(false);
  }, [setListening]);

  const sendTextInput = useCallback(async (text) => {
    if (!text?.trim()) return;
    await dispatchPlayerInput(text.trim());
  }, [dispatchPlayerInput]);

  const interrupt = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [setSpeaking]);

  return { startListening, stopListening, sendTextInput, interrupt };
};
