import { useState, useCallback } from 'react';
import { CanvasElement } from '../types';

export function useEditorHistory(initialState: CanvasElement[] = []) {
    const [past, setPast] = useState<CanvasElement[][]>([]);
    const [present, setPresent] = useState<CanvasElement[]>(initialState);
    const [future, setFuture] = useState<CanvasElement[][]>([]);

    const setElements = useCallback((newState: CanvasElement[] | ((prev: CanvasElement[]) => CanvasElement[])) => {
        setPresent(prevPresent => {
            const resolvedState = typeof newState === 'function' ? newState(prevPresent) : newState;
            
            // Avoid adding to past if no change
            if (JSON.stringify(prevPresent) === JSON.stringify(resolvedState)) {
                return prevPresent;
            }

            setPast(p => [...p, prevPresent]);
            setFuture([]); // Clear future on new action
            return resolvedState;
        });
    }, []);

    const resetHistory = useCallback((newState: CanvasElement[]) => {
        setPast([]);
        setPresent(newState);
        setFuture([]);
    }, []);

    const undo = useCallback(() => {
        if (past.length === 0) return;
        
        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        
        setPast(newPast);
        setFuture(f => [present, ...f]);
        setPresent(previous);
    }, [past, present]);

    const redo = useCallback(() => {
        if (future.length === 0) return;
        
        const next = future[0];
        const newFuture = future.slice(1);
        
        setPast(p => [...p, present]);
        setPresent(next);
        setFuture(newFuture);
    }, [future, present]);

    return {
        elements: present,
        setElements,
        resetHistory,
        undo,
        redo,
        canUndo: past.length > 0,
        canRedo: future.length > 0
    };
}
