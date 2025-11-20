#!/bin/bash

# Test Script: Create Git Upstream Mismatch Scenario
# This creates a scenario where:
# - Local branch tracks origin/main (wrong!)
# - origin/test-branch exists (correct remote)
# - Shows: test-branch -> origin/main ⬆2⬇3 | origin/test-branch ⬆1⬇4

set -e  # Exit on error

echo "🧪 Creating Git Upstream Mismatch Test Scenario"
echo "================================================"
echo ""

# Save current branch
CURRENT=$(git branch --show-current)
echo "📍 Current branch: $CURRENT"
echo ""

# Cleanup function
cleanup() {
    echo "🧹 Cleaning up..."
    git checkout "$CURRENT" 2>/dev/null || git checkout main
    git branch -D mismatch-test 2>/dev/null || true
    git branch -D temp-remote 2>/dev/null || true
    rm -f main-test.txt local-test.txt remote-test.txt
    git push origin --delete mismatch-test 2>/dev/null || true
}

# Ask for confirmation
read -p "⚠️  This will create test branches and commits. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

# Cleanup existing test
cleanup

echo "1️⃣  Switching to main and pulling latest..."
git checkout main
git pull origin main

echo ""
echo "2️⃣  Creating 3 commits on main..."
for i in 1 2 3; do
    echo "main-commit-$i" >> main-test.txt
    git add main-test.txt
    git commit -m "main commit $i" --quiet
    echo "   ✓ Created main commit $i"
done

echo ""
echo "3️⃣  Pushing to origin/main..."
git push origin main --quiet
echo "   ✓ Pushed"

echo ""
echo "4️⃣  Creating test branch from 3 commits ago..."
git checkout HEAD~3 -b mismatch-test --quiet
echo "   ✓ Created branch mismatch-test"

echo ""
echo "5️⃣  Setting upstream to origin/main (creating the mismatch!)..."
git branch --set-upstream-to=origin/main
echo "   ✓ Upstream set to origin/main"

echo ""
echo "6️⃣  Creating 2 local commits..."
for i in 1 2; do
    echo "local-commit-$i" >> local-test.txt
    git add local-test.txt
    git commit -m "local commit $i" --quiet
    echo "   ✓ Created local commit $i"
done

echo ""
echo "7️⃣  Pushing to create origin/mismatch-test..."
git push origin mismatch-test --quiet
echo "   ✓ Pushed to origin/mismatch-test"

echo ""
echo "8️⃣  Resetting upstream back to origin/main (the mismatch!)..."
git branch --set-upstream-to=origin/main
echo "   ✓ Upstream reset to origin/main"

echo ""
echo "9️⃣  Creating divergence on origin/mismatch-test..."
git checkout main --quiet
git checkout -b temp-remote --quiet
for i in 1 2 3 4; do
    echo "remote-commit-$i" >> remote-test.txt
    git add remote-test.txt
    git commit -m "remote commit $i" --quiet
    echo "   ✓ Created remote commit $i"
done

echo ""
echo "🔟 Force pushing to origin/mismatch-test..."
git push origin temp-remote:mismatch-test -f --quiet
echo "   ✓ Force pushed"

echo ""
echo "🧹 Cleaning up temp branch..."
git checkout main --quiet
git branch -D temp-remote --quiet
echo "   ✓ Deleted temp-remote"

echo ""
echo "📥 Fetching origin..."
git checkout mismatch-test --quiet
git fetch origin --quiet
echo "   ✓ Fetched"

echo ""
echo "✅ Test Scenario Created Successfully!"
echo "======================================"
echo ""
echo "📊 Current Status:"
git status -sb
echo ""
echo "🎯 Expected Terminal Prompt:"
echo "   mismatch-test -> origin/main ⬆2⬇3 | origin/mismatch-test ⬆1⬇4"
echo ""
echo "🔍 Verification:"
echo "   - Tracking: $(git rev-parse --abbrev-ref @{upstream})"
echo "   - Ahead of origin/main: $(git rev-list --count origin/main..HEAD)"
echo "   - Behind origin/main: $(git rev-list --count HEAD..origin/main)"
echo "   - Ahead of origin/mismatch-test: $(git rev-list --count origin/mismatch-test..HEAD)"
echo "   - Behind origin/mismatch-test: $(git rev-list --count HEAD..origin/mismatch-test)"
echo ""
echo "🧪 Open a new terminal to see the prompt!"
echo ""
echo "🧹 To cleanup: git checkout $CURRENT && git branch -D mismatch-test && git push origin --delete mismatch-test"
