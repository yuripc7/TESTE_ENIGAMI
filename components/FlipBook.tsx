import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface FlipBookProps {
    url: string;
}

export const FlipBook: React.FC<FlipBookProps> = ({ url }) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    return (
        <div className="flex flex-col items-center gap-4 w-full">
            <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                    <div className="flex items-center justify-center py-12">
                        <span className="material-symbols-outlined animate-spin text-theme-orange">progress_activity</span>
                        <span className="text-theme-textMuted text-sm ml-2">Carregando PDF...</span>
                    </div>
                }
                error={
                    <div className="text-red-500 text-sm text-center py-8">
                        Erro ao carregar o PDF.
                    </div>
                }
            >
                <Page
                    pageNumber={pageNumber}
                    width={600}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                />
            </Document>

            {numPages > 0 && (
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                        disabled={pageNumber <= 1}
                        className="px-3 py-1.5 bg-theme-bg border border-theme-divider rounded-lg text-theme-text text-sm disabled:opacity-30 hover:bg-theme-card transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <span className="text-theme-textMuted text-sm font-square">
                        {pageNumber} / {numPages}
                    </span>
                    <button
                        onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                        disabled={pageNumber >= numPages}
                        className="px-3 py-1.5 bg-theme-bg border border-theme-divider rounded-lg text-theme-text text-sm disabled:opacity-30 hover:bg-theme-card transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                </div>
            )}
        </div>
    );
};
