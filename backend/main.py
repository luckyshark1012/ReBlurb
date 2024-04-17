import os

from flask import Flask, request, jsonify
from openai import AsyncOpenAI
from typing import List
from flask_cors import CORS

from google.cloud import secretmanager
import firebase_admin
from firebase_admin import credentials, firestore_async
import json
import asyncio

client = secretmanager.SecretManagerServiceClient()
name = "projects/reblurb-2/secrets/reblurb-firebase-adminsdk/versions/latest"
response = client.access_secret_version(name=name)
private_config = response.payload.data.decode('utf-8')
private_config_as_dict = json.loads(private_config)

cred = credentials.Certificate(private_config_as_dict)
firebase_admin.initialize_app(cred)

db = firestore_async.client()

# GPT-3.5-turbo-0125 can use 16,000 tokens in a single request
MAX_TOKENS = 16000
# Save 250 tokens at least to get back response
TOKENS_TO_USE = MAX_TOKENS - 250
# Rough estimate of max chars to use in request given we reserve 250 tokens for response
MAX_CHARS = 4 * TOKENS_TO_USE

PROMPT_SUMMARIZE_AS_PARAGRAPH = "You are a product summarizer, capable of summarizing multiple product reviews into a single concise summary of what the reviews emphasize. Individual product reviews are separated by the '|' character. Keep your response to 3 sentences or less."
GPT_3_5_TURBO_0125 = "gpt-3.5-turbo-0125"

app = Flask(__name__)
CORS(app)


@app.route("/", methods=["POST"])
async def process_openAiKey():

    # Grab data that was sent
    data = request.json
    # Process data
    # If no reviews provided in request, return error
    reviews = data["reviews"] if "reviews" else None
    if (reviews == None):
        return jsonify({'error': 'Missing required data field: reviews'})
    review_string = create_user_content(reviews)

    tasks = [asyncio.create_task(insertIntoDB("ebayReviews", "guitar123", "this is great")),
             asyncio.create_task(callOpenAI(GPT_3_5_TURBO_0125, PROMPT_SUMMARIZE_AS_PARAGRAPH, review_string))]
    results = await asyncio.gather(*tasks)
    # Grab the first message's content: what gpt is sending as result
    processed_data = {'message': results[1]}
    # Return a json string of first message
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


async def insertIntoDB(collection_name: str, document_name: str, summary: str):
    ebay_reviews_ref = db.collection(collection_name)
    print("trying to set doc")
    try:
        await ebay_reviews_ref.document(document_name).set({"summary": summary})
    except Exception as e:
        raise
    print("done setting doc")


async def callOpenAI(model: str, prompt: str, pipe_delimited_review: str):
    # Init our openAI client
    # Use secret var to store API KEY
    client = AsyncOpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
    print("calling openaiapi")
    # Query gpt
    completion = await client.chat.completions.create(
        # gpt-3.5-turbo-0125 supports 16k tokens, cheapest, effective
        model=model,
        # send a request with the prompt and pipe delimited user reviews
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": pipe_delimited_review}
        ]
    )
    print("returning openai reponse")
    return completion.choices[0].message.content

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0",
            port=int(os.environ.get("PORT", 8080)))
