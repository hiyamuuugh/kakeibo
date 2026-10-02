"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);

  const onDrop = useCallback((files: File[]) => {
    if (files[0]) {
      setFile(files[0]);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/import/paypay", {
      method: "POST",
      body: formData,
    });

    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      toast.error(`インポート失敗: ${err.error}`);
      return;
    }

    const data = await res.json();
    setResult(data);
    toast.success(`${data.imported}件インポートしました`);
  }

  const [smbcFile, setSmbcFile] = useState<File | null>(null);
  const [smbcLoading, setSmbcLoading] = useState(false);
  const [smbcResult, setSmbcResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);

  const onDropSmbc = useCallback((files: File[]) => {
    if (files[0]) {
      setSmbcFile(files[0]);
      setSmbcResult(null);
    }
  }, []);

  const {
    getRootProps: getSmbcRootProps,
    getInputProps: getSmbcInputProps,
    isDragActive: isSmbcDragActive,
  } = useDropzone({
    onDrop: onDropSmbc,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  async function handleSmbcImport() {
    if (!smbcFile) return;
    setSmbcLoading(true);
    setSmbcResult(null);

    const formData = new FormData();
    formData.append("file", smbcFile);

    const res = await fetch("/api/import/smbc", {
      method: "POST",
      body: formData,
    });

    setSmbcLoading(false);

    if (!res.ok) {
      const err = await res.json();
      toast.error(`インポート失敗: ${err.error}`);
      return;
    }

    const data = await res.json();
    setSmbcResult(data);
    toast.success(`${data.imported}件インポートしました`);
  }

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <div>
        <p className="text-xs font-semibold text-[#6b7280]">データ追加</p>
        <h1 className="text-xl font-bold text-[#1f2937]">CSV取込</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">PayPay 利用履歴CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              isDragActive
                ? "border-[#93c5fd] bg-[#eff6ff]"
                : "border-[#e5e7eb] bg-[#f9fafb] hover:border-[#d1d5db]"
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-[#6b7280]">
                  CSVファイルをドロップ、またはクリックして選択
                </p>
                <p className="mt-2 text-xs text-[#9ca3af]">
                  PayPay アプリ → 利用履歴 → エクスポート
                </p>
              </div>
            )}
          </div>

          {loading && (
            <div className="space-y-1">
              <Progress value={null} />
              <p className="text-center text-sm text-[#6b7280]">インポート中…</p>
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
              <p className="font-medium text-green-800">インポート完了</p>
              <p className="text-green-700">
                取込済み: {result.imported}件 / スキップ: {result.skipped}件
              </p>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleImport}
            disabled={!file || loading}
          >
            {loading ? "インポート中…" : "取込開始"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">三井住友銀行 入出金明細CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getSmbcRootProps()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              isSmbcDragActive
                ? "border-[#93c5fd] bg-[#eff6ff]"
                : "border-[#e5e7eb] bg-[#f9fafb] hover:border-[#d1d5db]"
            }`}
          >
            <input {...getSmbcInputProps()} />
            {smbcFile ? (
              <div>
                <p className="font-medium">{smbcFile.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {(smbcFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-[#6b7280]">
                  CSVファイルをドロップ、またはクリックして選択
                </p>
                <p className="mt-2 text-xs text-[#9ca3af]">
                  SMBCダイレクト → 入出金明細 → CSVダウンロード
                </p>
              </div>
            )}
          </div>

          {smbcLoading && (
            <div className="space-y-1">
              <Progress value={null} />
              <p className="text-center text-sm text-[#6b7280]">インポート中…</p>
            </div>
          )}

          {smbcResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
              <p className="font-medium text-green-800">インポート完了</p>
              <p className="text-green-700">
                取込済み: {smbcResult.imported}件 / スキップ: {smbcResult.skipped}件
              </p>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleSmbcImport}
            disabled={!smbcFile || smbcLoading}
          >
            {smbcLoading ? "インポート中…" : "取込開始"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">PayPay CSVの取得方法</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-2 text-sm text-[#6b7280]">
            <li>PayPayアプリを開く</li>
            <li>右下の「ウォレット」をタップ</li>
            <li>「PayPay残高」→「利用履歴」を開く</li>
            <li>右上のメニューから「明細をダウンロード」を選択</li>
            <li>ダウンロードしたCSVをここにアップロード</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
