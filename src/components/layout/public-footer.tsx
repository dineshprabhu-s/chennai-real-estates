import { Clock, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/common/container";
import { Logo } from "@/components/common/logo";
import { publicNavigation } from "@/config/navigation";
import { siteConfig } from "@/config/site";

const footerLinkClass =
  "text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground";

export function PublicFooter() {
  return (
    <footer className="border-t border-primary/20 bg-primary text-primary-foreground">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.4fr]">
          <div>
            <Logo inverse />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-primary-foreground/70">
              A single-broker property platform focused on Madipakkam and the
              neighbourhoods around it. Clear guidance, local context, and a
              shortlist worth your time.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-[0.16em] text-primary-foreground/50 uppercase">
              Explore
            </h2>
            <ul className="mt-4 space-y-3">
              {publicNavigation.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={footerLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-[0.16em] text-primary-foreground/50 uppercase">
              For the broker
            </h2>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href={siteConfig.links.adminLogin} className={footerLinkClass}>
                  Broker login
                </Link>
              </li>
              <li>
                <Link
                  href={siteConfig.links.adminDashboard}
                  className={footerLinkClass}
                >
                  Admin dashboard
                </Link>
              </li>
              <li>
                <Link href={siteConfig.links.areas} className={footerLinkClass}>
                  Area coverage
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-[0.16em] text-primary-foreground/50 uppercase">
              Contact
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-primary-foreground/70">
              <li>
                <a
                  href={siteConfig.contact.phoneHref}
                  className="inline-flex items-start gap-2.5 transition-colors hover:text-primary-foreground"
                >
                  <Phone aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {siteConfig.contact.phoneLabel}
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.contact.emailHref}
                  className="inline-flex items-start gap-2.5 break-all transition-colors hover:text-primary-foreground"
                >
                  <Mail aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="inline-flex items-start gap-2.5">
                <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>
                  {siteConfig.contact.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </span>
              </li>
              <li className="inline-flex items-start gap-2.5">
                <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {siteConfig.contact.hours}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-primary-foreground/15 pt-6 text-xs text-primary-foreground/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {siteConfig.name}. All rights reserved.</p>
          <p>
            Foundation preview · Sample listings and contact details are for
            interface development only.
          </p>
        </div>
      </Container>
    </footer>
  );
}
