import os

from flask import Flask, request, jsonify
from openai import OpenAI
from typing import List
from flask_cors import CORS
# GPT-3.5-turbo-0125 can use 16,000 tokens in a single request
MAX_TOKENS=16000
# Save 250 tokens at least to get back response
TOKENS_TO_USE=MAX_TOKENS - 250
# Rough estimate of max chars to use in request given we reserve 250 tokens for response
MAX_CHARS=4 * TOKENS_TO_USE


app = Flask(__name__)
CORS(app)

@app.route("/", methods=["POST"])
def process_openAiKey():
    # Grab data that was sent
    data = request.json
    # Process data
    # If no reviews provided in request, return error
    reviews = data["reviews"] if "reviews" else None
    if (reviews == None):
        return jsonify({'error': 'Missing required data field: reviews'})
    review_string = create_user_content(reviews)
    # Init our openAI client
    client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY')) # Use secret var to store API KEY
    # Query gpt
    completion = client.chat.completions.create(
        # gpt-3.5-turbo-0125 supports 16k tokens, cheapest, effective
        model="gpt-3.5-turbo-0125",
        # User content is hardcoded for now, should be dynamic based on what client sends in future
        messages=[
            {"role": "system", "content": "You are a product summarizer, capable of summarizing multiple product reviews into a single concise summary of what the reviews emphasize. Individual product reviews are separated by the '|' character. Keep your response to 3 sentences or less."},
            {"role": "user", "content": review_string}
        ]
    ) 
    # Grab the first message's content: what gpt is sending as result
    processed_data = {'message': completion.choices[0].message.content}
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


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
