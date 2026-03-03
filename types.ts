export enum SymbolType {
  TERMINATOR = 'TERMINATOR', // Start/End (Rounded Rect)
  PROCESS = 'PROCESS',       // Action (Rect)
  DECISION = 'DECISION',     // Question (Diamond)
  DOCUMENT = 'DOCUMENT'      // Document (Wave bottom)
}

export interface SOPStep {
  id: string;
  activity: string;
  executorRole: string; // The specific role name (matches a column)
  requirements: string;
  time: string;
  output: string;
  symbol: SymbolType;
  decisionNoTargetRow?: string; // Target row number (string to allow "Selesai" or "1") for the "NO" path
}

export interface SOPData {
  title: string;
  documentNumber: string;
  revisionDate: string;
  effectiveDate: string;
  department: string;
  
  // Organization Details
  organizationName: string;
  logoUrl?: string;

  // Signatories
  approvedBy: string; // Name
  approvedByTitle: string; // e.g. Ketua Umum
  checkedBy: string; // Name
  checkedByTitle: string; // e.g. Sekretaris
  madeBy: string; // Name
  madeByTitle: string; // e.g. Kepala Bagian

  legalBasis: string[]; // Dasar Hukum
  relatedSOPs: string[]; // Keterkaitan

  // Dynamic Columns for the "Pelaksana" section
  executorColumns: string[]; 
  
  steps: SOPStep[];
}

export const DEFAULT_SOP_DATA: SOPData = {
  title: "JUDUL PROSEDUR",
  documentNumber: "001/SOP/...",
  revisionDate: new Date().toISOString().split('T')[0],
  effectiveDate: new Date().toISOString().split('T')[0],
  department: "BAGIAN ...",
  organizationName: "Nama Lembaga/Perusahaan",
  logoUrl: "https://cdn-icons-png.freepik.com/512/3997/3997491.png",
  approvedBy: "Isi Nama",
  approvedByTitle: "Ubah Keterangan",
  checkedBy: "Isi Nama",
  checkedByTitle: "Ubah Keterangan",
  madeBy: "Isi Nama",
  madeByTitle: "Ubah Keterangan",
  legalBasis: ["AD/ART Yayasan As-syifa Al-khoeriyyah"],
  relatedSOPs: ["-"],
  executorColumns: ["Pemohon", "Atasan", "HRD"],
  steps: []
};