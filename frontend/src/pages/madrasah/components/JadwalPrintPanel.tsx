import PrintSidebar from '../../../components/PrintSidebar';

const HARI_NAMES = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

interface JadwalPrintPanelProps {
    isOpen: boolean;
    onClose: () => void;
    hari: number;
}

export function JadwalPrintPanel({ isOpen, onClose, hari }: JadwalPrintPanelProps) {
    const hariName = HARI_NAMES[hari] || String(hari);

    return (
        <PrintSidebar
            isOpen={isOpen}
            onClose={onClose}
            title="Cetak Jadwal"
            subtitle={`Hari ${hariName} — semua kelas`}
            pdfEndpoint="/pdf/jadwal/hari"
            requestBody={{ hari }}
            filenamePrefix={`jadwal_${hariName}`}
        />
    );
}
