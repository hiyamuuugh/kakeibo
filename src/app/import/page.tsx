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

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">CSV取込</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">PayPay 利用履歴CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
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
                <p className="text-gray-500">
                  CSVファイルをドロップ、またはクリックして選択
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  PayPay アプリ → 利用履歴 → エクスポート
                </p>
              </div>
            )}
          </div>

          {loading && (
            <div className="space-y-1">
              <Progress value={null} />
              <p className="text-sm text-gray-500 text-center">インポート中…</p>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
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
          <CardTitle className="text-base">PayPay CSVの取得方法</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
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
