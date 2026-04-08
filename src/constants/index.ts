import { Shield, Briefcase, Wrench, Radio } from "lucide-react";
import type { ClusterType, KeteranganAbsen } from "../types";

export const clusterOptions: ClusterType[] = [
  "Pimpinan",
  "Umum",
  "Sumber Daya",
  "Operasi",
];

export const keteranganOptions: KeteranganAbsen[] = [
  "Hadir",
  "Dinas Dalam",
  "Dinas Luar",
  "Cuti",
  "Izin",
  "Sakit",
  "Alpha",
];

export const keteranganColors: Record<KeteranganAbsen, string> = {
  Hadir: "#10b981",
  "Dinas Dalam": "#3b82f6",
  "Dinas Luar": "#6366f1",
  Cuti: "#f59e0b",
  Izin: "#eab308",
  Sakit: "#a855f7",
  Alpha: "#ef4444",
};

export const clusterConfig: Record<
  ClusterType,
  { icon: any; color: string; bg: string; gradient: string }
> = {
  Pimpinan: {
    icon: Shield,
    color: "#d97706",
    bg: "rgba(217,119,6,0.08)",
    gradient: "linear-gradient(135deg,#f59e0b,#d97706)",
  },
  Umum: {
    icon: Briefcase,
    color: "#2563eb",
    bg: "rgba(37,99,235,0.08)",
    gradient: "linear-gradient(135deg,#3b82f6,#2563eb)",
  },
  "Sumber Daya": {
    icon: Wrench,
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.08)",
    gradient: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
  },
  Operasi: {
    icon: Radio,
    color: "#059669",
    bg: "rgba(5,150,105,0.08)",
    gradient: "linear-gradient(135deg,#10b981,#059669)",
  },
};

export const initialPegawaiForm = {
    nama_pegawai: "",
    nip: "",
    nik: "",
    jabatan: "",
    golongan_pangkat: "",
    jenjang_jabatan: "",
    nama_pimpinan_langsung: "",
    nik_pimpinan_langsung: "",
    nip_pimpinan_langsung: "",
    cluster: "Umum" as ClusterType,
    urutan: 0,
  };

export const initialKegiatanForm = {
  nama_kegiatan: "",
  deskripsi: "",
  tanggal_mulai: "",
  tanggal_selesai: "",
};