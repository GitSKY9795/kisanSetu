// Small stroke-icon set shared by the app shell and the dashboard. All icons inherit
// `currentColor`, so colour/size are controlled purely from CSS.

function Svg({ size = 20, strokeWidth = 1.8, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p) => (
  <Svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></Svg>
);
export const UserIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></Svg>
);
export const TrendsIcon = (p) => (
  <Svg {...p}><path d="M4 20v-7M10 20V5M16 20v-9M22 20H2" /></Svg>
);
export const TruckIcon = (p) => (
  <Svg {...p}><path d="M2 6h11v10H2z" /><path d="M13 9h4l3 3v4h-7" /><circle cx="6.5" cy="17.5" r="2" /><circle cx="16.5" cy="17.5" r="2" /></Svg>
);
export const StoreIcon = (p) => (
  <Svg {...p}><path d="M4 9l1.5-5h13L20 9" /><path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9" /><path d="M5 12v8h14v-8" /><path d="M10 20v-5h4v5" /></Svg>
);
export const ShieldIcon = (p) => (
  <Svg {...p}><path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></Svg>
);
export const GlobeIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></Svg>
);
export const LogoutIcon = (p) => (
  <Svg {...p}><path d="M9 4H5v16h4" /><path d="m16 8 4 4-4 4M20 12H9" /></Svg>
);
export const SearchIcon = (p) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
);
export const BellIcon = (p) => (
  <Svg {...p}><path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 21h4" /></Svg>
);
export const ChevronDownIcon = (p) => (
  <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>
);
export const ChevronRightIcon = (p) => (
  <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>
);
export const ArrowRightIcon = (p) => (
  <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
);
export const ArrowUpRightIcon = (p) => (
  <Svg {...p}><path d="M7 17 17 7M9 7h8v8" /></Svg>
);
export const SparkleIcon = (p) => (
  <Svg {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    <path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z" />
  </Svg>
);
export const PinIcon = (p) => (
  <Svg {...p}><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></Svg>
);
export const AwardIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="9" r="6" /><path d="m9.5 8.8 1.8 1.8 3.2-3.4" /><path d="M8.5 14 7 21l5-3 5 3-1.5-7" /></Svg>
);
export const ClipboardIcon = (p) => (
  <Svg {...p}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9z" /><path d="M8.5 12h7M8.5 16h5" /></Svg>
);
export const TagIcon = (p) => (
  <Svg {...p}><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.3" /></Svg>
);
export const PlusCircleIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></Svg>
);
export const FilePlusIcon = (p) => (
  <Svg {...p}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M12 11v6M9 14h6" /></Svg>
);
export const AlertIcon = (p) => (
  <Svg {...p}><path d="M12 3l9.5 17h-19z" /><path d="M12 10v4.5M12 17.4v.1" /></Svg>
);
export const LeafIcon = (p) => (
  <Svg {...p}><path d="M5 19c0-8 5-13 15-14 0 10-5 15-13 15" /><path d="M5 19c3-5 6-8 10-10" /></Svg>
);
export const RupeeIcon = (p) => (
  <Svg {...p}><path d="M7 5h10M7 9h10M10 5c5.5 0 6 5.5 0 5.5L15.5 19" /></Svg>
);
export const UsersIcon = (p) => (
  <Svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.3c2 .8 3.5 2.6 3.5 5.2" /></Svg>
);
export const CloudIcon = (p) => (
  <Svg {...p}><path d="M7 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 10a4 4 0 0 1-.5 8z" /></Svg>
);
export const SunIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.2M12 19.3v2.2M4.5 4.5l1.6 1.6M17.9 17.9l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.5 19.5l1.6-1.6M17.9 6.1l1.6-1.6" />
  </Svg>
);
export const RainIcon = (p) => (
  <Svg {...p}><path d="M7 15a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 7a4 4 0 0 1-.5 8z" /><path d="M9 18l-1 2.5M13 18l-1 2.5M17 18l-1 2.5" /></Svg>
);
export const PartlyCloudyIcon = (p) => (
  <Svg {...p}>
    <circle cx="8.5" cy="8.5" r="3" />
    <path d="M8.5 2.5v1.2M2.5 8.5h1.2M4.3 4.3l.9.9M12.7 4.3l-.9.9" />
    <path d="M9.5 20a4 4 0 0 1-.3-8A5.2 5.2 0 0 1 19 13.3 3.4 3.4 0 0 1 18.6 20z" />
  </Svg>
);
export const CheckIcon = (p) => (
  <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
);
export const ArrowUpIcon = (p) => (
  <Svg {...p}><path d="M12 19V6M6 11l6-6 6 6" /></Svg>
);
export const ArrowDownIcon = (p) => (
  <Svg {...p}><path d="M12 5v13M6 13l6 6 6-6" /></Svg>
);
export const MicIcon = (p) => (
  <Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" /></Svg>
);
export const StopIcon = (p) => (
  <Svg {...p}><rect x="6" y="6" width="12" height="12" rx="2.5" /></Svg>
);
export const SendIcon = (p) => (
  <Svg {...p}><path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3Z" /></Svg>
);
export const CloseIcon = (p) => (
  <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
);
export const ChatIcon = (p) => (
  <Svg {...p}><path d="M4 5h16v11H9l-5 4V5Z" /></Svg>
);
export const SpeakerIcon = (p) => (
  <Svg {...p}><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" /></Svg>
);
