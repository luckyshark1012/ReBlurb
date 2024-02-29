import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Paper from '@mui/material/Paper';
import './ebayReviews.css';

const App: React.FC<{}> = () => {
  const [summary, setSummary] = useState<string | null>(null);
  const productUrl = window.location.href;
  useEffect(() => {
    fetch(productUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Response not ok');
        }
        return response.text(); // Grab HTML of product page
      })
      .then((html) => {
        // Begin parsing HTML
        // Grab each review from reviews of current product
        const reviewElements = document.querySelectorAll(
          '.ebay-review-section-r'
        );
        const reviews = [];
        // For each review element in reviewElements
        reviewElements.forEach((reviewElement) => {
          // Grab text content of current review
          const contentElement = reviewElement.querySelector(
            '.review-item-content'
          );
          // If content exists, push back text onto reviews
          if (contentElement) {
            reviews.push(contentElement.textContent.trim());
          }
        });
        console.log('reviews:', reviews);
        chrome.runtime.sendMessage({ reviews: reviews }, (response) => {
          response = JSON.parse(response);
          console.log('received data', response);
          setSummary(response.message);
        });
      });
  }, []);
  return (
    <Paper className="summaryReview">
      {summary !== null ? <p>{summary}</p> : 'Loading...'}
    </Paper>
    /*
    <div className="summaryReview">
    </div>
    */
  );
};

const container = document.createElement('div');
document.body.appendChild(container);
const root = createRoot(container);
root.render(<App />);
