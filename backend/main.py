import os

from flask import Flask, request, jsonify
from openai import OpenAI

app = Flask(__name__)

@app.route("/", methods=["POST"])
def process_openAiKey():
    # Grab data that was sent
    data = request.json
    # Process data
    # If no reviews provided in request, return error
    reviews = data["reviews"] if "reviews" else None
    if (reviews == None):
        return jsonify({'error': 'Missing required data field: reviews'})

    # Init our openAI client
    client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY')) # Use secret var to store API KEY
    # Query gpt
    completion = client.chat.completions.create(
        model="gpt-3.5-turbo",
        # User content is hardcoded for now, should be dynamic based on what client sends in future
        messages=[
            {"role": "system", "content": "You are a product summarizer, capable of summarizing multiple product reviews into a single concise summary of what the reviews emphasize. Individual product reviews are separated by newline characters."},
            {"role": "user", "content": "Very useful product, I enjoy how easy it is to use and it only takes 10 minutes to get up and running\n While I enjoy the product, it is very expensive and I would not recommend it due to its cost-to-performance\n As others have noted, the product is very expensive, but if you're like me you'll find this saves a lot of time. Only buy if you know you waste time everyday doing this"}
        ]
    ) 
    # Grab the first message's content: what gpt is sending as result
    processed_data = {'message': completion.choices[0].message.content}
    # Return a json string of first message
    return jsonify(processed_data)
   


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
