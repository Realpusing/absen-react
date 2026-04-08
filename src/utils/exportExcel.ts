import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { clusterOptions, keteranganOptions } from "../constants";
import type { Pegawai, KeteranganAbsen } from "../types";

interface Params {
  absenPegawaiList: Pegawai[];
  getAbsenStatus: (pegawaiId: number) => KeteranganAbsen | null;
  selectedDate: string;
  kegiatanLabel: string;
}

export function exportToExcel({
  absenPegawaiList,
  getAbsenStatus,
  selectedDate,
  kegiatanLabel,
}: Params) {
  const rows: Record<string, string>[] = [];
  let no = 0;

  clusterOptions.forEach((cluster) => {
    const list = absenPegawaiList.filter((p) => p.cluster === cluster);
    list.forEach((pegawai) => {
      no++;
      const status = getAbsenStatus(pegawai.id);
      const row: Record<string, string> = {
        No: String(no),
        Cluster: cluster,
        "Nama Pegawai": pegawai.nama_pegawai,
        NIP: pegawai.nip,
        NIK: pegawai.nik,
        Jabatan: pegawai.jabatan || "-",
      };

      keteranganOptions.forEach((ket) => {
        row[ket] = status === ket ? "V" : "";
      });

      row["Keterangan"] = status || "Belum Absen";
      rows.push(row);
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Absensi");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, `Absensi_${kegiatanLabel}_${selectedDate}.xlsx`);
}