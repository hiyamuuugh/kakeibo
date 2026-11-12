export class ReceiptImageError extends Error {}
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/** Normalize phone photos before they hit a serverless request-size limit. */
export async function prepareReceiptImage(file: File): Promise<File> {
  if (!file.size) throw new ReceiptImageError("画像が空です。撮影し直してください。");
  if (file.size > 30 * 1024 * 1024) throw new ReceiptImageError("画像が大きすぎます。レシート部分だけ撮影してください。");
  if (file.type && !file.type.startsWith("image/")) throw new ReceiptImageError("写真を選択してください。");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new ReceiptImageError("画像の読み込みに時間がかかっています。写真を選び直してください。")), 15000);
      image.onload = () => { clearTimeout(timeout); resolve(); };
      image.onerror = () => { clearTimeout(timeout); reject(new ReceiptImageError("この写真形式は読み込めません。JPEGまたはPNGの写真を選んでください。")); };
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new ReceiptImageError("画像を読み込めませんでした。撮影し直してください。");
    const scale = Math.min(1, 2800 / Math.max(image.naturalWidth, image.naturalHeight), Math.sqrt(4000000 / (image.naturalWidth * image.naturalHeight)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new ReceiptImageError("画像を準備できませんでした。ブラウザを開き直してください。");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.8, 0.7, 0.6]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= MAX_UPLOAD_BYTES) return new File([blob], "receipt.jpg", { type: "image/jpeg" });
    }
    throw new ReceiptImageError("画像を小さくできませんでした。レシート部分だけを撮影してください。");
  } finally {
    URL.revokeObjectURL(url);
  }
}
