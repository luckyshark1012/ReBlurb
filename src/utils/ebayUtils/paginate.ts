/*
  paginate.ts

  This file contains utility functions to be used inside ebayReviews.tsx to help seperate logic and improve logic flow
*/

// How many pages of reviews to paginate
const MAX_PAGES = 10;

// A function that fetches a given url and uses setReviews and setNoMoreReviews to update reviews found
// Count is incremented each call, and if count is greater than 0, or if a new url could not be found, recursion stops
export async function paginateReviews(
  url, // url to fetch on
  count, // current num pages fetched
  setReviews, // update reviews state
  setNoMoreReviews // update no more reviews state
) {
  try {
    const response = await fetch(url); // fetch url
    const html = await response.text(); // convert to html
    // Begin parsing html
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const reviewElements = doc.querySelectorAll('.ebay-review-section-r');
    const newReviews = [];
    // for each review element, push back review if exists
    reviewElements.forEach((reviewElement) => {
      // Grab text content of current review
      const contentElement = reviewElement.querySelector(
        '.review-item-content'
      );
      // If content exists, push back text onto reviews
      if (contentElement) {
        newReviews.push(contentElement.textContent.trim());
      }
    });
    // Update state of reviews by appending new reviews to old reviews
    setReviews((oldReviews) => [...oldReviews, ...newReviews]);

    // Try to grab next link
    const paginate = doc.querySelector('ul.pagination li:last-child');
    // If we have a list of links and we haven't fetched too many reviews
    if (paginate && count < MAX_PAGES) {
      const nextPageA = paginate.querySelector('.spf-link');
      const nextPageLink = nextPageA.getAttribute('href');
      const isDisabled = nextPageA.getAttribute('aria-disabled');
      // If link is disabled, we have exhausted all pages, update noMoreReviews and return
      if (isDisabled && isDisabled == 'true') {
        setNoMoreReviews(true);
        return;
      }
      // Begin recursion on found next link
      await paginateReviews(
        nextPageLink,
        count + 1, // increment by 1 to indicate we are fetching 1 more page
        setReviews,
        setNoMoreReviews
      );
    } else {
      // if paginate didn't exist or have fetched max num pages, update noMoreReviews state and return
      setNoMoreReviews(true);
      return;
    }
  } catch (error) {
    console.error('Error fetching new reviews: ', error);
  }
}
