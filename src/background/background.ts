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
        sendResponse({ failure: true });
      });
    // Make asynchronous here: https://developer.chrome.com/docs/extensions/develop/concepts/messaging
    return true;
  } else {
    checkInDB(request.site, request.itmId).then(async (response) => {
      JSON.stringify({
        failure: false,
        inDB: response.inDB,
        summary: response.summary,
      });
      sendResponse(
        JSON.stringify({
          failure: false,
          inDB: response.inDB,
          summary: response.summary,
        })
      );
    });
    return true;
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  initializeDefaultData();
});

function initializeDefaultData() {
  chrome.storage.local.set({ promptType: 'sentences' });
}

// Async function to query endpoint to summarize reviews, returns summary
async function insertIntoBackend(reviews, site, itmId, forceRefresh) {
  // My webserver_url (Should be fine here, no API key is returned. Server will call the openAI API and return a summary to the client)
  const webserver_url = 'https://backend-5qe4piohsq-uw.a.run.app';
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

async function checkInDB(site, itmId) {
  // My webserver_url (Should be fine here, no API key is returned. Server will check if in DB
  let webserver_url = 'https://backend-5qe4piohsq-uw.a.run.app/checkDB?';
  let promptType = (await chrome.storage.local.get('promptType')).promptType;
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
