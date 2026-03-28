export type CanvasElement = {
    id: string;
    type: 'text' | 'field' | 'image' | 'rect' | 'qrcode';
    x: number;
    y: number;
    w: number;
    h: number;
    value?: string;
    field?: string;
    style: React.CSSProperties;
};

export type PrintTemplate = {
    id: string;
    name: string;
    updatedAt: number;
    isDefault: boolean;
    elements: CanvasElement[];
};
