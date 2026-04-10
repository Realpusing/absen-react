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
import { supabase } from "../supabase";
import {
  initialKegiatanForm,
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
}

interface Props {
  pegawaiList: Pegawai[];
  refreshPegawai: () => Promise<void>;
}

// ══════════════════════════════════════════════════════════════
// KOMPONEN UTAMA
// ══════════════════════════════════════════════════════════════

export default function KegiatanPage({ pegawaiList, refreshPegawai }: Props) {

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

  // kolom ABSEN kanan yang dipilih admin
  const [keteranganColumns, setKeteranganColumns] = useState<KeteranganAbsen[]>([]);

  // form tambah metode
  const [formKategori, setFormKategori] = useState("");
  const [formMetode, setFormMetode] = useState("");
  const [formSatuan, setFormSatuan] = useState("");

  // draft nilai input (save onBlur, bukan onChange)
  const [draftNilai, setDraftNilai] = useState<Record<string, string>>({});

  // tanggal hari ini
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // ══════════════════════════════════════════════════════════════
  // FETCH FUNCTIONS
  // ══════════════════════════════════════════════════════════════

  const fetchKegiatan = async () => {
    const { data, error } = await supabase
      .from("kegiatan")
      .select("*")
      .order("created_at", { ascending: false });

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
      alert("Nama kegiatan wajib diisi");
      return;
    }

    const payload = {
      nama_kegiatan: formNamaKegiatan.trim(),
      deskripsi: formDeskripsi.trim() || null,
      tanggal_pelaksanaan: formTanggal || null,
      instruktur_id: formInstrukturId ? Number(formInstrukturId) : null,
      asisten_id: formAsistenId ? Number(formAsistenId) : null,
      pejabat_id: formPejabatId ? Number(formPejabatId) : null,
      materi: formMateri.trim() || null,
    };

    if (editKegiatanId) {
      const { error } = await supabase
        .from("kegiatan")
        .update(payload)
        .eq("id", editKegiatanId);

      if (error) {
        alert("Gagal update: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("kegiatan").insert([payload]);

      if (error) {
        alert("Gagal tambah: " + error.message);
        return;
      }
    }

    resetFormKegiatan();
    fetchKegiatan();
  };

  const handleEditKegiatan = (item: KegiatanExtended) => {
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

  const handleDeleteKegiatan = async (id: number) => {
    if (!window.confirm("Yakin hapus kegiatan ini?")) return;

    const { error } = await supabase.from("kegiatan").delete().eq("id", id);

    if (error) {
      alert("Gagal hapus: " + error.message);
      return;
    }

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
      if (error) { alert("Gagal hapus: " + error.message); return; }
    } else {
      const { error } = await supabase
        .from("kegiatan_pegawai")
        .insert([{ kegiatan_id: kegiatanId, pegawai_id: pegawaiId }]);
      if (error) { alert("Gagal tambah: " + error.message); return; }
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
    if (error) { alert("Gagal pilih semua: " + error.message); return; }

    fetchKegiatanPegawai();
  };

  const deselectAllPegawai = async (kegiatanId: number) => {
    const { error } = await supabase
      .from("kegiatan_pegawai")
      .delete()
      .eq("kegiatan_id", kegiatanId);

    if (error) { alert("Gagal hapus semua: " + error.message); return; }

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
      alert("Nama kategori wajib diisi (contoh: Kebugaran Fisik)");
      return;
    }
    if (!formMetode.trim()) {
      alert("Nama metode wajib diisi (contoh: Push Up / Lari / Pull Up)");
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
      alert("Gagal tambah metode: " + error.message);
      return;
    }

    setFormMetode("");
    setFormSatuan("");
    // biarkan formKategori tetap agar user bisa tambah metode lain di kategori sama
    fetchKolomAbsen(kelolaKegiatan.id);
  };

  const deleteMetodePenilaian = async (kolomId: number) => {
    if (!kelolaKegiatan) return;
    if (!window.confirm("Hapus metode ini? Data nilainya juga akan terhapus.")) return;

    const { error } = await supabase.from("kolom_absen").delete().eq("id", kolomId);
    if (error) { alert("Gagal hapus metode: " + error.message); return; }

    await fetchKolomAbsen(kelolaKegiatan.id);
    await fetchAbsensi(kelolaKegiatan.id, today);
  };

  // ══════════════════════════════════════════════════════════════
  // KOLOM ABSEN KANAN (keterangan_columns di tabel kegiatan)
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
      alert("Gagal simpan kolom ABSEN: " + error.message);
      return;
    }

    // update list local juga
    setKegiatanList((prev) =>
      prev.map((k) =>
        k.id === kelolaKegiatan.id
          ? { ...k, keterangan_columns: keteranganColumns }
          : k
      )
    );

    alert("✅ Kolom ABSEN berhasil disimpan!");
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
      // hapus jika ada
      if (existing) {
        const { error } = await supabase.from("absensi").delete().eq("id", existing.id);
        if (error) { console.error("Gagal hapus nilai:", error.message); return; }
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
      { onConflict: "kegiatan_id,pegawai_id,kolom_absen_id,tanggal" }
    );

    if (error) { console.error("Gagal simpan nilai:", error.message); return; }

    await fetchAbsensi(kelolaKegiatan.id, today);
  };

  // ══════════════════════════════════════════════════════════════
  // ABSEN KANAN (absensi_keterangan) — 1 pilihan per pegawai
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
        if (error) { console.error("Gagal hapus keterangan:", error.message); return; }
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

    if (error) { console.error("Gagal simpan keterangan:", error.message); return; }

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
              Buat kegiatan, assign pegawai, tambah metode penilaian (nilai bebas),
              dan atur kolom ABSEN di ujung kanan tabel.
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

            {/* Nama Kegiatan */}
            <input
              type="text"
              placeholder="Nama Kegiatan *"
              value={formNamaKegiatan}
              onChange={(e) => setFormNamaKegiatan(e.target.value)}
              required
              className="form-input"
            />

            {/* Deskripsi */}
            <input
              type="text"
              placeholder="Deskripsi"
              value={formDeskripsi}
              onChange={(e) => setFormDeskripsi(e.target.value)}
              className="form-input"
            />

            {/* Tanggal */}
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

            {/* Materi */}
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

            {/* Instruktur */}
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

            {/* Asisten */}
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

            {/* Pejabat yang Mengetahui */}
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
              <button type="button" className="btn-secondary" onClick={resetFormKegiatan}>
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
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
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

                <button className="btn-edit" onClick={() => handleEditKegiatan(item)}>
                  <Edit2 size={16} />
                </button>

                <button className="btn-delete" onClick={() => handleDeleteKegiatan(item.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Chips pegawai */}
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
          <p style={{ color: "#64748b" }}>Belum ada kegiatan.</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: ASSIGN PEGAWAI                                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showAssignModal && assignKegiatanId && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">
              <h2>Atur Pegawai untuk Kegiatan</h2>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-actions-row">
              <button className="btn-select-all" onClick={() => selectAllPegawai(assignKegiatanId)}>
                ✅ Pilih Semua
              </button>
              <button className="btn-deselect-all" onClick={() => deselectAllPegawai(assignKegiatanId)}>
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
                      style={{ color: cfg.color, borderLeft: `3px solid ${cfg.color}`, paddingLeft: 12 }}
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
                            style={checked ? { background: cfg.color, borderColor: cfg.color } : {}}
                          >
                            {checked && <Check size={14} color="white" strokeWidth={3} />}
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
              <button className="btn-primary" onClick={() => setShowAssignModal(false)}>
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: KELOLA PENILAIAN & ABSEN KANAN                         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showKelolaModal && kelolaKegiatan && (
        <div className="modal-overlay" onClick={closeKelola}>
          <div
            className="modal-content modal-absen"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER MODAL */}
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

            {/* ── SECTION 1: TAMBAH METODE PENILAIAN ── */}
            <div className="absen-kolom-section">
              <h3 style={{ marginBottom: 4, fontSize: 16, color: "#0f172a" }}>
                1️⃣ Tambah Metode Penilaian (Nilai Free Text)
              </h3>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
                Satu kategori (misal: <strong>Kebugaran Fisik</strong>) bisa punya banyak metode.
                Tambah satu per satu.
              </p>

              <div className="form-grid" style={{ gridTemplateColumns: "2fr 2fr 1fr" }}>
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
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMetodePenilaian(); } }}
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
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMetodePenilaian(); } }}
                  />
                </div>
              </div>

              <button className="btn-primary" onClick={addMetodePenilaian} style={{ marginTop: 12 }}>
                <Plus size={16} /> Tambah Metode
              </button>

              {/* Daftar metode yang sudah ada, dikelompok per kategori */}
              {groupedKolom.size > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                    Metode yang sudah ditambahkan:
                  </p>

                  {[...groupedKolom.entries()].map(([kategori, methods]) => (
                    <div key={kategori} style={{ marginBottom: 12 }}>
                      {/* label kategori */}
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

                      {/* metode-metode di kategori ini */}
                      <div style={{ paddingLeft: 8 }}>
                        {methods.map((m) => (
                          <div key={m.id} className="kolom-display-card" style={{ marginBottom: 6 }}>
                            <div className="kolom-content">
                              <div className="kolom-kategori" style={{ fontSize: 14 }}>
                                {m.metode || "(Tanpa metode)"}
                              </div>
                              {m.satuan && (
                                <div className="kolom-detail">Satuan: {m.satuan}</div>
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

            {/* ── SECTION 2: PILIH KOLOM ABSEN KANAN ── */}
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
                      style={isChecked ? { borderColor: color, background: `${color}18` } : {}}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleKeteranganColumn(ket)}
                        className="hidden-checkbox"
                      />
                      <div
                        className={`custom-checkbox ${isChecked ? "checked" : ""}`}
                        style={isChecked ? { background: color, borderColor: color } : {}}
                      >
                        {isChecked && <Check size={14} color="white" strokeWidth={3} />}
                      </div>
                      <span style={{ fontWeight: isChecked ? 700 : 500, fontSize: 14 }}>{ket}</span>
                    </label>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
                <button className="btn-primary" onClick={saveKeteranganColumns}>
                  <Save size={16} /> Simpan Kolom ABSEN
                </button>
                <span style={{ fontSize: 13, color: "#64748b" }}>
                  {keteranganColumns.length} kolom dipilih
                </span>
              </div>
            </div>

            {/* ── SECTION 3: TABEL INPUT PENILAIAN + ABSEN KANAN ── */}
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
                      {getAssignedPegawai(kelolaKegiatan.id)
                        .sort((a, b) => (a.urutan ?? 999999) - (b.urutan ?? 999999))
                        .map((pegawai) => {
                          const currentKet = getKeteranganPegawai(pegawai.id);

                          return (
                            <tr key={pegawai.id}>
                              {/* Nama */}
                              <td className="pegawai-name-cell">{pegawai.nama_pegawai}</td>

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

                  {getAssignedPegawai(kelolaKegiatan.id).length === 0 && (
                    <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                      <p>Belum ada pegawai yang di-assign ke kegiatan ini.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FOOTER MODAL */}
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