import { useState } from "react";
import { UserPlus, Edit2, Trash2, Save } from "lucide-react";
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
      alert("Nama, NIP, dan NIK wajib diisi");
      return;
    }

    if (editPegawaiId) {
      const { error } = await supabase
        .from("pegawai")
        .update(pegawaiForm)
        .eq("id", editPegawaiId);

      if (error) {
        alert("Gagal update: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("pegawai").insert([pegawaiForm]);

      if (error) {
        alert("Gagal tambah: " + error.message);
        return;
      }
    }

    setPegawaiForm(initialPegawaiForm);
    setEditPegawaiId(null);
    refreshPegawai();
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

  const deletePegawai = async (id: number) => {
    const ok = window.confirm("Yakin hapus pegawai ini?");
    if (!ok) return;

    const { error } = await supabase.from("pegawai").delete().eq("id", id);

    if (error) {
      alert("Gagal hapus: " + error.message);
      return;
    }

    refreshPegawai();
  };

  const changeCluster = async (id: number, cluster: ClusterType) => {
    const { error } = await supabase
      .from("pegawai")
      .update({ cluster })
      .eq("id", id);

    if (error) {
      alert("Gagal ubah cluster: " + error.message);
      return;
    }

    refreshPegawai();
  };

  const cancelEdit = () => {
    setPegawaiForm(initialPegawaiForm);
    setEditPegawaiId(null);
  };

  const handleUrutanInput = (pegawaiId: number, value: string) => {
    setEditedUrutan((prev) => ({
      ...prev,
      [pegawaiId]: Number(value),
    }));
  };

  const saveUrutan = async (pegawaiId: number) => {
    const urutan = editedUrutan[pegawaiId];

    if (urutan === undefined || Number.isNaN(urutan)) {
      alert("Urutan tidak valid");
      return;
    }

    const { error } = await supabase
      .from("pegawai")
      .update({ urutan })
      .eq("id", pegawaiId);

    if (error) {
      alert("Gagal simpan urutan: " + error.message);
      return;
    }

    refreshPegawai();
  };

  return (
    <div className="page">
      <div className="glass page-header-card">
        <div className="header-top">
          <div>
            <h1 className="page-title">Kelola Pegawai</h1>
            <p className="page-subtitle">Tambah, edit, hapus, dan atur urutan pegawai secara bebas</p>
          </div>
          <UserPlus size={48} color="#3b82f6" />
        </div>
      </div>

      <div className="glass">
        <h2 className="section-title">
          {editPegawaiId ? "✏️ Edit Pegawai" : "➕ Tambah Pegawai"}
        </h2>

        <form onSubmit={submitPegawai}>
          <div className="form-grid">
            <input type="text" name="nama_pegawai" placeholder="Nama Pegawai *" value={pegawaiForm.nama_pegawai} onChange={handlePegawaiChange} required className="form-input" />
            <input type="text" name="nip" placeholder="NIP *" value={pegawaiForm.nip} onChange={handlePegawaiChange} required className="form-input" />
            <input type="text" name="nik" placeholder="NIK *" value={pegawaiForm.nik} onChange={handlePegawaiChange} required className="form-input" />
            <input type="text" name="jabatan" placeholder="Jabatan" value={pegawaiForm.jabatan} onChange={handlePegawaiChange} className="form-input" />
            <input type="text" name="golongan_pangkat" placeholder="Golongan/Pangkat" value={pegawaiForm.golongan_pangkat} onChange={handlePegawaiChange} className="form-input" />
            <input type="text" name="jenjang_jabatan" placeholder="Jenjang Jabatan" value={pegawaiForm.jenjang_jabatan} onChange={handlePegawaiChange} className="form-input" />
            <input type="text" name="nama_pimpinan_langsung" placeholder="Nama Pimpinan Langsung" value={pegawaiForm.nama_pimpinan_langsung} onChange={handlePegawaiChange} className="form-input" />
            <input type="text" name="nik_pimpinan_langsung" placeholder="NIK Pimpinan Langsung" value={pegawaiForm.nik_pimpinan_langsung} onChange={handlePegawaiChange} className="form-input" />
            <input type="text" name="nip_pimpinan_langsung" placeholder="NIP Pimpinan Langsung" value={pegawaiForm.nip_pimpinan_langsung} onChange={handlePegawaiChange} className="form-input" />

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
              style={{ background: cfg.bg, borderLeft: `4px solid ${cfg.color}` }}
            >
              <div className="cluster-header-left">
                <div className="cluster-header-icon" style={{ background: cfg.gradient }}>
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
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Urutan Bebas</th>
                      <th>Nama</th>
                      <th>NIP</th>
                      <th>NIK</th>
                      <th>Jabatan</th>
                      <th>Gol/Pangkat</th>
                      <th>Cluster</th>
                      <th>Simpan Urutan</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td>
                          <input
                            type="number"
                            defaultValue={item.urutan ?? 0}
                            onChange={(e) => handleUrutanInput(item.id, e.target.value)}
                            className="urutan-input"
                          />
                        </td>
                        <td className="td-nama-bold">{item.nama_pegawai}</td>
                        <td>{item.nip}</td>
                        <td>{item.nik}</td>
                        <td>{item.jabatan}</td>
                        <td>{item.golongan_pangkat}</td>
                        <td>
                          <select
                            value={item.cluster}
                            onChange={(e) =>
                              changeCluster(item.id, e.target.value as ClusterType)
                            }
                            className="cluster-select"
                            style={{ borderColor: cfg.color, color: cfg.color }}
                          >
                            {clusterOptions.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            className="btn-save-order"
                            onClick={() => saveUrutan(item.id)}
                          >
                            <Save size={16} />
                          </button>
                        </td>
                        <td>
                          <div className="action-group">
                            <button className="btn-edit" onClick={() => editPegawai(item)}>
                              <Edit2 size={16} />
                            </button>
                            <button className="btn-delete" onClick={() => deletePegawai(item.id)}>
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