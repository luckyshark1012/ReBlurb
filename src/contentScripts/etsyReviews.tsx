import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './summary.css';
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
    setSummary(null);
    setForceRefresh(true);
    if (!alreadyInDB) {
      setAlreadyInDB(true);
    }
  };
  useEffect(() => {
    let itmIdMatch1 = productUrl.match(/listing[/](\d{10})/);
    let itmId = '';
    if (itmIdMatch1) {
      itmId = itmIdMatch1[1];
    }
    chrome.runtime.sendMessage(
      {
        site: 'Etsy',
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
    if (alreadyInDB) {
      // Etsy is organized pretty straightforward, these are the two selectors I will be using to get reviews
      const reviewDivSelector = '.wt-grid__item-xs-12.review-card';
      const reviewCardBodyP =
        '.wt-text-truncate--multi-line.wt-break-word.wt-text-body';
      // Reviews are loaded dynamically opposed to fetching pages, so we will just click the button directly
      const maxPages = 10;
      let count = 0;
      let firstReview = '';
      let continueTop = false;
      // Countdown is used so we give a bit of time for page to update before parsing reviews (I don't like this, oh well)
      let countdown = 1000;
      // I want to iterate at most 10 pages of reviews (40 total)
      while (count < maxPages) {
        // Get review cards of current page
        let reviewCardDivs = document.querySelectorAll(reviewDivSelector);
        let reviewsFound = []; // keep track of reviews found
        let firstReviewSelected = false;
        // For each review card
        for (let index = 0; index < reviewCardDivs.length; index++) {
          const review = reviewCardDivs[index];
          // Grab p element with review text
          const content = review.querySelector(reviewCardBodyP);
          // if element exists
          if (content) {
            // If we have seen this review before, try again later (wait for dom to update)
            if (firstReview == content.textContent.trim()) {
              countdown -= 1;
              continueTop = true;
              break;
            }
            // If review not seen before and this is the first review, update firstreview
            if (firstReviewSelected == false) {
              firstReview = content.textContent.trim();
              firstReviewSelected = true;
              countdown = 1000;
            }
            // push review onto list
            reviewsFound.push(content.textContent.trim());
          }
        }
        // check whether we need to keep iterating
        if (continueTop) {
          if (countdown == 0) {
            break;
          }
          continueTop = false;
          continue;
        }
        // update state of reviews by appending the reviews found to old reviews
        setReviews((oldReviews) => [...oldReviews, ...reviewsFound]);
        // Get button to click for pagination
        const nextPageASelector =
          '.wt-action-group__item.wt-btn.wt-btn--small.wt-btn--icon';
        // Cast to an anchor so we can click on it
        let nextPageAnchors =
          document.querySelectorAll<HTMLAnchorElement>(nextPageASelector);
        // check if at least 1 anchor element found
        if (nextPageAnchors.length > 0) {
          nextPageAnchors[nextPageAnchors.length - 1].click();
        } else {
          break;
        }
        // increment count (num pages looked at so far)
        count += 1;
      }
      // Set state of noMoreReviews to begin processing of reviews
      setNoMoreReviews(true);
    }
  }, [alreadyInDB]);

  useEffect(() => {
    // If there are no more reviews to grab, send a message to background script to summarize these reviews
    if (alreadyInDB && noMoreReviews && forceRefresh) {
      let itmIdMatch1 = productUrl.match(/listing[/](\d{10})/);
      let itmId = '';
      if (itmIdMatch1) {
        itmId = itmIdMatch1[1];
      }
      chrome.runtime.sendMessage(
        {
          reviews: reviews,
          site: 'Etsy',
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
