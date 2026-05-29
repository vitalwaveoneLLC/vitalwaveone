// src/utils/lazyLoad.jsx
// Lazy loading component wrapper for code splitting
import { lazy, Suspense } from 'react';

const Spinner = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#f5f5f5',
  }}>
    <div style={{ textAlign: 'center', color: '#666' }}>
      <div style={{ fontSize: 24, marginBottom: 16 }}>⏳</div>
      <div>Loading...</div>
    </div>
  </div>
);

/**
 * Lazy load a component with fallback spinner
 * Usage: const Dashboard = lazyComponent(() => import('./Dashboard.jsx'))
 */
export function lazyComponent(loader, fallback = <Spinner />) {
  const LazyComponent = lazy(loader);

  return (props) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Batch lazy load multiple components
 * Usage: const { Dashboard, Orders, Products } = lazyComponents({
 *   Dashboard: () => import('./Dashboard'),
 *   Orders: () => import('./Orders'),
 *   Products: () => import('./Products'),
 * })
 */
export function lazyComponents(components) {
  const lazyLoaded = {};

  for (const [name, loader] of Object.entries(components)) {
    lazyLoaded[name] = lazyComponent(loader);
  }

  return lazyLoaded;
}

/**
 * Defer component loading until component is visible (Intersection Observer)
 */
export function deferredLoad(loader, options = {}) {
  const { threshold = 0.1, rootMargin = '50px' } = options;

  return lazy(async () => {
    return new Promise((resolve) => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            observer.disconnect();
            // Load component after a small delay to avoid blocking
            setTimeout(() => resolve(loader()), 100);
          }
        },
        { threshold, rootMargin }
      );

      // Create a temporary div to observe
      const el = document.createElement('div');
      observer.observe(el);
    });
  });
}

export default { lazyComponent, lazyComponents, deferredLoad };
