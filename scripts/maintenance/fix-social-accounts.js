/**
 * Maintenance Script: Fix Social Account Links
 *
 * This script fixes any missing links between social accounts and user records.
 * It's safe to run in production as it:
 * - Only adds missing links, doesn't delete anything
 * - Checks for existing links before adding
 * - Logs all operations for verification
 *
 * Use cases:
 * - After data migrations
 * - To fix data inconsistencies
 * - After recovering from bugs that affected social account linking
 *
 * Usage:
 * ```
 * node scripts/maintenance/fix-social-accounts.js
 * ```
 */

const mongoose = require("mongoose");
const { User } = require("../../app/lib/models/User");
const { SocialAccount } = require("../../app/lib/models/SocialAccount");
const dotenv = require("dotenv");

dotenv.config();

async function fixSocialAccounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find all social accounts
    const socialAccounts = await SocialAccount.find({});
    console.log(`Found ${socialAccounts.length} social accounts`);

    let fixedCount = 0;
    let alreadyLinkedCount = 0;
    let missingUserCount = 0;

    for (const socialAccount of socialAccounts) {
      // Find the user and check if the social account is already linked
      const user = await User.findById(socialAccount.userId);

      if (!user) {
        console.log(
          `Warning: User not found for social account ${socialAccount._id}`
        );
        missingUserCount++;
        continue;
      }

      if (!user.socialAccounts) {
        user.socialAccounts = [];
      }

      // Check if the social account is already in the array
      const isLinked = user.socialAccounts.some(
        (id) => id.toString() === socialAccount._id.toString()
      );

      if (!isLinked) {
        console.log(
          `Linking social account ${socialAccount._id} to user ${user._id}`
        );
        user.socialAccounts.push(socialAccount._id);
        await user.save();
        fixedCount++;
      } else {
        console.log(
          `Social account ${socialAccount._id} already linked to user ${user._id}`
        );
        alreadyLinkedCount++;
      }
    }

    console.log("\nSummary:");
    console.log(`Total social accounts processed: ${socialAccounts.length}`);
    console.log(`Fixed missing links: ${fixedCount}`);
    console.log(`Already properly linked: ${alreadyLinkedCount}`);
    console.log(`Missing users: ${missingUserCount}`);
    console.log("\nFinished fixing social accounts");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

fixSocialAccounts().catch(console.error);
