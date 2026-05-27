import { useState } from 'react';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: 'sm' | 'lg';
  className?: string;
}

function getInitials(name?: string | null, email?: string | null) {
  const source = (name || email || 'User').trim();
  if (!source) return 'U';

  if (source.includes('@')) {
    return source[0].toUpperCase();
  }

  return source
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function UserAvatar({ src, name, email, size = 'sm', className = '' }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const dimensions = size === 'lg' ? 'h-16 w-16 text-xl' : 'h-9 w-9 text-sm';
  const initials = getInitials(name, email);

  if (src && !imageFailed) {
    return (
      <img
        src={src}
        alt={name || email || 'User'}
        onError={() => setImageFailed(true)}
        className={`${dimensions} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${dimensions} flex items-center justify-center rounded-full bg-gradient-to-br from-primary-teal to-primary-purple font-semibold text-white ${className}`}
      aria-label={name || email || 'User'}
    >
      {initials}
    </div>
  );
}
