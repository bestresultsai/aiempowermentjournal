import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo";

// Platform footer. Subtle, full-width, sits at the bottom of every page.
// Designed to not compete with the page content above it.
//
// Hidden on auth pages — those use their own full-bleed layouts (e.g. the
// two-column Login) where the global footer would clash visually.
const HIDDEN_ON = ["/login", "/auth/", "/welcome"];

export default function Footer() {
  const { pathname } = useLocation();
  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(p))) return null;

  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-soft bg-surface-paper mt-16">
      <div className="max-w-[1180px] mx-auto px-6 lg:px-8 py-8 flex items-center justify-between gap-6 flex-wrap">
        {/* Left — small logo + copyright */}
        <div className="flex items-center gap-4 opacity-80">
          <Logo size="sm" />
          <div className="hidden sm:block w-px h-6 bg-soft" />
          <span className="text-[12px] text-ink-muted leading-relaxed">
            © {year} BestResults.AI · Your People. Your Organization.
          </span>
        </div>

        {/* Right — small link cluster */}
        <nav className="flex items-center gap-1 flex-wrap text-[12px]">
          <FooterLink to="/help">Help</FooterLink>
          <Dot />
          <FooterLink to="/privacy">Privacy</FooterLink>
          <Dot />
          <FooterLink to="/terms">Terms</FooterLink>
          <Dot />
          <FooterLink to="/nda">NDA</FooterLink>
          <Dot />
          <FooterLink to="/contact">Contact</FooterLink>
        </nav>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }) {
  return (
    <Link
      to={to}
      className="px-2 py-1 rounded text-ink-muted hover:text-ink hover:bg-ink/5 transition-colors font-heading font-medium"
    >
      {children}
    </Link>
  );
}

function Dot() {
  return <span className="w-1 h-1 rounded-full bg-ink-subtle/50" />;
}
