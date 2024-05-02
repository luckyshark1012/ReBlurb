import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Paper from '@mui/material/Paper';
import { Typography, Stack, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import './ebayReviews.css';
import { paginateReviews } from '../utils/pcpartpickerUtils/paginate';

const App: React.FC<{}> = () => {
  const [summary, setSummary] = useState<string | null>(null);
  const [reviews, setReviews] = useState([]);
  const [hideSummary, setHideSummary] = useState(false);
  const [noMoreReviews, setNoMoreReviews] = useState<boolean>(false);
  const [forceRefresh, setForceRefresh] = useState<boolean>(true);
  const productUrl = window.location.href;

  const handleHideSummary = () => {
    setHideSummary(true);
  };
  const handleRefreshSummary = () => {
    setForceRefresh(true);
  };
  useEffect(() => {
    // Query Selectors
    /*
    const allReviewsItmSelector = '.x-review-details__allreviews';
    const allReviewsPSelector = '.see--all--reviews';
    const actionSelectorItm = '.ux-action';
    const actionSelectorP = '.see--all--reviews-link'; */
    const allReviewsDivSelector = '.block.partReviews';
    const anchorAllReviewSelector = '.button.button--small';
    // First, try to check if see all reviews div exists, if so we will grab the link paginate all reviews
    // Ebay has two different urls for products, a https://www.ebay.com/itm/... & https://www.ebay.com/p/...
    // For whatever reason, the DOM is the same with slightly different class names for some elements, such as for the allReviews link
    // In the below implementation, we query the document twice using both selectors to cover both cases, we will then use the one that is not null
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
  }, []);

  useEffect(() => {
    // If there are no more reviews to grab, send a message to background script to summarize these reviews
    if (noMoreReviews && forceRefresh) {
      let itmIdMatch1 = productUrl.match(/product[/]([a-zA-Z0-9]{6})/);
      console.log(reviews);
      let itmId = '';
      if (itmIdMatch1) {
        itmId = itmIdMatch1[1];
      }
      console.log(itmId);
      chrome.runtime.sendMessage(
        {
          reviews: reviews,
          site: 'PcPartPicker',
          itmId: itmId,
          forceRefresh: forceRefresh,
        },
        (response) => {
          response = JSON.parse(response);
          console.log('received data', response);
          setSummary(response.message); // update summary with message received
          setForceRefresh(false);
        }
      );
    }
  }, [noMoreReviews, forceRefresh]); // Run effect on update of noMoreReviews
  return (
    <>
      {!hideSummary && noMoreReviews && reviews.length > 0 ? (
        <Paper className="summaryReview" elevation={24}>
          <IconButton
            style={{ position: 'absolute', top: '0px', left: '0px' }}
            onClick={handleRefreshSummary}
          >
            <RefreshIcon />
          </IconButton>
          <IconButton
            style={{ position: 'absolute', top: '0px', right: '0px' }}
            onClick={handleHideSummary}
          >
            <CloseIcon />
          </IconButton>
          <Stack direction="column" alignItems="center" useFlexGap>
            <Stack direction="row" alignItems="baseline">
              <Typography
                variant="h5"
                fontSize="24px"
                justifyContent="space-between"
                width="100%"
                marginTop="16px"
                marginBottom="16px"
              >
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
