
import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`prose prose-invert prose-xs sm:prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({node, ...props}) => <h1 className="text-base sm:text-2xl font-black text-white border-b border-slate-800 pb-2 sm:pb-4 mb-3 sm:mb-6 uppercase tracking-tight" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-[10px] sm:text-lg font-bold text-blue-400 my-2 sm:my-4 uppercase tracking-[0.2em]" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-[9px] sm:text-md font-black text-emerald-400 mt-3 sm:mt-8 mb-2 sm:mb-4 flex items-center gap-2 border-l-[2px] sm:border-l-4 border-emerald-500 pl-2 sm:pl-4 bg-emerald-500/5 py-1 sm:py-2 rounded-r-lg" {...props} />,
          h4: ({node, ...props}) => <h4 className="text-[9px] sm:text-sm font-black text-slate-100 mt-2 sm:mt-6 mb-1 flex items-center gap-2 uppercase tracking-widest" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 sm:my-4 space-y-1 sm:space-y-2 text-slate-300 text-[10px] sm:text-base" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 sm:my-4 space-y-1 sm:space-y-3 text-slate-300 bg-slate-900/40 p-3 sm:p-5 rounded-xl border border-slate-800/60 text-[10px] sm:text-base" {...props} />,
          li: ({node, ...props}) => <li className="text-slate-300 leading-relaxed font-medium" {...props} />,
          strong: ({node, ...props}) => <strong className="text-blue-300 font-black" {...props} />,
          p: ({node, ...props}) => <p className="mb-2 sm:mb-4 text-slate-300 leading-relaxed text-[10px] sm:text-base" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-blue-500 pl-3 my-3 italic text-slate-400 bg-slate-800/30 py-2.5 pr-3 rounded-r-xl text-[9px] sm:text-sm" {...props} />,
          a: ({node, ...props}) => <a className="text-blue-400 hover:underline font-bold" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
