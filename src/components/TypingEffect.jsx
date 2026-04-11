import { useState, useEffect, useRef } from 'react';

export default function TypingEffect({ text, speed = 50, delay = 1000, onComplete }) {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
    setDisplayedText('');
    indexRef.current = 0;
  }, [text]);

  useEffect(() => {
    const initTimer = setTimeout(() => {
      indexRef.current = 0;
      const timer = setInterval(() => {
        if (indexRef.current < textRef.current.length) {
          setDisplayedText(prev => prev + textRef.current.charAt(indexRef.current));
          indexRef.current++;
        } else {
          clearInterval(timer);
          onComplete?.();
        }
      }, speed);
      return () => clearInterval(timer);
    }, delay);
    return () => clearTimeout(initTimer);
  }, [text, speed, delay, onComplete]);

  return (
    <span className="typing-effect">
      {displayedText}
      <span className="typing-cursor" />
    </span>
  );
}