import React from 'react';

interface UserAvatarProps {
  avatarUrl?: string;
  name?: string;
  className?: string;
  imgClassName?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  name,
  className = 'w-10 h-10',
  imgClassName = '',
}) => {
  const hasCustomPhoto = Boolean(avatarUrl && avatarUrl.trim() !== '');

  if (hasCustomPhoto) {
    return (
      <div className={`relative rounded-full overflow-hidden shrink-0 ${className}`}>
        <img
          src={avatarUrl}
          alt={`Profilo di ${name || 'Utente'}`}
          className={`w-full h-full object-cover ${imgClassName}`}
        />
      </div>
    );
  }

  // Fallback: icona di un omino bianco su sfondo scuro pulito ed elegante
  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 bg-[#262e2b] flex items-center justify-center text-white ${className} ${imgClassName}`}
      title={name ? `Profilo di ${name}` : 'Profilo (omino bianco)'}
    >
      <svg
        className="w-[62%] h-[62%] text-white translate-y-[6%]"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-label="Icona profilo utente omino bianco"
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
};
