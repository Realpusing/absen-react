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
} from "lucide-react";
import { supabase } from "../supabase";
import { initialKegiatanForm, clusterOptions, clusterConfig } from "../constants";
import type { Pegawai, Kegiatan } from "../types";

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
  const [kegiatanList, setKegiatanList] = useState<Kegiatan[]>([]);
  const [kegiatanForm, setKegiatanForm] = useState(initialKegiatanForm);
  const [editKegiatanId, setEditKegiatanId] = useState<number | null>(null);
  const [kegiatanPegawaiRows, setKegiatanPegawaiRows] = useState<KegiatanPegawaiRow[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignKegiatanId, setAssignKegiatanId] = useState<number | null>(null);

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

  useEffect(() => {
    refreshPegawai();
    fetchKegiatan();
    fetchKegiatanPegawai();
  }, []);

  // ── Cari nama pegawai berdasarkan id ─────────────────────────────
  const getNamaPegawai = (id?: number) => {
    if (!id) return "-";
    return pegawaiList.find((p) => p.id === id)?.nama_pegawai ?? "-";
  };

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
      nama_kegiatan:       kegiatanForm.nama_kegiatan,
      deskripsi:           kegiatanForm.deskripsi || null,
      tanggal_pelaksanaan: kegiatanForm.tanggal_pelaksanaan || null,
      instruktur_id:       kegiatanForm.instruktur_id ? Number(kegiatanForm.instruktur_id) : null,
      asisten_id:          kegiatanForm.asisten_id    ? Number(kegiatanForm.asisten_id)    : null,
      materi:              kegiatanForm.materi || null,
    };

    if (editKegiatanId) {
      const { error } = await supabase
        .from("kegiatan")
        .update(payload)
        .eq("id", editKegiatanId);
      if (error) { alert("Gagal update: " + error.message); return; }
    } else {
      const { error } = await supabase.from("kegiatan").insert([payload]);
      if (error) { alert("Gagal tambah: " + error.message); return; }
    }

    setKegiatanForm(initialKegiatanForm);
    setEditKegiatanId(null);
    fetchKegiatan();
  };

  const editKegiatan = (item: Kegiatan) => {
    setKegiatanForm({
      nama_kegiatan:       item.nama_kegiatan,
      deskripsi:           item.deskripsi || "",
      tanggal_pelaksanaan: item.tanggal_pelaksanaan || "",
      instruktur_id:       item.instruktur_id ? String(item.instruktur_id) : "",
      asisten_id:          item.asisten_id    ? String(item.asisten_id)    : "",
      materi:              item.materi || "",
    });
    setEditKegiatanId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteKegiatan = async (id: number) => {
    if (!window.confirm("Yakin hapus kegiatan ini?")) return;
    const { error } = await supabase.from("kegiatan").delete().eq("id", id);
    if (error) { alert("Gagal hapus: " + error.message); return; }
    fetchKegiatan();
    fetchKegiatanPegawai();
  };

  const cancelEdit = () => {
    setKegiatanForm(initialKegiatanForm);
    setEditKegiatanId(null);
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

  // ── assign helpers ────────────────────────────────────────────────
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
        .from("kegiatan_pegawai").delete().eq("id", existing.id);
      if (error) { alert("Gagal hapus: " + error.message); return; }
    } else {
      const { error } = await supabase
        .from("kegiatan_pegawai")
        .insert([{ kegiatan_id: kegiatanId, pegawai_id: pegawaiId }]);
      if (error) { alert("Gagal tambah: " + error.message); return; }
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
    if (error) { alert("Gagal pilih semua: " + error.message); return; }
    fetchKegiatanPegawai();
  };

  const deselectAll = async (kegiatanId: number) => {
    const { error } = await supabase
      .from("kegiatan_pegawai").delete().eq("kegiatan_id", kegiatanId);
    if (error) { alert("Gagal hapus semua: " + error.message); return; }
    fetchKegiatanPegawai();
  };

  // ── Dropdown pegawai diurutkan A-Z ───────────────────────────────
  const sortedPegawai = [...pegawaiList].sort((a, b) =>
    a.nama_pegawai.localeCompare(b.nama_pegawai, "id")
  );

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="glass page-header-card">
        <div className="header-top">
          <div>
            <h1 className="page-title">Kelola Kegiatan</h1>
            <p className="page-subtitle">Buat kegiatan dan assign pegawai</p>
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

            {/* Nama Kegiatan */}
            <input
              type="text"
              name="nama_kegiatan"
              placeholder="Nama Kegiatan *"
              value={kegiatanForm.nama_kegiatan}
              onChange={handleKegiatanChange}
              required
              className="form-input"
            />

            {/* Deskripsi */}
            <input
              type="text"
              name="deskripsi"
              placeholder="Deskripsi"
              value={kegiatanForm.deskripsi}
              onChange={handleKegiatanChange}
              className="form-input"
            />

            {/* Hari / Tanggal */}
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

            {/* Instruktur — dropdown pegawai */}
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

            {/* Asisten — dropdown pegawai */}
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

            {/* Materi */}
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

                    {/* Hari/Tanggal */}
                    {item.tanggal_pelaksanaan && (
                      <div className="kegiatan-info-item">
                        <Calendar size={14} color="#3b82f6" />
                        <span className="kegiatan-info-label">Hari/Tanggal:</span>
                        <span className="kegiatan-info-value">
                          {formatTanggal(item.tanggal_pelaksanaan)}
                        </span>
                      </div>
                    )}

                    {/* Instruktur */}
                    {item.instruktur_id && (
                      <div className="kegiatan-info-item">
                        <User size={14} color="#10b981" />
                        <span className="kegiatan-info-label">Instruktur:</span>
                        <span className="kegiatan-info-value">
                          {getNamaPegawai(item.instruktur_id)}
                        </span>
                      </div>
                    )}

                    {/* Asisten */}
                    {item.asisten_id && (
                      <div className="kegiatan-info-item">
                        <Users size={14} color="#f59e0b" />
                        <span className="kegiatan-info-label">Asisten:</span>
                        <span className="kegiatan-info-value">
                          {getNamaPegawai(item.asisten_id)}
                        </span>
                      </div>
                    )}

                    {/* Materi */}
                    {item.materi && (
                      <div className="kegiatan-info-item">
                        <BookOpen size={14} color="#8b5cf6" />
                        <span className="kegiatan-info-label">Materi:</span>
                        <span className="kegiatan-info-value">{item.materi}</span>
                      </div>
                    )}

                    {/* Badge peserta */}
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
                >
                  <Plus size={16} /> Atur Pegawai
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

      {/* ── Modal Assign ── */}
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
              <button className="btn-select-all" onClick={() => selectAll(assignKegiatanId)}>
                ✅ Pilih Semua
              </button>
              <button className="btn-deselect-all" onClick={() => deselectAll(assignKegiatanId)}>
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
              <button className="btn-primary" onClick={() => setShowAssignModal(false)}>
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}