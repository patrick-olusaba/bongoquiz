import React, { useState } from "react";

export const OceanBackground: React.FC = () => {
    const [bubbles] = useState<Array<React.CSSProperties>>(() =>
        Array.from({ length: 20 }).map(() => ({
            left: `${Math.random() * 100}%`,
            width: `${Math.random() * 30 + 10}px`,
            height: `${Math.random() * 30 + 10}px`,
            animationDuration: `${Math.random() * 3 + 3}s`,
            animationDelay: `${Math.random() * 2}s`,
        }))
    );

    return (
        <div className="ocean-background">
            <div className="bubbles">
                {bubbles.map((style, i) => (
                    <div
                        key={i}
                        className="bubble"
                        style={style}
                    />
                ))}
            </div>
            <div className="wave wave1"></div>
            <div className="wave wave2"></div>
            <div className="wave wave3"></div>
        </div>
    );
};
