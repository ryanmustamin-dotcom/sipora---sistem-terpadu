import React, { useState, useEffect, useRef } from 'react';
import { generateSOPContent } from './services/geminiService';
import { SOPData, DEFAULT_SOP_DATA } from './types';
import { SOPEditor } from './components/SOPEditor';
import { Bumper } from './components/Bumper';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const App: React.FC = () => {
  const [stage, setStage] = useState<'INTRO' | 'INPUT' | 'GENERATING' | 'EDIT'>('INTRO');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [sopData, setSopData] = useState<SOPData>(DEFAULT_SOP_DATA);
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Check for API Key presence for UI feedback only
  const hasApiKey = !!import.meta.env.VITE_GEMINI_API_KEY;

  // Update document title based on SOP title for better PDF filenames
  useEffect(() => {
    if (sopData.title && sopData.title !== "JUDUL PROSEDUR") {
      document.title = sopData.title;
    } else {
      document.title = "SIPORA";
    }
  }, [sopData.title]);

  const handleGenerate = async () => {
    if (!topic) return;
    setStage('GENERATING');

    try {
      const generated = await generateSOPContent(topic, description);
      if (generated) {
        setSopData(prev => ({
          ...prev,
          ...generated,
          // Ensure defaults for missing fields
          documentNumber: prev.documentNumber,
          revisionDate: prev.revisionDate,
          effectiveDate: prev.effectiveDate,
          approvedBy: prev.approvedBy,
          steps: generated.steps?.map((s, i) => ({
             ...s,
             id: i.toString(),
             symbol: s.symbol as any || 'PROCESS' // Type cast safely
          })) || []
        }));
        setStage('EDIT');
      } else {
        throw new Error("No data generated");
      }
    } catch (error) {
      console.error(error);
      alert("Gagal membuat SOP. Pastikan API Key valid atau coba lagi.");
      setStage('INPUT');
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsDownloading(true);

    try {
      const element = printRef.current;
      
      // Temporarily hide elements with 'no-print' class for the screenshot
      const noPrintElements = element.querySelectorAll('.no-print');
      noPrintElements.forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });

      const canvas = await html2canvas(element, {
        scale: 2, // Higher scale for better quality
        useCORS: true, // Allow loading external images (like the logo)
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Replace textareas with divs to prevent text cut-off in html2canvas
          const textareas = clonedDoc.querySelectorAll('textarea');
          textareas.forEach((ta) => {
            const div = clonedDoc.createElement('div');
            div.innerText = ta.value;
            div.className = ta.className;
            div.style.whiteSpace = 'pre-wrap';
            div.style.wordBreak = 'break-word';
            div.style.height = 'auto';
            div.style.minHeight = ta.style.height;
            ta.parentNode?.replaceChild(div, ta);
          });

          // Replace inputs with divs
          const inputs = clonedDoc.querySelectorAll('input');
          inputs.forEach((input) => {
            if (input.type === 'file') return;
            const div = clonedDoc.createElement('div');
            div.innerText = input.value;
            div.className = input.className;
            // Ensure proper alignment
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            if (input.classList.contains('text-center')) {
               div.style.justifyContent = 'center';
            }
            input.parentNode?.replaceChild(div, input);
          });
        }
      });

      // Restore 'no-print' elements
      noPrintElements.forEach(el => {
        (el as HTMLElement).style.display = '';
      });

      const imgData = canvas.toDataURL('image/png');
      
      // A4 landscape dimensions in mm
      const pdfWidth = 297;
      const pdfHeight = 210;
      
      // Calculate image dimensions to fit A4 landscape
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const finalImgWidth = imgWidth * ratio;
      const finalImgHeight = imgHeight * ratio;
      
      // Center the image on the page
      const x = (pdfWidth - finalImgWidth) / 2;
      const y = (pdfHeight - finalImgHeight) / 2;

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      pdf.addImage(imgData, 'PNG', x, y, finalImgWidth, finalImgHeight);
      
      const safeTitle = (sopData.title || "SOP_Document").replace(/[^a-zA-Z0-9\s\-_]/g, '-').trim();
      pdf.save(`${safeTitle}.pdf`);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Terjadi kesalahan saat membuat PDF. Silakan coba lagi.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (stage === 'INTRO') {
    return <Bumper onFinish={() => setStage('INPUT')} />;
  }

  if (stage === 'INPUT') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-gray-50">
        {/* Background Pattern */}
        <div className="absolute inset-0 z-0 bg-white">
             <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-70"></div>
             <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-blue-50 opacity-80"></div>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-2xl border-t-4 border-[#1C4D8D] z-10 relative">
          <div className="flex items-center justify-center mb-6">
             <img 
                src="https://cdn-icons-png.freepik.com/512/3997/3997491.png" 
                alt="Logo SOP Generator" 
                className="w-16 h-16 mr-4 object-contain" 
             />
             <div>
                 <h1 className="text-3xl font-bold text-[#0F2854]">SIPORA</h1>
                 <p className="text-[#4988C4] text-sm tracking-widest italic mt-1">Mudah Membuat Prosedur Terpadu</p>
             </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Judul / Topik Prosedur</label>
              <input 
                type="text" 
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4D8D] focus:border-[#1C4D8D] outline-none transition-all text-lg"
                placeholder="Contoh: Prosedur Peminjaman Lab Komputer"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Deskripsi Proses (Opsional)</label>
              <textarea 
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C4D8D] focus:border-[#1C4D8D] outline-none transition-all h-32 resize-none"
                placeholder="Jelaskan secara singkat alurnya. Contoh: Siswa lapor ke guru, guru cek jadwal, jika kosong acc, jika isi tolak..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button 
              onClick={handleGenerate}
              disabled={!topic || !hasApiKey}
              className={`w-full py-4 rounded-lg font-bold text-white text-lg shadow-lg transform transition-all 
                ${!topic || !hasApiKey ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1C4D8D] hover:bg-[#0F2854] hover:scale-[1.02] active:scale-[0.98]'}`}
            >
              {!hasApiKey ? 'API Key Missing' : 'Buat SOP Sekarang ✨'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-4">Creator by Ryan Mustami N | Guru SMK-IT As-Syifa Boarding School</p>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'GENERATING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white z-50">
        <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 border-4 border-[#BDE8F5] rounded-full animate-ping"></div>
            <div className="absolute inset-0 border-4 border-t-[#1C4D8D] border-r-[#1C4D8D] border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <img src="https://cdn-icons-png.freepik.com/512/3997/3997491.png" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-[#0F2854] animate-pulse">Sedang Menyusun SOP...</h2>
        <p className="text-gray-500 mt-2">AI sedang menganalisis kebutuhan prosedur Anda</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Navbar for Edit Mode */}
      <div className="bg-[#1C4D8D] text-white p-4 shadow-md no-print sticky top-0 z-30 flex justify-between items-center">
         <div className="flex items-center gap-3">
             <button onClick={() => setStage('INPUT')} className="text-white/80 hover:text-white flex items-center gap-1 text-sm font-semibold">
                &larr; Buat Baru
             </button>
             <div className="h-6 w-px bg-white/30"></div>
             <span className="font-bold tracking-wide">EDITOR SOP</span>
         </div>
         <div className="text-xs opacity-75 hidden md:block">
            Klik teks untuk mengedit • Tarik simbol "TIDAK" (Diamond) untuk membuat cabang
         </div>
      </div>

      <div className="p-8 overflow-auto flex justify-center" ref={printRef}>
        <SOPEditor data={sopData} onChange={setSopData} />
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 no-print z-50">
        <button 
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className={`text-white px-6 py-3 rounded-full shadow-lg transition-all flex items-center gap-2 font-bold ${isDownloading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 hover:scale-105'}`}
            title="Download sebagai PDF"
        >
            {isDownloading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Unduh SOP
              </>
            )}
        </button>
      </div>
    </div>
  );
};

export default App;