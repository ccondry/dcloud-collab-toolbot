#!/bin/sh
echo "Uninstalling collab-toolbot..."
echo "Disabling systemd service..."
sudo systemctl disable collab-toolbot.service
echo "Removing systemd service file..."
sudo rm /lib/systemd/system/collab-toolbot.service
echo "Uninstall finished. You can now remove this folder if you wish."
