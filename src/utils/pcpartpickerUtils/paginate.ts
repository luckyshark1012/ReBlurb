/*
  paginate.ts

  This file contains utility functions to be used inside pcPartPickerReviews.tsx to help seperate logic and improve logic flow


*/

// How many pages of reviews to paginate
const MAX_PAGES = 3;

// A function that fetches a given url and uses setReviews and setNoMoreReviews to update reviews found
// Count is incremented each call, and if count is greater than 0, or if a new url could not be found, recursion stops
export async function paginateReviews(
  url, // url to fetch on
  count: number, // current num pages fetched
  setReviews, // update reviews state
  setNoMoreReviews // update no more reviews state
) {
  try {
    console.log(url);
    // Query Selectors
    const reviewSelector = '.partReviews__review';
    const contentSelector = '.partReviews__writeup.markdown';
    await delay(1000);
    const response = await fetch(url); // fetch url
    const html = await response.text(); // convert to html
    // Begin parsing html
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const reviewElements = doc.querySelectorAll(reviewSelector);
    const newReviews = [];
    if (reviewElements.length <= 0) {
      // if no more reviews found, return after setting status
      setNoMoreReviews(true);
      return;
    }
    // for each review element, push back review if exists
    reviewElements.forEach((reviewElement) => {
      // Grab text content of current review
      const contentElement = reviewElement.querySelector(contentSelector);
      // If content exists, push back text onto reviews
      if (contentElement) {
        newReviews.push(contentElement.textContent.trim());
      }
    });
    // Update state of reviews by appending new reviews to old reviews
    setReviews((oldReviews) => [...oldReviews, ...newReviews]);

    // Try to grab next link
    // If we have a list of links and we haven't fetched too many reviews
    if (count < MAX_PAGES) {
      // Begin recursion on found next link
      await paginateReviews(
        url.replace(/page=\d{1}/, 'page=' + (count + 1)),
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

// This is grabbed from: https://stackoverflow.com/questions/37764665/how-to-implement-sleep-function-in-typescript
// NOTE: This is NOT my own code, but is simple enough utility that there is little other way to implement a sleep/delay in TS
export async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
