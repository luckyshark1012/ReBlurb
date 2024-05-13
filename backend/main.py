'''
This is the backend webserver code for ReBlurb.
Flask is used to create a simple webserver.
There are two ways to access my webserver, a POST method to possibly create a product summary
 AND a GET method to check if a summary has already been created for the product of interest.
OpenAI API is used to generate product summaries. 
Webserver can handle multiple requests at once since it is hosted on Google Cloud Run
 which helps abstract complex interactions.
'''
# Imports
import os

from flask import Flask, request, jsonify
from openai import OpenAI
from typing import List
from flask_cors import CORS

from google.cloud import secretmanager
import firebase_admin
from firebase_admin import credentials, firestore
import json

# Since server is hosted on GCP, use secretmanager to get information to initialize firebase API
client = secretmanager.SecretManagerServiceClient()
name = "projects/reblurb-2/secrets/reblurb-firebase-adminsdk/versions/latest"
# Get the api_key from secretmanager
response = client.access_secret_version(name=name)
private_config = response.payload.data.decode('utf-8')
private_config_as_dict = json.loads(private_config)

# Load and initialize the api_key
cred = credentials.Certificate(private_config_as_dict)
firebase_admin.initialize_app(cred)

# Initialize firestore reference
db = firestore.client()
# GPT-3.5-turbo-0125 can use 16,000 tokens in a single request
MAX_TOKENS = 16000
# Save 250 tokens at least to get back response
TOKENS_TO_USE = MAX_TOKENS - 250
# Rough estimate of max chars to use in request given we reserve 250 tokens for response
MAX_CHARS = 4 * TOKENS_TO_USE

# OpenAI Constants
PROMPT_SUMMARIZE_AS_PARAGRAPH = "You are a product summarizer, capable of summarizing multiple product reviews into a single concise summary of what the reviews emphasize. Keep your response to 80 words or less. Individual product reviews are separated by the '|' character."
PROMPT_SUMMARIZE_AS_BULLETS = "You are a product summarizer, capable of summarizing multiple product reviews into 3 bullet points or less. Keep your response to 80 words or less and use the standard bullet character. Seperate bullet points with 2 newlines. Individual product reviews are separated by the '|' character."
GPT_3_5_TURBO_0125 = "gpt-3.5-turbo-0125"

app = Flask(__name__)
# CORS was a large problem in trying to get my webserver to interact with clients
#  Slapping this here seems to fix it
CORS(app)

# POST method to process a series of reviews and send back a product summary
@app.route("/", methods=["POST"])
def process_request():
    # Grab data that was sent
    data = request.json
    itm_id = data["itmId"]
    site = data["site"]
    promptType = data["promptType"]
    forceRefresh = data["forceRefresh"]
    # Before trying to process data, check if a summary already exists so we don't repeat work we already did (ie. waste API calls)
    summary = queryDBSummary('productSummaries', itm_id, site, promptType)
    if summary != None and (forceRefresh == None or forceRefresh == False):
        processed_data = {'message': summary}
    else:  # Else process data
        # If no reviews provided in request, return error
        reviews = data["reviews"] if "reviews" else None
        # if no reviews provided return back a general error message
        if (reviews == None):
            return jsonify({'error': 'Missing required data field: reviews'})
        # parse our list of reviews and create one very long string separted by a '|'
        review_string = create_user_content(reviews) 
        # Using provided promptType, generate an appropiate product summary 
        if promptType == "sentences":
            summary = callOpenAI(GPT_3_5_TURBO_0125,
                                 PROMPT_SUMMARIZE_AS_PARAGRAPH, review_string)
        else:
            summary = callOpenAI(GPT_3_5_TURBO_0125,
                                 PROMPT_SUMMARIZE_AS_BULLETS, review_string)
        # Insert/Update entry in DB for this particular product 
        insertIntoDB('productSummaries', itm_id, summary, site, promptType)
        # Grab the first message's content: what gpt is sending as result
        processed_data = {'message': summary}
    # Return a json string of first message
    return jsonify(processed_data)


# A GET method that checks if a given product is in the DB already, returns the summary if it is
@app.route("/checkDB", methods=["GET"])
def checkDB():
    # Grab data 
    site = request.args.get('site')
    itmId = request.args.get('itmId')
    promptType = request.args.get('promptType')
    # Query DB to get summary if product is already there
    summary = queryDBSummary('productSummaries', itmId, site, promptType)
    # If summary found, set our processed data to reflect this
    if summary != None:
        processed_data = {'inDB': True, 'summary': summary}
    else: # else update accordingly
        processed_data = {'inDB': False, 'summary': ''}
    # Retun a json string of processed_data
    return jsonify(processed_data)


"""
    Function to combine multiple reviews into a single string where each review becomes pipe-delimited
"""
def create_user_content(reviews: List[str]) -> str:
    reviews_as_str = ""
    used_chars = 0
    # For each review
    for review in reviews:
        piped_str = ""
        used_chars += len(review)
        # Check if adding this review to our string goes over our token limit
        if used_chars > MAX_CHARS:
            break
        else:
            # Remove last character, add a pipe in its place
            piped_str = review[:-1] + "|"
        reviews_as_str = reviews_as_str + piped_str
    return reviews_as_str

"""
Function to insert a product summary into DB
"""
def insertIntoDB(collection_name: str, productId: str, summary: str, site: str, promptType: str):
    # Researching best way to store product summaries from various websites led me to this,
    # Essentially, grab the unique product id followed by a delimiter, followed by the sitename again followed by a delimiter,
    #   and followed by the promptType
    # Since we are storing only summaries in our DB, this flattens all documents into a single collection
    # I believe we will run into efficiency issues when DB gets very large, but this is fine for now
    document_name = f"{productId}:{site}:{promptType}"
    # Get reference to summary document for this product
    sum_ref = db.collection(
        collection_name).document(document_name)
    # I have this in a try block, but i don't actually catch errors thrown
    #  This is an artifact of previous iterations where I was debugging extensively
    try:
        sum_ref.set({"summary": summary})
    except Exception as e:
        raise

"""
Function to query DB for a summary of a given product
"""
def queryDBSummary(collection_name: str, productId: str, site: str, promptType: str):
    # Researching best way to store product summaries from various websites led me to this,
    # Essentially, grab the unique product id followed by a delimiter, followed by the sitename again followed by a delimiter,
    #   and followed by the promptType
    # Since we are storing only summaries in our DB, this flattens all documents into a single collection
    # I believe we will run into efficiency issues when DB gets very large, but this is fine for now
    document_name = f"{productId}:{site}:{promptType}"
    sum_ref = db.collection(
        collection_name).document(document_name)
    # I have this in a try block, but i don't actually catch errors thrown
    #  This is an artifact of previous iterations where I was debugging extensively
    try:
        doc = sum_ref.get()
        if doc.exists:
            return doc.to_dict()['summary']
        else:
            return None
    except Exception as e:
        raise

"""
Given a model, a prompt type, and a string of pipe delimited reviews, use OpenAI to generate product summary
"""
def callOpenAI(model: str, prompt: str, pipe_delimited_review: str):
    # Init our openAI client
    # Use secret var to store API KEY
    client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
    # Query gpt
    completion = client.chat.completions.create(
        # gpt-3.5-turbo-0125 supports 16k tokens, cheapest, effective
        model=model,
        # send a request with the prompt and pipe delimited user reviews
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": pipe_delimited_review}
        ]
    )
    return completion.choices[0].message.content

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0",
            port=int(os.environ.get("PORT", 8080)))
