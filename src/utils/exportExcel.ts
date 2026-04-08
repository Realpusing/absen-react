import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { Pegawai, Absen, KeteranganAbsen } from "../types";
import { clusterOptions } from "../constants";
import logoBsn from "../assets/logo_bsn.png";  // ← IMPORT LOGO

interface ExportRekapParams {
  pegawaiList: Pegawai[];
  absenList: Absen[];
  kegiatanLabel: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  penanggungJawab: string;
  jabatanPenanggungJawab: string;
  hariKerja?: number;
}

type RekapItem = {
  pegawai: Pegawai;
  hadir: number;
  dinasLuar: number;
  dinasDalam: number;
  cuti: number;
  sakit: number;
  alpha: number;
  izin: number;
  totalKehadiran: number;
};

const YELLOW = "FFFF00";
const SOFT_YELLOW = "FFF2CC";
const BLACK = "FF000000";
const GREEN = "FF008000";

function countStatus(absenList: Absen[], pegawaiId: number, status: KeteranganAbsen) {
  return absenList.filter(
    (a) => a.pegawai_id === pegawaiId && a.keterangan === status
  ).length;
}

function buildRekap(pegawaiList: Pegawai[], absenList: Absen[]): RekapItem[] {
  return pegawaiList.map((pegawai) => {
    const hadir = countStatus(absenList, pegawai.id, "Hadir");
    const dinasLuar = countStatus(absenList, pegawai.id, "Dinas Luar");
    const dinasDalam = countStatus(absenList, pegawai.id, "Dinas Dalam");
    const cuti = countStatus(absenList, pegawai.id, "Cuti");
    const sakit = countStatus(absenList, pegawai.id, "Sakit");
    const alpha = countStatus(absenList, pegawai.id, "Alpha");
    const izin = countStatus(absenList, pegawai.id, "Izin");

    return {
      pegawai,
      hadir,
      dinasLuar,
      dinasDalam,
      cuti,
      sakit,
      alpha,
      izin,
      totalKehadiran: hadir + dinasLuar + dinasDalam,
    };
  });
}

function applyBorder(cell: ExcelJS.Cell, color = BLACK) {
  cell.border = {
    top: { style: "thin", color: { argb: color } },
    left: { style: "thin", color: { argb: color } },
    bottom: { style: "thin", color: { argb: color } },
    right: { style: "thin", color: { argb: color } },
  };
}

function styleHeader(cell: ExcelJS.Cell) {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: YELLOW },
  };
  cell.font = {
    bold: true,
    size: 11,
    color: { argb: BLACK },
  };
  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  applyBorder(cell);
}

function styleBody(
  cell: ExcelJS.Cell,
  align: "left" | "center" = "center",
  isTotal = false
) {
  if (isTotal) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: SOFT_YELLOW },
    };
    cell.font = {
      bold: true,
      size: 11,
      color: { argb: BLACK },
    };
  } else {
    cell.font = {
      size: 11,
      color: { argb: BLACK },
    };
  }

  cell.alignment = {
    horizontal: align,
    vertical: "middle",
    wrapText: true,
  };

  applyBorder(cell);
}

async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Gagal convert logo:", error);
    return null;
  }
}

export async function exportToExcel({
  pegawaiList,
  absenList,
  kegiatanLabel,
  tanggalMulai,
  tanggalSelesai,
  penanggungJawab,
  jabatanPenanggungJawab,
  hariKerja = 22,
}: ExportRekapParams) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Rekap Absen");

  worksheet.properties.defaultRowHeight = 24;
  worksheet.pageSetup.orientation = "landscape";
  worksheet.pageSetup.paperSize = 9;
  worksheet.pageSetup.fitToPage = true;

  worksheet.columns = [
    { width: 6 },
    { width: 6 },
    { width: 40 },
    { width: 24 },
    { width: 10 },
    { width: 14 },
    { width: 14 },
    { width: 9 },
    { width: 9 },
    { width: 9 },
    { width: 9 },
    { width: 18 },
  ];

  // HEADER ATAS
  worksheet.mergeCells("A1:L2");  // ← Ubah M jadi L (12 kolom)
  const topCell = worksheet.getCell("A1");
  topCell.value = "";
  topCell.alignment = { horizontal: "center", vertical: "middle" };
  topCell.border = {
    top: { style: "thin", color: { argb: GREEN } },
    left: { style: "thin", color: { argb: GREEN } },
    bottom: { style: "thin", color: { argb: GREEN } },
    right: { style: "thin", color: { argb: GREEN } },
  };

  // LOGO - GUNAKAN IMPORT
  const logoBase64 = await imageUrlToBase64(logoBsn);  // ← UBAH INI
  if (logoBase64) {
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: "png",
    });

    worksheet.addImage(imageId, {
      tl: { col: 5.5, row: 0.12 },  // ← Sesuaikan posisi (12 kolom)
      ext: { width: 58, height: 58 },
    });
  }

  // JUDUL
  worksheet.mergeCells("A4:L4");  // ← Ubah M jadi L
  worksheet.getCell("A4").value = kegiatanLabel.toUpperCase();
  worksheet.getCell("A4").font = {
    bold: true,
    size: 18,
    color: { argb: BLACK },
  };
  worksheet.getCell("A4").alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  worksheet.mergeCells("A5:L5");  // ← Ubah M jadi L
  worksheet.getCell("A5").value = "KANTOR PENCARIAN DAN PERTOLONGAN TARAKAN";
  worksheet.getCell("A5").font = {
    bold: true,
    size: 14,
    color: { argb: BLACK },
  };
  worksheet.getCell("A5").alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  worksheet.mergeCells("A6:L6");  // ← Ubah M jadi L
  const bulanTahun = new Date(tanggalMulai).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
  worksheet.getCell("A6").value = `BULAN ${bulanTahun.toUpperCase()}`;
  worksheet.getCell("A6").font = {
    bold: true,
    size: 13,
    color: { argb: BLACK },
  };
  worksheet.getCell("A6").alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  // HARI KERJA
  worksheet.mergeCells("A8:L8");  // ← Ubah M jadi L
  const hariCell = worksheet.getCell("A8");
  hariCell.value = `HARI KERJA : ${hariKerja} HARI`;
  hariCell.font = {
    bold: true,
    size: 12,
    color: { argb: BLACK },
  };
  hariCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: YELLOW },
  };
  hariCell.alignment = {
    horizontal: "left",
    vertical: "middle",
  };
  applyBorder(hariCell);

  let currentRow = 9;
  let nomorGlobal = 1;

  for (const cluster of clusterOptions) {
    const list = pegawaiList
      .filter((p) => p.cluster === cluster)
      .sort((a, b) => {
        const urutanA = a.urutan ?? 999999;
        const urutanB = b.urutan ?? 999999;
        return urutanA - urutanB;
      });

    if (list.length === 0) continue;

    const rekap = buildRekap(list, absenList);

    const headerRow = worksheet.getRow(currentRow);
    const headers = [
      "NO",
      "NO",
      "NAMA",
      "NIP",
      "HADIR",
      "DINAS LUAR",
      "DINAS DALAM",
      "CUTI",
      "SAKIT",
      "ALPA",
      "IZIN",
      "TOTAL KEHADIRAN",
    ];

    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      styleHeader(cell);
    });

    headerRow.height = 32;
    currentRow++;

    let nomorCluster = 1;

    rekap.forEach((item) => {
      const row = worksheet.getRow(currentRow);

      const values = [
        nomorGlobal,
        nomorCluster,
        item.pegawai.nama_pegawai,
        item.pegawai.nip,
        item.hadir,
        item.dinasLuar,
        item.dinasDalam,
        item.cuti,
        item.sakit,
        item.alpha,
        item.izin,
        item.totalKehadiran,
      ];

      values.forEach((value, index) => {
        const cell = row.getCell(index + 1);
        cell.value = value;

        const isText = index === 2 || index === 3;
        const isTotal = index === 11;  // ← Ubah dari 12 jadi 11

        styleBody(cell, isText ? "left" : "center", isTotal);
      });

      row.height = 24;
      nomorGlobal++;
      nomorCluster++;
      currentRow++;
    });
  }

  // TTD
  currentRow += 2;

  worksheet.mergeCells(`I${currentRow}:L${currentRow}`);  // ← Ubah J:M jadi I:L
  worksheet.getCell(`I${currentRow}`).value = "Mengetahui,";
  worksheet.getCell(`I${currentRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  currentRow++;

  worksheet.mergeCells(`I${currentRow}:L${currentRow}`);  // ← Ubah J:M jadi I:L
  worksheet.getCell(`I${currentRow}`).value = jabatanPenanggungJawab || "";
  worksheet.getCell(`I${currentRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  currentRow += 4;

  worksheet.mergeCells(`I${currentRow}:L${currentRow}`);  // ← Ubah J:M jadi I:L
  worksheet.getCell(`I${currentRow}`).value = penanggungJawab || "";
  worksheet.getCell(`I${currentRow}`).font = {
    bold: true,
    size: 12,
    color: { argb: BLACK },
  };
  worksheet.getCell(`I${currentRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  worksheet.views = [
    {
      state: "frozen",
      ySplit: 9,
    },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(
    blob,
    `Rekap_Absen_${kegiatanLabel.replace(/\s+/g, "_")}_${tanggalMulai}_sd_${tanggalSelesai}.xlsx`
  );
}