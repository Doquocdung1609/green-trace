const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Connection, Keypair } = require('@solana/web3.js');
const {
  createGenericFile,
  generateSigner,
  publicKey,
  lamports,
  base58,
} = require('@metaplex-foundation/umi');

const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');


const { mplCore } = require('@metaplex-foundation/mpl-core');

const { mplToolbox } = require('@metaplex-foundation/mpl-toolbox');


const { mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata');
const { createV1 } = require('@metaplex-foundation/mpl-token-metadata');

const { walletAdapterIdentity } = require('@metaplex-foundation/umi-signer-wallet-adapters');

const { createIrysUploader } = require('@metaplex-foundation/umi-uploader-irys');
const { fetchHttp } = require('@metaplex-foundation/umi-http-fetch');
const punycode = require('punycode/');

// ================== SETUP SERVER ==================
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

global.Buffer = global.Buffer || require('buffer').Buffer;

// ================== SETUP WALLET ==================
const walletKeypair = Keypair.generate();
console.log('Temporary wallet public key:', walletKeypair.publicKey.toBase58());

const wallet = {
  publicKey: publicKey(walletKeypair.publicKey.toBase58()),
  signTransaction: async (tx) => {
    const transaction = tx.toTransaction();
    transaction.sign(walletKeypair);
    return transaction;
  },
  signAllTransactions: async (txs) => {
    return Promise.all(
      txs.map(async (tx) => {
        const transaction = tx.toTransaction();
        transaction.sign(walletKeypair);
        return transaction;
      })
    );
  },
};


// ================== SETUP UMI ==================
console.log('Setting up Solana connection and UMI...');
const umi = createUmi('https://api.devnet.solana.com')
  .use(walletAdapterIdentity(wallet))
  .use(mplCore())
  .use(mplTokenMetadata())
  .use(createIrysUploader({
    address: 'https://devnet.irys.xyz',
    providerUrl: 'https://api.devnet.solana.com',
    timeout: 60000,
  }));




// ================== MINT NFT ENDPOINT ==================
app.post(
  '/mint-nft',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'certifications', maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      console.log('Received /mint-nft request:', { body: req.body, files: req.files });

      // Validate required fields
      const {
        name,
        description,
        origin,
        farmerName,
        productionDate,
        quantity,
        price,
        timeline,
        certificationNames = [],
      } = req.body;

      if (!name || !description || !origin || !farmerName || !productionDate || !quantity || !price) {
        console.error('Missing required fields:', { name, description, origin, farmerName, productionDate, quantity, price });
        return res.status(400).json({ success: false, error: 'Missing required fields.' });
      }

      if (!req.files || !req.files.image || !req.files.image[0]) {
        console.error('Missing image file:', req.files);
        return res.status(400).json({ success: false, error: 'Missing image file.' });
      }

      const imageFileData = req.files.image[0];
      const certificationFiles = req.files.certifications || [];

      // Validate certification names match files
      if (certificationFiles.length > 0 && certificationNames.length !== certificationFiles.length) {
        console.error('Certification names and files mismatch:', {
          names: certificationNames,
          files: certificationFiles.length,
        });
        return res.status(400).json({ success: false, error: 'Number of certification names does not match number of files.' });
      }

      // Parse timeline JSON string
      let parsedTimeline;
      try {
        parsedTimeline = timeline ? JSON.parse(timeline) : [];
        if (!Array.isArray(parsedTimeline)) {
          throw new Error('Timeline must be an array.');
        }
      } catch (error) {
        console.error('Failed to parse timeline:', error.message);
        return res.status(400).json({ success: false, error: `Invalid timeline format: ${error.message}` });
      }


      // ========== Check Balance + Airdrop ==========
      console.log('Checking wallet balance...');
      const balance = await umi.rpc.getBalance(wallet.publicKey);
      console.log('Current balance:', balance.basisPoints.toString());
      if (balance.basisPoints < BigInt(1000000)) {
        console.log('Airdropping 1 SOL...');
        try {
          await umi.rpc.airdrop(wallet.publicKey, lamports(1_000_000_000), { commitment: 'confirmed' });
          console.log('Airdrop successful');
          // Wait for airdrop to be confirmed
          await new Promise(resolve => setTimeout(resolve, 5000));
          const newBalance = await umi.rpc.getBalance(wallet.publicKey);
          console.log('New balance after airdrop:', newBalance.basisPoints.toString());
        } catch (airdropError) {
          console.error('Airdrop failed:', airdropError.message);
          return res.status(500).json({ success: false, error: `Airdrop failed: ${airdropError.message}` });
        }
      }

      // ========== Fund Irys Wallet ==========
      console.log('Funding Irys wallet...');
      try {
        const irysUploader = umi.uploader;
        const fundAmount = lamports(1000000); // 0.001 SOL for Irys funding
        await irysUploader.fund(wallet.publicKey, fundAmount);
        console.log('Irys wallet funded');
      } catch (fundError) {
        console.error('Irys funding failed:', fundError.message);
        return res.status(500).json({ success: false, error: `Irys funding failed: ${fundError.message}` });
      }

      // ========== Upload Image ==========
      console.log('Uploading image:', imageFileData.originalname);
      const imageFile = createGenericFile(
        imageFileData.buffer,
        imageFileData.originalname,
        { contentType: imageFileData.mimetype }
      );
      let imageUri;
      try {
        [imageUri] = await umi.uploader.upload([imageFile]);
        console.log('Image uploaded:', imageUri);
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError.message);
        return res.status(500).json({ success: false, error: `Image upload failed: ${uploadError.message}` });
      }

      // ========== Upload Certifications ==========
      const certFiles = await Promise.all(
        certificationFiles.map(async (file, index) => {
          console.log(`Uploading certification ${index + 1}:`, file.originalname);
          const certFile = createGenericFile(
            file.buffer,
            file.originalname,
            { contentType: file.mimetype }
          );
          try {
            const [certUri] = await umi.uploader.upload([certFile]);
            console.log(`Certification ${file.originalname} uploaded:`, certUri);
            return { name: certificationNames[index] || `Certification ${index + 1}`, uri: certUri, type: file.mimetype };
          } catch (certUploadError) {
            console.error(`Certification ${index + 1} upload failed:`, certUploadError.message);
            throw new Error(`Certification ${index + 1} upload failed: ${certUploadError.message}`);
          }
        })
      );

      // ========== Metadata ==========
      const metadata = {
        name,
        symbol: 'PROD',
        description,
        image: imageUri,
        external_url: `https://your-app.com/product/${name.replace(/\s+/g, '-').toLowerCase()}`,
        attributes: [
          { trait_type: 'Origin', value: origin },
          { trait_type: 'Farmer Name', value: farmerName },
          { trait_type: 'Production Date', value: productionDate },
          { trait_type: 'Quantity (kg)', value: quantity },
          { trait_type: 'Price (VNĐ)', value: price },
          ...parsedTimeline.map((t, i) => ({
            trait_type: `Timeline Step ${i + 1}: ${t.title}`,
            value: `${t.desc} | Location: ${t.location} | Date: ${t.date} | Responsible: ${t.responsible}${t.details ? ` | Details: ${t.details}` : ''}`,
          })),
        ],
        properties: {
          files: [
            { uri: imageUri, type: imageFileData.mimetype },
            ...certFiles.map((c) => ({ uri: c.uri, type: c.type })),
          ],
          category: 'image',
        },
      };

      console.log('Uploading metadata...');
      let metadataUri;
      try {
        metadataUri = await umi.uploader.uploadJson(metadata);
        console.log('Metadata uploaded:', metadataUri);
      } catch (metadataUploadError) {
        console.error('Metadata upload failed:', metadataUploadError.message);
        return res.status(500).json({ success: false, error: `Metadata upload failed: ${metadataUploadError.message}` });
      }

      // ========== Mint NFT ==========
      console.log('Creating NFT...');
      const mint = generateSigner(umi);
      let tx;
      try {
        tx = await createV1(umi, {
          mint,
          name,
          uri: metadataUri,
          sellerFeeBasisPoints: 500,
          isMutable: true,
        }).sendAndConfirm(umi, { confirm: { commitment: 'confirmed' } });
      } catch (mintError) {
        console.error('NFT minting failed:', mintError.message);
        return res.status(500).json({ success: false, error: `NFT minting failed: ${mintError.message}` });
      }

      const signature = base58.deserialize(tx.signature)[0];
      console.log('NFT minted successfully:', signature);

      res.json({
        success: true,
        signature,
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        mintAddress: mint.publicKey.toString(),
        metadataUri,
      });
    } catch (error) {
      console.error('Minting error:', error);
      res.status(500).json({ success: false, error: error.message || 'Minting failed' });
    }
  }
);

// ================== START SERVER ==================
app.listen(5000, () => console.log('✅ Server running on port 5000'));