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
} from "lucide-react";
import { supabase } from "../supabase";
import type {
  Pegawai,
  Absen,
  Kegiatan,
  KeteranganAbsen,
  ClusterType,
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

interface Props {
  pegawaiList: Pegawai[];
  refreshPegawai: () => Promise<void>;
}

export default function AbsenPage({ pegawaiList, refreshPegawai }: Props) {
  const [absenList, setAbsenList] = useState<Absen[]>([]);
  const [kegiatanList, setKegiatanList] = useState<Kegiatan[]>([]);
  const [kegiatanPegawaiRows, setKegiatanPegawaiRows] = useState<KegiatanPegawaiRow[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKegiatanId, setSelectedKegiatanId] = useState<number | null>(null);
  const [bulkLoadingCluster, setBulkLoadingCluster] = useState<ClusterType | null>(null);

  const todayDate = getTodayDate();

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

  useEffect(() => {
    fetchAbsenByDate(selectedDate);
  }, [selectedDate]);

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

  const getAbsenStatus = (pegawaiId: number): KeteranganAbsen | null => {
    const found = filteredAbsen.find((a) => a.pegawai_id === pegawaiId);
    return found ? found.keterangan : null;
  };

  const handleCheckAbsen = async (pegawaiId: number, ket: KeteranganAbsen) => {
    const existing = filteredAbsen.find((a) => a.pegawai_id === pegawaiId);

    if (existing) {
      if (existing.keterangan === ket) {
        const { error } = await supabase
          .from("absen")
          .delete()
          .eq("id", existing.id);

        if (error) {
          alert("Gagal hapus absen: " + error.message);
          return;
        }
      } else {
        const { error } = await supabase
          .from("absen")
          .update({ keterangan: ket })
          .eq("id", existing.id);

        if (error) {
          alert("Gagal update absen: " + error.message);
          return;
        }
      }
    } else {
      const { error } = await supabase.from("absen").insert([
        {
          pegawai_id: pegawaiId,
          tanggal: selectedDate,
          keterangan: ket,
          kegiatan_id: selectedKegiatanId,
        },
      ]);

      if (error) {
        alert("Gagal tambah absen: " + error.message);
        return;
      }
    }

    fetchAbsenByDate(selectedDate);
  };

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

      let existingRows = filteredAbsen.filter((a) => pegawaiIds.includes(a.pegawai_id));

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

      const { error: insertError } = await supabase.from("absen").insert(payload);

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
      const rowsToDelete = filteredAbsen.filter((a) => pegawaiIds.includes(a.pegawai_id));

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

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const selectedKegiatan = kegiatanList.find((k) => k.id === selectedKegiatanId);

  const kegiatanLabel =
    selectedKegiatanId === null
      ? "Absensi Harian"
      : `Absensi: ${selectedKegiatan?.nama_kegiatan}`;

  const stats = {
    total: absenPegawaiList.length,
    hadir: filteredAbsen.filter((a) => a.keterangan === "Hadir").length,
    izinCutiSakit: filteredAbsen.filter((a) =>
      ["Izin", "Cuti", "Sakit"].includes(a.keterangan)
    ).length,
    alpha: filteredAbsen.filter((a) => a.keterangan === "Alpha").length,
    belum: absenPegawaiList.length - filteredAbsen.length,
  };

  const filteredPegawai = absenPegawaiList.filter((p) =>
    p.nama_pegawai.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportExcel = () => {
    exportToExcel({
      absenPegawaiList,
      getAbsenStatus,
      selectedDate,
      kegiatanLabel:
        selectedKegiatanId === null
          ? "Harian"
          : selectedKegiatan?.nama_kegiatan || "Kegiatan",
    });
  };

  const handleExportPDF = () => {
    exportToPDF({
      absenPegawaiList,
      getAbsenStatus,
      selectedDate,
      kegiatanLabel,
    });
  };

  const getAssignedCount = (kegiatanId: number) => {
    return kegiatanPegawaiRows.filter((row) => row.kegiatan_id === kegiatanId).length;
  };

  return (
    <div className="page">
      <div className="glass page-header-card">
        <div className="header-top">
          <div>
            <h1 className="page-title">{kegiatanLabel}</h1>
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
              <h3 className="stat-value" style={{ color: s.color }}>{s.value}</h3>
            </div>
            <div className="stat-icon" style={{ background: s.color }}>{s.icon}</div>
          </div>
        ))}
      </div>

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

      {clusterOptions.map((cluster) => {
        const cfg = clusterConfig[cluster];
        const Icon = cfg.icon;
        const list = filteredPegawai
        .filter((p) => p.cluster === cluster)
        .sort((a, b) => {
            const urutanA = a.urutan ?? 999999;
            const urutanB = b.urutan ?? 999999;
            return urutanA - urutanB;
        });

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

      {absenPegawaiList.length === 0 && selectedKegiatanId !== null && (
        <div className="glass" style={{ textAlign: "center", padding: "60px 20px" }}>
          <FolderOpen size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
          <p style={{ color: "#64748b", fontSize: 16 }}>
            Belum ada pegawai yang di-assign ke kegiatan ini.
          </p>
        </div>
      )}
    </div>
  );
}