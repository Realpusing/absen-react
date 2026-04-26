import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  X,
  Maximize2,
  Minimize2,
  RefreshCw,
  Pencil,
  Trash2,
  Clock,
} from "lucide-react";
import { supabase } from "../supabase";
import { getTodayDate } from "../utils/helper";

type JadwalStatus = "FIX" | "TENTATIVE";

interface JadwalKhusus {
  id: number;
  tanggal: string;
  judul: string;
  subjudul?: string | null;
  status: JadwalStatus;
  waktu_label?: string | null;
  peserta_label?: string | null;
  peserta?: string | null;
  pic?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Props {
  tvMode: boolean;
  setTvMode: (v: boolean) => void;
}

function monthUpperID(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const month = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(d);
  return month.toUpperCase();
}

function day2(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return String(d.getDate()).padStart(2, "0");
}

export default function JadwalKhususPage({ tvMode, setTvMode }: Props) {
  const [items, setItems] = useState<JadwalKhusus[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<JadwalKhusus | null>(null);

  const [form, setForm] = useState({
    tanggal: getTodayDate(),
    judul: "",
    subjudul: "",
    status: "FIX" as JadwalStatus,
    waktu_label: "14:00 S.D 17:00 WITA",
    peserta_label: "PESERTA ZOOM",
    peserta: "",
    pic: "",
  });

  const fetchJadwal = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("jadwal_khusus")
        .select("*")
        .order("tanggal", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setItems((data as JadwalKhusus[]) || []);
    } catch (e: any) {
      console.error(e);
      alert(`Gagal fetch: ${e?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJadwal();
  }, []);

  // auto refresh saat TV mode
  useEffect(() => {
    if (!tvMode) return;
    const t = setInterval(() => fetchJadwal(), 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tvMode]);

  // kalau keluar fullscreen (ESC), matikan tvMode
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && tvMode) setTvMode(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [tvMode, setTvMode]);

  const enterTvMode = async () => {
    setTvMode(true);
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // ignore
    }
  };

  const exitTvMode = async () => {
    setTvMode(false);
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  };

  const tvList = useMemo(() => {
    const today = getTodayDate();
    return [...items].filter((x) => x.tanggal >= today).slice(0, 6);
  }, [items]);

  const adminList = useMemo(() => {
    return [...items].sort((a, b) =>
      a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : 0
    );
  }, [items]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      tanggal: getTodayDate(),
      judul: "",
      subjudul: "",
      status: "FIX",
      waktu_label: "14:00 S.D 17:00 WITA",
      peserta_label: "PESERTA ZOOM",
      peserta: "",
      pic: "",
    });
    setOpen(true);
  };

  const openEdit = (it: JadwalKhusus) => {
    setEditing(it);
    setForm({
      tanggal: it.tanggal,
      judul: it.judul,
      subjudul: it.subjudul ?? "",
      status: it.status,
      waktu_label: it.waktu_label ?? "",
      peserta_label: it.peserta_label ?? "PESERTA ZOOM",
      peserta: it.peserta ?? "",
      pic: it.pic ?? "",
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tanggal || !form.judul.trim()) {
      alert("Tanggal dan Judul wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tanggal: form.tanggal,
        judul: form.judul.trim(),
        subjudul: form.subjudul.trim() || null,
        status: form.status,
        waktu_label:
          form.status === "TENTATIVE"
            ? "TENTATIVE"
            : form.waktu_label.trim() || null,
        peserta_label: form.peserta_label.trim() || "PESERTA ZOOM",
        peserta: form.peserta.trim() || null,
        pic: form.pic.trim() || null,
      };

      if (editing) {
        const { error } = await supabase
          .from("jadwal_khusus")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("jadwal_khusus").insert([payload]);
        if (error) throw error;
      }

      closeModal();
      await fetchJadwal();
    } catch (e: any) {
      alert(`Gagal simpan: ${e?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Yakin hapus?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("jadwal_khusus")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchJadwal();
    } catch (e: any) {
      alert(`Gagal hapus: ${e?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // TV MODE
  // =========================
  if (tvMode) {
    return (
      <div className="tvb">
  
        {/* Overlay */}
        <div className="tvb-overlay" />
  
        {/* Exit Buttons */}
        <div className="tvb-exit">
          <button className="tvb-exit-btn" onClick={exitTvMode}>
            <Minimize2 size={16} />
            Keluar TV
          </button>
          <button className="tvb-exit-btn" onClick={fetchJadwal}>
            <RefreshCw size={15} />
          </button>
        </div>
  
        {/* ══ HEADER ══ */}
        <div className="tvb-header">
  
          {/* Logo Kiri */}
          <div className="tvb-logos">
            <img
              src="/LOGO BASARNAS.png"
              alt="Basarnas"
              className="tvb-logo-left"
            />
            <img
              src="/lambangBB.png"
              alt="BB"
              className="tvb-logo-left"
            />
            <img
              src="/logoBasarnasTRK.png"
              alt="TRK"
              className="tvb-logo-left"
            />
          </div>
  
          {/* Judul Tengah */}
          <div className="tvb-title">
            <span className="tvb-title-line">JADWAL</span>
            <span className="tvb-title-line">PUSDATIN</span>
          </div>
  
          {/* Logo Kanan */}
          <div className="tvb-slogan">
            <div className="tvb-slogan-logos">
              <img
                className="tvb-slogan-logo"
                src="/White_and_Brown_Minimalist_Easter_Sale_Flyer-removebg-preview.png"
                alt="WE ARE FAMILY"
              />
              <img
                className="tvb-slogan-logo ber"
                src="/Logo_berakhlak_bangga-1-1024x390-removebg-preview.png"
                alt="BerAKHLAK"
              />
            </div>
          </div>
  
        </div>
  
        {/* ══ LIST ══ */}
        <div className="tvb-list">
          {tvList.length === 0 ? (
            <div className="tvb-empty">
              Tidak ada jadwal upcoming.
            </div>
          ) : (
            tvList.map((it) => {
              const timeText =
                it.status === "TENTATIVE"
                  ? "TENTATIVE"
                  : it.waktu_label || "-";
  
              const rightText = it.peserta || it.pic || "-";
  
              return (
                <div key={it.id} className="tvb-row">
  
                  {/* Tanggal */}
                  <div className="tvb-date">
                    <div className="tvb-date-day">
                      {day2(it.tanggal)}
                    </div>
                    <div className="tvb-date-month">
                      {monthUpperID(it.tanggal)}
                    </div>
                  </div>
  
                  {/* Separator 1 */}
                  <div className="tvb-sep" />
  
                  {/* Center */}
                  <div className="tvb-center">
                    <div className="tvb-center-title">
                      {it.judul}
                    </div>
                    <div className="tvb-center-sub">
                      {it.subjudul || "\u00A0"}
                    </div>
                    <div
                      className={`tvb-pill${
                        it.status === "TENTATIVE" ? " tent" : ""
                      }`}
                    >
                      <div className="tvb-pill-icon">
                        <Clock size={20} color="white" />
                      </div>
                      <span className="tvb-pill-text">
                        {timeText}
                      </span>
                    </div>
                  </div>
  
                  {/* Separator 2 */}
                  <div className="tvb-sep" />
  
                  {/* Right */}
                  <div className="tvb-right">
                    <div className="tvb-right-label">
                      {it.peserta_label || "PESERTA ZOOM"}
                    </div>
                    <div className="tvb-right-value">
                      {rightText}
                    </div>
                  </div>
  
                </div>
              );
            })
          )}
        </div>
  
        {/* Ornament Kiri */}
        <div className="tvb-ornament">
          <svg viewBox="0 0 100 100" fill="none">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
              <line
                key={i}
                x1="50" y1="50"
                x2={50 + 45 * Math.cos((deg * Math.PI) / 180)}
                y2={50 + 45 * Math.sin((deg * Math.PI) / 180)}
                stroke="rgba(160, 20, 20, 0.70)"
                strokeWidth="12"
                strokeLinecap="round"
              />
            ))}
          </svg>
        </div>
  
        {/* Ornament Kanan */}
        <div className="tvb-ornament tvb-ornament-br">
          <svg viewBox="0 0 100 100" fill="none">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
              <line
                key={i}
                x1="50" y1="50"
                x2={50 + 45 * Math.cos((deg * Math.PI) / 180)}
                y2={50 + 45 * Math.sin((deg * Math.PI) / 180)}
                stroke="rgba(160, 20, 20, 0.70)"
                strokeWidth="12"
                strokeLinecap="round"
              />
            ))}
          </svg>
        </div>
  
      </div>
    );
  }

  // =========================
  // NORMAL MODE (ADMIN)
  // =========================
  return (
    <div className="page jadwal-page">
      <div className="glass jadwal-wrap2">
        <div className="header-top">
          <div>
            <h1 className="page-title">Jadwal Khusus</h1>
            <p className="page-subtitle">Kelola jadwal untuk TV informasi.</p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn-secondary" onClick={enterTvMode}>
              <Maximize2 size={18} /> Mode TV
            </button>
            <button className="btn-primary" onClick={openAdd} disabled={loading}>
              <Plus size={18} /> Tambah Jadwal
            </button>
            <button className="btn-secondary" onClick={fetchJadwal} disabled={loading}>
              <RefreshCw size={18} /> {loading ? "Memuat..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <div className="glass jadwal-wrap2">
        <div className="jadwal-head2">
          <p className="jadwal-today2">
            Total: <b>{adminList.length}</b> jadwal
          </p>
        </div>

        {adminList.length === 0 ? (
          <div className="jadwal-empty2">
            Belum ada data jadwal. Klik <b>Tambah Jadwal</b> untuk memulai.
          </div>
        ) : (
          <div className="jadwal-list2">
            {adminList.map((it) => {
              const timeText = it.status === "TENTATIVE" ? "TENTATIVE" : it.waktu_label || "-";
              const rightText = it.peserta || it.pic || "-";

              return (
                <div key={it.id} className="jadwal-card2">
                  {/* Tanggal */}
                  <div className="jadwal-date2">
                    <div className="jadwal-date2-day">{day2(it.tanggal)}</div>
                    <div className="jadwal-date2-month">{monthUpperID(it.tanggal)}</div>
                  </div>

                  {/* Main */}
                  <div className="jadwal-main2">
                    <div className="jadwal-main2-top">
                      <div>
                        <div className="jadwal-main2-title">{it.judul}</div>
                        <div className="jadwal-main2-sub">{it.subjudul || "-"}</div>
                      </div>
                      <div className={`jadwal-time2 ${it.status === "TENTATIVE" ? "tentative" : "fix"}`}>
                        <Clock size={16} />
                        {timeText}
                      </div>
                    </div>
                    {it.pic && <div className="jadwal-main2-pic">PIC: {it.pic}</div>}
                  </div>

                  {/* Peserta */}
                  <div className="jadwal-peserta2">
                    <div className="jadwal-peserta2-label">{it.peserta_label || "PESERTA ZOOM"}</div>
                    <div className="jadwal-peserta2-value">{rightText}</div>
                  </div>

                  {/* Actions */}
                  <div className="jadwal-actions2">
                    <button className="jadwal-action-btn2" type="button" onClick={() => openEdit(it)}>
                      <Pencil size={16} />
                    </button>
                    <button className="jadwal-action-btn2 danger" type="button" onClick={() => remove(it.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {open && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header export-header">
              <div>
                <h2>{editing ? "Edit Jadwal" : "Tambah Jadwal"}</h2>
                <p className="export-subtitle">Data tersimpan di database.</p>
              </div>
              <button className="modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit} className="export-form-grid">
              <div className="export-field">
                <label className="export-label">Tanggal *</label>
                <input
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => setForm((p) => ({ ...p, tanggal: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>

              <div className="export-field">
                <label className="export-label">Judul *</label>
                <input
                  type="text"
                  value={form.judul}
                  onChange={(e) => setForm((p) => ({ ...p, judul: e.target.value }))}
                  className="form-input"
                  placeholder="Contoh: RAPAT KOORDINASI BULAN DESEMBER"
                  required
                />
              </div>

              <div className="export-field">
                <label className="export-label">Subjudul</label>
                <input
                  type="text"
                  value={form.subjudul}
                  onChange={(e) => setForm((p) => ({ ...p, subjudul: e.target.value }))}
                  className="form-input"
                  placeholder="Keterangan tambahan (opsional)"
                />
              </div>

              <div className="export-field">
                <label className="export-label">Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, status: e.target.value as JadwalStatus }))
                  }
                  className="form-select"
                >
                  <option value="FIX">FIX (Pasti)</option>
                  <option value="TENTATIVE">TENTATIVE (Belum Pasti)</option>
                </select>
              </div>

              <div className="export-field">
                <label className="export-label">Waktu</label>
                <input
                  type="text"
                  value={form.waktu_label}
                  onChange={(e) => setForm((p) => ({ ...p, waktu_label: e.target.value }))}
                  className="form-input"
                  placeholder="14:00 S.D 17:00 WITA"
                  disabled={form.status === "TENTATIVE"}
                />
                {form.status === "TENTATIVE" && (
                  <small style={{ color: "#6b7280", fontSize: 12 }}>
                    Status TENTATIVE otomatis menampilkan "TENTATIVE"
                  </small>
                )}
              </div>

              <div className="export-field">
                <label className="export-label">Label Peserta</label>
                <input
                  type="text"
                  value={form.peserta_label}
                  onChange={(e) => setForm((p) => ({ ...p, peserta_label: e.target.value }))}
                  className="form-input"
                  placeholder="PESERTA ZOOM"
                />
              </div>

              <div className="export-field" style={{ gridColumn: "1 / -1" }}>
                <label className="export-label">Peserta / PIC</label>
                <textarea
                  value={form.peserta}
                  onChange={(e) => setForm((p) => ({ ...p, peserta: e.target.value }))}
                  className="form-input"
                  style={{ minHeight: 90, resize: "vertical" }}
                  placeholder="Nama peserta atau PIC yang bertanggung jawab"
                />
              </div>

              <div className="export-footer" style={{ gridColumn: "1 / -1" }}>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                  disabled={loading}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}