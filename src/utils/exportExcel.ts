import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { supabase } from "../supabase";
import type {
  Pegawai,
  Absen,
  KeteranganAbsen,
  KolomAbsen,
  Absensi,
  AbsensiKeterangan,
} from "../types";
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
  selectedKegiatanId?: number | null;

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

// ══════════════════════════════════════════════════════════════
// ✅ BUILD REKAP DENGAN FILTER PEGAWAI KOSONG
// ══════════════════════════════════════════════════════════════
function buildRekap(pegawaiList: Pegawai[], absenList: Absen[]): RekapItem[] {
  console.log("=".repeat(80));
  console.log("✅ BUILD REKAP DARI DATABASE");
  console.log(`Total Pegawai: ${pegawaiList.length}`);
  console.log(`Total Absen Records dari DB: ${absenList.length}`);
  console.log("=".repeat(80));

  const rekap: RekapItem[] = [];

  for (const pegawai of pegawaiList) {
    const pegawaiAbsen = absenList.filter((a) => a.pegawai_id === pegawai.id);

    const hadir = pegawaiAbsen.filter((a) => a.keterangan === "Hadir").length;
    const dinasLuar = pegawaiAbsen.filter((a) => a.keterangan === "Dinas Luar").length;
    const dinasDalam = pegawaiAbsen.filter((a) => a.keterangan === "Dinas Dalam").length;
    const cuti = pegawaiAbsen.filter((a) => a.keterangan === "Cuti").length;
    const sakit = pegawaiAbsen.filter((a) => a.keterangan === "Sakit").length;
    const alpha = pegawaiAbsen.filter((a) => a.keterangan === "Alpha").length;
    const izin = pegawaiAbsen.filter((a) => a.keterangan === "Izin").length;
    const totalKehadiran = hadir + dinasLuar + dinasDalam;

    // ✅ HITUNG TOTAL SEMUA AKTIVITAS
    const totalActivity = hadir + dinasLuar + dinasDalam + cuti + sakit + alpha + izin;

    console.log(
      `👤 ${pegawai.nama_pegawai.padEnd(45)} | records:${String(pegawaiAbsen.length).padStart(3)} | H:${hadir} DL:${dinasLuar} DD:${dinasDalam} C:${cuti} S:${sakit} A:${alpha} I:${izin} | Total:${totalKehadiran} | Activity:${totalActivity}`
    );

    // ✅ SKIP JIKA TIDAK ADA DATA SAMA SEKALI
    if (totalActivity === 0) {
      console.log(`   ⚠️  SKIP - Tidak ada data absen`);
      continue;
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

  console.log(`\n✅ Total pegawai dengan data: ${rekap.length}/${pegawaiList.length}`);
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

const styleBody = (
  cell: ExcelJS.Cell,
  align: "left" | "center" = "center",
  isTotal = false
) => {
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
};

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

// ══════════════════════════════════════════════════════════════
// ✅ FILTER PEGAWAI UNTUK MODE KEGIATAN
// ══════════════════════════════════════════════════════════════
function filterPegawaiWithData(
  pegawaiList: Pegawai[],
  absensiData: Absensi[],
  absensiKeteranganData: AbsensiKeterangan[]
): Pegawai[] {
  console.log("\n🔍 Filtering pegawai dengan data untuk mode kegiatan...");
  
  const filtered = pegawaiList.filter((pegawai) => {
    // Check apakah ada data absensi (penilaian)
    const hasAbsensi = absensiData.some(
      (a) => a.pegawai_id === pegawai.id && a.nilai !== null && a.nilai !== ""
    );

    // Check apakah ada keterangan absen
    const hasKeterangan = absensiKeteranganData.some(
      (a) => a.pegawai_id === pegawai.id && a.keterangan !== null && a.keterangan !== ""
    );

    const hasData = hasAbsensi || hasKeterangan;

    if (!hasData) {
      console.log(`   ⚠️  SKIP ${pegawai.nama_pegawai} - Tidak ada data absensi/keterangan`);
    }

    return hasData;
  });

  console.log(`✅ Pegawai dengan data: ${filtered.length}/${pegawaiList.length}\n`);
  return filtered;
}

// ══════════════════════════════════════════════════════════════
// ✅ FETCH LANGSUNG DARI DATABASE
// ══════════════════════════════════════════════════════════════
async function fetchFreshDataFromDB(
  tanggalMulai: string,
  tanggalSelesai: string,
  selectedKegiatanId: number | null
): Promise<{
  pegawaiList: Pegawai[];
  absenList: Absen[];
  absensiData: Absensi[];
  absensiKeteranganData: AbsensiKeterangan[];
  kolomAbsenList: KolomAbsen[];
}> {
  console.log("=".repeat(80));
  console.log("🚀 FETCH DATA LANGSUNG DARI DATABASE");
  console.log(`📅 Periode: ${tanggalMulai} - ${tanggalSelesai}`);
  console.log(`🎯 Mode: ${selectedKegiatanId === null ? "HARIAN" : `KEGIATAN ID: ${selectedKegiatanId}`}`);
  console.log("=".repeat(80));

  // ══════════════════════════════════════════════════════════════
  // STEP 1: FETCH SEMUA PEGAWAI
  // ══════════════════════════════════════════════════════════════
  console.log("\n⏳ [1/4] Fetching pegawai...");
  const { data: pegawaiRaw, error: pegawaiError } = await supabase
    .from("pegawai")
    .select("*")
    .order("urutan", { ascending: true });

  if (pegawaiError) {
    throw new Error(`Gagal fetch pegawai: ${pegawaiError.message}`);
  }

  let pegawaiList = (pegawaiRaw || []) as Pegawai[];

  // Filter jika mode kegiatan
  if (selectedKegiatanId !== null) {
    const { data: kpData, error: kpError } = await supabase
      .from("kegiatan_pegawai")
      .select("pegawai_id")
      .eq("kegiatan_id", selectedKegiatanId);

    if (kpError) {
      throw new Error(`Gagal fetch kegiatan_pegawai: ${kpError.message}`);
    }

    const assignedIds = (kpData || []).map((r: { pegawai_id: number }) => r.pegawai_id);
    pegawaiList = pegawaiList.filter((p) => assignedIds.includes(p.id));
  }

  console.log(`✅ [1/4] Pegawai: ${pegawaiList.length} records`);

  // ══════════════════════════════════════════════════════════════
  // STEP 2: FETCH ABSEN HARIAN (FULL RANGE, TANPA LIMIT)
  // ══════════════════════════════════════════════════════════════
  console.log("\n⏳ [2/4] Fetching absen harian dari DB...");

  // ✅ FETCH DENGAN PAGINATION untuk menghindari limit default Supabase (1000 rows)
  let absenList: Absen[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: absenBatch, error: absenError } = await supabase
      .from("absen")
      .select("*")
      .gte("tanggal", tanggalMulai)
      .lte("tanggal", tanggalSelesai)
      .is("kegiatan_id", null)
      .range(from, from + batchSize - 1)
      .order("tanggal", { ascending: true });

    if (absenError) {
      throw new Error(`Gagal fetch absen: ${absenError.message}`);
    }

    const batch = (absenBatch || []) as Absen[];
    absenList = [...absenList, ...batch];

    console.log(`   📦 Batch ${Math.floor(from / batchSize) + 1}: ${batch.length} records (Total: ${absenList.length})`);

    if (batch.length < batchSize) {
      hasMore = false;
    } else {
      from += batchSize;
    }
  }

  console.log(`✅ [2/4] Absen Harian: ${absenList.length} records TOTAL dari DB`);

  // ✅ DEBUG CEK PER PEGAWAI
  console.log("\n📊 Cek per pegawai setelah fetch:");
  for (const p of pegawaiList.slice(0, 5)) {
    const count = absenList.filter((a) => a.pegawai_id === p.id).length;
    console.log(`   ${p.nama_pegawai}: ${count} records`);
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 3: FETCH ABSENSI KEGIATAN (jika mode kegiatan)
  // ══════════════════════════════════════════════════════════════
  console.log("\n⏳ [3/4] Fetching absensi kegiatan...");
  let absensiData: Absensi[] = [];
  let absensiKeteranganData: AbsensiKeterangan[] = [];
  let kolomAbsenList: KolomAbsen[] = [];

  if (selectedKegiatanId !== null) {
    const [absensiResult, keteranganResult, kolomResult] = await Promise.all([
      supabase
        .from("absensi")
        .select("*")
        .eq("kegiatan_id", selectedKegiatanId)
        .gte("tanggal", tanggalMulai)
        .lte("tanggal", tanggalSelesai),

      supabase
        .from("absensi_keterangan")
        .select("*")
        .eq("kegiatan_id", selectedKegiatanId)
        .gte("tanggal", tanggalMulai)
        .lte("tanggal", tanggalSelesai),

      supabase
        .from("kolom_absen")
        .select("*")
        .eq("kegiatan_id", selectedKegiatanId)
        .order("urutan", { ascending: true }),
    ]);

    if (absensiResult.error) throw new Error(`Gagal fetch absensi: ${absensiResult.error.message}`);
    if (keteranganResult.error) throw new Error(`Gagal fetch keterangan: ${keteranganResult.error.message}`);
    if (kolomResult.error) throw new Error(`Gagal fetch kolom: ${kolomResult.error.message}`);

    absensiData = (absensiResult.data || []) as Absensi[];
    absensiKeteranganData = (keteranganResult.data || []) as AbsensiKeterangan[];
    kolomAbsenList = (kolomResult.data || []) as KolomAbsen[];

    console.log(`✅ [3/4] Absensi Kegiatan: ${absensiData.length} records`);
    console.log(`✅ [3/4] Keterangan: ${absensiKeteranganData.length} records`);
    console.log(`✅ [3/4] Kolom: ${kolomAbsenList.length} records`);
  } else {
    console.log("✅ [3/4] Skip (mode harian)");
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 4: SUMMARY
  // ══════════════════════════════════════════════════════════════
  console.log("\n✅ [4/4] SUMMARY DATA DARI DATABASE:");
  console.log(`   Pegawai    : ${pegawaiList.length}`);
  console.log(`   Absen      : ${absenList.length}`);
  console.log(`   Absensi    : ${absensiData.length}`);
  console.log(`   Keterangan : ${absensiKeteranganData.length}`);
  console.log(`   Kolom      : ${kolomAbsenList.length}`);
  console.log("=".repeat(80));

  return {
    pegawaiList,
    absenList,
    absensiData,
    absensiKeteranganData,
    kolomAbsenList,
  };
}

// ══════════════════════════════════════════════════════════════
// ✅ MAIN EXPORT FUNCTION
// ══════════════════════════════════════════════════════════════
export async function exportToExcel({
  kegiatanLabel,
  tanggalMulai,
  tanggalSelesai,
  penanggungJawab,
  jabatanPenanggungJawab,
  keteranganColumns = [],
  isKegiatanMode = false,
  selectedKegiatanId = null,
  kegiatanInfo = null,
}: ExportRekapParams) {
  console.log("\n" + "=".repeat(80));
  console.log("📊 EXPORT EXCEL STARTED");
  console.log("=".repeat(80));

  // ══════════════════════════════════════════════════════════════
  // ✅ FETCH SEMUA DATA FRESH DARI DATABASE
  // ══════════════════════════════════════════════════════════════
  let {
    pegawaiList,
    absenList,
    absensiData,
    absensiKeteranganData,
    kolomAbsenList,
  } = await fetchFreshDataFromDB(tanggalMulai, tanggalSelesai, selectedKegiatanId ?? null);

  // ══════════════════════════════════════════════════════════════
  // ✅ FILTER PEGAWAI YANG TIDAK PUNYA DATA
  // ══════════════════════════════════════════════════════════════
  if (isKegiatanMode) {
    // Mode kegiatan: filter berdasarkan absensi & keterangan
    pegawaiList = filterPegawaiWithData(pegawaiList, absensiData, absensiKeteranganData);
  }
  // Mode harian: akan di-filter di buildRekap

  const totalHariKerja = countWorkingDays(tanggalMulai, tanggalSelesai);
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

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Rekap Absen");

  worksheet.properties.defaultRowHeight = 24;
  worksheet.pageSetup.orientation = "landscape";
  worksheet.pageSetup.paperSize = 9;
  worksheet.pageSetup.fitToPage = true;

  const columnWidths: number[] = [6, 6, 40, 24];

  if (isKegiatanMode) {
    for (let i = 0; i < penilaianColumns; i++) columnWidths.push(15);
    for (let i = 0; i < keteranganColumnsCount; i++) columnWidths.push(12);
  } else {
    columnWidths.push(10, 14, 14, 9, 9, 9, 9, 12, 18);
  }

  worksheet.columns = columnWidths.map((width) => ({ width }));

  // ══════════════════════════════════════════════════════════════
  // HEADER ATAS
  // ══════════════════════════════════════════════════════════════
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
    const imageId = workbook.addImage({ base64: logoBase64, extension: "png" });
    worksheet.addImage(imageId, {
      tl: { col: totalColumns / 2 - 1, row: 0.2 },
      ext: { width: 58, height: 58 },
    });
  }

  worksheet.mergeCells(`A4:${lastColumnLetter}4`);
  worksheet.getCell("A4").value = kegiatanLabel.toUpperCase();
  worksheet.getCell("A4").font = { bold: true, size: 18, color: { argb: BLACK } };
  worksheet.getCell("A4").alignment = { horizontal: "center", vertical: "middle" };

  worksheet.mergeCells(`A5:${lastColumnLetter}5`);
  worksheet.getCell("A5").value = "KANTOR PENCARIAN DAN PERTOLONGAN TARAKAN";
  worksheet.getCell("A5").font = { bold: true, size: 14, color: { argb: BLACK } };
  worksheet.getCell("A5").alignment = { horizontal: "center", vertical: "middle" };

  const tanggalText =
    tanggalMulai === tanggalSelesai
      ? `TANGGAL: ${new Date(tanggalMulai).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}`
      : `PERIODE: ${new Date(tanggalMulai).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })} - ${new Date(tanggalSelesai).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}`;

  worksheet.mergeCells(`A6:${lastColumnLetter}6`);
  worksheet.getCell("A6").value = tanggalText;
  worksheet.getCell("A6").font = { bold: true, size: 13, color: { argb: BLACK } };
  worksheet.getCell("A6").alignment = { horizontal: "center", vertical: "middle" };

  let currentRow = 8;

  // ══════════════════════════════════════════════════════════════
  // INFO KEGIATAN
  // ══════════════════════════════════════════════════════════════
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
        cell.font = { bold: item.label !== "Materi", size: 11, color: { argb: BLACK } };
        cell.alignment = { horizontal: "left", vertical: "middle" };
        applyBorder(cell);
        currentRow++;
      }
    }
    currentRow++;
  }

  // ══════════════════════════════════════════════════════════════
  // HARI KERJA (mode harian)
  // ══════════════════════════════════════════════════════════════
  if (!isKegiatanMode) {
    worksheet.mergeCells(`A${currentRow}:${lastColumnLetter}${currentRow}`);
    const hariCell = worksheet.getCell(`A${currentRow}`);
    hariCell.value = `HARI KERJA : ${totalHariKerja} HARI`;
    hariCell.font = { bold: true, size: 12, color: { argb: BLACK } };
    hariCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } };
    hariCell.alignment = { horizontal: "left", vertical: "middle" };
    applyBorder(hariCell);
    currentRow++;
  }

  let nomorGlobal = 1;

  // ══════════════════════════════════════════════════════════════
  // ✅ BUILD REKAP DARI DATA FRESH DB (SUDAH AUTO FILTER DI DALAM)
  // ══════════════════════════════════════════════════════════════
  const allRekap = buildRekap(pegawaiList, absenList);

  // ══════════════════════════════════════════════════════════════
  // ✅ CHECK JIKA TIDAK ADA DATA SAMA SEKALI
  // ══════════════════════════════════════════════════════════════
  if (!isKegiatanMode && allRekap.length === 0) {
    console.warn("⚠️  Tidak ada pegawai dengan data absen. Export dibatalkan.");
    throw new Error("Tidak ada data absen untuk periode ini.");
  }

  if (isKegiatanMode && pegawaiList.length === 0) {
    console.warn("⚠️  Tidak ada pegawai dengan data absensi kegiatan. Export dibatalkan.");
    throw new Error("Tidak ada data absensi untuk kegiatan ini.");
  }

  // ══════════════════════════════════════════════════════════════
  // LOOP PER CLUSTER
  // ══════════════════════════════════════════════════════════════
  for (const cluster of clusterOptions) {
    // ✅ Filter pegawai per cluster yang punya data
    let clusterPegawai: Pegawai[];
    
    if (isKegiatanMode) {
      clusterPegawai = pegawaiList
        .filter((p) => p.cluster === cluster)
        .sort((a, b) => (a.urutan ?? 999999) - (b.urutan ?? 999999));
    } else {
      const clusterRekap = allRekap.filter((r) => r.pegawai.cluster === cluster);
      clusterPegawai = clusterRekap.map((r) => r.pegawai);
    }

    if (clusterPegawai.length === 0) {
      console.log(`\n⏭️  Skip cluster: ${cluster} (tidak ada pegawai dengan data)`);
      continue;
    }

    const clusterRekap = allRekap.filter((r) => r.pegawai.cluster === cluster);

    console.log(`\n📦 Writing cluster: ${cluster} (${clusterPegawai.length} pegawai dengan data)`);

    if (isKegiatanMode && (penilaianColumns > 0 || keteranganColumnsCount > 0)) {
      // ══════════════════════════════════════════════════════════════
      // MODE KEGIATAN - HEADER ROW 1
      // ══════════════════════════════════════════════════════════════
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
            styleHeader(worksheet.getCell(currentRow, c), SOFT_GRAY, BLACK);
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
            styleHeader(worksheet.getCell(currentRow, c), LIGHT_BLUE, "FF0369A1");
          }
        }
      }

      headerRow1.height = 28;
      currentRow++;

      // ══════════════════════════════════════════════════════════════
      // MODE KEGIATAN - HEADER ROW 2
      // ══════════════════════════════════════════════════════════════
      const headerRow2 = worksheet.getRow(currentRow);
      colIndex = 5;

      for (const metode of allMetode) {
        const cell = headerRow2.getCell(colIndex);
        cell.value = metode.satuan
          ? `${metode.metode || "-"}\n(${metode.satuan})`
          : metode.metode || "-";
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

      // ══════════════════════════════════════════════════════════════
      // MODE KEGIATAN - DATA ROWS
      // ══════════════════════════════════════════════════════════════
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
          const cell = row.getCell(colIndex);
          cell.value = absensiRecord?.nilai || "";
          styleBody(cell, "center");
          colIndex++;
        }

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
      // ══════════════════════════════════════════════════════════════
      // MODE HARIAN - HEADER
      // ══════════════════════════════════════════════════════════════
      const headerRow = worksheet.getRow(currentRow);
      const headers = [
        "NO", "NO", "NAMA", "NIP",
        "HADIR", "DINAS LUAR", "DINAS DALAM",
        "CUTI", "SAKIT", "ALPHA", "IZIN",
        "LEPAS PIKET", "TOTAL KEHADIRAN",
      ];

      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        styleHeader(cell);
      });

      headerRow.height = 32;
      currentRow++;

      // ══════════════════════════════════════════════════════════════
      // MODE HARIAN - DATA ROWS
      // ══════════════════════════════════════════════════════════════
      let nomorCluster = 1;

      clusterRekap.forEach((item) => {
        const row = worksheet.getRow(currentRow);

        const values = [
          nomorGlobal,
          nomorCluster,
          item.pegawai.nama_pegawai,
          item.pegawai.nip,
          item.hadir || "",
          item.dinasLuar || "",
          item.dinasDalam || "",
          item.cuti || "",
          item.sakit || "",
          item.alpha || "",
          item.izin || "",
          "",
          item.totalKehadiran || "",
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
  }

  // ══════════════════════════════════════════════════════════════
  // TTD
  // ══════════════════════════════════════════════════════════════
  currentRow += 2;

  const ttdStartCol = Math.max(totalColumns - 3, 5);
  const ttdStartColLetter = getColumnLetter(ttdStartCol);

  worksheet.mergeCells(`${ttdStartColLetter}${currentRow}:${lastColumnLetter}${currentRow}`);
  const ttdCell1 = worksheet.getCell(`${ttdStartColLetter}${currentRow}`);
  ttdCell1.value = "Mengetahui,";
  ttdCell1.font = { bold: true, size: 11 };
  ttdCell1.alignment = { horizontal: "center", vertical: "middle" };
  currentRow++;

  worksheet.mergeCells(`${ttdStartColLetter}${currentRow}:${lastColumnLetter}${currentRow}`);
  const ttdCell2 = worksheet.getCell(`${ttdStartColLetter}${currentRow}`);
  ttdCell2.value = jabatanPenanggungJawab || "";
  ttdCell2.alignment = { horizontal: "center", vertical: "middle" };
  currentRow += 4;

  worksheet.mergeCells(`${ttdStartColLetter}${currentRow}:${lastColumnLetter}${currentRow}`);
  const ttdCell3 = worksheet.getCell(`${ttdStartColLetter}${currentRow}`);
  ttdCell3.value = penanggungJawab || "";
  ttdCell3.font = { bold: true, size: 12, color: { argb: BLACK } };
  ttdCell3.alignment = { horizontal: "center", vertical: "middle" };

  // ══════════════════════════════════════════════════════════════
  // SAVE FILE
  // ══════════════════════════════════════════════════════════════
  console.log("\n💾 Saving Excel file...");

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const fileName = `Rekap_${kegiatanLabel.replace(/\s+/g, "_")}_${tanggalMulai}.xlsx`;
  saveAs(blob, fileName);

  console.log(`✅ Export completed: ${fileName}`);
  console.log(`📊 Total pegawai yang di-export: ${nomorGlobal - 1}`);
  console.log("=".repeat(80) + "\n");
}