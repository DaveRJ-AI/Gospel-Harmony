import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

type MenuLayout = "inline" | "stacked" | "compact";

export default function SiteHeader() {
  const { pathname } = useLocation();
  const storyRoute = pathname.startsWith("/story/");
  const eventsSection = storyRoute || pathname.replace(/\/$/, "") === "/stories";
  const [layout, setLayout] = React.useState<MenuLayout>("stacked");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const headerRef = React.useRef<HTMLElement>(null);
  const brandRef = React.useRef<HTMLDivElement>(null);
  const navigationRef = React.useRef<HTMLElement>(null);
  const toggleRef = React.useRef<HTMLButtonElement>(null);
  const compact = layout === "compact";

  React.useLayoutEffect(() => {
    const header = headerRef.current;
    const brand = brandRef.current;
    const navigation = navigationRef.current;
    if (!header || !brand || !navigation) return;
    const labels = Array.from(navigation.querySelectorAll("a > span"));

    const updateLayout = () => {
      const navStyle = getComputedStyle(navigation);
      const linkStyle = getComputedStyle(navigation.querySelector("a")!);
      const widestLabel = Math.max(...labels.map((label) => label.getBoundingClientRect().width), 0);
      const buttonInsets = parseFloat(linkStyle.paddingLeft) + parseFloat(linkStyle.paddingRight)
        + parseFloat(linkStyle.borderLeftWidth) + parseFloat(linkStyle.borderRightWidth);
      const navInsets = parseFloat(navStyle.paddingLeft) + parseFloat(navStyle.paddingRight)
        + parseFloat(navStyle.borderLeftWidth) + parseFloat(navStyle.borderRightWidth);
      const menuWidth = Math.ceil(
        (widestLabel + buttonInsets) * labels.length
        + parseFloat(navStyle.columnGap) * (labels.length - 1) + navInsets,
      );
      const room = header.clientWidth;
      const inlineGap = parseFloat(getComputedStyle(header).getPropertyValue("--header-inline-gap"));
      const fitsBesideBrand = brand.getBoundingClientRect().width + inlineGap + menuWidth + 4 <= room;
      const shortDesktop = matchMedia("(min-width: 761px) and (max-height: 850px)").matches;

      setLayout(fitsBesideBrand ? "inline" : menuWidth <= room && !shortDesktop ? "stacked" : "compact");
    };

    updateLayout();
    const observer = new ResizeObserver(updateLayout);
    observer.observe(header);
    observer.observe(brand);
    labels.forEach((label) => observer.observe(label));
    window.addEventListener("resize", updateLayout);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateLayout);
    };
  }, []);

  React.useEffect(() => setMenuOpen(false), [pathname, compact]);

  React.useEffect(() => {
    if (!compact || !menuOpen) return;

    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [compact, menuOpen]);

  return (
    <header
      ref={headerRef}
      className="header"
      data-menu-layout={layout}
      onKeyDown={(event) => {
        if (event.key === "Escape" && compact && menuOpen) {
          event.preventDefault();
          setMenuOpen(false);
          toggleRef.current?.focus();
        }
      }}
    >
      <div ref={brandRef} className="brand">
        <img className="brandLogo" src="/logo.png" alt="Gospel Harmonics logo" width={80} height={80} />
        <div>
          <h1>Gospel Harmonics</h1>
          <small>Chapter + Event parallels in 4 columns</small>
        </div>
      </div>

      <button
        ref={toggleRef}
        className="menuToggle"
        type="button"
        aria-expanded={compact && menuOpen}
        aria-controls="site-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span aria-hidden="true">☰</span>
        Menu
      </button>

      <nav
        ref={navigationRef}
        id="site-navigation"
        className="nav"
        aria-label="Main navigation"
        aria-hidden={compact && !menuOpen ? true : undefined}
        onClick={(event) => {
          if (compact && event.target instanceof Element && event.target.closest("a")) setMenuOpen(false);
        }}
      >
        <NavLink to="/" end><span>Chapters</span></NavLink>
        <Link
          to="/stories"
          className={eventsSection ? "sectionActive" : undefined}
          aria-current={eventsSection ? (storyRoute ? "location" : "page") : undefined}
        >
          <span>Events</span>
        </Link>
        <NavLink to="/timeline"><span>Timeline</span></NavLink>
        <NavLink to="/types"><span>Themes</span></NavLink>
        <NavLink to="/map"><span>Map</span></NavLink>
        <NavLink to="/art"><span>Artwork</span></NavLink>
        <NavLink to="/about"><span>About</span></NavLink>
      </nav>
    </header>
  );
}
