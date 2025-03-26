##User Collection

{
\_id: ObjectId,
name: string,
email: string,
password: string, // Hashed
authProvider: "email" | "google" | "github",
socialAccounts: [ObjectId], // References SocialAccount
createdAt: Date,
}

##SocialAccount Collection
{
\_id: ObjectId,
userId: ObjectId, // Reference to User
platform: "facebook" | "instagram" | "youtube" | "bluesky" | "threads",
accessToken: string, // Encrypted
refreshToken?: string, // Encrypted (if supported)
username: string, // e.g., Instagram handle
expiresAt: Date, // Token expiry
}

##Post Collection

{
\_id: ObjectId,
userId: ObjectId,
content: {
text: string,
media: [string], // Firebase Storage URLs
},
platforms: [{
platform: "facebook" | "instagram" | ...,
status: "scheduled" | "published" | "failed",
postId?: string, // Platform's ID (e.g., FB post ID)
error?: string, // Failure reason
scheduledAt: Date,
}],
createdAt: Date,
updatedAt: Date,
}

##Media Collection (Optional)

{
\_id: ObjectId,
userId: ObjectId,
url: string, // Firebase URL
type: "image" | "video",
createdAt: Date,
}
