import React, { useState, useRef, useMemo } from 'react';
import { Project, GalleryFolder } from '../types';
import { useApp } from '../contexts/AppContext';
import { readFileAsDataURL } from '../utils/fileReaderUtils';
import { compressImage } from '../utils/imageCompression';
import { validateFileSize } from '../utils/validation';
import { FlipBook } from './FlipBook';
import { Panorama360 } from './Panorama360';

interface GalleryTabProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  currentUser: { name: string; avatar?: string } | null;
}

export const GalleryTab: React.FC<GalleryTabProps> = ({ project, onUpdateProject, currentUser }) => {
  const { addLog, setNotification } = useApp();
  const folders = project.galleryFolders || [];

  // Navigation States
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'midia' | 'ebook' | '360'>('midia');
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Form States
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed Properties
  const selectedFolder = useMemo(() => {
    return folders.find(f => f.id === selectedFolderId);
  }, [folders, selectedFolderId]);

  const currentItems = useMemo(() => {
    if (!selectedFolder) return [];
    return (selectedFolder.images || []).filter(img => {
      if (subTab === 'ebook') return img.type === 'flipbook';
      if (subTab === '360') return img.type === 'panorama';
      return img.type !== 'flipbook' && img.type !== 'panorama';
    });
  }, [selectedFolder, subTab]);

  const isVideo = (url: string) => {
    return url.startsWith('data:video/') || url.match(/\.(mp4|webm|ogg|mov)$/i);
  };

  // Helper: Save Changes
  const saveFolders = (updatedFolders: GalleryFolder[], logMsg?: string) => {
    onUpdateProject({ ...project, galleryFolders: updatedFolders, updatedAt: new Date().toISOString() });
    if (logMsg) {
      setNotification(logMsg);
      addLog(currentUser?.name || 'SISTEMA', logMsg);
    }
  };

  // Folder Actions
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const name = newFolderName.trim().toUpperCase();
    const newFolder: GalleryFolder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      images: []
    };
    saveFolders([...folders, newFolder], `PASTA CRIADA: ${name}`);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleDeleteFolder = (folderId: string) => {
    const folderName = folders.find(f => f.id === folderId)?.name || 'Pasta';
    saveFolders(folders.filter(f => f.id !== folderId), `PASTA REMOVIDA: ${folderName}`);
    if (selectedFolderId === folderId) {
      setSelectedFolderId(null);
      setCurrentIndex(-1);
    }
  };

  // Media Upload & Delete
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedFolderId) return;

    try {
      setUploading(true);
      const newImages = [...(selectedFolder?.images || [])];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const err = validateFileSize(file, 20); // 20MB limit
        if (err) {
          setNotification(err);
          continue;
        }

        let dataUrl = '';
        let type: 'image' | 'video' | 'panorama' | 'flipbook' = 'image';
        if (subTab === 'ebook') type = 'flipbook';
        else if (subTab === '360') type = 'panorama';
        else if (file.type.startsWith('video/')) type = 'video';

        try {
          if (type === 'image' && file.type.startsWith('image/')) {
            dataUrl = await compressImage(file, 1024, 1024, 0.6);
          } else if (type === 'panorama' && file.type.startsWith('image/')) {
            dataUrl = await compressImage(file, 1600, 1600, 0.6);
          } else {
            dataUrl = await readFileAsDataURL(file);
          }
        } catch (compressErr) {
          console.error('Erro ao comprimir imagem da galeria, salvando original:', compressErr);
          dataUrl = await readFileAsDataURL(file);
        }

        newImages.push({
          url: dataUrl,
          description: file.name.split('.')[0],
          type
        });
      }

      const updated = folders.map(f => f.id === selectedFolderId ? { ...f, images: newImages } : f);
      saveFolders(updated, `MÍDIA(S) ADICIONADA(S) EM: ${selectedFolder?.name}`);
    } catch (err) {
      setNotification('Erro ao carregar arquivos.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteMedia = (index: number) => {
    if (!selectedFolderId || !selectedFolder) return;
    const itemToDelete = currentItems[index];
    const updatedImages = (selectedFolder.images || []).filter(img => img.url !== itemToDelete.url);
    const updated = folders.map(f => f.id === selectedFolderId ? { ...f, images: updatedImages } : f);
    saveFolders(updated, `MÍDIA REMOVIDA EM: ${selectedFolder.name}`);
    setCurrentIndex(-1);
  };

  // Total items counter
  const totalStats = useMemo(() => {
    let foldersCount = folders.length;
    let itemsCount = folders.reduce((sum, f) => sum + (f.images || []).length, 0);
    return { foldersCount, itemsCount };
  }, [folders]);

  return (
    <div className="flex flex-col bg-transparent w-full min-h-[calc(100vh-140px)] animate-fadeIn p-2">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-theme-divider/50 pb-6 mb-8 gap-4">
        <div className="flex items-center gap-3">
          {selectedFolderId && (
            <button onClick={() => { setSelectedFolderId(null); setCurrentIndex(-1); }} className="w-10 h-10 rounded-full bg-theme-card hover:bg-theme-highlight border border-theme-divider/50 flex items-center justify-center transition-all text-theme-text shrink-0 shadow-md">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-theme-orange text-xl">
                {subTab === 'ebook' ? 'auto_stories' : subTab === '360' ? '360' : 'photo_library'}
              </span>
              <h1 className="text-xl font-square font-black text-theme-text uppercase tracking-widest leading-none">
                {selectedFolderId ? selectedFolder?.name : 'GALERIA DO PROJETO'}
              </h1>
            </div>
            <p className="text-xs text-theme-textMuted font-bold mt-1.5 uppercase tracking-wide">
              {selectedFolderId 
                ? `${currentItems.length} mídias nesta pasta` 
                : `${totalStats.foldersCount} pastas registradas · ${totalStats.itemsCount} mídias no total`}
            </p>
          </div>
        </div>

        {/* Header Right Buttons / Subtabs */}
        <div className="flex items-center gap-3 shrink-0">
          {!selectedFolderId ? (
            <div className="flex items-center gap-1 bg-theme-card/60 p-1 rounded-xl border border-theme-divider">
              {([
                { id: 'midia', label: 'Galeria', icon: 'image' },
                { id: 'ebook', label: 'Ebook', icon: 'menu_book' },
                { id: '360', label: '360°', icon: '360' },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => { setSubTab(t.id); setCurrentIndex(-1); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    subTab === t.id ? 'bg-theme-orange text-theme-bg shadow-lg' : 'text-theme-textMuted hover:text-theme-text hover:bg-theme-highlight/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm leading-none">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          ) : null}

          {selectedFolderId ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 bg-theme-orange text-theme-bg text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shrink-0"
            >
              <span className="material-symbols-outlined text-sm">upload</span>
              {subTab === 'ebook' ? 'ADICIONAR PDF' : subTab === '360' ? 'ADICIONAR 360°' : 'ADICIONAR MÍDIA'}
            </button>
          ) : (
            <button
              onClick={() => setShowNewFolder(true)}
              className="px-5 py-2.5 bg-theme-card hover:bg-theme-highlight border border-theme-divider/50 text-theme-text text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-md shrink-0"
            >
              <span className="material-symbols-outlined text-sm">create_new_folder</span>
              NOVA PASTA
            </button>
          )}
        </div>
      </div>

      {/* ── Main Folder List View ────────────────────────────────────────────────── */}
      {!selectedFolderId && (
        <div className="flex-1">
          {folders.length === 0 ? (
            <div className="ds-card border-theme-divider p-16 flex flex-col items-center justify-center text-center max-w-xl mx-auto mt-10">
              <span className="material-symbols-outlined text-5xl text-theme-textMuted/40 mb-4">folder_off</span>
              <h3 className="text-lg font-square font-black text-theme-text uppercase tracking-widest mb-1">NENHUMA PASTA</h3>
              <p className="text-sm text-theme-textMuted mb-6">Crie pastas para organizar fotos, e-books e imagens 360° do seu projeto.</p>
              <button onClick={() => setShowNewFolder(true)} className="px-6 py-3 bg-theme-orange text-theme-bg text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg">
                CRIAR PRIMEIRA PASTA
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {folders.map(folder => {
                const items = (folder.images ?? []).filter(img => {
                  if (subTab === 'ebook') return img.type === 'flipbook';
                  if (subTab === '360') return img.type === 'panorama';
                  return img.type !== 'flipbook' && img.type !== 'panorama';
                });
                const cover = items.find(i => i.type !== 'flipbook')?.url;

                return (
                  <div
                    key={folder.id}
                    onClick={() => { setSelectedFolderId(folder.id); setCurrentIndex(-1); }}
                    className="ds-card cursor-pointer group flex flex-col relative overflow-hidden min-h-[220px]"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden relative bg-theme-bg/50 flex items-center justify-center border-b border-theme-divider">
                      {cover ? (
                        <img src={cover} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <span className="material-symbols-outlined text-4xl text-theme-textMuted/40">
                            {subTab === 'ebook' ? 'auto_stories' : subTab === '360' ? '360' : 'photo_library'}
                          </span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3 bg-theme-card/85 backdrop-blur-sm rounded-full px-2.5 py-1 text-[8px] font-black text-theme-orange border border-theme-border/50 uppercase tracking-wider shadow-sm">
                        {items.length} {subTab === 'ebook' ? 'ebooks' : subTab === '360' ? '360°' : 'mídias'}
                      </div>
                    </div>
                    
                    <div className="p-4 flex items-center justify-between mt-auto">
                      <div className="min-w-0 pr-4">
                        <h4 className="font-square font-black text-xs text-theme-text uppercase tracking-wider truncate leading-tight">{folder.name}</h4>
                        <span className="text-[9px] font-bold text-theme-textMuted mt-1 block">PASTA DE PROJETO</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                        className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shrink-0"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Folder Contents View ─────────────────────────────────────────────────── */}
      {selectedFolderId && selectedFolder && (
        <div className="flex-1 flex flex-col min-h-0">
          {currentItems.length === 0 ? (
            <div className="ds-card border-theme-divider p-16 flex flex-col items-center justify-center text-center max-w-xl mx-auto mt-10">
              <span className="material-symbols-outlined text-5xl text-theme-textMuted/40 mb-4">
                {subTab === 'ebook' ? 'menu_book' : 'add_photo_alternate'}
              </span>
              <h3 className="text-lg font-square font-black text-theme-text uppercase tracking-widest mb-1">PASTA VAZIA</h3>
              <p className="text-sm text-theme-textMuted mb-6">Esta pasta ainda não possui nenhuma mídia desse tipo cadastrada.</p>
              <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-theme-orange text-theme-bg text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg">
                CARREGAR ARQUIVO
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* ── FlipBook Reader View ── */}
              {subTab === 'ebook' && (
                <>
                  {currentIndex >= 0 && currentItems[currentIndex] ? (
                    <div className="ds-card flex-1 flex flex-col overflow-hidden min-h-[650px] animate-fadeIn">
                      <div className="flex items-center justify-between px-6 py-4 border-b border-theme-divider bg-theme-bg/40">
                        <button onClick={() => setCurrentIndex(-1)} className="flex items-center gap-1 text-[10px] font-black uppercase text-theme-textMuted hover:text-theme-orange transition-colors">
                          <span className="material-symbols-outlined text-sm">arrow_back</span> FECHAR LEITOR
                        </button>
                        <span className="text-[10px] font-black uppercase text-theme-text tracking-widest truncate max-w-md">
                          {currentItems[currentIndex].description}
                        </span>
                        <div className="w-16"></div> {/* Spacer */}
                      </div>
                      <div className="flex-1 relative bg-black/10 min-h-[580px]">
                        <FlipBook url={currentItems[currentIndex].url} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                      {currentItems.map((img, idx) => (
                        <div key={idx} className="relative group cursor-pointer" onClick={() => setCurrentIndex(idx)}>
                          <div className="ds-card flex flex-col min-h-[250px] overflow-hidden">
                            <div className="aspect-[3/4] w-full flex flex-col items-center justify-center bg-gradient-to-b from-theme-highlight/50 to-theme-bg relative overflow-hidden border-b border-theme-divider">
                              <span className="material-symbols-outlined text-6xl text-red-500 opacity-80 mb-2">picture_as_pdf</span>
                              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-red-500"></div>
                            </div>
                            <div className="p-4 flex items-center justify-between mt-auto">
                              <div className="min-w-0 pr-4">
                                <p className="text-xs font-black text-theme-text uppercase tracking-wide truncate">{img.description || `Documento ${idx + 1}`}</p>
                                <p className="text-[9px] text-theme-textMuted mt-1 flex items-center gap-1 font-bold">
                                  <span className="material-symbols-outlined text-[10px]">menu_book</span> CLIQUE PARA LER
                                </p>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteMedia(idx); }}
                                className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shrink-0">
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── 360° Panorama View ── */}
              {subTab === '360' && (
                <>
                  {currentIndex >= 0 && currentItems[currentIndex] ? (
                    <div className="ds-card flex-1 flex flex-col overflow-hidden min-h-[600px] animate-fadeIn">
                      <div className="flex items-center justify-between px-6 py-4 border-b border-theme-divider bg-theme-bg/40">
                        <button onClick={() => setCurrentIndex(-1)} className="flex items-center gap-1 text-[10px] font-black uppercase text-theme-textMuted hover:text-theme-orange transition-colors">
                          <span className="material-symbols-outlined text-sm">arrow_back</span> VOLTAR
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-theme-orange">360</span>
                          <span className="text-[10px] font-black uppercase text-theme-text tracking-widest truncate max-w-md">
                            {currentItems[currentIndex].description}
                          </span>
                        </div>
                        <span className="text-[8px] text-theme-textMuted uppercase tracking-widest">← ARRASTE PARA EXPLORAR →</span>
                      </div>
                      <div className="flex-1 bg-black min-h-[500px]">
                        <Panorama360 url={currentItems[currentIndex].url} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {currentItems.map((img, idx) => (
                        <div key={idx} className="relative group cursor-pointer" onClick={() => setCurrentIndex(idx)}>
                          <div className="ds-card flex flex-col min-h-[220px] overflow-hidden">
                            <div className="relative aspect-video overflow-hidden bg-theme-bg border-b border-theme-divider">
                              <img src={img.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="360" />
                              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-all flex items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-theme-card/10 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100 duration-300">
                                  <span className="material-symbols-outlined text-white text-2xl animate-pulse">360</span>
                                </div>
                              </div>
                              <div className="absolute top-3 left-3 bg-theme-orange text-theme-bg shadow-md rounded-full px-2 py-0.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-theme-bg text-[12px]">360</span>
                                <span className="text-[8px] font-black text-theme-bg uppercase tracking-wider">360°</span>
                              </div>
                            </div>
                            <div className="p-4 flex items-center justify-between mt-auto">
                              <div className="min-w-0 pr-4">
                                <p className="text-xs font-black text-theme-text uppercase tracking-wide truncate">{img.description || `Vista 360° ${idx + 1}`}</p>
                                <p className="text-[9px] text-theme-textMuted mt-1 font-bold uppercase tracking-wider">CLIQUE PARA EXPLORAR</p>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteMedia(idx); }}
                                className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shrink-0">
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── Standard Images & Videos View ── */}
              {subTab === 'midia' && (
                <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
                  {currentItems.map((img, idx) => (
                    <div
                      key={idx}
                      className="break-inside-avoid relative group cursor-pointer ds-card overflow-hidden"
                      onClick={() => setViewingImage(img.url)}
                    >
                      {isVideo(img.url) ? (
                        <video src={img.url} className="w-full object-cover" />
                      ) : (
                        <img src={img.url} className="w-full object-cover transition-transform duration-500 group-hover:scale-105" alt="midia" />
                      )}
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-3xl opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 drop-shadow-lg">open_in_full</span>
                      </div>

                      {/* Top Delete Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteMedia(idx); }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 flex items-center justify-center shadow-lg"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>

                      {/* Bottom Description */}
                      {img.description && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-all">
                          <p className="text-white text-[10px] font-black uppercase tracking-wider truncate">{img.description}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* ── Create New Folder Modal ── */}
      {showNewFolder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowNewFolder(false); }}>
          <div className="ds-card p-8 w-full max-w-sm shadow-2xl animate-scaleIn relative">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-square font-black text-theme-text uppercase tracking-widest">NOVA PASTA</h3>
              <button onClick={() => setShowNewFolder(false)} className="text-theme-textMuted hover:text-theme-text transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-black text-theme-textMuted uppercase tracking-widest mb-2">NOME DA PASTA</label>
                <input
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="Ex: FACHADA 3D"
                  required
                  autoFocus
                  className="w-full bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-sm text-theme-text outline-none focus:border-theme-orange"
                />
              </div>
              <div className="flex gap-4 justify-end mt-4">
                <button type="button" onClick={() => setShowNewFolder(false)} className="px-6 py-3 text-[10px] font-black text-theme-textMuted hover:text-theme-text uppercase tracking-widest transition-colors">
                  CANCELAR
                </button>
                <button type="submit" className="px-6 py-3 font-black bg-theme-orange text-theme-bg rounded-xl text-[10px] uppercase tracking-widest hover:opacity-90 transition-colors shadow-lg">
                  CRIAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Lightbox View Image Modal ── */}
      {viewingImage && (
        <div className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
          <button className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors" onClick={() => setViewingImage(null)}>
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            {isVideo(viewingImage) ? (
              <video src={viewingImage} controls autoPlay className="max-w-full max-h-[80vh] object-contain block mx-auto" />
            ) : (
              <img src={viewingImage} className="max-w-full max-h-[80vh] object-contain block mx-auto" alt="lightbox" />
            )}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept={subTab === 'ebook' ? 'application/pdf' : 'image/*,video/*'}
        onChange={handleUpload}
      />
    </div>
  );
};
