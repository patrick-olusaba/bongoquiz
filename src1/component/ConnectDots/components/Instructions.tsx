import React from 'react';

export const Instructions: React.FC = () => {
  return (
    <div className="instructions-card">
      <div className="instructions-content">
        
        <div className="instruction-item">
          <div className="instruction-graphic-container">
            <div className="connect-dots-graphic">
              <div className="connect-dots-line" />
              <div className="connect-dots-numbers">
                <div className="connect-dot">1</div>
                <div className="connect-dot">2</div>
                <div className="connect-dot">3</div>
              </div>
            </div>
          </div>
          <p className="instruction-text">Connect the dots in order</p>
        </div>

        <div className="instruction-item">
          <div className="instruction-graphic-container">
            <div className="fill-cell-graphic">
               {/* Just decorative path representation */}
               <div className="fill-cell-path-container">
                  <svg viewBox="0 0 100 100" className="fill-cell-path" fill="none" stroke="currentColor" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M 15 15 L 15 85 L 50 85 L 50 15 L 85 15 L 85 85" />
                  </svg>
               </div>
               {Array.from({length: 9}).map((_, i) => (
                 <div key={i} className="fill-cell-grid-item" />
               ))}
            </div>
          </div>
          <p className="instruction-text">Fill every cell</p>
        </div>

      </div>
    </div>
  );
};
