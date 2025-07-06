import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Shield, Mail, MapPin } from "lucide-react";

export function PrivacyContent() {
  return (
    <div className="py-16 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-primary mr-3" />
            <h1 className="text-4xl font-bold text-foreground">
              Privacy Policy & Terms of Service
            </h1>
          </div>
          <Badge variant="secondary" className="bg-muted text-foreground">
            Last Updated: August 1, 2023
          </Badge>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            We respect your privacy and are committed to protecting your
            personal data. This document explains how we handle your information
            and the terms governing your use of PostMoore.
          </p>
        </div>

        {/* Main Content */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-8 lg:p-12">
            <div className="prose prose-gray max-w-none">
              {/* Introduction */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    1
                  </span>
                  Introduction
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Welcome to PostMoore ("we," "our," or "us"). We respect your
                  privacy and are committed to protecting your personal data.
                  This Privacy Policy explains how we collect, use, disclose,
                  and safeguard your information when you use our social media
                  scheduling application.
                </p>
              </section>

              {/* Information We Collect */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    2
                  </span>
                  Information We Collect
                </h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      2.1 Personal Information
                    </h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>
                        <strong>Account Information</strong>: Email address,
                        name, password (encrypted), profile picture
                      </li>
                      <li>
                        <strong>Social Media Account Data</strong>: Access
                        tokens, account information from connected platforms
                      </li>
                      <li>
                        <strong>Payment Information</strong>: If applicable,
                        processed through secure third-party payment processors
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      2.2 Usage Data
                    </h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>Interactions with the application</li>
                      <li>Content of scheduled posts</li>
                      <li>Media files uploaded for posting</li>
                      <li>Scheduling preferences and patterns</li>
                      <li>Device information and IP address</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      2.3 Cookies and Tracking Technologies
                    </h3>
                    <p className="text-muted-foreground">
                      We use cookies and similar tracking technologies to
                      enhance your experience and collect information about how
                      you use PostMoore.
                    </p>
                  </div>
                </div>
              </section>

              {/* How We Use Your Information */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    3
                  </span>
                  How We Use Your Information
                </h2>
                <p className="text-muted-foreground mb-3">
                  We use your personal information to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Provide and maintain our service</li>
                  <li>Process and schedule your social media posts</li>
                  <li>Communicate with you regarding service updates</li>
                  <li>Improve our application based on usage patterns</li>
                  <li>Ensure the security of your account</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              {/* Data Sharing and Disclosure */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    4
                  </span>
                  Data Sharing and Disclosure
                </h2>
                <p className="text-muted-foreground mb-3">
                  We may share your information with:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4 mb-4">
                  <li>
                    <strong>Social Media Platforms</strong>: To post content on
                    your behalf
                  </li>
                  <li>
                    <strong>Service Providers</strong>: Third-party vendors who
                    assist in providing our services
                  </li>
                  <li>
                    <strong>Legal Requirements</strong>: When required by law,
                    court order, or governmental regulation
                  </li>
                  <li>
                    <strong>Business Transfers</strong>: In connection with a
                    merger, acquisition, or sale of assets
                  </li>
                </ul>
                <p className="text-muted-foreground font-medium">
                  We do not sell your personal information to third parties.
                </p>
              </section>

              {/* Data Security */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    5
                  </span>
                  Data Security
                </h2>
                <p className="text-muted-foreground">
                  We implement appropriate technical and organizational measures
                  to protect your personal information from unauthorized access,
                  loss, or alteration. However, no method of transmission over
                  the Internet or electronic storage is 100% secure.
                </p>
              </section>

              {/* Data Retention */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    6
                  </span>
                  Data Retention
                </h2>
                <p className="text-muted-foreground">
                  We retain your personal information only for as long as
                  necessary to fulfill the purposes outlined in this Privacy
                  Policy, unless a longer retention period is required by law.
                </p>
              </section>

              {/* Your Rights */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    7
                  </span>
                  Your Rights
                </h2>
                <p className="text-muted-foreground mb-3">
                  Depending on your location, you may have the right to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate data</li>
                  <li>Delete your personal information</li>
                  <li>Object to processing of your data</li>
                  <li>Data portability</li>
                  <li>Withdraw consent</li>
                </ul>
              </section>

              {/* Children's Privacy */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    8
                  </span>
                  Children's Privacy
                </h2>
                <p className="text-muted-foreground">
                  Our service is not intended for individuals under the age of
                  13. We do not knowingly collect personal information from
                  children under 13.
                </p>
              </section>

              {/* Third-Party Links */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    9
                  </span>
                  Third-Party Links
                </h2>
                <p className="text-muted-foreground">
                  Our application may contain links to third-party websites or
                  services. We are not responsible for the privacy practices or
                  content of these third-party sites.
                </p>
              </section>

              {/* International Data Transfers */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    10
                  </span>
                  International Data Transfers
                </h2>
                <p className="text-muted-foreground">
                  Your information may be transferred to and processed in
                  countries other than your country of residence. These
                  countries may have different data protection laws.
                </p>
              </section>

              {/* Changes to This Privacy Policy */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    11
                  </span>
                  Changes to This Privacy Policy
                </h2>
                <p className="text-muted-foreground">
                  We may update this Privacy Policy from time to time. We will
                  notify you of any changes by posting the new Privacy Policy on
                  this page and updating the "Last Updated" date.
                </p>
              </section>

              {/* Contact Us */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    12
                  </span>
                  Contact Us
                </h2>
                <p className="text-muted-foreground mb-4">
                  If you have any questions about this Privacy Policy, please
                  contact us at:
                </p>
                <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                  <div className="flex items-center text-muted-foreground">
                    <Mail className="h-4 w-4 mr-2 text-primary" />
                    <span>Email: privacy@postmoo.re</span>
                  </div>
                  <div className="flex items-start text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2 text-primary mt-0.5" />
                    <span>
                      Address: PostMoore Headquarters,Bucureşti Sectorul 1,
                      Bulevardul BUCUREŞTII NOI, Nr. 136, Parter, Ap. 5
                    </span>
                  </div>
                </div>
              </section>

              {/* Consent */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    13
                  </span>
                  Consent
                </h2>
                <p className="text-muted-foreground">
                  By using PostMoore, you consent to the collection and use of
                  information in accordance with this Privacy Policy.
                </p>
              </section>

              {/* Terms of Service Separator */}
              <div className="border-t border-muted my-12"></div>

              {/* Terms of Service Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-4">
                  Terms of Service
                </h1>
                <p className="text-muted-foreground">
                  These terms govern your use of PostMoore's social media
                  scheduling service.
                </p>
              </div>

              {/* Terms Sections */}
              {/* Acceptance of Terms */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    1
                  </span>
                  Acceptance of Terms
                </h2>
                <p className="text-muted-foreground">
                  By accessing or using PostMoore, you agree to be bound by
                  these Terms of Service and our Privacy Policy. If you do not
                  agree to these terms, please do not use our service.
                </p>
              </section>

              {/* Description of Service */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    2
                  </span>
                  Description of Service
                </h2>
                <p className="text-muted-foreground">
                  PostMoore is a social media scheduling and management platform
                  that allows users to schedule, publish, and manage content
                  across multiple social media platforms including Instagram,
                  TikTok, YouTube, and Bluesky.
                </p>
              </section>

              {/* User Accounts and Responsibilities */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    3
                  </span>
                  User Accounts and Responsibilities
                </h2>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    You are responsible for:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>
                      Maintaining the security of your account credentials
                    </li>
                    <li>All activities that occur under your account</li>
                    <li>
                      Ensuring your content complies with platform policies
                    </li>
                    <li>Providing accurate registration information</li>
                    <li>Promptly notifying us of any security breaches</li>
                  </ul>
                </div>
              </section>

              {/* Prohibited Uses */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    4
                  </span>
                  Prohibited Uses
                </h2>
                <p className="text-muted-foreground mb-3">
                  You may not use PostMoore to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Post harmful, offensive, or inappropriate content</li>
                  <li>Spam or engage in abusive behavior</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Distribute malware or malicious code</li>
                  <li>Engage in any activity that could harm our service</li>
                </ul>
              </section>

              {/* Content and Intellectual Property */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    5
                  </span>
                  Content and Intellectual Property
                </h2>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    <strong>Your Content:</strong> You retain ownership of all
                    content you upload to PostMoore. By using our service, you
                    grant us a limited license to process, store, and distribute
                    your content as necessary to provide our services.
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Our Platform:</strong> PostMoore and its original
                    content, features, and functionality are owned by us and are
                    protected by copyright, trademark, and other intellectual
                    property laws.
                  </p>
                </div>
              </section>

              {/* Payment Terms */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    6
                  </span>
                  Payment Terms
                </h2>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    If you choose a paid subscription plan:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>
                      Payments are processed through secure third-party
                      providers
                    </li>
                    <li>Subscriptions automatically renew unless cancelled</li>
                    <li>Refunds are subject to our refund policy</li>
                    <li>Price changes will be communicated in advance</li>
                    <li>You can cancel your subscription at any time</li>
                  </ul>
                </div>
              </section>

              {/* Termination */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    7
                  </span>
                  Termination
                </h2>
                <p className="text-muted-foreground">
                  We may terminate or suspend your account and access to
                  PostMoore immediately, without prior notice, if you breach
                  these Terms of Service. You may also terminate your account at
                  any time by contacting us or using the account deletion
                  feature.
                </p>
              </section>

              {/* Disclaimers */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    8
                  </span>
                  Disclaimers
                </h2>
                <p className="text-muted-foreground">
                  PostMoore is provided "as is" without warranties of any kind.
                  We do not guarantee that our service will be uninterrupted,
                  error-free, or completely secure. We are not responsible for
                  issues arising from third-party social media platforms.
                </p>
              </section>

              {/* Limitation of Liability */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    9
                  </span>
                  Limitation of Liability
                </h2>
                <p className="text-muted-foreground">
                  To the fullest extent permitted by law, PostMoore shall not be
                  liable for any indirect, incidental, special, consequential,
                  or punitive damages resulting from your use of our service,
                  including but not limited to loss of profits, data, or
                  business opportunities.
                </p>
              </section>

              {/* Governing Law */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    10
                  </span>
                  Governing Law
                </h2>
                <p className="text-muted-foreground">
                  These Terms of Service are governed by and construed in
                  accordance with the laws of Romania. Any disputes arising from
                  these terms will be resolved in the courts of Bucureşti,
                  Romania.
                </p>
              </section>

              {/* Changes to Terms */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    11
                  </span>
                  Changes to Terms
                </h2>
                <p className="text-muted-foreground">
                  We reserve the right to modify these Terms of Service at any
                  time. We will notify users of any material changes by posting
                  the updated terms on our website and updating the "Last
                  Updated" date. Your continued use of PostMoore after changes
                  constitutes acceptance of the new terms.
                </p>
              </section>

              {/* Contact Information */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <span className="bg-muted text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                    12
                  </span>
                  Contact Information
                </h2>
                <p className="text-muted-foreground mb-4">
                  If you have any questions about these Terms of Service, please
                  contact us at:
                </p>
                <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                  <div className="flex items-center text-muted-foreground">
                    <Mail className="h-4 w-4 mr-2 text-primary" />
                    <span>Email: legal@postmoo.re</span>
                  </div>
                  <div className="flex items-start text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2 text-primary mt-0.5" />
                    <span>
                      Address: PostMoore Headquarters, Bucureşti Sectorul 1,
                      Bulevardul BUCUREŞTII NOI, Nr. 136, Parter, Ap. 5
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Have questions about our privacy practices or terms of service?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:privacy@postmoo.re"
              className="inline-flex items-center text-primary hover:text-primary/80 font-semibold"
            >
              <Mail className="h-4 w-4 mr-2" />
              Privacy Team
            </a>
            <a
              href="mailto:legal@postmoo.re"
              className="inline-flex items-center text-primary hover:text-primary/80 font-semibold"
            >
              <Mail className="h-4 w-4 mr-2" />
              Legal Team
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
