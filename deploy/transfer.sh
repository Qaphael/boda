#!/bin/bash
# Run this ON YOUR PC to transfer code to VPS
# Usage: bash transfer.sh your-vps-ip your-username

VPS_IP=$1
VPS_USER=$2
REMOTE_DIR="/home/$VPS_USER/boda"

if [ -z "$VPS_IP" ] || [ -z "$VPS_USER" ]; then
  echo "Usage: bash transfer.sh <vps-ip> <vps-user>"
  echo "Example: bash transfer.sh 192.168.1.100 ubuntu"
  exit 1
fi

echo "Creating remote directory..."
ssh $VPS_USER@$VPS_IP "mkdir -p $REMOTE_DIR"

echo "Transferring files..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'coverage' \
  --exclude '.env' \
  --exclude 'deploy' \
  -e "ssh" \
  ./ $VPS_USER@$VPS_IP:$REMOTE_DIR/

echo "Transfer complete!"
echo ""
echo "Next: SSH into your VPS and run:"
echo "  ssh $VPS_USER@$VPS_IP"
echo "  cd $REMOTE_DIR"
echo "  bash deploy/setup-vps.sh"
