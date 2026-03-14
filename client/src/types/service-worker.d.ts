declare global {
  interface ServiceWorkerRegistration {
    waiting: ServiceWorker | null;
  }
}

export {};
