/* Listen for a message, and begin handling when received*/
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // If the request contains reviews
  if (request.reviews != null) {
    // Call queryBackend to send reviews to webserver to get a summary
    insertIntoBackend(
      request.reviews,
      request.site,
      request.itmId,
      request.forceRefresh
    )
      .then(async (summary) => {
        // have to mark as async so we can use await
        // Send information back to the content script that includes the summary, indicate that everything went okay!
        sendResponse(
          JSON.stringify({ failure: false, message: summary.message })
        );
      })
      .catch((error) => {
        console.log(error);
        // Send back a response indicating a failure occured
        sendResponse({ failure: true });
      });
    // Make asynchronous here: https://developer.chrome.com/docs/extensions/develop/concepts/messaging
    return true;
  } else {
    // if no reviews were included in the message, then check if the product is stored in our DB
    checkInDB(request.site, request.itmId).then(async (response) => {
      // Turn the response into a string repr
      JSON.stringify({
        failure: false,
        inDB: response.inDB,
        summary: response.summary,
      });
      // Send a response back with the possible summary
      sendResponse(
        JSON.stringify({
          failure: false,
          inDB: response.inDB,
          summary: response.summary,
        })
      );
    });
    // Make asynchronous here: https://developer.chrome.com/docs/extensions/develop/concepts/messaging
    return true;
  }
});

/* On installation of chrome extension, initialize some default data */
chrome.runtime.onInstalled.addListener((details) => {
  // Call helper to init data
  initializeDefaultData();
});

/* Currently, sets the default promptType to sentences */
function initializeDefaultData() {
  chrome.storage.local.set({ promptType: 'sentences' });
}

// Async function to query endpoint to summarize reviews, returns summary
async function insertIntoBackend(reviews, site, itmId, forceRefresh) {
  // My webserver_url (Should be fine here, no API key is returned. Server will call the openAI API and return a summary to the client)
  const webserver_url = 'https://backend-5qe4piohsq-uw.a.run.app';
  // Grab the prompt type stored in storage
  let promptType = (await chrome.storage.local.get('promptType')).promptType;
  try {
    // Send a POST request to webserver containing the reviews
    // Wait for a response from the webserver, whether failure or success
    const response = await fetch(webserver_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reviews: reviews,
        site: site,
        itmId: itmId,
        promptType: promptType,
        forceRefresh: forceRefresh,
      }),
    });
    if (!response.ok) {
      throw new Error('Response not ok');
    }
    // Return the response we get as a json from the webserver
    return await response.json();
  } catch (error) {
    throw new Error('Caught error: ${error.message}');
  }
}

// A function used to interact with my webserver and check if the product summary is already in the DB or not
async function checkInDB(site, itmId) {
  // My webserver_url (Should be fine here, no API key is returned. Server will check if in DB
  let webserver_url = 'https://backend-5qe4piohsq-uw.a.run.app/checkDB?';
  // Grab the prompt type stored in storage
  let promptType = (await chrome.storage.local.get('promptType')).promptType;
  // Build up the url for the GET request
  webserver_url =
    webserver_url +
    'site=' +
    site +
    '&itmId=' +
    itmId +
    '&promptType=' +
    promptType;
  try {
    const response = await fetch(webserver_url);
    if (!response.ok) {
      throw new Error('Response not ok');
    }
    // Return the response we get as a json from the webserver
    return await response.json();
  } catch (error) {
    throw new Error('Caught error: ${error.message}');
  }
}
