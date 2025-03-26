function prompt(prompt) {
  const OPENAI_API_KEY = 'YOUR-OPEN-AI-API-KEY';
  const openaiUrl = 'https://api.openai.com/v1/chat/completions';

  // Prepare the data to send in the body of the POST request
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': "Bearer " + OPENAI_API_KEY
    },
    payload: JSON.stringify({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: prompt
      }]
    }),
    muteHttpExceptions: true  // Add this to examine the full response when debugging
  };

  // Make the POST request to the OpenAI API
  const response = UrlFetchApp.fetch(openaiUrl, options);
  const responseJson = JSON.parse(response.getContentText());

  // Check for errors in response
  if (response.getResponseCode() !== 200) {
    throw new Error('Failed to fetch from OpenAI: ' + response.getContentText());
  }

  // Assuming the response structure has a 'choices' array
  // and you want the 'text' of the first choice.
  // Adjust the path according to the actual response structure.
  return responseJson.choices[0].message.content.trim();
}
