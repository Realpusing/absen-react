import { useEffect, useState } from "react";
import {
  ClipboardList,
  FolderOpen,
  Edit2,
  Trash2,
  Plus,
  X,
  Check,
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

  const handleKegiatanChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setKegiatanForm((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      tanggal_mulai: kegiatanForm.tanggal_mulai || null,
      tanggal_selesai: kegiatanForm.tanggal_selesai || null,
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
      tanggal_mulai: item.tanggal_mulai || "",
      tanggal_selesai: item.tanggal_selesai || "",
    });

    setEditKegiatanId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteKegiatan = async (id: number) => {
    const ok = window.confirm("Yakin hapus kegiatan ini?");
    if (!ok) return;

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

  const isAssigned = (kegiatanId: number, pegawaiId: number) => {
    return kegiatanPegawaiRows.some(
      (row) => row.kegiatan_id === kegiatanId && row.pegawai_id === pegawaiId
    );
  };

  const getAssignedPegawai = (kegiatanId: number) => {
    const ids = kegiatanPegawaiRows
      .filter((row) => row.kegiatan_id === kegiatanId)
      .map((row) => row.pegawai_id);

    return pegawaiList.filter((p) => ids.includes(p.id));
  };

  const getAssignedIds = (kegiatanId: number) => {
    return kegiatanPegawaiRows
      .filter((row) => row.kegiatan_id === kegiatanId)
      .map((row) => row.pegawai_id);
  };

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
        alert("Gagal menghapus pegawai dari kegiatan: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("kegiatan_pegawai").insert([
        {
          kegiatan_id: kegiatanId,
          pegawai_id: pegawaiId,
        },
      ]);

      if (error) {
        alert("Gagal menambahkan pegawai ke kegiatan: " + error.message);
        return;
      }
    }

    fetchKegiatanPegawai();
  };

  const selectAll = async (kegiatanId: number) => {
    const assignedIds = getAssignedIds(kegiatanId);
    const unassignedPegawai = pegawaiList.filter((p) => !assignedIds.includes(p.id));

    if (unassignedPegawai.length === 0) return;

    const payload = unassignedPegawai.map((p) => ({
      kegiatan_id: kegiatanId,
      pegawai_id: p.id,
    }));

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

  return (
    <div className="page">
      <div className="glass page-header-card">
        <div className="header-top">
          <div>
            <h1 className="page-title">Kelola Kegiatan</h1>
            <p className="page-subtitle">Buat kegiatan dan assign pegawai</p>
          </div>
          <ClipboardList size={48} color="#3b82f6" />
        </div>
      </div>

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
            <input
              type="date"
              name="tanggal_mulai"
              value={kegiatanForm.tanggal_mulai}
              onChange={handleKegiatanChange}
              className="form-input"
            />
            <input
              type="date"
              name="tanggal_selesai"
              value={kegiatanForm.tanggal_selesai}
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

      {kegiatanList.map((item) => {
        const assignedPegawai = getAssignedPegawai(item.id);

        return (
          <div key={item.id} className="glass kegiatan-card">
            <div className="kegiatan-card-header">
              <div className="kegiatan-card-info">
                <FolderOpen size={24} color="#3b82f6" />
                <div>
                  <h3 className="kegiatan-card-title">{item.nama_kegiatan}</h3>
                  {item.deskripsi && <p className="kegiatan-card-desc">{item.deskripsi}</p>}
                  <div className="kegiatan-card-meta">
                    {item.tanggal_mulai && <span>📅 {item.tanggal_mulai}</span>}
                    {item.tanggal_selesai && <span> - {item.tanggal_selesai}</span>}
                    <span className="kegiatan-assigned-badge">
                      👥 {assignedPegawai.length} pegawai
                    </span>
                  </div>
                </div>
              </div>

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
                    <button onClick={() => togglePegawai(item.id, p.id)} className="chip-remove">
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
    </div>
  );
}