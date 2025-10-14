# Splitmark Cloud Documentation

## Overview

Splitmark Cloud is an **optional** feature that allows you to sync your markdown files across devices securely. All files are encrypted client-side before upload, ensuring your content remains private.

## Features

- **End-to-end encryption** - Files are encrypted on your device before upload
- **Sync-on-Save** - Files automatically sync to cloud when saved in the editor
- **Recursive directory scanning** - Syncs all .md files in subdirectories
- **Conflict detection** - Smart conflict detection with manual resolution options
- **Storage management** - 10GB Premium storage with quota validation
- **Interactive status display** - Real-time sync status with detailed file information
- **100% optional** - Splitmark works perfectly without cloud sync
- **Secure authentication** - JWT-based authentication with secure credential storage

## Getting Started

### 1. Create an Account or Log In

```bash
# Interactive login/signup
splitmark login
```

You'll be presented with three options:

1. **Browser Login (Recommended)** - Authenticate securely in your browser
   - You'll receive a unique code (e.g., `ABCD-1234`)
   - Visit the URL shown and enter the code
   - Approve access in your browser
   - The CLI automatically completes authentication

2. **Manual Login** - Log in with email and password directly in the CLI

3. **Create New Account** - Sign up with email, username, and password

Your credentials are stored securely using encrypted file storage.

#### Device Flow Authentication

The browser-based authentication (device flow) is the recommended method for CLI authentication. Here's how it works:

1. Run `splitmark login` and select option 1
2. You'll see a code like `ABCD-1234` and a URL
3. Open the URL in your browser
4. Sign in (or sign up if you don't have an account)
5. Enter the code shown in your terminal
6. Approve the CLI access request
7. The CLI automatically receives your authentication token

**Benefits:**
- More secure (no password in terminal)
- Works with OAuth providers (Google, GitHub)
- Better for shared/recorded terminal sessions
- Supports 2FA and other security features

### 2. Enable Cloud Sync

```bash
# Enable cloud synchronization
splitmark cloud:enable
```

### 3. Sync Your Files

```bash
# Manual sync
splitmark sync
```

This will:
- Upload new local files to the cloud
- Download new cloud files to your device
- Update files that changed on one side
- Detect conflicts when files changed on both sides

## Commands

### Authentication

#### `splitmark login`
Interactive authentication interface with multiple options.

**Example:**
```bash
$ splitmark login

Splitmark Cloud Authentication
───────────────────────────────
Connect your account to sync files across devices

1. Browser Login (Recommended)
   Authenticate securely in your browser

2. Manual Login
   Log in with email and password

3. Create New Account
   Sign up with email, username, and password

Press 1, 2, or 3 to continue • Q to cancel
```

**Device Flow (Option 1):**
```bash
Browser Authentication
──────────────────────

Step 1: Open your browser
Visit: https://splitmark.app/cli-auth

Step 2: Enter this code:
      ABCD-1234

The code will expire in 10 minutes

⏳ Waiting for authorization... (5s)
```

The CLI automatically polls for authorization. Once you approve in your browser, authentication completes automatically.

#### `splitmark logout`
Log out and clear stored credentials.

```bash
$ splitmark logout
Successfully logged out
```

### Account Management

#### `splitmark cloud:account`
Display account information.

```bash
$ splitmark cloud:account
Account Information:
───────────────────
Email: user@example.com
Username: myusername
Premium: Yes
Created: 1/1/2024
```

#### `splitmark cloud:status`
Show detailed cloud synchronization status with interactive interface.

```bash
$ splitmark cloud:status
```

**Interactive Status Interface:**

```
☁️  Splitmark Cloud Sync Status
Press 'q' or ESC to close, 'r' to refresh, ↑↓ to navigate

Account Status:
• Authentication: ✅ Logged in
• Cloud Sync: ✅ Enabled
• Premium: ✅ Active
• Sync Available: ✅ Ready

Storage Usage:
• 142.5 MB used of 10.0 GB (1.4% full)

Sync Summary (25 files):
• ✅ Synced: 23
• ⏳ Pending: 1
• ⚠️  Conflicts: 1
• ❌ Errors: 0

Files:
✅ notes/project-ideas.md • 2h ago
⏳ docs/meeting-notes.md • Just now
⚠️  tasks/todo.md • 1d ago
✅ research/findings.md • 3h ago
... and 21 more files

Conflict Details:
⚠️  tasks/todo.md
   File changed both locally and in cloud
💡 Run "splitmark cloud:conflicts" for resolution options
```

**Controls:**
- `q` or `ESC`: Close status view
- `r`: Refresh all status information
- `↑`/`↓`: Navigate through file list
- Files show sync status icons and relative timestamps

### Sync Operations

#### `splitmark sync`
Manually sync all files in your default location.

```bash
$ splitmark sync
Syncing files...

Sync Summary:
────────────
Total files: 10
Uploaded: 3
Updated: 2
Downloaded: 1
No changes: 4
Conflicts: 0
```

#### `splitmark cloud:conflicts`
List files with sync conflicts.

```bash
$ splitmark cloud:conflicts
Sync Conflicts:
──────────────

📄 document.md
   Path: /Users/name/Documents/Splitmark/document.md
   Issue: File changed both locally and in cloud
   Last synced: 2024-01-15T10:30:00Z
```

### Configuration

#### `splitmark cloud:enable`
Enable cloud synchronization.

```bash
$ splitmark cloud:enable
Cloud sync enabled
```

#### `splitmark cloud:disable`
Disable cloud synchronization (files remain in cloud).

```bash
$ splitmark cloud:disable
Cloud sync disabled
```

## Configuration File

Cloud settings are stored in `~/.splitmarkrc`:

```json
{
  "defaultLocation": "~/Documents/Splitmark",
  "cloud": {
    "enabled": true,
    "autoSync": false,
    "syncInterval": 300000,
    "apiUrl": "https://api.splitmark.app",
    "encryptionEnabled": true
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable/disable cloud sync |
| `autoSync` | boolean | `false` | Auto-sync on file save |
| `syncInterval` | number | `300000` | Sync interval in ms (5 min) |
| `apiUrl` | string | `https://api.splitmark.app` | API endpoint |
| `encryptionEnabled` | boolean | `true` | Enable client-side encryption |

## Automatic Sync-on-Save

Splitmark now automatically syncs files to the cloud when you save them in the editor, eliminating the need for manual sync commands during regular editing.

### How Sync-on-Save Works

1. **Edit a file** in Splitmark editor
2. **Save the file** (`Ctrl+S` or equivalent)
3. **Automatic sync** happens immediately:
   - File is encrypted locally
   - Storage quota is validated (Premium users only)
   - File is uploaded/updated in cloud
   - Sync status is updated
4. **Notification** appears showing sync result

### Sync-on-Save Behavior

```bash
# When editing in Splitmark:
$ splitmark edit notes/project.md

# Save file (Ctrl+S)
# Output: Saved and synced to cloud ✅

# Or if sync fails:
# Output: Saved locally (cloud sync failed: not authenticated)
```

### Requirements for Sync-on-Save

- **Authentication**: Must be logged in with `splitmark login`
- **Premium Subscription**: Cloud storage requires Premium account
- **Network Connection**: Internet required for cloud sync
- **Storage Space**: Must not exceed 10GB storage limit

### Fallback Behavior

If sync-on-save fails (no internet, not authenticated, etc.), the file is still saved locally and you can manually sync later with `splitmark sync`.

## How It Works

### File Encryption

1. **Local file is read** - Your markdown file is read from disk
2. **Content is hashed** - SHA-256 hash generated for integrity verification
3. **Content is encrypted** - AES-256-GCM encryption using your encryption key
4. **Encrypted content is uploaded** - Only encrypted data reaches the server
5. **Server stores encrypted blob** - Server never sees your plaintext content

### Sync Logic

Splitmark uses a three-way sync strategy:

| Local Changed | Cloud Changed | Action |
|--------------|---------------|---------|
| No | No | No action |
| Yes | No | Upload to cloud |
| No | Yes | Download from cloud |
| Yes | Yes | **Conflict** - user resolution required |

### Encryption Keys

- **Encryption key** is generated once on your device
- **Stored securely** in `~/.splitmark/encryption-key` (mode 0600)
- **Never transmitted** to the server
- **Same key** used across all your devices (must be manually synced for new devices)

⚠️ **Important:** If you lose your encryption key, you cannot decrypt your cloud files!

## Sync Workflow

### First-Time Sync

```bash
# 1. Log in
splitmark login

# 2. Enable sync
splitmark cloud:enable

# 3. Perform initial sync
splitmark sync
```

On first sync:
- All local `.md` files in default location are uploaded
- Each file is encrypted before upload
- Sync state is tracked locally

### Ongoing Sync

```bash
# Manual sync whenever needed
splitmark sync
```

Or enable auto-sync:

```json
{
  "cloud": {
    "enabled": true,
    "autoSync": true
  }
}
```

## Handling Conflicts

When a file changes both locally and in the cloud, Splitmark detects a conflict:

```bash
$ splitmark sync
Conflicts: 1 (run "splitmark cloud:conflicts" to view)

$ splitmark cloud:conflicts
📄 notes.md
   Path: ~/Documents/Splitmark/notes.md
   Issue: File changed both locally and in cloud
```

### Resolution Options

1. **Keep local version** - Manually delete cloud version or force upload
2. **Keep cloud version** - Manually delete local file and re-sync
3. **Merge manually** - Compare both versions and merge changes

### Manual Conflict Resolution

```bash
# Option 1: Keep local (overwrite cloud)
# Edit the file locally, then:
splitmark sync

# Option 2: Keep cloud (overwrite local)
# Delete local file, then:
splitmark sync

# Option 3: View both versions
# Files are available at:
# - Local: ~/Documents/Splitmark/notes.md
# - Download cloud version manually using cloud:download command (future feature)
```

## Multi-Device Setup

To use Splitmark Cloud on multiple devices:

### Device 1 (Initial Setup)

```bash
# Log in and sync
splitmark login
splitmark cloud:enable
splitmark sync

# Backup your encryption key
cp ~/.splitmark/encryption-key ~/Dropbox/splitmark-key-backup
```

### Device 2 (Additional Device)

```bash
# Install Splitmark
npm install -g splitmark

# Restore encryption key from Device 1
mkdir -p ~/.splitmark
cp ~/Dropbox/splitmark-key-backup ~/.splitmark/encryption-key
chmod 600 ~/.splitmark/encryption-key

# Log in with same account
splitmark login

# Enable sync
splitmark cloud:enable

# Download all files
splitmark sync
```

⚠️ **Critical:** The encryption key must be the same on all devices, or you won't be able to decrypt files!

## Security Best Practices

### ✅ Do's

- ✅ Keep your encryption key backed up securely
- ✅ Use a strong password for your account
- ✅ Sync encryption key to new devices via secure channel (encrypted USB, secure cloud storage)
- ✅ Log out on shared computers
- ✅ Review sync conflicts before resolving
- ✅ Regularly back up important files locally

### ❌ Don'ts

- ❌ Don't share your encryption key publicly
- ❌ Don't commit encryption key to git repositories
- ❌ Don't store password in plain text
- ❌ Don't disable encryption (`encryptionEnabled: false`)
- ❌ Don't ignore sync conflicts

## Privacy & Security

### What the Server Sees

- ✅ Encrypted file content (unreadable)
- ✅ File metadata (name, size, upload time)
- ✅ Your email and username
- ❌ **NOT** your file content (it's encrypted!)
- ❌ **NOT** your encryption key

### Encryption Spec

- **Algorithm:** AES-256-GCM
- **Key Length:** 256 bits (32 bytes)
- **IV Length:** 128 bits (16 bytes)
- **Authentication:** GCM auth tag (128 bits)
- **Hash Function:** SHA-256

### Data Protection

1. **In Transit:** HTTPS/TLS 1.3
2. **At Rest (Server):** Encrypted with your key (server can't decrypt)
3. **At Rest (Local):** File permissions (mode 0600)
4. **Credentials:** Encrypted local storage

## Storage Management & Quotas

Premium Splitmark Cloud subscriptions include **10GB** of encrypted cloud storage with comprehensive quota validation to prevent overages.

### Storage Quota System

**Multi-Layer Validation:**
1. **Client-side pre-validation**: Checks quota before attempting upload
2. **API-level validation**: Server validates storage before accepting files
3. **Real-time monitoring**: Storage usage tracked and displayed in status

### Storage Limits

- **Premium Users**: 10GB total storage
- **Free Users**: No cloud storage (local-only)
- **File Size Limit**: Individual files up to 100MB
- **File Type**: Only `.md` (markdown) files are synced

### Storage Warnings

Storage warnings appear automatically when approaching limits:

- **80% full**: Warning during sync operations
  ```bash
  ⚠️ Storage 85.2% full - 8.5 GB used of 10.0 GB (1.5 GB available)
  ```

- **95% full**: Strong warning to clean up files
  ```bash
  ⚠️ Storage almost full! Please delete some files or upgrade your plan.
  ```

- **100% full**: Uploads blocked
  ```bash
  Error: File (15.2 MB) would exceed storage limit. Using 9.98 GB of 10.0 GB.
  Upload blocked: Premium subscription storage limit exceeded
  ```

### Managing Storage Space

**View Current Usage:**
```bash
# Check storage in status interface
splitmark cloud:status

# Shows: "142.5 MB used of 10.0 GB (1.4% full)"
```

**Free Up Space:**
```bash
# Delete unused local files, then sync to remove from cloud
rm ~/Documents/Splitmark/old-project.md
splitmark sync

# Or delete entire directories
rm -rf ~/Documents/Splitmark/archived-notes/
splitmark sync
```

**Batch Storage Validation:**
When syncing multiple files, storage is validated for the entire batch:
```bash
$ splitmark sync
Error: Files (245.7 MB) would exceed storage limit. Using 9.8 GB of 10.0 GB.
```

### Storage Best Practices

✅ **Do's:**
- Regularly clean up unused files
- Monitor storage usage with `splitmark cloud:status`
- Archive large files locally if not needed in cloud
- Use efficient markdown (avoid large embedded images)

❌ **Don'ts:**
- Don't ignore storage warnings
- Don't upload files close to the limit without checking
- Don't store non-markdown files in sync directories

## Troubleshooting

### "Not logged in" Error

```bash
# Solution: Log in first
splitmark login
```

### Sync Fails with Authentication Error

```bash
# Token may be expired - log in again
splitmark logout
splitmark login
```

### Files Not Syncing

```bash
# Check detailed sync status
splitmark cloud:status

# Ensure cloud is enabled
splitmark cloud:enable

# Try manual sync
splitmark sync

# Check for specific file sync issues
splitmark cloud:status
# Look for files with ❌ error status
```

### Sync-on-Save Not Working

**Check Requirements:**
```bash
# Verify authentication
splitmark cloud:status
# Should show "Authentication: ✅ Logged in"

# Verify Premium subscription
splitmark cloud:status
# Should show "Premium: ✅ Active"

# Check if file is in sync directory
# Files must be in your defaultLocation directory tree
```

**Common Issues:**
- File not in default location directory
- Not authenticated (`splitmark login` required)
- No Premium subscription
- Storage quota exceeded
- Network connectivity issues

### Storage Quota Exceeded

```bash
# Check current usage
splitmark cloud:status

# Free up space by deleting files locally
rm ~/Documents/Splitmark/unused-file.md
splitmark sync  # This removes it from cloud too

# Or identify large files
find ~/Documents/Splitmark -name "*.md" -exec ls -lh {} + | sort -k5 -hr
```

### Decryption Failed

This usually means:
- Wrong encryption key on this device
- File corrupted during sync
- Encryption key was regenerated

**Solution:** Restore correct encryption key from backup.

### Can't Resolve Conflict

```bash
# List conflicts
splitmark cloud:conflicts

# Manual resolution:
# 1. Backup local file
cp ~/Documents/Splitmark/file.md ~/Desktop/file-local.md

# 2. Delete local file
rm ~/Documents/Splitmark/file.md

# 3. Download cloud version
splitmark sync

# 4. Compare and merge manually
# Use diff tool to compare file-local.md and file.md
```

## API Reference

For developers building integrations, see the [Splitmark API Documentation](https://docs.splitmark.app/api).

### Device Flow Authentication (CLI)

The device flow provides a secure way for CLI applications to authenticate users:

#### 1. Initiate Device Flow
**POST** `/auth/cli/device-code`

Request:
```json
{}
```

Response:
```json
{
  "device_code": "device_abc123xyz",
  "user_code": "ABCD-1234",
  "verification_uri": "https://splitmark.app/cli-auth",
  "verification_uri_complete": "https://splitmark.app/cli-auth?code=ABCD-1234",
  "expires_in": 600,
  "interval": 5
}
```

#### 2. Poll for Token
**POST** `/auth/cli/token`

Request:
```json
{
  "device_code": "device_abc123xyz",
  "grant_type": "urn:ietf:params:oauth:grant-type:device_code"
}
```

Response (pending - HTTP 400):
```json
{
  "error": "authorization_pending",
  "error_description": "The authorization request is still pending as the end-user hasn't yet completed the user-interaction steps."
}
```

Response (success - HTTP 200):
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGci...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "username": "myusername",
    "isPremium": false
  }
}
```

Response (expired - HTTP 400):
```json
{
  "error": "expired_token",
  "error_description": "The device code has expired. Please initiate a new device flow."
}
```

Response (denied - HTTP 400):
```json
{
  "error": "access_denied",
  "error_description": "The end-user denied the authorization request."
}
```

Response (slow down - HTTP 400):
```json
{
  "error": "slow_down",
  "error_description": "The client is polling too frequently and should slow down."
}
```

#### 3. Verify User Code (Web Interface)
**GET** `/auth/cli/verify/:userCode`

Used by the web interface to validate user codes before showing the authorization prompt.

#### 4. Authorize Device (Web Interface)
**POST** `/auth/cli/authorize`

Request:
```json
{
  "userCode": "ABCD-1234",
  "approved": true
}
```

Used by the web interface when the user approves or denies CLI access.

### Environment Variables

```bash
# Use custom API endpoint
export SPLITMARK_API_URL="https://custom.api.com"
splitmark sync
```

### Development Mode

For local development and testing, use the `--dev` flag to connect to a local API server:

```bash
# Connect to local dev server at http://localhost:3000
splitmark login --dev
splitmark sync --dev
splitmark cloud:status --dev

# All cloud commands support the --dev flag
```

**What it does:**
- Overrides API URL to `http://localhost:3000`
- Shows a development mode indicator
- Works with all cloud commands
- No configuration file changes needed

**Example:**
```bash
$ splitmark login --dev
🔧 Development mode: Using local API at http://localhost:3000

Splitmark Cloud Authentication
───────────────────────────────
1. Browser Login (Recommended)
...
```

**Note:** The `--dev` flag is a global option and works with any command that uses cloud features.

## Limitations

### Free Tier

- File size limit: 100MB per file
- Storage limit: As per your account plan

### Premium Features

- Larger file sizes
- Real-time collaboration (coming soon)
- Version history (coming soon)
- Longer retention

## Frequently Asked Questions

### Is my data secure?

Yes! All files are encrypted on your device before upload. The server only stores encrypted data that it cannot read.

### What happens if I lose my encryption key?

You will lose access to your cloud files. Always back up your encryption key to a secure location.

### Can I use Splitmark without cloud sync?

Absolutely! Cloud sync is completely optional. Splitmark works perfectly as a local-only editor.

### How do I migrate my encryption key to a new computer?

Copy `~/.splitmark/encryption-key` from your old device to your new device before logging in.

### Can multiple people edit the same document?

Not yet, but real-time collaboration is coming soon!

### What happens if I edit offline?

Edits are saved locally. When you come back online, run `splitmark sync` to upload changes.

### Can I delete cloud files?

Yes, delete the local file and run `splitmark sync`. Or use the API/web interface (coming soon).

## Roadmap

Future cloud features:

- [ ] Real-time collaboration with Yjs
- [ ] Document sharing with per-user encryption
- [ ] Version history and rollback
- [ ] Selective file sync (choose which files to sync)
- [ ] Auto-conflict resolution strategies
- [ ] Web interface for file management
- [ ] Mobile apps

## Support

- **Issues:** [GitHub Issues](https://github.com/splitmark/splitmark/issues)
- **Discussions:** [GitHub Discussions](https://github.com/splitmark/splitmark/discussions)
- **Email:** support@splitmark.app

## License

Splitmark Cloud integration is part of Splitmark and licensed under MIT License.
# Testing filename fix
