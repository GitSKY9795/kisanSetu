// Inline SVG artwork for the dashboard cards (no external image files needed).

export function RobotIllustration({ className }) {
  return (
    <svg className={className} viewBox="0 0 130 130" fill="none" aria-hidden="true">
      <path d="M104 122c-3-25 8-43 24-52 2 25-7 45-24 52z" fill="#9ccf72" />
      <path d="M90 126c-9-18-7-36 4-50 7 16 5 35-4 50z" fill="#63ad55" />
      <path d="M8 124c2-16 12-26 26-30-1 15-10 26-26 30z" fill="#b7dc92" />

      <rect x="80" y="8" width="42" height="30" rx="9" fill="#fff" stroke="#cfe6d2" />
      <path d="M92 38l-4 8 11-8z" fill="#fff" stroke="#cfe6d2" strokeLinejoin="round" />
      <rect x="89" y="22" width="5" height="9" rx="1.5" fill="#2f9a55" />
      <rect x="97" y="17" width="5" height="14" rx="1.5" fill="#2f9a55" />
      <rect x="105" y="13" width="5" height="18" rx="1.5" fill="#2f9a55" />

      <ellipse cx="58" cy="116" rx="26" ry="5" fill="#0b3d2c" opacity=".12" />
      <path d="M40 78q-12 3-12 17" stroke="#cfe3d3" strokeWidth="7" strokeLinecap="round" />
      <path d="M76 78q12 3 12 17" stroke="#cfe3d3" strokeWidth="7" strokeLinecap="round" />
      <rect x="40" y="68" width="36" height="34" rx="14" fill="#fff" stroke="#cfe3d3" />
      <circle cx="58" cy="85" r="6" fill="#3bb273" />
      <path d="m55 85 2.2 2.2 4-4.4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

      <path d="M58 20v8" stroke="#9bbfa8" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="58" cy="17" r="4" fill="#3bb273" />
      <rect x="32" y="40" width="7" height="14" rx="3.5" fill="#bfe0c8" />
      <rect x="77" y="40" width="7" height="14" rx="3.5" fill="#bfe0c8" />
      <rect x="36" y="28" width="44" height="40" rx="16" fill="#fff" stroke="#cfe3d3" />
      <rect x="42" y="35" width="32" height="26" rx="11" fill="#0f4a36" />
      <circle cx="51" cy="47" r="3.4" fill="#7ce0a3" />
      <circle cx="65" cy="47" r="3.4" fill="#7ce0a3" />
      <path d="M52 54q6 5 12 0" stroke="#7ce0a3" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function WheatStalk({ rotate = 0 }) {
  return (
    <g transform={`rotate(${rotate} 50 46)`}>
      <path d="M50 46V16" stroke="#b8901f" strokeWidth="1.8" strokeLinecap="round" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <ellipse cx="46.6" cy={18 + i * 6} rx="2.5" ry="4.2" transform={`rotate(-26 46.6 ${18 + i * 6})`} fill="#e8bf3f" />
          <ellipse cx="53.4" cy={18 + i * 6} rx="2.5" ry="4.2" transform={`rotate(26 53.4 ${18 + i * 6})`} fill="#e8bf3f" />
        </g>
      ))}
      <ellipse cx="50" cy="11.5" rx="2.4" ry="4.4" fill="#f0cb55" />
    </g>
  );
}

export function GrainSackIllustration({ className }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <ellipse cx="52" cy="95" rx="30" ry="4.5" fill="#0b3d2c" opacity=".14" />
      <WheatStalk rotate={-22} />
      <WheatStalk rotate={22} />
      <WheatStalk rotate={0} />
      <path d="M27 50C20 66 20 84 29 95h46c9-11 9-29 2-45z" fill="#dcae4e" />
      <path d="M27 50C20 66 20 84 29 95h14C36 84 36 66 40 50z" fill="#c99a3c" opacity=".55" />
      <path d="M32 46c9-6 28-6 38 0l6 6c-14 5-36 5-50 0z" fill="#cf9f40" />
      <path d="M31 52q21 8 42 0" stroke="#8a5a1c" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M36 66h30M34 76h34M35 86h32" stroke="#b9892f" strokeWidth="1.2" strokeLinecap="round" opacity=".6" />
    </svg>
  );
}
