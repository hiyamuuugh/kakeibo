"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SELECTED_MEMBER_ID_KEY } from "@/lib/member-storage";

interface ImportSource {
  id: string;
  title: string;
  description: string;
  endpoint: string;
  color: string;
  linkUrl: string;
  appUrl?: string;
  linkLabel: string;
  steps: string[];
}

interface ImportResult {
  imported: number;
  skipped: number;
}

interface Member {
  id: string;
  name: string;
}

const IMPORT_SOURCES: ImportSource[] = [
  {
    id: "paypay",
    title: "PayPay",
    description: "PayPayアプリの利用履歴CSV",
    endpoint: "/api/import/paypay",
    color: "#ef4444",
    linkUrl: "https://apps.apple.com/jp/app/paypay/id1435783608",
    appUrl: "paypay://",
    linkLabel: "PayPayを開く",
    steps: [
      "PayPayアプリを開く",
      "利用履歴から明細をダウンロード",
      "明細をダウンロードしたCSVを選択",
    ],
  },
  {
    id: "paypay-card",
    title: "PayPayカード",
    description: "PayPayカードの利用明細CSV",
    endpoint: "/api/import/paypay-card",
    color: "#f59e0b",
    linkUrl: "https://apps.apple.com/jp/app/paypay/id1435783608",
    appUrl: "paypay://",
    linkLabel: "PayPayを開く",
    steps: [
      "PayPayカードを開く",
      "利用明細を表示してCSVをダウンロード",
      "CSVをダウンロードして選択",
    ],
  },
  {
    id: "rakuten",
    title: "楽天カード",
    description: "楽天e-NAVIの利用明細CSV",
    endpoint: "/api/import/rakuten",
    color: "#bf0000",
    linkUrl: "https://www.rakuten-card.co.jp/e-navi/members/statement/index.xhtml",
    linkLabel: "楽天e-NAVIを開く",
    steps: [
      "楽天e-NAVIを開く",
      "PC版に切替して利用明細を表示",
      "CSV形式でダウンロードして選択",
    ],
  },
  {
    id: "saison",
    title: "セゾンカード",
    description: "セゾンカードの利用明細CSV",
    endpoint: "/api/import/saison",
    color: "#0f766e",
    linkUrl: "https://www.saisoncard.co.jp/",
    linkLabel: "セゾンカードを開く",
    steps: [
      "NetアンサーまたはセゾンPortalを開く",
      "利用明細からCSVをダウンロード",
      "ダウンロードしたCSVを選択",
    ],
  },
  {
    id: "mufg",
    title: "三菱UFJ銀行",
    description: "三菱UFJダイレクトの入出金明細CSV",
    endpoint: "/api/import/mufg",
    color: "#dc2626",
    linkUrl: "https://direct.bk.mufg.jp/",
    linkLabel: "三菱UFJダイレクトを開く",
    steps: [
      "三菱UFJダイレクトを開く",
      "PC版に切替して入出金明細を表示",
      "CSVをダウンロードして選択",
    ],
  },
  {
    id: "smbc",
    title: "三井住友銀行",
    description: "SMBCダイレクトの入出金明細CSV",
    endpoint: "/api/import/smbc",
    color: "#16a34a",
    linkUrl: "https://direct.smbc.co.jp/",
    linkLabel: "SMBCダイレクトを開く",
    steps: [
      "SMBCダイレクトを開く",
      "入出金明細を表示する",
      "CSVをダウンロードして選択",
    ],
  },
];

export default function ImportPage() {
  const [openId, setOpenId] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");

  useEffect(() => {
    const loadMember = async () => {
      const response = await fetch("/api/members");
      if (!response.ok) return;

      const members = (await response.json()) as Member[];
      const savedMemberId = localStorage.getItem(SELECTED_MEMBER_ID_KEY);
      const memberId =
        members.find((member) => member.id === savedMemberId)?.id ?? members[0]?.id ?? "";
      if (memberId) {
        localStorage.setItem(SELECTED_MEMBER_ID_KEY, memberId);
        setSelectedMemberId(memberId);
      }
    };

    void loadMember();
  }, []);

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <div>
        <h1 className="text-xl font-bold text-[#1f2937]">CSV取込</h1>
      </div>

      <div className="space-y-3">
        {IMPORT_SOURCES.map((source) => (
          <ImportSourceCard
            key={source.id}
            source={source}
            memberId={selectedMemberId}
            open={openId === source.id}
            onToggle={() => setOpenId((current) => (current === source.id ? "" : source.id))}
          />
        ))}
      </div>
    </div>
  );
}

function ImportSourceCard({
  source,
  memberId,
  open,
  onToggle,
}: {
  source: ImportSource;
  memberId: string;
  open: boolean;
  onToggle: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onDrop = useCallback((files: File[]) => {
    if (!files[0]) return;
    setFile(files[0]);
    setResult(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    if (memberId) {
      formData.append("memberId", memberId);
    }

    const response = await fetch(source.endpoint, {
      method: "POST",
      body: formData,
    });

    setLoading(false);

    if (!response.ok) {
      const error = (await response.json()) as { error?: string };
      toast.error(`インポート失敗: ${error.error ?? "CSVを確認してください"}`);
      return;
    }

    const data = (await response.json()) as ImportResult;
    setResult(data);
    toast.success(`${data.imported}件インポートしました`);
  };

  const openSource = () => {
    window.location.href = source.appUrl ?? source.linkUrl;
  };

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-white"
          style={{ backgroundColor: source.color }}
        >
          <Upload className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-[#1f2937]">{source.title}</span>
          <span className="block truncate text-xs text-[#6b7280]">{source.description}</span>
        </span>
        <span className="text-lg font-semibold text-[#9ca3af]">{open ? "-" : "+"}</span>
      </button>

      {open ? (
        <CardContent className="space-y-4 border-t border-[#f3f4f6] pt-4">
          <button
            type="button"
            onClick={openSource}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb]"
          >
            <ExternalLink className="h-4 w-4" />
            {source.linkLabel}
          </button>

          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-[10px] border-2 border-dashed p-8 text-center transition-colors ${
              isDragActive
                ? "border-[#93c5fd] bg-[#eff6ff]"
                : "border-[#e5e7eb] bg-[#f9fafb] hover:border-[#d1d5db]"
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div>
                <p className="font-medium text-[#1f2937]">{file.name}</p>
                <p className="mt-1 text-sm text-[#6b7280]">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[#6b7280]">
                  CSVファイルをドロップ、またはクリックして選択
                </p>
                <p className="mt-2 text-xs text-[#9ca3af]">{source.description}</p>
              </div>
            )}
          </div>

          {result ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
              <p className="font-medium text-green-800">インポート完了</p>
              <p className="text-green-700">
                取込済み: {result.imported}件 / スキップ: {result.skipped}件
              </p>
            </div>
          ) : null}

          <Button className="w-full" onClick={handleImport} disabled={!file || loading || !memberId}>
            {loading ? "インポート中..." : "取込開始"}
          </Button>

          <div className="rounded-[10px] bg-[#f9fafb] p-4">
            <p className="mb-2 text-sm font-bold text-[#1f2937]">CSVの取得手順</p>
            <ol className="list-inside list-decimal space-y-1 text-sm text-[#6b7280]">
              {source.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
