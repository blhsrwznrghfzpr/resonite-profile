import { useState } from 'preact/hooks';

interface Props {
  text: string;
  class?: string;
}

export function CopyableText({ text, class: className }: Props) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState(false);

  async function handleClick(e: MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFallback(false);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for non-HTTPS, denied permissions, or unsupported browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      setFallback(!success);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setFallback(false);
      }, 1500);
    }
  }

  return (
    <span
      class={`copyable${className ? ` ${className}` : ''}`}
      onClick={handleClick}
    >
      {text}
      <svg class="copy-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
      </svg>
      <div class={`copy-feedback${copied ? ' show' : ''}`}>
        {fallback ? 'テキストを選択しました' : 'コピーしました!'}
      </div>
    </span>
  );
}
