import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { Pegawai, Absen, KeteranganAbsen } from "../types";
import { clusterOptions } from "../constants";

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
        // hasil data:image/png;base64,xxxx
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
    { width: 6 },   // A NO
    { width: 6 },   // B NO internal
    { width: 40 },  // C NAMA
    { width: 24 },  // D NIP
    { width: 10 },  // E HADIR
    { width: 14 },  // F DINAS LUAR
    { width: 14 },  // G DINAS DALAM
    { width: 9 },   // H CUTI
    { width: 9 },   // I SAKIT
    { width: 9 },   // J ALPA
    { width: 9 },   // K IZIN
    { width: 18 },  // M TOTAL KEHADIRAN
  ];

  // HEADER ATAS
  worksheet.mergeCells("A1:M2");
  const topCell = worksheet.getCell("A1");
  topCell.value = "";
  topCell.alignment = { horizontal: "center", vertical: "middle" };
  topCell.border = {
    top: { style: "thin", color: { argb: GREEN } },
    left: { style: "thin", color: { argb: GREEN } },
    bottom: { style: "thin", color: { argb: GREEN } },
    right: { style: "thin", color: { argb: GREEN } },
  };

  // LOGO
  const logoBase64 = await imageUrlToBase64("/logo_bsn.png");
  if (logoBase64) {
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: "png",
    });

    worksheet.addImage(imageId, {
      tl: { col: 6.15, row: 0.12 },
      ext: { width: 58, height: 58 },
    });
  }

  // JUDUL
  worksheet.mergeCells("A4:M4");
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

  worksheet.mergeCells("A5:M5");
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

  worksheet.mergeCells("A6:M6");
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
  worksheet.mergeCells("A8:M8");
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

    // HEADER TABEL
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
        const isTotal = index === 12;

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

  worksheet.mergeCells(`J${currentRow}:M${currentRow}`);
  worksheet.getCell(`J${currentRow}`).value = "Mengetahui,";
  worksheet.getCell(`J${currentRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  currentRow++;

  worksheet.mergeCells(`J${currentRow}:M${currentRow}`);
  worksheet.getCell(`J${currentRow}`).value = jabatanPenanggungJawab || "";
  worksheet.getCell(`J${currentRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  currentRow += 4;

  worksheet.mergeCells(`J${currentRow}:M${currentRow}`);
  worksheet.getCell(`J${currentRow}`).value = penanggungJawab || "";
  worksheet.getCell(`J${currentRow}`).font = {
    bold: true,
    size: 12,
    color: { argb: BLACK },
  };
  worksheet.getCell(`J${currentRow}`).alignment = {
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