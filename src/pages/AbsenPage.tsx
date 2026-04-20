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
import { supabase } from "../supabase";
import type {
  Pegawai,
  Absen,
  Kegiatan,
  KeteranganAbsen,
  ClusterType,
  KolomAbsen,
  Absensi,
  AbsensiKeterangan,
} from "../types";
import {
  clusterOptions,
  clusterConfig,
  keteranganOptions,
  keteranganColors,
} from "../constants";
import { exportToExcel } from "../utils/exportExcel";
import { exportToPDF } from "../utils/exportPDF";
import { formatDateID, getTodayDate } from "../utils/helper";

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

export default function AbsenPage({ pegawaiList, refreshPegawai }: Props) {
  // ══════════════════════════════════════════════════════════════
  // STATE - ABSEN HARIAN
  // ══════════════════════════════════════════════════════════════
  
  const [absenList, setAbsenList] = useState<Absen[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [searchTerm, setSearchTerm] = useState("");
  const [bulkLoadingCluster, setBulkLoadingCluster] = useState<ClusterType | null>(null);

  // ══════════════════════════════════════════════════════════════
  // STATE - KEGIATAN
  // ══════════════════════════════════════════════════════════════
  
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

  const fetchAbsenByDate = async (date: string) => {
    const { data, error } = await supabase
      .from("absen")
      .select("*")
      .eq("tanggal", date);

    if (error) {
      console.error("Gagal mengambil absen:", error.message);
      return;
    }

    setAbsenList((data as Absen[]) || []);
  };

  const fetchKegiatan = async () => {
    const { data, error } = await supabase
      .from("kegiatan")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal mengambil kegiatan:", error.message);
      return;
    }

    setKegiatanList((data as KegiatanExtended[]) || []);
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
    console.log("🔍 Fetching kolom absen untuk kegiatan:", kegiatanId);
    
    const { data, error } = await supabase
      .from("kolom_absen")
      .select("*")
      .eq("kegiatan_id", kegiatanId)
      .order("urutan", { ascending: true });

    if (error) {
      console.error("❌ Error fetch kolom absen:", error.message);
      return;
    }
    
    console.log("✅ Kolom Absen Fetched:", data);
    setKolomAbsenList((data as KolomAbsen[]) || []);
  };

  const fetchAbsensiKegiatan = async (kegiatanId: number, tanggal: string) => {
    console.log("🔍 Fetching absensi untuk kegiatan:", kegiatanId, "tanggal:", tanggal);
    
    const { data, error } = await supabase
      .from("absensi")
      .select("*")
      .eq("kegiatan_id", kegiatanId)
      .eq("tanggal", tanggal);

    if (error) {
      console.error("❌ Error fetch absensi kegiatan:", error.message);
      return;
    }
    
    console.log("✅ Absensi Kegiatan Fetched:", data);
    setAbsensiKegiatanData((data as Absensi[]) || []);
  };

  const fetchAbsensiKeterangan = async (kegiatanId: number, tanggal: string) => {
    console.log("🔍 Fetching absensi keterangan untuk kegiatan:", kegiatanId);
    
    const { data, error } = await supabase
      .from("absensi_keterangan")
      .select("*")
      .eq("kegiatan_id", kegiatanId)
      .eq("tanggal", tanggal);

    if (error) {
      console.error("❌ Error fetch absensi keterangan:", error.message);
      return;
    }
    
    console.log("✅ Absensi Keterangan Fetched:", data);
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
    const loadData = async () => {
      if (selectedKegiatanId === null) {
        // Absen harian
        await fetchAbsenByDate(selectedDate);
        setKolomAbsenList([]);
        setAbsensiKegiatanData([]);
        setAbsensiKeteranganList([]);
        setDraftNilai({});
      } else {
        // Absen kegiatan dengan kolom dinamis
        await Promise.all([
          fetchKolomAbsen(selectedKegiatanId),
          fetchAbsensiKegiatan(selectedKegiatanId, selectedDate),
          fetchAbsensiKeterangan(selectedKegiatanId, selectedDate),
        ]);
        
        setAbsenList([]);
        setDraftNilai({});
      }
    };

    loadData();
  }, [selectedDate, selectedKegiatanId]);

  // ══════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ══════════════════════════════════════════════════════════════

  const filteredAbsen = absenList.filter((a) =>
    selectedKegiatanId === null ? a.kegiatan_id === null : a.kegiatan_id === selectedKegiatanId
  );

  const absenPegawaiList = useMemo(() => {
    if (selectedKegiatanId === null) {
      return pegawaiList;
    }

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

  // Kolom keterangan yang dipilih untuk kegiatan ini
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

  // Semua metode dalam urutan tampil
  const allMetode = useMemo(
    () => [...groupedKolom.values()].flat(),
    [groupedKolom]
  );

  // ══════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS - ABSEN HARIAN
  // ══════════════════════════════════════════════════════════════

  const getAbsenStatus = (pegawaiId: number): KeteranganAbsen | null => {
    const found = filteredAbsen.find((a) => a.pegawai_id === pegawaiId);
    return found ? found.keterangan : null;
  };

  const handleCheckAbsen = async (pegawaiId: number, ket: KeteranganAbsen) => {
    const existing = filteredAbsen.find((a) => a.pegawai_id === pegawaiId);

    try {
      if (existing) {
        if (existing.keterangan === ket) {
          // Hapus absen jika klik yang sama (uncheck)
          const { error } = await supabase
            .from("absen")
            .delete()
            .eq("id", existing.id);

          if (error) throw error;
        } else {
          // Update keterangan
          const { error } = await supabase
            .from("absen")
            .update({ keterangan: ket })
            .eq("id", existing.id);

          if (error) {
            // ✅ Jika gagal update, coba hapus lalu insert baru
            console.warn("Update gagal, mencoba insert ulang...", error);
            
            const { error: deleteError } = await supabase
              .from("absen")
              .delete()
              .eq("id", existing.id);
              
            if (deleteError) throw deleteError;

            const { error: insertError } = await supabase.from("absen").insert([
              {
                pegawai_id: pegawaiId,
                tanggal: selectedDate,
                keterangan: ket,
                kegiatan_id: selectedKegiatanId,
              },
            ]);

            if (insertError) throw insertError;
          }
        }
      } else {
        // Insert absen baru
        const { error } = await supabase.from("absen").insert([
          {
            pegawai_id: pegawaiId,
            tanggal: selectedDate,
            keterangan: ket,
            kegiatan_id: selectedKegiatanId,
          },
        ]);

        if (error) {
          // ✅ Cek apakah error karena duplicate
          if (error.code === '23505') { // PostgreSQL unique violation
            console.warn("Data sudah ada, mencoba update...");
            
            // Cari record yang conflict
            const { data: conflictData } = await supabase
              .from("absen")
              .select("*")
              .eq("pegawai_id", pegawaiId)
              .eq("tanggal", selectedDate)
              .eq("kegiatan_id", selectedKegiatanId)
              .maybeSingle();

            if (conflictData) {
              const { error: updateError } = await supabase
                .from("absen")
                .update({ keterangan: ket })
                .eq("id", conflictData.id);
                
              if (updateError) throw updateError;
            }
          } else {
            throw error;
          }
        }
      }

      // Refresh data
      await fetchAbsenByDate(selectedDate);
      
    } catch (error: any) {
      console.error("❌ Error pada handleCheckAbsen:", error);
      alert(`Gagal menyimpan absen: ${error.message || 'Unknown error'}`);
    }
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
      // Hapus jika kosong
      if (existing) {
        const { error } = await supabase.from("absensi").delete().eq("id", existing.id);
        if (error) { console.error("Gagal hapus nilai:", error.message); return; }
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
      console.error("Gagal simpan nilai:", error.message); 
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
        if (error) { console.error("Gagal hapus keterangan:", error.message); return; }
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

    if (error) { console.error("Gagal simpan keterangan:", error.message); return; }

    await fetchAbsensiKeterangan(selectedKegiatanId, selectedDate);
  };

  // ══════════════════════════════════════════════════════════════
  // BULK ACTIONS
  // ══════════════════════════════════════════════════════════════

  const bulkSetAbsenByCluster = async (
    cluster: ClusterType,
    keterangan: KeteranganAbsen
  ) => {
    const clusterPegawai = filteredPegawai.filter((p) => p.cluster === cluster);

    if (clusterPegawai.length === 0) {
      alert(`Tidak ada pegawai di cluster ${cluster}`);
      return;
    }

    setBulkLoadingCluster(cluster);

    try {
      const pegawaiIds = clusterPegawai.map((p) => p.id);

      const existingRows = filteredAbsen.filter((a) =>
        pegawaiIds.includes(a.pegawai_id)
      );

      if (existingRows.length > 0) {
        const idsToDelete = existingRows.map((a) => a.id);

        const { error: deleteError } = await supabase
          .from("absen")
          .delete()
          .in("id", idsToDelete);

        if (deleteError) {
          alert("Gagal hapus data lama: " + deleteError.message);
          setBulkLoadingCluster(null);
          return;
        }
      }

      const payload = clusterPegawai.map((pegawai) => ({
        pegawai_id: pegawai.id,
        tanggal: selectedDate,
        keterangan,
        kegiatan_id: selectedKegiatanId,
      }));

      const { error: insertError } = await supabase
        .from("absen")
        .insert(payload);

      if (insertError) {
        alert("Gagal set absen cluster: " + insertError.message);
        setBulkLoadingCluster(null);
        return;
      }

      await fetchAbsenByDate(selectedDate);
    } finally {
      setBulkLoadingCluster(null);
    }
  };

  const clearClusterAbsen = async (cluster: ClusterType) => {
    const clusterPegawai = filteredPegawai.filter((p) => p.cluster === cluster);
    if (clusterPegawai.length === 0) return;

    const ok = window.confirm(`Yakin hapus semua absen cluster ${cluster}?`);
    if (!ok) return;

    setBulkLoadingCluster(cluster);

    try {
      const pegawaiIds = clusterPegawai.map((p) => p.id);
      const rowsToDelete = filteredAbsen.filter((a) =>
        pegawaiIds.includes(a.pegawai_id)
      );

      if (rowsToDelete.length === 0) {
        setBulkLoadingCluster(null);
        return;
      }

      const idsToDelete = rowsToDelete.map((a) => a.id);

      const { error } = await supabase
        .from("absen")
        .delete()
        .in("id", idsToDelete);

      if (error) {
        alert("Gagal hapus absen cluster: " + error.message);
        setBulkLoadingCluster(null);
        return;
      }

      await fetchAbsenByDate(selectedDate);
    } finally {
      setBulkLoadingCluster(null);
    }
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
    // Debug log
    console.log("🔍 Export Debug:", {
      isKegiatanMode: selectedKegiatanId !== null,
      selectedKegiatanId,
      kolomAbsenList: kolomAbsenList.length,
      absensiKegiatanData: absensiKegiatanData.length,
      keteranganColumns: keteranganColumns.length,
      allMetode: allMetode.length,
    });

    // ✅ Prepare kegiatan info
    let kegiatanInfo = null;
    if (selectedKegiatanId !== null && selectedKegiatan) {
      const instrukturNama = selectedKegiatan.instruktur_id 
        ? pegawaiList.find(p => p.id === selectedKegiatan.instruktur_id)?.nama_pegawai 
        : null;
      
      const asistenNama = selectedKegiatan.asisten_id 
        ? pegawaiList.find(p => p.id === selectedKegiatan.asisten_id)?.nama_pegawai 
        : null;
      
      const pejabatNama = selectedKegiatan.pejabat_id 
        ? pegawaiList.find(p => p.id === selectedKegiatan.pejabat_id)?.nama_pegawai 
        : null;

      kegiatanInfo = {
        instruktur: instrukturNama,
        asisten: asistenNama,
        pejabat: pejabatNama,
        materi: selectedKegiatan.materi,
      };

      console.log("📋 Kegiatan Info:", kegiatanInfo);
    }

    exportToExcel({
      pegawaiList: absenPegawaiList,
      absenList: filteredAbsen,
      kegiatanLabel:
        selectedKegiatanId === null
          ? "Rekap Absen Apel"
          : selectedKegiatan?.nama_kegiatan || "Rekap Absen",
      tanggalMulai: exportTanggalMulai,
      tanggalSelesai: exportTanggalSelesai,
      penanggungJawab,
      jabatanPenanggungJawab,
      hariKerja: 22,
      
      // DATA KEGIATAN
      kolomAbsenList: selectedKegiatanId !== null ? kolomAbsenList : [],
      absensiData: selectedKegiatanId !== null ? absensiKegiatanData : [],
      absensiKeteranganData: selectedKegiatanId !== null ? absensiKeteranganList : [],
      keteranganColumns: selectedKegiatanId !== null ? keteranganColumns : [],
      isKegiatanMode: selectedKegiatanId !== null,
      
      // ✅ INFO KEGIATAN
      kegiatanInfo,
    });

    setShowExportModal(false);
  };

  const handleExportPDF = () => {
    exportToPDF({
      absenPegawaiList,
      getAbsenStatus,
      selectedDate,
      kegiatanLabel:
        selectedKegiatanId === null
          ? "Absensi Harian"
          : selectedKegiatan?.nama_kegiatan || "Kegiatan",
    });
  };

  // ══════════════════════════════════════════════════════════════
  // STATS
  // ══════════════════════════════════════════════════════════════

  const stats = {
    total: absenPegawaiList.length,
    hadir: filteredAbsen.filter((a) => a.keterangan === "Hadir").length,
    izinCutiSakit: filteredAbsen.filter((a) =>
      ["Izin", "Cuti", "Sakit"].includes(a.keterangan)
    ).length,
    alpha: filteredAbsen.filter((a) => a.keterangan === "Alpha").length,
    belum: absenPegawaiList.length - filteredAbsen.length,
  };

  const getAssignedCount = (kegiatanId: number) => {
    return kegiatanPegawaiRows.filter((row) => row.kegiatan_id === kegiatanId).length;
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
                ? "Absensi Harian"
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
              <button className="today-btn" onClick={() => setSelectedDate(todayDate)}>
                Hari Ini
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs Kegiatan ── */}
      <div className="glass kegiatan-tabs-card">
        <p className="kegiatan-tabs-label">Pilih Absen:</p>
        <div className="kegiatan-tabs">
          <button
            className={`kegiatan-tab ${selectedKegiatanId === null ? "active" : ""}`}
            onClick={() => setSelectedKegiatanId(null)}
          >
            <Calendar size={16} />
            Absen Harian
          </button>

          {kegiatanList.map((k) => (
            <button
              key={k.id}
              className={`kegiatan-tab ${selectedKegiatanId === k.id ? "active" : ""}`}
              onClick={() => setSelectedKegiatanId(k.id)}
            >
              <FolderOpen size={16} />
              {k.nama_kegiatan}
              <span className="kegiatan-tab-count">{getAssignedCount(k.id)}</span>
            </button>
          ))}
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

      {/* ── Stats (Hanya untuk Absen Harian) ── */}
      {selectedKegiatanId === null && (
        <div className="stats-grid">
          {[
            { label: "Total", value: stats.total, color: "#3b82f6", icon: <Users size={22} color="white" /> },
            { label: "Hadir", value: stats.hadir, color: "#10b981", icon: <CheckCircle2 size={22} color="white" /> },
            { label: "Izin/Cuti/Sakit", value: stats.izinCutiSakit, color: "#f59e0b", icon: <FileText size={22} color="white" /> },
            { label: "Alpha", value: stats.alpha, color: "#ef4444", icon: <XCircle size={22} color="white" /> },
            { label: "Belum Absen", value: stats.belum, color: "#94a3b8", icon: <Calendar size={22} color="white" /> },
          ].map((s) => (
            <div className="stat-card" key={s.label}>
              <div>
                <p className="stat-label">{s.label}</p>
                <h3 className="stat-value" style={{ color: s.color }}>
                  {s.value}
                </h3>
              </div>
              <div className="stat-icon" style={{ background: s.color }}>
                {s.icon}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Search & Export ── */}
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

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ABSEN HARIAN (Checkbox Keterangan) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {selectedKegiatanId === null && (
        <>
          {clusterOptions.map((cluster) => {
            const cfg = clusterConfig[cluster];
            const Icon = cfg.icon;
            const list = filteredPegawai.filter((p) => p.cluster === cluster);

            if (list.length === 0) return null;

            return (
              <div key={cluster} className="cluster-section">
                <div
                  className="cluster-header"
                  style={{
                    background: cfg.bg,
                    borderLeft: `4px solid ${cfg.color}`,
                  }}
                >
                  <div className="cluster-header-left">
                    <div
                      className="cluster-header-icon"
                      style={{ background: cfg.gradient }}
                    >
                      <Icon size={20} color="white" />
                    </div>
                    <div>
                      <h3 className="cluster-header-title" style={{ color: cfg.color }}>
                        {cluster}
                      </h3>
                      <p className="cluster-header-count">{list.length} pegawai</p>
                    </div>
                  </div>
                </div>

                <div className="glass cluster-table-card">
                  <div className="cluster-bulk-actions">
                    <button
                      className="bulk-btn bulk-btn-hadir"
                      disabled={bulkLoadingCluster === cluster}
                      onClick={() => bulkSetAbsenByCluster(cluster, "Hadir")}
                    >
                      ✅ Semua Hadir
                    </button>

                    <button
                      className="bulk-btn bulk-btn-izin"
                      disabled={bulkLoadingCluster === cluster}
                      onClick={() => bulkSetAbsenByCluster(cluster, "Izin")}
                    >
                      🟡 Semua Izin
                    </button>

                    <button
                      className="bulk-btn bulk-btn-alpha"
                      disabled={bulkLoadingCluster === cluster}
                      onClick={() => bulkSetAbsenByCluster(cluster, "Alpha")}
                    >
                      🔴 Semua Alpha
                    </button>

                    <button
                      className="bulk-btn bulk-btn-clear"
                      disabled={bulkLoadingCluster === cluster}
                      onClick={() => clearClusterAbsen(cluster)}
                    >
                      ❌ Hapus Cluster
                    </button>
                  </div>

                  <div className="table-wrapper">
                    <table className="absen-table">
                      <thead>
                        <tr>
                          <th className="th-no">No</th>
                          <th className="th-nama">Nama Pegawai</th>
                          <th className="th-nip">NIP</th>
                          <th className="th-jabatan">Jabatan</th>
                          {keteranganOptions.map((ket) => (
                            <th key={ket} className="th-status">
                              <div
                                className="th-status-label"
                                style={{ borderBottom: `3px solid ${keteranganColors[ket]}` }}
                              >
                                {ket}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((pegawai, index) => {
                          const status = getAbsenStatus(pegawai.id);

                          return (
                            <tr key={pegawai.id} className="absen-row">
                              <td className="td-no">{index + 1}</td>
                              <td className="td-nama">
                                <div className="nama-cell">
                                  <div
                                    className="avatar"
                                    style={{ background: cfg.gradient }}
                                  >
                                    {pegawai.nama_pegawai.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="nama-info">
                                    <span className="nama-text">{pegawai.nama_pegawai}</span>
                                    {status && (
                                      <span
                                        className="nama-status-badge"
                                        style={{ background: keteranganColors[status] }}
                                      >
                                        {status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="td-nip">{pegawai.nip}</td>
                              <td className="td-jabatan">{pegawai.jabatan || "-"}</td>

                              {keteranganOptions.map((ket) => {
                                const isChecked = status === ket;

                                return (
                                  <td key={ket} className="td-checkbox">
                                    <label className="checkbox-wrapper">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleCheckAbsen(pegawai.id, ket)}
                                        className="hidden-checkbox"
                                      />
                                      <div
                                        className={`custom-checkbox ${isChecked ? "checked" : ""}`}
                                        style={
                                          isChecked
                                            ? {
                                                background: keteranganColors[ket],
                                                borderColor: keteranganColors[ket],
                                              }
                                            : {}
                                        }
                                      >
                                        {isChecked && (
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
              </div>
            );
          })}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ABSEN KEGIATAN (Tabel 2-Level Header + Kolom Kanan) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {selectedKegiatanId !== null && (allMetode.length > 0 || keteranganColumns.length > 0) && (
        <div className="glass">
          <div className="table-wrapper">
            <table className="absen-table">
              <thead>
                {/* ─ ROW 1: HEADER KATEGORI + HEADER "ABSEN" ─ */}
                <tr>
                  {/* Kolom nama pegawai — rowspan 2 */}
                  <th
                    className="th-nama-pegawai"
                    rowSpan={2}
                    style={{ verticalAlign: "middle" }}
                  >
                    Nama Pegawai
                  </th>

                  {/* Setiap kategori: colspan = jumlah metodenya */}
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

                  {/* Header gabung "ABSEN" — colspan = jumlah keterangan dipilih */}
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
                  {/* Sub-header per metode */}
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
                          <span style={{ fontSize: 10, color: "#64748b", fontStyle: "italic" }}>
                            {m.satuan}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}

                  {/* Sub-header keterangan absen kanan */}
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

                      {/* Checkbox keterangan (radio-style: 1 pilihan) */}
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

      {/* ── Empty State untuk Kegiatan Tanpa Kolom & Keterangan ── */}
      {selectedKegiatanId !== null && allMetode.length === 0 && keteranganColumns.length === 0 && (
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

      {/* ── Empty State untuk Kegiatan Tanpa Pegawai ── */}
      {selectedKegiatanId !== null && absenPegawaiList.length === 0 && (
        <div className="glass" style={{ textAlign: "center", padding: "60px 20px" }}>
          <FolderOpen size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
          <p style={{ color: "#64748b", fontSize: 16 }}>
            Belum ada pegawai yang di-assign ke kegiatan ini.
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