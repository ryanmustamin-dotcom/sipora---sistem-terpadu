import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { SOPData, SymbolType } from '../types';
import { SymbolIcon } from './SymbolIcon';

interface SOPEditorProps {
  data: SOPData;
  onChange: (newData: SOPData) => void;
}

// Helper Component for Auto-Resizing Textarea
const AutoResizeTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ value, onChange, className, ...props }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; 
      // Add a small buffer (4px) to prevent bottom text cut-off (e.g. letters like j, g, y)
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 4}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  // Ensure height is recalculated if window resizes
  useEffect(() => {
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, []);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      className={`${className} overflow-hidden resize-none block transition-all rounded-sm px-2 py-1.5 focus:bg-blue-50 hover:bg-black/5 focus:ring-1 focus:ring-[#1C4D8D] outline-none placeholder-gray-400`}
      rows={1}
      spellCheck={false}
      {...props}
    />
  );
};

export const SOPEditor: React.FC<SOPEditorProps> = ({ data, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag and Drop Logic State
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    sourceIndex: number | null;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  }>({
    isDragging: false,
    sourceIndex: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [connectionPaths, setConnectionPaths] = useState<React.ReactNode[]>([]);
  
  // State to track layout changes (for resizing textareas causing vertical shifts)
  const [layoutVersion, setLayoutVersion] = useState(0);

  // Monitor container size changes to trigger path recalculation
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver(() => {
       requestAnimationFrame(() => {
           setLayoutVersion(v => v + 1);
       });
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate paths for ALL connections (Sequence Black & Decision Red)
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const paths: React.ReactNode[] = [];
    const containerRect = containerRef.current.getBoundingClientRect();

    data.steps.forEach((step, index) => {
        const sourceColIdx = data.executorColumns.indexOf(step.executorRole);
        if (sourceColIdx === -1) return;
        const sourceId = `node-${index}-${sourceColIdx}`;
        const sourceEl = document.getElementById(sourceId);

        if (!sourceEl) return;
        const srcRect = sourceEl.getBoundingClientRect();

        // ---------------------------------------------------------
        // 1. BLACK ARROW (Sequence: Step N -> Step N+1)
        // ---------------------------------------------------------
        if (index < data.steps.length - 1) {
            const nextStep = data.steps[index + 1];
            const targetColIdx = data.executorColumns.indexOf(nextStep.executorRole);
            const targetId = `node-${index + 1}-${targetColIdx}`;
            const targetEl = document.getElementById(targetId);

            if (targetEl) {
                const tgtRect = targetEl.getBoundingClientRect();
                
                // Start: Bottom Center of Source
                const startX = srcRect.left + (srcRect.width / 2) - containerRect.left;
                const startY = srcRect.bottom - containerRect.top;

                // End: Top Center of Target
                const endX = tgtRect.left + (tgtRect.width / 2) - containerRect.left;
                const endY = tgtRect.top - containerRect.top;
                const finalY = endY; // Arrow tip touches the symbol

                // Path Logic: Down -> Horizontal -> Down
                // IMPROVEMENT: Calculate the mid-point between rows for the horizontal turn
                // This ensures the line doesn't overlap with text in tight rows
                const midY = (startY + finalY) / 2; 
                
                let d = `M ${startX} ${startY} `;
                
                if (Math.abs(startX - endX) < 2) {
                    // Straight down if same column
                    d += `L ${endX} ${finalY}`;
                } else {
                    // Dog-leg connector for column change
                    d += `L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${finalY}`;
                }

                paths.push(
                    <g key={`seq-${index}`}>
                        <path 
                            d={d}
                            fill="none"
                            stroke="#1C4D8D"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                            markerEnd="url(#arrowhead-black)"
                        />
                        {step.symbol === SymbolType.DECISION && (
                             <foreignObject x={startX + 4} y={startY} width="30" height="20" style={{overflow: 'visible'}}>
                                <div className="bg-white/90 text-[8px] font-bold text-green-700 leading-none px-1 rounded border border-green-100/50 w-max">
                                    YA
                                </div>
                            </foreignObject>
                        )}
                    </g>
                );
            }
        }

        // ---------------------------------------------------------
        // 2. RED ARROW (Decision: Step N -> Target Row)
        // ---------------------------------------------------------
        if (step.symbol === SymbolType.DECISION && step.decisionNoTargetRow) {
            const targetIndex = parseInt(step.decisionNoTargetRow) - 1;
            // Validate target index
            if (targetIndex >= 0 && targetIndex < data.steps.length && targetIndex !== index) {
                const targetStep = data.steps[targetIndex];
                const targetColIdx = data.executorColumns.indexOf(targetStep.executorRole);
                const targetId = `node-${targetIndex}-${targetColIdx}`;
                const targetEl = document.getElementById(targetId);
                const sourceTd = sourceEl.closest('td');

                if (targetEl && sourceTd) {
                    const tgtRect = targetEl.getBoundingClientRect();
                    const tdRect = sourceTd.getBoundingClientRect();

                    const isLastCol = sourceColIdx === data.executorColumns.length - 1;
                    
                    const decisionStartY = srcRect.top + (srcRect.height / 2) - containerRect.top;
                    // Start from right if not last column, else start from left
                    const decisionStartX = isLastCol 
                        ? srcRect.left - containerRect.left
                        : srcRect.right - containerRect.left;

                    const endX = tgtRect.left + (tgtRect.width / 2) - containerRect.left;
                    const endY = tgtRect.top - containerRect.top;
                    const finalY = endY;

                    // Channel X logic to route around content
                    let channelX: number;
                    const channelGap = 20; // Increased gap for cleaner look

                    if (isLastCol) {
                        const minX = tdRect.left - containerRect.left + 5; 
                        const idealX = decisionStartX - channelGap;
                        channelX = Math.max(minX, idealX);
                    } else {
                        const maxX = tdRect.right - containerRect.left - 5;
                        const idealX = decisionStartX + channelGap;
                        channelX = Math.min(maxX, idealX);
                    }

                    // Vertical alignment target (join horizontal line slightly above target)
                    const verticalTargetY = finalY - 15;

                    let d = `M ${decisionStartX} ${decisionStartY} 
                             L ${channelX} ${decisionStartY}
                             L ${channelX} ${verticalTargetY}
                             L ${endX} ${verticalTargetY}
                             L ${endX} ${finalY}`;

                    paths.push(
                        <g key={`dec-${index}`}>
                            <path 
                                d={d}
                                fill="none"
                                stroke="#DC2626"
                                strokeWidth="1.5"
                                strokeDasharray="4,3"
                                strokeLinejoin="round"
                                markerEnd="url(#arrowhead-red)"
                            />
                            <foreignObject 
                                x={isLastCol ? channelX - 35 : decisionStartX + 2} 
                                y={decisionStartY - 15} 
                                width="40" 
                                height="20"
                                style={{overflow: 'visible'}}
                            >
                                <div className="bg-white/90 text-[8px] font-bold text-red-600 leading-none px-1 text-center rounded w-max">
                                    TIDAK
                                </div>
                            </foreignObject>
                            
                            {/* Label near the target to indicate jump */}
                             <foreignObject 
                                x={endX + 5} 
                                y={verticalTargetY - 10} 
                                width="60" 
                                height="20"
                                style={{overflow: 'visible'}}
                            >
                                <div className="bg-red-50/90 border border-red-200 text-red-800 text-[7px] px-1 rounded whitespace-nowrap w-max shadow-sm">
                                     Ke No.{targetIndex + 1}
                                </div>
                            </foreignObject>
                        </g>
                    );
                }
            }
        }
    });

    setConnectionPaths(paths);
  }, [data, data.steps, data.executorColumns, dragState.isDragging, layoutVersion]); 

  // Handle Global Drag Events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.isDragging) {
        setDragState(prev => ({
          ...prev,
          currentX: e.clientX,
          currentY: e.clientY
        }));
      }
    };

    const handleMouseUp = () => {
      if (dragState.isDragging) {
        if (hoveredRowIndex !== null && dragState.sourceIndex !== null) {
            const targetStr = (hoveredRowIndex + 1).toString();
            updateStep(dragState.sourceIndex, 'decisionNoTargetRow', targetStr);
        }
        setDragState({
            isDragging: false,
            sourceIndex: null,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
        });
        setHoveredRowIndex(null);
      }
    };

    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState.isDragging, hoveredRowIndex, dragState.sourceIndex]);


  const updateField = (field: keyof SOPData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const updateStep = (index: number, field: string, value: string) => {
    const newSteps = [...data.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    updateField('steps', newSteps);
  };

  const updateExecutorColumn = (index: number, value: string) => {
    const oldName = data.executorColumns[index];
    const newCols = [...data.executorColumns];
    newCols[index] = value;
    
    // Also update steps that were assigned to the old name
    const newSteps = data.steps.map(step => {
        if (step.executorRole === oldName) {
            return { ...step, executorRole: value };
        }
        return step;
    });

    onChange({ ...data, executorColumns: newCols, steps: newSteps });
  };

  const addExecutorColumn = () => {
    const newColName = `Pelaksana ${data.executorColumns.length + 1}`;
    onChange({ ...data, executorColumns: [...data.executorColumns, newColName] });
  };

  const removeExecutorColumn = (index: number) => {
    if (data.executorColumns.length <= 1) {
        alert("Minimal harus ada 1 kolom pelaksana.");
        return;
    }
    const colToRemove = data.executorColumns[index];
    const newCols = data.executorColumns.filter((_, i) => i !== index);
    
    // Fallback logic for steps in deleted column
    const fallbackCol = newCols[Math.max(0, index - 1)];
    const newSteps = data.steps.map(step => {
        if (step.executorRole === colToRemove) {
            return { ...step, executorRole: fallbackCol };
        }
        return step;
    });

    onChange({ ...data, executorColumns: newCols, steps: newSteps });
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateField('logoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startDrag = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    e.preventDefault();
    setDragState({
        isDragging: true,
        sourceIndex: index,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY
    });
  };

  return (
    <div className="relative w-full max-w-full">
    {/* Drag Overlay Line */}
    {dragState.isDragging && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
             <svg className="w-full h-full">
                <defs>
                    <marker id="drag-arrow-head" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#DC2626" />
                    </marker>
                 </defs>
                 <line 
                    x1={dragState.startX} 
                    y1={dragState.startY} 
                    x2={dragState.currentX} 
                    y2={dragState.currentY} 
                    stroke="#DC2626" 
                    strokeWidth="2" 
                    strokeDasharray="4,4"
                    markerEnd="url(#drag-arrow-head)"
                 />
             </svg>
             <div 
                className="absolute bg-red-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg transform -translate-x-1/2 -translate-y-full font-bold"
                style={{ top: dragState.currentY - 15, left: dragState.currentX }}
             >
                {hoveredRowIndex !== null ? `Lepas di Langkah ${hoveredRowIndex + 1}` : 'Tarik ke baris tujuan...'}
             </div>
        </div>
    )}

    <div ref={containerRef} className="print-container bg-white shadow-2xl border border-gray-200 mx-auto p-6 md:p-10 text-[12px] leading-tight text-[#0F2854] font-sans relative">
      
      {/* --- GLOBAL SVG OVERLAY FOR LINES --- */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
          <defs>
            <marker id="arrowhead-red" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M0,0 L6,3 L0,6 z" fill="#DC2626" />
            </marker>
            <marker id="arrowhead-black" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M0,0 L6,3 L0,6 z" fill="#1C4D8D" />
            </marker>
          </defs>
          {connectionPaths}
      </svg>

      {/* --- HEADER TABLE --- */}
      <table className="w-full border-collapse border border-[#1C4D8D] mb-6 text-[#0F2854]">
        <tbody>
          <tr>
            {/* Logo Section */}
            <td rowSpan={4} className="border border-[#1C4D8D] p-3 w-[20%] text-center align-middle relative group bg-white">
              <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange} 
              />
              <div 
                  className="flex flex-col items-center justify-center h-full min-h-[100px] cursor-pointer"
                  onClick={handleLogoClick}
                  title="Klik untuk mengganti logo"
              >
                {data.logoUrl ? (
                    <img src={data.logoUrl} alt="Logo" className="w-20 h-20 object-contain mb-2" />
                ) : (
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#1C4D8D]/50 flex items-center justify-center mb-2 bg-blue-50 group-hover:bg-blue-100 transition-colors">
                        <span className="text-[#1C4D8D] font-bold text-[9px] text-center px-1">UPLOAD LOGO</span>
                    </div>
                )}
                
                <AutoResizeTextarea
                    className="w-full text-center font-bold text-[#1C4D8D] text-xs bg-transparent border-none"
                    value={data.organizationName || "Nama Lembaga/Perusahaan"}
                    onChange={(e: any) => updateField('organizationName', e.target.value)}
                    placeholder="Nama Lembaga"
                    onClick={(e) => e.stopPropagation()} 
                />
              </div>
            </td>

            {/* Title Section */}
            <td rowSpan={4} className="border border-[#1C4D8D] p-2 w-[35%] text-center align-middle bg-[#F8FAFC] print:bg-white">
                <AutoResizeTextarea
                    className="w-full text-center font-extrabold text-xl uppercase bg-transparent border-none text-[#0F2854] placeholder-gray-300 focus:bg-white"
                    value={data.department}
                    onChange={(e: any) => updateField('department', e.target.value)}
                    placeholder="NAMA BAGIAN"
                />
            </td>

            {/* Document Details Section */}
            <td className="border border-[#1C4D8D] px-3 py-1.5 w-[15%] font-semibold bg-[#F1F5F9] text-[#0F2854] print:bg-[#F1F5F9]">No. Dokumen</td>
            <td className="border border-[#1C4D8D] px-3 py-1.5 w-[30%]">
               <div className="flex items-center">
                   <span className="mr-2">:</span>
                   <input 
                      className="flex-1 bg-transparent focus:bg-white px-1 focus:ring-1 focus:ring-[#1C4D8D] outline-none rounded-sm w-full transition-colors" 
                      value={data.documentNumber}
                      onChange={(e) => updateField('documentNumber', e.target.value)}
                   />
               </div>
            </td>
          </tr>
          <tr>
            <td className="border border-[#1C4D8D] px-3 py-1.5 font-semibold bg-[#F1F5F9] text-[#0F2854] print:bg-[#F1F5F9]">Revisi / Tgl</td>
            <td className="border border-[#1C4D8D] px-3 py-1.5">
               <div className="flex items-center">
                   <span className="mr-2">:</span>
                   <input 
                      type="date"
                      className="flex-1 bg-transparent focus:bg-white px-1 focus:ring-1 focus:ring-[#1C4D8D] outline-none rounded-sm w-full transition-colors" 
                      value={data.revisionDate}
                      onChange={(e) => updateField('revisionDate', e.target.value)}
                   />
               </div>
            </td>
          </tr>
          <tr>
            <td className="border border-[#1C4D8D] px-3 py-1.5 font-semibold bg-[#F1F5F9] text-[#0F2854] print:bg-[#F1F5F9]">Tgl Berlaku</td>
            <td className="border border-[#1C4D8D] px-3 py-1.5">
              <div className="flex items-center">
                  <span className="mr-2">:</span>
                   <input 
                      type="date"
                      className="flex-1 bg-transparent focus:bg-white px-1 focus:ring-1 focus:ring-[#1C4D8D] outline-none rounded-sm w-full transition-colors" 
                      value={data.effectiveDate}
                      onChange={(e) => updateField('effectiveDate', e.target.value)}
                   />
               </div>
            </td>
          </tr>
          <tr>
            <td className="border border-[#1C4D8D] px-3 py-1.5 font-semibold bg-[#F1F5F9] text-[#0F2854] print:bg-[#F1F5F9]">Halaman</td>
            <td className="border border-[#1C4D8D] px-3 py-1.5 text-[#0F2854]">
               <div className="flex items-center">
                  <span className="mr-2">:</span>
                  <span>1 dari 1</span>
               </div>
            </td>
          </tr>

          {/* Signatures Row */}
          <tr>
             <td colSpan={4} className="border border-[#1C4D8D] p-0">
                <div className="flex w-full divide-x divide-[#1C4D8D]">
                    <div className="flex-1 p-2 flex flex-col items-center hover:bg-gray-50 transition-colors">
                        <span className="text-[10px] mb-8 text-[#0F2854]/70 uppercase tracking-wide">Disahkan oleh:</span>
                        <input 
                            className="text-center font-bold text-[11px] w-full bg-transparent mb-0.5 text-[#0F2854] border-b border-dashed border-gray-300 focus:border-[#1C4D8D] outline-none"
                            value={data.approvedBy}
                            onChange={(e) => updateField('approvedBy', e.target.value)}
                        />
                         <input 
                            className="text-center text-[10px] w-full bg-transparent text-[#0F2854]/80 focus:text-[#1C4D8D]"
                            value={data.approvedByTitle}
                            onChange={(e) => updateField('approvedByTitle', e.target.value)}
                        />
                    </div>
                    <div className="flex-1 p-2 flex flex-col items-center hover:bg-gray-50 transition-colors">
                        <span className="text-[10px] mb-8 text-[#0F2854]/70 uppercase tracking-wide">Diperiksa oleh:</span>
                         <input 
                            className="text-center font-bold text-[11px] w-full bg-transparent mb-0.5 text-[#0F2854] border-b border-dashed border-gray-300 focus:border-[#1C4D8D] outline-none"
                            value={data.checkedBy}
                            onChange={(e) => updateField('checkedBy', e.target.value)}
                        />
                         <input 
                            className="text-center text-[10px] w-full bg-transparent text-[#0F2854]/80 focus:text-[#1C4D8D]"
                            value={data.checkedByTitle}
                            onChange={(e) => updateField('checkedByTitle', e.target.value)}
                        />
                    </div>
                    <div className="flex-1 p-2 flex flex-col items-center hover:bg-gray-50 transition-colors">
                        <span className="text-[10px] mb-8 text-[#0F2854]/70 uppercase tracking-wide">Dibuat oleh:</span>
                         <input 
                            className="text-center font-bold text-[11px] w-full bg-transparent mb-0.5 text-[#0F2854] border-b border-dashed border-gray-300 focus:border-[#1C4D8D] outline-none"
                            value={data.madeBy}
                            onChange={(e) => updateField('madeBy', e.target.value)}
                        />
                         <input 
                            className="text-center text-[10px] w-full bg-transparent text-[#0F2854]/80 focus:text-[#1C4D8D]"
                            value={data.madeByTitle}
                            onChange={(e) => updateField('madeByTitle', e.target.value)}
                        />
                    </div>
                    <div className="flex-1 p-3 flex flex-col items-center justify-center bg-[#1C4D8D] text-white print:bg-[#1C4D8D] print:text-white">
                        <div className="text-center font-bold tracking-tight">STANDARD OPERASIONAL PROSEDUR</div>
                        <AutoResizeTextarea
                            className="text-center font-bold text-sm w-full bg-transparent text-white placeholder-white/60 uppercase mt-2 focus:bg-white/10 rounded border border-transparent focus:border-white/30"
                            value={data.title}
                            onChange={(e: any) => updateField('title', e.target.value)}
                        />
                    </div>
                </div>
             </td>
          </tr>
        </tbody>
      </table>

      {/* --- INFO TABLE --- */}
      <table className="w-full border-collapse border border-[#1C4D8D] mb-6 text-[11px] text-[#0F2854]">
         <thead>
            <tr>
                <th className="border border-[#1C4D8D] p-2 w-1/2 bg-[#BDE8F5] uppercase text-[#0F2854] font-bold tracking-wider print:bg-[#BDE8F5]">Dasar Hukum</th>
                <th className="border border-[#1C4D8D] p-2 w-1/2 bg-[#BDE8F5] uppercase text-[#0F2854] font-bold tracking-wider print:bg-[#BDE8F5]">Keterkaitan</th>
            </tr>
         </thead>
         <tbody>
             <tr>
                 <td className="border border-[#1C4D8D] p-2 align-top h-24 hover:bg-gray-50 transition-colors">
                    <AutoResizeTextarea 
                        className="w-full h-full bg-transparent"
                        value={data.legalBasis.join('\n')}
                        onChange={(e: any) => updateField('legalBasis', e.target.value.split('\n'))}
                    />
                 </td>
                 <td className="border border-[#1C4D8D] p-2 align-top h-24 hover:bg-gray-50 transition-colors">
                    <AutoResizeTextarea
                        className="w-full h-full bg-transparent"
                        value={data.relatedSOPs.join('\n')}
                        onChange={(e: any) => updateField('relatedSOPs', e.target.value.split('\n'))}
                    />
                 </td>
             </tr>
         </tbody>
      </table>

      {/* --- MAIN PROCESS TABLE (SWIMLANE HYBRID) --- */}
      <div className="overflow-x-auto w-full">
      <table className="w-full border-collapse border border-[#1C4D8D] text-[11px] text-[#0F2854] table-fixed relative">
        <thead className="bg-[#1C4D8D] print:bg-[#1C4D8D] text-white print:text-white">
            <tr>
                <th rowSpan={2} className="border border-[#1C4D8D] p-2 w-[4%] text-center">NO</th>
                <th rowSpan={2} className="border border-[#1C4D8D] p-2 w-[20%] text-center">AKTIVITAS</th>
                <th colSpan={data.executorColumns.length} className="border border-[#1C4D8D] p-2 relative group text-center align-middle">
                    <div className="flex items-center justify-center gap-2 w-full">
                        <span>PELAKSANA</span>
                        <button 
                            onClick={addExecutorColumn}
                            className="no-print bg-white/20 hover:bg-white hover:text-[#1C4D8D] text-white w-5 h-5 rounded-full flex items-center justify-center text-sm font-bold transition-all ml-2"
                            title="Tambah Kolom Pelaksana"
                        >
                            +
                        </button>
                    </div>
                </th>
                <th colSpan={3} className="border border-[#1C4D8D] p-2 text-center">STANDAR BAKU</th>
            </tr>
            <tr>
                {data.executorColumns.map((col, idx) => (
                    <th key={idx} className="border border-[#1C4D8D] p-2 min-w-[90px] bg-[#E0F2FE] text-[#0F2854] print:bg-[#E0F2FE] print:text-[#0F2854] relative group">
                        <AutoResizeTextarea
                            value={col} 
                            onChange={(e: any) => updateExecutorColumn(idx, e.target.value)}
                            className="w-full text-center bg-transparent font-bold text-[#0F2854] focus:bg-white"
                        />
                         <button 
                            onClick={() => removeExecutorColumn(idx)}
                            className="no-print hidden group-hover:flex absolute -top-2 -right-2 bg-red-500 text-white w-4 h-4 rounded-full items-center justify-center text-[10px] shadow hover:bg-red-600 transition-colors z-30 cursor-pointer"
                            title="Hapus Kolom"
                        >
                            &times;
                        </button>
                    </th>
                ))}
                <th className="border border-[#1C4D8D] p-2 bg-[#E0F2FE] w-[10%] text-[#0F2854] print:bg-[#E0F2FE] print:text-[#0F2854] text-center">Mutu Baku</th>
                <th className="border border-[#1C4D8D] p-2 bg-[#E0F2FE] w-[5%] text-[#0F2854] print:bg-[#E0F2FE] print:text-[#0F2854] text-center">Waktu</th>
                <th className="border border-[#1C4D8D] p-2 bg-[#E0F2FE] w-[10%] text-[#0F2854] print:bg-[#E0F2FE] print:text-[#0F2854] text-center">Output</th>
            </tr>
        </thead>
        <tbody className="bg-white">
            {data.steps.map((step, index) => (
                <tr 
                    key={index} 
                    className={`transition-colors hover:bg-gray-50 ${dragState.isDragging && hoveredRowIndex === index ? 'bg-blue-50 ring-2 ring-[#1C4D8D] ring-inset' : ''}`}
                    onMouseEnter={() => dragState.isDragging && setHoveredRowIndex(index)}
                    onMouseLeave={() => dragState.isDragging && setHoveredRowIndex(null)}
                >
                    <td className="border border-[#1C4D8D] p-2 text-center align-middle font-bold text-gray-500">{index + 1}</td>
                    <td className="border border-[#1C4D8D] p-2 align-middle">
                        <AutoResizeTextarea
                            className="w-full bg-transparent text-xs text-[#0F2854]"
                            value={step.activity}
                            onChange={(e: any) => updateStep(index, 'activity', e.target.value)}
                        />
                    </td>
                    
                    {/* Executor Swimlanes */}
                    {data.executorColumns.map((col, colIdx) => {
                         const isExecutor = step.executorRole === col;
                         return (
                            <td key={col} className="border border-[#1C4D8D] p-1 relative align-middle overflow-visible">
                                {isExecutor && (
                                    <div 
                                        id={`node-${index}-${colIdx}`} // Unique ID for Coordinates
                                        className="flex flex-col items-center justify-center relative h-full py-4 min-h-[80px] group/cell w-full"
                                    >
                                        <div className="group relative cursor-pointer transform hover:scale-105 transition-transform" title="Klik untuk mengubah simbol">
                                            <SymbolIcon type={step.symbol} className="w-16 h-12 text-[#0F2854]" />
                                            {/* Symbol Menu */}
                                            <div className="absolute hidden group-hover:flex flex-row gap-1 bg-white border border-[#1C4D8D] z-50 -top-12 left-1/2 -translate-x-1/2 p-1.5 rounded-lg shadow-xl w-max">
                                                {Object.values(SymbolType).map(t => (
                                                    <div 
                                                        key={t} 
                                                        onClick={(e) => { e.stopPropagation(); updateStep(index, 'symbol', t); }} 
                                                        className="p-1 hover:bg-blue-50 rounded cursor-pointer border border-transparent hover:border-blue-100"
                                                        title={t}
                                                    >
                                                        <SymbolIcon type={t} className="w-6 h-4" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        {/* Column Mover */}
                                        <div className="no-print absolute top-1 right-1 hidden group-hover/cell:block z-40">
                                            <div className="relative">
                                                <div className="text-[9px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-800 border border-blue-200 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors">
                                                     Ubah Posisi
                                                </div>
                                                <div className="absolute top-full right-0 bg-white border border-gray-200 shadow-xl rounded z-50 w-32 hidden group-hover/cell:block pt-1">
                                                     {data.executorColumns.map(targetCol => (
                                                         <div 
                                                            key={targetCol}
                                                            className="px-2 py-1.5 hover:bg-gray-100 cursor-pointer text-[10px] text-gray-700 truncate"
                                                            onClick={() => updateStep(index, 'executorRole', targetCol)}
                                                         >
                                                             {targetCol}
                                                         </div>
                                                     ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Drag Handle for Decisions */}
                                        {step.symbol === SymbolType.DECISION && (
                                            <div 
                                                className="no-print absolute -bottom-2 -right-2 w-4 h-4 bg-red-100 border border-red-400 rounded-full cursor-grab hover:bg-red-200 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity z-40"
                                                onMouseDown={(e) => startDrag(e, index)}
                                                title="Tarik ke baris tujuan untuk alur 'TIDAK'"
                                            >
                                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full pointer-events-none"></div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </td>
                         );
                    })}

                    <td className="border border-[#1C4D8D] p-2 align-middle">
                        <AutoResizeTextarea
                            className="w-full bg-transparent text-xs text-[#0F2854] text-center"
                            value={step.requirements}
                            onChange={(e: any) => updateStep(index, 'requirements', e.target.value)}
                        />
                    </td>
                    <td className="border border-[#1C4D8D] p-2 align-middle">
                        <AutoResizeTextarea
                            className="w-full bg-transparent text-xs text-[#0F2854] text-center"
                            value={step.time}
                            onChange={(e: any) => updateStep(index, 'time', e.target.value)}
                        />
                    </td>
                    <td className="border border-[#1C4D8D] p-2 align-middle">
                        <AutoResizeTextarea
                            className="w-full bg-transparent text-xs text-[#0F2854] text-center"
                            value={step.output}
                            onChange={(e: any) => updateStep(index, 'output', e.target.value)}
                        />
                    </td>
                </tr>
            ))}
        </tbody>
      </table>
      </div>
    </div>
    </div>
  );
};