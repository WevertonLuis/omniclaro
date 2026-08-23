interface Props {
  className?: string;
}

const base = 'shrink-0';

export const BoltIcon = ({ className = 'w-3.5 h-3.5' }: Props) => (
  <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2z" />
  </svg>
);

export const UserIcon = ({ className = 'w-4 h-4' }: Props) => (
  <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <circle cx="12" cy="8" r="3.4" />
    <path d="M4.8 20c.6-3.6 3.6-5.6 7.2-5.6s6.6 2 7.2 5.6" strokeLinecap="round" />
  </svg>
);

export const MicIcon = ({ className = 'w-3.5 h-3.5' }: Props) => (
  <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <rect x="9" y="2.8" width="6" height="11" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.2" strokeLinecap="round" />
  </svg>
);

export const TransferIcon = ({ className = 'w-3.5 h-3.5' }: Props) => (
  <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M3 8h13M13 4.5 16.5 8 13 11.5M21 16H8M11 12.5 7.5 16 11 19.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const EndIcon = ({ className = 'w-3.5 h-3.5' }: Props) => (
  <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
    <path d="M4.2 13.4c4.3-4.3 11.3-4.3 15.6 0l-2.2 2.6-3.5-1.3-.5-2.4a9.6 9.6 0 0 0-3.2 0l-.5 2.4-3.5 1.3-2.2-2.6z" />
  </svg>
);

export const SendIcon = ({ className = 'w-4 h-4' }: Props) => (
  <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M3.3 20.4 21 12 3.3 3.6 3.3 10l11 2-11 2z" />
  </svg>
);

export const DocIcon = ({ className = 'w-4 h-4' }: Props) => (
  <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <path d="M6.5 3.2h7.2L18.5 8v12.8h-12z" strokeLinejoin="round" />
    <path d="M13.5 3.2V8h5M9 12.5h6M9 16h4" strokeLinecap="round" />
  </svg>
);

export const KebabIcon = ({ className = 'w-4 h-4' }: Props) => (
  <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="12" cy="5.5" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="12" cy="18.5" r="1.6" />
  </svg>
);

export const CheckIcon = ({ className = 'w-3 h-3' }: Props) => (
  <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
    <path d="M4.5 12.6 9.5 17.5 19.5 6.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AlertIcon = ({ className = 'w-3 h-3' }: Props) => (
  <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" aria-hidden>
    <path d="M12 3.6 22 20H2z" strokeLinejoin="round" />
    <path d="M12 9.5v4.2M12 16.8v.1" strokeLinecap="round" />
  </svg>
);

export const HashIcon = ({ className = 'w-3 h-3' }: Props) => (
  <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" aria-hidden>
    <path d="M9.5 3.5 7.5 20.5M16.5 3.5l-2 17M4 9h16M3.4 15h16" strokeLinecap="round" />
  </svg>
);

export const CardIcon = ({ className = 'w-3 h-3' }: Props) => (
  <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <rect x="2.6" y="5.5" width="18.8" height="13" rx="2.4" />
    <path d="M2.6 10h18.8" />
  </svg>
);

export const ClockIcon = ({ className = 'w-3 h-3' }: Props) => (
  <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.4l3.3 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const TagIcon = ({ className = 'w-3 h-3' }: Props) => (
  <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M3.5 11.4V4.2h7.2l9.5 9.5-7.2 7.2z" strokeLinejoin="round" />
    <circle cx="7.6" cy="8.1" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const ICONES: Record<string, (p: Props) => JSX.Element> = {
  check: CheckIcon,
  alert: AlertIcon,
  warn: AlertIcon,
  hash: HashIcon,
  card: CardIcon,
  clock: ClockIcon,
  tag: TagIcon,
};
