import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { Pegawai, Absen, KeteranganAbsen, KolomAbsen, Absensi, AbsensiKeterangan } from "../types";
import { clusterOptions } from "../constants";
import logoBsn from "../assets/logo_bsn.png";

interface ExportRekapParams {
  pegawaiList: Pegawai[];
  absenList: Absen[];
  kegiatanLabel: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  penanggungJawab: string;
  jabatanPenanggungJawab: string;
  hariKerja?: number;
  
  // DATA KEGIATAN
  kolomAbsenList?: KolomAbsen[];
  absensiData?: Absensi[];
  absensiKeteranganData?: AbsensiKeterangan[];
  keteranganColumns?: KeteranganAbsen[];
  isKegiatanMode?: boolean;
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
const BLUE = "FF0EA5E9";
const LIGHT_BLUE = "FFE0F2FE";
const SOFT_GRAY = "FFF1F5F9";

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

function styleHeader(cell: ExcelJS.Cell, bgColor = YELLOW, textColor = BLACK) {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: bgColor },
  };
  cell.font = {
    bold: true,
    size: 11,
    color: { argb: textColor },
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

// ═══════════════════════════════════════════════════════════════
// HELPER: GROUP KOLOM BY KATEGORI
// ═══════════════════════════════════════════════════════════════
function groupKolomByKategori(kolomList: KolomAbsen[]) {
  const map = new Map<string, KolomAbsen[]>();
  for (const k of kolomList) {
    if (!map.has(k.nama_kategori)) map.set(k.nama_kategori, []);
    map.get(k.nama_kategori)!.push(k);
  }
  return map;
}

// ═══════════════════════════════════════════════════════════════
// CONVERT NUMBER TO COLUMN LETTER
// ═══════════════════════════════════════════════════════════════
function getColumnLetter(colNumber: number): string {
  let letter = "";
  while (colNumber > 0) {
    const remainder = (colNumber - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    colNumber = Math.floor((colNumber - 1) / 26);
  }
  return letter;
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT FUNCTION
// ═══════════════════════════════════════════════════════════════
export async function exportToExcel({
  pegawaiList,
  absenList,
  kegiatanLabel,
  tanggalMulai,
  tanggalSelesai,
  penanggungJawab,
  jabatanPenanggungJawab,
  hariKerja = 22,
  kolomAbsenList = [],
  absensiData = [],
  absensiKeteranganData = [],
  keteranganColumns = [],
  isKegiatanMode = false,
}: ExportRekapParams) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Rekap Absen");

  worksheet.properties.defaultRowHeight = 24;
  worksheet.pageSetup.orientation = "landscape";
  worksheet.pageSetup.paperSize = 9;
  worksheet.pageSetup.fitToPage = true;

  // ═══════════════════════════════════════════════════════════════
  // HITUNG STRUKTUR KOLOM
  // ═══════════════════════════════════════════════════════════════
  const groupedKolom = groupKolomByKategori(kolomAbsenList);
  const allMetode = [...groupedKolom.values()].flat();
  
  const baseColumns = 4; // NO, NO, NAMA, NIP
  const penilaianColumns = allMetode.length;
  const keteranganColumnsCount = keteranganColumns.length;
  
  let totalColumns: number;

  if (isKegiatanMode && (penilaianColumns > 0 || keteranganColumnsCount > 0)) {
    totalColumns = baseColumns + penilaianColumns + keteranganColumnsCount;
  } else {
    totalColumns = 12; // Standard mode
  }

  const lastColumnLetter = getColumnLetter(totalColumns);

  // ═══════════════════════════════════════════════════════════════
  // SET COLUMN WIDTHS
  // ═══════════════════════════════════════════════════════════════
  const columnWidths: number[] = [6, 6, 40, 24]; // NO, NO, NAMA, NIP

  if (isKegiatanMode) {
    // Width untuk kolom penilaian
    for (let i = 0; i < penilaianColumns; i++) {
      columnWidths.push(15);
    }
    // Width untuk kolom keterangan
    for (let i = 0; i < keteranganColumnsCount; i++) {
      columnWidths.push(12);
    }
  } else {
    // Standard mode
    columnWidths.push(10, 14, 14, 9, 9, 9, 9, 18);
  }

  worksheet.columns = columnWidths.map(width => ({ width }));

  // ═══════════════════════════════════════════════════════════════
  // HEADER ATAS
  // ═══════════════════════════════════════════════════════════════
  worksheet.mergeCells(`A1:${lastColumnLetter}2`);
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
  const logoBase64 = await imageUrlToBase64(logoBsn);
  if (logoBase64) {
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: "png",
    });

    const logoCol = totalColumns / 2 - 0.5;
    worksheet.addImage(imageId, {
      tl: { col: logoCol, row: 0.12 },
      ext: { width: 58, height: 58 },
    });
  }

  // JUDUL
  worksheet.mergeCells(`A4:${lastColumnLetter}4`);
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

  worksheet.mergeCells(`A5:${lastColumnLetter}5`);
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

  worksheet.mergeCells(`A6:${lastColumnLetter}6`);
  const bulanTahun = new Date(tanggalMulai).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
  worksheet.getCell("A6").value = `TANGGAL: ${new Date(tanggalMulai).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`;
  worksheet.getCell("A6").font = {
    bold: true,
    size: 13,
    color: { argb: BLACK },
  };
  worksheet.getCell("A6").alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  // HARI KERJA (hanya untuk mode harian)
  if (!isKegiatanMode) {
    worksheet.mergeCells(`A8:${lastColumnLetter}8`);
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
  }

  let currentRow = isKegiatanMode ? 8 : 9;
  let nomorGlobal = 1;

  // ═══════════════════════════════════════════════════════════════
  // LOOP PER CLUSTER
  // ═══════════════════════════════════════════════════════════════
  for (const cluster of clusterOptions) {
    const list = pegawaiList
      .filter((p) => p.cluster === cluster)
      .sort((a, b) => {
        const urutanA = a.urutan ?? 999999;
        const urutanB = b.urutan ?? 999999;
        return urutanA - urutanB;
      });

    if (list.length === 0) continue;

    // ═══════════════════════════════════════════════════════════════
    // HEADER TABEL (2-Level untuk mode kegiatan)
    // ═══════════════════════════════════════════════════════════════
    if (isKegiatanMode && (penilaianColumns > 0 || keteranganColumnsCount > 0)) {
      
      // ─────────────────────────────────────────────────────────────
      // ROW 1: KATEGORI (dengan merge per kategori) + "ABSEN"
      // ─────────────────────────────────────────────────────────────
      const headerRow1 = worksheet.getRow(currentRow);
      
      // Merge kolom base (NO, NO, NAMA, NIP) - rowspan 2
      worksheet.mergeCells(currentRow, 1, currentRow + 1, 1); // NO
      worksheet.mergeCells(currentRow, 2, currentRow + 1, 2); // NO
      worksheet.mergeCells(currentRow, 3, currentRow + 1, 3); // NAMA
      worksheet.mergeCells(currentRow, 4, currentRow + 1, 4); // NIP

      const noCell1 = worksheet.getCell(currentRow, 1);
      const noCell2 = worksheet.getCell(currentRow, 2);
      const namaCell = worksheet.getCell(currentRow, 3);
      const nipCell = worksheet.getCell(currentRow, 4);

      noCell1.value = "NO";
      noCell2.value = "NO";
      namaCell.value = "NAMA";
      nipCell.value = "NIP";

      styleHeader(noCell1);
      styleHeader(noCell2);
      styleHeader(namaCell);
      styleHeader(nipCell);

      let colIndex = 5;

      // Kategori penilaian dengan merge horizontal
      for (const [kategori, methods] of groupedKolom.entries()) {
        const startCol = colIndex;
        const endCol = colIndex + methods.length - 1;

        // Merge kategori
        if (methods.length > 1) {
          worksheet.mergeCells(currentRow, startCol, currentRow, endCol);
        }

        const cell = worksheet.getCell(currentRow, startCol);
        cell.value = kategori.toUpperCase();
        styleHeader(cell, SOFT_GRAY, BLACK);

        // Style cells yang di-merge juga
        if (methods.length > 1) {
          for (let c = startCol + 1; c <= endCol; c++) {
            styleHeader(worksheet.getCell(currentRow, c), SOFT_GRAY, BLACK);
          }
        }

        colIndex = endCol + 1;
      }

      // Header "ABSEN" dengan merge
      if (keteranganColumnsCount > 0) {
        const startCol = colIndex;
        const endCol = colIndex + keteranganColumnsCount - 1;

        if (keteranganColumnsCount > 1) {
          worksheet.mergeCells(currentRow, startCol, currentRow, endCol);
        }

        const cell = worksheet.getCell(currentRow, startCol);
        cell.value = "ABSEN";
        styleHeader(cell, LIGHT_BLUE, "FF0369A1");

        // Style cells yang di-merge
        if (keteranganColumnsCount > 1) {
          for (let c = startCol + 1; c <= endCol; c++) {
            styleHeader(worksheet.getCell(currentRow, c), LIGHT_BLUE, "FF0369A1");
          }
        }
      }

      headerRow1.height = 28;
      currentRow++;

      // ─────────────────────────────────────────────────────────────
      // ROW 2: SUB-HEADER (METODE + KETERANGAN)
      // ─────────────────────────────────────────────────────────────
      const headerRow2 = worksheet.getRow(currentRow);
      colIndex = 5;

      // Sub-header per metode
      for (const metode of allMetode) {
        const cell = headerRow2.getCell(colIndex);
        
        let cellValue = metode.metode || "-";
        if (metode.satuan) {
          cellValue += `\n(${metode.satuan})`;
        }
        
        cell.value = cellValue;
        styleHeader(cell, YELLOW, BLACK);
        colIndex++;
      }

      // Sub-header keterangan
      for (const ket of keteranganColumns) {
        const cell = headerRow2.getCell(colIndex);
        cell.value = ket;
        styleHeader(cell, BLUE, "FFFFFFFF");
        colIndex++;
      }

      headerRow2.height = 28;
      currentRow++;

    } else {
      // ─────────────────────────────────────────────────────────────
      // STANDARD HEADER (1 ROW) - MODE HARIAN
      // ─────────────────────────────────────────────────────────────
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
    }

    // ═══════════════════════════════════════════════════════════════
    // DATA ROWS
    // ═══════════════════════════════════════════════════════════════
    let nomorCluster = 1;

    if (isKegiatanMode && (penilaianColumns > 0 || keteranganColumnsCount > 0)) {
      // ─────────────────────────────────────────────────────────────
      // MODE KEGIATAN: Nilai Penilaian + Keterangan
      // ─────────────────────────────────────────────────────────────
      list.forEach((pegawai) => {
        const row = worksheet.getRow(currentRow);

        // Kolom base
        row.getCell(1).value = nomorGlobal;
        row.getCell(2).value = nomorCluster;
        row.getCell(3).value = pegawai.nama_pegawai;
        row.getCell(4).value = pegawai.nip;

        styleBody(row.getCell(1), "center");
        styleBody(row.getCell(2), "center");
        styleBody(row.getCell(3), "left");
        styleBody(row.getCell(4), "left");

        let colIndex = 5;

        // Nilai penilaian per metode
        for (const metode of allMetode) {
          const absensiRecord = absensiData.find(
            (a) => a.pegawai_id === pegawai.id && a.kolom_absen_id === metode.id
          );
          
          const nilai = absensiRecord?.nilai || "-";

          const cell = row.getCell(colIndex);
          cell.value = nilai;
          styleBody(cell, "center");
          colIndex++;
        }

        // Keterangan absen (checkbox sebagai ✓)
        const keteranganRecord = absensiKeteranganData.find(
          (a) => a.pegawai_id === pegawai.id
        );
        const currentKet = keteranganRecord?.keterangan as KeteranganAbsen | undefined;

        for (const ket of keteranganColumns) {
          const cell = row.getCell(colIndex);
          cell.value = currentKet === ket ? "✓" : "";
          styleBody(cell, "center");
          colIndex++;
        }

        row.height = 24;
        nomorGlobal++;
        nomorCluster++;
        currentRow++;
      });

    } else {
      // ─────────────────────────────────────────────────────────────
      // MODE HARIAN: Rekap Statistik
      // ─────────────────────────────────────────────────────────────
      const rekap = buildRekap(list, absenList);

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
          const isTotal = index === 11;

          styleBody(cell, isText ? "left" : "center", isTotal);
        });

        row.height = 24;
        nomorGlobal++;
        nomorCluster++;
        currentRow++;
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TTD
  // ═══════════════════════════════════════════════════════════════
  currentRow += 2;

  const ttdStartCol = Math.max(totalColumns - 3, 5);
  const ttdStartColLetter = getColumnLetter(ttdStartCol);

  worksheet.mergeCells(`${ttdStartColLetter}${currentRow}:${lastColumnLetter}${currentRow}`);
  worksheet.getCell(`${ttdStartColLetter}${currentRow}`).value = "Mengetahui,";
  worksheet.getCell(`${ttdStartColLetter}${currentRow}`).font = { bold: true, size: 11 };
  worksheet.getCell(`${ttdStartColLetter}${currentRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  currentRow++;

  worksheet.mergeCells(`${ttdStartColLetter}${currentRow}:${lastColumnLetter}${currentRow}`);
  worksheet.getCell(`${ttdStartColLetter}${currentRow}`).value = jabatanPenanggungJawab || "";
  worksheet.getCell(`${ttdStartColLetter}${currentRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  currentRow += 4;

  worksheet.mergeCells(`${ttdStartColLetter}${currentRow}:${lastColumnLetter}${currentRow}`);
  worksheet.getCell(`${ttdStartColLetter}${currentRow}`).value = penanggungJawab || "";
  worksheet.getCell(`${ttdStartColLetter}${currentRow}`).font = {
    bold: true,
    size: 12,
    color: { argb: BLACK },
  };
  worksheet.getCell(`${ttdStartColLetter}${currentRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  // ═══════════════════════════════════════════════════════════════
  // FREEZE PANES
  // ═══════════════════════════════════════════════════════════════
  const freezeRow = isKegiatanMode ? (penilaianColumns > 0 || keteranganColumnsCount > 0 ? 10 : 9) : 9;
  worksheet.views = [
    {
      state: "frozen",
      ySplit: freezeRow,
      xSplit: 4, // Freeze 4 kolom pertama
    },
  ];

  // ═══════════════════════════════════════════════════════════════
  // SAVE FILE
  // ═══════════════════════════════════════════════════════════════
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(
    blob,
    `Rekap_${kegiatanLabel.replace(/\s+/g, "_")}_${tanggalMulai}.xlsx`
  );
}