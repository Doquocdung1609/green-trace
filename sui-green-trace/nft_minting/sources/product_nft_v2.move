#[allow(duplicate_alias)]
module nft_minting::product_nft_v2 {
    use sui::object;
    use sui::transfer;
    use sui::tx_context::{Self as tx_context, TxContext};
    use std::string::{Self, String};
    use sui::event;

    /// NFT đại diện cho sản phẩm nông nghiệp với đầy đủ thông tin
    public struct ProductNFT has key, store {
        id: UID,
        // Thông tin cơ bản
        name: String,
        description: String,
        image_url: String,
        origin: String,
        farmer_name: String,
        production_date: String,
        age: u64,
        price: u64,
        quantity: u64,
        roi: u64,
        growth_rate: u64,
        
        // Dữ liệu IoT
        iot_status: String,
        iot_height: u64,
        iot_growth_per_month: u64,
        iot_humidity: u64,
        iot_temperature: u64,
        iot_ph: u64,
        iot_last_updated: String,
        
        // URIs cho dữ liệu ngoại vi (IPFS)
        certifications_uri: String,
        timeline_uri: String,
        
        blockchain_tx_id: String,
    }

    /// Event khi mint NFT thành công
    public struct NFTMinted has copy, drop {
        nft_id: address,
        name: String,
        owner: address,
        image_url: String,
    }

    /// Mint NFT mới cho sản phẩm với đầy đủ thông tin
    public entry fun mint_product_nft(
        // Thông tin cơ bản
        name: vector<u8>,
        description: vector<u8>,
        image_url: vector<u8>,
        origin: vector<u8>,
        farmer_name: vector<u8>,
        production_date: vector<u8>,
        age: u64,
        price: u64,
        quantity: u64,
        roi: u64,
        growth_rate: u64,
        
        // Dữ liệu IoT
        iot_status: vector<u8>,
        iot_height: u64,
        iot_growth_per_month: u64,
        iot_humidity: u64,
        iot_temperature: u64,
        iot_ph: u64,
        iot_last_updated: vector<u8>,
        
        // URIs
        certifications_uri: vector<u8>,
        timeline_uri: vector<u8>,
        blockchain_tx_id: vector<u8>,
        
        recipient: address,
        ctx: &mut TxContext
    ) {
        let nft = ProductNFT {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            image_url: string::utf8(image_url),
            origin: string::utf8(origin),
            farmer_name: string::utf8(farmer_name),
            production_date: string::utf8(production_date),
            age,
            price,
            quantity,
            roi,
            growth_rate,
            iot_status: string::utf8(iot_status),
            iot_height,
            iot_growth_per_month,
            iot_humidity,
            iot_temperature,
            iot_ph,
            iot_last_updated: string::utf8(iot_last_updated),
            certifications_uri: string::utf8(certifications_uri),
            timeline_uri: string::utf8(timeline_uri),
            blockchain_tx_id: string::utf8(blockchain_tx_id),
        };

        let nft_id = object::uid_to_address(&nft.id);

        event::emit(NFTMinted {
            nft_id,
            name: nft.name,
            owner: recipient,
            image_url: nft.image_url,
        });

        transfer::public_transfer(nft, recipient);
    }

    /// Xóa NFT
    public entry fun burn(nft: ProductNFT) {
        let ProductNFT { 
            id, 
            name: _, 
            description: _, 
            image_url: _, 
            origin: _, 
            farmer_name: _, 
            production_date: _, 
            age: _, 
            price: _, 
            quantity: _, 
            roi: _, 
            growth_rate: _,
            iot_status: _,
            iot_height: _,
            iot_growth_per_month: _,
            iot_humidity: _,
            iot_temperature: _,
            iot_ph: _,
            iot_last_updated: _,
            certifications_uri: _,
            timeline_uri: _,
            blockchain_tx_id: _ 
        } = nft;
        object::delete(id);
    }

    // Getter functions
    public fun get_name(nft: &ProductNFT): String {
        nft.name
    }

    public fun get_description(nft: &ProductNFT): String {
        nft.description
    }

    public fun get_origin(nft: &ProductNFT): String {
        nft.origin
    }

    public fun get_age(nft: &ProductNFT): u64 {
        nft.age
    }

    public fun get_image_url(nft: &ProductNFT): String {
        nft.image_url
    }

    public fun get_farmer_name(nft: &ProductNFT): String {
        nft.farmer_name
    }

    public fun get_price(nft: &ProductNFT): u64 {
        nft.price
    }

    public fun get_certifications_uri(nft: &ProductNFT): String {
        nft.certifications_uri
    }

    public fun get_timeline_uri(nft: &ProductNFT): String {
        nft.timeline_uri
    }

    public fun get_iot_data(nft: &ProductNFT): (String, u64, u64, u64, u64, u64, String) {
        (
            nft.iot_status,
            nft.iot_height,
            nft.iot_growth_per_month,
            nft.iot_humidity,
            nft.iot_temperature,
            nft.iot_ph,
            nft.iot_last_updated
        )
    }

    // ========== UPDATE FUNCTIONS ==========
    
    /// Event khi cập nhật NFT
    public struct NFTUpdated has copy, drop {
        nft_id: address,
        field_updated: String,
        updated_by: address,
    }

    /// Cập nhật IoT data
    public entry fun update_iot_data(
        nft: &mut ProductNFT,
        iot_status: vector<u8>,
        iot_height: u64,
        iot_growth_per_month: u64,
        iot_humidity: u64,
        iot_temperature: u64,
        iot_ph: u64,
        iot_last_updated: vector<u8>,
        ctx: &mut TxContext
    ) {
        nft.iot_status = string::utf8(iot_status);
        nft.iot_height = iot_height;
        nft.iot_growth_per_month = iot_growth_per_month;
        nft.iot_humidity = iot_humidity;
        nft.iot_temperature = iot_temperature;
        nft.iot_ph = iot_ph;
        nft.iot_last_updated = string::utf8(iot_last_updated);

        event::emit(NFTUpdated {
            nft_id: object::uid_to_address(&nft.id),
            field_updated: string::utf8(b"iot_data"),
            updated_by: tx_context::sender(ctx),
        });
    }

    /// Cập nhật timeline (thêm URI mới)
    public entry fun update_timeline(
        nft: &mut ProductNFT,
        new_timeline_uri: vector<u8>,
        ctx: &mut TxContext
    ) {
        nft.timeline_uri = string::utf8(new_timeline_uri);

        event::emit(NFTUpdated {
            nft_id: object::uid_to_address(&nft.id),
            field_updated: string::utf8(b"timeline"),
            updated_by: tx_context::sender(ctx),
        });
    }

    /// Cập nhật ROI và growth rate
    public entry fun update_financial_data(
        nft: &mut ProductNFT,
        new_roi: u64,
        new_growth_rate: u64,
        new_price: u64,
        ctx: &mut TxContext
    ) {
        nft.roi = new_roi;
        nft.growth_rate = new_growth_rate;
        nft.price = new_price;

        event::emit(NFTUpdated {
            nft_id: object::uid_to_address(&nft.id),
            field_updated: string::utf8(b"financial_data"),
            updated_by: tx_context::sender(ctx),
        });
    }

    /// Cập nhật certifications
    public entry fun update_certifications(
        nft: &mut ProductNFT,
        new_certifications_uri: vector<u8>,
        ctx: &mut TxContext
    ) {
        nft.certifications_uri = string::utf8(new_certifications_uri);

        event::emit(NFTUpdated {
            nft_id: object::uid_to_address(&nft.id),
            field_updated: string::utf8(b"certifications"),
            updated_by: tx_context::sender(ctx),
        });
    }

    /// Cập nhật tuổi
    public entry fun update_age(
        nft: &mut ProductNFT,
        new_age: u64,
        ctx: &mut TxContext
    ) {
        nft.age = new_age;

        event::emit(NFTUpdated {
            nft_id: object::uid_to_address(&nft.id),
            field_updated: string::utf8(b"age"),
            updated_by: tx_context::sender(ctx),
        });
    }

    /// Cập nhật mô tả
    public entry fun update_description(
        nft: &mut ProductNFT,
        new_description: vector<u8>,
        ctx: &mut TxContext
    ) {
        nft.description = string::utf8(new_description);

        event::emit(NFTUpdated {
            nft_id: object::uid_to_address(&nft.id),
            field_updated: string::utf8(b"description"),
            updated_by: tx_context::sender(ctx),
        });
    }
}
