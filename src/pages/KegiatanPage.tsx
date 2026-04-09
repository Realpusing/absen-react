import { useEffect, useState } from "react";
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
  Table,
  Save,
} from "lucide-react";
import { supabase } from "../supabase";
import { initialKegiatanForm, clusterOptions, clusterConfig } from "../constants";
import type { Pegawai, Kegiatan, KolomAbsen, Absensi } from "../types";

interface KegiatanPegawaiRow {
  id: number;
  kegiatan_id: number;
  pegawai_id: number;
}

interface Props {
  pegawaiList: Pegawai[];
  refreshPegawai: () => Promise<void>;
}

export default function KegiatanPage({ pegawaiList, refreshPegawai }: Props) {
  // ══════════════════════════════════════════════════════════════
  // STATE
  // ══════════════════════════════════════════════════════════════
  
  const [kegiatanList, setKegiatanList] = useState<Kegiatan[]>([]);
  const [kegiatanForm, setKegiatanForm] = useState(initialKegiatanForm);
  const [editKegiatanId, setEditKegiatanId] = useState<number | null>(null);
  const [kegiatanPegawaiRows, setKegiatanPegawaiRows] = useState<KegiatanPegawaiRow[]>([]);
  
  // Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignKegiatanId, setAssignKegiatanId] = useState<number | null>(null);
  
  // Absensi states
  const [showAbsenModal, setShowAbsenModal] = useState(false);
  const [absenKegiatanId, setAbsenKegiatanId] = useState<number | null>(null);
  const [kolomAbsenList, setKolomAbsenList] = useState<KolomAbsen[]>([]);
  const [absensiData, setAbsensiData] = useState<Absensi[]>([]);
  
  // Form kolom absen
  const [newKolomForm, setNewKolomForm] = useState({
    nama_kategori: "",
    metode: "",
    satuan: "",
  });

  // ══════════════════════════════════════════════════════════════
  // FETCH FUNCTIONS
  // ══════════════════════════════════════════════════════════════

  const fetchKegiatan = async () => {
    const { data, error } = await supabase
      .from("kegiatan")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal mengambil kegiatan:", error.message);
      return;
    }
    setKegiatanList((data as Kegiatan[]) || []);
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
      console.error("Gagal mengambil kolom absen:", error.message);
      return;
    }
    setKolomAbsenList((data as KolomAbsen[]) || []);
  };

  const fetchAbsensi = async (kegiatanId: number) => {
    const { data, error } = await supabase
      .from("absensi")
      .select("*")
      .eq("kegiatan_id", kegiatanId);

    if (error) {
      console.error("Gagal mengambil absensi:", error.message);
      return;
    }
    setAbsensiData((data as Absensi[]) || []);
  };

  useEffect(() => {
    refreshPegawai();
    fetchKegiatan();
    fetchKegiatanPegawai();
  }, []);

  // ══════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ══════════════════════════════════════════════════════════════

  const getNamaPegawai = (id?: number) => {
    if (!id) return "-";
    return pegawaiList.find((p) => p.id === id)?.nama_pegawai ?? "-";
  };

  const formatTanggal = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const sortedPegawai = [...pegawaiList].sort((a, b) =>
    a.nama_pegawai.localeCompare(b.nama_pegawai, "id")
  );

  // ══════════════════════════════════════════════════════════════
  // KEGIATAN CRUD
  // ══════════════════════════════════════════════════════════════

  const handleKegiatanChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setKegiatanForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitKegiatan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!kegiatanForm.nama_kegiatan) {
      alert("Nama kegiatan wajib diisi");
      return;
    }

    const payload = {
      nama_kegiatan: kegiatanForm.nama_kegiatan,
      deskripsi: kegiatanForm.deskripsi || null,
      tanggal_pelaksanaan: kegiatanForm.tanggal_pelaksanaan || null,
      instruktur_id: kegiatanForm.instruktur_id ? Number(kegiatanForm.instruktur_id) : null,
      asisten_id: kegiatanForm.asisten_id ? Number(kegiatanForm.asisten_id) : null,
      materi: kegiatanForm.materi || null,
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

    setKegiatanForm(initialKegiatanForm);
    setEditKegiatanId(null);
    fetchKegiatan();
  };

  const editKegiatan = (item: Kegiatan) => {
    setKegiatanForm({
      nama_kegiatan: item.nama_kegiatan,
      deskripsi: item.deskripsi || "",
      tanggal_pelaksanaan: item.tanggal_pelaksanaan || "",
      instruktur_id: item.instruktur_id ? String(item.instruktur_id) : "",
      asisten_id: item.asisten_id ? String(item.asisten_id) : "",
      materi: item.materi || "",
    });
    setEditKegiatanId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteKegiatan = async (id: number) => {
    if (!window.confirm("Yakin hapus kegiatan ini?")) return;
    const { error } = await supabase.from("kegiatan").delete().eq("id", id);
    if (error) {
      alert("Gagal hapus: " + error.message);
      return;
    }
    fetchKegiatan();
    fetchKegiatanPegawai();
  };

  const cancelEdit = () => {
    setKegiatanForm(initialKegiatanForm);
    setEditKegiatanId(null);
  };

  // ══════════════════════════════════════════════════════════════
  // ASSIGN PEGAWAI
  // ══════════════════════════════════════════════════════════════

  const isAssigned = (kegiatanId: number, pegawaiId: number) =>
    kegiatanPegawaiRows.some(
      (row) => row.kegiatan_id === kegiatanId && row.pegawai_id === pegawaiId
    );

  const getAssignedPegawai = (kegiatanId: number) => {
    const ids = kegiatanPegawaiRows
      .filter((row) => row.kegiatan_id === kegiatanId)
      .map((row) => row.pegawai_id);
    return pegawaiList.filter((p) => ids.includes(p.id));
  };

  const getAssignedIds = (kegiatanId: number) =>
    kegiatanPegawaiRows
      .filter((row) => row.kegiatan_id === kegiatanId)
      .map((row) => row.pegawai_id);

  const togglePegawai = async (kegiatanId: number, pegawaiId: number) => {
    const existing = kegiatanPegawaiRows.find(
      (row) => row.kegiatan_id === kegiatanId && row.pegawai_id === pegawaiId
    );
    if (existing) {
      const { error } = await supabase
        .from("kegiatan_pegawai")
        .delete()
        .eq("id", existing.id);
      if (error) {
        alert("Gagal hapus: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("kegiatan_pegawai")
        .insert([{ kegiatan_id: kegiatanId, pegawai_id: pegawaiId }]);
      if (error) {
        alert("Gagal tambah: " + error.message);
        return;
      }
    }
    fetchKegiatanPegawai();
  };

  const selectAll = async (kegiatanId: number) => {
    const assignedIds = getAssignedIds(kegiatanId);
    const payload = pegawaiList
      .filter((p) => !assignedIds.includes(p.id))
      .map((p) => ({ kegiatan_id: kegiatanId, pegawai_id: p.id }));
    if (payload.length === 0) return;
    const { error } = await supabase.from("kegiatan_pegawai").insert(payload);
    if (error) {
      alert("Gagal pilih semua: " + error.message);
      return;
    }
    fetchKegiatanPegawai();
  };

  const deselectAll = async (kegiatanId: number) => {
    const { error } = await supabase
      .from("kegiatan_pegawai")
      .delete()
      .eq("kegiatan_id", kegiatanId);
    if (error) {
      alert("Gagal hapus semua: " + error.message);
      return;
    }
    fetchKegiatanPegawai();
  };

  // ══════════════════════════════════════════════════════════════
  // KOLOM ABSEN MANAGEMENT
  // ══════════════════════════════════════════════════════════════

  const addKolomAbsen = async () => {
    if (!absenKegiatanId || !newKolomForm.nama_kategori.trim()) {
      alert("Nama kategori wajib diisi");
      return;
    }

    const urutan = kolomAbsenList.length;
    const { error } = await supabase.from("kolom_absen").insert([
      {
        kegiatan_id: absenKegiatanId,
        nama_kategori: newKolomForm.nama_kategori.trim(),
        metode: newKolomForm.metode.trim() || null,
        satuan: newKolomForm.satuan.trim() || null,
        urutan,
      },
    ]);

    if (error) {
      alert("Gagal tambah kolom: " + error.message);
      return;
    }

    setNewKolomForm({ nama_kategori: "", metode: "", satuan: "" });
    fetchKolomAbsen(absenKegiatanId);
  };

  const deleteKolomAbsen = async (kolomId: number) => {
    if (!window.confirm("Hapus kolom ini? Data absensi di kolom ini akan terhapus."))
      return;

    const { error } = await supabase.from("kolom_absen").delete().eq("id", kolomId);

    if (error) {
      alert("Gagal hapus kolom: " + error.message);
      return;
    }

    if (absenKegiatanId) {
      fetchKolomAbsen(absenKegiatanId);
      fetchAbsensi(absenKegiatanId);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // ABSENSI MANAGEMENT
  // ══════════════════════════════════════════════════════════════

  const getAbsensiStatus = (pegawaiId: number, kolomId: number) => {
    return absensiData.find(
      (a) => a.pegawai_id === pegawaiId && a.kolom_absen_id === kolomId
    );
  };

  const updateAbsensi = async (
    pegawaiId: number,
    kolomId: number,
    nilai: string
  ) => {
    if (!absenKegiatanId) return;

    const existing = getAbsensiStatus(pegawaiId, kolomId);
    const today = new Date().toISOString().split("T")[0];

    if (existing) {
      // Update
      const { error } = await supabase
        .from("absensi")
        .update({ nilai })
        .eq("id", existing.id);

      if (error) {
        console.error("Gagal update absensi:", error.message);
        return;
      }
    } else {
      // Insert
      const { error } = await supabase.from("absensi").insert([
        {
          kegiatan_id: absenKegiatanId,
          pegawai_id: pegawaiId,
          kolom_absen_id: kolomId,
          nilai,
          tanggal: today,
        },
      ]);

      if (error) {
        console.error("Gagal insert absensi:", error.message);
        return;
      }
    }

    fetchAbsensi(absenKegiatanId);
  };

  const openAbsenModal = (kegiatanId: number) => {
    setAbsenKegiatanId(kegiatanId);
    fetchKolomAbsen(kegiatanId);
    fetchAbsensi(kegiatanId);
    setShowAbsenModal(true);
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
            <h1 className="page-title">Kelola Kegiatan</h1>
            <p className="page-subtitle">Buat kegiatan, assign pegawai, dan kelola absensi dinamis</p>
          </div>
          <ClipboardList size={48} color="#3b82f6" />
        </div>
      </div>

      {/* ── Form ── */}
      <div className="glass">
        <h2 className="section-title">
          {editKegiatanId ? "✏️ Edit Kegiatan" : "➕ Tambah Kegiatan"}
        </h2>

        <form onSubmit={submitKegiatan}>
          <div className="form-grid">
            <input
              type="text"
              name="nama_kegiatan"
              placeholder="Nama Kegiatan *"
              value={kegiatanForm.nama_kegiatan}
              onChange={handleKegiatanChange}
              required
              className="form-input"
            />

            <input
              type="text"
              name="deskripsi"
              placeholder="Deskripsi"
              value={kegiatanForm.deskripsi}
              onChange={handleKegiatanChange}
              className="form-input"
            />

            <div className="form-input-group">
              <label className="form-label">
                <Calendar size={12} style={{ display: "inline", marginRight: 4 }} />
                Hari / Tanggal
              </label>
              <input
                type="date"
                name="tanggal_pelaksanaan"
                value={kegiatanForm.tanggal_pelaksanaan}
                onChange={handleKegiatanChange}
                className="form-input"
              />
            </div>

            <div className="form-input-group">
              <label className="form-label">
                <User size={12} style={{ display: "inline", marginRight: 4 }} />
                Instruktur
              </label>
              <select
                name="instruktur_id"
                value={kegiatanForm.instruktur_id}
                onChange={handleKegiatanChange}
                className="form-input"
              >
                <option value="">— Pilih Instruktur —</option>
                {sortedPegawai.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama_pegawai}
                    {p.jabatan ? ` — ${p.jabatan}` : ""}
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
                name="asisten_id"
                value={kegiatanForm.asisten_id}
                onChange={handleKegiatanChange}
                className="form-input"
              >
                <option value="">— Pilih Asisten —</option>
                {sortedPegawai.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama_pegawai}
                    {p.jabatan ? ` — ${p.jabatan}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              name="materi"
              placeholder="Materi"
              value={kegiatanForm.materi}
              onChange={handleKegiatanChange}
              className="form-input"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editKegiatanId ? "💾 Update" : "➕ Tambah"}
            </button>
            {editKegiatanId && (
              <button type="button" className="btn-secondary" onClick={cancelEdit}>
                ❌ Batal
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── List Kegiatan ── */}
      {kegiatanList.map((item) => {
        const assignedPegawai = getAssignedPegawai(item.id);

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
                        <span className="kegiatan-info-label">Hari/Tanggal:</span>
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
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="kegiatan-card-actions">
                <button
                  className="btn-assign"
                  onClick={() => {
                    setAssignKegiatanId(item.id);
                    setShowAssignModal(true);
                  }}
                  title="Atur Pegawai"
                >
                  <Plus size={16} /> Pegawai
                </button>
                
                <button
                  className="btn-absen"
                  onClick={() => openAbsenModal(item.id)}
                  title="Kelola Absensi"
                >
                  <ListChecks size={16} /> Absensi
                </button>

                <button className="btn-edit" onClick={() => editKegiatan(item)}>
                  <Edit2 size={16} />
                </button>
                <button className="btn-delete" onClick={() => deleteKegiatan(item.id)}>
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
                      onClick={() => togglePegawai(item.id, p.id)}
                      className="chip-remove"
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
        <div className="glass" style={{ textAlign: "center", padding: "60px" }}>
          <ClipboardList size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
          <p style={{ color: "#64748b" }}>Belum ada kegiatan.</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL ASSIGN PEGAWAI */}
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
                onClick={() => selectAll(assignKegiatanId)}
              >
                ✅ Pilih Semua
              </button>
              <button
                className="btn-deselect-all"
                onClick={() => deselectAll(assignKegiatanId)}
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
      {/* MODAL ABSENSI */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showAbsenModal && absenKegiatanId && (
        <div className="modal-overlay" onClick={() => setShowAbsenModal(false)}>
          <div
            className="modal-content modal-absen"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>📋 Kelola Absensi Dinamis</h2>
              <button
                className="modal-close"
                onClick={() => setShowAbsenModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Add Kolom Section */}
            <div className="absen-kolom-section">
              <h3 style={{ marginBottom: 12, fontSize: 16, color: "#475569" }}>
                Tambah Kolom Absensi
              </h3>
              
              <div className="kolom-form-grid">
                <div className="form-input-group">
                  <label className="form-label">Nama Kategori *</label>
                  <input
                    type="text"
                    placeholder="Contoh: Daya Tahan Jantung"
                    value={newKolomForm.nama_kategori}
                    onChange={(e) => setNewKolomForm(prev => ({ 
                      ...prev, 
                      nama_kategori: e.target.value 
                    }))}
                    className="form-input"
                  />
                </div>

                <div className="form-input-group">
                  <label className="form-label">Metode</label>
                  <input
                    type="text"
                    placeholder="Contoh: Lari 2.4 KM"
                    value={newKolomForm.metode}
                    onChange={(e) => setNewKolomForm(prev => ({ 
                      ...prev, 
                      metode: e.target.value 
                    }))}
                    className="form-input"
                  />
                </div>

                <div className="form-input-group">
                  <label className="form-label">Satuan</label>
                  <input
                    type="text"
                    placeholder="Contoh: vol 2 max"
                    value={newKolomForm.satuan}
                    onChange={(e) => setNewKolomForm(prev => ({ 
                      ...prev, 
                      satuan: e.target.value 
                    }))}
                    className="form-input"
                  />
                </div>
              </div>

              <button
                onClick={addKolomAbsen}
                className="btn-primary"
                style={{ marginTop: 12 }}
              >
                <Plus size={16} /> Tambah Kolom
              </button>

              {/* Display kolom yang sudah ada */}
              {kolomAbsenList.length > 0 && (
                <div className="kolom-list" style={{ marginTop: 16 }}>
                  {kolomAbsenList.map((kolom) => (
                    <div key={kolom.id} className="kolom-display-card">
                      <div className="kolom-content">
                        <div className="kolom-kategori">{kolom.nama_kategori}</div>
                        {kolom.metode && <div className="kolom-detail">📍 {kolom.metode}</div>}
                        {kolom.satuan && <div className="kolom-detail">📊 {kolom.satuan}</div>}
                      </div>
                      <button
                        onClick={() => deleteKolomAbsen(kolom.id)}
                        className="kolom-delete"
                        title="Hapus kolom"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tabel Absensi */}
            {kolomAbsenList.length > 0 ? (
              <div className="absen-table-wrapper">
                <table className="absen-table">
                  <thead>
                    <tr>
                      <th className="th-nama-pegawai">Nama Pegawai</th>
                      {kolomAbsenList.map((kolom) => (
                        <th key={kolom.id} className="th-kolom-absen">
                          <div className="th-kolom-content">
                            <div className="th-kategori">{kolom.nama_kategori}</div>
                            {kolom.metode && <div className="th-metode">{kolom.metode}</div>}
                            {kolom.satuan && <div className="th-satuan">{kolom.satuan}</div>}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getAssignedPegawai(absenKegiatanId)
                      .sort((a, b) => a.nama_pegawai.localeCompare(b.nama_pegawai, "id"))
                      .map((pegawai) => (
                        <tr key={pegawai.id}>
                          <td className="pegawai-name-cell">{pegawai.nama_pegawai}</td>
                          {kolomAbsenList.map((kolom) => {
                            const absen = getAbsensiStatus(pegawai.id, kolom.id);
                            const currentNilai = absen?.nilai || "";

                            return (
                              <td key={kolom.id} className="absen-cell">
                                <input
                                  type="text"
                                  value={currentNilai}
                                  onChange={(e) =>
                                    updateAbsensi(pegawai.id, kolom.id, e.target.value)
                                  }
                                  className="absen-input"
                                  placeholder="-"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                <Table size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
                <p>Belum ada kolom absensi. Tambahkan kolom terlebih dahulu.</p>
              </div>
            )}

            <div className="modal-footer">
              <button
                className="btn-primary"
                onClick={() => setShowAbsenModal(false)}
              >
                <Save size={16} /> Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}