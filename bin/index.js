import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import React from 'react';
import { render } from 'ink';
import App from '../src/App.jsx';
import FileExplorerApp from '../src/FileExplorerApp.jsx';
import CloudAuthApp from '../src/CloudAuthApp.jsx';
import CloudOnboardingApp from '../src/CloudOnboardingApp.jsx';
import SyncStatusApp from '../src/SyncStatusApp.jsx';
import { loadConfig, ensureDefaultLocation, resolveFilePath, saveConfig } from '../src/utils/config.js';
import { getCloudConfig, updateCloudConfig } from '../src/utils/cloudConfig.js';
import { getCredentials, hasStoredCredentials, clearToken } from '../src/cloud/storage/credentials.js';
import { getProfile } from '../src/cloud/api/auth.js';
import { getApiUrl } from '../src/utils/cloudConfig.js';
import { performSync, syncFile } from '../src/cloud/sync/syncEngine.js';
import { getFilesByStatus } from '../src/cloud/storage/syncState.js';
import { requirePremiumSubscription, getSubscriptionMessage, checkSubscriptionStatus } from '../src/cloud/subscription/subscriptionCheck.js';
import { shouldShowOnboarding } from '../src/cloud/utils/onboardingCheck.js';
import { getUserEncryptionKey } from '../src/cloud/encryption/keyManager.js';

// Load user configuration
const config = loadConfig();

// Ensure default location exists
ensureDefaultLocation(config);

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 [file] [options]\n\nIf no file is specified, a file explorer will open.')
  .command('$0 [file]', 'Open a markdown file for editing or browse files', (yargs) => {
    yargs.positional('file', {
      describe: 'Path to the markdown file (optional - opens file explorer if omitted)',
      type: 'string',
    });
  })
  .command('login', 'Log in to Splitmark Cloud', () => {})
  .command('logout', 'Log out from Splitmark Cloud', () => {})
  .command('cloud:status', 'Show cloud sync status', () => {})
  .command('cloud:status-detailed', 'Show detailed interactive sync status', () => {})
  .command('cloud:account', 'Show account information', () => {})
  .command('cloud:enable', 'Enable cloud sync', () => {})
  .command('cloud:disable', 'Disable cloud sync', () => {})
  .command('cloud:setup', 'Interactive cloud setup and onboarding', () => {})
  .command('sync', 'Sync files with Splitmark Cloud', () => {})
  .command('cloud:conflicts', 'List files with sync conflicts', () => {})
  .command('cloud:web-key', 'Show encryption key for web app access', () => {})
  .option('layout', {
    alias: 'l',
    describe: 'Preview layout',
    choices: ['side', 'bottom'],
  })
  .option('no-preview', {
    describe: 'Disable preview pane',
    type: 'boolean',
  })
  .option('dev', {
    describe: 'Use local development API (http://localhost:3000)',
    type: 'boolean',
    global: true,
  })
  .help()
  .alias('help', 'h')
  .version()
  .alias('version', 'v')
  .parseSync();

// Override API URL if --dev flag is set
if (argv.dev) {
  config.cloud = {
    ...(config.cloud || {}),
    apiUrl: 'http://localhost:3000',
  };
  console.log('🔧 Development mode: Using local API at http://localhost:3000\n');
}

// Handle cloud commands
const command = argv._[0];

if (command === 'login') {
  // Show login prompt
  render(
    React.createElement(CloudAuthApp, {
      config,
      onSuccess: (result) => {
        console.log(`\nSuccessfully logged in as ${result.user.username}`);
        process.exit(0);
      },
      onCancel: () => {
        console.log('\nLogin cancelled');
        process.exit(0);
      },
    })
  );
} else if (command === 'logout') {
  // Log out
  (async () => {
    try {
      const hasCredentials = await hasStoredCredentials();
      if (!hasCredentials) {
        console.log('Not logged in');
        process.exit(0);
      }
      await clearToken();
      console.log('Successfully logged out');
      process.exit(0);
    } catch (error) {
      console.error(`Logout failed: ${error.message}`);
      process.exit(1);
    }
  })();
} else if (command === 'cloud:status') {
  // Show cloud status
  (async () => {
    try {
      const hasCredentials = await hasStoredCredentials();
      const cloudConfig = getCloudConfig(config);

      console.log('\n☁️  Splitmark Cloud Status:');
      console.log('─────────────────────────');
      console.log(`Logged in: ${hasCredentials ? '✅ Yes' : '❌ No'}`);
      console.log(`Cloud sync: ${cloudConfig.enabled ? '✅ Enabled' : '❌ Disabled'}`);

      if (hasCredentials) {
        const subscriptionMessage = await getSubscriptionMessage(config);
        console.log(`Subscription: ${subscriptionMessage}`);

        // Get fresh user data from the subscription check (which fetches from API if needed)
        const subscriptionResult = await checkSubscriptionStatus(config);
        const user = subscriptionResult.user;

        console.log(`\n👤 Account: ${user?.email || 'Unknown'}`);

        // Handle various possible date field names and formats
        const createdDate = user?.createdAt || user?.created_at || user?.createdDate;
        const memberSince = createdDate
          ? new Date(createdDate).toLocaleDateString()
          : 'Unknown';
        console.log(`📅 Member since: ${memberSince}`);

        // Show helpful messages based on status
        if (!user?.isPremium) {
          console.log('\n💡 Tips:');
          console.log('   • Upgrade to premium for cloud sync features');
          console.log('   • Visit https://splitmark.app/dashboard to subscribe');
        } else if (!cloudConfig.enabled) {
          console.log('\n💡 Tips:');
          console.log('   • Run "splitmark cloud:enable" to enable cloud sync');
          console.log('   • Your files will sync automatically when you save them');
        } else {
          console.log('\n🎉 All set! Your files will sync to the cloud automatically.');
        }
      } else {
        console.log('\n💡 Tips:');
        console.log('   • Run "splitmark login" to authenticate');
        console.log('   • Premium subscription required for cloud features');
      }

      process.exit(0);
    } catch (error) {
      console.error(`Failed to get status: ${error.message}`);
      process.exit(1);
    }
  })();
} else if (command === 'cloud:status-detailed') {
  // Show detailed interactive sync status
  render(
    React.createElement(SyncStatusApp, {
      config,
      onClose: () => {
        process.exit(0);
      },
    })
  );
} else if (command === 'cloud:account') {
  // Show account info
  (async () => {
    try {
      const hasCredentials = await hasStoredCredentials();
      if (!hasCredentials) {
        console.log('Not logged in. Run "splitmark login" to authenticate.');
        process.exit(1);
      }

      const credentials = await getCredentials();
      const apiUrl = getApiUrl(config);
      const profile = await getProfile(apiUrl, credentials.token);

      console.log('\nAccount Information:');
      console.log('───────────────────');
      console.log(`Email: ${profile.email}`);
      console.log(`Username: ${profile.username}`);
      console.log(`Premium: ${profile.isPremium ? 'Yes' : 'No'}`);
      console.log(`Created: ${new Date(profile.createdAt).toLocaleDateString()}`);

      process.exit(0);
    } catch (error) {
      console.error(`Failed to get account info: ${error.message}`);
      process.exit(1);
    }
  })();
} else if (command === 'cloud:enable') {
  // Enable cloud sync
  (async () => {
    try {
      // Check if user has premium subscription
      await requirePremiumSubscription(config, 'Cloud sync');

      const updatedConfig = updateCloudConfig(config, { enabled: true });
      saveConfig(updatedConfig);
      console.log('✅ Cloud sync enabled');
      console.log('💡 Your files will now sync automatically when you save them.');
      process.exit(0);
    } catch (error) {
      console.error(`❌ Cannot enable cloud sync: ${error.message}`);
      process.exit(1);
    }
  })();
} else if (command === 'cloud:disable') {
  // Disable cloud sync
  const updatedConfig = updateCloudConfig(config, { enabled: false });
  saveConfig(updatedConfig);
  console.log('Cloud sync disabled');
  process.exit(0);
} else if (command === 'sync') {
  // Sync files
  (async () => {
    try {
      // Check if user has premium subscription
      await requirePremiumSubscription(config, 'Manual sync');

      console.log('🔄 Syncing files...');
      const summary = await performSync(config);

      console.log('\n📊 Sync Summary:');
      console.log('────────────────');
      console.log(`Total files: ${summary.total}`);
      console.log(`Uploaded: ${summary.uploaded}`);
      console.log(`Updated: ${summary.updated}`);
      console.log(`Downloaded: ${summary.downloaded}`);
      console.log(`No changes: ${summary.noChange}`);
      if (summary.conflicts > 0) {
        console.log(`⚠️  Conflicts: ${summary.conflicts} (run "splitmark cloud:conflicts" to view)`);
      }
      if (summary.errors > 0) {
        console.log(`❌ Errors: ${summary.errors}`);
      }
      if (summary.cloudOnly > 0) {
        console.log(`☁️  Cloud-only files: ${summary.cloudOnly}`);
      }

      const successMessage = summary.errors > 0 ? '⚠️ Sync completed with errors' : '✅ Sync completed successfully';
      console.log(`\n${successMessage}`);

      process.exit(summary.errors > 0 ? 1 : 0);
    } catch (error) {
      console.error(`❌ Sync failed: ${error.message}`);
      process.exit(1);
    }
  })();
} else if (command === 'cloud:conflicts') {
  // List conflicts
  (async () => {
    try {
      const conflicts = getFilesByStatus('conflict');

      if (conflicts.length === 0) {
        console.log('No conflicts found');
        process.exit(0);
      }

      console.log('\nSync Conflicts:');
      console.log('──────────────');
      conflicts.forEach((file) => {
        console.log(`\n📄 ${file.filename}`);
        console.log(`   Path: ${file.localPath}`);
        console.log(`   Issue: ${file.conflictMessage || 'Unknown conflict'}`);
        console.log(`   Last synced: ${file.lastSyncedAt || 'Never'}`);
      });

      console.log('\nTo resolve conflicts, you can:');
      console.log('1. Manually edit the files and run "splitmark sync" again');
      console.log('2. Delete the local file to download cloud version');
      console.log('3. Use conflict resolution (coming soon)');

      process.exit(0);
    } catch (error) {
      console.error(`Failed to list conflicts: ${error.message}`);
      process.exit(1);
    }
  })();
} else if (command === 'cloud:setup') {
  // Interactive cloud setup and onboarding
  (async () => {
    try {
      // Check if user needs onboarding
      const onboardingCheck = await shouldShowOnboarding(config);

      if (!onboardingCheck.shouldShowOnboarding) {
        console.log('✅ Cloud setup already complete!');
        console.log('💡 Run "splitmark cloud:status" to see your current setup');
        process.exit(0);
      }

      console.log('🚀 Starting Splitmark Cloud setup...\n');

      // Show interactive onboarding
      render(
        React.createElement(CloudOnboardingApp, {
          config,
          onComplete: (result) => {
            console.log('\n✅ Cloud setup completed successfully!');
            process.exit(0);
          },
          onCancel: () => {
            console.log('\n❌ Cloud setup cancelled');
            process.exit(0);
          },
        })
      );
    } catch (error) {
      console.error(`❌ Setup failed: ${error.message}`);
      process.exit(1);
    }
  })();
} else if (command === 'cloud:web-key') {
  // Show encryption key for web app access
  try {
    const encryptionKey = getUserEncryptionKey();

    console.log('🔑 Encryption Key for Web App Access');
    console.log('=====================================');
    console.log('');
    console.log('Copy this key to use in the Splitmark Web App:');
    console.log('');
    console.log(`${encryptionKey}`);
    console.log('');
    console.log('📋 Instructions:');
    console.log('1. Open the Splitmark Web App (zen IDE)');
    console.log('2. Click "Import Key" button');
    console.log('3. Paste the key above');
    console.log('4. Start editing your encrypted files!');
    console.log('');
    console.log('⚠️  Keep this key secure - anyone with this key can decrypt your files.');

    process.exit(0);
  } catch (error) {
    console.error(`❌ Failed to get encryption key: ${error.message}`);
    process.exit(1);
  }
} else if (!argv.file) {
  // No file specified, show file explorer
  render(
    React.createElement(FileExplorerApp, {
      config,
    })
  );
} else {
  // Resolve file path based on config
  // If no directory in path (e.g., "file.md"), use default location
  // If has directory (e.g., "folder/file.md"), create in default location
  const filePath = resolveFilePath(argv.file, config);
  let initialContent = '';

  // Read file if it exists, otherwise create new
  if (existsSync(filePath)) {
    try {
      initialContent = readFileSync(filePath, 'utf-8');

      // If cloud sync is enabled and user has credentials, sync the file first
      const cloudConfig = getCloudConfig(config);
      if (cloudConfig.enabled) {
        (async () => {
          try {
            const hasCredentials = await hasStoredCredentials();
            if (hasCredentials) {
              // Sync silently to avoid console output conflicts with Ink rendering
              const apiUrl = getApiUrl(config);
              const credentials = await getCredentials();
              const defaultLocation = config.defaultLocation || join(process.cwd(), 'notes');

              const syncResult = await syncFile(filePath, defaultLocation, apiUrl, credentials.token, config);

              if (syncResult.action === 'downloaded' || syncResult.action === 'updated') {
                // Re-read the file content after sync
                initialContent = readFileSync(filePath, 'utf-8');
              }
            }
          } catch (syncError) {
            // Sync failed, continue with local version silently
          }

          // Render the app after sync (or sync failure)
          render(
            React.createElement(App, {
              filePath,
              initialContent,
              layout: argv.layout || config.layout,
              showPreview: argv.noPreview !== undefined ? !argv.noPreview : config.showPreview,
              config,
            })
          );
        })();
      } else {
        // Cloud sync disabled, just render with local content
        render(
          React.createElement(App, {
            filePath,
            initialContent,
            layout: argv.layout || config.layout,
            showPreview: argv.noPreview !== undefined ? !argv.noPreview : config.showPreview,
            config,
          })
        );
      }
    } catch (error) {
      console.error(`Error reading file: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.log(`Creating new file at: ${filePath}`);

    // For new files, just render normally
    render(
      React.createElement(App, {
        filePath,
        initialContent,
        layout: argv.layout || config.layout,
        showPreview: argv.noPreview !== undefined ? !argv.noPreview : config.showPreview,
        config,
      })
    );
  }
}
