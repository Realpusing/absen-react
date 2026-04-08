import { Calendar, ClipboardList, Users, Menu, X } from "lucide-react";
import type { Pegawai } from "../types";
import { clusterOptions, clusterConfig } from "../constants";

interface SidebarProps {
  activeMenu: "absen" | "pegawai" | "kegiatan";
  setActiveMenu: (menu: "absen" | "pegawai" | "kegiatan") => void;
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  pegawaiList: Pegawai[];
}

export default function Sidebar({
  activeMenu,
  setActiveMenu,
  sidebarOpen,
  setSidebarOpen,
  pegawaiList,
}: SidebarProps) {
  return (
    <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
      <div className="sidebar-header">
        {sidebarOpen && <h1 className="sidebar-logo">AbsenKu</h1>}
        <button className="toggle-sidebar" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activeMenu === "absen" ? "active" : ""}`}
          onClick={() => setActiveMenu("absen")}
        >
          <Calendar size={20} />
          {sidebarOpen && <span>Absensi</span>}
        </button>

        <button
          className={`nav-item ${activeMenu === "pegawai" ? "active" : ""}`}
          onClick={() => setActiveMenu("pegawai")}
        >
          <Users size={20} />
          {sidebarOpen && <span>Kelola Pegawai</span>}
        </button>

        <button
          className={`nav-item ${activeMenu === "kegiatan" ? "active" : ""}`}
          onClick={() => setActiveMenu("kegiatan")}
        >
          <ClipboardList size={20} />
          {sidebarOpen && <span>Kelola Kegiatan</span>}
        </button>
      </nav>

      {sidebarOpen && (
        <div className="sidebar-clusters">
          <p className="sidebar-section-title">Cluster</p>
          {clusterOptions.map((cluster) => {
            const cfg = clusterConfig[cluster];
            const count = pegawaiList.filter((p) => p.cluster === cluster).length;

            return (
              <div key={cluster} className="cluster-info">
                <div className="cluster-dot" style={{ background: cfg.gradient }} />
                <span className="cluster-name">{cluster}</span>
                <span className="cluster-count">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}