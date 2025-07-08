// In this file you can configure migrate-mongo

const config = {
  mongodb: {
    // Connection URL (include the database name in the URL)
    url: process.env.MONGODB_URI,

    // Database name, if not specified in URL
    databaseName: process.env.MONGO_DB || "postmore_db",

    // Connection options
    options: {
      // useNewUrlParser: true, // Deprecated in MongoDB driver 4.0+
      // useUnifiedTopology: true, // Deprecated in MongoDB driver 4.0+
    },
  },

  // The migrations dir, can be an relative or absolute path
  migrationsDir: "migrations",

  // The mongodb collection where the applied changes are stored
  changelogCollectionName: "changelog",

  // The file extension to create migrations
  migrationFileExtension: ".js",

  // Enable the algorithm to create a checksum of the file contents and use that in the comparison to determine
  // if the file should be run.  Requires that scripts are coded to be run multiple times.
  useFileHash: false,

  // Don't change this, unless you know what you're doing
  moduleSystem: "commonjs",
};

module.exports = config;
