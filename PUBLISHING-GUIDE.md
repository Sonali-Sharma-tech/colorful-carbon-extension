# Publishing Guide for VS Code Extension

## Step 1: Create Publisher Account

1. **Go to**: https://marketplace.visualstudio.com/manage
2. **Sign in** with your Microsoft account
3. **Create a publisher** with these details:
   - Publisher ID: `Sonali-Sharma` (MUST match package.json)
   - Display Name: Sonali Sharma
   - Description: Creating beautiful developer experiences

## Step 2: Create Personal Access Token

1. **Go to**: https://dev.azure.com/
2. **Sign in** with the same Microsoft account
3. Click your **profile icon** (top right) → **Security**
4. Click **+ New Token**
5. Configure:
   - Name: `vsce-publish`
   - Organization: Select "All accessible organizations"
   - Expiration: 90 days (or custom)
   - Scopes: Click "Custom defined" → Check **"Marketplace"** → **"Publish"**
6. **Create** and **COPY THE TOKEN** (you won't see it again!)

## Step 3: Publish the Extension

Once you have the token, run these commands:

```bash
# Login to your publisher account
vsce login Sonali-Sharma
# Paste your token when prompted

# Publish the extension
vsce publish

# Or publish with a version bump
vsce publish minor  # 1.0.0 → 1.1.0
```

## Notes

- Extension is already packaged as `colorful-carbon-1.0.0.vsix`
- We're publishing without an icon (add one later for better visibility)
- First publish might take a few minutes to appear in marketplace
- URL will be: https://marketplace.visualstudio.com/items?itemName=Sonali-Sharma.colorful-carbon