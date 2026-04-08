export type KeteranganAbsen =
  | "Hadir"
  | "Dinas Dalam"
  | "Dinas Luar"
  | "Cuti"
  | "Izin"
  | "Sakit"
  | "Alpha";

export type ClusterType = "Pimpinan" | "Umum" | "Sumber Daya" | "Operasi";

export interface Pegawai {
    id: number;
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
    urutan: number | null;
  }

export interface Absen {
  id: number;
  pegawai_id: number;
  tanggal: string;
  keterangan: KeteranganAbsen;
  kegiatan_id: number | null;
}

export interface Kegiatan {
  id: number;
  nama_kegiatan: string;
  deskripsi: string;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  created_at?: string;
}