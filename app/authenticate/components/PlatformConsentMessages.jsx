export function PlatformConsentMessages({ platform }) {
  const consentMessages = {
    instagram: {
      title: "By connecting your Instagram account:",
      points: [
        "You grant PostMoore permission to post content on your behalf",
        "You can manage content posting settings from your Instagram account at any time",
        "All content will comply with Instagram's Community Guidelines",
        "You maintain full control over your account and can disconnect at any time",
      ],
    },
    facebook: {
      title: "By connecting your Facebook account:",
      points: [
        "You grant PostMoore permission to publish posts on your behalf",
        "You can review and manage posted content from your Facebook account",
        "All content will comply with Facebook's Community Standards",
        "You can revoke these permissions at any time through Facebook settings",
      ],
    },
    twitter: {
      title: "By connecting your Twitter account:",
      points: [
        "You grant PostMoore permission to post tweets on your behalf",
        "You can manage and delete posted content from your Twitter account",
        "All content will comply with Twitter's Terms of Service",
        "You maintain full control and can disconnect at any time",
      ],
    },
    threads: {
      title: "By connecting your Threads account:",
      points: [
        "You grant PostMoore permission to post content on your behalf",
        "You can manage content posting settings from your Threads account",
        "All content will comply with Threads' Community Guidelines",
        "You can disconnect and revoke permissions at any time",
      ],
    },
    ytShorts: {
      title: "By connecting your YouTube account:",
      points: [
        "You grant PostMoore permission to upload YouTube Shorts on your behalf",
        "You can manage uploaded videos from your YouTube Studio",
        "All content will comply with YouTube's Community Guidelines",
        "You maintain full ownership of your content and channel",
      ],
    },
    tiktok: {
      title: "By connecting your TikTok account:",
      points: [
        "You grant PostMoore permission to post content on your behalf",
        "You can manage content posting settings from your TikTok account at any time",
        "All content will comply with TikTok's Content Sharing Guidelines",
        "You can disconnect and manage permissions through TikTok settings",
      ],
    },
    bluesky: {
      title: "By connecting your Bluesky account:",
      points: [
        "You grant PostMoore permission to post content on your behalf",
        "You can manage and delete posts from your Bluesky account",
        "All content will respect Bluesky's community moderation policies",
        "You can revoke access through your Bluesky app password settings",
      ],
    },
  };

  const message = consentMessages[platform];

  if (!message) return null;

  return (
    <div className="mt-3 p-3 bg-muted/30 rounded-md text-xs text-muted-foreground">
      <p className="font-semibold mb-1">{message.title}</p>
      <ul className="list-disc pl-4 space-y-1">
        {message.points.map((point, index) => (
          <li key={index}>{point}</li>
        ))}
      </ul>
    </div>
  );
}
