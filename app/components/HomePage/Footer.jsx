import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <Image
                src="/PostmooreSvg.svg"
                alt="PostMoore Logo"
                width={200}
                height={80}
                className="h-auto w-auto max-h-[80px] max-w-[200px] object-contain"
              />
            </div>
            <p className="text-muted-foreground mb-4">
              Cross-Platform content scheduling for everyone
            </p>
            <div className="flex space-x-4">
              <Link
                href="https://x.com/postmoore_?s=21"
                className="text-gray-400 hover:text-white transition-colors"
              >
                X
              </Link>
              <Link
                href="https://www.linkedin.com/company/postmoore/"
                className="text-gray-400 hover:text-white transition-colors"
              >
                LinkedIn
              </Link>
              <Link
                href="https://www.facebook.com/share/16g3Th2B9w/?mibextid=wwXIfr"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Facebook
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/prices"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Blog
                </Link>
              </li>

              <li>
                <Link
                  href="/privacy"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Help Center
                </Link>
              </li>

              <li>
                <Link
                  href="/privacy"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy/terms-of-service"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center">
          <p className="text-muted-foreground">
            © 2025 PostMoore. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
