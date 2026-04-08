import { useEffect, useState } from "react";
import "./App.css";
import Sidebar from "./components/Sidebar";
import AbsenPage from "./pages/AbsenPage";
import PegawaiPage from "./pages/PegawaiPage";
import KegiatanPage from "./pages/KegiatanPage";
import { supabase } from "./supabase";
import type { Pegawai } from "./types";

function App() {
  const [activeMenu, setActiveMenu] = useState<"absen" | "pegawai" | "kegiatan">("absen");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);

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
    <div className="app-layout">
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        pegawaiList={pegawaiList}
      />

      <main className={`main-content ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        {activeMenu === "absen" && (
          <AbsenPage pegawaiList={pegawaiList} refreshPegawai={fetchPegawai} />
        )}

        {activeMenu === "pegawai" && (
          <PegawaiPage pegawaiList={pegawaiList} refreshPegawai={fetchPegawai} />
        )}

        {activeMenu === "kegiatan" && (
          <KegiatanPage pegawaiList={pegawaiList} refreshPegawai={fetchPegawai} />
        )}
      </main>
    </div>
  );
}

export default App;