#!/bin/sh
echo "Installing collab-toolbot..."
echo "running npm install"
npm i
if [ $? -eq 0 ]; then
  echo "edit .env file first..."
  vim .env
  echo "installing systemd service..."
  sudo cp systemd.service /lib/systemd/system/collab-toolbot.service
  sudo systemctl enable collab-toolbot.service
  echo "starting systemd service..."
  sudo sudo /bin/systemctl start collab-toolbot.service
else
  echo "npm install failed"
fi
