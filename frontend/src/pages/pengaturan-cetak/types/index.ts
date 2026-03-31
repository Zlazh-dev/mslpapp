export type CanvasElement = {
    id: string;
    type: 'text' | 'field' | 'image' | 'rect' | 'circle' | 'qrcode' | 'group';
    x: number;
    y: number;
    w: number;
    h: number;
    value?: string;
    field?: string;
    groupId?: string; // Menyatakan elemen ini adalah anak dari sebuah grup
    style: React.CSSProperties & {
        strokeWidth?: number | string;
        strokeColor?: string;
        strokeStyle?: 'solid' | 'dashed' | 'dotted';
    };
};

export type PrintTemplate = {
    id: string;
    name: string;
    updatedAt: number;
    isDefault: boolean;
    elements: CanvasElement[];
};
