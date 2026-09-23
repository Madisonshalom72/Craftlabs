import { useEffect } from "react";

/**
 * Set page-level SEO meta tags (title, description, canonical, OG, Twitter).
 * Lightweight replacement for react-helmet — pure DOM, no dependency.
 * Cleans up on unmount so SPA navigations don't leak stale tags.
 */
export default function useSEO({
  title,
  description,
  canonical,
  image,
  type = "website",
  robots = "index,follow",
} = {}) {
  useEffect(() => {
    const prev = { title: document.title };
    if (title) document.title = title;

    const set = (selector, attr, value) => {
      if (!value) return null;
      let el = document.head.querySelector(selector);
      const created = !el;
      if (created) {
        el = document.createElement(selector.startsWith("meta") ? "meta" : "link");
        if (selector.startsWith('meta[name="')) {
          el.setAttribute("name", selector.match(/name="([^"]+)"/)[1]);
        } else if (selector.startsWith('meta[property="')) {
          el.setAttribute("property", selector.match(/property="([^"]+)"/)[1]);
        } else if (selector.startsWith('link[rel="')) {
          el.setAttribute("rel", selector.match(/rel="([^"]+)"/)[1]);
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
      return { el, created };
    };

    const tracked = [
      set('meta[name="description"]', "content", description),
      set('meta[name="robots"]', "content", robots),
      set('link[rel="canonical"]', "href", canonical || window.location.href),
      set('meta[property="og:title"]', "content", title),
      set('meta[property="og:description"]', "content", description),
      set('meta[property="og:type"]', "content", type),
      set('meta[property="og:url"]', "content", canonical || window.location.href),
      set('meta[property="og:image"]', "content", image),
      set('meta[name="twitter:card"]', "content", "summary_large_image"),
      set('meta[name="twitter:title"]', "content", title),
      set('meta[name="twitter:description"]', "content", description),
      set('meta[name="twitter:image"]', "content", image),
    ].filter(Boolean);

    return () => {
      document.title = prev.title;
      // Only remove tags WE created (leave any static-HTML ones alone)
      tracked.forEach(({ el, created }) => {
        if (created && el?.parentNode) el.parentNode.removeChild(el);
      });
    };
  }, [title, description, canonical, image, type, robots]);
}
