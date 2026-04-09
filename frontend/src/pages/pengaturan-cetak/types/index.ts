export type TableColumnType = 'db' | 'static';

export type TableColumn = {
    id: string;
    label: string;
    type: TableColumnType;
    field?: string;          // DB field jika type='db' (e.g. 'namaLengkap', 'nis')
    width: number;           // percentage 0-100
    align?: 'left' | 'center' | 'right';
};

export type TableRow = {
    id: string;
    cells: Record<string, string>; // columnId → value (hanya untuk kolom statis)
};

export type CanvasElement = {
    id: string;
    type: 'text' | 'field' | 'image' | 'rect' | 'circle' | 'qrcode' | 'group' | 'table';
    x: number;
    y: number;
    w: number;
    h: number;
    value?: string;
    field?: string;
    groupId?: string; // Menyatakan elemen ini adalah anak dari sebuah grup
    groupName?: string; // Nama grup yang bisa di-rename
    tableConfig?: {
        dataType: 'presensi' | 'jadwal' | 'custom';
        headerColor?: string;
        columns?: TableColumn[];
        rows?: TableRow[];
        borderStyle?: 'solid' | 'none';
        cellPadding?: number;
        tableFontSize?: number;
    };
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
