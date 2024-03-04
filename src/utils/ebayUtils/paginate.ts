const MAX_PAGES = 10;
export const paginateReviews = async (
  url,
  count,
  setReviews,
  setNoMoreReviews
) => {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const reviewElements = doc.querySelectorAll('.ebay-review-section-r');
    const newReviews = [];
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
    setReviews((oldReviews) => [...oldReviews, ...newReviews]);

    const paginate = doc.querySelector('ul.pagination li:last-child');
    if (paginate && count < MAX_PAGES) {
      const nextPageA = paginate.querySelector('.spf-link');
      const nextPageLink = nextPageA.getAttribute('href');
      const isDisabled = nextPageA.getAttribute('aria-disabled');
      if (isDisabled && isDisabled == 'true') {
        setNoMoreReviews(true);
        return;
      }
      await paginateReviews(
        nextPageLink,
        count + 1,
        setReviews,
        setNoMoreReviews
      );
    } else {
      setNoMoreReviews(true);
    }
  } catch (error) {
    console.error('Error fetching new reviews: ', error);
  }
};
