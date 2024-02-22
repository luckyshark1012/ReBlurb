/* Listen for a message, and begin handling when received*/
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // If the request contains revies
    if (request.reviews != null){
        // Call queryBackend to send reviews to webserver to get a summary
        queryBackend(request.reviews).then(summary => {
            // DEBUG STATEMENT
            console.log('Created summary: ',summary );
            // Send information back to the content script that includes the summary, indicate that everything went okay!
            sendResponse({failure: false, summary: summary });
        }).catch(error => {
            sendResponse({failure: true});
        });
        // Make asynchronous here: https://developer.chrome.com/docs/extensions/develop/concepts/messaging
        return true;
    }
});

// Async function to query endpoint to summarize reviews, returns summary
async function queryBackend(data) {
    // My webserver_url (Should be fine here, no API key is returned. Server will call the openAI API and return a summary to the client)
    webserver_url = "https://backend-5qe4piohsq-uw.a.run.app"
    try {
        // Send a POST request to webserver containing the reviews
        // Wait for a response from the webserver, whether failure or success
        const response = await fetch(webserver_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reviews: data }),
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