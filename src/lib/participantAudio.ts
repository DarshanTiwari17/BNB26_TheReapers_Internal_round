/* Participant audio-stream registry.
 *
 * Boundary between the WebRTC layer and the future audio-intelligence
 * layer: every participant's microphone audio stays identifiable by
 * participantId, and streams are NEVER mixed here.
 *
 * participantId -> MediaStream  (one entry per participant, local included)
 * participantId -> MediaStreamTrack[] (derived from the stored stream)
 *
 * The manager owns the mapping only — it never stops tracks or closes
 * connections. Track/connection lifecycle stays with the WebRTC layer
 * (peer close, mic cleanup), which calls remove/clear here.
 */

export type ParticipantAudioStream = {
  participantId: string;
  stream: MediaStream;
  isLocal: boolean;
};

export class ParticipantAudioStreamManager {
  private readonly streams = new Map<string, ParticipantAudioStream>();

  /** Register or replace a participant's stream. Reconnects replace the
   *  old entry under the same participantId — never a duplicate entry. */
  setStream(participantId: string, stream: MediaStream, isLocal: boolean): ParticipantAudioStream {
    const entry: ParticipantAudioStream = { participantId, stream, isLocal };
    this.streams.set(participantId, entry);
    return entry;
  }

  getStream(participantId: string): MediaStream | null {
    return this.streams.get(participantId)?.stream ?? null;
  }

  getEntry(participantId: string): ParticipantAudioStream | null {
    return this.streams.get(participantId) ?? null;
  }

  /** Live audio tracks for a participant, in stream order. */
  getTracks(participantId: string): MediaStreamTrack[] {
    return this.getStream(participantId)?.getAudioTracks() ?? [];
  }

  /** First audio track for a participant, if any. */
  getTrack(participantId: string): MediaStreamTrack | null {
    return this.getTracks(participantId)[0] ?? null;
  }

  has(participantId: string): boolean {
    return this.streams.has(participantId);
  }

  get size(): number {
    return this.streams.size;
  }

  participantIds(): string[] {
    return [...this.streams.keys()];
  }

  /** Every stream for the intelligence layer: [participantId, MediaStream]. */
  entries(): Array<[string, MediaStream]> {
    return [...this.streams.entries()].map(([id, entry]) => [id, entry.stream]);
  }

  getAllStreams(): MediaStream[] {
    return [...this.streams.values()].map((entry) => entry.stream);
  }

  /** Remove one participant's mapping. Returns true when one existed. */
  removeStream(participantId: string): boolean {
    return this.streams.delete(participantId);
  }

  /** Meeting end / full teardown: drop every mapping. */
  clearAllStreams(): void {
    this.streams.clear();
  }
}
