import QRCode from "qrcode";

/** Render text (a ticket code) as a QR PNG data URL. Server-side only. */
export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 240 });
}
