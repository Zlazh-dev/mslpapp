import React from 'react';
import { CanvasElement } from '../types';

interface ShapeElementProps {
    el: CanvasElement;
}

export const ShapeElement: React.FC<ShapeElementProps> = ({ el }) => {
    const rx = el.w / 2;
    const ry = el.h / 2;
    const isCircle = el.type === 'circle';

    return (
        <svg fill="none" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{pointerEvents: 'none'}}>
            {isCircle ? (
                <ellipse 
                    cx={rx} 
                    cy={ry} 
                    rx={Math.max(0, rx - 1)} 
                    ry={Math.max(0, ry - 1)} 
                    fill={String(el.style?.backgroundColor || 'transparent')} 
                    stroke={typeof el.style?.border === 'string' ? (el.style.border.split(' ')[2] || String(el.style.borderColor || '#000')) : String(el.style?.borderColor || '#000')}
                    strokeWidth={typeof el.style?.border === 'string' ? (parseInt(el.style.border) || 1) : 1}
                />
            ) : (
                <rect 
                    x={1} 
                    y={1} 
                    width={Math.max(0, el.w - 2)} 
                    height={Math.max(0, el.h - 2)} 
                    rx={typeof el.style?.borderRadius === 'string' ? parseInt(el.style.borderRadius) || 0 : typeof el.style?.borderRadius === 'number' ? el.style.borderRadius : 0}
                    fill={String(el.style?.backgroundColor || 'transparent')} 
                    stroke={typeof el.style?.border === 'string' ? (el.style.border.split(' ')[2] || String(el.style.borderColor || '#000')) : String(el.style?.borderColor || '#000')}
                    strokeWidth={typeof el.style?.border === 'string' ? (parseInt(el.style.border) || 1) : 1}
                />
            )}
        </svg>
    );
};
