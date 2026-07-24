import React, { useState, useEffect } from "react";

export function useProfileSettings(settingsOpen: boolean) {
  const [username, setUsername] = useState("Himanshu");
  const [email, setEmail] = useState("Personal Account");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [editorFont, setEditorFont] = useState("sans");

  // Load settings on mount / open
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("focora-username");
      if (savedName) setUsername(savedName);
      const savedEmail = localStorage.getItem("focora-email");
      if (savedEmail) setEmail(savedEmail);
      const savedAvatar = localStorage.getItem("focora-profile-avatar");
      setAvatar(savedAvatar);
      setAvatarError(null);

      const savedFont = localStorage.getItem("focora-editor-font");
      if (savedFont) setEditorFont(savedFont);
    }
  }, [settingsOpen]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image must be smaller than 2MB.");
      return;
    }

    setAvatarError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAvatar(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    setAvatarError(null);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("focora-username", username);
    localStorage.setItem("focora-email", email);
    if (avatar) {
      localStorage.setItem("focora-profile-avatar", avatar);
    } else {
      localStorage.removeItem("focora-profile-avatar");
    }
    window.dispatchEvent(new Event("focora-profile-updated"));
  };

  const handleFontChange = (font: string) => {
    setEditorFont(font);
    localStorage.setItem("focora-editor-font", font);
    window.dispatchEvent(new Event("focora-font-updated"));
  };

  return {
    username,
    setUsername,
    email,
    setEmail,
    avatar,
    avatarError,
    editorFont,
    handleAvatarChange,
    handleRemoveAvatar,
    handleSaveProfile,
    handleFontChange,
  };
}
