import React from 'react';

interface TextRevealProps {
  text: string;
  className?: string;
  delay?: number;
}

export const TextReveal: React.FC<TextRevealProps> = ({ text, className = "", delay = 0 }) => {
  return (
    <div className={`inline-flex flex-wrap justify-center ${className}`} aria-label={text}>
      {text.split("").map((char, i) => (
        <span
          key={`${text}-${i}`}
          className="inline-block opacity-0 will-change-[transform,opacity,filter] animate-cinematic-reveal"
          style={{
            animationDelay: `${delay + (i * 0.03)}s`,
            whiteSpace: 'pre'
          }}
        >
          {char}
        </span>
      ))}
    </div>
  );
};
