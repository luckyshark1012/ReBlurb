import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './summary.css';
import { paginateReviews } from '../utils/ebayUtils/paginate';
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
    // To be safe and for user clarity, set summary to null so we show loading message while scraping (and processing in future)
    setSummary(null);
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
    // Grab product ID, there are two possible matches on eBay
    let itmIdMatch1 = productUrl.match(/itm[=/](\d{12})/);
    let itmIdMatch2 = productUrl.match(/(?:p|product-reviews)\/(\d{10})/);
    let itmId = '';
    if (itmIdMatch1) {
      // if we matched on first, update itmId
      itmId = itmIdMatch1[1];
    } else if (itmIdMatch2) {
      // if we matched on second, update itmId
      itmId = itmIdMatch2[1];
    }
    // Send a message to be handled by background script, query backend and check if a summary exists already before scraping
    chrome.runtime.sendMessage(
      {
        site: 'Ebay',
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
    if (alreadyInDB) {
      // Query Selectors
      // Since eBay was the first website supported, this is really clunky
      // Possibly refactoring and examination of html code may lead to cleaner querying of DOM elements
      const allReviewsItmSelector = '.x-review-details__allreviews';
      const allReviewsPSelector = '.see--all--reviews';
      const actionSelectorItm = '.ux-action';
      const actionSelectorP = '.see--all--reviews-link';

      // First, try to check if see all reviews div exists, if so we will grab the link paginate all reviews
      // Ebay has two different urls for products, a https://www.ebay.com/itm/... & https://www.ebay.com/p/...
      // For whatever reason, the DOM is the same with slightly different class names for some elements, such as for the allReviews link
      // In the below implementation, we query the document twice using both selectors to cover both cases, we will then use the one that is not null
      const seeAllReviewsDivItm = document.querySelector(allReviewsItmSelector);
      const seeAllReviewsDivP = document.querySelector(allReviewsPSelector);

      // Treat as if we are already on the all reviews page unless we get an actual link from the DOM
      let seeAllReviewsLink = productUrl;
      if (seeAllReviewsDivItm) {
        // if div is found from itm version, update link
        seeAllReviewsLink = seeAllReviewsDivItm
          .querySelector(actionSelectorItm)
          .getAttribute('href');
      } else if (seeAllReviewsDivP) {
        // if div is found from p version, update link
        seeAllReviewsLink = seeAllReviewsDivP
          .querySelector(actionSelectorP)
          .getAttribute('href');
      } else {
        setHideSummary(true);
      }
      // Begin pagination on found link
      paginateReviews(seeAllReviewsLink, 0, setReviews, setNoMoreReviews);
    }
  }, [alreadyInDB]);

  // Take scraped reviews and query the backend for a summary to display
  // RUN ONLY ON UPDATE OF noMoreReviews OR forceRefresh
  useEffect(() => {
    // If there are no more reviews to grab, send a message to background script to summarize these reviews
    if (alreadyInDB && noMoreReviews && forceRefresh) {
      // Again, eBay has two possible urls for a product, grab the appropiate itmId
      let itmIdMatch1 = productUrl.match(/itm[=/](\d{12})/);
      let itmIdMatch2 = productUrl.match(/(?:p|product-reviews)\/(\d{10})/);
      let itmId = '';
      if (itmIdMatch1) {
        itmId = itmIdMatch1[1];
      } else if (itmIdMatch2) {
        itmId = itmIdMatch2[1];
      }
      // Send a message to background script to summarize scraped reviews
      chrome.runtime.sendMessage(
        {
          reviews: reviews,
          site: 'Ebay',
          itmId: itmId,
          forceRefresh: forceRefresh,
        },
        (response) => {
          // parse response
          response = JSON.parse(response);
          setSummary(response.message); // update summary with message received
          setForceRefresh(false);
        }
      );
    }
  }, [noMoreReviews, forceRefresh]); // Run effect on update of noMoreReviews
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
