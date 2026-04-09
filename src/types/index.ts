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
  urutan: number;
  created_at?: string;
}

// ══════════════════════════════════════════════════════════════
// ABSEN (untuk absen harian)
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
  materi?: string | null;
  created_at?: string;
}

// ══════════════════════════════════════════════════════════════
// KOLOM ABSEN (Dynamic Columns untuk Kegiatan)
// ══════════════════════════════════════════════════════════════

// ... types sebelumnya ...

export interface KolomAbsen {
  id: number;
  kegiatan_id: number;
  nama_kategori: string;
  metode?: string | null;
  satuan?: string | null;
  urutan: number;
  created_at?: string;
}

export interface Absensi {
  id: number;
  kegiatan_id: number;
  pegawai_id: number;
  kolom_absen_id: number;
  nilai: string; // nilai bebas
  tanggal: string;
  created_at?: string;
}