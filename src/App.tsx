// src/App.tsx
import { useEffect, useState } from "react";
import "./App.css";
import Sidebar from "./components/Sidebar";
import AbsenPage from "./pages/AbsenPage";
import PegawaiPage from "./pages/PegawaiPage";
import KegiatanPage from "./pages/KegiatanPage";
import JadwalKhususPage from "./pages/JadwalKhususPage";
import LoginPage from "./pages/LoginPage";
import AbsenPageBagUmum from "./pages/AbsenPageBagUmum";
import { supabase } from "./supabase";
import type { Pegawai, Profile } from "./types";

type MenuKey = "absen" | "pegawai" | "kegiatan" | "jadwal";

function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeMenu, setActiveMenu] = useState<MenuKey>("jadwal");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [tvMode, setTvMode] = useState(false);

  // ══════════════════════════════════════════════════════════════
  // AUTHENTICATION LOGIC
  // ══════════════════════════════════════════════════════════════

  useEffect(() => {
    // Ambil session saat pertama load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen perubahan auth state (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
      return;
    }

    setProfile(data);
    
    // Auto-set menu awal berdasarkan role
    if (data.role === 'guest') {
      setActiveMenu('jadwal');
    } else if (data.role === 'bag_umum') {
      setActiveMenu('kegiatan');
    } else {
      setActiveMenu('absen');
    }
    
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // ══════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ══════════════════════════════════════════════════════════════

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
    // Hanya fetch pegawai jika sudah login dan bukan guest
    if (profile && profile.role !== 'guest') {
      fetchPegawai();
    }
  }, [profile]);

  // ══════════════════════════════════════════════════════════════
  // RENDER LOGIC
  // ══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  // Jika belum login, paksa ke LoginPage
  if (!user || !profile) {
    return <LoginPage onLogin={() => setLoading(true)} />;
  }

  return (
    <div className={`app-layout ${tvMode ? "tv-mode" : ""}`}>
      {/* Sidebar hanya tampil jika tidak dalam TV Mode */}
      {!tvMode && (
        <Sidebar
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          pegawaiList={pegawaiList}
          profile={profile}
          onLogout={handleLogout}
        />
      )}

      <main
        className={`main-content ${
          tvMode ? "tv-mode-main" : sidebarOpen ? "sidebar-open" : "sidebar-closed"
        }`}
      >
        {/* ── VIEW ROLE: ADMIN ── */}
        {profile.role === 'admin' && (
          <>
            {activeMenu === "absen" && (
              <AbsenPage 
                pegawaiList={pegawaiList} 
                refreshPegawai={fetchPegawai} 
              />
            )}
            {activeMenu === "pegawai" && (
              <PegawaiPage 
                pegawaiList={pegawaiList} 
                refreshPegawai={fetchPegawai} 
              />
            )}
            {activeMenu === "kegiatan" && (
              <KegiatanPage 
                pegawaiList={pegawaiList} 
                refreshPegawai={fetchPegawai} 
                profile={profile} // ✅ Penting untuk RLS
              />
            )}
            {activeMenu === "jadwal" && (
              <JadwalKhususPage 
                tvMode={tvMode} 
                setTvMode={setTvMode} 
              />
            )}
          </>
        )}

        {/* ── VIEW ROLE: BAG_UMUM ── */}
        {profile.role === 'bag_umum' && (
          <>
            {activeMenu === "kegiatan" && (
              <KegiatanPage 
                pegawaiList={pegawaiList} 
                refreshPegawai={fetchPegawai} 
                profile={profile} // ✅ Agar bag_umum bisa insert dengan created_by
              />
            )}
            {activeMenu === "absen" && (
              <AbsenPageBagUmum 
                pegawaiList={pegawaiList} 
                refreshPegawai={fetchPegawai} 
              />
            )}
            {/* Keamanan tambahan: cegah akses menu lain via state */}
            {(activeMenu === "pegawai" || activeMenu === "jadwal") && (
              <div className="glass p-10 text-center">
                <h2 className="text-red-500 font-bold">Akses Ditolak</h2>
                <p>Role Bag Umum tidak memiliki akses ke halaman ini.</p>
              </div>
            )}
          </>
        )}

        {/* ── VIEW ROLE: GUEST ── */}
        {profile.role === 'guest' && (
          <>
            {activeMenu === "jadwal" ? (
              <JadwalKhususPage 
                tvMode={tvMode} 
                setTvMode={setTvMode} 
              />
            ) : (
              <div className="glass p-10 text-center">
                <h2 className="text-red-500 font-bold">Akses Ditolak</h2>
                <p>Sebagai Guest, Anda hanya dapat mengakses menu Jadwal Khusus.</p>
                <button 
                  className="btn-primary mt-4" 
                  onClick={() => setActiveMenu("jadwal")}
                >
                  Kembali ke Jadwal
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;