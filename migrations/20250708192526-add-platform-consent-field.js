module.exports = {
  async up(db, client) {
    // Get the users collection
    const usersCollection = db.collection("users");

    console.log("🚀 Adding platformConsentAcknowledged field to users...");

    // Count users without the field
    const usersWithoutField = await usersCollection.countDocuments({
      platformConsentAcknowledged: { $exists: false },
    });

    console.log(
      `Found ${usersWithoutField} users without platformConsentAcknowledged field`
    );

    if (usersWithoutField === 0) {
      console.log(
        "✅ All users already have the platformConsentAcknowledged field"
      );
      return;
    }

    // Add the field to users who don't have it
    const result = await usersCollection.updateMany(
      { platformConsentAcknowledged: { $exists: false } },
      {
        $set: {
          platformConsentAcknowledged: {}, // Empty object (Map will be handled by Mongoose)
        },
      }
    );

    console.log(
      `✅ Migration completed: Updated ${result.modifiedCount} users`
    );

    // Verify the migration
    const remainingUsersWithoutField = await usersCollection.countDocuments({
      platformConsentAcknowledged: { $exists: false },
    });

    if (remainingUsersWithoutField === 0) {
      console.log(
        "✅ Verification passed: All users now have the platformConsentAcknowledged field"
      );
    } else {
      console.log(
        `⚠️  Warning: ${remainingUsersWithoutField} users still don't have the field`
      );
      throw new Error("Migration verification failed");
    }
  },

  async down(db, client) {
    // Rollback: Remove the platformConsentAcknowledged field
    const usersCollection = db.collection("users");

    console.log(
      "🔄 Rolling back: Removing platformConsentAcknowledged field..."
    );

    const result = await usersCollection.updateMany(
      { platformConsentAcknowledged: { $exists: true } },
      {
        $unset: {
          platformConsentAcknowledged: "",
        },
      }
    );

    console.log(
      `✅ Rollback completed: Removed field from ${result.modifiedCount} users`
    );
  },
};
