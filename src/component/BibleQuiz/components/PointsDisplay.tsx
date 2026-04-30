import React, { useEffect, useState, useRef } from 'react';
import '../style/pointsdisplay.css';

interface PointsDisplayProps {
    currentPoints: number;
}

export const PointsDisplay: React.FC<PointsDisplayProps> = ({
                                                                currentPoints
                                                            }) => {
    const [isChanged, setIsChanged] = useState(false);
    const prevPointsRef = useRef(currentPoints);

    useEffect(() => {
        if (currentPoints !== prevPointsRef.current) {
            setIsChanged(true);
            prevPointsRef.current = currentPoints;

            const timer = setTimeout(() => setIsChanged(false), 500);
            return () => clearTimeout(timer);
        }
    }, [currentPoints]);

    return (
        <div className="simple-points-display">
            <div className="points-label">POINTS</div>
            <div className="points-separator">|</div>
            <div className={`points-value ${isChanged ? 'changed' : ''}`}>
                {currentPoints}
            </div>
        </div>
    );
};