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
      } catch (e) {
        // best effort only, don't block error reporting on download-state lookup failing
      }

      await CrashlyticsService.recordError(error, {
        downloadedBookCount: downloadedBooks.length,
        downloadedBooks: downloadedBooks.slice(0, MAX_LOGGED_BOOKS).join(', '),
      });
    };
    logErrorToCrashlytics().catch(e => devError('Failed to log ErrorBoundary error to crashlytics:', e));
  }, [error]);

  return null;
};
