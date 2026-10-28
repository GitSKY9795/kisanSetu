// BHASHINI's ASR pipeline expects 16kHz mono WAV/PCM. Capture PCM directly so the
// browser never has to decode a MediaRecorder-specific WebM/Opus blob.

const TARGET_SAMPLE_RATE = 16000;

function resampleTo16k(samples, sourceRate) {
  if (sourceRate === TARGET_SAMPLE_RATE) return samples;
  const ratio = sourceRate / TARGET_SAMPLE_RATE;
  const output = new Float32Array(Math.floor(samples.length / ratio));
  for (let i = 0; i < output.length; i++) {
    const sourceIndex = i * ratio;
    const lower = Math.floor(sourceIndex);
    const upper = Math.min(lower + 1, samples.length - 1);
    const fraction = sourceIndex - lower;
    output[i] = samples[lower] * (1 - fraction) + samples[upper] * fraction;
  }
  return output;
}

function pcmFloatToWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return window.btoa(binary);
}

/** Converts a recorded audio Blob (any browser-decodable format) into base64-encoded
 * 16kHz mono WAV, ready to send to BHASHINI's ASR pipeline. */
export async function blobToWavBase64(blob) {
  throw new Error("Compressed browser audio is not supported; use the PCM recorder.");
}

/** Wraps a microphone stream in a codec-independent PCM recorder that stays "warm"
 * across many start/stop cycles — the mic and AudioContext graph are wired up once
 * and left live for as long as voice mode is open, instead of being torn down and
 * re-requested (an async `getUserMedia` call, which can take a real, noticeable
 * moment for permission/device arbitration) on every single press of the record
 * button. Re-acquiring the mic per-recording meant a farmer who started talking the
 * instant they tapped the button was speaking before the pipeline had finished
 * wiring up — the beginning of their sentence (often everything but the last word)
 * was never captured, matching the "only captures the last word" symptom exactly.
 * Call `startCapture()`/`stopCapture()` per utterance, and `close()` once when done
 * with voice mode entirely (releases the mic and the AudioContext). */
export function createPcmRecorder(stream) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioCtx();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const silentGain = audioContext.createGain();
  silentGain.gain.value = 0;

  let chunks = [];
  let capturing = false;

  processor.onaudioprocess = (event) => {
    if (!capturing) return;
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  };
  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(audioContext.destination);

  return {
    stream,
    /** Begins buffering a fresh utterance. Synchronous — the mic/AudioContext graph
     * is already live, so capture starts on this exact call with no setup delay. */
    startCapture: () => {
      chunks = [];
      capturing = true;
    },
    /** Ends the current utterance and returns it as base64-encoded 16kHz mono WAV.
     * Leaves the mic/AudioContext running so the next `startCapture()` is instant too. */
    stopCapture: () => {
      capturing = false;
      const sourceSampleRate = audioContext.sampleRate;
      const sampleCount = chunks.reduce((total, chunk) => total + chunk.length, 0);
      const samples = new Float32Array(sampleCount);
      let offset = 0;
      chunks.forEach((chunk) => {
        samples.set(chunk, offset);
        offset += chunk.length;
      });
      chunks = [];
      if (samples.length === 0) throw new Error("No microphone audio was captured.");
      return arrayBufferToBase64(pcmFloatToWav(resampleTo16k(samples, sourceSampleRate), TARGET_SAMPLE_RATE));
    },
    /** Releases the microphone and closes the AudioContext entirely. Call this once,
     * when voice mode is exited or the assistant modal closes — not between
     * individual recordings. */
    close: async () => {
      capturing = false;
      processor.disconnect();
      source.disconnect();
      silentGain.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      await audioContext.close();
    },
  };
}

/** Converts a base64-encoded audio payload (e.g. BHASHINI TTS output) into a playable
 * object URL. Caller is responsible for revoking it when done. */
export function base64ToObjectUrl(base64, mimeType = "audio/wav") {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}
