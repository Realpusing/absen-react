// ══════════════════════════════════════════════════════════════
// CLUSTER & KETERANGAN
// ══════════════════════════════════════════════════════════════

export type ClusterType = "Pimpinan" | "Umum" | "Sumber Daya" | "Operasi";

export type KeteranganAbsen =
  | "Hadir"
  | "Dinas Dalam"
  | "Dinas Luar"
  | "Cuti"
  | "Izin"
  | "Sakit"
  | "Lepas Piket"
  | "Alpha";

// ══════════════════════════════════════════════════════════════
// PEGAWAI
// ══════════════════════════════════════════════════════════════

export interface Pegawai {
  id: number;
  nama_pegawai: string;
  nip: string;
  nik: string;
  jabatan?: string | null;
  golongan_pangkat?: string | null;
  jenjang_jabatan?: string | null;
  nama_pimpinan_langsung?: string | null;
  nik_pimpinan_langsung?: string | null;
  nip_pimpinan_langsung?: string | null;
  cluster: ClusterType;
  urutan?: number | null;
  created_at?: string;
}

// ══════════════════════════════════════════════════════════════
// ABSEN HARIAN (Tabel: absen)
// ══════════════════════════════════════════════════════════════

export interface Absen {
  id: number;
  pegawai_id: number;
  tanggal: string;
  keterangan: KeteranganAbsen;
  kegiatan_id?: number | null;
  created_at?: string;
}

// ══════════════════════════════════════════════════════════════
// KEGIATAN
// ══════════════════════════════════════════════════════════════

export interface Kegiatan {
  id: number;
  nama_kegiatan: string;
  deskripsi?: string | null;
  tanggal_pelaksanaan?: string | null;
  instruktur_id?: number | null;
  asisten_id?: number | null;
  pejabat_id?: number | null;
  materi?: string | null;
  keterangan_columns?: KeteranganAbsen[] | null; // ✅ TAMBAH: kolom ABSEN yang dipilih
  created_at?: string;
}

// ══════════════════════════════════════════════════════════════
// KEGIATAN PEGAWAI (Many-to-Many)
// ══════════════════════════════════════════════════════════════

export interface KegiatanPegawai {
  id: number;
  kegiatan_id: number;
  pegawai_id: number;
  created_at?: string;
}

// ══════════════════════════════════════════════════════════════
// KOLOM ABSEN - Kolom Dinamis (Tabel: kolom_absen)
// ══════════════════════════════════════════════════════════════

export interface KolomAbsen {
  id: number;
  kegiatan_id: number;
  nama_kategori: string;           // "Kebugaran Fisik", "Tes Psikologi"
  metode?: string | null;          // ✅ FIXED: "Push Up", "Lari 2.4 KM" (single metode per row)
  satuan?: string | null;          // ✅ FIXED: "rep/menit", "meter", "detik"
  urutan: number;
  created_at?: string;
  keterangan_dipilih?: string[] | null;  // Legacy (jika masih dipakai)
  metode_list?: any;               // Legacy JSONB (jika masih dipakai)
}

// ══════════════════════════════════════════════════════════════
// ABSENSI - Data Input Nilai Bebas (Tabel: absensi)
// ══════════════════════════════════════════════════════════════

export interface Absensi {
  id: number;
  kegiatan_id: number;
  pegawai_id: number;
  kolom_absen_id: number;
  nilai: string;              // Input bebas: "50", "12:30", "A", dll
  tanggal: string;
  keterangan?: string | null;
  sub_kolom?: string | null;  // ✅ TAMBAH: untuk unique constraint
  nama_metode?: string | null; // ✅ TAMBAH: untuk unique constraint
  created_at?: string;
}

// ══════════════════════════════════════════════════════════════
// ABSENSI KETERANGAN - Kolom ABSEN di Ujung Kanan (Tabel: absensi_keterangan)
// ══════════════════════════════════════════════════════════════

export interface AbsensiKeterangan {
  id: number;
  kegiatan_id: number;
  pegawai_id: number;
  keterangan: string; // ✅ FIXED: string biasa (akan di-cast ke KeteranganAbsen saat dipakai)
  tanggal: string;
  created_at?: string;
}

// ══════════════════════════════════════════════════════════════
// FORM TYPES
// ══════════════════════════════════════════════════════════════

export interface PegawaiFormData {
  nama_pegawai: string;
  nip: string;
  nik: string;
  jabatan: string;
  golongan_pangkat: string;
  jenjang_jabatan: string;
  nama_pimpinan_langsung: string;
  nik_pimpinan_langsung: string;
  nip_pimpinan_langsung: string;
  cluster: ClusterType;
  urutan: number;
}

export interface KegiatanFormData {
  nama_kegiatan: string;
  deskripsi: string;
  tanggal_pelaksanaan: string;
  instruktur_id: string;
  asisten_id: string;
  pejabat_id: string;
  materi: string;
}