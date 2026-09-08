'use client';

import { QRCodeSVG } from 'qrcode.react';

export function QrCodeImage({ value, size = 180 }: { value: string; size?: number }) {
  return (
    <div className="inline-flex flex-col items-center gap-2 p-4 bg-white rounded-md border border-border">
      <QRCodeSVG value={value} size={size} level="M" includeMargin={false} />
    </div>
  );
}
