import type { ConstellationLine } from "./types";

export const constellationLines: ConstellationLine[] = [
  // Arrival / hero
  { id: 1, text: "The Constellation 'Bored Archivist' is watching.", context: "hero" },
  { id: 2, text: "A new Reader has entered the channel.", context: "hero" },
  { id: 3, text: "Constellation 'Night Owl' wonders if you will scroll.", context: "hero" },
  { id: 4, text: "Probability of this being a normal portfolio: 0%.", context: "hero" },
  { id: 5, text: "The Constellation 'Feather Counter' lost count already.", context: "hero" },

  // Scrolling fast
  { id: 6, text: "Slow down, reader. The story has not loaded its feelings yet.", context: "fast-scroll" },
  { id: 7, text: "Constellation 'Speedrunner' approves.", context: "fast-scroll" },
  { id: 8, text: "You skipped a paragraph. The Constellations noticed.", context: "fast-scroll" },

  // Idle
  { id: 9, text: "The story is waiting. Rude, but patient.", context: "idle" },
  { id: 10, text: "Constellation 'Sleepy Scribe' has fallen asleep.", context: "idle" },
  { id: 11, text: "Biyoo says you can scroll now.", context: "idle" },

  // Worlds
  { id: 12, text: "A Scenario is a bug you decided to take personally.", context: "world" },
  { id: 13, text: "Constellation 'Green Path' sponsors this route.", context: "world" },
  { id: 14, text: "The Hokage fell. Politics ensued.", context: "world" },
  { id: 15, text: "A term ended. A new era begins.", context: "world" },
  { id: 16, text: "Vow accepted. Conditions are not negotiable.", context: "world" },
  { id: 17, text: "UNSATISFIABLE. The vow collapsed. Beautiful.", context: "world" },
  { id: 18, text: "The truth is always one. Sometimes it is a missing semicolon.", context: "world" },
  { id: 19, text: "Evidence found. Constellation 'Skeptic' is shaken.", context: "world" },
  { id: 20, text: "Tests passed. The Constellations clap quietly.", context: "world" },

  // Skills
  { id: 21, text: "Every skill here comes with receipts.", context: "skills" },
  { id: 22, text: "No bars. No percentages. Only proof.", context: "skills" },
  { id: 23, text: "Item inspected. Rarity: earned.", context: "skills" },

  // Hover/click
  { id: 24, text: "Poke registered. Biyoo is judging you kindly.", context: "hover" },
  { id: 25, text: "That tickled the narrative.", context: "hover" },
  { id: 26, text: "Careful, reader. That was a plot point.", context: "hover" },

  // Time-based
  { id: 27, text: "Late night reading? Respect.", context: "time-night" },
  { id: 28, text: "Constellation 'Insomnia' has joined the chat.", context: "time-night" },
  { id: 29, text: "Morning reader. The story has coffee.", context: "time-morning" },

  // Meta / fourth wall
  { id: 30, text: "You are reading this. The story knows.", context: "meta" },
  { id: 31, text: "Fun fact: this is a portfolio. Do not tell the Constellations.", context: "meta" },
  { id: 32, text: "The author is not the protagonist. Or is he?", context: "meta" },
  { id: 33, text: "Reader, do you remember how you got here?", context: "meta" },

  // Mobile
  { id: 34, text: "Swipe, reader. Gently. The wings are fragile.", context: "mobile" },
  { id: 35, text: "Small screen, same story.", context: "mobile" },

  // Contact / end
  { id: 36, text: "The last page is a door, not a wall.", context: "end" },
  { id: 37, text: "The next chapter needs an author. Write to him.", context: "end" },
  { id: 38, text: "Constellation 'Recruiter' has entered the room.", context: "end" },

  // Hidden
  { id: 39, text: "Five fragments exist. Four are hiding well.", context: "hidden" },
  { id: 40, text: "Some endings are earned, not scrolled.", context: "hidden" },
];
