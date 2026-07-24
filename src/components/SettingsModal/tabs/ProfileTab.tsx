import React from "react";

interface ProfileTabProps {
  username: string;
  setUsername: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  avatar: string | null;
  avatarError: string | null;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  onSaveProfile: (e: React.FormEvent) => void;
}

export function ProfileTab({
  username,
  setUsername,
  email,
  setEmail,
  avatar,
  avatarError,
  onAvatarChange,
  onRemoveAvatar,
  onSaveProfile,
}: ProfileTabProps) {
  return (
    <form onSubmit={onSaveProfile} className="flex flex-col gap-4 md:gap-5 max-w-2xl">
      <div>
        <h3 className="text-sm md:text-base lg:text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">User Profile</h3>
        <p className="text-[11px] md:text-xs lg:text-sm text-gray-400 dark:text-gray-500 leading-normal">
          Update your account details displayed in the sidebar.
        </p>
      </div>

      <div className="flex items-center gap-4 py-2">
        <div className="relative group w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden shadow-md shadow-violet-500/10 flex-shrink-0">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center text-sm md:text-base lg:text-lg font-bold select-none">
              {username.slice(0, 2).toUpperCase()}
            </div>
          )}
          <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-semibold cursor-pointer transition-opacity">
            <span>Change</span>
            <input
              type="file"
              accept="image/*"
              onChange={onAvatarChange}
              className="hidden"
            />
          </label>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <label className="px-3.5 py-2 bg-violet-600 hover:bg-violet-750 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-md shadow-violet-500/10 transition-colors">
              Upload Image
              <input
                type="file"
                accept="image/*"
                onChange={onAvatarChange}
                className="hidden"
              />
            </label>
            {avatar && (
              <button
                type="button"
                onClick={onRemoveAvatar}
                className="px-3.5 py-2 border border-red-200 dark:border-red-950/20 hover:bg-red-500/[0.04] text-red-650 dark:text-red-400 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Remove
              </button>
            )}
          </div>
          {avatarError ? (
            <p className="text-[10px] md:text-xs text-red-650 dark:text-red-400 font-medium leading-none">
              {avatarError}
            </p>
          ) : (
            <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 leading-none">
              Supports JPG, PNG or WebP (max 2MB).
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] md:text-[11px] lg:text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Name</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="px-3.5 py-2 md:py-2.5 text-xs md:text-sm lg:text-base rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-800 dark:text-gray-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
          placeholder="Username"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] md:text-[11px] lg:text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Subtext / Account</label>
        <input
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3.5 py-2 md:py-2.5 text-xs md:text-sm lg:text-base rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-800 dark:text-gray-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
          placeholder="Personal Account or email"
          required
        />
      </div>

      <button
        type="submit"
        className="mt-2 w-fit px-5 py-2 md:py-2.5 bg-violet-600 hover:bg-violet-750 text-white font-semibold rounded-xl text-xs md:text-sm cursor-pointer shadow-md shadow-violet-500/10 transition-colors"
      >
        Save Profile
      </button>
    </form>
  );
}
