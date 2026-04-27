// src/components/Sidebar.tsx
import {
  Calendar,
  ClipboardList,
  Users,
  Menu,
  X,
  CalendarDays,
  LogOut,
  UserCircle
} from "lucide-react";
import type { Pegawai, Profile } from "../types";
import { clusterConfig, clusterOptions } from "../constants";
import "./Sidebar.css"; // Pastikan buat file CSS ini

type MenuKey = "absen" | "pegawai" | "kegiatan" | "jadwal";

interface SidebarProps {
  activeMenu: MenuKey;
  setActiveMenu: (menu: MenuKey) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  pegawaiList: Pegawai[];
  profile: Profile;
  onLogout: () => void;
}

export default function Sidebar({
  activeMenu,
  setActiveMenu,
  sidebarOpen,
  setSidebarOpen,
  pegawaiList,
  profile,
  onLogout,
}: SidebarProps) {
  
  const getMenuItems = () => {
    const allMenus = [
      { key: "absen" as MenuKey, label: "Absensi", icon: Calendar },
      { key: "pegawai" as MenuKey, label: "Kelola Pegawai", icon: Users },
      { key: "kegiatan" as MenuKey, label: "Kelola Kegiatan", icon: ClipboardList },
      { key: "jadwal" as MenuKey, label: "Jadwal Khusus", icon: CalendarDays },
    ];

    if (profile.role === "admin") return allMenus;
    if (profile.role === "bag_umum") return allMenus.filter((m) => m.key === "kegiatan" || m.key === "absen");
    if (profile.role === "guest") return allMenus.filter((m) => m.key === "jadwal");
    return [];
  };

  return (
    <aside className={`sidebar-container ${sidebarOpen ? "open" : "closed"}`}>
      {/* HEADER LOGO */}
      <div className="sidebar-header">
        <div className="logo-wrapper">
          <div className="logo-icon">SAR</div>
          {sidebarOpen && <span className="logo-text">Absen SAR</span>}
        </div>
        <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* PROFILE CARD */}
      {sidebarOpen && (
        <div className="profile-section">
          <div className="profile-card">
            <UserCircle size={32} className="profile-avatar" />
            <div className="profile-info">
              <p className="profile-email" title={profile.email}>{profile.email}</p>
              <span className={`role-badge ${profile.role}`}>
                {profile.role.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* NAVIGATION */}
      <nav className="sidebar-nav">
        <div className="nav-label">{sidebarOpen ? "Main Menu" : "..."}</div>
        {getMenuItems().map((menu) => (
          <button
            key={menu.key}
            className={`nav-item ${activeMenu === menu.key ? "active" : ""}`}
            onClick={() => setActiveMenu(menu.key)}
          >
            <menu.icon size={22} className="nav-icon" />
            {sidebarOpen && <span className="nav-text">{menu.label}</span>}
            {activeMenu === menu.key && <div className="active-indicator" />}
          </button>
        ))}
      </nav>

      {/* CLUSTER STATS */}
      {sidebarOpen && (profile.role === "admin" || profile.role === "bag_umum") && (
        <div className="stats-section">
          <div className="nav-label">Statistik Cluster</div>
          <div className="stats-list">
            {clusterOptions.map((cluster) => (
              <div key={cluster} className="stat-row">
                <div className="stat-name">
                   <span className="dot" style={{ background: clusterConfig[cluster].gradient }} />
                   {cluster}
                </div>
                <span className="stat-count">
                  {pegawaiList.filter((p) => p.cluster === cluster).length}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER LOGOUT */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={20} />
          {sidebarOpen && <span>Keluar Sistem</span>}
        </button>
      </div>
    </aside>
  );
}