import "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockBackground: {
      setBlockBackground: (color: string) => ReturnType;
      unsetBlockBackground: () => ReturnType;
    };
  }
}
export {};
