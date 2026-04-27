import { useEffect, useMemo, useState } from "react";
import {
  FileSpreadsheet,
  File,
  FolderOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle2,
  FileText,
  XCircle,
  Check,
  Table as TableIcon,
} from "lucide-react";
import Swal from "sweetalert2";
import { supabase } from "../supabase";
import type {
  Pegawai,
  Kegiatan,
  KeteranganAbsen,
  KolomAbsen,
  Absensi,
  AbsensiKeterangan,
} from "../types";
import {
  clusterConfig,
  keteranganColors,
} from "../constants";
import { exportToExcel } from "../utils/exportExcel";
import { exportToPDF } from "../utils/exportPDF";
import { formatDateID, getTodayDate } from "../utils/helper";

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

interface KegiatanPegawaiRow {
  id: number;
  kegiatan_id: number;
  pegawai_id: number;
}

interface KegiatanExtended extends Kegiatan {
  pejabat_id?: number | null;
  keterangan_columns?: KeteranganAbsen[] | null;
}

interface Props {
  pegawaiList: Pegawai[];
  refreshPegawai: () => Promise<void>;
}

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

export default function AbsenPageBagUmum({ pegawaiList, refreshPegawai }: Props) {

  // ══════════════════════════════════════════════════════════════
  // STATE - KEGIATAN
  // ══════════════════════════════════════════════════════════════

  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [searchTerm, setSearchTerm] = useState("");
  const [kegiatanList, setKegiatanList] = useState<KegiatanExtended[]>([]);
  const [kegiatanPegawaiRows, setKegiatanPegawaiRows] = useState<KegiatanPegawaiRow[]>([]);
  const [selectedKegiatanId, setSelectedKegiatanId] = useState<number | null>(null);

  // ══════════════════════════════════════════════════════════════
  // STATE - KOLOM DINAMIS & ABSENSI KEGIATAN
  // ══════════════════════════════════════════════════════════════

  const [kolomAbsenList, setKolomAbsenList] = useState<KolomAbsen[]>([]);
  const [absensiKegiatanData, setAbsensiKegiatanData] = useState<Absensi[]>([]);
  const [absensiKeteranganList, setAbsensiKeteranganList] = useState<AbsensiKeterangan[]>([]);

  // ══════════════════════════════════════════════════════════════
  // STATE - DRAFT NILAI (save on blur)
  // ══════════════════════════════════════════════════════════════

  const [draftNilai, setDraftNilai] = useState<Record<string, string>>({});

  // ══════════════════════════════════════════════════════════════
  // STATE - EXPORT
  // ══════════════════════════════════════════════════════════════

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTanggalMulai, setExportTanggalMulai] = useState(getTodayDate());
  const [exportTanggalSelesai, setExportTanggalSelesai] = useState(getTodayDate());
  const [penanggungJawab, setPenanggungJawab] = useState("");
  const [jabatanPenanggungJawab, setJabatanPenanggungJawab] = useState("");
  const [showPenanggungJawabList, setShowPenanggungJawabList] = useState(false);

  const todayDate = getTodayDate();

  // ══════════════════════════════════════════════════════════════
  // FETCH FUNCTIONS
  // ══════════════════════════════════════════════════════════════

  const fetchKegiatan = async () => {
    // ✅ Hanya ambil kegiatan yang dibuat oleh user yang sedang login
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("kegiatan")
      .select("*")
      .eq("created_by", user.id) // ✅ Filter hanya kegiatan milik dia
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal mengambil kegiatan:", error.message);
      return;
    }

    setKegiatanList((data as KegiatanExtended[]) || []);

    // ✅ Auto select kegiatan pertama jika ada
    if (data && data.length > 0 && selectedKegiatanId === null) {
      setSelectedKegiatanId(data[0].id);
    }
  };

  const fetchKegiatanPegawai = async () => {
    const { data, error } = await supabase
      .from("kegiatan_pegawai")
      .select("*");

    if (error) {
      console.error("Gagal mengambil kegiatan_pegawai:", error.message);
      return;
    }

    setKegiatanPegawaiRows((data as KegiatanPegawaiRow[]) || []);
  };

  const fetchKolomAbsen = async (kegiatanId: number) => {
    const { data, error } = await supabase
      .from("kolom_absen")
      .select("*")
      .eq("kegiatan_id", kegiatanId)
      .order("urutan", { ascending: true });

    if (error) {
      console.error("❌ Error fetch kolom absen:", error.message);
      return;
    }

    setKolomAbsenList((data as KolomAbsen[]) || []);
  };

  const fetchAbsensiKegiatan = async (kegiatanId: number, tanggal: string) => {
    const { data, error } = await supabase
      .from("absensi")
      .select("*")
      .eq("kegiatan_id", kegiatanId)
      .eq("tanggal", tanggal);

    if (error) {
      console.error("❌ Error fetch absensi kegiatan:", error.message);
      return;
    }

    setAbsensiKegiatanData((data as Absensi[]) || []);
  };

  const fetchAbsensiKeterangan = async (kegiatanId: number, tanggal: string) => {
    const { data, error } = await supabase
      .from("absensi_keterangan")
      .select("*")
      .eq("kegiatan_id", kegiatanId)
      .eq("tanggal", tanggal);

    if (error) {
      console.error("❌ Error fetch absensi keterangan:", error.message);
      return;
    }

    setAbsensiKeteranganList((data as AbsensiKeterangan[]) || []);
  };

  // ══════════════════════════════════════════════════════════════
  // USE EFFECT
  // ══════════════════════════════════════════════════════════════

  useEffect(() => {
    refreshPegawai();
    fetchKegiatan();
    fetchKegiatanPegawai();
  }, []);

  useEffect(() => {
    if (selectedKegiatanId === null) {
      setKolomAbsenList([]);
      setAbsensiKegiatanData([]);
      setAbsensiKeteranganList([]);
      setDraftNilai({});
      return;
    }

    const loadData = async () => {
      await Promise.all([
        fetchKolomAbsen(selectedKegiatanId),
        fetchAbsensiKegiatan(selectedKegiatanId, selectedDate),
        fetchAbsensiKeterangan(selectedKegiatanId, selectedDate),
      ]);
      setDraftNilai({});
    };

    loadData();
  }, [selectedDate, selectedKegiatanId]);

  // ══════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ══════════════════════════════════════════════════════════════

  const absenPegawaiList = useMemo(() => {
    if (selectedKegiatanId === null) return [];

    const ids = kegiatanPegawaiRows
      .filter((row) => row.kegiatan_id === selectedKegiatanId)
      .map((row) => row.pegawai_id);

    return pegawaiList.filter((p) => ids.includes(p.id));
  }, [pegawaiList, selectedKegiatanId, kegiatanPegawaiRows]);

  const filteredPegawai = useMemo(() => {
    return absenPegawaiList
      .filter((p) => p.nama_pegawai.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => (a.urutan ?? 999999) - (b.urutan ?? 999999));
  }, [absenPegawaiList, searchTerm]);

  const filteredPenanggungJawab = pegawaiList.filter((pegawai) =>
    pegawai.nama_pegawai.toLowerCase().includes(penanggungJawab.toLowerCase())
  );

  const selectedKegiatan = kegiatanList.find((k) => k.id === selectedKegiatanId);
  const keteranganColumns = selectedKegiatan?.keterangan_columns ?? [];

  // Group kolom by kategori
  const groupedKolom = useMemo(() => {
    const map = new Map<string, KolomAbsen[]>();
    for (const k of kolomAbsenList) {
      if (!map.has(k.nama_kategori)) map.set(k.nama_kategori, []);
      map.get(k.nama_kategori)!.push(k);
    }
    return map;
  }, [kolomAbsenList]);

  const allMetode = useMemo(
    () => [...groupedKolom.values()].flat(),
    [groupedKolom]
  );

  const getAssignedCount = (kegiatanId: number) => {
    return kegiatanPegawaiRows.filter((row) => row.kegiatan_id === kegiatanId).length;
  };

  // ══════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS - NILAI PENILAIAN (save on blur)
  // ══════════════════════════════════════════════════════════════

  const cellKey = (pegawaiId: number, kolomId: number) => `${pegawaiId}_${kolomId}`;

  const getNilaiCell = (pegawaiId: number, kolomId: number) => {
    const key = cellKey(pegawaiId, kolomId);
    if (key in draftNilai) return draftNilai[key];
    return absensiKegiatanData.find(
      (a) => a.pegawai_id === pegawaiId && a.kolom_absen_id === kolomId
    )?.nilai ?? "";
  };

  const saveNilaiCell = async (pegawaiId: number, kolomId: number) => {
    if (!selectedKegiatanId) return;

    const key = cellKey(pegawaiId, kolomId);
    const nilai = (draftNilai[key] ?? "").trim();

    const existing = absensiKegiatanData.find(
      (a) =>
        a.pegawai_id === pegawaiId &&
        a.kolom_absen_id === kolomId &&
        a.tanggal === selectedDate
    );

    if (!nilai) {
      if (existing) {
        const { error } = await supabase
          .from("absensi")
          .delete()
          .eq("id", existing.id);

        if (error) {
          Swal.fire({
            icon: "error",
            title: "Gagal Hapus",
            text: error.message,
            confirmButtonColor: "#3b82f6",
            toast: true,
            position: "top-end",
            timer: 3000,
            showConfirmButton: false,
          });
          return;
        }
        await fetchAbsensiKegiatan(selectedKegiatanId, selectedDate);
      }
      return;
    }

    const { error } = await supabase.from("absensi").upsert(
      [{
        kegiatan_id: selectedKegiatanId,
        pegawai_id: pegawaiId,
        kolom_absen_id: kolomId,
        nilai,
        tanggal: selectedDate,
      }],
      { onConflict: "kegiatan_id,pegawai_id,kolom_absen_id,sub_kolom,tanggal" }
    );

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal Simpan",
        text: error.message,
        confirmButtonColor: "#3b82f6",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      });
      return;
    }

    await fetchAbsensiKegiatan(selectedKegiatanId, selectedDate);
  };

  // ══════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS - KETERANGAN ABSEN KANAN
  // ══════════════════════════════════════════════════════════════

  const getKeteranganPegawai = (pegawaiId: number): KeteranganAbsen | null => {
    const row = absensiKeteranganList.find(
      (a) => a.pegawai_id === pegawaiId && a.tanggal === selectedDate
    );
    return (row?.keterangan as KeteranganAbsen) ?? null;
  };

  const setKeteranganPegawai = async (
    pegawaiId: number,
    ket: KeteranganAbsen | null
  ) => {
    if (!selectedKegiatanId) return;

    const existing = absensiKeteranganList.find(
      (a) => a.pegawai_id === pegawaiId && a.tanggal === selectedDate
    );

    if (!ket) {
      if (existing) {
        const { error } = await supabase
          .from("absensi_keterangan")
          .delete()
          .eq("id", existing.id);

        if (error) {
          Swal.fire({
            icon: "error",
            title: "Gagal Hapus",
            text: error.message,
            confirmButtonColor: "#3b82f6",
            toast: true,
            position: "top-end",
            timer: 3000,
            showConfirmButton: false,
          });
          return;
        }
      }
      await fetchAbsensiKeterangan(selectedKegiatanId, selectedDate);
      return;
    }

    const { error } = await supabase.from("absensi_keterangan").upsert(
      [{
        kegiatan_id: selectedKegiatanId,
        pegawai_id: pegawaiId,
        tanggal: selectedDate,
        keterangan: ket,
      }],
      { onConflict: "kegiatan_id,pegawai_id,tanggal" }
    );

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal Simpan",
        text: error.message,
        confirmButtonColor: "#3b82f6",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      });
      return;
    }

    await fetchAbsensiKeterangan(selectedKegiatanId, selectedDate);
  };

  // ══════════════════════════════════════════════════════════════
  // DATE NAVIGATION
  // ══════════════════════════════════════════════════════════════

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  // ══════════════════════════════════════════════════════════════
  // EXPORT
  // ══════════════════════════════════════════════════════════════

  const handleSelectPenanggungJawab = (pegawai: Pegawai) => {
    setPenanggungJawab(pegawai.nama_pegawai);
    setJabatanPenanggungJawab(pegawai.jabatan || "");
    setShowPenanggungJawabList(false);
  };

  const handleExportExcel = () => {
    setExportTanggalMulai(selectedDate);
    setExportTanggalSelesai(selectedDate);
    setShowExportModal(true);
  };

  const confirmExportExcel = () => {
    let kegiatanInfo = null;
    if (selectedKegiatanId !== null && selectedKegiatan) {
      const instrukturNama = selectedKegiatan.instruktur_id
        ? pegawaiList.find((p) => p.id === selectedKegiatan.instruktur_id)?.nama_pegawai
        : null;
      const asistenNama = selectedKegiatan.asisten_id
        ? pegawaiList.find((p) => p.id === selectedKegiatan.asisten_id)?.nama_pegawai
        : null;
      const pejabatNama = selectedKegiatan.pejabat_id
        ? pegawaiList.find((p) => p.id === selectedKegiatan.pejabat_id)?.nama_pegawai
        : null;

      kegiatanInfo = {
        instruktur: instrukturNama,
        asisten: asistenNama,
        pejabat: pejabatNama,
        materi: selectedKegiatan.materi,
      };
    }

    try {
      exportToExcel({
        pegawaiList: absenPegawaiList,
        absenList: [],
        kegiatanLabel: selectedKegiatan?.nama_kegiatan || "Rekap Absen",
        tanggalMulai: exportTanggalMulai,
        tanggalSelesai: exportTanggalSelesai,
        penanggungJawab,
        jabatanPenanggungJawab,
        hariKerja: 22,
        kolomAbsenList,
        absensiData: absensiKegiatanData,
        absensiKeteranganData: absensiKeteranganList,
        keteranganColumns: keteranganColumns as KeteranganAbsen[],
        isKegiatanMode: true,
        kegiatanInfo,
      });

      setShowExportModal(false);

      Swal.fire({
        icon: "success",
        title: "Export Berhasil!",
        text: "File Excel berhasil didownload",
        confirmButtonColor: "#3b82f6",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      });
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Export Gagal!",
        text: error.message || "Terjadi kesalahan saat export",
        confirmButtonColor: "#3b82f6",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      exportToPDF({
        absenPegawaiList,
        getAbsenStatus: () => null, // ✅ Tidak ada absen harian
        selectedDate,
        kegiatanLabel: selectedKegiatan?.nama_kegiatan || "Kegiatan",
      });

      Swal.fire({
        icon: "success",
        title: "Export Berhasil!",
        text: "File PDF berhasil didownload",
        confirmButtonColor: "#3b82f6",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      });
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Export Gagal!",
        text: error.message || "Terjadi kesalahan saat export PDF",
        confirmButtonColor: "#3b82f6",
      });
    }
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="glass page-header-card">
        <div className="header-top">
          <div>
            <h1 className="page-title">
              {selectedKegiatanId === null
                ? "Absensi Kegiatan"
                : `Absensi: ${selectedKegiatan?.nama_kegiatan}`}
            </h1>
            <p className="page-subtitle">{formatDateID(selectedDate)}</p>
          </div>

          <div className="date-nav">
            <button className="date-btn" onClick={() => changeDate(-1)}>
              <ChevronLeft size={20} />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-input"
            />
            <button className="date-btn" onClick={() => changeDate(1)}>
              <ChevronRight size={20} />
            </button>
            {selectedDate !== todayDate && (
              <button
                className="today-btn"
                onClick={() => setSelectedDate(todayDate)}
              >
                Hari Ini
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs Kegiatan ── */}
      <div className="glass kegiatan-tabs-card">
        <p className="kegiatan-tabs-label">Pilih Kegiatan:</p>
        <div className="kegiatan-tabs">
          {kegiatanList.length === 0 ? (
            // ✅ Empty state kalau tidak ada kegiatan
            <div style={{ padding: "12px 16px", color: "#94a3b8", fontSize: 14 }}>
              Belum ada kegiatan yang kamu buat.
            </div>
          ) : (
            kegiatanList.map((k) => (
              <button
                key={k.id}
                className={`kegiatan-tab ${selectedKegiatanId === k.id ? "active" : ""}`}
                onClick={() => setSelectedKegiatanId(k.id)}
              >
                <FolderOpen size={16} />
                {k.nama_kegiatan}
                <span className="kegiatan-tab-count">
                  {getAssignedCount(k.id)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Info Kegiatan ── */}
      {selectedKegiatanId !== null && (
        <div className="glass kegiatan-info-card">
          <div className="kegiatan-info-row">
            <FolderOpen size={20} color="#3b82f6" />
            <div>
              <strong>{selectedKegiatan?.nama_kegiatan}</strong>
              {selectedKegiatan?.deskripsi && (
                <p className="kegiatan-desc">{selectedKegiatan.deskripsi}</p>
              )}
            </div>
            <span className="kegiatan-pegawai-count">
              {getAssignedCount(selectedKegiatanId)} pegawai terpilih
            </span>
          </div>
        </div>
      )}

      {/* ── Search & Export ── */}
      {selectedKegiatanId !== null && (
        <div className="glass" style={{ marginBottom: 0 }}>
          <div className="search-export-row">
            <input
              type="text"
              placeholder="🔍 Cari pegawai..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              style={{ marginBottom: 0 }}
            />
            <div className="export-buttons">
              <button className="btn-export btn-excel" onClick={handleExportExcel}>
                <FileSpreadsheet size={18} />
                <span>Excel</span>
              </button>
              <button className="btn-export btn-pdf" onClick={handleExportPDF}>
                <File size={18} />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ABSEN KEGIATAN (Tabel 2-Level Header + Kolom Kanan) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {selectedKegiatanId !== null &&
        (allMetode.length > 0 || keteranganColumns.length > 0) && (
          <div className="glass">
            <div className="table-wrapper">
              <table className="absen-table">
                <thead>
                  {/* ─ ROW 1: HEADER KATEGORI + HEADER "ABSEN" ─ */}
                  <tr>
                    <th
                      className="th-nama-pegawai"
                      rowSpan={2}
                      style={{ verticalAlign: "middle" }}
                    >
                      Nama Pegawai
                    </th>

                    {[...groupedKolom.entries()].map(([kategori, methods]) => (
                      <th
                        key={kategori}
                        className="th-kolom-absen"
                        colSpan={methods.length}
                      >
                        <div className="th-kolom-content">
                          <div className="th-kategori">{kategori}</div>
                        </div>
                      </th>
                    ))}

                    {keteranganColumns.length > 0 && (
                      <th
                        className="th-kolom-absen"
                        colSpan={keteranganColumns.length}
                        style={{
                          background: "linear-gradient(135deg,#e0f2fe,#bae6fd)",
                          borderLeft: "3px solid #0ea5e9",
                        }}
                      >
                        <div className="th-kolom-content">
                          <div className="th-kategori" style={{ color: "#0369a1" }}>
                            ABSEN
                          </div>
                        </div>
                      </th>
                    )}
                  </tr>

                  {/* ─ ROW 2: SUB-HEADER METODE + SUB-HEADER KETERANGAN ─ */}
                  <tr>
                    {allMetode.map((m) => (
                      <th key={m.id} className="th-sub-kolom">
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: 12 }}>
                            {m.metode || "-"}
                          </span>
                          {m.satuan && (
                            <span
                              style={{
                                fontSize: 10,
                                color: "#64748b",
                                fontStyle: "italic",
                              }}
                            >
                              {m.satuan}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}

                    {keteranganColumns.map((ket) => (
                      <th
                        key={ket}
                        className="th-sub-kolom"
                        style={{
                          background: `${keteranganColors[ket]}22`,
                          borderBottom: `3px solid ${keteranganColors[ket]}`,
                        }}
                      >
                        {ket}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredPegawai.map((pegawai) => {
                    const currentKet = getKeteranganPegawai(pegawai.id);
                    const cfg = clusterConfig[pegawai.cluster];

                    return (
                      <tr key={pegawai.id}>
                        {/* Nama */}
                        <td className="pegawai-name-cell">
                          <div className="nama-cell">
                            <div
                              className="avatar"
                              style={{ background: cfg.gradient }}
                            >
                              {pegawai.nama_pegawai.charAt(0).toUpperCase()}
                            </div>
                            <span className="nama-text">{pegawai.nama_pegawai}</span>
                          </div>
                        </td>

                        {/* Nilai free text per metode */}
                        {allMetode.map((m) => {
                          const key = cellKey(pegawai.id, m.id);
                          const val = getNilaiCell(pegawai.id, m.id);

                          return (
                            <td key={m.id} className="absen-cell">
                              <input
                                className="absen-input"
                                value={val}
                                placeholder="-"
                                onChange={(e) =>
                                  setDraftNilai((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }
                                onBlur={() => saveNilaiCell(pegawai.id, m.id)}
                              />
                            </td>
                          );
                        })}

                        {/* Checkbox keterangan (radio-style) */}
                        {keteranganColumns.map((ket) => {
                          const checked = currentKet === ket;

                          return (
                            <td key={ket} className="absen-cell">
                              <label className="checkbox-wrapper">
                                <input
                                  type="checkbox"
                                  className="hidden-checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setKeteranganPegawai(
                                      pegawai.id,
                                      checked ? null : ket
                                    )
                                  }
                                />
                                <div
                                  className={`custom-checkbox ${checked ? "checked" : ""}`}
                                  style={
                                    checked
                                      ? {
                                          background: keteranganColors[ket],
                                          borderColor: keteranganColors[ket],
                                        }
                                      : {}
                                  }
                                >
                                  {checked && (
                                    <Check size={14} color="white" strokeWidth={3} />
                                  )}
                                </div>
                              </label>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* ── Empty State: Kegiatan Tanpa Kolom ── */}
      {selectedKegiatanId !== null &&
        allMetode.length === 0 &&
        keteranganColumns.length === 0 && (
          <div className="glass" style={{ textAlign: "center", padding: "60px 20px" }}>
            <TableIcon size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
            <p style={{ color: "#64748b", fontSize: 16, marginBottom: 8 }}>
              Belum ada kolom penilaian atau kolom absen untuk kegiatan ini.
            </p>
            <p style={{ color: "#94a3b8", fontSize: 14 }}>
              Silakan tambahkan di halaman <strong>Kelola Kegiatan</strong>.
            </p>
          </div>
        )}

      {/* ── Empty State: Kegiatan Tanpa Pegawai ── */}
      {selectedKegiatanId !== null && absenPegawaiList.length === 0 && (
        <div className="glass" style={{ textAlign: "center", padding: "60px 20px" }}>
          <FolderOpen size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
          <p style={{ color: "#64748b", fontSize: 16 }}>
            Belum ada pegawai yang di-assign ke kegiatan ini.
          </p>
        </div>
      )}

      {/* ── Empty State: Tidak Ada Kegiatan ── */}
      {kegiatanList.length === 0 && (
        <div className="glass" style={{ textAlign: "center", padding: "60px 20px" }}>
          <FolderOpen size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
          <p style={{ color: "#64748b", fontSize: 16, marginBottom: 8 }}>
            Belum ada kegiatan yang kamu buat.
          </p>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>
            Silakan buat kegiatan di halaman <strong>Kelola Kegiatan</strong>.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL EXPORT */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div
            className="modal-content export-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header export-header">
              <div>
                <h2>Export Excel Absensi</h2>
                <p className="export-subtitle">
                  Pilih periode dan penanggung jawab sebelum download file
                </p>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowExportModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="export-form-grid">
              <div className="export-field">
                <label className="export-label">Tanggal Mulai</label>
                <input
                  type="date"
                  value={exportTanggalMulai}
                  onChange={(e) => setExportTanggalMulai(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="export-field">
                <label className="export-label">Tanggal Selesai</label>
                <input
                  type="date"
                  value={exportTanggalSelesai}
                  onChange={(e) => setExportTanggalSelesai(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="export-field export-autocomplete-wrapper">
                <label className="export-label">Nama Penanggung Jawab</label>
                <input
                  type="text"
                  value={penanggungJawab}
                  onChange={(e) => {
                    setPenanggungJawab(e.target.value);
                    setShowPenanggungJawabList(true);
                  }}
                  onFocus={() => setShowPenanggungJawabList(true)}
                  placeholder="Ketik nama pegawai..."
                  className="form-input"
                />

                {showPenanggungJawabList && penanggungJawab && (
                  <div className="autocomplete-dropdown">
                    {filteredPenanggungJawab.length > 0 ? (
                      filteredPenanggungJawab.slice(0, 8).map((pegawai) => (
                        <button
                          key={pegawai.id}
                          type="button"
                          className="autocomplete-item"
                          onClick={() => handleSelectPenanggungJawab(pegawai)}
                        >
                          <div className="autocomplete-name">
                            {pegawai.nama_pegawai}
                          </div>
                          <div className="autocomplete-detail">
                            {pegawai.jabatan || "-"} • {pegawai.nip}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="autocomplete-empty">
                        Pegawai tidak ditemukan
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="export-field">
                <label className="export-label">Jabatan Penanggung Jawab</label>
                <input
                  type="text"
                  value={jabatanPenanggungJawab}
                  onChange={(e) => setJabatanPenanggungJawab(e.target.value)}
                  placeholder="Otomatis terisi dari pegawai"
                  className="form-input"
                />
              </div>
            </div>

            <div className="export-footer">
              <button className="btn-primary" onClick={confirmExportExcel}>
                Download Excel
              </button>
              <button
                className="btn-secondary"
                onClick={() => setShowExportModal(false)}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}