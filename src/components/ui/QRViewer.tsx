import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const QRViewer = ({ value }: { value: string }) => (
  <div className="p-4 border rounded">
    <QRCodeSVG value={value} size={128} />
    <p className="mt-2">Scan to trace</p>
  </div>
);

export default QRViewer;