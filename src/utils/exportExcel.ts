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
  
  kolomAbsenList?: KolomAbsen[];
  absensiData?: Absensi[];
  absensiKeteranganData?: AbsensiKeterangan[];
  keteranganColumns?: KeteranganAbsen[];
  isKegiatanMode?: boolean;
  
  kegiatanInfo?: {
    instruktur?: string | null;
    asisten?: string | null;
    pejabat?: string | null;
    materi?: string | null;
  } | null;
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

// ✅ HELPER: Hitung jumlah hari kerja
function countWorkingDays(tanggalMulai: string, tanggalSelesai: string): number {
  const startDate = new Date(tanggalMulai);
  const endDate = new Date(tanggalSelesai);
  let count = 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }

  return count;
}

// ✅ SIMPLE COUNT FUNCTION - PURE & CLEAN
function countAbsenByStatus(
  absenList: Absen[],
  pegawaiId: number,
  status: KeteranganAbsen
): number {
  let count = 0;
  for (let i = 0; i < absenList.length; i++) {
    if (absenList[i].pegawai_id === pegawaiId && absenList[i].keterangan === status) {
      count++;
    }
  }
  return count;
}

// ✅ BUILD REKAP - SIMPLE & RELIABLE
// ✅ BUILD REKAP - SIMPLE & RELIABLE
function buildRekap(
  pegawaiList: Pegawai[],
  absenList: Absen[],
  tanggalMulai: string,
  tanggalSelesai: string
): RekapItem[] {
  const totalHariKerja = countWorkingDays(tanggalMulai, tanggalSelesai);
  const rekap: RekapItem[] = [];

  console.log(`\n📊 Building Rekap - Total Hari Kerja: ${totalHariKerja}`);
  console.log(`📊 Total Pegawai: ${pegawaiList.length}`);
  console.log(`📊 Total Absen Records: ${absenList.length}`);
  console.log(`📊 Periode: ${tanggalMulai} - ${tanggalSelesai}\n`);

  for (const pegawai of pegawaiList) {
    // ✅ DEBUG: Tampilkan semua data absen untuk pegawai ini
    const pegawaiAbsenData = absenList.filter(a => a.pegawai_id === pegawai.id);
    
    console.log(`\n👤 ${pegawai.nama_pegawai} (ID: ${pegawai.id})`);
    console.log(`   Total records: ${pegawaiAbsenData.length}`);
    
    // Group by keterangan untuk debug
    const grouped = pegawaiAbsenData.reduce((acc, a) => {
      acc[a.keterangan] = (acc[a.keterangan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`   Breakdown:`, grouped);

    const hadir = countAbsenByStatus(absenList, pegawai.id, "Hadir");
    const dinasLuar = countAbsenByStatus(absenList, pegawai.id, "Dinas Luar");
    const dinasDalam = countAbsenByStatus(absenList, pegawai.id, "Dinas Dalam");
    const cuti = countAbsenByStatus(absenList, pegawai.id, "Cuti");
    const sakit = countAbsenByStatus(absenList, pegawai.id, "Sakit");
    const alpha = countAbsenByStatus(absenList, pegawai.id, "Alpha");
    const izin = countAbsenByStatus(absenList, pegawai.id, "Izin");

    const totalKehadiran = hadir + dinasLuar + dinasDalam;
    const totalTercatat = hadir + dinasLuar + dinasDalam + cuti + sakit + alpha + izin;

    console.log(
      `   Hasil: H:${hadir} DL:${dinasLuar} DD:${dinasDalam} C:${cuti} S:${sakit} A:${alpha} I:${izin}`
    );
    console.log(`   Total Kehadiran: ${totalKehadiran} | Tercatat: ${totalTercatat}/${totalHariKerja}`);

    if (totalTercatat < totalHariKerja) {
      console.warn(`   ⚠️ MISSING ${totalHariKerja - totalTercatat} hari!`);
    }

    rekap.push({
      pegawai,
      hadir,
      dinasLuar,
      dinasDalam,
      cuti,
      sakit,
      alpha,
      izin,
      totalKehadiran,
    });
  }

  return rekap;
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

// ✅ BUILD REKAP - SIMPLE & RELIABLE
function buildRekap(
  pegawaiList: Pegawai[],
  absenList: Absen[],
  tanggalMulai: string,
  tanggalSelesai: string
): RekapItem[] {
  const totalHariKerja = countWorkingDays(tanggalMulai, tanggalSelesai);
  const rekap: RekapItem[] = [];

  console.log(`\n📊 Building Rekap - Total Hari Kerja: ${totalHariKerja}`);
  console.log(`📊 Total Pegawai: ${pegawaiList.length}`);
  console.log(`📊 Total Absen Records: ${absenList.length}`);
  console.log(`📊 Periode: ${tanggalMulai} - ${tanggalSelesai}\n`);

  for (const pegawai of pegawaiList) {
    // ✅ DEBUG: Tampilkan semua data absen untuk pegawai ini
    const pegawaiAbsenData = absenList.filter(a => a.pegawai_id === pegawai.id);
    
    console.log(`\n👤 ${pegawai.nama_pegawai} (ID: ${pegawai.id})`);
    console.log(`   Total records: ${pegawaiAbsenData.length}`);
    
    // Group by keterangan untuk debug
    const grouped = pegawaiAbsenData.reduce((acc, a) => {
      acc[a.keterangan] = (acc[a.keterangan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`   Breakdown:`, grouped);

    const hadir = countAbsenByStatus(absenList, pegawai.id, "Hadir");
    const dinasLuar = countAbsenByStatus(absenList, pegawai.id, "Dinas Luar");
    const dinasDalam = countAbsenByStatus(absenList, pegawai.id, "Dinas Dalam");
    const cuti = countAbsenByStatus(absenList, pegawai.id, "Cuti");
    const sakit = countAbsenByStatus(absenList, pegawai.id, "Sakit");
    const alpha = countAbsenByStatus(absenList, pegawai.id, "Alpha");
    const izin = countAbsenByStatus(absenList, pegawai.id, "Izin");

    const totalKehadiran = hadir + dinasLuar + dinasDalam;
    const totalTercatat = hadir + dinasLuar + dinasDalam + cuti + sakit + alpha + izin;

    console.log(
      `   Hasil: H:${hadir} DL:${dinasLuar} DD:${dinasDalam} C:${cuti} S:${sakit} A:${alpha} I:${izin}`
    );
    console.log(`   Total Kehadiran: ${totalKehadiran} | Tercatat: ${totalTercatat}/${totalHariKerja}`);

    if (totalTercatat < totalHariKerja) {
      console.warn(`   ⚠️ MISSING ${totalHariKerja - totalTercatat} hari!`);
    }

    rekap.push({
      pegawai,
      hadir,
      dinasLuar,
      dinasDalam,
      cuti,
      sakit,
      alpha,
      izin,
      totalKehadiran,
    });
  }

  return rekap;
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

function groupKolomByKategori(kolomList: KolomAbsen[]) {
  const map = new Map<string, KolomAbsen[]>();
  for (const k of kolomList) {
    if (!map.has(k.nama_kategori)) map.set(k.nama_kategori, []);
    map.get(k.nama_kategori)!.push(k);
  }
  return map;
}

function getColumnLetter(colNumber: number): string {
  let letter = "";
  while (colNumber > 0) {
    const remainder = (colNumber - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    colNumber = Math.floor((colNumber - 1) / 26);
  }
  return letter;
}

export async function exportToExcel({
  pegawaiList,
  absenList,
  kegiatanLabel,
  tanggalMulai,
  tanggalSelesai,
  penanggungJawab,
  jabatanPenanggungJawab,
  kolomAbsenList = [],
  absensiData = [],
  absensiKeteranganData = [],
  keteranganColumns = [],
  isKegiatanMode = false,
  kegiatanInfo = null,
}: ExportRekapParams) {
  
  console.log("\n" + "=".repeat(100));
  console.log("📊 EXPORT EXCEL STARTED");
  console.log("=".repeat(100));
  console.log(`📅 Periode: ${tanggalMulai} - ${tanggalSelesai}`);
  console.log(`👥 Total Pegawai: ${pegawaiList.length}`);
  console.log(`📋 Total Absen: ${absenList.length}`);
  console.log(`🎯 Mode: ${isKegiatanMode ? "KEGIATAN" : "HARIAN"}`);
  console.log("=".repeat(100) + "\n");

  const totalHariKerja = countWorkingDays(tanggalMulai, tanggalSelesai);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Rekap Absen");

  worksheet.properties.defaultRowHeight = 24;
  worksheet.pageSetup.orientation = "landscape";
  worksheet.pageSetup.paperSize = 9;
  worksheet.pageSetup.fitToPage = true;

  const groupedKolom = groupKolomByKategori(kolomAbsenList);
  const allMetode = [...groupedKolom.values()].flat();

  const baseColumns = 4;
  const penilaianColumns = allMetode.length;
  const keteranganColumnsCount = keteranganColumns.length;

  let totalColumns: number;

  if (isKegiatanMode && (penilaianColumns > 0 || keteranganColumnsCount > 0)) {
    totalColumns = baseColumns + penilaianColumns + keteranganColumnsCount;
  } else {
    totalColumns = 13;
  }

  const lastColumnLetter = getColumnLetter(totalColumns);

  const columnWidths: number[] = [6, 6, 40, 24];

  if (isKegiatanMode) {
    for (let i = 0; i < penilaianColumns; i++) {
      columnWidths.push(15);
    }
    for (let i = 0; i < keteranganColumnsCount; i++) {
      columnWidths.push(12);
    }
  } else {
    columnWidths.push(10, 14, 14, 9, 9, 9, 9, 12, 18);
  }

  worksheet.columns = columnWidths.map((width) => ({ width }));

  // HEADER
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

  const logoBase64 = await imageUrlToBase64(logoBsn);
  if (logoBase64) {
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: "png",
    });

    const logoCol = totalColumns / 2 - 1;
    worksheet.addImage(imageId, {
      tl: { col: logoCol, row: 0.2 },
      ext: { width: 58, height: 58 },
    });
  }

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

  let tanggalText = "";
  if (tanggalMulai === tanggalSelesai) {
    tanggalText = `TANGGAL: ${new Date(tanggalMulai).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`;
  } else {
    tanggalText = `PERIODE: ${new Date(tanggalMulai).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })} - ${new Date(tanggalSelesai).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`;
  }

  worksheet.mergeCells(`A6:${lastColumnLetter}6`);
  worksheet.getCell("A6").value = tanggalText;
  worksheet.getCell("A6").font = {
    bold: true,
    size: 13,
    color: { argb: BLACK },
  };
  worksheet.getCell("A6").alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  let currentRow = 8;

  if (isKegiatanMode && kegiatanInfo) {
    const infoItems = [
      { label: "Instruktur", value: kegiatanInfo.instruktur },
      { label: "Asisten", value: kegiatanInfo.asisten },
      { label: "Pejabat yang Mengetahui", value: kegiatanInfo.pejabat },
      { label: "Materi", value: kegiatanInfo.materi },
    ];

    for (const item of infoItems) {
      if (item.value) {
        worksheet.mergeCells(`A${currentRow}:${lastColumnLetter}${currentRow}`);
        const cell = worksheet.getCell(`A${currentRow}`);
        cell.value = `${item.label}: ${item.value}`;
        cell.font = {
          bold: item.label !== "Materi",
          size: 11,
          color: { argb: BLACK },
        };
        cell.alignment = { horizontal: "left", vertical: "middle" };
        applyBorder(cell);
        currentRow++;
      }
    }

    currentRow++;
  }

  if (!isKegiatanMode) {
    worksheet.mergeCells(`A${currentRow}:${lastColumnLetter}${currentRow}`);
    const hariCell = worksheet.getCell(`A${currentRow}`);
    hariCell.value = `HARI KERJA : ${totalHariKerja} HARI`;
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
    currentRow++;
  }

  let nomorGlobal = 1;

  // ✅ BUILD REKAP SEKALI UNTUK SEMUA PEGAWAI
  const allRekap = buildRekap(pegawaiList, absenList, tanggalMulai, tanggalSelesai);

  console.log(`\n📊 Rekap Summary:`);
  for (const cluster of clusterOptions) {
    const clusterData = allRekap.filter(r => r.pegawai.cluster === cluster);
    if (clusterData.length > 0) {
      console.log(`  ${cluster}: ${clusterData.length} pegawai`);
    }
  }
  console.log("");

  // LOOP PER CLUSTER
  for (const cluster of clusterOptions) {
    const clusterPegawai = pegawaiList
      .filter((p) => p.cluster === cluster)
      .sort((a, b) => (a.urutan ?? 999999) - (b.urutan ?? 999999));

    if (clusterPegawai.length === 0) continue;

    const clusterRekap = allRekap.filter((r) => r.pegawai.cluster === cluster);

    console.log(`\n📦 Writing Excel for cluster: ${cluster} (${clusterRekap.length} pegawai)`);

    if (isKegiatanMode && (penilaianColumns > 0 || keteranganColumnsCount > 0)) {
      // MODE KEGIATAN - HEADER
      const headerRow1 = worksheet.getRow(currentRow);

      worksheet.mergeCells(currentRow, 1, currentRow + 1, 1);
      worksheet.mergeCells(currentRow, 2, currentRow + 1, 2);
      worksheet.mergeCells(currentRow, 3, currentRow + 1, 3);
      worksheet.mergeCells(currentRow, 4, currentRow + 1, 4);

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

      for (const [kategori, methods] of groupedKolom.entries()) {
        const startCol = colIndex;
        const endCol = colIndex + methods.length - 1;

        if (methods.length > 1) {
          worksheet.mergeCells(currentRow, startCol, currentRow, endCol);
        }

        const cell = worksheet.getCell(currentRow, startCol);
        cell.value = kategori.toUpperCase();
        styleHeader(cell, SOFT_GRAY, BLACK);

        if (methods.length > 1) {
          for (let c = startCol + 1; c <= endCol; c++) {
            const mergedCell = worksheet.getCell(currentRow, c);
            styleHeader(mergedCell, SOFT_GRAY, BLACK);
          }
        }

        colIndex = endCol + 1;
      }

      if (keteranganColumnsCount > 0) {
        const startCol = colIndex;
        const endCol = colIndex + keteranganColumnsCount - 1;

        if (keteranganColumnsCount > 1) {
          worksheet.mergeCells(currentRow, startCol, currentRow, endCol);
        }

        const cell = worksheet.getCell(currentRow, startCol);
        cell.value = "ABSEN";
        styleHeader(cell, LIGHT_BLUE, "FF0369A1");

        if (keteranganColumnsCount > 1) {
          for (let c = startCol + 1; c <= endCol; c++) {
            const mergedCell = worksheet.getCell(currentRow, c);
            styleHeader(mergedCell, LIGHT_BLUE, "FF0369A1");
          }
        }
      }

      headerRow1.height = 28;
      currentRow++;

      const headerRow2 = worksheet.getRow(currentRow);
      colIndex = 5;

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

      for (const ket of keteranganColumns) {
        const cell = headerRow2.getCell(colIndex);
        cell.value = ket;
        styleHeader(cell, BLUE, "FFFFFFFF");

        colIndex++;
      }

      headerRow2.height = 28;
      currentRow++;

      // DATA ROWS KEGIATAN
      let nomorCluster = 1;

      clusterPegawai.forEach((pegawai) => {
        const row = worksheet.getRow(currentRow);

        row.getCell(1).value = nomorGlobal;
        row.getCell(2).value = nomorCluster;
        row.getCell(3).value = pegawai.nama_pegawai;
        row.getCell(4).value = pegawai.nip;

        styleBody(row.getCell(1), "center");
        styleBody(row.getCell(2), "center");
        styleBody(row.getCell(3), "left");
        styleBody(row.getCell(4), "left");

        let colIndex = 5;

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

        const keteranganRecord = absensiKeteranganData.find(
          (a) => a.pegawai_id === pegawai.id
        );
        const currentKet = keteranganRecord?.keterangan as KeteranganAbsen | undefined;

        for (const ket of keteranganColumns) {
          const cell = row.getCell(colIndex);
          cell.value = currentKet === ket ? "✓" : "-";
          styleBody(cell, "center");

          colIndex++;
        }

        row.height = 24;
        nomorGlobal++;
        nomorCluster++;
        currentRow++;
      });
    } else {
      // MODE HARIAN - HEADER
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
        "ALPHA",
        "IZIN",
        "LEPAS PIKET",
        "TOTAL KEHADIRAN",
      ];

      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        styleHeader(cell);
      });

      headerRow.height = 32;
      currentRow++;

      // DATA ROWS HARIAN
      let nomorCluster = 1;

      clusterRekap.forEach((item) => {
        const row = worksheet.getRow(currentRow);

        const lepasPiket = 0;

        const values = [
          nomorGlobal,
          nomorCluster,
          item.pegawai.nama_pegawai,
          item.pegawai.nip,
          item.hadir || "-",
          item.dinasLuar || "-",
          item.dinasDalam || "-",
          item.cuti || "-",
          item.sakit || "-",
          item.alpha || "-",
          item.izin || "-",
          lepasPiket || "-",
          item.totalKehadiran || "-",
        ];

        values.forEach((value, index) => {
          const cell = row.getCell(index + 1);

          if (value === "-") {
            cell.value = "-";
          } else {
            cell.value = value;
          }

          const isText = index === 2 || index === 3 || value === "-";
          const isTotal = index === 12;

          styleBody(cell, isText ? "left" : "center", isTotal);
        });

        row.height = 24;
        nomorGlobal++;
        nomorCluster++;
        currentRow++;
      });
    }
  }

  // TTD
  currentRow += 2;

  const ttdStartCol = Math.max(totalColumns - 3, 5);
  const ttdStartColLetter = getColumnLetter(ttdStartCol);

  worksheet.mergeCells(
    `${ttdStartColLetter}${currentRow}:${lastColumnLetter}${currentRow}`
  );
  worksheet.getCell(`${ttdStartColLetter}${currentRow}`).value = "Mengetahui,";
  worksheet.getCell(`${ttdStartColLetter}${currentRow}`).font = {
    bold: true,
    size: 11,
  };
  worksheet.getCell(`${ttdStartColLetter}${currentRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  currentRow++;

  worksheet.mergeCells(
    `${ttdStartColLetter}${currentRow}:${lastColumnLetter}${currentRow}`
  );
  worksheet.getCell(`${ttdStartColLetter}${currentRow}`).value =
    jabatanPenanggungJawab || "";
  worksheet.getCell(`${ttdStartColLetter}${currentRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  currentRow += 4;

  worksheet.mergeCells(
    `${ttdStartColLetter}${currentRow}:${lastColumnLetter}${currentRow}`
  );
  worksheet.getCell(`${ttdStartColLetter}${currentRow}`).value =
    penanggungJawab || "";
  worksheet.getCell(`${ttdStartColLetter}${currentRow}`).font = {
    bold: true,
    size: 12,
    color: { argb: BLACK },
  };
  worksheet.getCell(`${ttdStartColLetter}${currentRow}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  // SAVE FILE
  console.log("\n💾 Saving Excel file...");

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const fileName = `Rekap_${kegiatanLabel.replace(/\s+/g, "_")}_${tanggalMulai}.xlsx`;

  saveAs(blob, fileName);

  console.log(`✅ Export completed: ${fileName}`);
  console.log("=".repeat(100) + "\n");
}