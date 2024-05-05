import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './summary.css';
import { paginateReviews } from '../utils/pcpartpickerUtils/paginate';
import { Summary } from '../utils/general/general';

const App: React.FC<{}> = () => {
  // State variables and functions
  const [summary, setSummary] = useState<string | null>(null);
  const [reviews, setReviews] = useState([]);
  const [hideSummary, setHideSummary] = useState(false);
  const [noMoreReviews, setNoMoreReviews] = useState<boolean>(false);
  const [forceRefresh, setForceRefresh] = useState<boolean>(true);
  // alreadyInDB is a bit misleading of a name, i wrote my logic treating as if a summary was already made prev.
  const [alreadyInDB, setAlreadyInDB] = useState<boolean>(false);

  // Grab the url of current page
  const productUrl = window.location.href;

  const handleHideSummary = () => {
    setHideSummary(true);
  };

  const handleRefreshSummary = () => {
    // Query backend by force
    setForceRefresh(true);
    // If not in DB / we haven't scraped reviews yet, then set state
    if (!alreadyInDB) {
      setAlreadyInDB(true);
    }
  };

  // Check if a summary was made previously so we don't waste resources scraping / wasting backend resources
  // DO THIS FIRST ALWAYS
  useEffect(() => {
    // grab product ID
    let itmIdMatch = productUrl.match(/product[/]([a-zA-Z0-9]{6})/);
    let itmId = ''; // itmId being empty string is okay (this is a catch all for each website)
    if (itmIdMatch) {
      // if we matched, update itmId
      itmId = itmIdMatch[1];
    }
    // Send a message to be handled by background script, query backend and check if a summary exists already before scraping
    chrome.runtime.sendMessage(
      {
        site: 'PcPartPicker',
        itmId: itmId,
      },
      (response) => {
        // Parse response
        response = JSON.parse(response);
        // if a summary was found, set and show the summary
        if (response.inDB) {
          setSummary(response.summary);
          setHideSummary(false);
        } else {
          // else update AlreadyInDB flag to begin scraping
          setAlreadyInDB(true);
        }
      }
    );
  }, []);

  // Find page to start pagination on
  // RUNS ONLY ON UPDATE TO alreadyInDB FLAG
  useEffect(() => {
    // To be safe and for user clarity, set summary to null so we show loading message while scraping (and processing in future)
    setSummary(null);
    // If flag set, begin querying
    if (alreadyInDB) {
      // Query Selectors
      const allReviewsDivSelector = '.block.partReviews';
      const anchorAllReviewSelector = '.button.button--small';
      // Grab the div holding see all reviews button from current DOM
      const seeAllReviewsDiv = document.querySelector(allReviewsDivSelector);

      // Treat as if we are already on the all reviews page unless we get an actual link from the DOM
      let seeAllReviewsLink = productUrl;
      if (seeAllReviewsDiv) {
        // if div is found, check if we can grab link
        const anchorElement = seeAllReviewsDiv.querySelector(
          anchorAllReviewSelector
        );
        // if anchor element found, update link
        if (anchorElement) {
          seeAllReviewsLink = anchorElement.getAttribute('href');
        }
      }
      // Begin pagination on found link
      paginateReviews(
        seeAllReviewsLink + '?page=1',
        1,
        setReviews,
        setNoMoreReviews
      );
    }
  }, [alreadyInDB]); // only run on update to alreadyInDB flag

  // Take scraped reviews and query the backend for a summary to display
  // RUN ONLY ON UPDATE OF noMoreReviews OR forceRefresh
  useEffect(() => {
    // If there are no more reviews & alreadyInDB & forceRefresh flags set
    if (alreadyInDB && noMoreReviews && forceRefresh) {
      // Grab the itms unique id from url
      let itmIdMatch = productUrl.match(/product[/]([a-zA-Z0-9]{6})/);
      let itmId = '';
      if (itmIdMatch) {
        itmId = itmIdMatch[1];
      }
      // Send a message to background script to summarize scraped reviews
      chrome.runtime.sendMessage(
        {
          reviews: reviews,
          site: 'PcPartPicker',
          itmId: itmId,
          forceRefresh: forceRefresh,
        },
        (response) => {
          // parse response
          response = JSON.parse(response);
          setSummary(response.message); // update summary with message received
          setForceRefresh(false); // reset forceRefresh flag
        }
      );
    }
  }, [noMoreReviews, forceRefresh]); // Run effect on update of noMoreReviews and/or forceRefresh
  // Return the summary element displayed to DOM
  return Summary(
    hideSummary,
    noMoreReviews,
    reviews,
    handleRefreshSummary,
    handleHideSummary,
    summary
  );
};

const container = document.createElement('div');
document.body.appendChild(container);
const root = createRoot(container);
root.render(<App />);
