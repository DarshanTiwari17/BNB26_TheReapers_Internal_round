/* Live transcription feed: local mic -> rolling PCM windows -> backend pipeline.
 * Independent of WebRTC transport (which keeps carrying live audio);
 * results come back over the existing signaling socket as transcript_event.
 *
 * Windows are ~3 s and non-overlapping: the backend VAD splits them into
 * speech regions, accumulates >=1.5 s of speech per participant, and only
 * then calls Whisper — short fragments never reach inference, so captions
 * stay reliable at ~2-3 s latency instead of hallucinating.
 */

const WORKLET_CODE = `
class FeedCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.carry = 0;
    this.buf = [];
  }
  process(inputs) {
    const ch = inputs && inputs[0] && inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.carry += ch[i];
        this._n = (this._n || 0) + 1;
        if (this._n >= this.ratio) {
          this.buf.push(this.carry / this._n);
          this.carry = 0;
          this._n = 0;
          if (this.buf.length >= 1600) {
            this.port.postMessage(new Float32Array(this.buf.splice(0, 1600)));
          }
        }
      }
    }
    return true;
  }
}
registerProcessor("rt-feed-capture", FeedCapture);
`;

// Stable rolling windows: speech posts ~3 s after it starts being spoken.
// Shorter windows starve Whisper of context (hallucinations); the backend
// VAD splits windows into speech regions and accumulates them to >=1.5 s
// of speech before any inference call.
const WINDOW_S = 3;

export type FeedCredentials =
  | { participant_id: string; participant_token: string }
  | { host_token: string };

async function blobToB64(buf: Float32Array): Promise<string> {
  const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  let binary = "";
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function startTranscriptionFeed(options: {
  stream: MediaStream;
  sessionId: string;
  credentials: FeedCredentials;
  apiBase: string;
  onError?: (message: string) => void;
}): () => void {
  const { stream, sessionId, credentials, apiBase } = options;
  const context = new AudioContext();
  let node: AudioWorkletNode | null = null;
  let stopped = false;
  let posting: Promise<void> | null = null;
  const feedT0 = Date.now();
  let acc = new Float32Array(0);
  let windowStartS = 0;

  const postWindow = (pcm: Float32Array, t0: number) => {
    const payload = { ...credentials, t0, pcm_b64: "" };
    const run = async () => {
      try {
        (payload as Record<string, unknown>).pcm_b64 = await blobToB64(pcm);
        const res = await fetch(
          `${apiBase}/api/sessions/${encodeURIComponent(sessionId)}/audio-segments`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
        );
        if (!res.ok && options.onError) {
          options.onError(`transcription upload failed (${res.status})`);
        }
      } catch {
        // Transient network failure: skip this window, keep streaming.
      }
    };
    posting = run().finally(() => {
      if (posting !== null) posting = null;
    });
  };

  const onChunk = (chunk: Float32Array) => {
    if (stopped) return;
    const merged = new Float32Array(acc.length + chunk.length);
    merged.set(acc);
    merged.set(chunk, acc.length);
    acc = merged;
    const need = WINDOW_S * 16000;
    while (acc.length >= need) {
      const window = acc.slice(0, need);
      acc = acc.slice(need);
      const t0 = windowStartS;
      windowStartS += WINDOW_S;
      // Skip digital silence locally so the backend never sees it.
      let peak = 0;
      for (let i = 0; i < window.length; i += 7) {
        const v = Math.abs(window[i]);
        if (v > peak) peak = v;
      }
      if (peak > 0.008) postWindow(window, t0);
    }
  };

  (async () => {
    try {
      const url = URL.createObjectURL(new Blob([WORKLET_CODE], { type: "application/javascript" }));
      try {
        await context.audioWorklet.addModule(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      if (stopped) {
        void context.close().catch(() => undefined);
        return;
      }
      const source = context.createMediaStreamSource(stream);
      node = new AudioWorkletNode(context, "rt-feed-capture", { numberOfOutputs: 0 });
      node.port.onmessage = (event: MessageEvent) => {
        const data = event.data as Float32Array;
        if (data && data.length) onChunk(new Float32Array(data));
      };
      source.connect(node);
      void feedT0;
    } catch {
      if (options.onError) options.onError("local transcription capture unavailable in this browser");
    }
  })();

  return () => {
    stopped = true;
    try {
      node?.disconnect();
    } catch {
      // Already torn down.
    }
    node = null;
    void context.close().catch(() => undefined);
  };
}
