import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type {
  Pegawai,
  KolomAbsen,
  Absensi,
  AbsensiKeterangan,
  KeteranganAbsen,
} from "../types";
import { keteranganColors } from "../constants";
import logoBsn from "../assets/logo_bsn.png";

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

interface ExportKegiatanParams {
  pegawaiList: Pegawai[];
  kolomAbsenList: KolomAbsen[];
  absensiData: Absensi[];
  absensiKeteranganData: AbsensiKeterangan[];
  keteranganColumns: KeteranganAbsen[];
  kegiatanLabel: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  penanggungJawab: string;
  jabatanPenanggungJawab: string;
  // ✅ Tambahan param opsional dari AbsenPageBagUmum
  absenList?: never[];
  hariKerja?: number;
  isKegiatanMode?: boolean;
  kegiatanInfo?: {
    instruktur?: string | null;
    asisten?: string | null;
    pejabat?: string | null;
    materi?: string | null;
  } | null;
}

// ══════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════

const COLORS = {
  YELLOW: "FFFFFF00",
  SOFT_YELLOW: "FFFFF2CC",
  BLACK: "FF000000",
  GREEN: "FF008000",
  BLUE: "FF0EA5E9",
  LIGHT_BLUE: "FFE0F2FE",
  SOFT_GRAY: "FFF1F5F9",
  WHITE: "FFFFFFFF",
  DARK_BLUE: "FF0369A1",
};

// ══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════

function applyBorder(cell: ExcelJS.Cell, color = COLORS.BLACK) {
  cell.border = {
    top: { style: "thin", color: { argb: color } },
    left: { style: "thin", color: { argb: color } },
    bottom: { style: "thin", color: { argb: color } },
    right: { style: "thin", color: { argb: color } },
  };
}

function styleHeader(
  cell: ExcelJS.Cell,
  bgColor = COLORS.YELLOW,
  textColor = COLORS.BLACK
) {
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

function styleBody(cell: ExcelJS.Cell, align: "left" | "center" = "center") {
  cell.font = {
    size: 11,
    color: { argb: COLORS.BLACK },
  };
  cell.alignment = {
    horizontal: align,
    vertical: "middle",
    wrapText: true,
  };
  applyBorder(cell);
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
    console.error("❌ Gagal convert logo:", error);
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

function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);

  // ✅ Pastikan start <= end agar tidak infinite loop
  if (startDate > endDate) return [start];

  for (
    let d = new Date(startDate);
    d <= endDate;
    d.setDate(d.getDate() + 1)
  ) {
    dates.push(new Date(d).toISOString().split("T")[0]);
  }

  return dates;
}

// ✅ PERBAIKAN UTAMA: Tidak throw error, return semua pegawai jika tidak ada filter
function filterPegawaiWithData(
  pegawaiList: Pegawai[],
  absensiData: Absensi[],
  absensiKeteranganData: AbsensiKeterangan[],
  dateArray: string[]
): Pegawai[] {
  console.log("\n🔍 Filtering pegawai dengan data...");
  console.log(`   Total pegawai: ${pegawaiList.length}`);
  console.log(`   Total absensi records: ${absensiData.length}`);
  console.log(`   Total keterangan records: ${absensiKeteranganData.length}`);
  console.log(`   Date range: ${dateArray.join(", ")}`);

  // ✅ Jika tidak ada data sama sekali, kembalikan SEMUA pegawai
  // agar export tetap berjalan dengan baris kosong
  if (absensiData.length === 0 && absensiKeteranganData.length === 0) {
    console.log(
      "   ℹ️  Tidak ada data absensi — export semua pegawai dengan nilai kosong"
    );
    return pegawaiList;
  }

  const filtered = pegawaiList.filter((pegawai) => {
    const hasAbsensi = absensiData.some(
      (a) =>
        a.pegawai_id === pegawai.id &&
        a.nilai !== null &&
        a.nilai !== "" &&
        dateArray.includes(a.tanggal)
    );

    const hasKeterangan = absensiKeteranganData.some(
      (a) =>
        a.pegawai_id === pegawai.id &&
        a.keterangan !== null &&
        dateArray.includes(a.tanggal)
    );

    const hasData = hasAbsensi || hasKeterangan;

    if (!hasData) {
      console.log(`   ⚠️  SKIP ${pegawai.nama_pegawai} - Tidak ada data`);
    }

    return hasData;
  });

  // ✅ Jika setelah filter tetap kosong, kembalikan SEMUA pegawai
  // daripada throw error
  if (filtered.length === 0) {
    console.log(
      "   ℹ️  Tidak ada pegawai dengan data — export semua pegawai dengan nilai kosong"
    );
    return pegawaiList;
  }

  console.log(
    `✅ Pegawai dengan data: ${filtered.length}/${pegawaiList.length}\n`
  );
  return filtered;
}

function convertColor(hexColor: string): string {
  if (hexColor.startsWith("#")) {
    return "FF" + hexColor.substring(1).toUpperCase();
  }
  return hexColor;
}

// ══════════════════════════════════════════════════════════════
// MAIN EXPORT FUNCTION
// ══════════════════════════════════════════════════════════════

export async function exportKegiatanToExcel({
  pegawaiList,
  kolomAbsenList,
  absensiData,
  absensiKeteranganData,
  keteranganColumns,
  kegiatanLabel,
  tanggalMulai,
  tanggalSelesai,
  penanggungJawab,
  jabatanPenanggungJawab,
  kegiatanInfo = null,
}: ExportKegiatanParams) {
  console.log("\n" + "=".repeat(80));
  console.log("📊 EXPORT EXCEL KEGIATAN STARTED");
  console.log(`📅 Periode: ${tanggalMulai} - ${tanggalSelesai}`);
  console.log(`🎯 Kegiatan: ${kegiatanLabel}`);
  console.log("=".repeat(80));

  // ✅ Guard: pegawaiList tidak boleh kosong
  if (!pegawaiList || pegawaiList.length === 0) {
    throw new Error(
      "Tidak ada pegawai dalam kegiatan ini. Silakan assign pegawai terlebih dahulu."
    );
  }

  // ══════════════════════════════════════════════════════════════
  // PREPARE DATA
  // ══════════════════════════════════════════════════════════════

  const dateArray = generateDateRange(tanggalMulai, tanggalSelesai);
  const groupedKolom = groupKolomByKategori(kolomAbsenList);
  const allMetode = [...groupedKolom.values()].flat();

  // ✅ Filter pegawai — tidak akan throw error lagi
  const filteredPegawai = filterPegawaiWithData(
    pegawaiList,
    absensiData,
    absensiKeteranganData,
    dateArray
  );

  const baseColumns = 3; // NO, NAMA, NIP
  const penilaianColumns = allMetode.length;
  const keteranganColumnsCount = keteranganColumns.length;
  const totalColumns = baseColumns + penilaianColumns + keteranganColumnsCount;

  console.log(`📊 Total Kolom: ${totalColumns}`);
  console.log(`   - Base: ${baseColumns}`);
  console.log(`   - Penilaian: ${penilaianColumns}`);
  console.log(`   - Keterangan: ${keteranganColumnsCount}`);

  // ══════════════════════════════════════════════════════════════
  // CREATE WORKBOOK
  // ══════════════════════════════════════════════════════════════

  const workbook = new ExcelJS.Workbook();

  // ══════════════════════════════════════════════════════════════
  // LOOP SETIAP TANGGAL → BUAT SHEET
  // ══════════════════════════════════════════════════════════════

  for (const tanggal of dateArray) {
    // ✅ Filter pegawai untuk tanggal ini
    let pegawaiForThisDate: Pegawai[];

    // Jika ada data, filter yang punya data di tanggal ini
    // Jika tidak ada data sama sekali, tampilkan semua pegawai
    if (absensiData.length === 0 && absensiKeteranganData.length === 0) {
      pegawaiForThisDate = filteredPegawai;
    } else {
      pegawaiForThisDate = filteredPegawai.filter((pegawai) => {
        const hasAbsensi = absensiData.some(
          (a) =>
            a.pegawai_id === pegawai.id &&
            a.tanggal === tanggal &&
            a.nilai !== null &&
            a.nilai !== ""
        );

        const hasKeterangan = absensiKeteranganData.some(
          (a) => a.pegawai_id === pegawai.id && a.tanggal === tanggal
        );

        return hasAbsensi || hasKeterangan;
      });

      // ✅ Jika tanggal ini tidak ada data, skip sheet ini
      if (pegawaiForThisDate.length === 0) {
        console.log(`⏭️  Skip tanggal ${tanggal} - Tidak ada data`);
        continue;
      }
    }

    const formattedDate = new Date(tanggal).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    console.log(
      `\n📄 Creating sheet: ${formattedDate} (${pegawaiForThisDate.length} pegawai)`
    );

    const worksheet = workbook.addWorksheet(
      formattedDate.substring(0, 31) // Excel max 31 char sheet name
    );

    worksheet.properties.defaultRowHeight = 24;
    worksheet.pageSetup.orientation = "landscape";
    worksheet.pageSetup.paperSize = 9; // A4
    worksheet.pageSetup.fitToPage = true;

    // ══════════════════════════════════════════════════════════════
    // COLUMN WIDTHS
    // ══════════════════════════════════════════════════════════════

    const columnWidths: number[] = [6, 40, 24];
    for (let i = 0; i < penilaianColumns; i++) columnWidths.push(15);
    for (let i = 0; i < keteranganColumnsCount; i++) columnWidths.push(12);

    worksheet.columns = columnWidths.map((width) => ({ width }));

    const lastColumnLetter = getColumnLetter(totalColumns);

    let currentRow = 1;

    // ══════════════════════════════════════════════════════════════
    // HEADER: LOGO & BORDER
    // ══════════════════════════════════════════════════════════════

    worksheet.mergeCells(`A${currentRow}:${lastColumnLetter}${currentRow + 1}`);
    const topCell = worksheet.getCell(`A${currentRow}`);
    topCell.value = "";
    topCell.alignment = { horizontal: "center", vertical: "middle" };
    topCell.border = {
      top: { style: "thin", color: { argb: COLORS.GREEN } },
      left: { style: "thin", color: { argb: COLORS.GREEN } },
      bottom: { style: "thin", color: { argb: COLORS.GREEN } },
      right: { style: "thin", color: { argb: COLORS.GREEN } },
    };

    const logoBase64 = await imageUrlToBase64(logoBsn);
    if (logoBase64) {
      const imageId = workbook.addImage({
        base64: logoBase64,
        extension: "png",
      });
      worksheet.addImage(imageId, {
        tl: { col: totalColumns / 2 - 0.5, row: currentRow - 0.8 },
        ext: { width: 58, height: 58 },
      });
    }

    currentRow += 2;
    currentRow++; // spacing

    // ══════════════════════════════════════════════════════════════
    // TITLE
    // ══════════════════════════════════════════════════════════════

    worksheet.mergeCells(`A${currentRow}:${lastColumnLetter}${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = kegiatanLabel.toUpperCase();
    titleCell.font = { bold: true, size: 18, color: { argb: COLORS.BLACK } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    currentRow++;

    // ══════════════════════════════════════════════════════════════
    // SUBTITLE
    // ══════════════════════════════════════════════════════════════

    worksheet.mergeCells(`A${currentRow}:${lastColumnLetter}${currentRow}`);
    const subtitleCell = worksheet.getCell(`A${currentRow}`);
    subtitleCell.value = "KANTOR PENCARIAN DAN PERTOLONGAN TARAKAN";
    subtitleCell.font = { bold: true, size: 14, color: { argb: COLORS.BLACK } };
    subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
    currentRow++;

    // ══════════════════════════════════════════════════════════════
    // TANGGAL
    // ══════════════════════════════════════════════════════════════

    worksheet.mergeCells(`A${currentRow}:${lastColumnLetter}${currentRow}`);
    const tanggalCell = worksheet.getCell(`A${currentRow}`);
    tanggalCell.value = `TANGGAL: ${formattedDate}`;
    tanggalCell.font = { bold: true, size: 13, color: { argb: COLORS.BLACK } };
    tanggalCell.alignment = { horizontal: "center", vertical: "middle" };
    currentRow++;
    currentRow++; // spacing

    // ══════════════════════════════════════════════════════════════
    // INFO KEGIATAN
    // ══════════════════════════════════════════════════════════════

    if (kegiatanInfo) {
      const infoItems = [
        { label: "Materi", value: kegiatanInfo.materi },
        { label: "Instruktur", value: kegiatanInfo.instruktur },
        { label: "Asisten", value: kegiatanInfo.asisten },
        { label: "Pejabat yang Mengetahui", value: kegiatanInfo.pejabat },
      ];

      for (const item of infoItems) {
        if (item.value) {
          worksheet.mergeCells(
            `A${currentRow}:${lastColumnLetter}${currentRow}`
          );
          const cell = worksheet.getCell(`A${currentRow}`);
          cell.value = `${item.label}: ${item.value}`;
          cell.font = {
            bold: item.label !== "Materi",
            size: 11,
            color: { argb: COLORS.BLACK },
          };
          cell.alignment = { horizontal: "left", vertical: "middle" };
          applyBorder(cell);
          currentRow++;
        }
      }
      currentRow++; // spacing setelah info
    }

    // ══════════════════════════════════════════════════════════════
    // HEADER ROW 1: KATEGORI
    // ══════════════════════════════════════════════════════════════

    // Merge NO, NAMA, NIP ke 2 baris
    worksheet.mergeCells(currentRow, 1, currentRow + 1, 1);
    worksheet.mergeCells(currentRow, 2, currentRow + 1, 2);
    worksheet.mergeCells(currentRow, 3, currentRow + 1, 3);

    const noCell = worksheet.getCell(currentRow, 1);
    const namaCell = worksheet.getCell(currentRow, 2);
    const nipCell = worksheet.getCell(currentRow, 3);

    noCell.value = "NO";
    namaCell.value = "NAMA";
    nipCell.value = "NIP";

    styleHeader(noCell);
    styleHeader(namaCell);
    styleHeader(nipCell);

    let colIndex = 4;

    // Kategori penilaian
    for (const [kategori, methods] of groupedKolom.entries()) {
      const startCol = colIndex;
      const endCol = colIndex + methods.length - 1;

      if (methods.length > 1) {
        worksheet.mergeCells(currentRow, startCol, currentRow, endCol);
      }

      const cell = worksheet.getCell(currentRow, startCol);
      cell.value = kategori.toUpperCase();
      styleHeader(cell, COLORS.SOFT_GRAY, COLORS.BLACK);

      if (methods.length > 1) {
        for (let c = startCol + 1; c <= endCol; c++) {
          styleHeader(
            worksheet.getCell(currentRow, c),
            COLORS.SOFT_GRAY,
            COLORS.BLACK
          );
        }
      }

      colIndex = endCol + 1;
    }

    // Kategori ABSEN
    if (keteranganColumnsCount > 0) {
      const startCol = colIndex;
      const endCol = colIndex + keteranganColumnsCount - 1;

      if (keteranganColumnsCount > 1) {
        worksheet.mergeCells(currentRow, startCol, currentRow, endCol);
      }

      const cell = worksheet.getCell(currentRow, startCol);
      cell.value = "ABSEN";
      styleHeader(cell, COLORS.LIGHT_BLUE, COLORS.DARK_BLUE);

      if (keteranganColumnsCount > 1) {
        for (let c = startCol + 1; c <= endCol; c++) {
          styleHeader(
            worksheet.getCell(currentRow, c),
            COLORS.LIGHT_BLUE,
            COLORS.DARK_BLUE
          );
        }
      }
    }

    currentRow++;

    // ══════════════════════════════════════════════════════════════
    // HEADER ROW 2: METODE & KETERANGAN
    // ══════════════════════════════════════════════════════════════

    const headerRow2 = worksheet.getRow(currentRow);
    colIndex = 4;

    for (const metode of allMetode) {
      const cell = headerRow2.getCell(colIndex);
      cell.value = metode.satuan
        ? `${metode.metode || "-"}\n(${metode.satuan})`
        : metode.metode || "-";
      styleHeader(cell, COLORS.YELLOW, COLORS.BLACK);
      colIndex++;
    }

    for (const ket of keteranganColumns) {
      const cell = headerRow2.getCell(colIndex);
      cell.value = ket;
      const ketColor = keteranganColors[ket]
        ? convertColor(keteranganColors[ket])
        : COLORS.BLUE;
      styleHeader(cell, ketColor, COLORS.WHITE);
      colIndex++;
    }

    headerRow2.height = 28;
    currentRow++;

    // ══════════════════════════════════════════════════════════════
    // DATA ROWS
    // ══════════════════════════════════════════════════════════════

    pegawaiForThisDate.forEach((pegawai, index) => {
      const row = worksheet.getRow(currentRow);

      // No, Nama, NIP
      row.getCell(1).value = index + 1;
      row.getCell(2).value = pegawai.nama_pegawai;
      row.getCell(3).value = pegawai.nip || "-";

      styleBody(row.getCell(1), "center");
      styleBody(row.getCell(2), "left");
      styleBody(row.getCell(3), "left");

      let colIdx = 4;

      // Nilai penilaian
      for (const metode of allMetode) {
        const absensiRecord = absensiData.find(
          (a) =>
            a.pegawai_id === pegawai.id &&
            a.kolom_absen_id === metode.id &&
            a.tanggal === tanggal
        );
        const cell = row.getCell(colIdx);
        cell.value = absensiRecord?.nilai || "";
        styleBody(cell, "center");
        colIdx++;
      }

      // Keterangan absen
      const keteranganRecord = absensiKeteranganData.find(
        (a) => a.pegawai_id === pegawai.id && a.tanggal === tanggal
      );
      const currentKet = keteranganRecord?.keterangan as
        | KeteranganAbsen
        | undefined;

      for (const ket of keteranganColumns) {
        const cell = row.getCell(colIdx);
        const isChecked = currentKet === ket;
        cell.value = isChecked ? "✓" : "";

        if (isChecked) {
          const ketColor = keteranganColors[ket]
            ? convertColor(keteranganColors[ket])
            : COLORS.BLUE;
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: ketColor },
          };
          cell.font = {
            bold: true,
            size: 12,
            color: { argb: COLORS.WHITE },
          };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          applyBorder(cell);
        } else {
          styleBody(cell, "center");
        }

        colIdx++;
      }

      row.height = 24;
      currentRow++;
    });

    // ══════════════════════════════════════════════════════════════
    // TTD / TANDA TANGAN
    // ══════════════════════════════════════════════════════════════

    currentRow += 2;

    const ttdStartCol = Math.max(totalColumns - 2, 3);
    const ttdStartColLetter = getColumnLetter(ttdStartCol);

    // "Mengetahui,"
    worksheet.mergeCells(
      `${ttdStartColLetter}${currentRow}:${lastColumnLetter}${currentRow}`
    );
    const ttdCell1 = worksheet.getCell(`${ttdStartColLetter}${currentRow}`);
    ttdCell1.value = "Mengetahui,";
    ttdCell1.font = { bold: true, size: 11, color: { argb: COLORS.BLACK } };
    ttdCell1.alignment = { horizontal: "center", vertical: "middle" };
    currentRow++;

    // Jabatan
    worksheet.mergeCells(
      `${ttdStartColLetter}${currentRow}:${lastColumnLetter}${currentRow}`
    );
    const ttdCell2 = worksheet.getCell(`${ttdStartColLetter}${currentRow}`);
    ttdCell2.value = jabatanPenanggungJawab || "";
    ttdCell2.font = { size: 11, color: { argb: COLORS.BLACK } };
    ttdCell2.alignment = { horizontal: "center", vertical: "middle" };
    currentRow += 4; // spasi tanda tangan

    // Nama penanggung jawab
    worksheet.mergeCells(
      `${ttdStartColLetter}${currentRow}:${lastColumnLetter}${currentRow}`
    );
    const ttdCell3 = worksheet.getCell(`${ttdStartColLetter}${currentRow}`);
    ttdCell3.value = penanggungJawab || "";
    ttdCell3.font = {
      bold: true,
      size: 12,
      underline: true,
      color: { argb: COLORS.BLACK },
    };
    ttdCell3.alignment = { horizontal: "center", vertical: "middle" };
  }

  // ══════════════════════════════════════════════════════════════
  // ✅ Jika tidak ada sheet → buat 1 sheet kosong dengan info
  // ── TIDAK throw error lagi ──
  // ══════════════════════════════════════════════════════════════

  if (workbook.worksheets.length === 0) {
    console.warn("⚠️  Tidak ada sheet terbuat — membuat sheet kosong");

    const emptySheet = workbook.addWorksheet("Rekap");
    emptySheet.mergeCells("A1:E1");
    const infoCell = emptySheet.getCell("A1");
    infoCell.value =
      "Tidak ada data absensi untuk periode ini. Sheet dibuat kosong.";
    infoCell.font = { italic: true, color: { argb: "FF94A3B8" } };
    infoCell.alignment = { horizontal: "center", vertical: "middle" };
  }

  // ══════════════════════════════════════════════════════════════
  // SAVE FILE
  // ══════════════════════════════════════════════════════════════

  console.log("\n💾 Saving Excel file...");

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const safeName = kegiatanLabel.replace(/[^a-zA-Z0-9\s_-]/g, "").replace(/\s+/g, "_");
  const fileName =
    tanggalMulai === tanggalSelesai
      ? `Absensi_${safeName}_${tanggalMulai}.xlsx`
      : `Absensi_${safeName}_${tanggalMulai}_sd_${tanggalSelesai}.xlsx`;

  saveAs(blob, fileName);

  console.log(`✅ Export completed: ${fileName}`);
  console.log(`📊 Total pegawai: ${filteredPegawai.length}`);
  console.log(`📄 Total sheets: ${workbook.worksheets.length}`);
  console.log("=".repeat(80) + "\n");
}