import { useEffect, useMemo, useState, useCallback } from "react";
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
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";
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
  // STATE - DRAFT NILAI & LOADING
  // ══════════════════════════════════════════════════════════════
  
  const [draftNilai, setDraftNilai] = useState<Record<string, string>>({});
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [loadingAbsen, setLoadingAbsen] = useState<Record<number, boolean>>({});
  const [loadingKeterangan, setLoadingKeterangan] = useState<Record<number, boolean>>({});
  const [isLoadingData, setIsLoadingData] = useState(false);

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
  // FETCH FUNCTIONS - GUARANTEED FRESH DATA
  // ══════════════════════════════════════════════════════════════

  const fetchAbsenByDate = useCallback(async (date: string) => {
    console.log("📥 Fetching absen for date:", date);
    try {
      const { data, error } = await supabase
        .from("absen")
        .select("*")
        .eq("tanggal", date)
        .order("id", { ascending: true });

      if (error) throw error;

      console.log("✅ Absen fetched:", data?.length || 0, "records");
      setAbsenList((data as Absen[]) || []);
      return data as Absen[];
    } catch (error: any) {
      console.error("❌ Error fetch absen:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal Memuat Data",
        text: error.message,
        confirmButtonColor: "#3b82f6",
      });
      return [];
    }
  }, []);

  const fetchKegiatan = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("kegiatan")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setKegiatanList((data as KegiatanExtended[]) || []);
    } catch (error: any) {
      console.error("❌ Error fetch kegiatan:", error);
    }
  }, []);

  const fetchKegiatanPegawai = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("kegiatan_pegawai")
        .select("*");

      if (error) throw error;

      setKegiatanPegawaiRows((data as KegiatanPegawaiRow[]) || []);
    } catch (error: any) {
      console.error("❌ Error fetch kegiatan_pegawai:", error);
    }
  }, []);

  const fetchKolomAbsen = useCallback(async (kegiatanId: number) => {
    console.log("📥 Fetching kolom absen for kegiatan:", kegiatanId);
    try {
      const { data, error } = await supabase
        .from("kolom_absen")
        .select("*")
        .eq("kegiatan_id", kegiatanId)
        .order("urutan", { ascending: true });

      if (error) throw error;
      
      console.log("✅ Kolom fetched:", data?.length || 0, "columns");
      setKolomAbsenList((data as KolomAbsen[]) || []);
    } catch (error: any) {
      console.error("❌ Error fetch kolom:", error);
    }
  }, []);

  const fetchAbsensiKegiatan = useCallback(async (kegiatanId: number, tanggal: string) => {
    console.log("📥 Fetching absensi for kegiatan:", kegiatanId, "tanggal:", tanggal);
    try {
      const { data, error } = await supabase
        .from("absensi")
        .select("*")
        .eq("kegiatan_id", kegiatanId)
        .eq("tanggal", tanggal);

      if (error) throw error;
      
      console.log("✅ Absensi fetched:", data?.length || 0, "records");
      setAbsensiKegiatanData((data as Absensi[]) || []);
    } catch (error: any) {
      console.error("❌ Error fetch absensi:", error);
    }
  }, []);

  const fetchAbsensiKeterangan = useCallback(async (kegiatanId: number, tanggal: string) => {
    console.log("📥 Fetching keterangan for kegiatan:", kegiatanId);
    try {
      const { data, error } = await supabase
        .from("absensi_keterangan")
        .select("*")
        .eq("kegiatan_id", kegiatanId)
        .eq("tanggal", tanggal);

      if (error) throw error;
      
      console.log("✅ Keterangan fetched:", data?.length || 0, "records");
      setAbsensiKeteranganList((data as AbsensiKeterangan[]) || []);
    } catch (error: any) {
      console.error("❌ Error fetch keterangan:", error);
    }
  }, []);

  // ══════════════════════════════════════════════════════════════
  // USE EFFECT - LOAD DATA
  // ══════════════════════════════════════════════════════════════

  useEffect(() => {
    refreshPegawai();
    fetchKegiatan();
    fetchKegiatanPegawai();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      
      // ✅ Reset draft state saat ganti context
      setDraftNilai({});
      setSavingCells(new Set());
      
      try {
        if (selectedKegiatanId === null) {
          // Absen harian
          await fetchAbsenByDate(selectedDate);
          setKolomAbsenList([]);
          setAbsensiKegiatanData([]);
          setAbsensiKeteranganList([]);
        } else {
          // Absen kegiatan
          await Promise.all([
            fetchKolomAbsen(selectedKegiatanId),
            fetchAbsensiKegiatan(selectedKegiatanId, selectedDate),
            fetchAbsensiKeterangan(selectedKegiatanId, selectedDate),
          ]);
          
          setAbsenList([]);
        }
      } finally {
        setIsLoadingData(false);
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
  const keteranganColumns = selectedKegiatan?.keterangan_columns ?? [];

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

  // ══════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS - ABSEN HARIAN (NO OPTIMISTIC UPDATES)
  // ══════════════════════════════════════════════════════════════

  const getAbsenStatus = (pegawaiId: number): KeteranganAbsen | null => {
    const found = filteredAbsen.find((a) => a.pegawai_id === pegawaiId);
    return found ? found.keterangan : null;
  };

  const handleCheckAbsen = async (pegawaiId: number, ket: KeteranganAbsen) => {
    // ✅ Set loading state
    setLoadingAbsen(prev => ({ ...prev, [pegawaiId]: true }));

    const existing = filteredAbsen.find((a) => a.pegawai_id === pegawaiId);

    try {
      if (existing) {
        if (existing.keterangan === ket) {
          // ✅ Hapus absen (uncheck)
          console.log("🗑️ Deleting absen:", existing.id);
          
          const { error } = await supabase
            .from("absen")
            .delete()
            .eq("id", existing.id);

          if (error) throw error;
          
          console.log("✅ Absen deleted successfully");
        } else {
          // ✅ Update keterangan
          console.log("📝 Updating absen:", existing.id, "to", ket);
          
          // Delete old + insert new (lebih aman daripada update)
          const { error: deleteError } = await supabase
            .from("absen")
            .delete()
            .eq("id", existing.id);
            
          if (deleteError) throw deleteError;

          const { error: insertError } = await supabase
            .from("absen")
            .insert([{
              pegawai_id: pegawaiId,
              tanggal: selectedDate,
              keterangan: ket,
              kegiatan_id: selectedKegiatanId,
            }]);

          if (insertError) throw insertError;
          
          console.log("✅ Absen updated successfully");
        }
      } else {
        // ✅ Insert absen baru
        console.log("➕ Inserting new absen for pegawai:", pegawaiId);
        
        const { error } = await supabase
          .from("absen")
          .insert([{
            pegawai_id: pegawaiId,
            tanggal: selectedDate,
            keterangan: ket,
            kegiatan_id: selectedKegiatanId,
          }]);

        if (error) throw error;
        
        console.log("✅ Absen inserted successfully");
      }

      // ✅ ALWAYS REFRESH FROM DATABASE
      await fetchAbsenByDate(selectedDate);
      
    } catch (error: any) {
      console.error("❌ Error pada handleCheckAbsen:", error);
      
      Swal.fire({
        icon: "error",
        title: "Gagal Menyimpan",
        text: error.message || "Terjadi kesalahan saat menyimpan absen",
        confirmButtonColor: "#3b82f6",
      });
      
      // ✅ Refresh tetap dilakukan untuk sinkronisasi
      await fetchAbsenByDate(selectedDate);
    } finally {
      setLoadingAbsen(prev => {
        const newState = { ...prev };
        delete newState[pegawaiId];
        return newState;
      });
    }
  };

  // ══════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS - NILAI PENILAIAN (GUARANTEED SAVE)
  // ══════════════════════════════════════════════════════════════

  const cellKey = (pegawaiId: number, kolomId: number) => `${pegawaiId}_${kolomId}`;

  const getNilaiCell = (pegawaiId: number, kolomId: number) => {
    const key = cellKey(pegawaiId, kolomId);
    
    // ✅ Prioritas: draft > database
    if (key in draftNilai) return draftNilai[key];
    
    const dbValue = absensiKegiatanData.find(
      (a) => a.pegawai_id === pegawaiId && a.kolom_absen_id === kolomId
    )?.nilai ?? "";
    
    return dbValue;
  };

  const saveNilaiCell = async (pegawaiId: number, kolomId: number) => {
    if (!selectedKegiatanId) return;

    const key = cellKey(pegawaiId, kolomId);
    const nilai = (draftNilai[key] ?? "").trim();

    // ✅ Mark as saving
    setSavingCells(prev => new Set(prev).add(key));

    try {
      const existing = absensiKegiatanData.find(
        (a) =>
          a.pegawai_id === pegawaiId &&
          a.kolom_absen_id === kolomId &&
          a.tanggal === selectedDate
      );

      if (!nilai) {
        // ✅ Hapus jika kosong
        if (existing) {
          console.log("🗑️ Deleting nilai:", key);
          
          const { error } = await supabase
            .from("absensi")
            .delete()
            .eq("id", existing.id);
            
          if (error) throw error;
          
          console.log("✅ Nilai deleted");
        }
      } else {
        // ✅ Insert or update
        console.log("💾 Saving nilai:", key, "=", nilai);
        
        // Delete old if exists, then insert new (most reliable)
        if (existing) {
          const { error: deleteError } = await supabase
            .from("absensi")
            .delete()
            .eq("id", existing.id);
            
          if (deleteError) throw deleteError;
        }

        const { error: insertError } = await supabase
          .from("absensi")
          .insert([{
            kegiatan_id: selectedKegiatanId,
            pegawai_id: pegawaiId,
            kolom_absen_id: kolomId,
            nilai,
            tanggal: selectedDate,
          }]);

        if (insertError) throw insertError;
        
        console.log("✅ Nilai saved successfully");
      }

      // ✅ Clear draft for this cell
      setDraftNilai(prev => {
        const newDraft = { ...prev };
        delete newDraft[key];
        return newDraft;
      });

      // ✅ ALWAYS REFRESH FROM DATABASE
      await fetchAbsensiKegiatan(selectedKegiatanId, selectedDate);
      
    } catch (error: any) {
      console.error("❌ Error save nilai:", error);
      
      Swal.fire({
        icon: "error",
        title: "Gagal Simpan Nilai",
        text: error.message,
        confirmButtonColor: "#3b82f6",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      });
      
      // ✅ Refresh untuk sinkronisasi
      await fetchAbsensiKegiatan(selectedKegiatanId, selectedDate);
    } finally {
      setSavingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  // ══════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS - KETERANGAN ABSEN (GUARANTEED SAVE)
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

    // ✅ Set loading
    setLoadingKeterangan(prev => ({ ...prev, [pegawaiId]: true }));

    try {
      const existing = absensiKeteranganList.find(
        (a) => a.pegawai_id === pegawaiId && a.tanggal === selectedDate
      );

      if (!ket) {
        // ✅ Hapus keterangan
        if (existing) {
          console.log("🗑️ Deleting keterangan for pegawai:", pegawaiId);
          
          const { error } = await supabase
            .from("absensi_keterangan")
            .delete()
            .eq("id", existing.id);
            
          if (error) throw error;
          
          console.log("✅ Keterangan deleted");
        }
      } else {
        // ✅ Insert or update
        console.log("💾 Saving keterangan:", pegawaiId, "=", ket);
        
        // Delete old if exists, then insert new
        if (existing) {
          const { error: deleteError } = await supabase
            .from("absensi_keterangan")
            .delete()
            .eq("id", existing.id);
            
          if (deleteError) throw deleteError;
        }

        const { error: insertError } = await supabase
          .from("absensi_keterangan")
          .insert([{
            kegiatan_id: selectedKegiatanId,
            pegawai_id: pegawaiId,
            tanggal: selectedDate,
            keterangan: ket,
          }]);

        if (insertError) throw insertError;
        
        console.log("✅ Keterangan saved successfully");
      }

      // ✅ ALWAYS REFRESH FROM DATABASE
      await fetchAbsensiKeterangan(selectedKegiatanId, selectedDate);
      
    } catch (error: any) {
      console.error("❌ Error save keterangan:", error);
      
      Swal.fire({
        icon: "error",
        title: "Gagal Simpan Keterangan",
        text: error.message,
        confirmButtonColor: "#3b82f6",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      });
      
      // ✅ Refresh untuk sinkronisasi
      await fetchAbsensiKeterangan(selectedKegiatanId, selectedDate);
    } finally {
      setLoadingKeterangan(prev => {
        const newState = { ...prev };
        delete newState[pegawaiId];
        return newState;
      });
    }
  };

  // ══════════════════════════════════════════════════════════════
  // BULK ACTIONS (GUARANTEED SAVE)
  // ══════════════════════════════════════════════════════════════

  const bulkSetAbsenByCluster = async (
    cluster: ClusterType,
    keterangan: KeteranganAbsen
  ) => {
    const clusterPegawai = filteredPegawai.filter((p) => p.cluster === cluster);

    if (clusterPegawai.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Tidak Ada Pegawai",
        text: `Tidak ada pegawai di cluster ${cluster}`,
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    setBulkLoadingCluster(cluster);

    try {
      const pegawaiIds = clusterPegawai.map((p) => p.id);
      
      // ✅ Step 1: Delete existing records
      console.log("🗑️ Deleting existing absen for cluster:", cluster);
      
      const { error: deleteError } = await supabase
        .from("absen")
        .delete()
        .eq("tanggal", selectedDate)
        .in("pegawai_id", pegawaiIds)
        .is("kegiatan_id", selectedKegiatanId);

      if (deleteError) throw deleteError;

      // ✅ Step 2: Insert new records
      console.log("➕ Inserting new absen for cluster:", cluster);
      
      const payload = clusterPegawai.map((pegawai) => ({
        pegawai_id: pegawai.id,
        tanggal: selectedDate,
        keterangan,
        kegiatan_id: selectedKegiatanId,
      }));

      const { error: insertError } = await supabase
        .from("absen")
        .insert(payload);

      if (insertError) throw insertError;

      console.log("✅ Bulk insert successful");

      // ✅ ALWAYS REFRESH FROM DATABASE
      await fetchAbsenByDate(selectedDate);

      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: `${clusterPegawai.length} pegawai cluster ${cluster} berhasil di-set ${keterangan}`,
        confirmButtonColor: "#3b82f6",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      });
      
    } catch (error: any) {
      console.error("❌ Error bulk set absen:", error);
      
      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text: error.message || "Gagal set absen cluster",
        confirmButtonColor: "#3b82f6",
      });
      
      // ✅ Refresh untuk sinkronisasi
      await fetchAbsenByDate(selectedDate);
    } finally {
      setBulkLoadingCluster(null);
    }
  };

  const clearClusterAbsen = async (cluster: ClusterType) => {
    const clusterPegawai = filteredPegawai.filter((p) => p.cluster === cluster);
    
    if (clusterPegawai.length === 0) {
      Swal.fire({
        icon: "info",
        title: "Tidak Ada Pegawai",
        text: `Tidak ada pegawai di cluster ${cluster}`,
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    const result = await Swal.fire({
      icon: "warning",
      title: "Kosongkan Checkbox",
      text: `Yakin ingin mengosongkan semua checkbox cluster ${cluster}?`,
      showCancelButton: true,
      confirmButtonColor: "#f59e0b",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Kosongkan!",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    setBulkLoadingCluster(cluster);

    try {
      const pegawaiIds = clusterPegawai.map((p) => p.id);
      
      console.log("🗑️ Clearing cluster absen:", cluster);
      
      const { error } = await supabase
        .from("absen")
        .delete()
        .eq("tanggal", selectedDate)
        .in("pegawai_id", pegawaiIds)
        .is("kegiatan_id", selectedKegiatanId);

      if (error) throw error;

      console.log("✅ Cluster cleared successfully");

      // ✅ ALWAYS REFRESH FROM DATABASE
      await fetchAbsenByDate(selectedDate);

      Swal.fire({
        icon: "success",
        title: "Berhasil Dikosongkan!",
        text: `Checkbox cluster ${cluster} berhasil dikosongkan`,
        confirmButtonColor: "#3b82f6",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      });
      
    } catch (error: any) {
      console.error("❌ Error clear cluster:", error);
      
      Swal.fire({
        icon: "error",
        title: "Gagal Dikosongkan!",
        text: error.message || "Gagal mengosongkan checkbox cluster",
        confirmButtonColor: "#3b82f6",
      });
      
      // ✅ Refresh untuk sinkronisasi
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
  // EXPORT (Unchanged - keeping your existing export logic)
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

  const confirmExportExcel = async () => {
    try {
      Swal.fire({
        title: "Mempersiapkan Data...",
        html: `
          <div style="text-align: center;">
            <div style="margin: 20px 0;">
              <div style="
                border: 4px solid #f3f4f6;
                border-top: 4px solid #3b82f6;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto;
              "></div>
            </div>
            <p style="color: #64748b; font-size: 14px; margin: 10px 0;">
              Fetching semua data dari database...
            </p>
          </div>
        `,
        didOpen: () => {
          Swal.showLoading();
        },
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
      });

      const styleEl = document.createElement("style");
      styleEl.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(styleEl);

      console.log("🚀 Export started");

      // ✅ FETCH FRESH DATA FROM DATABASE
      const { data: pegawaiDataRaw, error: pegawaiError } = await supabase
        .from("pegawai")
        .select("*")
        .order("urutan", { ascending: true });

      if (pegawaiError) throw new Error(`Gagal fetch pegawai: ${pegawaiError.message}`);

      let freshPegawaiList = (pegawaiDataRaw || []) as Pegawai[];

      if (selectedKegiatanId !== null) {
        const { data: kegiatanPegawaiData, error: kegiatanPegawaiError } = await supabase
          .from("kegiatan_pegawai")
          .select("*")
          .eq("kegiatan_id", selectedKegiatanId);

        if (kegiatanPegawaiError) throw new Error(`Gagal fetch kegiatan_pegawai: ${kegiatanPegawaiError.message}`);

        const assignedIds = (kegiatanPegawaiData || []).map((row: KegiatanPegawaiRow) => row.pegawai_id);
        freshPegawaiList = freshPegawaiList.filter((p) => assignedIds.includes(p.id));
      }

      const { data: absenData, error: absenError } = await supabase
        .from("absen")
        .select("*")
        .gte("tanggal", exportTanggalMulai)
        .lte("tanggal", exportTanggalSelesai)
        .is("kegiatan_id", selectedKegiatanId);

      if (absenError) throw new Error(`Gagal fetch absen: ${absenError.message}`);

      let absensiData: Absensi[] = [];
      let absensiKeteranganData: AbsensiKeterangan[] = [];
      let kolomData: KolomAbsen[] = [];

      if (selectedKegiatanId !== null) {
        const [absensiResult, keteranganResult, kolomResult] = await Promise.all([
          supabase
            .from("absensi")
            .select("*")
            .eq("kegiatan_id", selectedKegiatanId)
            .gte("tanggal", exportTanggalMulai)
            .lte("tanggal", exportTanggalSelesai),
          
          supabase
            .from("absensi_keterangan")
            .select("*")
            .eq("kegiatan_id", selectedKegiatanId)
            .gte("tanggal", exportTanggalMulai)
            .lte("tanggal", exportTanggalSelesai),
          
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
        kolomData = (kolomResult.data || []) as KolomAbsen[];
      }

      if (selectedKegiatanId === null && (!absenData || absenData.length === 0)) {
        Swal.close();
        Swal.fire({
          icon: "warning",
          title: "Tidak Ada Data",
          text: `Tidak ada data absen untuk periode yang dipilih`,
          confirmButtonColor: "#3b82f6",
        });
        return;
      }

      let kegiatanInfo = null;
      if (selectedKegiatanId !== null && selectedKegiatan) {
        kegiatanInfo = {
          instruktur: freshPegawaiList.find((p) => p.id === selectedKegiatan.instruktur_id)?.nama_pegawai,
          asisten: freshPegawaiList.find((p) => p.id === selectedKegiatan.asisten_id)?.nama_pegawai,
          pejabat: freshPegawaiList.find((p) => p.id === selectedKegiatan.pejabat_id)?.nama_pegawai,
          materi: selectedKegiatan.materi,
        };
      }

      console.log("✅ Data fetched, generating Excel...");

      Swal.update({
        title: "Menggenerate Excel...",
        html: `<div style="text-align: center;"><p>Generating Excel file...</p></div>`,
      });

      exportToExcel({
        pegawaiList: freshPegawaiList,
        absenList: (absenData || []) as Absen[],
        kegiatanLabel:
          selectedKegiatanId === null
            ? "Rekap Absen Apel"
            : selectedKegiatan?.nama_kegiatan || "Rekap Absen",
        tanggalMulai: exportTanggalMulai,
        tanggalSelesai: exportTanggalSelesai,
        penanggungJawab,
        jabatanPenanggungJawab,
        hariKerja: 22,
        kolomAbsenList: kolomData,
        absensiData: absensiData,
        absensiKeteranganData: absensiKeteranganData,
        keteranganColumns: selectedKegiatanId !== null ? keteranganColumns : [],
        isKegiatanMode: selectedKegiatanId !== null,
        kegiatanInfo,
      });

      setShowExportModal(false);
      Swal.close();

      Swal.fire({
        icon: "success",
        title: "Export Berhasil! ✅",
        html: `
          <div style="text-align: left; color: #1f2937;">
            <p><strong>Data Summary:</strong><br>
            • Pegawai: ${freshPegawaiList.length}<br>
            • Absen Records: ${absenData?.length || 0}</p>
          </div>
        `,
        confirmButtonColor: "#3b82f6",
      });

      console.log("✅ Export completed");

    } catch (error: any) {
      console.error("❌ Export error:", error);
      
      Swal.close();
      
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
        getAbsenStatus,
        selectedDate,
        kegiatanLabel:
          selectedKegiatanId === null
            ? "Absensi Harian"
            : selectedKegiatan?.nama_kegiatan || "Kegiatan",
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
      console.error("Export PDF error:", error);
      Swal.fire({
        icon: "error",
        title: "Export Gagal!",
        text: error.message || "Terjadi kesalahan saat export PDF",
        confirmButtonColor: "#3b82f6",
      });
    }
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

      {/* ✅ Loading Indicator */}
      {isLoadingData && (
        <div className="glass" style={{ textAlign: "center", padding: "40px" }}>
          <Loader2 size={40} className="animate-spin" style={{ margin: "0 auto", color: "#3b82f6" }} />
          <p style={{ marginTop: 16, color: "#64748b" }}>Memuat data...</p>
        </div>
      )}

      {/* ── Info Kegiatan ── */}
      {!isLoadingData && selectedKegiatanId !== null && (
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

      {/* ── Stats ── */}
      {!isLoadingData && selectedKegiatanId === null && (
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
      {!isLoadingData && (
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
      {/* ABSEN HARIAN */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {!isLoadingData && selectedKegiatanId === null && (
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
                      {bulkLoadingCluster === cluster ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        "✅"
                      )}{" "}
                      Semua Hadir
                    </button>

                    <button
                      className="bulk-btn bulk-btn-izin"
                      disabled={bulkLoadingCluster === cluster}
                      onClick={() => bulkSetAbsenByCluster(cluster, "Izin")}
                    >
                      {bulkLoadingCluster === cluster ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        "🟡"
                      )}{" "}
                      Semua Izin
                    </button>

                    <button
                      className="bulk-btn bulk-btn-alpha"
                      disabled={bulkLoadingCluster === cluster}
                      onClick={() => bulkSetAbsenByCluster(cluster, "Alpha")}
                    >
                      {bulkLoadingCluster === cluster ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        "🔴"
                      )}{" "}
                      Semua Alpha
                    </button>

                    <button
                      className="bulk-btn bulk-btn-clear"
                      disabled={bulkLoadingCluster === cluster}
                      onClick={() => clearClusterAbsen(cluster)}
                      style={{ background: "#fbbf24", color: "#78350f" }}
                    >
                      {bulkLoadingCluster === cluster ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        "✕"
                      )}{" "}
                      Kosongkan
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
                          const isLoading = loadingAbsen[pegawai.id];

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
                                        disabled={isLoading}
                                        onChange={() => handleCheckAbsen(pegawai.id, ket)}
                                        className="hidden-checkbox"
                                      />
                                      <div
                                        className={`custom-checkbox ${isChecked ? "checked" : ""} ${isLoading ? "loading" : ""}`}
                                        style={
                                          isChecked
                                            ? {
                                                background: keteranganColors[ket],
                                                borderColor: keteranganColors[ket],
                                              }
                                            : {}
                                        }
                                      >
                                        {isLoading ? (
                                          <Loader2 size={14} color="white" className="animate-spin" />
                                        ) : isChecked ? (
                                          <Check size={14} color="white" strokeWidth={3} />
                                        ) : null}
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
      {/* ABSEN KEGIATAN */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {!isLoadingData && selectedKegiatanId !== null && (allMetode.length > 0 || keteranganColumns.length > 0) && (
        <div className="glass">
          <div className="table-wrapper">
            <table className="absen-table">
              <thead>
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
                          <span style={{ fontSize: 10, color: "#64748b", fontStyle: "italic" }}>
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
                  const isLoadingKet = loadingKeterangan[pegawai.id];

                  return (
                    <tr key={pegawai.id}>
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

                      {allMetode.map((m) => {
                        const key = cellKey(pegawai.id, m.id);
                        const val = getNilaiCell(pegawai.id, m.id);
                        const isSaving = savingCells.has(key);

                        return (
                          <td key={m.id} className="absen-cell" style={{ position: "relative" }}>
                            <input
                              className="absen-input"
                              value={val}
                              placeholder="-"
                              disabled={isSaving}
                              onChange={(e) =>
                                setDraftNilai((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              onBlur={() => saveNilaiCell(pegawai.id, m.id)}
                              style={isSaving ? { opacity: 0.6 } : {}}
                            />
                            {isSaving && (
                              <div style={{
                                position: "absolute",
                                top: "50%",
                                right: 8,
                                transform: "translateY(-50%)",
                              }}>
                                <Loader2 size={14} className="animate-spin" color="#3b82f6" />
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {keteranganColumns.map((ket) => {
                        const checked = currentKet === ket;

                        return (
                          <td key={ket} className="absen-cell">
                            <label className="checkbox-wrapper">
                              <input
                                type="checkbox"
                                className="hidden-checkbox"
                                checked={checked}
                                disabled={isLoadingKet}
                                onChange={() =>
                                  setKeteranganPegawai(
                                    pegawai.id,
                                    checked ? null : ket
                                  )
                                }
                              />
                              <div
                                className={`custom-checkbox ${checked ? "checked" : ""} ${isLoadingKet ? "loading" : ""}`}
                                style={
                                  checked
                                    ? {
                                        background: keteranganColors[ket],
                                        borderColor: keteranganColors[ket],
                                      }
                                    : {}
                                }
                              >
                                {isLoadingKet ? (
                                  <Loader2 size={14} color="white" className="animate-spin" />
                                ) : checked ? (
                                  <Check size={14} color="white" strokeWidth={3} />
                                ) : null}
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

      {/* ── Empty States ── */}
      {!isLoadingData && selectedKegiatanId !== null && allMetode.length === 0 && keteranganColumns.length === 0 && (
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

      {!isLoadingData && selectedKegiatanId !== null && absenPegawaiList.length === 0 && (
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

      {/* ✅ ADD LOADING SPINNER ANIMATION STYLE */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        .custom-checkbox.loading {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}