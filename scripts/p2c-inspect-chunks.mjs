import fs from 'node:fs';

const c1 = fs.readFileSync('.next/static/chunks/107i8ab907rvg.js', 'utf8');
const c2 = fs.readFileSync('.next/static/chunks/2-3bcc782c_pu.js', 'utf8');

function checkPackageSignatures(name, content) {
  console.log(`\n=== Chunk ${name} ===`);
  const checks = [
    { label: 'React 19 / JSX Runtime', pattern: /react\.element|createContext|useReducer|useState/i },
    { label: 'React DOM / Fiber', pattern: /react-dom|createRoot|hydrateRoot|workInProgress|commitRoot/i },
    { label: 'Next.js Router / App Router', pattern: /next\/navigation|AppRouter|FlightResponse|useRouter|createHref/i },
    { label: 'Next.js Turbopack Runtime', pattern: /turbopack|TurbopackRoot/i },
    { label: 'GSAP', pattern: /gsap|ScrollTrigger|Tween/i },
    { label: 'Tailwind / CSS', pattern: /tailwind|tw-/i },
    { label: 'Lucide', pattern: /lucide|createLucideIcon/i },
    { label: 'Site Code / Living Wall', pattern: /living-wall|biyoo|AtmosphericParticles|wall-particles/i },
  ];

  for (const c of checks) {
    console.log(`  ${c.label}: ${c.pattern.test(content)}`);
  }
}

checkPackageSignatures('107i8ab907rvg.js', c1);
checkPackageSignatures('2-3bcc782c_pu.js', c2);
