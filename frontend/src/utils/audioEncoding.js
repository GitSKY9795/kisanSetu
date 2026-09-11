// BHASHINI's ASR pipeline expects 16kHz mono WAV/PCM, but MediaRecorder only produces
// compressed formats (webm/opus, mp4/aac) — browsers can't record raw WAV directly.
// These helpers decode whatever the browser recorded back into PCM samples (via the
// Web Audio API, which every browser's own decoder already supports) and re-encode
// that as a plain 16-bit PCM WAV file, entirely client-side, no library needed.

const TARGET_SAMPLE_RATE = 16000;

async function blobToPcm16k(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioCtx();
  try {
    const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    // Downmix to mono
    const channelCount = decoded.numberOfChannels;
    const length = decoded.length;
    const mono = new Float32Array(length);
    for (let ch = 0; ch < channelCount; ch++) {
      const data = decoded.getChannelData(ch);
      for (let i = 0; i < length; i++) mono[i] += data[i] / channelCount;
    }
    // Resample to 16kHz (simple linear interpolation — good enough for speech)
    const ratio = decoded.sampleRate / TARGET_SAMPLE_RATE;
    const outLength = Math.floor(length / ratio);
    const resampled = new Float32Array(outLength);
    for (let i = 0; i < outLength; i++) {
      const srcIndex = i * ratio;
      const i0 = Math.floor(srcIndex);
      const i1 = Math.min(i0 + 1, length - 1);
      const frac = srcIndex - i0;
      resampled[i] = mono[i0] * (1 - frac) + mono[i1] * frac;
    }
    return resampled;
  } finally {
    audioCtx.close();
  }
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
  const samples = await blobToPcm16k(blob);
  const wavBuffer = pcmFloatToWav(samples, TARGET_SAMPLE_RATE);
  return arrayBufferToBase64(wavBuffer);
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
