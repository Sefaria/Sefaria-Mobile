import { useEffect } from 'react';
import CrashlyticsService from './analytics/crashlytics';
import { getLocalBookList } from './DownloadControl';
import { devError } from './devUtils';

// Crashlytics attribute values are capped at 1024 chars, so only log a bounded sample of titles
const MAX_LOGGED_BOOKS = 20;

export const ErrorBoundaryFallbackComponent = ({ error }) => {
  useEffect(() => {
    if (!(error instanceof Error)) { return; }

    const logErrorToCrashlytics = async () => {
      let downloadedBooks = [];
      try {
        downloadedBooks = await getLocalBookList();
      } catch {
        // best effort only, don't block error reporting on download-state lookup failing
      }

      try {
        await CrashlyticsService.recordError(error, {
          downloadedBookCount: downloadedBooks.length,
          downloadedBooks: downloadedBooks.slice(0, MAX_LOGGED_BOOKS).join(', '),
        });
      } catch (e) {
        devError('Failed to log ErrorBoundary error to crashlytics:', e);
      }
    };
    logErrorToCrashlytics();
  }, [error]);

  return null;
};
