import { useEffect, useState } from "react";
import "./App.css";
import Sidebar from "./components/Sidebar";
import AbsenPage from "./pages/AbsenPage";
import PegawaiPage from "./pages/PegawaiPage";
import KegiatanPage from "./pages/KegiatanPage";
import JadwalKhususPage from "./pages/JadwalKhususPage";
import { supabase } from "./supabase";
import type { Pegawai } from "./types";

type MenuKey = "absen" | "pegawai" | "kegiatan" | "jadwal";

function App() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>("absen");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [tvMode, setTvMode] = useState(false); // ✅ NEW

  const fetchPegawai = async () => {
    const { data, error } = await supabase
      .from("pegawai")
      .select("*")
      .order("nama_pegawai", { ascending: true });

    if (error) {
      console.error("Gagal mengambil pegawai:", error.message);
      return;
    }

    setPegawaiList((data as Pegawai[]) || []);
  };

  useEffect(() => {
    fetchPegawai();
  }, []);

  return (
    <div className={`app-layout ${tvMode ? "tv-mode" : ""}`}>
      {/* ✅ Sidebar disembunyikan saat Mode TV */}
      {!tvMode && (
        <Sidebar
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          pegawaiList={pegawaiList}
        />
      )}

      <main
        className={`main-content ${
          tvMode ? "tv-mode-main" : sidebarOpen ? "sidebar-open" : "sidebar-closed"
        }`}
      >
        {activeMenu === "absen" && (
          <AbsenPage pegawaiList={pegawaiList} refreshPegawai={fetchPegawai} />
        )}

        {activeMenu === "pegawai" && (
          <PegawaiPage pegawaiList={pegawaiList} refreshPegawai={fetchPegawai} />
        )}

        {activeMenu === "kegiatan" && (
          <KegiatanPage pegawaiList={pegawaiList} refreshPegawai={fetchPegawai} />
        )}

        {activeMenu === "jadwal" && (
          <JadwalKhususPage tvMode={tvMode} setTvMode={setTvMode} />
        )}
      </main>
    </div>
  );
}

export default App;