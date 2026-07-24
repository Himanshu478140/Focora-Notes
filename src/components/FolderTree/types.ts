export interface TriggerRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ContextMenuState {
  type: "folder" | "page";
  id: string;
  name: string;
  isRightClick: boolean;
  clickX: number;
  clickY: number;
  triggerRect: TriggerRect | null;
}
