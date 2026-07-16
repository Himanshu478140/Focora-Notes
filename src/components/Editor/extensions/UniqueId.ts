import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { nanoid } from "@/utils/nanoid";

export const UniqueId = Extension.create({
  name: "uniqueId",

  addOptions() {
    return {
      types: ["paragraph", "heading", "blockquote", "codeBlock", "listItem", "taskItem", "table", "mathBlock", "drawingBlock", "columnRow", "column"],
      attributeName: "id",
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          [this.options.attributeName]: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-id") || null,
            renderHTML: (attributes) => {
              const val = attributes[this.options.attributeName];
              if (!val) return {};
              return { "data-block-id": val };
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    const attributeName = this.options.attributeName;
    const types = this.options.types;

    return [
      new Plugin({
        key: new PluginKey("uniqueId"),
        state: {
          init(config, instance) {
            const idCounts = new Map<string, number>();
            instance.doc.descendants((node) => {
              if (types.includes(node.type.name)) {
                const id = node.attrs[attributeName];
                if (id) {
                  idCounts.set(id, (idCounts.get(id) || 0) + 1);
                }
              }
            });
            return idCounts;
          },
          apply(tr: any, oldIdCounts: any, oldState: any, newState: any) {
            if (!tr.docChanged) return oldIdCounts;
            const newIdCounts = new Map<string, number>();
            newState.doc.descendants((node: any) => {
              if (types.includes(node.type.name)) {
                const id = node.attrs[attributeName];
                if (id) {
                  newIdCounts.set(id, (newIdCounts.get(id) || 0) + 1);
                }
              }
            });
            return newIdCounts;
          },
        },
        appendTransaction(transactions: readonly any[], oldState: any, newState: any) {
          const docChanged = transactions.some((tr: any) => tr.docChanged);
          if (!docChanged) return;

          const tr = newState.tr;
          const pluginState = this.getState(newState) as Map<string, number> | undefined;
          if (!pluginState) return;

          // Gather all touched ranges mapped to newState coordinates
          const touchedRanges: { from: number; to: number }[] = [];
          for (let i = 0; i < transactions.length; i++) {
            const transaction = transactions[i];
            transaction.steps.forEach((step: any) => {
              const map = step.getMap();
              map.forEach((oldStart: number, oldEnd: number, newStart: number, newEnd: number) => {
                let mappedStart = newStart;
                let mappedEnd = newEnd;
                for (let j = i + 1; j < transactions.length; j++) {
                  mappedStart = transactions[j].mapping.map(mappedStart);
                  mappedEnd = transactions[j].mapping.map(mappedEnd);
                }
                touchedRanges.push({ from: mappedStart, to: mappedEnd });
              });
            });
          }

          const changes: { pos: number; node: any; newId: string }[] = [];
          const activeIdCounts = new Map<string, number>(pluginState);

          touchedRanges.forEach(({ from, to }) => {
            const docLen = newState.doc.content.size;
            const startPos = Math.max(0, Math.min(docLen, from));
            const endPos = Math.max(0, Math.min(docLen, to));

            newState.doc.nodesBetween(startPos, endPos, (node: any, pos: number) => {
              if (types.includes(node.type.name)) {
                const id = node.attrs[attributeName];
                const count = id ? activeIdCounts.get(id) : 0;

                if (!id || (count && count > 1)) {
                  let newId = nanoid();
                  while (activeIdCounts.has(newId)) {
                    newId = nanoid();
                  }

                  if (id) {
                    const prevCount = activeIdCounts.get(id) || 0;
                    if (prevCount <= 1) activeIdCounts.delete(id);
                    else activeIdCounts.set(id, prevCount - 1);
                  }
                  activeIdCounts.set(newId, 1);

                  changes.push({ pos, node, newId });
                }
              }
            });
          });

          if (changes.length === 0) return null;

          changes.forEach(({ pos, node, newId }) => {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              [attributeName]: newId,
            });
          });

          return tr;
        },
      }),
    ];
  },
});
