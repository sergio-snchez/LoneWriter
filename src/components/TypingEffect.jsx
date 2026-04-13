import { useState, useEffect, useRef } from 'react';

export default function TypingEffect({ text, speed = 50, delay = 1000, onComplete }) {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);
  const textRef = useRef(text);
  const hasCompleted = useRef(false);
  const isRunning = useRef(false);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    if (hasCompleted.current || isRunning.current) return;
    
    isRunning.current = true;
    setDisplayedText('');
    indexRef.current = 0;

    const initTimer = setTimeout(() => {
      const timer = setInterval(() => {
        if (indexRef.current < textRef.current.length) {
          setDisplayedText(prev => prev + textRef.current.charAt(indexRef.current));
          indexRef.current++;
        } else {
          clearInterval(timer);
          isRunning.current = false;
          hasCompleted.current = true;
          onComplete?.();
        }
      }, speed);
      return () => {
        clearInterval(timer);
        isRunning.current = false;
      };
    }, delay);

    return () => {
      clearTimeout(initTimer);
      isRunning.current = false;
    };
  }, [text, speed, delay, onComplete]);

  return (
    <span className="typing-effect">
      {displayedText}
      <span className="typing-cursor" />
    </span>
  );
}