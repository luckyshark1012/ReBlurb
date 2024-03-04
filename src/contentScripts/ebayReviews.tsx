import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Paper from '@mui/material/Paper';
import { Typography, Stack } from '@mui/material';
import { GiRobotAntennas } from 'react-icons/gi';
import './ebayReviews.css';
import { paginateReviews } from '../utils/ebayUtils/paginate';

const MAX_PAGES = 10;

const App: React.FC<{}> = () => {
  const [summary, setSummary] = useState<string | null>(null);
  const [reviews, setReviews] = useState([]);
  const [noMoreReviews, setNoMoreReviews] = useState<boolean>(false);
  const productUrl = window.location.href;

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    // If there are no more reviews to grab, send a message to background script to summarize these reviews
    if (noMoreReviews) {
      console.log(reviews);
      chrome.runtime.sendMessage({ reviews: reviews }, (response) => {
        response = JSON.parse(response);
        console.log('received data', response);
        setSummary(response.message); // update summary with message received
      });
    }
  }, [noMoreReviews]); // Run effect on update of noMoreReviews
  return (
    <>
      {noMoreReviews && reviews.length > 0 ? (
        <Paper className="summaryReview">
          <Stack direction="column" alignItems="center" useFlexGap>
            <Stack direction="row" alignItems="baseline">
              <GiRobotAntennas fontSize="48px" />
              <Typography variant="h5" fontSize="24px">
                Product Summary
              </Typography>
            </Stack>
            {summary !== null ? <p>{summary}</p> : 'Loading...'}
          </Stack>
        </Paper>
      ) : null}
    </>
  );
};

const container = document.createElement('div');
document.body.appendChild(container);
const root = createRoot(container);
root.render(<App />);
