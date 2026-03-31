import { CanvasElement } from '../types';

export function groupElements(elements: CanvasElement[], selectedIds: string[]): CanvasElement[] {
    if (selectedIds.length < 2) return elements;
    const groupId = 'group_' + Date.now();
    return elements.map(el => selectedIds.includes(el.id) ? { ...el, groupId } : el);
}

export function ungroupElements(elements: CanvasElement[], selectedIds: string[]): CanvasElement[] {
    const targetGroupIds = new Set(elements.filter(el => selectedIds.includes(el.id) && el.groupId).map(el => el.groupId));
    if (targetGroupIds.size === 0) return elements;
    return elements.map(el => (el.groupId && targetGroupIds.has(el.groupId)) ? { ...el, groupId: undefined } : el);
}

export function getFullySelectedGroupIds(elements: CanvasElement[], currentSelection: string[]): string[] {
    const selectedGroups = new Set(elements.filter(el => currentSelection.includes(el.id) && el.groupId).map(el => el.groupId));
    if (selectedGroups.size === 0) return currentSelection;
    
    const additionalIds = elements.filter(el => el.groupId && selectedGroups.has(el.groupId)).map(el => el.id);
    return Array.from(new Set([...currentSelection, ...additionalIds]));
}

export function getBoundingBox(elements: CanvasElement[], selectedIds: string[]) {
    if (selectedIds.length === 0) return null;
    const selected = elements.filter(el => selectedIds.includes(el.id));
    if (selected.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selected.forEach(el => {
        if (el.x < minX) minX = el.x;
        if (el.y < minY) minY = el.y;
        if (el.x + el.w > maxX) maxX = el.x + el.w;
        if (el.y + el.h > maxY) maxY = el.y + el.h;
    });

    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
