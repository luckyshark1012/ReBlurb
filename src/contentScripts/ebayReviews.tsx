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
    const allReviewsDivSelector = '.x-review-details__allreviews';
    const allReviewsPSelector = '.see--all--reviews';
    const actionSelectorItm = '.ux-action';
    const actionSelectorP = '.see--all--reviews-link';
    // First, try to check if see all reviews div exists, if so we will grab the link paginate all reviews
    const seeAllReviewsDivItm = document.querySelector(allReviewsDivSelector);
    const seeAllReviewsDivP = document.querySelector(allReviewsPSelector);
    // If we are on product listing page, begin pagination on the see all reviews page
    let seeAllReviewsLink = productUrl;
    if (seeAllReviewsDivItm) {
      seeAllReviewsLink = seeAllReviewsDivItm
        .querySelector(actionSelectorItm)
        .getAttribute('href');
    } else if (seeAllReviewsDivP) {
      seeAllReviewsLink = seeAllReviewsDivP
        .querySelector(actionSelectorP)
        .getAttribute('href');
    }
    paginateReviews(seeAllReviewsLink, 0, setReviews, setNoMoreReviews);
  }, []);

  useEffect(() => {
    if (noMoreReviews) {
      console.log(reviews);
      chrome.runtime.sendMessage({ reviews: reviews }, (response) => {
        response = JSON.parse(response);
        console.log('received data', response);
        setSummary(response.message);
      });
    }
  }, [noMoreReviews]);
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
