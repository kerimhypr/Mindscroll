import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalysisStore } from '@/store/analysisStore';
import { extractTikTokZip } from '@/lib/parser/zipExtractor';
import { runAnalysis } from '@/lib/analysis/engine';
import { generateCryptoKey, exportKeyToBase64, encryptText } from '@/lib/crypto/encryption';
import { saveEncryptedReport } from '@/lib/firebase';
import { AlertCircle, CheckCircle2, Loader2, UploadCloud } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n';

export default function DropZone() {
  const router = useRouter();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    checklist,
    setData,
    setResults,
    isProcessing,
    progress,
    setProcessing,
    setProgress,
    setShareInfo,
  } = useAnalysisStore();

  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      setErrorMsg(t('dropzone.error.invalidZip'));
      return;
    }

    setErrorMsg(null);
    setProcessing(true);
    setProgress(10);

    try {
      // Step 1: Parse ZIP
      setProgress(25);
      const parsedData = await extractTikTokZip(file);
      
      // Step 2: Validate chosen files
      setProgress(50);
      setData(parsedData);

      // Verify that at least one requested file exists in the ZIP
      const missingFiles: string[] = [];
      let hasAnyData = false;

      if (checklist.videos) {
        if (parsedData.videos && parsedData.videos.length > 0) hasAnyData = true;
        else missingFiles.push('VideoBrowsingHistory.json');
      }
      if (checklist.searches) {
        if (parsedData.searches && parsedData.searches.length > 0) hasAnyData = true;
        else missingFiles.push('SearchHistory.json');
      }
      if (checklist.comments) {
        if (parsedData.comments && parsedData.comments.length > 0) hasAnyData = true;
        else missingFiles.push('Comments.json');
      }
      if (checklist.likes) {
        if (parsedData.likes && parsedData.likes.length > 0) hasAnyData = true;
        else missingFiles.push('Likes.json');
      }
      if (checklist.favorites) {
        if (parsedData.favorites && parsedData.favorites.length > 0) hasAnyData = true;
        else missingFiles.push('Favorites.json');
      }
      if (checklist.shares) {
        if (parsedData.shares && parsedData.shares.length > 0) hasAnyData = true;
        else missingFiles.push('ShareHistory.json');
      }
      if (checklist.reposts) {
        if (parsedData.reposts && parsedData.reposts.length > 0) hasAnyData = true;
        else missingFiles.push('Reposts.json');
      }

      if (!hasAnyData) {
        throw new Error('No matching data found inside the ZIP. Ensure you uploaded the correct TikTok JSON export ZIP containing your profile data files.');
      }

      // Step 3: Run Analysis Engine
      setProgress(75);
      const analysisResult = runAnalysis(parsedData);
      setResults(analysisResult);

      // Step 4: Zero-Knowledge Encryption and Upload
      setProgress(90);
      const docId = crypto.randomUUID();
      const cryptoKey = await generateCryptoKey();
      const rawKey = await exportKeyToBase64(cryptoKey);
      
      // Encrypt the analysis results
      const encryptedData = await encryptText(JSON.stringify(analysisResult), cryptoKey);
      
      // Save ciphertext to Firestore
      await saveEncryptedReport(docId, encryptedData.ciphertext, encryptedData.iv);
      
      // Store ID and Key in sessionStorage to survive Stripe redirect
      sessionStorage.setItem('chronosfeed_report_id', docId);
      sessionStorage.setItem('chronosfeed_encryption_key', rawKey);
      setShareInfo(docId, rawKey);

      setProgress(100);
      
      // Short delay for satisfying UI transition
      setTimeout(() => {
        setProcessing(false);
        router.push('/report');
      }, 800);

    } catch (e: unknown) {
      console.error(e);
      if (e instanceof Error && e.message === 'No matching data found inside the ZIP. Ensure you uploaded the correct TikTok JSON export ZIP containing your profile data files.') {
        setErrorMsg(t('dropzone.error.noMatchingData'));
      } else {
        setErrorMsg(e instanceof Error ? e.message : t('dropzone.error.default'));
      }
      setProcessing(false);
      setProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition ${
          dragActive
            ? 'border-slate-950 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]'
            : 'border-slate-300 bg-white hover:border-slate-500 hover:shadow-[0_18px_45px_rgba(15,23,42,0.06)]'
        } ${isProcessing ? 'pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={handleChange}
          className="hidden"
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center space-y-4 py-4">
            <Loader2 className="h-9 w-9 animate-spin text-slate-950" />
            <div>
              <p className="text-sm font-black text-slate-950">{t('dropzone.processing')}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{t('dropzone.localOnly')}</p>
            </div>
            <div className="h-1.5 w-56 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-1.5 rounded-full bg-slate-950 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-xs font-bold text-slate-600">{progress}%</span>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-950">
                {t('dropzone.title')}
              </p>
              <p className="mt-1 max-w-64 text-xs font-medium leading-5 text-slate-500">
                {t('dropzone.description')}
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{t('dropzone.badge')}</span>
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <p className="leading-normal">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}

