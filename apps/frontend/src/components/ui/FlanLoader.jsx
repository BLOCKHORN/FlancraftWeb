import React, { useEffect, useState } from 'react';
import './FlanLoader.scss';

const FlanLoader = ({ isReady, onComplete }) => {
  const [startZoom, setStartZoom] = useState(false);

  useEffect(() => {
    if (isReady) {
      setStartZoom(true);
      const timer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isReady, onComplete]);

  return (
    <div className={`flan-intro-overlay ${startZoom ? 'zoom-out' : ''}`}>
      <div className="flan-logo-container">
        <svg
          className="flan-logo-svg"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="flan-logo-base"
            d="M 45 10 Q 50 8 55 10 L 78 17 Q 82 18 84 23 L 93 64 Q 94 68 90 71 L 55 90 Q 50 93 45 90 L 10 71 Q 6 68 7 64 L 16 23 Q 18 18 22 17 Z"
          />
          <path
            className="flan-logo-path"
            d="M 45 10 Q 50 8 55 10 L 78 17 Q 82 18 84 23 L 93 64 Q 94 68 90 71 L 55 90 Q 50 93 45 90 L 10 71 Q 6 68 7 64 L 16 23 Q 18 18 22 17 Z"
          />
        </svg>
      </div>
    </div>
  );
};

export default FlanLoader;