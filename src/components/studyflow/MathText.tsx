import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/** Renders Markdown with LaTeX math ($...$ inline, $$...$$ block). `inline` drops paragraph wrappers. */
export function MathText({ children, inline = false }: { children: string; inline?: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={inline ? { p: ({ children }) => <>{children}</> } : undefined}
    >
      {children}
    </ReactMarkdown>
  );
}
