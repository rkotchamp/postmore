import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion";

const faqData = [
  {
    id: "item-1",
    question: "What social media platforms does PostMoore support?",
    answer: "PostMoore supports all major social media platforms including YouTube Shorts, TikTok, Instagram, Facebook, Twitter/X, LinkedIn, Bluesky, Threads, and Pinterest. We're constantly adding support for new platforms based on user feedback."
  },
  {
    id: "item-2",
    question: "How does the scheduling feature work?",
    answer: "Simply upload your content, write your captions, select your target platforms, and choose when you want it published. PostMoore will automatically post your content at the scheduled time across all selected platforms. You can schedule posts minutes, hours, days, or weeks in advance."
  },
  {
    id: "item-3",
    question: "Can I customize content for each platform?",
    answer: "Absolutely! PostMoore allows you to customize captions, hashtags, and even media for each platform. This ensures your content is optimized for each platform's unique audience and requirements while maintaining your brand consistency."
  },
  {
    id: "item-4",
    question: "Is there a limit to how many posts I can schedule?",
    answer: "The number of scheduled posts depends on your plan. Our Free plan allows up to 10 scheduled posts per month, Pro plan includes 100 posts per month, and our Business plan offers unlimited scheduling. You can upgrade or downgrade your plan at any time."
  },
  {
    id: "item-5",
    question: "How secure is my data and social media accounts?",
    answer: "Security is our top priority. We use industry-standard encryption, OAuth 2.0 authentication, and never store your social media passwords. Your data is protected with enterprise-grade security measures, and we're fully GDPR compliant."
  },
  {
    id: "item-6",
    question: "Can I manage multiple social media accounts?",
    answer: "Yes! You can connect and manage multiple accounts for each platform. This is perfect for agencies, businesses with multiple brands, or individuals managing personal and professional accounts. Switch between accounts seamlessly within the dashboard."
  },
  {
    id: "item-7",
    question: "Do you offer analytics and insights?",
    answer: "Yes, we provide comprehensive analytics showing post performance, engagement rates, best posting times, and audience insights across all your connected platforms. This helps you optimize your content strategy and grow your audience effectively."
  },
  {
    id: "item-8",
    question: "What happens if a post fails to publish?",
    answer: "If a post fails to publish, you'll receive an immediate notification via email and in-app alert. The post will be marked as failed in your dashboard with details about why it failed, and you can easily retry or reschedule it."
  },
  {
    id: "item-9",
    question: "Can I cancel my subscription at any time?",
    answer: "Yes, you can cancel your subscription at any time from your account settings. If you cancel, you'll continue to have access to your plan features until the end of your current billing period. No hidden fees or cancellation charges."
  },
  {
    id: "item-10",
    question: "Do you offer customer support?",
    answer: "We offer 24/7 customer support via email and live chat. Pro and Business plan users get priority support with faster response times. We also have a comprehensive help center with tutorials, guides, and troubleshooting resources."
  }
];

export function FAQ() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
              Got questions? We've got answers. Find everything you need to know about PostMoore.
            </p>
          </div>

          {/* FAQ Accordion */}
          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="w-full space-y-4">
              {faqData.map((faq) => (
                <AccordionItem 
                  key={faq.id} 
                  value={faq.id}
                  className="border border-border rounded-xl px-6 py-2 bg-card hover:bg-card/80 transition-colors"
                >
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary transition-colors py-6 text-base">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-6 text-base">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Contact CTA */}
          <div className="text-center mt-16">
            <p className="text-muted-foreground mb-6">
              Still have questions? We're here to help!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="mailto:support@postmoo.re" 
                className="inline-flex items-center justify-center px-6 py-3 border border-primary text-primary bg-transparent hover:bg-primary hover:text-primary-foreground rounded-lg font-medium transition-colors"
              >
                Email Support
              </a>
              <a 
                href="/privacy" 
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}