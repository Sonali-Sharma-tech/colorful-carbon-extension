#!/bin/bash

echo "🚀 Publishing Colorful Carbon Extension"
echo "======================================"
echo ""
echo "Prerequisites:"
echo "✓ Extension packaged: colorful-carbon-1.0.0.vsix"
echo "✓ Publisher ID: Sonali-Sharma"
echo ""
echo "Make sure you have:"
echo "1. Created publisher at https://marketplace.visualstudio.com/manage"
echo "2. Personal Access Token from https://dev.azure.com/"
echo ""
read -p "Do you have your Personal Access Token ready? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "Great! Let's publish..."
    echo ""
    echo "Running: vsce login Sonali-Sharma"
    vsce login Sonali-Sharma

    echo ""
    echo "Publishing extension..."
    vsce publish

    echo ""
    echo "🎉 Done! Your extension will be available at:"
    echo "https://marketplace.visualstudio.com/items?itemName=Sonali-Sharma.colorful-carbon"
    echo ""
    echo "It may take a few minutes to appear in the marketplace."
else
    echo "Please get your token first from https://dev.azure.com/"
fi