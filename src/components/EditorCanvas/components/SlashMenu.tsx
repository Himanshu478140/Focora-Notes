"use client";

import React from "react";
import { SLASH_COMMANDS } from "../SlashCommands";

interface SlashMenuProps {
  show: boolean;
  coords: { top: number; left: number };
  selectedIndex: number;
  runCommand: (index: number) => void;
}

export default function SlashMenu(_props: SlashMenuProps) {
  return null;
}
