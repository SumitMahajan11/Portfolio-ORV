export type World = 'edge-cloud' | 'raft' | 'z3' | 'backtrace' | 'sidequest';

export type ProjectStatus = 'flagship' | 'sidequest';

export type EvidenceType = 'verified' | 'unverified';

export interface Claim {
  text: string;
  evidence: EvidenceType;
  source: string | null;
}

export interface ProjectLinks {
  repo: string | null;
  demo: string | null;
  benchmark: string | null;
}

export interface SideQuestBullets {
  problem: string | null;
  built: string | null;
  learned: string | null;
}

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  world: World;
  oneLiner: string | null;
  claims: Claim[];
  limits: string[];
  links: ProjectLinks;
  costume: string;
  bullets?: SideQuestBullets;
  inDesign?: boolean;
  worldReady?: boolean;
  published: boolean;
}

export interface Skill {
  name: string;
  story: string | null;
  proofProjectIds: string[];
}

export type ConstellationContext =
  | 'hero'
  | 'fast-scroll'
  | 'idle'
  | 'world'
  | 'skills'
  | 'hover'
  | 'time-night'
  | 'time-morning'
  | 'meta'
  | 'mobile'
  | 'end'
  | 'hidden';

export interface ConstellationLine {
  id: number;
  text: string;
  context: ConstellationContext;
}

export interface Identity {
  name: string;
  github: string;
  degree: string;
  institution: string;
  city: string;
  graduation: string;
  cgpa: number | null;
  targeting: string;
  contact: {
    formAvailable: boolean;
    github: string;
    linkedin: string | null;
    resumePdf: string | null;
  };
}

export interface AboutSection {
  title: string;
  paragraphs: (string | null)[];
}
