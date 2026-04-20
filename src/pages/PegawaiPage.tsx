import { useState } from "react";
import { UserPlus, Edit2, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { supabase } from "../supabase";
import { clusterOptions, clusterConfig, initialPegawaiForm } from "../constants";
import type { Pegawai, ClusterType } from "../types";

interface Props {
  pegawaiList: Pegawai[];
  refreshPegawai: () => Promise<void>;
}

export default function PegawaiPage({ pegawaiList, refreshPegawai }: Props) {
  const [pegawaiForm, setPegawaiForm] = useState(initialPegawaiForm);
  const [editPegawaiId, setEditPegawaiId] = useState<number | null>(null);
  const [editedUrutan, setEditedUrutan] = useState<Record<number, number>>({});
  const [loadingSaveUrutan, setLoadingSaveUrutan] = useState<number | null>(null);

  const handlePegawaiChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setPegawaiForm((prev) => ({
      ...prev,
      [name]: name === "urutan" ? Number(value) : value,
    }));
  };

  const submitPegawai = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pegawaiForm.nama_pegawai || !pegawaiForm.nip || !pegawaiForm.nik) {
      Swal.fire({
        icon: "warning",
        title: "Data Tidak Lengkap",
        text: "Nama, NIP, dan NIK wajib diisi",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    try {
      if (editPegawaiId) {
        const { error } = await supabase
          .from("pegawai")
          .update(pegawaiForm)
          .eq("id", editPegawaiId);

        if (error) throw error;

        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Data pegawai berhasil diperbarui",
          confirmButtonColor: "#3b82f6",
          toast: true,
          position: "top-end",
          timer: 3000,
          showConfirmButton: false,
        });
      } else {
        const { error } = await supabase.from("pegawai").insert([pegawaiForm]);

        if (error) throw error;

        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Pegawai berhasil ditambahkan",
          confirmButtonColor: "#3b82f6",
          toast: true,
          position: "top-end",
          timer: 3000,
          showConfirmButton: false,
        });
      }

      setPegawaiForm(initialPegawaiForm);
      setEditPegawaiId(null);
      await refreshPegawai();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text: error.message || "Terjadi kesalahan",
        confirmButtonColor: "#3b82f6",
      });
    }
  };

  const editPegawai = (item: Pegawai) => {
    setPegawaiForm({
      nama_pegawai: item.nama_pegawai,
      nip: item.nip,
      nik: item.nik,
      jabatan: item.jabatan || "",
      golongan_pangkat: item.golongan_pangkat || "",
      jenjang_jabatan: item.jenjang_jabatan || "",
      nama_pimpinan_langsung: item.nama_pimpinan_langsung || "",
      nik_pimpinan_langsung: item.nik_pimpinan_langsung || "",
      nip_pimpinan_langsung: item.nip_pimpinan_langsung || "",
      cluster: item.cluster || "Umum",
      urutan: item.urutan || 0,
    });

    setEditPegawaiId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deletePegawai = async (id: number, nama: string) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus Pegawai?",
      text: `Yakin ingin menghapus ${nama}? Tindakan ini tidak dapat dibatalkan.`,
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase.from("pegawai").delete().eq("id", id);

      if (error) throw error;

      Swal.fire({
        icon: "success",
        title: "Berhasil Dihapus!",
        text: `${nama} berhasil dihapus`,
        confirmButtonColor: "#3b82f6",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      });

      await refreshPegawai();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Gagal Hapus!",
        text: error.message || "Terjadi kesalahan",
        confirmButtonColor: "#3b82f6",
      });
    }
  };

  const changeCluster = async (id: number, cluster: ClusterType) => {
    try {
      const { error } = await supabase
        .from("pegawai")
        .update({ cluster })
        .eq("id", id);

      if (error) throw error;

      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Cluster berhasil diubah",
        confirmButtonColor: "#3b82f6",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false,
      });

      await refreshPegawai();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text: error.message || "Terjadi kesalahan",
        confirmButtonColor: "#3b82f6",
      });
    }
  };

  const cancelEdit = () => {
    setPegawaiForm(initialPegawaiForm);
    setEditPegawaiId(null);
  };

  // ██████████████████████████████████████████████████████████████
  // ✅ AUTO-SAVE URUTAN (LANGSUNG SAAT INPUT BERUBAH)
  // ██████████████████████████████████████████████████████████████
  const handleUrutanInput = async (pegawaiId: number, value: string) => {
    const newUrutan = Number(value) || 0;

    // ✅ UPDATE STATE DULU (UNTUK UI)
    setEditedUrutan((prev) => ({
      ...prev,
      [pegawaiId]: newUrutan,
    }));

    // ✅ SHOW LOADING
    setLoadingSaveUrutan(pegawaiId);

    try {
      console.log(`📤 Saving urutan: pegawaiId=${pegawaiId}, urutan=${newUrutan}`);

      // ✅ SAVE KE DATABASE
      const { error } = await supabase
        .from("pegawai")
        .update({ urutan: newUrutan })
        .eq("id", pegawaiId);

      if (error) throw error;

      console.log(`✅ Urutan berhasil disimpan: ${newUrutan}`);

      // ✅ REFRESH DATA
      await refreshPegawai();

      // ✅ CLEAR STATE SETELAH BERHASIL
      setEditedUrutan((prev) => {
        const updated = { ...prev };
        delete updated[pegawaiId];
        return updated;
      });
    } catch (error: any) {
      console.error("❌ Error:", error);

      Swal.fire({
        icon: "error",
        title: "Gagal Simpan!",
        text: error.message || "Terjadi kesalahan saat menyimpan urutan",
        confirmButtonColor: "#3b82f6",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false,
      });

      // ✅ ROLLBACK UI
      setEditedUrutan((prev) => {
        const updated = { ...prev };
        delete updated[pegawaiId];
        return updated;
      });
    } finally {
      setLoadingSaveUrutan(null);
    }
  };

  return (
    <div className="page">
      {/* ── HEADER ── */}
      <div className="glass page-header-card">
        <div className="header-top">
          <div>
            <h1 className="page-title">Kelola Pegawai</h1>
            <p className="page-subtitle">
              Tambah, edit, hapus, dan atur urutan pegawai secara bebas
            </p>
          </div>
          <UserPlus size={48} color="#3b82f6" />
        </div>
      </div>

      {/* ── FORM TAMBAH/EDIT ── */}
      <div className="glass">
        <h2 className="section-title">
          {editPegawaiId ? "✏️ Edit Pegawai" : "➕ Tambah Pegawai"}
        </h2>

        <form onSubmit={submitPegawai}>
          <div className="form-grid">
            <input
              type="text"
              name="nama_pegawai"
              placeholder="Nama Pegawai *"
              value={pegawaiForm.nama_pegawai}
              onChange={handlePegawaiChange}
              required
              className="form-input"
            />
            <input
              type="text"
              name="nip"
              placeholder="NIP *"
              value={pegawaiForm.nip}
              onChange={handlePegawaiChange}
              required
              className="form-input"
            />
            <input
              type="text"
              name="nik"
              placeholder="NIK *"
              value={pegawaiForm.nik}
              onChange={handlePegawaiChange}
              required
              className="form-input"
            />
            <input
              type="text"
              name="jabatan"
              placeholder="Jabatan"
              value={pegawaiForm.jabatan}
              onChange={handlePegawaiChange}
              className="form-input"
            />
            <input
              type="text"
              name="golongan_pangkat"
              placeholder="Golongan/Pangkat"
              value={pegawaiForm.golongan_pangkat}
              onChange={handlePegawaiChange}
              className="form-input"
            />
            <input
              type="text"
              name="jenjang_jabatan"
              placeholder="Jenjang Jabatan"
              value={pegawaiForm.jenjang_jabatan}
              onChange={handlePegawaiChange}
              className="form-input"
            />
            <input
              type="text"
              name="nama_pimpinan_langsung"
              placeholder="Nama Pimpinan Langsung"
              value={pegawaiForm.nama_pimpinan_langsung}
              onChange={handlePegawaiChange}
              className="form-input"
            />
            <input
              type="text"
              name="nik_pimpinan_langsung"
              placeholder="NIK Pimpinan Langsung"
              value={pegawaiForm.nik_pimpinan_langsung}
              onChange={handlePegawaiChange}
              className="form-input"
            />
            <input
              type="text"
              name="nip_pimpinan_langsung"
              placeholder="NIP Pimpinan Langsung"
              value={pegawaiForm.nip_pimpinan_langsung}
              onChange={handlePegawaiChange}
              className="form-input"
            />

            <select
              name="cluster"
              value={pegawaiForm.cluster}
              onChange={handlePegawaiChange}
              className="form-input form-select"
            >
              {clusterOptions.map((cluster) => (
                <option key={cluster} value={cluster}>
                  {cluster}
                </option>
              ))}
            </select>

            <input
              type="number"
              name="urutan"
              placeholder="Urutan"
              value={pegawaiForm.urutan}
              onChange={handlePegawaiChange}
              className="form-input"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editPegawaiId ? "💾 Update" : "➕ Tambah"}
            </button>
            {editPegawaiId && (
              <button type="button" className="btn-secondary" onClick={cancelEdit}>
                ❌ Batal
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── TABEL PEGAWAI PER CLUSTER ── */}
      {clusterOptions.map((cluster) => {
        const cfg = clusterConfig[cluster];
        const Icon = cfg.icon;
        const list = pegawaiList
          .filter((p) => p.cluster === cluster)
          .sort((a, b) => (a.urutan ?? 9999) - (b.urutan ?? 9999));

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
                  <h3
                    className="cluster-header-title"
                    style={{ color: cfg.color }}
                  >
                    {cluster}
                  </h3>
                  <p className="cluster-header-count">{list.length} pegawai</p>
                </div>
              </div>
            </div>

            <div className="glass cluster-table-card">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Urutan (Auto-Save)</th>
                      <th>Nama</th>
                      <th>NIP</th>
                      <th>NIK</th>
                      <th>Jabatan</th>
                      <th>Gol/Pangkat</th>
                      <th>Cluster</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={
                                editedUrutan[item.id] !== undefined
                                  ? editedUrutan[item.id]
                                  : item.urutan ?? 0
                              }
                              onChange={(e) =>
                                handleUrutanInput(item.id, e.target.value)
                              }
                              disabled={loadingSaveUrutan === item.id}
                              className="urutan-input"
                              style={{
                                padding: "8px 10px",
                                border:
                                  loadingSaveUrutan === item.id
                                    ? "2px solid #3b82f6"
                                    : "1px solid #e5e7eb",
                                borderRadius: "6px",
                                width: "90px",
                                textAlign: "center",
                                fontWeight: "600",
                                fontSize: "14px",
                                opacity: loadingSaveUrutan === item.id ? 0.7 : 1,
                                transition: "all 0.2s ease",
                                cursor:
                                  loadingSaveUrutan === item.id
                                    ? "not-allowed"
                                    : "text",
                              }}
                            />
                            {loadingSaveUrutan === item.id ? (
                              <span
                                style={{
                                  color: "#3b82f6",
                                  fontWeight: "bold",
                                  fontSize: "14px",
                                }}
                              >
                                ⏳
                              </span>
                            ) : (
                              <span
                                style={{
                                  color: "#10b981",
                                  fontWeight: "bold",
                                  fontSize: "14px",
                                }}
                              >
                                ✓
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="td-nama-bold">{item.nama_pegawai}</td>
                        <td>{item.nip}</td>
                        <td>{item.nik}</td>
                        <td>{item.jabatan || "-"}</td>
                        <td>{item.golongan_pangkat || "-"}</td>
                        <td>
                          <select
                            value={item.cluster}
                            onChange={(e) =>
                              changeCluster(
                                item.id,
                                e.target.value as ClusterType
                              )
                            }
                            className="cluster-select"
                            style={{
                              borderColor: cfg.color,
                              color: cfg.color,
                            }}
                          >
                            {clusterOptions.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div className="action-group">
                            <button
                              type="button"
                              className="btn-edit"
                              onClick={() => editPegawai(item)}
                              title="Edit pegawai"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              className="btn-delete"
                              onClick={() =>
                                deletePegawai(item.id, item.nama_pegawai)
                              }
                              title="Hapus pegawai"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}