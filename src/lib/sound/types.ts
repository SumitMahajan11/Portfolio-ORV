export type SoundName = "pat" | "squeak" | "yawn" | "chirp" | "boing" | "breath";

export interface SoundConfig {
  file: string;
  volume: number;
  loop?: boolean;
}

export const SOUND_CONFIGS: Record<SoundName, SoundConfig> = {
  pat: {
    file: "/audio/pat.mp3",
    volume: 0.35,
    loop: false,
  },
  squeak: {
    file: "/audio/squeak.mp3",
    volume: 0.45,
    loop: false,
  },
  yawn: {
    file: "/audio/yawn.mp3",
    volume: 0.4,
    loop: false,
  },
  chirp: {
    file: "/audio/chirp.mp3",
    volume: 0.4,
    loop: false,
  },
  boing: {
    file: "/audio/boing.mp3",
    volume: 0.4,
    loop: false,
  },
  breath: {
    file: "/audio/breath.mp3",
    volume: 0.12,
    loop: true,
  },
};
