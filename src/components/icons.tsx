import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

function base(props: P) {
  return {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  };
}

export function LogoIcon(props: P) {
  return (
    <svg viewBox="0 0 48 48" {...props} aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#3d7a3f" />
      <path
        d="M24 14c-6.5 0-11 5.2-11 11.5C13 31 16.5 35 22 36.5V26.5l4-4.2 4 4.2v10c5.5-1.5 9-5.5 9-11C39 19.2 30.5 14 24 14z"
        fill="#fff"
      />
      <circle cx="24" cy="24" r="24" fill="none" />
    </svg>
  );
}

export function SunIcon(props: P) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
    </svg>
  );
}

export function DropletIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M12 2.7S6 9.6 6 14a6 6 0 0 0 12 0c0-4.4-6-11.3-6-11.3z" />
    </svg>
  );
}

export function WindIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M3 8h9a3 3 0 1 0-3-3M3 12h13a3 3 0 1 1-3 3M3 16h6a2 2 0 1 1-2 2" />
    </svg>
  );
}

export function RainIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3" />
      <path d="M8 15v2m4-6v2m4-2v2" />
    </svg>
  );
}

export function ThermometerIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z" />
    </svg>
  );
}

export function ClockIcon(props: P) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function LeafIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z" />
      <path d="M2 21c0-3 1.8-5.5 3.7-6.9" />
    </svg>
  );
}

export function SensorIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M4 10a8 8 0 0 1 16 0" />
      <path d="M7 10a5 5 0 0 1 10 0" />
      <circle cx="12" cy="10" r="2" />
      <path d="M12 10v9" />
      <path d="M9.5 21.5h5" />
    </svg>
  );
}

export function StationIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M3 21h18M6 21V7l6-3 6 3v14" />
      <path d="M10 21v-4m4 4v-4" />
      <path d="M10 12h.01M14 12h.01M10 15h.01M14 15h.01" />
    </svg>
  );
}

export function CameraIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M14.5 4h-5L7.5 6H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-3.5z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </svg>
  );
}

export function ReportIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8m-8 4h5" />
    </svg>
  );
}

export function BellIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function WhatsAppIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={20} height={20} {...props} aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.81-1.32l-.35-.2-3.57.94.95-3.48-.23-.36a9.44 9.44 0 0 1-1.45-5.04c0-5.2 4.23-9.44 9.45-9.44a9.4 9.4 0 0 1 6.68 2.77 9.38 9.38 0 0 1 2.76 6.68c0 5.21-4.24 9.45-9.42 9.45zm7.87-17.31A11.32 11.32 0 0 0 12.04 0C5.46 0 .1 5.36.1 11.94c0 2.1.55 4.15 1.6 5.96L.05 24l6.24-1.63a11.93 11.93 0 0 0 5.73 1.46c6.58 0 11.94-5.36 11.94-11.94 0-3.2-1.24-6.2-3.06-8.2z" />
    </svg>
  );
}

export function CheckIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function ShieldIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
