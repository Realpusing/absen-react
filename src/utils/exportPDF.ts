import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { clusterOptions, keteranganOptions } from "../constants";
import type { Pegawai, KeteranganAbsen } from "../types";
import { formatDateID } from "./helper";

interface Params {
  absenPegawaiList: Pegawai[];
  getAbsenStatus: (pegawaiId: number) => KeteranganAbsen | null;
  selectedDate: string;
  kegiatanLabel: string;
}

export function exportToPDF({
  absenPegawaiList,
  getAbsenStatus,
  selectedDate,
  kegiatanLabel,
}: Params) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.text(kegiatanLabel, 14, 15);
  doc.setFontSize(10);
  doc.text(`Tanggal: ${formatDateID(selectedDate)}`, 14, 22);

  let startY = 30;

  clusterOptions.forEach((cluster) => {
    const list = absenPegawaiList.filter((p) => p.cluster === cluster);
    if (list.length === 0) return;

    doc.setFontSize(12);
    doc.text(`${cluster}`, 14, startY);

    const body = list.map((pegawai, index) => {
      const status = getAbsenStatus(pegawai.id);
      return [
        index + 1,
        pegawai.nama_pegawai,
        pegawai.nip,
        pegawai.jabatan || "-",
        ...keteranganOptions.map((ket) => (status === ket ? "V" : "")),
      ];
    });

    autoTable(doc, {
      startY: startY + 4,
      head: [["No", "Nama Pegawai", "NIP", "Jabatan", ...keteranganOptions]],
      body,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    startY = (doc as any).lastAutoTable.finalY + 10;
  });

  doc.save(`Absensi_${kegiatanLabel}_${selectedDate}.pdf`);
}