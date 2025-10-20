const fs = require('fs');
const bs58 = require('bs58');
const path = require('path');

// Đường dẫn chuẩn trên Windows:
const keyPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');

const keypair = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
const base58Key = bs58.encode(Uint8Array.from(keypair));

console.log('Base58 Private Key:\n', base58Key);
