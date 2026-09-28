use anchor_lang::prelude::*;

declare_id!("8TaGQypY5obcUJqT2GK5vEB1idaDFuqbEUwFrhdJDTg9");

#[program]
pub mod green_trace_registry {
    use super::*;

    pub fn initialize_registry(ctx: Context<InitializeRegistry>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority = ctx.accounts.authority.key();
        registry.asset_count = 0;
        registry.bump = ctx.bumps.registry;
        Ok(())
    }

    pub fn register_asset(ctx: Context<RegisterAsset>, asset_id: [u8; 32]) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        asset.asset_id = asset_id;
        asset.authority = ctx.accounts.authority.key();
        asset.lifecycle_stage = LifecycleStage::Registered;
        asset.created_at = Clock::get()?.unix_timestamp;
        asset.updated_at = asset.created_at;
        asset.bump = ctx.bumps.asset;
        ctx.accounts.registry.asset_count = ctx.accounts.registry.asset_count.checked_add(1).ok_or(RegistryError::Overflow)?;
        Ok(())
    }

    pub fn record_evidence_hash(ctx: Context<RecordEvidenceHash>, evidence_hash: [u8; 32]) -> Result<()> {
        let evidence = &mut ctx.accounts.evidence;
        evidence.asset = ctx.accounts.asset.key();
        evidence.evidence_hash = evidence_hash;
        evidence.submitter = ctx.accounts.submitter.key();
        evidence.recorded_at = Clock::get()?.unix_timestamp;
        evidence.bump = ctx.bumps.evidence;
        Ok(())
    }

    pub fn create_attestation(ctx: Context<CreateAttestation>, evidence_hash: [u8; 32], scope: VerificationScope, decision: VerificationDecision, expires_at: i64) -> Result<()> {
        require!(decision != VerificationDecision::Pending, RegistryError::PendingDecisionNotAllowed);
        let attestation = &mut ctx.accounts.attestation;
        attestation.evidence_hash = evidence_hash;
        attestation.verifier = ctx.accounts.verifier.key();
        attestation.scope = scope;
        attestation.decision = decision;
        attestation.created_at = Clock::get()?.unix_timestamp;
        attestation.expires_at = expires_at;
        attestation.revoked_at = 0;
        attestation.bump = ctx.bumps.attestation;
        Ok(())
    }

    pub fn record_lifecycle_event(ctx: Context<RecordLifecycleEvent>, next_stage: LifecycleStage, event_hash: [u8; 32]) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        require_keys_eq!(asset.authority, ctx.accounts.authority.key(), RegistryError::Unauthorized);
        require!(valid_transition(asset.lifecycle_stage, next_stage), RegistryError::InvalidLifecycleTransition);
        asset.lifecycle_stage = next_stage;
        asset.last_event_hash = event_hash;
        asset.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn update_passport_root(ctx: Context<UpdatePassportRoot>, passport_root: [u8; 32], version: u32) -> Result<()> {
        let passport = &mut ctx.accounts.passport;
        if passport.version > 0 { require!(version > passport.version, RegistryError::InvalidPassportVersion); }
        passport.asset = ctx.accounts.asset.key();
        passport.root = passport_root;
        passport.version = version;
        passport.authority = ctx.accounts.authority.key();
        passport.updated_at = Clock::get()?.unix_timestamp;
        passport.bump = ctx.bumps.passport;
        Ok(())
    }

    pub fn revoke_attestation(ctx: Context<RevokeAttestation>) -> Result<()> {
        require_keys_eq!(ctx.accounts.attestation.verifier, ctx.accounts.verifier.key(), RegistryError::Unauthorized);
        require!(ctx.accounts.attestation.revoked_at == 0, RegistryError::AlreadyRevoked);
        ctx.accounts.attestation.revoked_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

fn valid_transition(from: LifecycleStage, to: LifecycleStage) -> bool {
    matches!((from, to),
        (LifecycleStage::Registered, LifecycleStage::PlantedVerified) |
        (LifecycleStage::Registered, LifecycleStage::Archived) |
        (LifecycleStage::PlantedVerified, LifecycleStage::Growing) |
        (LifecycleStage::Growing, LifecycleStage::Inspected) |
        (LifecycleStage::Inspected, LifecycleStage::Growing) |
        (LifecycleStage::Inspected, LifecycleStage::Mature) |
        (LifecycleStage::Mature, LifecycleStage::HarvestReady) |
        (LifecycleStage::HarvestReady, LifecycleStage::Harvested) |
        (LifecycleStage::Harvested, LifecycleStage::Transferred) |
        (LifecycleStage::Transferred, LifecycleStage::Archived)
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lifecycle_rules_allow_progress_and_reject_skips() {
        assert!(valid_transition(LifecycleStage::Registered, LifecycleStage::PlantedVerified));
        assert!(valid_transition(LifecycleStage::Inspected, LifecycleStage::Growing));
        assert!(!valid_transition(LifecycleStage::Registered, LifecycleStage::Harvested));
        assert!(!valid_transition(LifecycleStage::Archived, LifecycleStage::Growing));
    }
}

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(init, payer = authority, space = 8 + Registry::INIT_SPACE, seeds = [b"registry"], bump)]
    pub registry: Account<'info, Registry>,
    #[account(mut)] pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(asset_id: [u8; 32])]
pub struct RegisterAsset<'info> {
    #[account(mut, seeds = [b"registry"], bump = registry.bump, has_one = authority)] pub registry: Account<'info, Registry>,
    #[account(init, payer = authority, space = 8 + AssetRecord::INIT_SPACE, seeds = [b"asset", asset_id.as_ref()], bump)] pub asset: Account<'info, AssetRecord>,
    #[account(mut)] pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(evidence_hash: [u8; 32])]
pub struct RecordEvidenceHash<'info> {
    pub asset: Account<'info, AssetRecord>,
    #[account(init, payer = submitter, space = 8 + EvidenceRecord::INIT_SPACE, seeds = [b"evidence", asset.key().as_ref(), evidence_hash.as_ref()], bump)] pub evidence: Account<'info, EvidenceRecord>,
    #[account(mut)] pub submitter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(evidence_hash: [u8; 32])]
pub struct CreateAttestation<'info> {
    #[account(init, payer = verifier, space = 8 + AttestationRecord::INIT_SPACE, seeds = [b"attestation", evidence_hash.as_ref(), verifier.key().as_ref()], bump)] pub attestation: Account<'info, AttestationRecord>,
    #[account(mut)] pub verifier: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordLifecycleEvent<'info> {
    #[account(mut)] pub asset: Account<'info, AssetRecord>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdatePassportRoot<'info> {
    pub asset: Account<'info, AssetRecord>,
    #[account(init_if_needed, payer = authority, space = 8 + PassportRecord::INIT_SPACE, seeds = [b"passport", asset.key().as_ref()], bump)] pub passport: Account<'info, PassportRecord>,
    #[account(mut, address = asset.authority)] pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeAttestation<'info> {
    #[account(mut)] pub attestation: Account<'info, AttestationRecord>,
    pub verifier: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Registry { pub authority: Pubkey, pub asset_count: u64, pub bump: u8 }

#[account]
#[derive(InitSpace)]
pub struct AssetRecord { pub asset_id: [u8;32], pub authority: Pubkey, pub lifecycle_stage: LifecycleStage, pub last_event_hash: [u8;32], pub created_at: i64, pub updated_at: i64, pub bump: u8 }

#[account]
#[derive(InitSpace)]
pub struct EvidenceRecord { pub asset: Pubkey, pub evidence_hash: [u8;32], pub submitter: Pubkey, pub recorded_at: i64, pub bump: u8 }

#[account]
#[derive(InitSpace)]
pub struct AttestationRecord { pub evidence_hash: [u8;32], pub verifier: Pubkey, pub scope: VerificationScope, pub decision: VerificationDecision, pub created_at: i64, pub expires_at: i64, pub revoked_at: i64, pub bump: u8 }

#[account]
#[derive(InitSpace)]
pub struct PassportRecord { pub asset: Pubkey, pub root: [u8;32], pub version: u32, pub authority: Pubkey, pub updated_at: i64, pub bump: u8 }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, PartialEq, Eq)]
pub enum VerificationScope { Existence, Location, AgeOrLifecycle, CertificateValidity, LabResult, IotSource, Other }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, PartialEq, Eq)]
pub enum VerificationDecision { Pending, Approved, Rejected, Expired }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, PartialEq, Eq)]
pub enum LifecycleStage { Registered, PlantedVerified, Growing, Inspected, Mature, HarvestReady, Harvested, Transferred, Archived }

#[error_code]
pub enum RegistryError {
    #[msg("Signer is not authorized for this record")] Unauthorized,
    #[msg("Lifecycle transition is not logically allowed")] InvalidLifecycleTransition,
    #[msg("Passport version must increase")] InvalidPassportVersion,
    #[msg("Pending is not a valid signed attestation decision")] PendingDecisionNotAllowed,
    #[msg("Attestation is already revoked")] AlreadyRevoked,
    #[msg("Counter overflow")] Overflow,
}
