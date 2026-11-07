# 04 Tech and Folder Spec

## Stack
Next.js (App Router) + TypeScript (strict) + Tailwind + GSAP/ScrollTrigger + Vercel. Package manager: npm. Node LTS. Font loading via next/font. Sound via Howler (Phase 3) or native Audio.

## Folder structure
```
/docs                      all docs in this pack
/public
  /art/dokja/              layered PNG/AVIF + webp per stage
  /art/biyoo/
  /art/worlds/<world>/
  /audio/                  biyoo sounds (Phase 3)
  /resume/                 resume pdf
/src
  /app
    layout.tsx  page.tsx
    /skip/                 plain accessible version
    /wanted/               Wanted: Sumit page
    /worlds/<world>/       lazy world routes or sections
  /components
    /system-window/  /biyoo/  /dokja/  /ui/
  /lib
    /motion/               gsap setup, timelines, easing tokens
    /reader/               local behavior (idle, scroll speed, clock)
    /device/               low-end detection, reduced-motion
  /content                 typed content from 03 (projects.ts, skills.ts, lines.ts)
  /styles/globals.css      design tokens from 02
```

## Conventions
- Components: PascalCase. Files: kebab-case. One component per file.
- All copy lives in /content typed objects, never inline in JSX.
- Every animation component exports a `static` fallback render.
- GSAP: register plugins once in /lib/motion/setup.ts; use `gsap.context` and revert on unmount.
- Feature flags in /lib/flags.ts: `lightMode`, `soundOn`, `cameraOn`.
- No localStorage for anything identifying. Fragment progress stored locally only.
- Commit per prompt: `phaseN-task: short description`.

## Deployment
Vercel free tier. Preview deploy on every push. Production only after Phase gate passes.
