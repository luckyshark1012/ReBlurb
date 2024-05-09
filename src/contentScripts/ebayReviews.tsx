import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './summary.css';
import { paginateReviews } from '../utils/ebayUtils/paginate';
import { Summary } from '../utils/general/general';

const App: React.FC<{}> = () => {
  const [summary, setSummary] = useState<string | null>(null);
  const [reviews, setReviews] = useState([]);
  const [hideSummary, setHideSummary] = useState(false);
  const [noMoreReviews, setNoMoreReviews] = useState<boolean>(false);
  const [forceRefresh, setForceRefresh] = useState<boolean>(true);
  const [alreadyInDB, setAlreadyInDB] = useState<boolean>(false);
  const productUrl = window.location.href;

  const handleHideSummary = () => {
    setHideSummary(true);
  };
  const handleRefreshSummary = () => {
    setForceRefresh(true);
    if (!alreadyInDB) {
      setAlreadyInDB(true);
    }
  };
  useEffect(() => {
    let itmIdMatch1 = productUrl.match(/itm[=/](\d{12})/);
    let itmIdMatch2 = productUrl.match(/(?:p|product-reviews)\/(\d{10})/);
    let itmId = '';
    if (itmIdMatch1) {
      itmId = itmIdMatch1[1];
    } else if (itmIdMatch2) {
      itmId = itmIdMatch2[1];
    }
    chrome.runtime.sendMessage(
      {
        site: 'Ebay',
        itmId: itmId,
      },
      (response) => {
        response = JSON.parse(response);
        if (response.inDB) {
          setSummary(response.summary);
          setHideSummary(false);
        } else {
          setAlreadyInDB(true);
        }
      }
    );
  }, []);
  useEffect(() => {
    setSummary(null);
    if (alreadyInDB) {
      // Query Selectors
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
      }
      // Begin pagination on found link
      paginateReviews(seeAllReviewsLink, 0, setReviews, setNoMoreReviews);
    }
  }, [alreadyInDB]);

  useEffect(() => {
    // If there are no more reviews to grab, send a message to background script to summarize these reviews
    if (alreadyInDB && noMoreReviews && forceRefresh) {
      let itmIdMatch1 = productUrl.match(/itm[=/](\d{12})/);
      let itmIdMatch2 = productUrl.match(/(?:p|product-reviews)\/(\d{10})/);
      let itmId = '';
      if (itmIdMatch1) {
        itmId = itmIdMatch1[1];
      } else if (itmIdMatch2) {
        itmId = itmIdMatch2[1];
      }
      chrome.runtime.sendMessage(
        {
          reviews: reviews,
          site: 'Ebay',
          itmId: itmId,
          forceRefresh: forceRefresh,
        },
        (response) => {
          response = JSON.parse(response);
          setSummary(response.message); // update summary with message received
          setForceRefresh(false);
        }
      );
    }
  }, [noMoreReviews, forceRefresh]); // Run effect on update of noMoreReviews
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
