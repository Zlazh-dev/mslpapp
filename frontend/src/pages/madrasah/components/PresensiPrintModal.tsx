import PrintSidebar from '../../../components/PrintSidebar';

interface PresensiPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    kelasId: string;
    kelasName?: string;
}

export function PresensiPrintModal({ isOpen, onClose, kelasId, kelasName }: PresensiPrintModalProps) {
    return (
        <PrintSidebar
            isOpen={isOpen}
            onClose={onClose}
            title="Cetak Presensi"
            subtitle={kelasName || `Kelas ${kelasId}`}
            pdfEndpoint="/pdf/presensi/kelas"
            requestBody={{ kelasId: Number(kelasId) }}
            filenamePrefix={`presensi_${kelasName || kelasId}`}
        />
    );
}
