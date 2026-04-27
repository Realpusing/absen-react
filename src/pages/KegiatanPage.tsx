// src/pages/KegiatanPage.tsx
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  FolderOpen,
  Edit2,
  Trash2,
  Plus,
  X,
  Check,
  User,
  Users,
  BookOpen,
  Calendar,
  ListChecks,
  Shield,
  Save,
  Layers,
} from "lucide-react";
import Swal from "sweetalert2";
import { supabase } from "../supabase";
import {
  clusterOptions,
  clusterConfig,
  keteranganOptions,
  keteranganColors,
} from "../constants";
import type {
  Pegawai,
  Kegiatan,
  KolomAbsen,
  Absensi,
  KeteranganAbsen,
  AbsensiKeterangan,
  Profile,
} from "../types";

// ══════════════════════════════════════════════════════════════
// TYPES LOKAL
// ══════════════════════════════════════════════════════════════

interface KegiatanPegawaiRow {
  id: number;
  kegiatan_id: number;
  pegawai_id: number;
}

interface KegiatanExtended extends Kegiatan {
  pejabat_id?: number | null;
  keterangan_columns?: KeteranganAbsen[] | null;
  created_by?: string | null; // ✅ TAMBAH
}

interface Props {
  pegawaiList: Pegawai[];
  refreshPegawai: () => Promise<void>;
  profile: Profile; // ✅ TAMBAH: untuk cek role
}

// ══════════════════════════════════════════════════════════════
// KOMPONEN UTAMA
// ══════════════════════════════════════════════════════════════

export default function KegiatanPage({ pegawaiList, refreshPegawai, profile }: Props) {

  // ── STATE: KEGIATAN ──────────────────────────────────────────
  const [kegiatanList, setKegiatanList] = useState<KegiatanExtended[]>([]);
  const [editKegiatanId, setEditKegiatanId] = useState<number | null>(null);

  // form kegiatan
  const [formNamaKegiatan, setFormNamaKegiatan] = useState("");
  const [formDeskripsi, setFormDeskripsi] = useState("");
  const [formTanggal, setFormTanggal] = useState("");
  const [formInstrukturId, setFormInstrukturId] = useState("");
  const [formAsistenId, setFormAsistenId] = useState("");
  const [formPejabatId, setFormPejabatId] = useState("");
  const [formMateri, setFormMateri] = useState("");

  // ── STATE: KEGIATAN PEGAWAI ──────────────────────────────────
  const [kegiatanPegawaiRows, setKegiatanPegawaiRows] = useState<KegiatanPegawaiRow[]>([]);

  // ── STATE: MODAL ASSIGN PEGAWAI ──────────────────────────────
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignKegiatanId, setAssignKegiatanId] = useState<number | null>(null);

  // ── STATE: MODAL KELOLA PENILAIAN ────────────────────────────
  const [showKelolaModal, setShowKelolaModal] = useState(false);
  const [kelolaKegiatan, setKelolaKegiatan] = useState<KegiatanExtended | null>(null);

  // data kolom penilaian (free text)
  const [kolomAbsenList, setKolomAbsenList] = useState<KolomAbsen[]>([]);
  // data nilai penilaian
  const [absensiList, setAbsensiList] = useState<Absensi[]>([]);
  // data keterangan absen (kolom kanan)
  const [absensiKeteranganList, setAbsensiKeteranganList] = useState<AbsensiKeterangan[]>([]);

  // kolom ABSEN kanan yang dipilih
  const [keteranganColumns, setKeteranganColumns] = useState<KeteranganAbsen[]>([]);

  // form tambah metode
  const [formKategori, setFormKategori] = useState("");
  const [formMetode, setFormMetode] = useState("");
  const [formSatuan, setFormSatuan] = useState("");

  // draft nilai input (save onBlur)
  const [draftNilai, setDraftNilai] = useState<Record<string, string>>({});

  // tanggal hari ini
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // ══════════════════════════════════════════════════════════════
  // FETCH FUNCTIONS
  // ══════════════════════════════════════════════════════════════

  const fetchKegiatan = async () => {
    let query = supabase
      .from("kegiatan")
      .select("*")
      .order("created_at", { ascending: false });

    // ✅ bag_umum hanya lihat kegiatan miliknya
    if (profile.role === "bag_umum") {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        query = query.eq("created_by", user.id);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("fetchKegiatan error:", error.message);
      return;
    }
    setKegiatanList((data as KegiatanExtended[]) || []);
  };

  const fetchKegiatanPegawai = async () => {
    const { data, error } = await supabase
      .from("kegiatan_pegawai")
      .select("*");

    if (error) {
      console.error("fetchKegiatanPegawai error:", error.message);
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
      console.error("fetchKolomAbsen error:", error.message);
      return;
    }
    setKolomAbsenList((data as KolomAbsen[]) || []);
  };

  const fetchAbsensi = async (kegiatanId: number, tanggal: string) => {
    const { data, error } = await supabase
      .from("absensi")
      .select("*")
      .eq("kegiatan_id", kegiatanId)
      .eq("tanggal", tanggal);

    if (error) {
      console.error("fetchAbsensi error:", error.message);
      return;
    }
    setAbsensiList((data as Absensi[]) || []);
  };

  const fetchAbsensiKeterangan = async (kegiatanId: number, tanggal: string) => {
    const { data, error } = await supabase
      .from("absensi_keterangan")
      .select("*")
      .eq("kegiatan_id", kegiatanId)
      .eq("tanggal", tanggal);

    if (error) {
      console.error("fetchAbsensiKeterangan error:", error.message);
      return;
    }
    setAbsensiKeteranganList((data as AbsensiKeterangan[]) || []);
  };

  useEffect(() => {
    refreshPegawai();
    fetchKegiatan();
    fetchKegiatanPegawai();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ══════════════════════════════════════════════════════════════
  // HELPER
  // ══════════════════════════════════════════════════════════════

  const sortedPegawai = useMemo(
    () => [...pegawaiList].sort((a, b) => a.nama_pegawai.localeCompare(b.nama_pegawai, "id")),
    [pegawaiList]
  );

  const getNamaPegawai = (id?: number | null) => {
    if (!id) return "-";
    return pegawaiList.find((p) => p.id === id)?.nama_pegawai ?? "-";
  };

  const formatTanggal = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // ✅ Cek apakah user boleh edit/delete kegiatan ini
  const canModify = async (kegiatan: KegiatanExtended): Promise<boolean> => {
    if (profile.role === "admin") return true;

    const { data: { user } } = await supabase.auth.getUser();
    return kegiatan.created_by === user?.id;
  };

  // group kolom_absen by nama_kategori
  const groupedKolom = useMemo(() => {
    const map = new Map<string, KolomAbsen[]>();
    for (const k of kolomAbsenList) {
      if (!map.has(k.nama_kategori)) map.set(k.nama_kategori, []);
      map.get(k.nama_kategori)!.push(k);
    }
    return map;
  }, [kolomAbsenList]);

  // semua metode dalam urutan tampil
  const allMetode = useMemo(
    () => [...groupedKolom.values()].flat(),
    [groupedKolom]
  );

  // ══════════════════════════════════════════════════════════════
  // RESET FORM KEGIATAN
  // ══════════════════════════════════════════════════════════════

  const resetFormKegiatan = () => {
    setFormNamaKegiatan("");
    setFormDeskripsi("");
    setFormTanggal("");
    setFormInstrukturId("");
    setFormAsistenId("");
    setFormPejabatId("");
    setFormMateri("");
    setEditKegiatanId(null);
  };

  // ══════════════════════════════════════════════════════════════
  // CRUD KEGIATAN
  // ══════════════════════════════════════════════════════════════

  const submitKegiatan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formNamaKegiatan.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Peringatan",
        text: "Nama kegiatan wajib diisi",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    // ✅ Ambil user yang sedang login
    const { data: { user } } = await supabase.auth.getUser();

    const payload: any = {
      nama_kegiatan: formNamaKegiatan.trim(),
      deskripsi: formDeskripsi.trim() || null,
      tanggal_pelaksanaan: formTanggal || null,
      instruktur_id: formInstrukturId ? Number(formInstrukturId) : null,
      asisten_id: formAsistenId ? Number(formAsistenId) : null,
      pejabat_id: formPejabatId ? Number(formPejabatId) : null,
      materi: formMateri.trim() || null,
    };

    if (editKegiatanId) {
      // ✅ Cek izin edit
      const kegiatan = kegiatanList.find((k) => k.id === editKegiatanId);
      if (kegiatan && !(await canModify(kegiatan))) {
        Swal.fire({
          icon: "error",
          title: "Akses Ditolak",
          text: "Kamu tidak bisa mengedit kegiatan milik orang lain",
          confirmButtonColor: "#3b82f6",
        });
        return;
      }

      const { error } = await supabase
        .from("kegiatan")
        .update(payload)
        .eq("id", editKegiatanId);

      if (error) {
        Swal.fire({
          icon: "error",
          title: "Gagal Update",
          text: error.message,
          confirmButtonColor: "#3b82f6",
        });
        return;
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Kegiatan berhasil diupdate",
        confirmButtonColor: "#3b82f6",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false,
      });

    } else {
      // ✅ Insert dengan created_by
      payload.created_by = user?.id;

      const { error } = await supabase
        .from("kegiatan")
        .insert([payload]);

      if (error) {
        Swal.fire({
          icon: "error",
          title: "Gagal Tambah",
          text: error.message,
          confirmButtonColor: "#3b82f6",
        });
        return;
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Kegiatan berhasil ditambahkan",
        confirmButtonColor: "#3b82f6",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false,
      });
    }

    resetFormKegiatan();
    fetchKegiatan();
  };

  const handleEditKegiatan = async (item: KegiatanExtended) => {
    // ✅ Cek izin
    if (!(await canModify(item))) {
      Swal.fire({
        icon: "error",
        title: "Akses Ditolak",
        text: "Kamu tidak bisa mengedit kegiatan milik orang lain",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    setFormNamaKegiatan(item.nama_kegiatan);
    setFormDeskripsi(item.deskripsi || "");
    setFormTanggal(item.tanggal_pelaksanaan || "");
    setFormInstrukturId(item.instruktur_id ? String(item.instruktur_id) : "");
    setFormAsistenId(item.asisten_id ? String(item.asisten_id) : "");
    setFormPejabatId(item.pejabat_id ? String(item.pejabat_id) : "");
    setFormMateri(item.materi || "");
    setEditKegiatanId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteKegiatan = async (item: KegiatanExtended) => {
    // ✅ Cek izin
    if (!(await canModify(item))) {
      Swal.fire({
        icon: "error",
        title: "Akses Ditolak",
        text: "Kamu tidak bisa menghapus kegiatan milik orang lain",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus Kegiatan?",
      text: `Yakin ingin menghapus "${item.nama_kegiatan}"? Data absensi juga akan ikut terhapus.`,
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase
      .from("kegiatan")
      .delete()
      .eq("id", item.id);

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal Hapus",
        text: error.message,
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    Swal.fire({
      icon: "success",
      title: "Berhasil Dihapus!",
      confirmButtonColor: "#3b82f6",
      toast: true,
      position: "top-end",
      timer: 2000,
      showConfirmButton: false,
    });

    fetchKegiatan();
    fetchKegiatanPegawai();
  };

  // ══════════════════════════════════════════════════════════════
  // ASSIGN PEGAWAI
  // ══════════════════════════════════════════════════════════════

  const isAssigned = (kegiatanId: number, pegawaiId: number) =>
    kegiatanPegawaiRows.some(
      (r) => r.kegiatan_id === kegiatanId && r.pegawai_id === pegawaiId
    );

  const getAssignedPegawai = (kegiatanId: number) => {
    const ids = kegiatanPegawaiRows
      .filter((r) => r.kegiatan_id === kegiatanId)
      .map((r) => r.pegawai_id);
    return pegawaiList.filter((p) => ids.includes(p.id));
  };

  const getAssignedIds = (kegiatanId: number) =>
    kegiatanPegawaiRows
      .filter((r) => r.kegiatan_id === kegiatanId)
      .map((r) => r.pegawai_id);

  const togglePegawai = async (kegiatanId: number, pegawaiId: number) => {
    const existing = kegiatanPegawaiRows.find(
      (r) => r.kegiatan_id === kegiatanId && r.pegawai_id === pegawaiId
    );

    if (existing) {
      const { error } = await supabase
        .from("kegiatan_pegawai")
        .delete()
        .eq("id", existing.id);

      if (error) {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: error.message,
          confirmButtonColor: "#3b82f6",
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from("kegiatan_pegawai")
        .insert([{ kegiatan_id: kegiatanId, pegawai_id: pegawaiId }]);

      if (error) {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: error.message,
          confirmButtonColor: "#3b82f6",
        });
        return;
      }
    }

    fetchKegiatanPegawai();
  };

  const selectAllPegawai = async (kegiatanId: number) => {
    const assignedIds = getAssignedIds(kegiatanId);
    const payload = pegawaiList
      .filter((p) => !assignedIds.includes(p.id))
      .map((p) => ({ kegiatan_id: kegiatanId, pegawai_id: p.id }));

    if (payload.length === 0) return;

    const { error } = await supabase.from("kegiatan_pegawai").insert(payload);

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.message,
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    fetchKegiatanPegawai();
  };

  const deselectAllPegawai = async (kegiatanId: number) => {
    const { error } = await supabase
      .from("kegiatan_pegawai")
      .delete()
      .eq("kegiatan_id", kegiatanId);

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.message,
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    fetchKegiatanPegawai();
  };

  // ══════════════════════════════════════════════════════════════
  // BUKA/TUTUP MODAL KELOLA
  // ══════════════════════════════════════════════════════════════

  const openKelola = async (item: KegiatanExtended) => {
    setKelolaKegiatan(item);
    setKeteranganColumns(item.keterangan_columns ?? []);
    setDraftNilai({});
    setFormKategori("");
    setFormMetode("");
    setFormSatuan("");

    await fetchKolomAbsen(item.id);
    await fetchAbsensi(item.id, today);
    await fetchAbsensiKeterangan(item.id, today);

    setShowKelolaModal(true);
  };

  const closeKelola = () => {
    setShowKelolaModal(false);
    setKelolaKegiatan(null);
    setKolomAbsenList([]);
    setAbsensiList([]);
    setAbsensiKeteranganList([]);
    setKeteranganColumns([]);
    setDraftNilai({});
    setFormKategori("");
    setFormMetode("");
    setFormSatuan("");
  };

  // ══════════════════════════════════════════════════════════════
  // KOLOM PENILAIAN (kolom_absen)
  // ══════════════════════════════════════════════════════════════

  const addMetodePenilaian = async () => {
    if (!kelolaKegiatan) return;

    if (!formKategori.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Peringatan",
        text: "Nama kategori wajib diisi (contoh: Kebugaran Fisik)",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    if (!formMetode.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Peringatan",
        text: "Nama metode wajib diisi (contoh: Push Up / Lari / Pull Up)",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    const urutan = kolomAbsenList.length;

    const { error } = await supabase.from("kolom_absen").insert([
      {
        kegiatan_id: kelolaKegiatan.id,
        nama_kategori: formKategori.trim(),
        metode: formMetode.trim(),
        satuan: formSatuan.trim() || null,
        urutan,
      },
    ]);

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal tambah metode: " + error.message,
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    setFormMetode("");
    setFormSatuan("");
    fetchKolomAbsen(kelolaKegiatan.id);
  };

  const deleteMetodePenilaian = async (kolomId: number) => {
    if (!kelolaKegiatan) return;

    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus Metode?",
      text: "Data nilainya juga akan terhapus.",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase
      .from("kolom_absen")
      .delete()
      .eq("id", kolomId);

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.message,
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    await fetchKolomAbsen(kelolaKegiatan.id);
    await fetchAbsensi(kelolaKegiatan.id, today);
  };

  // ══════════════════════════════════════════════════════════════
  // KOLOM ABSEN KANAN (keterangan_columns)
  // ══════════════════════════════════════════════════════════════

  const toggleKeteranganColumn = (ket: KeteranganAbsen) => {
    setKeteranganColumns((prev) =>
      prev.includes(ket) ? prev.filter((x) => x !== ket) : [...prev, ket]
    );
  };

  const saveKeteranganColumns = async () => {
    if (!kelolaKegiatan) return;

    const { error } = await supabase
      .from("kegiatan")
      .update({ keterangan_columns: keteranganColumns } as any)
      .eq("id", kelolaKegiatan.id);

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal simpan kolom ABSEN: " + error.message,
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    setKegiatanList((prev) =>
      prev.map((k) =>
        k.id === kelolaKegiatan.id
          ? { ...k, keterangan_columns: keteranganColumns }
          : k
      )
    );

    Swal.fire({
      icon: "success",
      title: "Berhasil!",
      text: "Kolom ABSEN berhasil disimpan",
      confirmButtonColor: "#3b82f6",
      toast: true,
      position: "top-end",
      timer: 2000,
      showConfirmButton: false,
    });
  };

  // ══════════════════════════════════════════════════════════════
  // NILAI FREE TEXT (absensi) — save onBlur
  // ══════════════════════════════════════════════════════════════

  const cellKey = (pegawaiId: number, kolomId: number) => `${pegawaiId}_${kolomId}`;

  const getNilaiCell = (pegawaiId: number, kolomId: number) => {
    const key = cellKey(pegawaiId, kolomId);
    if (key in draftNilai) return draftNilai[key];
    return absensiList.find(
      (a) => a.pegawai_id === pegawaiId && a.kolom_absen_id === kolomId
    )?.nilai ?? "";
  };

  const saveNilaiCell = async (pegawaiId: number, kolomId: number) => {
    if (!kelolaKegiatan) return;

    const key = cellKey(pegawaiId, kolomId);
    const nilai = (draftNilai[key] ?? "").trim();

    const existing = absensiList.find(
      (a) =>
        a.pegawai_id === pegawaiId &&
        a.kolom_absen_id === kolomId &&
        a.tanggal === today
    );

    if (!nilai) {
      if (existing) {
        const { error } = await supabase
          .from("absensi")
          .delete()
          .eq("id", existing.id);

        if (error) {
          console.error("Gagal hapus nilai:", error.message);
          return;
        }
        await fetchAbsensi(kelolaKegiatan.id, today);
      }
      return;
    }

    const { error } = await supabase.from("absensi").upsert(
      [{
        kegiatan_id: kelolaKegiatan.id,
        pegawai_id: pegawaiId,
        kolom_absen_id: kolomId,
        nilai,
        tanggal: today,
      }],
      { onConflict: "kegiatan_id,pegawai_id,kolom_absen_id,sub_kolom,tanggal" }
    );

    if (error) {
      console.error("Gagal simpan nilai:", error.message);
      return;
    }

    await fetchAbsensi(kelolaKegiatan.id, today);
  };

  // ══════════════════════════════════════════════════════════════
  // ABSEN KANAN (absensi_keterangan)
  // ══════════════════════════════════════════════════════════════

  const getKeteranganPegawai = (pegawaiId: number): KeteranganAbsen | null => {
    const row = absensiKeteranganList.find(
      (a) => a.pegawai_id === pegawaiId && a.tanggal === today
    );
    return (row?.keterangan as KeteranganAbsen) ?? null;
  };

  const setKeteranganPegawai = async (
    pegawaiId: number,
    ket: KeteranganAbsen | null
  ) => {
    if (!kelolaKegiatan) return;

    const existing = absensiKeteranganList.find(
      (a) => a.pegawai_id === pegawaiId && a.tanggal === today
    );

    if (!ket) {
      if (existing) {
        const { error } = await supabase
          .from("absensi_keterangan")
          .delete()
          .eq("id", existing.id);

        if (error) {
          console.error("Gagal hapus keterangan:", error.message);
          return;
        }
      }
      await fetchAbsensiKeterangan(kelolaKegiatan.id, today);
      return;
    }

    const { error } = await supabase.from("absensi_keterangan").upsert(
      [{
        kegiatan_id: kelolaKegiatan.id,
        pegawai_id: pegawaiId,
        tanggal: today,
        keterangan: ket,
      }],
      { onConflict: "kegiatan_id,pegawai_id,tanggal" }
    );

    if (error) {
      console.error("Gagal simpan keterangan:", error.message);
      return;
    }

    await fetchAbsensiKeterangan(kelolaKegiatan.id, today);
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <div className="page">

      {/* ── HEADER ── */}
      <div className="glass page-header-card">
        <div className="header-top">
          <div>
            <h1 className="page-title">Kelola Kegiatan</h1>
            <p className="page-subtitle">
              {profile.role === "bag_umum"
                ? "Kelola kegiatan yang kamu buat sendiri"
                : "Buat kegiatan, assign pegawai, tambah metode penilaian, dan atur kolom ABSEN"}
            </p>
          </div>
          <ClipboardList size={48} color="#3b82f6" />
        </div>
      </div>

      {/* ── FORM KEGIATAN ── */}
      <div className="glass">
        <h2 className="section-title">
          {editKegiatanId ? "✏️ Edit Kegiatan" : "➕ Tambah Kegiatan"}
        </h2>

        <form onSubmit={submitKegiatan}>
          <div className="form-grid">
            <input
              type="text"
              placeholder="Nama Kegiatan *"
              value={formNamaKegiatan}
              onChange={(e) => setFormNamaKegiatan(e.target.value)}
              required
              className="form-input"
            />

            <input
              type="text"
              placeholder="Deskripsi"
              value={formDeskripsi}
              onChange={(e) => setFormDeskripsi(e.target.value)}
              className="form-input"
            />

            <div className="form-input-group">
              <label className="form-label">
                <Calendar size={12} style={{ display: "inline", marginRight: 4 }} />
                Tanggal Pelaksanaan
              </label>
              <input
                type="date"
                value={formTanggal}
                onChange={(e) => setFormTanggal(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-input-group">
              <label className="form-label">
                <BookOpen size={12} style={{ display: "inline", marginRight: 4 }} />
                Materi
              </label>
              <input
                type="text"
                placeholder="Contoh: Lari, Push Up, Sit Up"
                value={formMateri}
                onChange={(e) => setFormMateri(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-input-group">
              <label className="form-label">
                <User size={12} style={{ display: "inline", marginRight: 4 }} />
                Instruktur
              </label>
              <select
                value={formInstrukturId}
                onChange={(e) => setFormInstrukturId(e.target.value)}
                className="form-input"
              >
                <option value="">— Pilih Instruktur —</option>
                {sortedPegawai.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama_pegawai}{p.jabatan ? ` — ${p.jabatan}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-input-group">
              <label className="form-label">
                <Users size={12} style={{ display: "inline", marginRight: 4 }} />
                Asisten
              </label>
              <select
                value={formAsistenId}
                onChange={(e) => setFormAsistenId(e.target.value)}
                className="form-input"
              >
                <option value="">— Pilih Asisten —</option>
                {sortedPegawai.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama_pegawai}{p.jabatan ? ` — ${p.jabatan}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-input-group">
              <label className="form-label">
                <Shield size={12} style={{ display: "inline", marginRight: 4 }} />
                Pejabat yang Mengetahui
              </label>
              <select
                value={formPejabatId}
                onChange={(e) => setFormPejabatId(e.target.value)}
                className="form-input"
              >
                <option value="">— Pilih Pejabat —</option>
                {sortedPegawai.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama_pegawai}{p.jabatan ? ` — ${p.jabatan}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editKegiatanId ? "💾 Update Kegiatan" : "➕ Tambah Kegiatan"}
            </button>
            {editKegiatanId && (
              <button
                type="button"
                className="btn-secondary"
                onClick={resetFormKegiatan}
              >
                ❌ Batal
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── LIST KEGIATAN ── */}
      {kegiatanList.map((item) => {
        const assignedPegawai = getAssignedPegawai(item.id);
        const kCols = item.keterangan_columns ?? [];

        return (
          <div key={item.id} className="glass kegiatan-card">
            <div className="kegiatan-card-header">
              <div className="kegiatan-card-info">
                <FolderOpen size={24} color="#3b82f6" />
                <div style={{ flex: 1 }}>
                  <h3 className="kegiatan-card-title">{item.nama_kegiatan}</h3>
                  {item.deskripsi && (
                    <p className="kegiatan-card-desc">{item.deskripsi}</p>
                  )}

                  <div className="kegiatan-info-grid">
                    {item.tanggal_pelaksanaan && (
                      <div className="kegiatan-info-item">
                        <Calendar size={14} color="#3b82f6" />
                        <span className="kegiatan-info-label">Tanggal:</span>
                        <span className="kegiatan-info-value">
                          {formatTanggal(item.tanggal_pelaksanaan)}
                        </span>
                      </div>
                    )}

                    {item.instruktur_id && (
                      <div className="kegiatan-info-item">
                        <User size={14} color="#10b981" />
                        <span className="kegiatan-info-label">Instruktur:</span>
                        <span className="kegiatan-info-value">
                          {getNamaPegawai(item.instruktur_id)}
                        </span>
                      </div>
                    )}

                    {item.asisten_id && (
                      <div className="kegiatan-info-item">
                        <Users size={14} color="#f59e0b" />
                        <span className="kegiatan-info-label">Asisten:</span>
                        <span className="kegiatan-info-value">
                          {getNamaPegawai(item.asisten_id)}
                        </span>
                      </div>
                    )}

                    {item.pejabat_id && (
                      <div className="kegiatan-info-item">
                        <Shield size={14} color="#d97706" />
                        <span className="kegiatan-info-label">Pejabat:</span>
                        <span className="kegiatan-info-value">
                          {getNamaPegawai(item.pejabat_id)}
                        </span>
                      </div>
                    )}

                    {item.materi && (
                      <div className="kegiatan-info-item">
                        <BookOpen size={14} color="#8b5cf6" />
                        <span className="kegiatan-info-label">Materi:</span>
                        <span className="kegiatan-info-value">{item.materi}</span>
                      </div>
                    )}

                    <div className="kegiatan-info-item">
                      <span className="kegiatan-assigned-badge">
                        👥 {assignedPegawai.length} pegawai
                      </span>
                    </div>

                    {kCols.length > 0 && (
                      <div className="kegiatan-info-item">
                        <span
                          className="kegiatan-assigned-badge"
                          style={{ background: "#0ea5e9" }}
                        >
                          📋 Absen: {kCols.join(", ")}
                        </span>
                      </div>
                    )}

                    {/* ✅ Badge kepemilikan untuk bag_umum */}
                    {profile.role === "bag_umum" && (
                      <div className="kegiatan-info-item">
                        <span
                          className="kegiatan-assigned-badge"
                          style={{ background: "#8b5cf6" }}
                        >
                          👤 Kegiatan Saya
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="kegiatan-card-actions">
                <button
                  className="btn-assign"
                  title="Atur Pegawai"
                  onClick={() => {
                    setAssignKegiatanId(item.id);
                    setShowAssignModal(true);
                  }}
                >
                  <Plus size={16} /> Pegawai
                </button>

                <button
                  className="btn-absen"
                  title="Kelola Penilaian & Absen"
                  onClick={() => openKelola(item)}
                >
                  <ListChecks size={16} /> Penilaian
                </button>

                <button
                  className="btn-edit"
                  onClick={() => handleEditKegiatan(item)}
                >
                  <Edit2 size={16} />
                </button>

                <button
                  className="btn-delete"
                  onClick={() => handleDeleteKegiatan(item)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {assignedPegawai.length > 0 && (
              <div className="assigned-pegawai-list">
                {assignedPegawai.map((p) => (
                  <div key={p.id} className="assigned-pegawai-chip">
                    <span>{p.nama_pegawai}</span>
                    <button
                      className="chip-remove"
                      onClick={() => togglePegawai(item.id, p.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {kegiatanList.length === 0 && (
        <div className="glass" style={{ textAlign: "center", padding: 60 }}>
          <ClipboardList size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
          <p style={{ color: "#64748b" }}>
            {profile.role === "bag_umum"
              ? "Belum ada kegiatan yang kamu buat. Silakan tambahkan di atas."
              : "Belum ada kegiatan."}
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: ASSIGN PEGAWAI */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showAssignModal && assignKegiatanId && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Atur Pegawai untuk Kegiatan</h2>
              <button
                className="modal-close"
                onClick={() => setShowAssignModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-actions-row">
              <button
                className="btn-select-all"
                onClick={() => selectAllPegawai(assignKegiatanId)}
              >
                ✅ Pilih Semua
              </button>
              <button
                className="btn-deselect-all"
                onClick={() => deselectAllPegawai(assignKegiatanId)}
              >
                ❌ Hapus Semua
              </button>
              <span className="modal-count">
                {getAssignedIds(assignKegiatanId).length} terpilih
              </span>
            </div>

            <div className="modal-pegawai-list">
              {clusterOptions.map((cluster) => {
                const list = pegawaiList.filter((p) => p.cluster === cluster);
                if (list.length === 0) return null;
                const cfg = clusterConfig[cluster];

                return (
                  <div key={cluster}>
                    <div
                      className="modal-cluster-label"
                      style={{
                        color: cfg.color,
                        borderLeft: `3px solid ${cfg.color}`,
                        paddingLeft: 12,
                      }}
                    >
                      {cluster} ({list.length})
                    </div>

                    {list.map((p) => {
                      const checked = isAssigned(assignKegiatanId, p.id);
                      return (
                        <label
                          key={p.id}
                          className={`modal-pegawai-item ${checked ? "selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePegawai(assignKegiatanId, p.id)}
                            className="hidden-checkbox"
                          />
                          <div
                            className={`custom-checkbox ${checked ? "checked" : ""}`}
                            style={
                              checked
                                ? { background: cfg.color, borderColor: cfg.color }
                                : {}
                            }
                          >
                            {checked && (
                              <Check size={14} color="white" strokeWidth={3} />
                            )}
                          </div>
                          <span className="modal-pegawai-name">{p.nama_pegawai}</span>
                          <span className="modal-pegawai-jabatan">{p.jabatan}</span>
                        </label>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="modal-footer">
              <button
                className="btn-primary"
                onClick={() => setShowAssignModal(false)}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: KELOLA PENILAIAN */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showKelolaModal && kelolaKegiatan && (
        <div className="modal-overlay" onClick={closeKelola}>
          <div
            className="modal-content modal-absen"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>📋 Kelola Penilaian — {kelolaKegiatan.nama_kegiatan}</h2>
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  Tanggal input: {today}
                </p>
              </div>
              <button className="modal-close" onClick={closeKelola}>
                <X size={20} />
              </button>
            </div>

            {/* 1️⃣ TAMBAH METODE */}
            <div className="absen-kolom-section">
              <h3 style={{ marginBottom: 4, fontSize: 16, color: "#0f172a" }}>
                1️⃣ Tambah Metode Penilaian (Nilai Free Text)
              </h3>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
                Satu kategori (misal: <strong>Kebugaran Fisik</strong>) bisa punya
                banyak metode. Tambah satu per satu.
              </p>

              <div
                className="form-grid"
                style={{ gridTemplateColumns: "2fr 2fr 1fr" }}
              >
                <div className="form-input-group">
                  <label className="form-label">Nama Kategori</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Kebugaran Fisik"
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                  />
                </div>

                <div className="form-input-group">
                  <label className="form-label">Metode Penilaian *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Push Up / Lari 2.4 KM / Pull Up"
                    value={formMetode}
                    onChange={(e) => setFormMetode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addMetodePenilaian();
                      }
                    }}
                  />
                </div>

                <div className="form-input-group">
                  <label className="form-label">Satuan (opsional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="rep/mnt / meter"
                    value={formSatuan}
                    onChange={(e) => setFormSatuan(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addMetodePenilaian();
                      }
                    }}
                  />
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={addMetodePenilaian}
                style={{ marginTop: 12 }}
              >
                <Plus size={16} /> Tambah Metode
              </button>

              {groupedKolom.size > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p
                    style={{
                      fontWeight: 600,
                      color: "#475569",
                      marginBottom: 8,
                    }}
                  >
                    Metode yang sudah ditambahkan:
                  </p>

                  {[...groupedKolom.entries()].map(([kategori, methods]) => (
                    <div key={kategori} style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontWeight: 700,
                          color: "#0f172a",
                          fontSize: 14,
                          marginBottom: 6,
                          padding: "6px 10px",
                          background: "#f1f5f9",
                          borderRadius: 8,
                        }}
                      >
                        <Layers size={16} color="#3b82f6" />
                        {kategori}
                        <span style={{ fontWeight: 400, color: "#64748b" }}>
                          ({methods.length} metode)
                        </span>
                      </div>

                      <div style={{ paddingLeft: 8 }}>
                        {methods.map((m) => (
                          <div
                            key={m.id}
                            className="kolom-display-card"
                            style={{ marginBottom: 6 }}
                          >
                            <div className="kolom-content">
                              <div
                                className="kolom-kategori"
                                style={{ fontSize: 14 }}
                              >
                                {m.metode || "(Tanpa metode)"}
                              </div>
                              {m.satuan && (
                                <div className="kolom-detail">
                                  Satuan: {m.satuan}
                                </div>
                              )}
                            </div>
                            <button
                              className="kolom-delete"
                              title="Hapus metode ini"
                              onClick={() => deleteMetodePenilaian(m.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2️⃣ PILIH KOLOM ABSEN */}
            <div className="absen-kolom-section">
              <h3 style={{ marginBottom: 4, fontSize: 16, color: "#0f172a" }}>
                2️⃣ Pilih Kolom ABSEN (tampil di ujung kanan tabel)
              </h3>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
                Centang keterangan yang ingin ditampilkan sebagai kolom checkbox di
                sebelah kanan kolom penilaian.
              </p>

              <div className="keterangan-checkbox-grid">
                {keteranganOptions.map((ket) => {
                  const isChecked = keteranganColumns.includes(ket);
                  const color = keteranganColors[ket];

                  return (
                    <label
                      key={ket}
                      className={`keterangan-checkbox-item ${isChecked ? "checked" : ""}`}
                      style={
                        isChecked
                          ? { borderColor: color, background: `${color}18` }
                          : {}
                      }
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleKeteranganColumn(ket)}
                        className="hidden-checkbox"
                      />
                      <div
                        className={`custom-checkbox ${isChecked ? "checked" : ""}`}
                        style={
                          isChecked
                            ? { background: color, borderColor: color }
                            : {}
                        }
                      >
                        {isChecked && (
                          <Check size={14} color="white" strokeWidth={3} />
                        )}
                      </div>
                      <span
                        style={{ fontWeight: isChecked ? 700 : 500, fontSize: 14 }}
                      >
                        {ket}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 14,
                  alignItems: "center",
                }}
              >
                <button className="btn-primary" onClick={saveKeteranganColumns}>
                  <Save size={16} /> Simpan Kolom ABSEN
                </button>
                <span style={{ fontSize: 13, color: "#64748b" }}>
                  {keteranganColumns.length} kolom dipilih
                </span>
              </div>
            </div>

            {/* 3️⃣ INPUT NILAI & ABSEN */}
            <div style={{ margin: "0 24px 24px" }}>
              <h3 style={{ marginBottom: 10, fontSize: 16, color: "#0f172a" }}>
                3️⃣ Input Nilai & Absen Pegawai
              </h3>

              {allMetode.length === 0 && keteranganColumns.length === 0 ? (
                <div
                  className="glass"
                  style={{ textAlign: "center", padding: 40, color: "#64748b" }}
                >
                  <p>Belum ada metode penilaian maupun kolom ABSEN.</p>
                  <p style={{ fontSize: 13, marginTop: 4 }}>
                    Tambahkan metode di atas atau pilih kolom ABSEN terlebih dahulu.
                  </p>
                </div>
              ) : (
                <div className="absen-table-wrapper">
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
                              background:
                                "linear-gradient(135deg,#e0f2fe,#bae6fd)",
                              borderLeft: "3px solid #0ea5e9",
                            }}
                          >
                            <div className="th-kolom-content">
                              <div
                                className="th-kategori"
                                style={{ color: "#0369a1" }}
                              >
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
                      {getAssignedPegawai(kelolaKegiatan.id)
                        .sort(
                          (a, b) => (a.urutan ?? 999999) - (b.urutan ?? 999999)
                        )
                        .map((pegawai) => {
                          const currentKet = getKeteranganPegawai(pegawai.id);

                          return (
                            <tr key={pegawai.id}>
                              <td className="pegawai-name-cell">
                                {pegawai.nama_pegawai}
                              </td>

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
                                      onBlur={() =>
                                        saveNilaiCell(pegawai.id, m.id)
                                      }
                                    />
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
                                          <Check
                                            size={14}
                                            color="white"
                                            strokeWidth={3}
                                          />
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

                  {getAssignedPegawai(kelolaKegiatan.id).length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: 40,
                        color: "#64748b",
                      }}
                    >
                      <p>Belum ada pegawai yang di-assign ke kegiatan ini.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={closeKelola}>
                <Save size={16} /> Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}