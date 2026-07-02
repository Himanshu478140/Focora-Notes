import React, { useState, useEffect, useRef } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Check, Edit2, AlertCircle, Copy, Sigma } from "lucide-react";

interface TemplateItem {
  name: string;
  latex: string;
  preview: string;
}

const TEMPLATES: TemplateItem[] = [
  { name: "Fraction", latex: "\\frac{a}{b}", preview: "a/b" },
  { name: "Quadratic", latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}", preview: "x=(-b±√D)/2a" },
  { name: "Integral", latex: "\\int_{a}^{b} f(x) \\, dx", preview: "∫ f(x)dx" },
  { name: "Summation", latex: "\\sum_{i=1}^{n} i", preview: "∑ i" },
  { name: "Matrix", latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", preview: "[matrix]" },
  { name: "Limit", latex: "\\lim_{x \\to \\infty} f(x)", preview: "lim f(x)" },
];

export default function MathBlockComponent(props: any) {
  const { node, updateAttributes } = props;
  const initialLatex = node.attrs.latex || "";
  
  const [latex, setLatex] = useState<string>(initialLatex);
  const [isEditing, setIsEditing] = useState(initialLatex === "" || initialLatex === "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Render KaTeX
  useEffect(() => {
    if (!containerRef.current) return;
    try {
      katex.render(latex || "\\text{Empty Formula}", containerRef.current, {
        displayMode: true,
        throwOnError: true,
      });
      setError(null);
    } catch (e: any) {
      setError(e.message || "Invalid LaTeX");
      try {
        katex.render(latex || "\\text{Empty Formula}", containerRef.current, {
          displayMode: true,
          throwOnError: false,
        });
      } catch (inner) {}
    }
  }, [latex, isEditing]);

  const handleSave = () => {
    updateAttributes({ latex });
    setIsEditing(false);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const insertTemplate = (template: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setLatex((prev) => prev + template);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newText = before + template + after;
    setLatex(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + template.length;
    }, 0);
  };

  return (
    <NodeViewWrapper className="math-block-wrapper my-6 relative group">
      {isEditing ? (
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.08] shadow-sm flex flex-col gap-3 relative z-40 pointer-events-auto">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider select-none">
            <span className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
              <Sigma size={13} />
              LaTeX Equation Editor
            </span>
            {error && (
              <span className="flex items-center gap-1 text-red-500 normal-case font-normal max-w-[200px] sm:max-w-none truncate">
                <AlertCircle size={12} className="flex-shrink-0" />
                {error.replace("KaTeX parse error: ", "")}
              </span>
            )}
          </div>

          {/* Template buttons */}
          <div className="flex flex-wrap gap-1 px-1 py-0.5 bg-gray-100/50 dark:bg-white/[0.03] rounded-lg border border-gray-200/50 dark:border-white/[0.04]">
            <span className="text-[10px] font-semibold text-gray-400 uppercase self-center px-1.5 select-none">Templates:</span>
            {TEMPLATES.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => insertTemplate(t.latex)}
                className="px-2 py-1 rounded-md text-[10px] font-medium bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-white/[0.06] hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10 dark:hover:text-violet-400 hover:border-violet-200 dark:hover:border-violet-500/30 transition-all cursor-pointer"
                title={`Insert ${t.name}`}
              >
                {t.name}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              className="flex-grow p-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1a1a] text-sm font-mono focus:outline-none focus:ring-1 focus:ring-violet-500 dark:text-white resize-y min-h-[72px] leading-relaxed"
              placeholder="Type LaTeX here... (e.g. \int_a^b f(x) \, dx)"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
            <button
              onClick={handleSave}
              className="px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-colors shadow-lg shadow-violet-500/20 cursor-pointer active:scale-95 duration-100 flex-shrink-0"
              title="Save Preview (Ctrl+Enter)"
            >
              <Check size={18} />
            </button>
          </div>
          
          {/* Edit preview container */}
          <div className="p-4 rounded-lg bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/[0.04] flex items-center justify-center overflow-x-auto min-h-[64px] scrollbar-thin">
            <div ref={containerRef} className="text-gray-800 dark:text-gray-200" />
          </div>
        </div>
      ) : (
        <div 
          onClick={() => setIsEditing(true)}
          className="p-6 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-white/[0.08] hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all duration-200 flex items-center justify-center relative cursor-pointer group min-h-[64px] overflow-x-auto scrollbar-none pointer-events-auto"
        >
          <div ref={containerRef} className="text-gray-900 dark:text-gray-100 select-none py-2" />
          
          {/* Hover Action Overlays */}
          <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center gap-1.5 z-40 pointer-events-auto">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-white/[0.08] shadow-md text-gray-500 dark:text-gray-400 hover:text-violet-500 dark:hover:text-violet-400 transition-all duration-100 cursor-pointer hover:scale-105"
              title="Copy LaTeX formula"
            >
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-1.5 rounded-lg bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-200 dark:border-white/[0.08] shadow-md text-gray-500 dark:text-gray-400 hover:text-violet-500 dark:hover:text-violet-400 transition-all duration-100 cursor-pointer hover:scale-105"
              title="Edit LaTeX formula"
            >
              <Edit2 size={13} />
            </button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}
