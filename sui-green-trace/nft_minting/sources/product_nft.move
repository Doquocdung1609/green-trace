#[allow(duplicate_alias, unused_use, lint(public_entry))]
module nft_minting::product_nft {
    use sui::object;
    use sui::transfer;
    use sui::tx_context::{Self as tx_context, TxContext};
    use std::string::{Self, String};
    use sui::event;

    /// ProductNFT đại diện cho sản phẩm nông nghiệp
    public struct ProductNFT has key, store {
        id: UID,
        name: String,
        description: String,
        image_url: String,
        origin: String,
        farmer_name: String,
        production_date: String,
        age: u64,
        blockchain_tx_id: String,
    }

    /// Event khi mint NFT thành công
    public struct NFTMinted has copy, drop {
        nft_id: address,
        name: String,
        owner: address,
    }

    /// Mint NFT mới cho sản phẩm
    public entry fun mint_product_nft(
        name: vector<u8>,
        description: vector<u8>,
        image_url: vector<u8>,
        origin: vector<u8>,
        farmer_name: vector<u8>,
        production_date: vector<u8>,
        age: u64,
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
            blockchain_tx_id: string::utf8(blockchain_tx_id),
        };

        let nft_id = object::uid_to_address(&nft.id);
        
        // Emit event
        event::emit(NFTMinted {
            nft_id,
            name: nft.name,
            owner: recipient,
        });

        // Transfer NFT to recipient
        transfer::public_transfer(nft, recipient);
    }

    /// Burn NFT (xóa)
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
            blockchain_tx_id: _ 
        } = nft;
        object::delete(id);
    }

    // Getter functions
    public fun get_name(nft: &ProductNFT): String {
        nft.name
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
}
