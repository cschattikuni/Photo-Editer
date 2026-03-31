import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Download, 
  Image as ImageIcon, 
  Code2, 
  Trash2, 
  Palette, 
  Loader2,
  Check,
  Copy,
  Terminal,
  FileCode,
  Cpu,
  Crop as CropIcon,
  X,
  Undo,
  Redo,
  Save,
  Folder,
  Trash
} from 'lucide-react';
import { cn } from './lib/utils';
import { removeBackground } from '@imgly/background-removal';
import { GoogleGenAI } from "@google/genai";
import Cropper from 'react-easy-crop';
import * as api from './lib/api';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

type Tab = 'remover' | 'codegen' | 'passport';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('remover');
  const [isProcessing, setIsProcessing] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [isTransparent, setIsTransparent] = useState(true);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Cropping State
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Passport Maker State
  const [sheetSize, setSheetSize] = useState<'4x6' | 'A4'>('4x6');
  const [sheetOrientation, setSheetOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [photoOutline, setPhotoOutline] = useState(1);
  const [photoGap, setPhotoGap] = useState(10);
  const [copyCount, setCopyCount] = useState(8);
  const [outlineColor, setOutlineColor] = useState('#000000');
  const passportCanvasRef = useRef<HTMLCanvasElement>(null);

  // Undo/Redo History
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Database & Projects
  const [projects, setProjects] = useState<any[]>([]);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState('Untitled Project');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveProjectName, setSaveProjectName] = useState('');

  const saveToHistory = useCallback((state: any) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, state].slice(-20); // Limit to 20 steps
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  }, [historyIndex]);

  const currentState = {
    originalImage,
    processedImage,
    bgColor,
    isTransparent,
    sheetSize,
    sheetOrientation,
    photoOutline,
    photoGap,
    copyCount,
    outlineColor,
    brightness,
    contrast
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      applyState(prevState);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      applyState(nextState);
    }
  };

  const applyState = (state: any) => {
    setOriginalImage(state.originalImage);
    setProcessedImage(state.processedImage);
    setBgColor(state.bgColor);
    setIsTransparent(state.isTransparent);
    setSheetSize(state.sheetSize);
    setSheetOrientation(state.sheetOrientation);
   setPhotoOutline(state.photoOutline);
    setPhotoGap(state.photoGap);
    setCopyCount(state.copyCount);
    setOutlineColor(state.outlineColor);
    setBrightness(state.brightness ?? 100);
    setContrast(state.contrast ?? 100);
  };

  // Initial history push
  useEffect(() => {
    if (originalImage && history.length === 0) {
      saveToHistory(currentState);
    }
  }, [originalImage]);

  // Check backend availability and load projects
  useEffect(() => {
    const initializeDatabase = async () => {
      const isAvailable = await api.checkBackendHealth();
      setBackendAvailable(isAvailable);

      if (isAvailable) {
        const loadedProjects = await api.getProjects();
        setProjects(loadedProjects);
        console.log('✅ Backend connected! Projects loaded:', loadedProjects.length);
      } else {
        console.warn('⚠️ Backend not available - offline mode');
      }
    };

    initializeDatabase();
    const interval = setInterval(initializeDatabase, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Code Gen State
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState<{
    html?: string;
    css?: string;
    python?: string;
    java?: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedLang, setCopiedLang] = useState<string | null>(null);

  // Background Removal Logic
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imgData = event.target?.result as string;
        setOriginalImage(imgData);
        setProcessedImage(null);
        setIsCropping(false);
        // Reset history on new upload
        const initialState = { ...currentState, originalImage: imgData, processedImage: null };
        setHistory([initialState]);
        setHistoryIndex(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImg = async () => {
    if (!originalImage || !croppedAreaPixels) return;
    
    const image = new Image();
    image.src = originalImage;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    const croppedDataUrl = canvas.toDataURL('image/jpeg');
    setOriginalImage(croppedDataUrl);
    setProcessedImage(null);
    setIsCropping(false);
    saveToHistory({ ...currentState, originalImage: croppedDataUrl, processedImage: null });
  };

  const processBackgroundRemoval = async () => {
    if (!originalImage) return;
    setIsProcessing(true);
    try {
      const blob = await removeBackground(originalImage, {
        progress: (key, current, total) => {
          console.log(`Processing ${key}: ${current}/${total}`);
        }
      });
      const url = URL.createObjectURL(blob);
      setProcessedImage(url);
      saveToHistory({ ...currentState, processedImage: url });
    } catch (error) {
      console.error("Background removal failed:", error);
      alert("Failed to remove background. Please try a different image.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Draw on canvas for background color and download
  useEffect(() => {
    if (processedImage && canvasRef.current && activeTab === 'remover' && !isCropping) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.src = processedImage;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (!isTransparent) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
        ctx.drawImage(img, 0, 0);
      };
    }
  }, [processedImage, bgColor, isTransparent, activeTab, isCropping, brightness, contrast]);

  // Passport Sheet Drawing Logic
  useEffect(() => {
    if (processedImage && passportCanvasRef.current && activeTab === 'passport') {
      const canvas = passportCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.src = processedImage || originalImage || '';
      img.onload = () => {
        // Sheet dimensions at 300 DPI
        let width = sheetSize === '4x6' ? 1200 : 2480;
        let height = sheetSize === '4x6' ? 1800 : 3508;

        if (sheetOrientation === 'landscape') {
          [width, height] = [height, width];
        }

        canvas.width = width;
        canvas.height = height;

        // Clear background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Passport photo size (35x45mm at 300 DPI is approx 413x531px)
        const pWidth = 413;
        const pHeight = 531;

        let x = photoGap;
        let y = photoGap;

        for (let i = 0; i < copyCount; i++) {
          // Draw background if not transparent
          if (!isTransparent && processedImage) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(x, y, pWidth, pHeight);
          }

          // Draw image
          ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
          ctx.drawImage(img, x, y, pWidth, pHeight);
          ctx.filter = 'none';

          // Draw outline
          if (photoOutline > 0) {
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = photoOutline * 2;
            ctx.strokeRect(x, y, pWidth, pHeight);
          }

          x += pWidth + photoGap;
          if (x + pWidth > width) {
            x = photoGap;
            y += pHeight + photoGap;
          }
          if (y + pHeight > height) break;
        }
      };
    }
  }, [processedImage, originalImage, sheetSize, sheetOrientation, photoOutline, photoGap, copyCount, outlineColor, isTransparent, bgColor, activeTab, brightness, contrast]);

  const downloadImage = () => {
    const targetCanvas = activeTab === 'passport' ? passportCanvasRef.current : canvasRef.current;
    if (targetCanvas) {
      const link = document.createElement('a');
      link.download = activeTab === 'passport' ? `passport-sheet-${sheetSize}-${sheetOrientation}.png` : 'snapclean-photo.png';
      link.href = targetCanvas.toDataURL('image/png');
      link.click();
    }
  };

  // Code Generation Logic
  const generateCode = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate well-formatted and properly indented code for the following request in HTML/CSS (combined), Python, and Java. 
        Request: ${prompt}
        Return the result as a JSON object with keys: html, css, python, java. 
        The 'html' key should contain the HTML structure, 'css' the styles, 'python' the python code, and 'java' the java code.
        Ensure the code is clean, follows best practices, and is easy to read with consistent indentation.
        Do not include markdown formatting in the JSON values, just the raw code strings.`,
        config: {
          responseMimeType: "application/json",
        }
      });

      const data = JSON.parse(response.text || '{}');
      setGeneratedCode(data);
    } catch (error) {
      console.error("Code generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, lang: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLang(lang);
    setTimeout(() => setCopiedLang(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] font-sans selection:bg-orange-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
              <Cpu className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-xl font-bold tracking-tighter uppercase italic">SnapClean <span className="text-orange-500">&</span> CodeGen</h1>
            
            {(activeTab === 'remover' || activeTab === 'passport') && originalImage && (
              <div className="flex items-center gap-1 ml-4 pl-4 border-l border-white/10">
                <button 
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white disabled:opacity-20 transition-all"
                  title="Undo"
                >
                  <Undo className="w-4 h-4" />
                </button>
                <button 
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white disabled:opacity-20 transition-all"
                  title="Redo"
                >
                  <Redo className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
          <nav className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
            <button 
              onClick={() => setActiveTab('remover')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'remover' ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" : "hover:bg-white/5 text-white/60 hover:text-white"
              )}
            >
              <ImageIcon className="w-4 h-4" />
              Photo Lab
            </button>
            <button 
              onClick={() => setActiveTab('passport')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'passport' ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" : "hover:bg-white/5 text-white/60 hover:text-white"
              )}
            >
              <Palette className="w-4 h-4" />
              Passport Maker
            </button>
            <button 
              onClick={() => setActiveTab('codegen')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'codegen' ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" : "hover:bg-white/5 text-white/60 hover:text-white"
              )}
            >
              <Code2 className="w-4 h-4" />
              Code Forge
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {activeTab === 'remover' || activeTab === 'passport' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Controls */}
            <div className="lg:col-span-4 space-y-6">
              <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-4 flex items-center gap-2">
                    <Upload className="w-3 h-3" />
                    1. Upload Source
                  </h2>
                  <label className="group relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/10 hover:border-orange-500/50 rounded-xl cursor-pointer transition-all bg-white/[0.02] hover:bg-orange-500/[0.02]">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <div className="p-3 bg-white/5 rounded-full mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-white/40 group-hover:text-orange-500" />
                      </div>
                      <p className="text-sm text-white/40 group-hover:text-white transition-colors">Drop image or click</p>
                    </div>
                    <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                  </label>
                </div>

                {originalImage && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-orange-500 flex items-center gap-2">
                      <Palette className="w-3 h-3" />
                      2. Refine Output
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setIsCropping(!isCropping)}
                        className={cn(
                          "py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10",
                          isCropping ? "bg-orange-500 text-black" : "bg-white/5 text-white hover:bg-white/10"
                        )}
                      >
                        <CropIcon className="w-5 h-5" />
                        {isCropping ? 'Cancel Crop' : 'Crop Image'}
                      </button>
                      <button 
                        onClick={processBackgroundRemoval}
                        disabled={isProcessing || isCropping}
                        className="py-3 bg-white text-black font-bold rounded-xl hover:bg-orange-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                        {isProcessing ? 'Removing...' : 'Remove BG'}
                      </button>
                    </div>

                    {isCropping && (
                      <button 
                        onClick={getCroppedImg}
                        className="w-full py-3 bg-green-500 text-black font-bold rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Check className="w-5 h-5" />
                        Apply Crop
                      </button>
                    )}

                    {isCropping && (
                      <div className="space-y-4 pt-4 border-t border-white/10 animate-in fade-in">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-white/60">Zoom Level</span>
                            <span className="text-xs font-mono text-orange-500">{zoom.toFixed(1)}x</span>
                          </div>
                          <input 
                            type="range" min="1" max="3" step="0.1"
                            value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="w-full accent-orange-500"
                          />
                        </div>

                        {activeTab === 'remover' && (
                          <div className="space-y-2">
                            <span className="text-sm font-medium text-white/60">Aspect Ratio</span>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { label: 'Free', value: undefined },
                                { label: '1:1', value: 1 },
                                { label: '4:3', value: 4/3 },
                                { label: '16:9', value: 16/9 },
                                { label: '3:2', value: 3/2 },
                                { label: 'Passport', value: 35/45 }
                              ].map((ratio) => (
                                <button
                                  key={ratio.label}
                                  onClick={() => setCropAspect(ratio.value)}
                                  className={cn(
                                    "py-1.5 text-[10px] font-bold rounded-lg border border-white/10 transition-all",
                                    cropAspect === ratio.value ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5"
                                  )}
                                >
                                  {ratio.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => setZoom(1)}
                            className="py-2 text-[10px] font-bold rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-all border border-white/10"
                          >
                            Reset Zoom
                          </button>
                          <button 
                            onClick={() => {
                              setCrop({ x: 0, y: 0 });
                              setZoom(1);
                            }}
                            className="py-2 text-[10px] font-bold rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-all border border-white/10"
                          >
                            Reset Position
                          </button>
                        </div>
                      </div>
                    )}

                    {processedImage && !isCropping && (
                      <div className="space-y-4 pt-4 border-t border-white/10">
                        {activeTab === 'passport' && (
                          <div className="space-y-4 pb-4 border-b border-white/10">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-white/60">Layout</span>
                              <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                                <button 
                                  onClick={() => {
                                    setSheetOrientation('portrait');
                                    saveToHistory({ ...currentState, sheetOrientation: 'portrait' });
                                  }}
                                  className={cn("px-3 py-1 text-xs rounded-md transition-all", sheetOrientation === 'portrait' ? "bg-white/10 text-white" : "text-white/40")}
                                >
                                  Portrait
                                </button>
                                <button 
                                  onClick={() => {
                                    setSheetOrientation('landscape');
                                    saveToHistory({ ...currentState, sheetOrientation: 'landscape' });
                                  }}
                                  className={cn("px-3 py-1 text-xs rounded-md transition-all", sheetOrientation === 'landscape' ? "bg-white/10 text-white" : "text-white/40")}
                                >
                                  Landscape
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-white/60">Sheet Size</span>
                              <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                                <button 
                                  onClick={() => {
                                    setSheetSize('4x6');
                                    saveToHistory({ ...currentState, sheetSize: '4x6' });
                                  }}
                                  className={cn("px-3 py-1 text-xs rounded-md transition-all", sheetSize === '4x6' ? "bg-white/10 text-white" : "text-white/40")}
                                >
                                  4x6
                                </button>
                                <button 
                                  onClick={() => {
                                    setSheetSize('A4');
                                    saveToHistory({ ...currentState, sheetSize: 'A4' });
                                  }}
                                  className={cn("px-3 py-1 text-xs rounded-md transition-all", sheetSize === 'A4' ? "bg-white/10 text-white" : "text-white/40")}
                                >
                                  A4
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-white/60">Copies</span>
                                <span className="text-xs font-mono text-orange-500">{copyCount}</span>
                              </div>
                              <input 
                                type="range" min="1" max={sheetSize === '4x6' ? 12 : 32} step="1"
                                value={copyCount} 
                                onChange={(e) => setCopyCount(parseInt(e.target.value))}
                                onMouseUp={() => saveToHistory({ ...currentState, copyCount })}
                                className="w-full accent-orange-500"
                              />
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-white/60">Photo Gap</span>
                                <span className="text-xs font-mono text-orange-500">{photoGap}px</span>
                              </div>
                              <input 
                                type="range" min="0" max="50" step="1"
                                value={photoGap} 
                                onChange={(e) => setPhotoGap(parseInt(e.target.value))}
                                onMouseUp={() => saveToHistory({ ...currentState, photoGap })}
                                className="w-full accent-orange-500"
                              />
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-white/60">Outline</span>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="color" 
                                    value={outlineColor}
                                    onChange={(e) => setOutlineColor(e.target.value)}
                                    onBlur={() => saveToHistory({ ...currentState, outlineColor })}
                                    className="w-4 h-4 rounded-full bg-transparent border-none cursor-pointer"
                                  />
                                  <span className="text-xs font-mono text-orange-500">{photoOutline}px</span>
                                </div>
                              </div>
                              <input 
                                type="range" min="0" max="10" step="1"
                                value={photoOutline} 
                                onChange={(e) => setPhotoOutline(parseInt(e.target.value))}
                                onMouseUp={() => saveToHistory({ ...currentState, photoOutline })}
                                className="w-full accent-orange-500"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white/60">Background</span>
                          <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                            <button 
                              onClick={() => {
                                setIsTransparent(true);
                                saveToHistory({ ...currentState, isTransparent: true });
                              }}
                              className={cn("px-3 py-1 text-xs rounded-md transition-all", isTransparent ? "bg-white/10 text-white" : "text-white/40")}
                            >
                              Trans
                            </button>
                            <button 
                              onClick={() => {
                                setIsTransparent(false);
                                saveToHistory({ ...currentState, isTransparent: false });
                              }}
                              className={cn("px-3 py-1 text-xs rounded-md transition-all", !isTransparent ? "bg-white/10 text-white" : "text-white/40")}
                            >
                              Color
                            </button>
                          </div>
                        </div>

                        {!isTransparent && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white/60">Pick Color</span>
                            <input 
                              type="color" 
                              value={bgColor}
                              onChange={(e) => setBgColor(e.target.value)}
                              onBlur={() => saveToHistory({ ...currentState, bgColor })}
                              className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer"
                            />
                          </div>
                        )}

                        <div className="space-y-4 pt-4 border-t border-white/10">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-white/60">Brightness</span>
                              <span className="text-xs font-mono text-orange-500">{brightness}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="200" step="1"
                              value={brightness} 
                              onChange={(e) => setBrightness(parseInt(e.target.value))}
                              onMouseUp={() => saveToHistory({ ...currentState, brightness })}
                              className="w-full accent-orange-500"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-white/60">Contrast</span>
                              <span className="text-xs font-mono text-orange-500">{contrast}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="200" step="1"
                              value={contrast} 
                              onChange={(e) => setContrast(parseInt(e.target.value))}
                              onMouseUp={() => saveToHistory({ ...currentState, contrast })}
                              className="w-full accent-orange-500"
                            />
                          </div>
                        </div>

                        <button 
                          onClick={downloadImage}
                          className="w-full py-3 bg-orange-500 text-black font-bold rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <Download className="w-5 h-5" />
                          Download {activeTab === 'passport' ? 'Sheet' : 'Photo'}
                        </button>

                        {backendAvailable && (
                          <div className="flex gap-2 mt-2">
                            <button 
                              onClick={() => setShowSaveDialog(true)}
                              className="flex-1 py-3 bg-green-500 text-black font-bold rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                              title="Save project to database"
                            >
                              <Save className="w-5 h-5" />
                              Save Project
                            </button>
                            <button 
                              onClick={() => setShowLoadDialog(true)}
                              className="flex-1 py-3 bg-blue-500 text-black font-bold rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                              title="Load saved project"
                            >
                              <Folder className="w-5 h-5" />
                              Load ({projects.length})
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            {/* Preview Area */}
            <div className="lg:col-span-8">
              <div className="bg-white/5 border border-white/10 rounded-2xl h-full min-h-[500px] flex flex-col overflow-hidden">
                <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-black/20">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500/50" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                    <div className="w-2 h-2 rounded-full bg-green-500/50" />
                    <span className="ml-2 text-xs font-mono text-white/30 uppercase tracking-widest">
                      {isCropping ? 'Cropping Mode' : activeTab === 'passport' ? `Passport Sheet (${sheetSize})` : 'Live Preview'}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 p-8 flex items-center justify-center bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:20px_20px] overflow-auto relative">
                  {!originalImage ? (
                    <div className="text-center space-y-4 opacity-20">
                      <ImageIcon className="w-16 h-16 mx-auto" />
                      <p className="text-sm font-mono uppercase tracking-widest">Awaiting Input Signal</p>
                    </div>
                  ) : isCropping ? (
                    <div className="relative w-full h-full min-h-[400px]">
                      <Cropper
                        image={originalImage}
                        crop={crop}
                        zoom={zoom}
                        aspect={activeTab === 'passport' ? 35 / 45 : cropAspect}
                        showGrid={true}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                      />
                    </div>
                  ) : (
                    <div className="relative max-w-full max-h-full shadow-2xl shadow-black/50 rounded-lg overflow-hidden border border-white/10 bg-white/5">
                      {activeTab === 'remover' ? (
                        !processedImage ? (
                          <img 
                            src={originalImage} 
                            alt="Original" 
                            className="max-w-full max-h-[600px] object-contain" 
                            style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
                          />
                        ) : (
                          <canvas ref={canvasRef} className="max-w-full max-h-[600px] object-contain" />
                        )
                      ) : (
                        <div className="p-4">
                          <canvas ref={passportCanvasRef} className="max-w-full max-h-[700px] object-contain mx-auto shadow-2xl" />
                        </div>
                      )}
                      
                      {isProcessing && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                          <p className="text-sm font-mono uppercase tracking-widest text-orange-500 animate-pulse">Analyzing Pixels...</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8">
            {/* Code Gen Input */}
            <section className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Terminal className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Code Forge</h2>
                  <p className="text-sm text-white/40">Generate multi-language snippets instantly</p>
                </div>
              </div>

              <div className="relative">
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the code you want (e.g., 'A simple login form with validation')"
                  className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 transition-colors resize-none font-mono text-sm"
                />
                <button 
                  onClick={generateCode}
                  disabled={isGenerating || !prompt.trim()}
                  className="absolute bottom-4 right-4 px-6 py-2 bg-orange-500 text-black font-bold rounded-lg hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                  Forge Code
                </button>
              </div>
            </section>

            {/* Code Output */}
            {generatedCode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { lang: 'HTML/CSS', code: generatedCode.html + '\n\n' + generatedCode.css, icon: <FileCode className="w-4 h-4" /> },
                  { lang: 'Python', code: generatedCode.python, icon: <Terminal className="w-4 h-4" /> },
                  { lang: 'Java', code: generatedCode.java, icon: <Cpu className="w-4 h-4" /> }
                ].map((item, idx) => (
                  <div key={idx} className={cn("bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col", item.lang === 'HTML/CSS' && "md:col-span-2")}>
                    <div className="bg-white/[0.02] border-b border-white/10 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-orange-500">{item.icon}</span>
                        <span className="text-xs font-bold uppercase tracking-widest text-white/60">{item.lang}</span>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(item.code || '', item.lang)}
                        className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/40 hover:text-white"
                      >
                        {copiedLang === item.lang ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="p-4 flex-1 bg-black/20">
                      <pre 
                        className="text-xs font-mono text-white/80 overflow-x-auto whitespace-pre-wrap leading-relaxed"
                        style={{ tabSize: 2 }}
                      >
                        {item.code || '// No code generated'}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Save Project Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Save className="w-5 h-5 text-green-500" />
                Save Project
              </h2>
              <button onClick={() => setShowSaveDialog(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <input 
              type="text"
              placeholder="Project name..."
              value={saveProjectName}
              onChange={(e) => setSaveProjectName(e.target.value)}
              className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg mb-4 focus:outline-none focus:border-orange-500"
              onKeyPress={(e) => e.key === 'Enter' && saveProject()}
            />
            
            <div className="flex gap-2">
              <button 
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 py-2 px-4 bg-white/10 rounded-lg hover:bg-white/20 transition"
              >
                Cancel
              </button>
              <button 
                onClick={saveProject}
                className="flex-1 py-2 px-4 bg-green-500 text-black font-bold rounded-lg hover:bg-green-600 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Project Dialog */}
      {showLoadDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-[#1a1a1a] pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Folder className="w-5 h-5 text-blue-500" />
                Load Project ({projects.length})
              </h2>
              <button onClick={() => setShowLoadDialog(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {projects.length === 0 ? (
              <p className="text-center text-white/50 py-8">No saved projects yet</p>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition">
                    <div className="flex-1">
                      <p className="font-semibold">{project.name}</p>
                      <p className="text-xs text-white/40">{project.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => loadProject(project.id)}
                        className="px-3 py-1 bg-blue-500 text-black text-sm font-bold rounded hover:bg-blue-600 transition"
                      >
                        Load
                      </button>
                      <button 
                        onClick={() => deleteProject(project.id)}
                        className="px-3 py-1 bg-red-500 text-black text-sm font-bold rounded hover:bg-red-600 transition"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 opacity-30 grayscale hover:grayscale-0 transition-all">
          <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest">
            <span>Powered by WASM & Gemini</span>
            <span className="w-1 h-1 rounded-full bg-white/50" />
            {backendAvailable ? (
              <span className="text-green-400">✅ Database Active</span>
            ) : (
              <span className="text-yellow-400">⚠️ Offline Mode</span>
            )}
          </div>
          <p className="text-xs font-mono italic">Built for Precision & Speed</p>
        </div>
      </footer>
    </div>
  );
}
