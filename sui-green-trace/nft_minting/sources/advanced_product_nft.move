/// Advanced Product NFT with Kiosk, Publisher, Escrow, Evolution, and Maintenance
#[allow(duplicate_alias)]
module nft_minting::advanced_product_nft {
    use sui::object::UID;
    use sui::transfer;
    use sui::tx_context::TxContext;
    use std::string::{Self as string, String};
    use sui::event;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use sui::package;
    use sui::display;
    use sui::table::{Self, Table};
    use sui::balance::{Self, Balance};

    // ========== Error Codes ==========
    const EInvalidPayment: u64 = 1;
    #[allow(unused_const)]
    const ENotOwner: u64 = 2;
    const EInvalidStatus: u64 = 3;
    #[allow(unused_const)]
    const EMaintenanceDue: u64 = 4;
    const ENotInEscrow: u64 = 5;
    #[allow(unused_const)]
    const EAlreadyRedeemed: u64 = 6;

    // ========== Constants ==========
    const STATUS_ACTIVE: u8 = 0;
    const STATUS_IN_ESCROW: u8 = 1;
    #[allow(unused_const)]
    const STATUS_SHIPPED: u8 = 2;
    #[allow(unused_const)]
    const STATUS_REDEEMED: u8 = 3;
    #[allow(unused_const)]
    const STATUS_BURNED: u8 = 4;

    #[allow(unused_const)]
    const TRANSFER_TYPE_DIRECT: u8 = 0;      // Chuyển trực tiếp, không cần maintenance
    const TRANSFER_TYPE_WITH_MAINTENANCE: u8 = 1;  // Chuyển kèm maintenance fee

    // ========== Structs ==========

    /// One-Time-Witness để tạo Publisher
    public struct ADVANCED_PRODUCT_NFT has drop {}

    /// NFT đại diện cho sản phẩm nông nghiệp với lifecycle tracking
    public struct ProductNFT has key, store {
        id: UID,
        // Thông tin cơ bản
        name: String,
        description: String,
        image_url: String,
        origin: String,
        farmer: address,
        farmer_name: String,
        production_date: String,
        
        // Thông số kinh tế
        age: u64,
        base_price: u64,
        roi: u64,
        growth_rate: u64,
        
        // Maintenance system
        monthly_maintenance_fee: u64,
        last_maintenance_paid: u64, // timestamp
        maintenance_due_date: u64,   // timestamp
        
        // Evolution & Metadata
        evolution_stage: u64,        // 0: seedling, 1: growing, 2: mature, 3: harvest-ready
        total_maintenance_paid: u64,
        metadata_uri: String,        // IPFS URI for dynamic metadata
        
        // Status tracking
        status: u8,                  // Active, InEscrow, Shipped, Redeemed, Burned
        transfer_type: u8,           // Direct or WithMaintenance
        
        // IoT Data
        iot_status: String,
        iot_height: u64,
        iot_humidity: u64,
        iot_temperature: u64,
        
        // URIs
        certifications_uri: String,
        timeline_uri: String,
    }

    /// Maintenance history record
    public struct MaintenanceRecord has store, copy, drop {
        timestamp: u64,
        amount: u64,
        paid_by: address,
    }

    /// Registry để track tất cả NFTs và maintenance history
    public struct NFTRegistry has key {
        id: UID,
        maintenance_history: Table<address, vector<MaintenanceRecord>>,
        total_nfts_minted: u64,
    }

    /// Escrow vault để hold NFT trước khi redeem
    public struct EscrowVault has key {
        id: UID,
        locked_nfts: Table<address, ProductNFT>,
        escrow_balance: Balance<SUI>,
    }

    /// Admin capability
    public struct AdminCap has key, store {
        id: UID,
    }

    // ========== Events ==========

    public struct NFTMinted has copy, drop {
        nft_id: address,
        name: String,
        owner: address,
        transfer_type: u8,
    }

    public struct MaintenancePaid has copy, drop {
        nft_id: address,
        amount: u64,
        paid_by: address,
        timestamp: u64,
    }

    public struct NFTEvolved has copy, drop {
        nft_id: address,
        old_stage: u64,
        new_stage: u64,
    }

    public struct NFTLocked has copy, drop {
        nft_id: address,
        owner: address,
    }

    public struct NFTRedeemed has copy, drop {
        nft_id: address,
        owner: address,
    }

    public struct NFTBurned has copy, drop {
        nft_id: address,
    }

    // ========== Init Function ==========

    fun init(otw: ADVANCED_PRODUCT_NFT, ctx: &mut TxContext) {
        // Tạo Publisher
        let publisher = package::claim(otw, ctx);
        
        // Tạo Display cho NFT
        let keys = vector[
            string::utf8(b"name"),
            string::utf8(b"description"),
            string::utf8(b"image_url"),
            string::utf8(b"status"),
            string::utf8(b"evolution_stage"),
        ];

        let values = vector[
            string::utf8(b"{name}"),
            string::utf8(b"{description}"),
            string::utf8(b"{image_url}"),
            string::utf8(b"{status}"),
            string::utf8(b"{evolution_stage}"),
        ];

        let mut display = display::new_with_fields<ProductNFT>(
            &publisher, keys, values, ctx
        );
        display::update_version(&mut display);
        transfer::public_transfer(display, tx_context::sender(ctx));
        transfer::public_transfer(publisher, tx_context::sender(ctx));

        // Tạo NFT Registry
        transfer::share_object(NFTRegistry {
            id: object::new(ctx),
            maintenance_history: table::new(ctx),
            total_nfts_minted: 0,
        });

        // Tạo Escrow Vault
        transfer::share_object(EscrowVault {
            id: object::new(ctx),
            locked_nfts: table::new(ctx),
            escrow_balance: balance::zero(),
        });

        // Tạo Admin Cap
        transfer::transfer(AdminCap {
            id: object::new(ctx),
        }, tx_context::sender(ctx));
    }

    // ========== Mint Functions ==========

    /// Mint NFT với 2 options: Direct transfer hoặc With maintenance
    public entry fun mint_product_nft(
        registry: &mut NFTRegistry,
        // Basic info
        name: vector<u8>,
        description: vector<u8>,
        image_url: vector<u8>,
        origin: vector<u8>,
        farmer_name: vector<u8>,
        production_date: vector<u8>,
        
        // Economic params
        age: u64,
        base_price: u64,
        roi: u64,
        growth_rate: u64,
        monthly_maintenance_fee: u64,
        
        // Transfer type
        transfer_type: u8, // 0: Direct, 1: WithMaintenance
        
        // IoT data
        iot_status: vector<u8>,
        iot_height: u64,
        iot_humidity: u64,
        iot_temperature: u64,
        
        // URIs
        certifications_uri: vector<u8>,
        timeline_uri: vector<u8>,
        metadata_uri: vector<u8>,
        
        recipient: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);

        let nft = ProductNFT {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            image_url: string::utf8(image_url),
            origin: string::utf8(origin),
            farmer: sender,
            farmer_name: string::utf8(farmer_name),
            production_date: string::utf8(production_date),
            age,
            base_price,
            roi,
            growth_rate,
            monthly_maintenance_fee,
            last_maintenance_paid: current_time,
            maintenance_due_date: current_time + 2592000000, // 30 days in ms
            evolution_stage: 0,
            total_maintenance_paid: 0,
            metadata_uri: string::utf8(metadata_uri),
            status: STATUS_ACTIVE,
            transfer_type,
            iot_status: string::utf8(iot_status),
            iot_height,
            iot_humidity,
            iot_temperature,
            certifications_uri: string::utf8(certifications_uri),
            timeline_uri: string::utf8(timeline_uri),
        };

        let nft_id = object::uid_to_address(&nft.id);

        // Initialize maintenance history
        table::add(&mut registry.maintenance_history, nft_id, vector::empty());
        registry.total_nfts_minted = registry.total_nfts_minted + 1;

        event::emit(NFTMinted {
            nft_id,
            name: nft.name,
            owner: recipient,
            transfer_type,
        });

        transfer::public_transfer(nft, recipient);
    }

    // ========== Maintenance Functions ==========

    /// Pay maintenance fee cho NFT
    public entry fun pay_maintenance(
        registry: &mut NFTRegistry,
        nft: &mut ProductNFT,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(nft.transfer_type == TRANSFER_TYPE_WITH_MAINTENANCE, EInvalidStatus);
        
        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= nft.monthly_maintenance_fee, EInvalidPayment);

        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        let nft_id = object::uid_to_address(&nft.id);

        // Update NFT
        nft.last_maintenance_paid = current_time;
        nft.maintenance_due_date = current_time + 2592000000; // +30 days
        nft.total_maintenance_paid = nft.total_maintenance_paid + payment_amount;

        // Record maintenance history
        let record = MaintenanceRecord {
            timestamp: current_time,
            amount: payment_amount,
            paid_by: sender,
        };

        if (!table::contains(&registry.maintenance_history, nft_id)) {
            table::add(&mut registry.maintenance_history, nft_id, vector::empty());
        };

        let history = table::borrow_mut(&mut registry.maintenance_history, nft_id);
        vector::push_back(history, record);

        // Check for evolution
        check_and_evolve(nft, current_time);

        event::emit(MaintenancePaid {
            nft_id,
            amount: payment_amount,
            paid_by: sender,
            timestamp: current_time,
        });

        // Transfer payment to farmer
        transfer::public_transfer(payment, nft.farmer);
    }

    /// Check và evolve NFT dựa trên total maintenance paid
    fun check_and_evolve(nft: &mut ProductNFT, _current_time: u64) {
        let old_stage = nft.evolution_stage;
        let mut new_stage = old_stage;

        // Evolution logic based on maintenance payments
        if (nft.total_maintenance_paid >= 10000000000 && old_stage < 3) { // 10 SUI
            new_stage = 3; // Harvest ready
        } else if (nft.total_maintenance_paid >= 5000000000 && old_stage < 2) { // 5 SUI
            new_stage = 2; // Mature
        } else if (nft.total_maintenance_paid >= 2000000000 && old_stage < 1) { // 2 SUI
            new_stage = 1; // Growing
        };

        if (new_stage != old_stage) {
            nft.evolution_stage = new_stage;
            event::emit(NFTEvolved {
                nft_id: object::uid_to_address(&nft.id),
                old_stage,
                new_stage,
            });
        };
    }

    // ========== Escrow & Redeem Functions ==========

    /// Lock NFT vào escrow để redeem sản phẩm vật lý
    public entry fun lock_in_escrow(
        vault: &mut EscrowVault,
        nft: ProductNFT,
        ctx: &mut TxContext
    ) {
        assert!(nft.status == STATUS_ACTIVE, EInvalidStatus);
        
        let sender = tx_context::sender(ctx);
        let nft_id = object::uid_to_address(&nft.id);

        // Update status
        let mut nft_mut = nft;
        nft_mut.status = STATUS_IN_ESCROW;

        event::emit(NFTLocked {
            nft_id,
            owner: sender,
        });

        table::add(&mut vault.locked_nfts, nft_id, nft_mut);
    }

    /// Admin confirm shipped và burn NFT
    public entry fun confirm_shipped_and_burn(
        _admin: &AdminCap,
        vault: &mut EscrowVault,
        nft_id: address,
        _ctx: &mut TxContext
    ) {
        assert!(table::contains(&vault.locked_nfts, nft_id), ENotInEscrow);
        
        let nft = table::remove(&mut vault.locked_nfts, nft_id);
        assert!(nft.status == STATUS_IN_ESCROW, EInvalidStatus);

        event::emit(NFTRedeemed {
            nft_id,
            owner: nft.farmer,
        });

        event::emit(NFTBurned {
            nft_id,
        });

        // Burn NFT
        let ProductNFT { 
            id,
            name: _,
            description: _,
            image_url: _,
            origin: _,
            farmer: _,
            farmer_name: _,
            production_date: _,
            age: _,
            base_price: _,
            roi: _,
            growth_rate: _,
            monthly_maintenance_fee: _,
            last_maintenance_paid: _,
            maintenance_due_date: _,
            evolution_stage: _,
            total_maintenance_paid: _,
            metadata_uri: _,
            status: _,
            transfer_type: _,
            iot_status: _,
            iot_height: _,
            iot_humidity: _,
            iot_temperature: _,
            certifications_uri: _,
            timeline_uri: _,
        } = nft;
        
        object::delete(id);
    }

    // ========== Resell Market Functions ==========

    /// Transfer NFT (với hoặc không maintenance)
    public entry fun transfer_nft(
        nft: ProductNFT,
        recipient: address,
        _ctx: &mut TxContext
    ) {
        transfer::public_transfer(nft, recipient);
    }

    /// Sell NFT on secondary market
    public entry fun sell_nft(
        nft: ProductNFT,
        payment: Coin<SUI>,
        price: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= price, EInvalidPayment);

        let sender = tx_context::sender(ctx);
        
        // Transfer NFT to buyer
        transfer::public_transfer(nft, recipient);
        
        // Transfer payment to seller
        transfer::public_transfer(payment, sender);
    }

    // ========== View Functions ==========

    public fun get_status(nft: &ProductNFT): u8 {
        nft.status
    }

    public fun get_evolution_stage(nft: &ProductNFT): u64 {
        nft.evolution_stage
    }

    public fun get_maintenance_fee(nft: &ProductNFT): u64 {
        nft.monthly_maintenance_fee
    }

    public fun is_maintenance_due(nft: &ProductNFT, clock: &Clock): bool {
        clock::timestamp_ms(clock) > nft.maintenance_due_date
    }

    public fun get_transfer_type(nft: &ProductNFT): u8 {
        nft.transfer_type
    }

    public fun get_total_maintenance_paid(nft: &ProductNFT): u64 {
        nft.total_maintenance_paid
    }

    public fun get_name(nft: &ProductNFT): String {
        nft.name
    }

    public fun get_farmer(nft: &ProductNFT): address {
        nft.farmer
    }

    // ========== Admin Functions ==========

    /// Update metadata URI for NFT evolution
    public entry fun update_metadata_uri(
        _admin: &AdminCap,
        nft: &mut ProductNFT,
        new_uri: vector<u8>,
    ) {
        nft.metadata_uri = string::utf8(new_uri);
    }

    /// Emergency withdraw from escrow
    public entry fun emergency_withdraw(
        _admin: &AdminCap,
        vault: &mut EscrowVault,
        nft_id: address,
        recipient: address,
    ) {
        assert!(table::contains(&vault.locked_nfts, nft_id), ENotInEscrow);
        let nft = table::remove(&mut vault.locked_nfts, nft_id);
        transfer::public_transfer(nft, recipient);
    }
}
