export type SettingsTab = "profile" | "preferences" | "data" | "drive" | "trash";

export interface ModalConfig {
  show: boolean;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  isConfirm?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface ItemToDeletePermanently {
  id: string;
  type: "folder" | "page";
  name: string;
}
