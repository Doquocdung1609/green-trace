import * as anchor from '@coral-xyz/anchor';
import { expect } from 'chai';
import { createHash } from 'node:crypto';

describe('green_trace_registry', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.GreenTraceRegistry;
  const hash = (value: string) =>
    [...createHash('sha256').update(value).digest()] as number[];
  const runId = `${Date.now()}-${Math.random()}`;
  const assetId = hash(`GT-NL-${runId}`);
  const evidenceHash = hash(`evidence-${runId}`);
  const [registry] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('registry')],
    program.programId,
  );
  const [asset] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('asset'), Buffer.from(assetId)],
    program.programId,
  );
  const [attestation] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('attestation'), Buffer.from(evidenceHash), provider.wallet.publicKey.toBuffer()],
    program.programId,
  );

  it('registers an asset', async () => {
    try {
      await program.methods.initializeRegistry().accounts({ registry, authority: provider.wallet.publicKey }).rpc();
    } catch {
      // A shared local validator can already have the singleton registry.
    }
    await program.methods.registerAsset(assetId).accounts({ registry, asset, authority: provider.wallet.publicKey }).rpc();
    const record = await program.account.assetRecord.fetch(asset);
    expect(record.authority.toBase58()).to.equal(provider.wallet.publicKey.toBase58());
    expect(record.lifecycleStage).to.have.property('registered');
  });

  it('rejects an unauthorized signer', async () => {
    const unauthorized = anchor.web3.Keypair.generate();
    try {
      await program.methods.recordLifecycleEvent({ growing: {} }, hash(`unauthorized-${runId}`)).accounts({ asset, authority: unauthorized.publicKey }).signers([unauthorized]).rpc();
      expect.fail('Unauthorized lifecycle update should fail');
    } catch (error) {
      expect(String(error)).to.match(/authorized|Unauthorized|signature/i);
    }
  });

  it('rejects an invalid lifecycle transition', async () => {
    try {
      await program.methods.recordLifecycleEvent({ harvested: {} }, hash(`invalid-${runId}`)).accounts({ asset, authority: provider.wallet.publicKey }).rpc();
      expect.fail('REGISTERED to HARVESTED should fail');
    } catch (error) {
      expect(String(error)).to.match(/transition|6001/i);
    }
  });

  it('creates and revokes an attestation', async () => {
    await program.methods.createAttestation(evidenceHash, { existence: {} }, { approved: {} }, new anchor.BN(Math.floor(Date.now() / 1000) + 86_400)).accounts({ attestation, verifier: provider.wallet.publicKey }).rpc();
    const created = await program.account.attestationRecord.fetch(attestation);
    expect(created.revokedAt.toNumber()).to.equal(0);
    await program.methods.revokeAttestation().accounts({ attestation, verifier: provider.wallet.publicKey }).rpc();
    const revoked = await program.account.attestationRecord.fetch(attestation);
    expect(revoked.revokedAt.toNumber()).to.be.greaterThan(0);
  });
});
