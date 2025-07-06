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
              Privacy Policy
            </h1>
          </div>
          <Badge variant="secondary" className="bg-muted text-foreground">
            Last Updated: August 1, 2023
          </Badge>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            We respect your privacy and are committed to protecting your
            personal data. This policy explains how we handle your information.
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
                  Welcome to PostMore ("we," "our," or "us"). We respect your
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
                      you use PostMore.
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
                      Address: PostMore Headquarters,Bucureşti Sectorul 1,
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
                  By using PostMore, you consent to the collection and use of
                  information in accordance with this Privacy Policy.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Have questions about our privacy practices?
          </p>
          <a
            href="mailto:privacy@postmore.app"
            className="inline-flex items-center text-primary hover:text-primary/80 font-semibold"
          >
            <Mail className="h-4 w-4 mr-2" />
            Contact our privacy team
          </a>
        </div>
      </div>
    </div>
  );
}
