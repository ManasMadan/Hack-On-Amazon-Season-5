#!/bin/bash

echo "🚀 Starting blockchain services..."

# Function to check if Hardhat node is running
check_hardhat() {
  curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://localhost:8545 > /dev/null 2>&1
}

# Start Hardhat node in background if not running
if ! check_hardhat; then
  echo "📡 Starting Hardhat node..."
  cd apps/pwdr
  bunx hardhat node --hostname 0.0.0.0 --port 8545 > ../../hardhat.log 2>&1 &
  HARDHAT_PID=$!
  echo $HARDHAT_PID > ../../hardhat.pid
  cd ../..
  
  # Wait for Hardhat to start
  echo "⏳ Waiting for Hardhat node to start..."
  for i in {1..30}; do
    if check_hardhat; then
      echo "✅ Hardhat node is running"
      break
    fi
    sleep 1
  done
  
  if ! check_hardhat; then
    echo "❌ Failed to start Hardhat node"
    exit 1
  fi
else
  echo "✅ Hardhat node is already running"
fi

# Deploy smart contract
echo "📜 Deploying smart contract..."
cd apps/pwdr
CONTRACT_ADDRESS=$(bunx hardhat run scripts/deploy.ts --network localhost | grep "Contract deployed at:" | cut -d' ' -f4)
cd ../..

if [ -n "$CONTRACT_ADDRESS" ]; then
  echo "✅ Contract deployed at: $CONTRACT_ADDRESS"
  
  # Update .env file with contract address
  if grep -q "DISPUTE_RESOLVER_ADDRESS=" .env; then
    sed -i.bak "s/DISPUTE_RESOLVER_ADDRESS=.*/DISPUTE_RESOLVER_ADDRESS=$CONTRACT_ADDRESS/" .env
  else
    echo "DISPUTE_RESOLVER_ADDRESS=$CONTRACT_ADDRESS" >> .env
  fi
  echo "📝 Updated .env with contract address"
else
  echo "❌ Failed to deploy contract"
  exit 1
fi

echo "🎉 Blockchain setup complete!"
echo "📍 Contract Address: $CONTRACT_ADDRESS"
echo "🌐 Hardhat Node: http://localhost:8545"
echo ""
echo "Ready to start backend! Run: cd apps/backend && bun run dev"
