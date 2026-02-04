#!/bin/bash

# Deploy Advanced Product NFT Contract

echo "🚀 Deploying Advanced Product NFT Contract..."

cd "$(dirname "$0")"

# Build contract
echo "📦 Building contract..."
sui move build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# Publish contract
echo "🌐 Publishing to Sui testnet..."
PUBLISH_OUTPUT=$(sui client publish --gas-budget 100000000 --json)

if [ $? -ne 0 ]; then
    echo "❌ Publish failed!"
    exit 1
fi

echo "✅ Contract published!"

# Parse output
PACKAGE_ID=$(echo $PUBLISH_OUTPUT | jq -r '.effects.created[] | select(.owner == "Immutable") | .reference.objectId')
PUBLISHER_ID=$(echo $PUBLISH_OUTPUT | jq -r '.effects.created[] | select(.owner.AddressOwner) | select(.objectType | contains("Publisher")) | .reference.objectId')
ADMIN_CAP_ID=$(echo $PUBLISH_OUTPUT | jq -r '.effects.created[] | select(.owner.AddressOwner) | select(.objectType | contains("AdminCap")) | .reference.objectId')
REGISTRY_ID=$(echo $PUBLISH_OUTPUT | jq -r '.effects.created[] | select(.owner == "Shared") | select(.objectType | contains("NFTRegistry")) | .reference.objectId')
ESCROW_VAULT_ID=$(echo $PUBLISH_OUTPUT | jq -r '.effects.created[] | select(.owner == "Shared") | select(.objectType | contains("EscrowVault")) | .reference.objectId')

# Save IDs to file
cat > deployment_ids.txt << EOF
PACKAGE_ID=$PACKAGE_ID
PUBLISHER_ID=$PUBLISHER_ID
ADMIN_CAP_ID=$ADMIN_CAP_ID
REGISTRY_ID=$REGISTRY_ID
ESCROW_VAULT_ID=$ESCROW_VAULT_ID
EOF

echo ""
echo "📝 Deployment IDs saved to deployment_ids.txt"
echo ""
echo "📋 Important IDs:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Package ID:        $PACKAGE_ID"
echo "Publisher ID:      $PUBLISHER_ID"
echo "Admin Cap ID:      $ADMIN_CAP_ID"
echo "Registry ID:       $REGISTRY_ID"
echo "Escrow Vault ID:   $ESCROW_VAULT_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Update PACKAGE_ID in frontend code"
echo "2. Update REGISTRY_ID and ESCROW_VAULT_ID"
echo "3. Save ADMIN_CAP_ID securely for admin operations"
